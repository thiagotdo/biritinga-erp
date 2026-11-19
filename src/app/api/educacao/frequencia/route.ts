import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'

export const runtime = 'nodejs'

// ─── Frequência / Diário de Classe ───────────────────────────────────────────
// LDB Art. 24 V-a: frequência mínima de 75% do total de horas letivas.
// Fluxo:
//   1. Registrar AulaMinistrada (cria registro da aula do dia)
//   2. Lançar presença/falta por aluno (batch por turma)
//   3. Recalcular percentualFreq na matrícula (atômico)

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const turmaId    = searchParams.get('turmaId')
  const matriculaId = searchParams.get('matriculaId')
  const data       = searchParams.get('data')
  const relatorio  = searchParams.get('relatorio')

  // Relatório de frequência da turma por período
  if (relatorio === 'TURMA' && turmaId) {
    const dataInicio = searchParams.get('dataInicio')
    const dataFim    = searchParams.get('dataFim')

    // Aulas ministradas no período
    const aulas = await prisma.aulaMinistrada.findMany({
      where: {
        turmaId, municipioId: usuario.municipioId,
        ...(dataInicio || dataFim ? {
          data: {
            ...(dataInicio ? { gte: new Date(dataInicio) } : {}),
            ...(dataFim    ? { lte: new Date(dataFim + 'T23:59:59') } : {}),
          },
        } : {}),
      },
      orderBy: { data: 'asc' },
      include: {
        frequencias: {
          include: { matricula: { include: { aluno: { select: { nome: true } } } } },
        },
      },
    })

    // Resumo por aluno
    const matriculas = await prisma.matricula.findMany({
      where: { turmaId, municipioId: usuario.municipioId, situacao: 'ATIVA' },
      include: { aluno: { select: { nome: true } } },
    })

    const resumo = matriculas.map(m => {
      const minhasFreqs = aulas.flatMap(a => a.frequencias.filter(f => f.matriculaId === m.id))
      const totalAulas  = aulas.reduce((s, a) => s + a.numeroPeriodos, 0)
      const faltas      = minhasFreqs.filter(f => !f.presente && !f.justificada).length
      const freq        = totalAulas > 0 ? ((totalAulas - faltas) / totalAulas * 100) : 100
      return {
        matriculaId: m.id, numero: m.numero, aluno: m.aluno.nome,
        totalAulas, faltas, frequencia: freq.toFixed(1),
        emRisco: freq < 75,
      }
    })

    return NextResponse.json({ aulas: aulas.length, resumo })
  }

  // Chamada do dia (retorna lista de alunos com presença/falta para a aula)
  if (turmaId && data) {
    const dataObj = new Date(data)
    const inicioDia = new Date(dataObj.toDateString())

    const aula = await prisma.aulaMinistrada.findFirst({
      where: {
        turmaId, municipioId: usuario.municipioId,
        data: { gte: inicioDia, lt: new Date(inicioDia.getTime() + 86400000) },
      },
      include: { frequencias: true },
    })

    const matriculas = await prisma.matricula.findMany({
      where: { turmaId, municipioId: usuario.municipioId, situacao: 'ATIVA' },
      include: { aluno: { select: { nome: true, pcd: true } } },
      orderBy: { aluno: { nome: 'asc' } },
    })

    const chamada = matriculas.map(m => {
      const freq = aula?.frequencias.find(f => f.matriculaId === m.id)
      return {
        matriculaId: m.id, numero: m.numero,
        aluno: m.aluno.nome, pcd: m.aluno.pcd,
        presente: freq?.presente ?? null,  // null = ainda não lançado
        justificada: freq?.justificada ?? false,
        aulaId: aula?.id ?? null,
      }
    })

    return NextResponse.json({ chamada, aulaRegistrada: !!aula, aulaId: aula?.id })
  }

  // Histórico de frequência de um aluno
  if (matriculaId) {
    const freqs = await prisma.frequencia.findMany({
      where: { matriculaId, municipioId: usuario.municipioId },
      include: { aula: { select: { data: true, disciplina: true, numeroPeriodos: true } } },
      orderBy: { aula: { data: 'desc' } },
      take: 100,
    })
    return NextResponse.json({ frequencias: freqs })
  }

  return NextResponse.json({ erro: 'Parâmetros insuficientes' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    turmaId:       z.string(),
    data:          z.string(),
    numeroPeriodos: z.number().int().min(1).max(6).default(1),
    disciplina:    z.string().optional(),
    conteudo:      z.string().optional(),
    // Presença de cada aluno: array de { matriculaId, presente, justificada? }
    chamada: z.array(z.object({
      matriculaId: z.string(),
      presente:    z.boolean(),
      justificada: z.boolean().default(false),
    })),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const dataAula = new Date(d.data)

  // Criar ou reusar aula do dia
  let aula = await prisma.aulaMinistrada.findFirst({
    where: {
      turmaId: d.turmaId, municipioId: usuario.municipioId,
      data: {
        gte: new Date(dataAula.toDateString()),
        lt:  new Date(new Date(dataAula.toDateString()).getTime() + 86400000),
      },
      disciplina: d.disciplina ?? null,
    },
  })

  if (!aula) {
    aula = await prisma.aulaMinistrada.create({
      data: {
        municipioId:    usuario.municipioId,
        turmaId:        d.turmaId,
        data:           dataAula,
        numeroPeriodos: d.numeroPeriodos,
        disciplina:     d.disciplina,
        conteudo:       d.conteudo,
        usuarioId:      usuario.id,
      },
    })
  }

  // Lançar/atualizar frequências em transaction + recalcular percentual
  await prisma.$transaction(async (tx) => {
    for (const item of d.chamada) {
      await tx.frequencia.upsert({
        where: { matriculaId_aulaId: { matriculaId: item.matriculaId, aulaId: aula!.id } },
        create: {
          municipioId: usuario.municipioId,
          matriculaId: item.matriculaId,
          aulaId:      aula!.id,
          presente:    item.presente,
          justificada: item.justificada,
        },
        update: { presente: item.presente, justificada: item.justificada },
      })
    }

    // Recalcular percentual de frequência para cada matrícula afetada
    const matriculaIds = [...new Set(d.chamada.map(c => c.matriculaId))]
    for (const matriculaId of matriculaIds) {
      // Total de aulas da turma
      const aulas = await tx.aulaMinistrada.findMany({
        where: { turmaId: d.turmaId },
        select: { id: true, numeroPeriodos: true },
      })
      const totalPeriodos = aulas.reduce((s, a) => s + a.numeroPeriodos, 0)

      // Faltas (não justificadas)
      const faltas = await tx.frequencia.count({
        where: {
          matriculaId,
          aulaId:    { in: aulas.map(a => a.id) },
          presente:  false,
          justificada: false,
        },
      })

      const percentual = totalPeriodos > 0
        ? ((totalPeriodos - faltas) / totalPeriodos) * 100
        : 100

      await tx.matricula.update({
        where: { id: matriculaId },
        data: {
          totalAulas: totalPeriodos,
          totalFaltas: faltas,
          percentualFreq: Math.min(100, Math.max(0, percentual)),
        },
      })
    }
  })

  return NextResponse.json({ sucesso: true, aulaId: aula.id })
}
