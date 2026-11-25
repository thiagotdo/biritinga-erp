/**
 * GET  /api/sefin/receitas   - lista receitas orçamentárias (ReceitaOrcamentaria)
 * POST /api/sefin/receitas   - registra nova receita
 *
 * Tabela real: ReceitaOrcamentaria
 * Colunas: id, municipioId, exercicio (int), mes (int), competencia,
 *          codigoReceita, natureza ENUM, descricao, fonte, unidadeGestora,
 *          previsto, arrecadado, criadoEm, atualizadoEm
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
  const mes       = searchParams.get('mes')       // "2026-11"
  const exercicio = parseInt(searchParams.get('exercicio') ?? new Date().getFullYear().toString())

  try {
    // Resumo por natureza (previsto x arrecadado)
    const resumo = await db.$queryRaw`
      SELECT
        natureza,
        descricao,
        SUM(previsto)    AS totalPrevisto,
        SUM(arrecadado)  AS totalArrecadado
      FROM ReceitaOrcamentaria
      WHERE municipioId = ${municipioId}
        AND exercicio = ${exercicio}
      GROUP BY natureza, descricao
      ORDER BY natureza, descricao`

    // Lançamentos por competência (mês a mês)
    let lancamentos: any[]
    if (mes) {
      lancamentos = await db.$queryRaw`
        SELECT *
        FROM ReceitaOrcamentaria
        WHERE municipioId = ${municipioId}
          AND competencia = ${mes}
        ORDER BY natureza, codigoReceita`
    } else {
      lancamentos = await db.$queryRaw`
        SELECT *
        FROM ReceitaOrcamentaria
        WHERE municipioId = ${municipioId}
          AND exercicio = ${exercicio}
        ORDER BY mes, natureza, codigoReceita
        LIMIT 200`
    }

    // Totais anuais
    const [totais]: any[] = await db.$queryRaw`
      SELECT
        COALESCE(SUM(previsto), 0)   AS totalPrevisto,
        COALESCE(SUM(arrecadado), 0) AS totalArrecadado,
        COUNT(*)                     AS totalRegistros
      FROM ReceitaOrcamentaria
      WHERE municipioId = ${municipioId}
        AND exercicio = ${exercicio}`

    // Evolução mensal
    const evolucao = await db.$queryRaw`
      SELECT
        mes,
        competencia,
        SUM(previsto)   AS previsto,
        SUM(arrecadado) AS arrecadado
      FROM ReceitaOrcamentaria
      WHERE municipioId = ${municipioId}
        AND exercicio = ${exercicio}
      GROUP BY mes, competencia
      ORDER BY mes`

    return NextResponse.json({
      resumo,
      lancamentos,
      evolucao,
      totais: totais ?? { totalPrevisto: 0, totalArrecadado: 0, totalRegistros: 0 },
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
    const { exercicio, mes, competencia, codigoReceita, natureza,
            descricao, fonte, unidadeGestora, previsto, arrecadado } = await req.json()

    if (!exercicio || !mes || !natureza || !descricao)
      return NextResponse.json({ erro: 'Campos obrigatórios: exercicio, mes, natureza, descricao' }, { status: 400 })

    const id = crypto.randomUUID()
    const comp = competencia ?? `${exercicio}-${String(mes).padStart(2,'0')}`

    await db.$queryRaw`
      INSERT INTO ReceitaOrcamentaria
        (id, municipioId, exercicio, mes, competencia, codigoReceita, natureza,
         descricao, fonte, unidadeGestora, previsto, arrecadado, atualizadoEm)
      VALUES
        (${id}, ${municipioId}, ${parseInt(exercicio)}, ${parseInt(mes)}, ${comp},
         ${codigoReceita ?? ''}, ${natureza}, ${descricao},
         ${fonte ?? null}, ${unidadeGestora ?? null},
         ${parseFloat(previsto ?? 0)}, ${parseFloat(arrecadado ?? 0)}, NOW(3))`

    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
