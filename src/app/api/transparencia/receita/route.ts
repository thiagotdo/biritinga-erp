// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'

export const runtime = 'nodejs'

// ─── Receitas Orçamentárias ───────────────────────────────────────────────────
// Lei 4.320/1964 — Normas de Direito Financeiro
// LC 101/2000 (LRF) — responsabilidade fiscal
// Portaria STN 877/2014 — Manual de Contabilidade do Setor Público (MCASP)
// Instrução Normativa STN 02/2021 — SICONFI

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const relatorio    = searchParams.get('relatorio')
  const exercicio    = searchParams.get('exercicio') ? parseInt(searchParams.get('exercicio')!) : new Date().getFullYear()
  const competencia  = searchParams.get('competencia')
  const natureza     = searchParams.get('natureza')

  if (relatorio === 'DASHBOARD') {
    const [totaisAno, porNatureza, evolucaoMensal] = await Promise.all([
      prisma.receitaOrcamentaria.aggregate({
        where: { municipioId: usuario.municipioId, exercicio },
        _sum: { previsto: true, arrecadado: true },
      }),
      prisma.receitaOrcamentaria.groupBy({
        by: ['natureza'],
        where: { municipioId: usuario.municipioId, exercicio },
        _sum: { previsto: true, arrecadado: true },
        orderBy: { _sum: { arrecadado: 'desc' } },
      }),
      prisma.receitaOrcamentaria.groupBy({
        by: ['mes', 'competencia'],
        where: { municipioId: usuario.municipioId, exercicio },
        _sum: { previsto: true, arrecadado: true },
        orderBy: { mes: 'asc' },
      }),
    ])

    // Top 10 receitas por arrecadação
    const topReceitas = await prisma.receitaOrcamentaria.groupBy({
      by: ['codigoReceita', 'descricao'],
      where: { municipioId: usuario.municipioId, exercicio },
      _sum: { arrecadado: true },
      orderBy: { _sum: { arrecadado: 'desc' } },
      take: 10,
    })

    const previsto   = Number(totaisAno._sum.previsto ?? 0)
    const arrecadado = Number(totaisAno._sum.arrecadado ?? 0)
    const pct        = previsto > 0 ? ((arrecadado / previsto) * 100).toFixed(1) : '0'

    return NextResponse.json({
      kpis: { previsto, arrecadado, pct, superavit: arrecadado - previsto },
      porNatureza: porNatureza.map(r => ({
        natureza: r.natureza,
        previsto: Number(r._sum.previsto ?? 0),
        arrecadado: Number(r._sum.arrecadado ?? 0),
      })),
      evolucaoMensal: evolucaoMensal.map(r => ({
        mes: r.mes, competencia: r.competencia,
        previsto: Number(r._sum.previsto ?? 0),
        arrecadado: Number(r._sum.arrecadado ?? 0),
      })),
      topReceitas: topReceitas.map(r => ({
        codigo: r.codigoReceita, descricao: r.descricao,
        arrecadado: Number(r._sum.arrecadado ?? 0),
      })),
    })
  }

  const where: any = { municipioId: usuario.municipioId, exercicio }
  if (competencia) where.competencia = competencia
  if (natureza)    where.natureza = natureza

  const receitas = await prisma.receitaOrcamentaria.findMany({
    where, orderBy: [{ natureza: 'asc' }, { codigoReceita: 'asc' }], take: 500,
  })
  return NextResponse.json({ receitas, total: receitas.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const body = await req.json()

  // Importação em lote
  if (body._recurso === 'IMPORTAR_LOTE') {
    const rows: any[] = body.rows ?? []
    if (!rows.length) return NextResponse.json({ erro: 'Nenhum registro' }, { status: 400 })

    const criados = await prisma.$transaction(
      rows.map((r: any) => prisma.receitaOrcamentaria.upsert({
        where: { municipioId_competencia_codigoReceita: {
          municipioId: usuario.municipioId,
          competencia: r.competencia,
          codigoReceita: r.codigoReceita,
        }},
        update: { previsto: r.previsto ?? 0, arrecadado: r.arrecadado ?? 0 },
        create: {
          municipioId: usuario.municipioId,
          exercicio: r.exercicio ?? new Date().getFullYear(),
          mes: r.mes ?? parseInt(r.competencia?.split('-')[1] ?? '1'),
          competencia: r.competencia,
          codigoReceita: r.codigoReceita,
          natureza: r.natureza as any,
          descricao: r.descricao,
          fonte: r.fonte,
          unidadeGestora: r.unidadeGestora,
          previsto: r.previsto ?? 0,
          arrecadado: r.arrecadado ?? 0,
        },
      }))
    )
    return NextResponse.json({ importados: criados.length }, { status: 201 })
  }

  // Lançamento individual
  const Schema = z.object({
    exercicio: z.number(),
    mes: z.number().min(1).max(12),
    competencia: z.string(),
    codigoReceita: z.string(),
    natureza: z.string(),
    descricao: z.string().min(3),
    fonte: z.string().optional(),
    unidadeGestora: z.string().optional(),
    previsto: z.number().default(0),
    arrecadado: z.number().default(0),
  })
  const val = Schema.safeParse(body)
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const rec = await prisma.receitaOrcamentaria.upsert({
    where: { municipioId_competencia_codigoReceita: {
      municipioId: usuario.municipioId, competencia: d.competencia, codigoReceita: d.codigoReceita,
    }},
    update: { previsto: d.previsto, arrecadado: d.arrecadado },
    create: { municipioId: usuario.municipioId, ...d, natureza: d.natureza as any } as any,
  })
  return NextResponse.json({ receita: rec }, { status: 201 })
}
