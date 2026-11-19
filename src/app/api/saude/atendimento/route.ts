import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Atendimentos / Prontuário Eletrônico ────────────────────────────────────
// LGPD Art. 11 §1 — dados de saúde: tratamento somente com consentimento ou
//   finalidade de saúde pública (Art. 11 II b)
// Resolução CFM 1.638/2002 — prontuário é documento de propriedade do paciente
// Resolução CFM 2.217/2018 — vedado acesso por não profissional de saúde

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const relatorio  = searchParams.get('relatorio')
  const pacienteId = searchParams.get('pacienteId')
  const unidadeId  = searchParams.get('unidadeId')
  const id         = searchParams.get('id')
  const dataInicio = searchParams.get('dataInicio')
  const dataFim    = searchParams.get('dataFim')

  if (relatorio === 'DASHBOARD') {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const mesInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

    const [totalHoje, totalMes, porTipo, porCid, producaoSemanal] = await Promise.all([
      prisma.atendimento.count({
        where: { municipioId: usuario.municipioId, dataAtendimento: { gte: hoje } },
      }),
      prisma.atendimento.count({
        where: { municipioId: usuario.municipioId, dataAtendimento: { gte: mesInicio }, situacao: 'CONCLUIDO' },
      }),
      prisma.atendimento.groupBy({
        by: ['tipo'],
        where: { municipioId: usuario.municipioId, dataAtendimento: { gte: mesInicio } },
        _count: { _all: true },
        orderBy: { _count: { tipo: 'desc' } },
        take: 8,
      }),
      prisma.atendimento.groupBy({
        by: ['cid10'],
        where: { municipioId: usuario.municipioId, dataAtendimento: { gte: mesInicio }, cid10: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { cid10: 'desc' } },
        take: 10,
      }),
      // Produção últimas 4 semanas por dia da semana
      prisma.$queryRaw<Array<{ diaSemana: number; total: number }>>`
        SELECT DAYOFWEEK(dataAtendimento) as diaSemana, COUNT(*) as total
        FROM Atendimento
        WHERE municipioId = ${usuario.municipioId}
          AND dataAtendimento >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
        GROUP BY DAYOFWEEK(dataAtendimento)
        ORDER BY diaSemana
      `,
    ])

    return NextResponse.json({
      kpis: { totalHoje, totalMes },
      porTipo: porTipo.map(t => ({ tipo: t.tipo, count: t._count._all })),
      topCid: porCid.filter(c => c.cid10).map(c => ({ cid: c.cid10!, count: c._count._all })),
      producaoSemanal: producaoSemanal.map(d => ({ dia: d.diaSemana, total: Number(d.total) })),
    })
  }

  if (id) {
    // Dados sensíveis: somente retorna com autenticação
    const at = await prisma.atendimento.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        paciente: { select: { id: true, nome: true, dataNascimento: true, sexo: true, cns: true } },
        profissional: { select: { nome: true, tipo: true, registro: true } },
        unidade: { select: { nome: true } },
        agendamento: { select: { dataAgendamento: true, tipoAtendimento: true } },
      },
    })
    if (!at) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
    return NextResponse.json({ atendimento: at })
  }

  const where: any = { municipioId: usuario.municipioId }
  if (pacienteId) where.pacienteId = pacienteId
  if (unidadeId)  where.unidadeId  = unidadeId
  if (dataInicio) where.dataAtendimento = { gte: new Date(dataInicio) }
  if (dataFim)    where.dataAtendimento = { ...where.dataAtendimento, lte: new Date(dataFim) }

  const atendimentos = await prisma.atendimento.findMany({
    where, orderBy: { dataAtendimento: 'desc' }, take: 200,
    include: {
      paciente: { select: { nome: true } },
      profissional: { select: { nome: true, tipo: true } },
      unidade: { select: { nome: true } },
    },
  })
  return NextResponse.json({ atendimentos, total: atendimentos.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const body = await req.json()

  const Schema = z.object({
    agendamentoId: z.string().optional(),
    unidadeId: z.string(),
    profissionalId: z.string().optional(),
    pacienteId: z.string(),
    tipo: z.string(),
    queixaPrincipal: z.string().optional(),
    historicoDoenca: z.string().optional(),
    exameFisico: z.string().optional(),
    hipoteseDiagnostica: z.string().optional(),
    cid10: z.string().optional(),
    conduta: z.string().optional(),
    prescricao: z.string().optional(),
    pressaoArterial: z.string().optional(),
    temperatura: z.number().optional(),
    peso: z.number().optional(),
    altura: z.number().optional(),
    glicemia: z.number().int().optional(),
    encaminhamento: z.string().optional(),
    retorno: z.string().optional(),
  })
  const val = Schema.safeParse(body)
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const at = await prisma.atendimento.create({
    data: {
      municipioId: usuario.municipioId,
      situacao: 'CONCLUIDO',
      ...d,
      tipo: d.tipo as any,
      retorno: d.retorno ? new Date(d.retorno) : undefined,
    } as any,
  })

  // Se veio de agendamento, marcar como ATENDIDO
  if (d.agendamentoId) {
    await prisma.agendamento.update({
      where: { id: d.agendamentoId },
      data: { situacao: 'ATENDIDO' },
    })
  }

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'REGISTRAR_ATENDIMENTO', entidade: 'Atendimento', entidadeId: at.id,
    detalhes: { tipo: d.tipo, cid: d.cid10 },
  })

  return NextResponse.json({ atendimento: at }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, situacao, ...dados } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const at = await prisma.atendimento.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!at) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })

  await prisma.atendimento.update({ where: { id }, data: { situacao, ...dados } })
  return NextResponse.json({ sucesso: true })
}
