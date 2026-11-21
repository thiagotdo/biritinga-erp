import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Portal da Transparência — Publicações ────────────────────────────────────
// LC 131/2009 — transparência fiscal em tempo real
// Lei 12.527/2011 — acesso à informação
// Decreto 7.185/2010 — prazo máximo de divulgação: até o 1º dia útil seguinte

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const relatorio    = searchParams.get('relatorio')
  const id           = searchParams.get('id')
  const tipo         = searchParams.get('tipo')
  const exercicio    = searchParams.get('exercicio')
  const busca        = searchParams.get('busca')
  const publico      = searchParams.get('publico')   // portal público, sem auth
  const municipioId  = searchParams.get('municipioId')

  // ── Portal público (sem autenticação) ───────────────────────────────────
  if (publico === '1' && municipioId) {
    const where: any = { municipioId, situacao: 'PUBLICADA' }
    if (tipo)      where.tipo     = tipo
    if (exercicio) where.exercicio = parseInt(exercicio)
    if (busca) {
      where.OR = [
        { titulo: { contains: busca } },
        { descricao: { contains: busca } },
        { tags: { contains: busca } },
      ]
    }
    const publicacoes = await prisma.publicacaoTransparencia.findMany({
      where, orderBy: { publicadoEm: 'desc' }, take: 100,
      select: { id: true, tipo: true, titulo: true, descricao: true, periodo: true, exercicio: true,
        valorTotal: true, urlArquivo: true, nomeArquivo: true, publicadoEm: true },
    })
    return NextResponse.json({ publicacoes })
  }

  // ── Autenticado ──────────────────────────────────────────────────────────
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  if (relatorio === 'DASHBOARD') {
    const anoAtual = new Date().getFullYear()
    const [totalPublic, porTipo, porExercicio] = await Promise.all([
      prisma.publicacaoTransparencia.count({ where: { municipioId: usuario.municipioId, situacao: 'PUBLICADA' } }),
      prisma.publicacaoTransparencia.groupBy({
        by: ['tipo'],
        where: { municipioId: usuario.municipioId },
        _count: { _all: true },
        orderBy: { _count: { tipo: 'desc' } },
      }),
      prisma.publicacaoTransparencia.groupBy({
        by: ['exercicio'],
        where: { municipioId: usuario.municipioId },
        _count: { _all: true },
        orderBy: { exercicio: 'desc' },
      }),
    ])

    // Resumo receitas e despesas do ano
    const [recSumaryo, despSumary] = await Promise.all([
      prisma.receitaOrcamentaria.aggregate({
        where: { municipioId: usuario.municipioId, exercicio: anoAtual },
        _sum: { previsto: true, arrecadado: true },
      }),
      prisma.despesaOrcamentaria.aggregate({
        where: { municipioId: usuario.municipioId, exercicio: anoAtual },
        _sum: { orcado: true, empenhado: true, liquidado: true, pago: true },
      }),
    ])

    // Evolução mensal de arrecadação
    const recMensal = await prisma.receitaOrcamentaria.groupBy({
      by: ['mes', 'competencia'],
      where: { municipioId: usuario.municipioId, exercicio: anoAtual },
      _sum: { arrecadado: true },
      orderBy: { mes: 'asc' },
    })

    const despMensal = await prisma.despesaOrcamentaria.groupBy({
      by: ['mes', 'competencia'],
      where: { municipioId: usuario.municipioId, exercicio: anoAtual },
      _sum: { pago: true },
      orderBy: { mes: 'asc' },
    })

    return NextResponse.json({
      kpis: {
        totalPublic,
        receitaPrevista: recSumaryo._sum.previsto ?? 0,
        receitaArrecadada: recSumaryo._sum.arrecadado ?? 0,
        despesaOrcada: despSumary._sum.orcado ?? 0,
        despesaPaga: despSumary._sum.pago ?? 0,
      },
      porTipo,
      porExercicio,
      recMensal: recMensal.map(r => ({ mes: r.mes, competencia: r.competencia, arrecadado: r._sum.arrecadado ?? 0 })),
      despMensal: despMensal.map(d => ({ mes: d.mes, competencia: d.competencia, pago: d._sum.pago ?? 0 })),
    })
  }

  if (id) {
    const p = await prisma.publicacaoTransparencia.findFirst({ where: { id, municipioId: usuario.municipioId } })
    if (!p) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
    return NextResponse.json({ publicacao: p })
  }

  const where: any = { municipioId: usuario.municipioId }
  if (tipo)      where.tipo     = tipo
  if (exercicio) where.exercicio = parseInt(exercicio)
  if (busca) where.OR = [
    { titulo: { contains: busca } },
    { tags:   { contains: busca } },
  ]

  const publicacoes = await prisma.publicacaoTransparencia.findMany({
    where, orderBy: { publicadoEm: 'desc' }, take: 200,
  })
  return NextResponse.json({ publicacoes, total: publicacoes.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    tipo: z.string(),
    titulo: z.string().min(5),
    descricao: z.string().optional(),
    periodo: z.string().optional(),
    exercicio: z.number().optional(),
    valorTotal: z.number().optional(),
    urlArquivo: z.string().optional(),
    nomeArquivo: z.string().optional(),
    tamanho: z.number().optional(),
    tags: z.string().optional(),
    situacao: z.string().default('PUBLICADA'),
  })
  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const p = await prisma.publicacaoTransparencia.create({
    data: {
      municipioId: usuario.municipioId,
      usuarioId: usuario.usuarioId,
      ...d,
      tipo: d.tipo as any,
      situacao: d.situacao as any,
    } as any,
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.usuarioId,
    acao: 'CREATE', modulo: 'misc', recurso: 'PublicacaoTransparencia', registroId: p.id,
    dadosNovos: { tipo: d.tipo, titulo: d.titulo },
  })

  return NextResponse.json({ publicacao: p }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, ...dados } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const p = await prisma.publicacaoTransparencia.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!p) return NextResponse.json({ erro: 'Publicação não encontrada' }, { status: 404 })

  if (acao === 'RETIFICAR') {
    await prisma.publicacaoTransparencia.update({ where: { id }, data: { situacao: 'RETIFICADA', ...dados } })
    return NextResponse.json({ sucesso: true })
  }

  if (acao === 'REVOGAR') {
    await prisma.publicacaoTransparencia.update({ where: { id }, data: { situacao: 'REVOGADA' } })
    return NextResponse.json({ sucesso: true })
  }

  if (acao === 'REPUBLICAR') {
    await prisma.publicacaoTransparencia.update({ where: { id }, data: { situacao: 'PUBLICADA', publicadoEm: new Date() } })
    return NextResponse.json({ sucesso: true })
  }

  return NextResponse.json({ erro: 'Ação não reconhecida' }, { status: 400 })
}
