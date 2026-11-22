/**
 * GET /api/sefin/orcamento   - resumo orçamentário do exercício
 * POST /api/sefin/orcamento  - cria LOA / dotação
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
  const exercicio = parseInt(searchParams.get('exercicio') ?? new Date().getFullYear().toString())

  try {
    // LOA vigente
    const loa = await db.LOA.findFirst({
      where: { municipioId, exercicio: exercicio as any },
    }) as any

    // Execução orçamentária por unidade
    const execucao = await db.$queryRaw`
      SELECT
        u.nome  as unidade,
        u.sigla,
        COALESCE(SUM(d.valorOrcado + d.valorSuplementado - d.valorAnulado), 0) as valorOrcado,
        COALESCE(SUM(e.valor - e.valorAnulado), 0)    as valorEmpenhado,
        COALESCE(SUM(l.valor), 0)                     as valorLiquidado,
        COALESCE(SUM(p.valor), 0)                     as valorPago
      FROM Unidade u
      LEFT JOIN Dotacao d ON d.unidadeId = u.id AND d.loaId = ${loa?.id ?? ''}
      LEFT JOIN Empenho e ON e.dotacaoId = d.id AND e.exercicio = ${exercicio}
        AND e.status NOT IN ('ANULADO','CANCELADO')
      LEFT JOIN Liquidacao l ON l.empenhoId = e.id
      LEFT JOIN Pagamento  p ON p.liquidacaoId = l.id
      WHERE u.municipioId = ${municipioId} AND u.ativo = 1
      GROUP BY u.id
      ORDER BY u.nome
    `

    // Totais globais
    const totais = await db.$queryRaw`
      SELECT
        COALESCE(SUM(d.valorOrcado + d.valorSuplementado - d.valorAnulado), 0) as totalOrcado,
        COALESCE(SUM(CASE WHEN e.status NOT IN ('ANULADO','CANCELADO') THEN e.valor - e.valorAnulado ELSE 0 END), 0) as totalEmpenhado,
        COALESCE(SUM(l.valor), 0) as totalLiquidado,
        COALESCE(SUM(p.valor), 0) as totalPago
      FROM Dotacao d
      LEFT JOIN Empenho   e ON e.dotacaoId    = d.id    AND e.exercicio = ${exercicio}
      LEFT JOIN Liquidacao l ON l.empenhoId   = e.id
      LEFT JOIN Pagamento  p ON p.liquidacaoId = l.id
      WHERE d.municipioId = ${municipioId}
        AND ${loa?.id ? `d.loaId = '${loa.id}'` : '1=1'}
    ` as any[]

    // Dotações (top 20 por valor)
    const dotacoes = loa ? await db.Dotacao.findMany({
      where: { municipioId, loaId: loa.id },
      orderBy: { valorOrcado: 'desc' },
      take: 20,
    }) : []

    return NextResponse.json({
      loa,
      execucao,
      totais: totais[0] ?? {},
      dotacoes,
      exercicio,
    })
  } catch (e: any) {
    console.error('[GET /api/sefin/orcamento]', e.message)
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Sem município' }, { status: 401 })

  try {
    const body = await req.json()
    const { tipo, ...data } = body // tipo: 'loa' | 'dotacao'

    if (tipo === 'loa') {
      const loa = await db.LOA.create({
        data: {
          id: randomUUID(),
          municipioId,
          exercicio: data.exercicio,
          lei: data.lei ?? null,
          dataPublicacao: data.dataPublicacao ?? null,
          valorTotal: parseFloat(data.valorTotal ?? '0'),
          status: 'ELABORACAO',
        },
      })
      return NextResponse.json({ ok: true, loa }, { status: 201 })
    }

    if (tipo === 'dotacao') {
      const dotacao = await db.Dotacao.create({
        data: {
          id: randomUUID(),
          municipioId,
          loaId: data.loaId,
          unidadeId: data.unidadeId ?? null,
          codigo: data.codigo,
          descricao: data.descricao,
          funcao: data.funcao ?? null,
          subfuncao: data.subfuncao ?? null,
          programa: data.programa ?? null,
          acao: data.acao ?? null,
          elementoDespesa: data.elementoDespesa ?? null,
          fonte: data.fonte ?? null,
          valorOrcado: parseFloat(data.valorOrcado ?? '0'),
          valorSuplementado: 0,
          valorAnulado: 0,
        },
      })
      return NextResponse.json({ ok: true, dotacao }, { status: 201 })
    }

    return NextResponse.json({ erro: 'tipo deve ser "loa" ou "dotacao"' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
