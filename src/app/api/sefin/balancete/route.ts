// @ts-nocheck
// Balancete e relatórios financeiros - LRF e transparência
// GET - balancete de despesas / receitas / execução orçamentária / LRF

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma, getConn } from '@/lib/db'
import { extrairContextoRequest, temPermissao } from '@/lib/rbac'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'sefin:balancete:read')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const relatorio   = searchParams.get('relatorio') ?? 'EXECUCAO'
    const exercicio   = Number(searchParams.get('exercicio') ?? new Date().getFullYear())
    const competencia = searchParams.get('competencia')   // filtra por mês específico

    const orcamento = await prisma.OrcamentoUnidade.findFirst({
      where: { municipioId: ctx.municipioId, exercicio },
    })
    if (!orcamento) {
      return NextResponse.json({ erro: `Orçamento ${exercicio} não encontrado` }, { status: 404 })
    }

    // ── Execução Orçamentária da Despesa ──────────────────────────────────────
    if (relatorio === 'EXECUCAO') {
      const dotacoes = await prisma.Dotacao.findMany({
        where: { orcamentoId: orcamento.id, ativo: true },
        select: {
          secretaria: true, natureza: true, descricao: true,
          valorAtual: true, valorEmpenhado: true, valorLiquidado: true, valorPago: true,
        },
        orderBy: [{ secretaria: 'asc' }, { natureza: 'asc' }],
      })

      // Agrupar por secretaria
      const porSecretaria: Record<string, any> = {}
      for (const d of dotacoes) {
        const key = d.secretaria ?? 'SEM SECRETARIA'
        if (!porSecretaria[key]) {
          porSecretaria[key] = { secretaria: key, valorAtual: 0, valorEmpenhado: 0, valorLiquidado: 0, valorPago: 0, dotacoes: [] }
        }
        const s = porSecretaria[key]
        s.valorAtual      += Number(d.valorAtual ?? 0)
        s.valorEmpenhado  += Number(d.valorEmpenhado ?? 0)
        s.valorLiquidado  += Number(d.valorLiquidado ?? 0)
        s.valorPago       += Number(d.valorPago ?? 0)
        s.dotacoes.push(d)
      }

      const total = Object.values(porSecretaria).reduce((acc: any, s: any) => ({
        valorAtual:     acc.valorAtual     + s.valorAtual,
        valorEmpenhado: acc.valorEmpenhado + s.valorEmpenhado,
        valorLiquidado: acc.valorLiquidado + s.valorLiquidado,
        valorPago:      acc.valorPago      + s.valorPago,
      }), { valorAtual: 0, valorEmpenhado: 0, valorLiquidado: 0, valorPago: 0 })

      return NextResponse.json({
        relatorio: 'EXECUCAO',
        exercicio,
        orcamento: { situacao: orcamento.situacao, leiNumero: orcamento.leiNumero },
        porSecretaria: Object.values(porSecretaria),
        total,
        percentualExecucao: total.valorAtual > 0
          ? ((total.valorPago / total.valorAtual) * 100).toFixed(2)
          : '0.00',
      })
    }

    // ── Receita Arrecadada ────────────────────────────────────────────────────
    if (relatorio === 'RECEITA') {
      // Usar DespesaOrcamentaria como proxy de receita se ReceitaPrevista não existir
      const conn = await getConn()
      try {
        const compWhere = competencia ? ' AND competencia = ?' : ''
        const params: any[] = [ctx.municipioId, exercicio]
        if (competencia) params.push(competencia)

        const [rows] = await conn.execute(
          `SELECT codigoReceita, descricao, natureza, SUM(previsto) as valorPrevisto, SUM(arrecadado) as arrecadado
           FROM ReceitaOrcamentaria WHERE municipioId = ? AND exercicio = ?${compWhere}
           GROUP BY codigoReceita, descricao, natureza ORDER BY natureza ASC`,
          params
        ) as any[]

        const linhas = (rows as any[]).map(r => ({
          codigo:         r.codigoReceita,
          descricao:      r.descricao,
          natureza:       r.natureza,
          valorPrevisto:  Number(r.valorPrevisto ?? 0),
          arrecadado:     Number(r.arrecadado ?? 0),
          saldo:          Number(r.valorPrevisto ?? 0) - Number(r.arrecadado ?? 0),
          percArrecadado: r.valorPrevisto > 0 ? ((Number(r.arrecadado) / Number(r.valorPrevisto)) * 100).toFixed(1) : '0.0',
        }))

        const total = linhas.reduce((acc, l) => ({
          valorPrevisto: acc.valorPrevisto + l.valorPrevisto,
          arrecadado:    acc.arrecadado    + l.arrecadado,
        }), { valorPrevisto: 0, arrecadado: 0 })

        return NextResponse.json({ relatorio: 'RECEITA', exercicio, linhas, total })
      } finally {
        await conn.end()
      }
    }

    // ── Demonstrativo LRF - Despesa com Pessoal ───────────────────────────────
    if (relatorio === 'LRF_PESSOAL') {
      const hoje      = new Date()
      const meses12: string[] = []
      for (let i = 11; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
        meses12.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
      }

      const conn = await getConn()
      try {
        const mesPlaceholders = meses12.map(() => '?').join(',')

        // Despesa com pessoal via DespesaOrcamentaria
        const [pessoalRows] = await conn.execute(
          `SELECT SUM(liquidado) as total FROM DespesaOrcamentaria
           WHERE municipioId = ? AND natureza = 'PESSOAL_ENCARGOS' AND competencia IN (${mesPlaceholders})`,
          [ctx.municipioId, ...meses12]
        ) as any[]
        const despesaPessoal = Number((pessoalRows as any[])[0]?.total ?? 0)

        // RCL via ReceitaOrcamentaria
        const [rclRows] = await conn.execute(
          `SELECT SUM(arrecadado) as total FROM ReceitaOrcamentaria
           WHERE municipioId = ? AND competencia IN (${mesPlaceholders})`,
          [ctx.municipioId, ...meses12]
        ) as any[]
        const rcl = Number((rclRows as any[])[0]?.total ?? 0)

        const percentual    = rcl > 0 ? (despesaPessoal / rcl) * 100 : 0
        const limiteAlerta  = 51.30
        const limiteLegal   = 54.00

        return NextResponse.json({
          relatorio:       'LRF_PESSOAL',
          periodo:         `${meses12[0]} a ${meses12[11]}`,
          exercicio,
          rcl,
          despesaPessoal,
          percentual:      percentual.toFixed(2),
          limiteLegal,
          limiteAlerta,
          situacao: percentual > limiteLegal ? 'ACIMA_LIMITE' : percentual > limiteAlerta ? 'ALERTA' : 'REGULAR',
          meses: meses12,
        })
      } finally {
        await conn.end()
      }
    }

    // ── Fluxo de Caixa simplificado (mês a mês do exercício) ─────────────────
    if (relatorio === 'FLUXO') {
      const mesesExercicio: string[] = []
      for (let m = 1; m <= 12; m++) {
        mesesExercicio.push(`${exercicio}-${String(m).padStart(2, '0')}`)
      }

      const conn = await getConn()
      try {
        const mesPlaceholders = mesesExercicio.map(() => '?').join(',')

        const [pagRows] = await conn.execute(
          `SELECT competencia, SUM(pago) as pago FROM DespesaOrcamentaria
           WHERE municipioId = ? AND competencia IN (${mesPlaceholders}) GROUP BY competencia`,
          [ctx.municipioId, ...mesesExercicio]
        ) as any[]

        const [recRows] = await conn.execute(
          `SELECT competencia, SUM(arrecadado) as arrecadado FROM ReceitaOrcamentaria
           WHERE municipioId = ? AND competencia IN (${mesPlaceholders}) GROUP BY competencia`,
          [ctx.municipioId, ...mesesExercicio]
        ) as any[]

        const pagPorMes: Record<string, number> = {}
        for (const p of pagRows as any[]) pagPorMes[p.competencia] = Number(p.pago ?? 0)

        const recPorMes: Record<string, number> = {}
        for (const r of recRows as any[]) recPorMes[r.competencia] = Number(r.arrecadado ?? 0)

        const fluxo = mesesExercicio.map(mes => ({
          competencia: mes,
          receitas:    recPorMes[mes]  ?? 0,
          despesas:    pagPorMes[mes]  ?? 0,
          saldo:       (recPorMes[mes] ?? 0) - (pagPorMes[mes] ?? 0),
        }))

        return NextResponse.json({ relatorio: 'FLUXO', exercicio, fluxo })
      } finally {
        await conn.end()
      }
    }

    return NextResponse.json({ erro: 'Relatório inválido. Use: EXECUCAO, RECEITA, LRF_PESSOAL, FLUXO' }, { status: 400 })
  } catch (error) {
    console.error('[SEFIN/BALANCETE/GET]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
