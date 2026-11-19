import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'

export const runtime = 'nodejs'

// ─── Avaliações e Notas ───────────────────────────────────────────────────────
// Fluxo: criar Avaliacao (por turma/disciplina/bimestre) → lançar Nota por aluno
// Ao lançar nota: recalcular mediaGeral da matrícula (média ponderada por bimestre)

async function recalcularMedia(matriculaId: string, tx: any) {
  const notas = await tx.nota.findMany({
    where: { matriculaId },
    include: { avaliacao: { select: { peso: true, bimestre: true } } },
  })

  if (notas.length === 0) return

  // Média ponderada simples
  let somaPonderada = 0
  let somaPesos = 0

  for (const nota of notas) {
    const valor = Number(nota.valor)
    const peso  = Number(nota.avaliacao.peso)
    somaPonderada += valor * peso
    somaPesos     += peso
  }

  const mediaGeral = somaPesos > 0 ? somaPonderada / somaPesos : 0

  await tx.matricula.update({
    where: { id: matriculaId },
    data: { mediaGeral: Math.min(10, Math.max(0, mediaGeral)) },
  })
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const turmaId     = searchParams.get('turmaId')
  const matriculaId = searchParams.get('matriculaId')
  const avaliacaoId = searchParams.get('avaliacaoId')
  const bimestre    = searchParams.get('bimestre')

  // Lista de avaliações de uma turma
  if (turmaId && !avaliacaoId) {
    const where: any = { turmaId, municipioId: usuario.municipioId }
    if (bimestre) where.bimestre = Number(bimestre)

    const avaliacoes = await prisma.avaliacao.findMany({
      where, orderBy: [{ bimestre: 'asc' }, { dataAplicacao: 'asc' }],
      include: {
        _count: { select: { notas: true } },
      },
    })
    return NextResponse.json({ avaliacoes })
  }

  // Boletim de um aluno (todas as notas por bimestre)
  if (matriculaId) {
    const notas = await prisma.nota.findMany({
      where: { matriculaId, municipioId: usuario.municipioId },
      include: {
        avaliacao: {
          select: {
            titulo: true, tipo: true, bimestre: true,
            disciplina: true, valorMaximo: true, peso: true,
          },
        },
      },
      orderBy: [
        { avaliacao: { bimestre: 'asc' } },
        { avaliacao: { disciplina: 'asc' } },
      ],
    })

    // Agrupar por bimestre
    const boletim: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [] }
    for (const nota of notas) {
      const b = nota.avaliacao.bimestre
      if (boletim[b]) boletim[b].push(nota)
    }

    const matricula = await prisma.matricula.findFirst({
      where: { id: matriculaId },
      select: { mediaGeral: true, percentualFreq: true, resultadoFinal: true },
    })

    return NextResponse.json({ boletim, resumo: matricula })
  }

  // Notas de uma avaliação específica (grade por turma)
  if (avaliacaoId) {
    const avaliacao = await prisma.avaliacao.findFirst({
      where: { id: avaliacaoId, municipioId: usuario.municipioId },
    })
    if (!avaliacao) return NextResponse.json({ erro: 'Avaliação não encontrada' }, { status: 404 })

    // Matriculas ativas da turma
    const matriculas = await prisma.matricula.findMany({
      where: { turmaId: avaliacao.turmaId, situacao: 'ATIVA', municipioId: usuario.municipioId },
      include: { aluno: { select: { nome: true } } },
      orderBy: { aluno: { nome: 'asc' } },
    })

    // Notas já lançadas
    const notas = await prisma.nota.findMany({
      where: { avaliacaoId, municipioId: usuario.municipioId },
    })
    const notasMap = new Map(notas.map(n => [n.matriculaId, n]))

    const grade = matriculas.map(m => ({
      matriculaId: m.id, numero: m.numero,
      aluno: m.aluno.nome,
      nota: notasMap.get(m.id) ?? null,
    }))

    return NextResponse.json({ avaliacao, grade })
  }

  return NextResponse.json({ erro: 'Parâmetros insuficientes' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  // Criar avaliação
  const Schema = z.object({
    turmaId:       z.string(),
    tipo:          z.enum(['PROVA','TRABALHO','ATIVIDADE','SIMULADO','RECUPERACAO','CONCEITUAL']),
    bimestre:      z.number().int().min(1).max(4),
    disciplina:    z.string().min(1),
    titulo:        z.string().min(3),
    dataAplicacao: z.string(),
    valorMaximo:   z.number().min(0).max(100).default(10),
    peso:          z.number().min(0).max(10).default(1),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const avaliacao = await prisma.avaliacao.create({
    data: {
      municipioId: usuario.municipioId,
      ...d,
      dataAplicacao: new Date(d.dataAplicacao),
    },
  })

  return NextResponse.json({ avaliacao }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { acao, avaliacaoId, notas: notasPayload, ...single } = await req.json()

  // Lançamento em lote (grade inteira de uma avaliação)
  if (acao === 'LANCAR_LOTE' && avaliacaoId && notasPayload) {
    const avaliacao = await prisma.avaliacao.findFirst({
      where: { id: avaliacaoId, municipioId: usuario.municipioId },
    })
    if (!avaliacao) return NextResponse.json({ erro: 'Avaliação não encontrada' }, { status: 404 })

    const NotaSchema = z.array(z.object({
      matriculaId: z.string(),
      valor:       z.number().min(0).max(Number(avaliacao.valorMaximo)),
      conceito:    z.string().optional(),
      observacao:  z.string().optional(),
    }))
    const val = NotaSchema.safeParse(notasPayload)
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })

    await prisma.$transaction(async (tx) => {
      for (const item of val.data) {
        await tx.nota.upsert({
          where: { matriculaId_avaliacaoId: { matriculaId: item.matriculaId, avaliacaoId } },
          create: {
            municipioId: usuario.municipioId,
            matriculaId: item.matriculaId, avaliacaoId,
            valor: item.valor, conceito: item.conceito, observacao: item.observacao,
            usuarioId: usuario.id,
          },
          update: { valor: item.valor, conceito: item.conceito, observacao: item.observacao },
        })
        // Recalcular média após cada nota
        await recalcularMedia(item.matriculaId, tx)
      }
    })

    return NextResponse.json({ sucesso: true, totalLancadas: val.data.length })
  }

  // Lançamento individual
  const { matriculaId, valor, conceito, observacao } = single
  if (!avaliacaoId || !matriculaId) {
    return NextResponse.json({ erro: 'avaliacaoId e matriculaId são obrigatórios' }, { status: 400 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.nota.upsert({
      where: { matriculaId_avaliacaoId: { matriculaId, avaliacaoId } },
      create: {
        municipioId: usuario.municipioId, matriculaId, avaliacaoId,
        valor, conceito, observacao, usuarioId: usuario.id,
      },
      update: { valor, conceito, observacao },
    })
    await recalcularMedia(matriculaId, tx)
  })

  return NextResponse.json({ sucesso: true })
}
