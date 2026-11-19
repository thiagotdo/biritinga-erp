import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Veículos da Frota Municipal ──────────────────────────────────────────────
// CTB Lei 9.503/1997
// CONTRAN Resolução 952/2022 — licenciamento anual obrigatório

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const relatorio = searchParams.get('relatorio')
  const situacao  = searchParams.get('situacao')
  const tipo      = searchParams.get('tipo')
  const busca     = searchParams.get('busca')

  if (relatorio === 'DASHBOARD') {
    const [total, ativos, emManutencao, aguardManut, inativos, sinistrados] = await Promise.all([
      prisma.veiculo.count({ where: { municipioId: usuario.municipioId, ativo: true } }),
      prisma.veiculo.count({ where: { municipioId: usuario.municipioId, ativo: true, situacao: 'ATIVO' } }),
      prisma.veiculo.count({ where: { municipioId: usuario.municipioId, ativo: true, situacao: 'EM_MANUTENCAO' } }),
      prisma.veiculo.count({ where: { municipioId: usuario.municipioId, ativo: true, situacao: 'AGUARDANDO_MANUTENCAO' } }),
      prisma.veiculo.count({ where: { municipioId: usuario.municipioId, ativo: true, situacao: 'INATIVO' } }),
      prisma.veiculo.count({ where: { municipioId: usuario.municipioId, ativo: true, situacao: 'SINISTRADO' } }),
    ])

    // Vencimentos próximos (30 dias)
    const em30 = new Date()
    em30.setDate(em30.getDate() + 30)
    const hoje = new Date()
    const [crlvVencendo, seguroVencendo] = await Promise.all([
      prisma.veiculo.count({
        where: { municipioId: usuario.municipioId, ativo: true, vencCRLV: { lte: em30 } },
      }),
      prisma.veiculo.count({
        where: { municipioId: usuario.municipioId, ativo: true, vencSeguro: { lte: em30, gte: hoje } },
      }),
    ])

    // Abastecimento do mês atual
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const gastoMes = await prisma.abastecimento.aggregate({
      where: { municipioId: usuario.municipioId, dataAbast: { gte: inicioMes } },
      _sum: { valorTotal: true },
    })

    // Manutenções abertas
    const manutAberta = await prisma.manutencao.count({
      where: { municipioId: usuario.municipioId, situacao: { in: ['AGUARDANDO', 'EM_EXECUCAO'] } },
    })

    return NextResponse.json({
      kpis: {
        total, ativos, emManutencao, aguardManut, inativos, sinistrados,
        crlvVencendo, seguroVencendo,
        gastoMes: gastoMes._sum.valorTotal ?? 0,
        manutAberta,
      },
    })
  }

  if (id) {
    const veiculo = await prisma.veiculo.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        abastecimentos: {
          orderBy: { dataAbast: 'desc' }, take: 10,
          select: { id: true, dataAbast: true, litros: true, valorTotal: true, combustivel: true, hodometro: true, consumoKmL: true, posto: true },
        },
        manutencoes: {
          orderBy: { dataEntrada: 'desc' }, take: 10,
          select: { id: true, tipo: true, situacao: true, descricao: true, dataEntrada: true, dataConclusao: true, valorFinal: true, oficina: true },
        },
        agendamentos: {
          where: { situacao: { in: ['AGENDADO', 'EM_USO'] } },
          orderBy: { dataSaida: 'asc' }, take: 5,
          select: { id: true, dataSaida: true, dataRetornoPrev: true, destino: true, solicitante: true, situacao: true },
        },
      },
    })
    if (!veiculo) return NextResponse.json({ erro: 'Veículo não encontrado' }, { status: 404 })
    return NextResponse.json({ veiculo })
  }

  const where: any = { municipioId: usuario.municipioId, ativo: true }
  if (situacao) where.situacao = situacao
  if (tipo)     where.tipo     = tipo
  if (busca) {
    where.OR = [
      { placa:    { contains: busca } },
      { modelo:   { contains: busca } },
      { marca:    { contains: busca } },
      { renavam:  { contains: busca } },
      { secretaria: { contains: busca } },
      { patrimonio: { contains: busca } },
    ]
  }

  const veiculos = await prisma.veiculo.findMany({
    where, orderBy: { placa: 'asc' }, take: 300,
    select: {
      id: true, placa: true, tipo: true, marca: true, modelo: true,
      anoFab: true, anoMod: true, combustivel: true, situacao: true,
      hodometro: true, secretaria: true, patrimonio: true,
      vencCRLV: true, vencSeguro: true, vencLicenciamento: true,
      _count: { select: { abastecimentos: true, manutencoes: true } },
    },
  })

  return NextResponse.json({ veiculos, total: veiculos.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    placa:        z.string().min(7).max(8),
    renavam:      z.string().optional(),
    chassi:       z.string().optional(),
    tipo:         z.enum(['CARRO','CAMINHONETE','VAN','MICRO_ONIBUS','ONIBUS','CAMINHAO','CAMINHAO_PIPA','TRATOR','RETROESCAVADEIRA','MOTONIVELADORA','MOTOCICLETA','BICICLETA_ELETRICA','BARCO','OUTRO']),
    marca:        z.string().min(2),
    modelo:       z.string().min(2),
    anoFab:       z.number().int().min(1950).max(2030),
    anoMod:       z.number().int().min(1950).max(2030),
    cor:          z.string().optional(),
    combustivel:  z.enum(['GASOLINA','ETANOL','DIESEL','DIESEL_S10','GNV','FLEX','ELETRICO','HIBRIDO']),
    capacidade:   z.number().int().optional(),
    hodometro:    z.number().int().min(0).default(0),
    secretaria:   z.string().optional(),
    patrimonio:   z.string().optional(),
    seguradora:   z.string().optional(),
    apolice:      z.string().optional(),
    vencSeguro:   z.string().optional(),
    vencLicenciamento: z.string().optional(),
    vencCRLV:     z.string().optional(),
    observacoes:  z.string().optional(),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  // Placa única por município (strips espaço/hífen)
  const placaNorm = d.placa.toUpperCase().replace(/[-\s]/g, '')
  const existe = await prisma.veiculo.findFirst({
    where: { municipioId: usuario.municipioId, placa: placaNorm, ativo: true },
  })
  if (existe) return NextResponse.json({ erro: `Placa ${placaNorm} já cadastrada na frota` }, { status: 409 })

  const veiculo = await prisma.veiculo.create({
    data: {
      municipioId: usuario.municipioId,
      ...d,
      placa: placaNorm,
      vencSeguro:         d.vencSeguro         ? new Date(d.vencSeguro)         : undefined,
      vencLicenciamento:  d.vencLicenciamento  ? new Date(d.vencLicenciamento)  : undefined,
      vencCRLV:           d.vencCRLV           ? new Date(d.vencCRLV)           : undefined,
    },
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'CADASTRAR_VEICULO', entidade: 'Veiculo', entidadeId: veiculo.id,
    detalhes: { placa: placaNorm, tipo: d.tipo, modelo: `${d.marca} ${d.modelo}` },
  })

  return NextResponse.json({ veiculo }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, hodometro, situacao, ...dados } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const veiculo = await prisma.veiculo.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!veiculo) return NextResponse.json({ erro: 'Veículo não encontrado' }, { status: 404 })

  const atualizacoes: any = { ...dados }

  if (situacao) atualizacoes.situacao = situacao

  // Atualizar hodômetro (só avança)
  if (hodometro !== undefined) {
    if (hodometro < veiculo.hodometro) {
      return NextResponse.json({ erro: `Hodômetro não pode ser menor que atual (${veiculo.hodometro} km)` }, { status: 409 })
    }
    atualizacoes.hodometro = hodometro
  }

  if (acao === 'DESATIVAR') {
    atualizacoes.ativo    = false
    atualizacoes.situacao = 'INATIVO'
    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: 'DESATIVAR_VEICULO', entidade: 'Veiculo', entidadeId: id,
      detalhes: { placa: veiculo.placa },
    })
  }

  // Datas
  if (dados.vencSeguro)        atualizacoes.vencSeguro        = new Date(dados.vencSeguro)
  if (dados.vencLicenciamento) atualizacoes.vencLicenciamento = new Date(dados.vencLicenciamento)
  if (dados.vencCRLV)          atualizacoes.vencCRLV          = new Date(dados.vencCRLV)

  const atualizado = await prisma.veiculo.update({ where: { id }, data: atualizacoes })
  return NextResponse.json({ veiculo: atualizado })
}
