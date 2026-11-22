/**
 * GET  /api/sefin/receitas   - lista lançamentos de receita
 * POST /api/sefin/receitas   - cria lançamento
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

function mid(req: NextRequest) {
  return req.headers.get('x-erp-municipio-id') ?? ''
}

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Sem município' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page      = Math.max(1, parseInt(searchParams.get('page')  ?? '1'))
  const limit     = Math.min(100, parseInt(searchParams.get('limit') ?? '20'))
  const skip      = (page - 1) * limit
  const mes       = searchParams.get('mes')       ?? undefined
  const exercicio = searchParams.get('exercicio') ?? new Date().getFullYear().toString()

  try {
    // Resumo por categoria de receita (previsto x realizado)
    const resumo = await db.$queryRaw`
      SELECT
        rp.descricao,
        rp.categoria,
        rp.valorPrevisto,
        COALESCE(SUM(lr.valor), 0) as valorArrecadado
      FROM ReceitaPrevista rp
      LEFT JOIN LancamentoReceita lr ON lr.receitaPrevistaId = rp.id
        AND YEAR(lr.dataLancamento) = ${parseInt(exercicio)}
      WHERE rp.municipioId = ${municipioId}
        AND rp.exercicio = ${parseInt(exercicio)}
      GROUP BY rp.id
      ORDER BY rp.categoria, rp.descricao
    `

    // Lançamentos recentes
    const where: any = { municipioId }
    if (mes) {
      // Filtrar por mês (ex: "2024-03")
      const [ano, m] = mes.split('-')
      where.dataLancamento = {
        gte: `${ano}-${m}-01`,
        lte: `${ano}-${m}-31`,
      }
    }

    const lancamentos = await db.LancamentoReceita.findMany({
      where,
      orderBy: { dataLancamento: 'desc' },
      take: limit,
      skip,
    })

    const total = await db.LancamentoReceita.count({ where })

    // Totais
    const totais = await db.$queryRaw`
      SELECT
        COALESCE(SUM(rp.valorPrevisto), 0)       as totalPrevisto,
        COALESCE(SUM(lr.valor), 0)               as totalArrecadado
      FROM ReceitaPrevista rp
      LEFT JOIN LancamentoReceita lr ON lr.receitaPrevistaId = rp.id
        AND YEAR(lr.dataLancamento) = ${parseInt(exercicio)}
      WHERE rp.municipioId = ${municipioId}
        AND rp.exercicio = ${parseInt(exercicio)}
    ` as any[]

    return NextResponse.json({
      resumo,
      lancamentos,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
      totais: totais[0] ?? { totalPrevisto: 0, totalArrecadado: 0 },
    })
  } catch (e: any) {
    console.error('[GET /api/sefin/receitas]', e.message)
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Sem município' }, { status: 401 })

  try {
    const body = await req.json()
    const { receitaPrevistaId, contaBancariaId, dataLancamento, valor, descricao, documento, fonte } = body

    if (!dataLancamento || !valor) {
      return NextResponse.json({ erro: 'Campos obrigatórios: dataLancamento, valor' }, { status: 400 })
    }

    const lancamento = await db.LancamentoReceita.create({
      data: {
        id: randomUUID(),
        municipioId,
        receitaPrevistaId: receitaPrevistaId ?? null,
        contaBancariaId: contaBancariaId ?? null,
        dataLancamento,
        valor: parseFloat(valor),
        descricao: descricao ?? null,
        documento: documento ?? null,
        fonte: fonte ?? null,
      },
    })

    return NextResponse.json({ ok: true, lancamento }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
