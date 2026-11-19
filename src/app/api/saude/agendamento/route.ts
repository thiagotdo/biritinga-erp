import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Agendamentos de Consultas e Procedimentos ───────────────────────────────
// Portaria GM/MS 1.820/2009 — direito ao agendamento pelo SUS
// Resolução CFM 1.638/2002 — prontuário médico

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const relatorio    = searchParams.get('relatorio')
  const data         = searchParams.get('data')
  const unidadeId    = searchParams.get('unidadeId')
  const profId       = searchParams.get('profissionalId')
  const pacienteId   = searchParams.get('pacienteId')

  if (relatorio === 'DASHBOARD') {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const amanha = new Date(hoje); amanha.setDate(hoje.getDate() + 1)
    const semanaFim = new Date(hoje); semanaFim.setDate(hoje.getDate() + 7)

    const [totalHoje, faltasHoje, semana, porTipo, porUnidade] = await Promise.all([
      prisma.agendamento.count({
        where: { municipioId: usuario.municipioId, dataAgendamento: { gte: hoje, lt: amanha } },
      }),
      prisma.agendamento.count({
        where: { municipioId: usuario.municipioId, dataAgendamento: { gte: hoje, lt: amanha }, situacao: 'FALTOU' },
      }),
      prisma.agendamento.findMany({
        where: { municipioId: usuario.municipioId, dataAgendamento: { gte: hoje, lte: semanaFim }, situacao: { notIn: ['CANCELADO'] } },
        include: { paciente: { select: { nome: true } }, unidade: { select: { nome: true } }, profissional: { select: { nome: true, tipo: true } } },
        orderBy: [{ dataAgendamento: 'asc' }, { horaAgendamento: 'asc' }],
        take: 50,
      }),
      prisma.agendamento.groupBy({
        by: ['tipoAtendimento'],
        where: { municipioId: usuario.municipioId, dataAgendamento: { gte: hoje, lte: semanaFim } },
        _count: { _all: true },
      }),
      prisma.agendamento.groupBy({
        by: ['unidadeId'],
        where: { municipioId: usuario.municipioId, dataAgendamento: { gte: hoje, lt: amanha } },
        _count: { _all: true },
      }),
    ])

    // Buscar nomes das unidades
    const unidadesAgenda = await prisma.unidadeSaude.findMany({
      where: { id: { in: porUnidade.map(u => u.unidadeId) } },
      select: { id: true, nome: true },
    })
    const nomesUnidade = Object.fromEntries(unidadesAgenda.map(u => [u.id, u.nome]))

    return NextResponse.json({
      kpis: {
        totalHoje,
        confirmadosHoje: totalHoje - faltasHoje,
        faltasHoje,
        pctFalta: totalHoje > 0 ? ((faltasHoje / totalHoje) * 100).toFixed(0) : '0',
        semanaTotal: semana.length,
      },
      agendaSemana: semana,
      porTipo: porTipo.map(t => ({ tipo: t.tipoAtendimento, count: t._count._all })),
      porUnidade: porUnidade.map(u => ({ unidade: nomesUnidade[u.unidadeId] ?? u.unidadeId, count: u._count._all })),
    })
  }

  const where: any = { municipioId: usuario.municipioId }
  if (data) {
    const d = new Date(data); d.setHours(0, 0, 0, 0)
    const df = new Date(d); df.setDate(d.getDate() + 1)
    where.dataAgendamento = { gte: d, lt: df }
  }
  if (unidadeId)  where.unidadeId   = unidadeId
  if (profId)     where.profissionalId = profId
  if (pacienteId) where.pacienteId  = pacienteId

  const agendamentos = await prisma.agendamento.findMany({
    where, orderBy: [{ dataAgendamento: 'asc' }, { horaAgendamento: 'asc' }],
    take: 200,
    include: {
      paciente: { select: { nome: true, dataNascimento: true, cns: true } },
      profissional: { select: { nome: true, tipo: true } },
      unidade: { select: { nome: true } },
    },
  })
  return NextResponse.json({ agendamentos, total: agendamentos.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const body = await req.json()

  const Schema = z.object({
    unidadeId: z.string(),
    profissionalId: z.string().optional(),
    pacienteId: z.string(),
    tipoAtendimento: z.string(),
    dataAgendamento: z.string(),
    horaAgendamento: z.string(),
    observacao: z.string().optional(),
  })
  const val = Schema.safeParse(body)
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  // Verificar disponibilidade do profissional
  if (d.profissionalId) {
    const conflito = await prisma.agendamento.findFirst({
      where: {
        municipioId: usuario.municipioId,
        profissionalId: d.profissionalId,
        dataAgendamento: new Date(d.dataAgendamento),
        horaAgendamento: d.horaAgendamento,
        situacao: { notIn: ['CANCELADO', 'FALTOU'] },
      },
    })
    if (conflito) return NextResponse.json({ erro: 'Horário já ocupado para este profissional' }, { status: 409 })
  }

  const agend = await prisma.agendamento.create({
    data: {
      municipioId: usuario.municipioId,
      criadoPor: usuario.id,
      ...d,
      tipoAtendimento: d.tipoAtendimento as any,
      dataAgendamento: new Date(d.dataAgendamento),
    } as any,
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'CRIAR_AGENDAMENTO', entidade: 'Agendamento', entidadeId: agend.id,
    detalhes: { data: d.dataAgendamento, hora: d.horaAgendamento, tipo: d.tipoAtendimento },
  })

  return NextResponse.json({ agendamento: agend }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, situacao, motivoCancelamento } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const ag = await prisma.agendamento.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!ag) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })

  await prisma.agendamento.update({
    where: { id },
    data: { situacao, motivoCancelamento },
  })
  return NextResponse.json({ sucesso: true })
}
