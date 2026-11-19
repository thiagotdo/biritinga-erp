import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Manutenções ──────────────────────────────────────────────────────────────
// Preventiva (agendada pelo hodômetro) e Corretiva (problema identificado)
// Ao abrir manutenção → veículo vai para EM_MANUTENCAO ou AGUARDANDO_MANUTENCAO
// Ao concluir → veículo volta para ATIVO

const TRANSICOES: Record<string, string[]> = {
  AGUARDANDO:   ['EM_EXECUCAO', 'CANCELADA'],
  EM_EXECUCAO:  ['CONCLUIDA', 'AGUARDANDO'],
  CONCLUIDA:    [],
  CANCELADA:    ['AGUARDANDO'],
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const veiculoId = searchParams.get('veiculoId')
  const situacao  = searchParams.get('situacao')
  const tipo      = searchParams.get('tipo')

  if (id) {
    const manutencao = await prisma.manutencao.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: { veiculo: { select: { placa: true, modelo: true, tipo: true } } },
    })
    if (!manutencao) return NextResponse.json({ erro: 'Manutenção não encontrada' }, { status: 404 })
    return NextResponse.json({ manutencao })
  }

  const where: any = { municipioId: usuario.municipioId }
  if (veiculoId) where.veiculoId = veiculoId
  if (situacao)  where.situacao  = situacao
  if (tipo)      where.tipo      = tipo

  const manutencoes = await prisma.manutencao.findMany({
    where, orderBy: { dataEntrada: 'desc' }, take: 200,
    include: {
      veiculo: { select: { placa: true, modelo: true, marca: true } },
    },
  })

  return NextResponse.json({ manutencoes, total: manutencoes.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    veiculoId:        z.string(),
    tipo:             z.enum(['PREVENTIVA','CORRETIVA','REVISAO','PNEUS','FUNILARIA','ELETRICA','VISTORIA','OUTRO']),
    descricao:        z.string().min(5),
    oficina:          z.string().optional(),
    responsavel:      z.string().optional(),
    hodometroEntrada: z.number().int().optional(),
    dataEntrada:      z.string(),
    orcamento:        z.number().optional(),
    observacoes:      z.string().optional(),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const veiculo = await prisma.veiculo.findFirst({ where: { id: d.veiculoId, municipioId: usuario.municipioId } })
  if (!veiculo) return NextResponse.json({ erro: 'Veículo não encontrado' }, { status: 404 })

  // Abre manutenção e muda situação do veículo em transaction
  const manutencao = await prisma.$transaction(async (tx) => {
    const m = await tx.manutencao.create({
      data: {
        municipioId: usuario.municipioId,
        ...d,
        dataEntrada: new Date(d.dataEntrada),
        situacao: 'AGUARDANDO',
        usuarioId: usuario.id,
      },
    })

    // Veículo fica como AGUARDANDO_MANUTENCAO se estava ATIVO
    if (veiculo.situacao === 'ATIVO') {
      await tx.veiculo.update({
        where: { id: d.veiculoId },
        data: { situacao: 'AGUARDANDO_MANUTENCAO' },
      })
    }

    return m
  })

  return NextResponse.json({ manutencao }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, ...dados } = await req.json()
  if (!id || !acao) return NextResponse.json({ erro: 'id e acao obrigatórios' }, { status: 400 })

  const manut = await prisma.manutencao.findFirst({
    where: { id, municipioId: usuario.municipioId },
    include: { veiculo: true },
  })
  if (!manut) return NextResponse.json({ erro: 'Manutenção não encontrada' }, { status: 404 })

  const permitidos = TRANSICOES[manut.situacao] ?? []
  if (!permitidos.includes(acao)) {
    return NextResponse.json({ erro: `Transição inválida: ${manut.situacao} → ${acao}`, permitidos }, { status: 409 })
  }

  const atualizacoes: any = { situacao: acao }

  if (acao === 'EM_EXECUCAO') {
    atualizacoes.dataSaida = dados.dataSaida ? new Date(dados.dataSaida) : undefined
    // Veículo fica EM_MANUTENCAO
    await prisma.veiculo.update({ where: { id: manut.veiculoId }, data: { situacao: 'EM_MANUTENCAO' } })
  }

  if (acao === 'CONCLUIDA') {
    atualizacoes.dataConclusao   = new Date()
    atualizacoes.dataSaida       = dados.dataSaida ? new Date(dados.dataSaida) : manut.dataSaida
    atualizacoes.hodometroSaida  = dados.hodometroSaida
    atualizacoes.valorFinal      = dados.valorFinal
    atualizacoes.nfNumero        = dados.nfNumero
    atualizacoes.pecasUtilizadas = dados.pecasUtilizadas

    // Volta veículo para ATIVO e atualiza hodômetro se informado
    await prisma.$transaction(async (tx) => {
      await tx.manutencao.update({ where: { id }, data: atualizacoes })
      const updVeiculo: any = { situacao: 'ATIVO' }
      if (dados.hodometroSaida && dados.hodometroSaida > Number(manut.veiculo.hodometro)) {
        updVeiculo.hodometro = dados.hodometroSaida
      }
      await tx.veiculo.update({ where: { id: manut.veiculoId }, data: updVeiculo })
    })

    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: 'CONCLUIR_MANUTENCAO', entidade: 'Manutencao', entidadeId: id,
      detalhes: { placa: manut.veiculo.placa, tipo: manut.tipo, valor: dados.valorFinal },
    })

    return NextResponse.json({ sucesso: true })
  }

  if (acao === 'CANCELADA') {
    // Veículo volta para ATIVO
    await prisma.veiculo.update({ where: { id: manut.veiculoId }, data: { situacao: 'ATIVO' } })
  }

  await prisma.manutencao.update({ where: { id }, data: atualizacoes })
  return NextResponse.json({ sucesso: true })
}
