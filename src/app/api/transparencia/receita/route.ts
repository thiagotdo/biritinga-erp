// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma, getConn } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'

export const runtime = 'nodejs'

// ─── Receitas Orçamentárias ───────────────────────────────────────────────────
// Lei 4.320/1964 - Normas de Direito Financeiro
// LC 101/2000 (LRF) - responsabilidade fiscal
// Portaria STN 877/2014 - Manual de Contabilidade do Setor Público (MCASP)
// Instrução Normativa STN 02/2021 - SICONFI

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const relatorio    = searchParams.get('relatorio')
  const exercicio    = searchParams.get('exercicio') ? parseInt(searchParams.get('exercicio')!) : new Date().getFullYear()
  const competencia  = searchParams.get('competencia')
  const natureza     = searchParams.get('natureza')

  if (relatorio === 'DASHBOARD') {
    const conn = await getConn()
    try {
      const mid = usuario.municipioId

      const [totaisRows] = await conn.execute(
        `SELECT SUM(previsto) as previsto, SUM(arrecadado) as arrecadado
         FROM ReceitaOrcamentaria WHERE municipioId = ? AND exercicio = ?`,
        [mid, exercicio]
      ) as any[]
      const t = totaisRows[0] || {}
      const previsto   = Number(t.previsto ?? 0)
      const arrecadado = Number(t.arrecadado ?? 0)
      const pct        = previsto > 0 ? ((arrecadado / previsto) * 100).toFixed(1) : '0'

      const [porNaturezaRows] = await conn.execute(
        `SELECT natureza, SUM(previsto) as previsto, SUM(arrecadado) as arrecadado
         FROM ReceitaOrcamentaria WHERE municipioId = ? AND exercicio = ?
         GROUP BY natureza ORDER BY SUM(arrecadado) DESC`,
        [mid, exercicio]
      ) as any[]

      const [evolucaoRows] = await conn.execute(
        `SELECT mes, competencia, SUM(previsto) as previsto, SUM(arrecadado) as arrecadado
         FROM ReceitaOrcamentaria WHERE municipioId = ? AND exercicio = ?
         GROUP BY mes, competencia ORDER BY mes ASC`,
        [mid, exercicio]
      ) as any[]

      const [topRows] = await conn.execute(
        `SELECT codigoReceita, descricao, SUM(arrecadado) as arrecadado
         FROM ReceitaOrcamentaria WHERE municipioId = ? AND exercicio = ?
         GROUP BY codigoReceita, descricao ORDER BY SUM(arrecadado) DESC LIMIT 10`,
        [mid, exercicio]
      ) as any[]

      return NextResponse.json({
        kpis: { previsto, arrecadado, pct, superavit: arrecadado - previsto },
        porNatureza: (porNaturezaRows as any[]).map((r: any) => ({
          natureza: r.natureza,
          previsto: Number(r.previsto ?? 0),
          arrecadado: Number(r.arrecadado ?? 0),
        })),
        evolucaoMensal: (evolucaoRows as any[]).map((r: any) => ({
          mes: r.mes, competencia: r.competencia,
          previsto: Number(r.previsto ?? 0),
          arrecadado: Number(r.arrecadado ?? 0),
        })),
        topReceitas: (topRows as any[]).map((r: any) => ({
          codigo: r.codigoReceita, descricao: r.descricao,
          arrecadado: Number(r.arrecadado ?? 0),
        })),
      })
    } finally {
      await conn.end()
    }
  }

  // Lista filtrada
  const conn = await getConn()
  try {
    const params: any[] = [usuario.municipioId, exercicio]
    let where = 'municipioId = ? AND exercicio = ?'
    if (competencia) { where += ' AND competencia = ?'; params.push(competencia) }
    if (natureza)    { where += ' AND natureza = ?'; params.push(natureza) }

    const [receitas] = await conn.execute(
      `SELECT * FROM ReceitaOrcamentaria WHERE ${where} ORDER BY natureza ASC, codigoReceita ASC LIMIT 500`,
      params
    ) as any[]

    return NextResponse.json({ receitas, total: (receitas as any[]).length })
  } finally {
    await conn.end()
  }
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
      rows.map((r: any) => prisma.ReceitaOrcamentaria.upsert({
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

  const rec = await prisma.ReceitaOrcamentaria.upsert({
    where: { municipioId_competencia_codigoReceita: {
      municipioId: usuario.municipioId, competencia: d.competencia, codigoReceita: d.codigoReceita,
    }},
    update: { previsto: d.previsto, arrecadado: d.arrecadado },
    create: { municipioId: usuario.municipioId, ...d, natureza: d.natureza as any } as any,
  })
  return NextResponse.json({ receita: rec }, { status: 201 })
}
