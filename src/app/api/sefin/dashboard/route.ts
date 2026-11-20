/**
 * GET /api/sefin/dashboard — KPIs e gráficos para o painel SEFIN
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
    // ── KPIs principais ────────────────────────────────────────────────────────
    const kpis = await db.$queryRaw`
      SELECT
        -- Orçamento LOA
        COALESCE((
          SELECT SUM(d.valorOrcado + d.valorSuplementado - d.valorAnulado)
          FROM Dotacao d
          JOIN LOA l ON l.id = d.loaId
          WHERE l.municipioId = ${municipioId} AND l.exercicio = ${exercicio}
        ), 0) as orcamentoTotal,

        -- Total empenhado (exceto anulados)
        COALESCE((
          SELECT SUM(e.valor - e.valorAnulado)
          FROM Empenho e
          WHERE e.municipioId = ${municipioId}
            AND e.exercicio = ${exercicio}
            AND e.status NOT IN ('ANULADO','CANCELADO')
        ), 0) as totalEmpenhado,

        -- Total pago
        COALESCE((
          SELECT SUM(p.valor)
          FROM Pagamento p
          JOIN Liquidacao l ON l.id = p.liquidacaoId
          JOIN Empenho    e ON e.id = l.empenhoId
          WHERE p.municipioId = ${municipioId}
            AND e.exercicio = ${exercicio}
        ), 0) as totalPago,

        -- Receita arrecadada
        COALESCE((
          SELECT SUM(lr.valor)
          FROM LancamentoReceita lr
          WHERE lr.municipioId = ${municipioId}
            AND YEAR(lr.dataLancamento) = ${exercicio}
        ), 0) as totalReceita,

        -- Receita prevista (LOA)
        COALESCE((
          SELECT SUM(rp.valorPrevisto)
          FROM ReceitaPrevista rp
          WHERE rp.municipioId = ${municipioId}
            AND rp.exercicio = ${exercicio}
        ), 0) as receitaPrevista
    ` as any[]

    const kpi = kpis[0] ?? {}

    // ── Receita x Despesa mensal (últimos 12 meses) ────────────────────────────
    const mensal = await db.$queryRaw`
      SELECT
        DATE_FORMAT(dt, '%Y-%m') as mes,
        'receita'                as tipo,
        COALESCE(SUM(v), 0)      as valor
      FROM (
        SELECT dataLancamento as dt, valor as v
        FROM LancamentoReceita
        WHERE municipioId = ${municipioId}
          AND dataLancamento >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      ) sub
      GROUP BY DATE_FORMAT(dt, '%Y-%m')

      UNION ALL

      SELECT
        DATE_FORMAT(dataPagamento, '%Y-%m') as mes,
        'despesa'                           as tipo,
        COALESCE(SUM(valor), 0)             as valor
      FROM Pagamento
      WHERE municipioId = ${municipioId}
        AND dataPagamento >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(dataPagamento, '%Y-%m')
      ORDER BY mes
    `

    // ── Execução por unidade ───────────────────────────────────────────────────
    const porUnidade = await db.$queryRaw`
      SELECT
        u.nome  as unidade,
        u.sigla,
        COALESCE(SUM(d.valorOrcado + d.valorSuplementado - d.valorAnulado), 0) as orcado,
        COALESCE(SUM(CASE WHEN e.status NOT IN ('ANULADO','CANCELADO')
          THEN e.valor - e.valorAnulado ELSE 0 END), 0)                        as empenhado,
        COALESCE(SUM(p.valor), 0)                                              as pago
      FROM Unidade u
      LEFT JOIN Dotacao   d ON d.unidadeId = u.id
      LEFT JOIN Empenho   e ON e.dotacaoId = d.id AND e.exercicio = ${exercicio}
      LEFT JOIN Liquidacao l ON l.empenhoId = e.id
      LEFT JOIN Pagamento  p ON p.liquidacaoId = l.id
      WHERE u.municipioId = ${municipioId} AND u.ativo = 1
      GROUP BY u.id
      ORDER BY empenhado DESC
      LIMIT 10
    `

    // ── Últimos empenhos ───────────────────────────────────────────────────────
    const ultimosEmpenhos = await db.$queryRaw`
      SELECT
        e.id, e.numero, e.dataEmissao, e.valor, e.status, e.descricao,
        f.nome as fornecedorNome
      FROM Empenho e
      LEFT JOIN Fornecedor f ON f.id = e.fornecedorId
      WHERE e.municipioId = ${municipioId} AND e.exercicio = ${exercicio}
      ORDER BY e.createdAt DESC
      LIMIT 10
    `

    // ── Alertas ────────────────────────────────────────────────────────────────
    const empenhosAcima90 = await db.$queryRaw`
      SELECT COUNT(*) as n
      FROM Dotacao d
      JOIN LOA l ON l.id = d.loaId
      WHERE d.municipioId = ${municipioId} AND l.exercicio = ${exercicio}
        AND (
          SELECT COALESCE(SUM(e.valor - e.valorAnulado), 0)
          FROM Empenho e WHERE e.dotacaoId = d.id AND e.status NOT IN ('ANULADO','CANCELADO')
        ) / NULLIF(d.valorOrcado + d.valorSuplementado - d.valorAnulado, 0) > 0.90
    ` as any[]

    return NextResponse.json({
      kpi: {
        orcamentoTotal:  Number(kpi.orcamentoTotal  ?? 0),
        totalEmpenhado:  Number(kpi.totalEmpenhado  ?? 0),
        totalPago:       Number(kpi.totalPago        ?? 0),
        totalReceita:    Number(kpi.totalReceita     ?? 0),
        receitaPrevista: Number(kpi.receitaPrevista  ?? 0),
        percentualEmpenhado: kpi.orcamentoTotal > 0
          ? (Number(kpi.totalEmpenhado) / Number(kpi.orcamentoTotal) * 100).toFixed(1)
          : '0',
        percentualReceita: kpi.receitaPrevista > 0
          ? (Number(kpi.totalReceita) / Number(kpi.receitaPrevista) * 100).toFixed(1)
          : '0',
      },
      mensal,
      porUnidade,
      ultimosEmpenhos,
      alertas: {
        dotacoesAcima90pct: Number((empenhosAcima90 as any[])[0]?.n ?? 0),
      },
      exercicio,
    })
  } catch (e: any) {
    console.error('[GET /api/sefin/dashboard]', e.message)
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
