import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Agendamentos / Viagens ───────────────────────────────────────────────────
// Controla saída e retorno de veículos.
// Verifica conflito de agenda: veículo já em uso no período solicitado.
// Ao sair → EM_USO; ao retornar → CONCLUIDO com hodômetro e km percorridos.

const TRANSICOES: Record<string, string[]> = {
  AGENDADO:  ['EM_USO', 'CANCELADO'],
  EM_USO:    ['CONCLUIDO', 'CANCELADO'],
  CONCLUIDO: [],
  CANCELADO: [],
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const relatorio  = searchParams.get('relatorio')
  const veiculoId  = searchParams.get('veiculoId')
  const motoristaId = searchParams.get('motoristaId')
  const situacao   = searchParams.get('situacao')
  const data       = searchParams.get('data')   // "2026-11-18" — agenda do dia

  if (relatorio === 'DASHBOARD') {
    const hoje = new Date()
    hoje.setHours(0,0,0,0)
    const amanha = new Date(hoje)
    amanha.setDate(amanha.getDate() + 1)

    const [emUso, agendadosHoje, concluidosHoje, totalMes] = await Promise.all([
      prisma.agendamento.count({ where: { municipioId: usuario.municipioId, situacao: 'EM_USO' } }),
      prisma.agendamento.count({
        where: { municipioId: usuario.municipioId, situacao: 'AGENDADO', dataSaida: { gte: hoje, lt: amanha } },
      }),
      prisma.agendamento.count({
        where: { municipioId: usuario.municipioId, situacao: 'CONCLUIDO', dataRetornoReal: { gte: hoje } },
      }),
      prisma.agendamento.count({
        where: { municipioId: usuario.municipioId, dataSaida: { gte: new Date(hoje.getFullYear(), hoje.getMonth(), 1) } },
      }),
    ])

    // Km total do mês
    const kmMes = await prisma.agendamento.aggregate({
      where: {
        municipioId: usuario.municipioId,
        situacao: 'CONCLUIDO',
        dataSaida: { gte: new Date(hoje.getFullYear(), hoje.getMonth(), 1) },
      },
      _sum: { kmPercorrido: true },
    })

    // Próximos agendamentos do dia
    const proximosHoje = await prisma.agendamento.findMany({
      where: { municipioId: usuario.municipioId, situacao: 'AGENDADO', dataSaida: { gte: hoje, lt: amanha } },
      orderBy: { dataSaida: 'asc' }, take: 10,
      include: {
        veiculo:   { select: { placa: true, modelo: true } },
        motorista: { select: { nome: true } },
      },
    })

    return NextResponse.json({
      kpis: { emUso, agendadosHoje, concluidosHoje, totalMes, kmMes: kmMes._sum.kmPercorrido ?? 0 },
      proximosHoje,
    })
  }

  const where: any = { municipioId: usuario.municipioId }
  if (veiculoId)   where.veiculoId   = veiculoId
  if (motoristaId) where.motoristaId = motoristaId
  if (situacao)    where.situacao    = situacao
  if (data) {
    const dia = new Date(data)
    const fim = new Date(data)
    fim.setDate(fim.getDate() + 1)
    where.dataSaida = { gte: dia, lt: fim }
  }

  const agendamentos = await prisma.agendamento.findMany({
    where, orderBy: { dataSaida: 'asc' }, take: 200,
    include: {
      veiculo:   { select: { placa: true, modelo: true, tipo: true } },
      motorista: { select: { nome: true } },
    },
  })

  return NextResponse.json({ agendamentos, total: agendamentos.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    veiculoId:       z.string(),
    motoristaId:     z.string().optional(),
    solicitante:     z.string().min(3),
    secretoriaSolic: z.string().optional(),
    destino:         z.string().min(3),
    finalidade:      z.string().min(5),
    dataSaida:       z.string(),
    dataRetornoPrev: z.string(),
    observacoes:     z.string().optional(),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const veiculo = await prisma.veiculo.findFirst({ where: { id: d.veiculoId, municipioId: usuario.municipioId } })
  if (!veiculo) return NextResponse.json({ erro: 'Veículo não encontrado' }, { status: 404 })

  if (!['ATIVO'].includes(veiculo.situacao)) {
    return NextResponse.json({ erro: `Veículo não disponível (${veiculo.situacao})` }, { status: 409 })
  }

  // Verifica conflito de agenda: veículo já agendado/em uso no período
  const conflito = await prisma.agendamento.findFirst({
    where: {
      veiculoId: d.veiculoId,
      situacao: { in: ['AGENDADO', 'EM_USO'] },
      AND: [
        { dataSaida:       { lt: new Date(d.dataRetornoPrev) } },
        { dataRetornoPrev: { gt: new Date(d.dataSaida) } },
      ],
    },
  })
  if (conflito) {
    return NextResponse.json({
      erro: 'Veículo já agendado neste período',
      conflito: { dataSaida: conflito.dataSaida, dataRetornoPrev: conflito.dataRetornoPrev },
    }, { status: 409 })
  }

  // Verifica CNH do motorista se informado
  if (d.motoristaId) {
    const mot = await prisma.motorista.findFirst({ where: { id: d.motoristaId, municipioId: usuario.municipioId } })
    if (!mot) return NextResponse.json({ erro: 'Motorista não encontrado' }, { status: 404 })
    if (new Date(mot.vencimentoCnh) < new Date()) {
      return NextResponse.json({ erro: `CNH do motorista ${mot.nome} está vencida` }, { status: 409 })
    }
    if (mot.situacao !== 'ATIVO') {
      return NextResponse.json({ erro: `Motorista não está ATIVO (${mot.situacao})` }, { status: 409 })
    }
  }

  const agendamento = await prisma.agendamento.create({
    data: {
      municipioId: usuario.municipioId,
      ...d,
      dataSaida:       new Date(d.dataSaida),
      dataRetornoPrev: new Date(d.dataRetornoPrev),
      usuarioId: usuario.id,
    },
  })

  return NextResponse.json({ agendamento }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, ...dados } = await req.json()
  if (!id || !acao) return NextResponse.json({ erro: 'id e acao obrigatórios' }, { status: 400 })

  const ag = await prisma.agendamento.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!ag) return NextResponse.json({ erro: 'Agendamento não encontrado' }, { status: 404 })

  const permitidos = TRANSICOES[ag.situacao] ?? []
  if (!permitidos.includes(acao)) {
    return NextResponse.json({ erro: `Transição inválida: ${ag.situacao} → ${acao}`, permitidos }, { status: 409 })
  }

  const atualizacoes: any = { situacao: acao }

  if (acao === 'EM_USO') {
    atualizacoes.hodometroSaida = dados.hodometroSaida
  }

  if (acao === 'CONCLUIDO') {
    if (!dados.hodometroRetorno) {
      return NextResponse.json({ erro: 'hodometroRetorno obrigatório ao concluir' }, { status: 400 })
    }
    atualizacoes.hodometroRetorno = dados.hodometroRetorno
    atualizacoes.dataRetornoReal  = new Date()
    atualizacoes.observacoes      = dados.observacoes ?? ag.observacoes

    const kmPercorrido = ag.hodometroSaida
      ? dados.hodometroRetorno - ag.hodometroSaida
      : undefined
    atualizacoes.kmPercorrido = kmPercorrido

    // Atualiza hodômetro do veículo
    await prisma.$transaction(async (tx) => {
      await tx.agendamento.update({ where: { id }, data: atualizacoes })
      await tx.veiculo.update({
        where: { id: ag.veiculoId },
        data: { hodometro: dados.hodometroRetorno },
      })
    })

    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: 'RETORNO_VEICULO', entidade: 'Agendamento', entidadeId: id,
      detalhes: { destino: ag.destino, kmPercorrido, hodometroRetorno: dados.hodometroRetorno },
    })

    return NextResponse.json({ sucesso: true, kmPercorrido })
  }

  await prisma.agendamento.update({ where: { id }, data: atualizacoes })
  return NextResponse.json({ sucesso: true })
}
