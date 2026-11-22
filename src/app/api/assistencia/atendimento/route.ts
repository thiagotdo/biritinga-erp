// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

const TRANSICOES: Record<string, string[]> = {
  AGENDADO:    ['REALIZADO', 'FALTOU', 'CANCELADO'],
  REALIZADO:   [],
  FALTOU:      ['AGENDADO'],   // pode reagendar
  CANCELADO:   ['AGENDADO'],   // pode reagendar
  TRANSFERIDO: [],
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const familiaId = searchParams.get('familiaId')
  const unidadeId = searchParams.get('unidadeId')
  const data      = searchParams.get('data')     // "2026-11-18"
  const dataInicio = searchParams.get('dataInicio')
  const dataFim    = searchParams.get('dataFim')
  const tipo      = searchParams.get('tipo')
  const relatorio = searchParams.get('relatorio')

  if (relatorio === 'DASHBOARD') {
    const hoje = new Date()
    const inicioDia  = new Date(hoje.toDateString())
    const inicioMes  = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const inicioAno  = new Date(hoje.getFullYear(), 0, 1)

    const [hoje_agendados, hoje_realizados, mes_total, mes_realizados, ano_realizados, faltasHoje] = await Promise.all([
      prisma.atendimentoSuas.count({
        where: {
          municipioId: usuario.municipioId,
          dataAtendimento: { gte: inicioDia, lt: new Date(inicioDia.getTime() + 86400000) },
          situacao: { in: ['AGENDADO', 'REALIZADO'] },
        },
      }),
      prisma.atendimentoSuas.count({
        where: {
          municipioId: usuario.municipioId,
          dataAtendimento: { gte: inicioDia, lt: new Date(inicioDia.getTime() + 86400000) },
          situacao: 'REALIZADO',
        },
      }),
      prisma.atendimentoSuas.count({
        where: { municipioId: usuario.municipioId, dataAtendimento: { gte: inicioMes } },
      }),
      prisma.atendimentoSuas.count({
        where: { municipioId: usuario.municipioId, dataAtendimento: { gte: inicioMes }, situacao: 'REALIZADO' },
      }),
      prisma.atendimentoSuas.count({
        where: { municipioId: usuario.municipioId, dataAtendimento: { gte: inicioAno }, situacao: 'REALIZADO' },
      }),
      prisma.atendimentoSuas.count({
        where: {
          municipioId: usuario.municipioId,
          dataAtendimento: { gte: inicioDia, lt: new Date(inicioDia.getTime() + 86400000) },
          situacao: 'FALTOU',
        },
      }),
    ])

    const taxaPresenca = mes_total > 0 ? (mes_realizados / mes_total * 100).toFixed(1) : '100'

    // Próximos agendamentos do dia
    const proximosHoje = await prisma.atendimentoSuas.findMany({
      where: {
        municipioId: usuario.municipioId,
        dataAtendimento: { gte: inicioDia, lt: new Date(inicioDia.getTime() + 86400000) },
        situacao: 'AGENDADO',
      },
      include: {
        familia: { select: { responsavelNome: true, numeroProntuario: true } },
      },
      orderBy: { dataAtendimento: 'asc' },
      take: 10,
    })

    return NextResponse.json({
      kpis: {
        hoje_agendados, hoje_realizados, faltasHoje,
        mes_total, mes_realizados, taxaPresenca: `${taxaPresenca}%`, ano_realizados,
      },
      proximosHoje,
    })
  }

  if (id) {
    const at = await prisma.atendimentoSuas.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        familia: { select: { responsavelNome: true, numeroProntuario: true, bairro: true } },
        unidade: { select: { nome: true, tipo: true } },
      },
    })
    if (!at) return NextResponse.json({ erro: 'Atendimento não encontrado' }, { status: 404 })
    return NextResponse.json({ atendimento: at })
  }

  const where: any = { municipioId: usuario.municipioId }
  if (familiaId) where.familiaId = familiaId
  if (unidadeId) where.unidadeId = unidadeId
  if (tipo)      where.tipo      = tipo

  if (data) {
    const d = new Date(data)
    where.dataAtendimento = {
      gte: d,
      lt:  new Date(d.getTime() + 86400000),
    }
  } else if (dataInicio || dataFim) {
    where.dataAtendimento = {
      ...(dataInicio ? { gte: new Date(dataInicio) } : {}),
      ...(dataFim    ? { lte: new Date(dataFim + 'T23:59:59') } : {}),
    }
  }

  const atendimentos = await prisma.atendimentoSuas.findMany({
    where, orderBy: { dataAtendimento: 'desc' }, take: 200,
    include: {
      familia: { select: { responsavelNome: true, numeroProntuario: true } },
      unidade: { select: { nome: true } },
    },
  })

  return NextResponse.json({ atendimentos, total: atendimentos.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    familiaId:      z.string(),
    unidadeId:      z.string(),
    tipo:           z.enum([
      'RECEPCAO_TRIAGEM','ATENDIMENTO_INDIVIDUAL','ATENDIMENTO_FAMILIAR',
      'VISITA_DOMICILIAR','REUNIAO_GRUPO','OFICINA',
      'ENCAMINHAMENTO','ACOMPANHAMENTO','CADASTRO_ATUALIZACAO',
    ]),
    dataAtendimento: z.string(),
    duracaoMinutos:  z.number().int().min(5).optional(),
    tecnicoNome:     z.string().optional(),
    objetivo:        z.string().optional(),
    descricao:       z.string().optional(),
    encaminhamentos: z.string().optional(),
    vulnerabilidadesIdentificadas: z.string().optional(),
    planoAcao:       z.string().optional(),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  // Verificar que família pertence ao município
  const familia = await prisma.familiaReferenciada.findFirst({
    where: { id: d.familiaId, municipioId: usuario.municipioId },
    select: { responsavelNome: true, numeroProntuario: true },
  })
  if (!familia) return NextResponse.json({ erro: 'Família não encontrada' }, { status: 404 })

  const atendimento = await prisma.atendimentoSuas.create({
    data: {
      municipioId:    usuario.municipioId,
      ...d,
      dataAtendimento: new Date(d.dataAtendimento),
      situacao:       'AGENDADO',
      usuarioId:      usuario.usuarioId,
    },
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.usuarioId,
    acao: 'CREATE', modulo: 'assistencia', recurso: 'atendimento', registroId: atendimento.id,
    dadosNovos: { familia: familia.responsavelNome, tipo: d.tipo, data: d.dataAtendimento },
  })

  return NextResponse.json({ atendimento }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, ...dados } = await req.json()
  if (!id || !acao) return NextResponse.json({ erro: 'id e acao obrigatórios' }, { status: 400 })

  const at = await prisma.atendimentoSuas.findFirst({
    where: { id, municipioId: usuario.municipioId },
  })
  if (!at) return NextResponse.json({ erro: 'Atendimento não encontrado' }, { status: 404 })

  const permitidos = TRANSICOES[at.situacao] ?? []
  if (!permitidos.includes(acao)) {
    return NextResponse.json({
      erro: `Transição inválida: ${at.situacao} → ${acao}`,
      permitidos,
    }, { status: 409 })
  }

  const atualizacoes: any = { situacao: acao }

  if (acao === 'REALIZADO') {
    // Registrar conteúdo do atendimento
    if (dados.descricao)       atualizacoes.descricao       = dados.descricao
    if (dados.objetivo)        atualizacoes.objetivo        = dados.objetivo
    if (dados.encaminhamentos) atualizacoes.encaminhamentos = dados.encaminhamentos
    if (dados.planoAcao)       atualizacoes.planoAcao       = dados.planoAcao
    if (dados.duracaoMinutos)  atualizacoes.duracaoMinutos  = dados.duracaoMinutos
    if (dados.vulnerabilidadesIdentificadas) {
      atualizacoes.vulnerabilidadesIdentificadas = dados.vulnerabilidadesIdentificadas
    }

    // Atualizar nível de vulnerabilidade da família se fornecido
    if (dados.novoNivelVulnerabilidade) {
      await prisma.familiaReferenciada.update({
        where: { id: at.familiaId },
        data: { nivelVulnerabilidade: dados.novoNivelVulnerabilidade },
      })
    }
  }

  const atualizado = await prisma.atendimentoSuas.update({
    where: { id },
    data: atualizacoes,
  })

  return NextResponse.json({ atendimento: atualizado })
}
