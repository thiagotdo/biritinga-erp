// @ts-nocheck
// Balancete e relatórios financeiros — LRF e transparência
// GET — balancete de despesas / receitas / execução orçamentária / LRF

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
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

    const orcamento = await prisma.orcamento.findFirst({
      where: { municipioId: ctx.municipioId, exercicio },
    })
    if (!orcamento) {
      return NextResponse.json({ erro: `Orçamento ${exercicio} não encontrado` }, { status: 404 })
    }

    // ── Execução Orçamentária da Despesa ──────────────────────────────────────
    if (relatorio === 'EXECUCAO') {
      const dotacoes = await prisma.dotacao.findMany({
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
        s.valorAtual      += Number(d.valorAtual)
        s.valorEmpenhado  += Number(d.valorEmpenhado)
        s.valorLiquidado  += Number(d.valorLiquidado)
        s.valorPago       += Number(d.valorPago)
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
      const previstas = await prisma.receitaPrevista.findMany({
        where: { orcamentoId: orcamento.id },
        include: {
          lancamentos: {
            where: competencia ? { competencia } : undefined,
            select: { valor: true, competencia: true, situacao: true },
          },
        },
        orderBy: { natureza: 'asc' },
      })

      const linhas = previstas.map(r => {
        const arrecadado = r.lancamentos
          .filter(l => l.situacao === 'ARRECADADA')
          .reduce((s, l) => s + Number(l.valor), 0)
        return {
          codigo:        r.codigo,
          descricao:     r.descricao,
          natureza:      r.natureza,
          valorPrevisto: Number(r.valorPrevisto),
          arrecadado,
          saldo:         Number(r.valorPrevisto) - arrecadado,
          percArrecadado: r.valorPrevisto > 0 ? ((arrecadado / Number(r.valorPrevisto)) * 100).toFixed(1) : '0.0',
        }
      })

      const total = linhas.reduce((acc, l) => ({
        valorPrevisto: acc.valorPrevisto + l.valorPrevisto,
        arrecadado:    acc.arrecadado    + l.arrecadado,
      }), { valorPrevisto: 0, arrecadado: 0 })

      return NextResponse.json({ relatorio: 'RECEITA', exercicio, linhas, total })
    }

    // ── Demonstrativo LRF — Despesa com Pessoal ───────────────────────────────
    if (relatorio === 'LRF_PESSOAL') {
      // Período: 12 meses anteriores ao mês atual (LRF Art. 18/19)
      const hoje      = new Date()
      const meses12: string[] = []
      for (let i = 11; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
        meses12.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
      }

      // Buscar empenhos de PESSOAL_ENCARGOS nos últimos 12 meses
      const empenhosPessoal = await prisma.empenho.aggregate({
        where: {
          municipioId: ctx.municipioId,
          competencia: { in: meses12 },
          situacao:    { in: ['LIQUIDADO','PAGO'] },
          dotacao:     { natureza: 'PESSOAL_ENCARGOS' },
        },
        _sum: { valorLiquidado: true },
      })

      const despesaPessoal = Number(empenhosPessoal._sum.valorLiquidado ?? 0)

      // Receita Corrente Líquida estimada (últimos 12 meses)
      const receitaArrecadada = await prisma.lancamentoReceita.aggregate({
        where: {
          municipioId: ctx.municipioId,
          competencia: { in: meses12 },
          situacao:    'ARRECADADA',
        },
        _sum: { valor: true },
      })
      const rcl = Number(receitaArrecadada._sum.valor ?? 0)

      const percentual    = rcl > 0 ? (despesaPessoal / rcl) * 100 : 0
      const limiteAlerta  = 51.30   // Art. 22 LRF — limite de alerta (90% do limite)
      const limiteLegal   = 54.00   // Art. 20, III, b LRF — municípios: 54%

      return NextResponse.json({
        relatorio:       'LRF_PESSOAL',
        periodo:         `${meses12[0]} a ${meses12[11]}`,
        exercicio,
        rcl:             rcl,
        despesaPessoal,
        percentual:      percentual.toFixed(2),
        limiteLegal,
        limiteAlerta,
        situacao: percentual > limiteLegal
          ? 'ACIMA_LIMITE'
          : percentual > limiteAlerta
          ? 'ALERTA'
          : 'REGULAR',
        meses: meses12,
      })
    }

    // ── Fluxo de Caixa simplificado (mês a mês do exercício) ─────────────────
    if (relatorio === 'FLUXO') {
      const mesesExercicio: string[] = []
      for (let m = 1; m <= 12; m++) {
        mesesExercicio.push(`${exercicio}-${String(m).padStart(2, '0')}`)
      }

      const [pagamentos, receitas] = await Promise.all([
        prisma.pagamento.groupBy({
          by: ['dataPagamento'],
          where: {
            municipioId:  ctx.municipioId,
            dataPagamento: {
              gte: new Date(`${exercicio}-01-01`),
              lte: new Date(`${exercicio}-12-31`),
            },
          },
          _sum: { valor: true },
        }),
        prisma.lancamentoReceita.groupBy({
          by: ['competencia'],
          where: {
            municipioId: ctx.municipioId,
            competencia: { in: mesesExercicio },
            situacao:    'ARRECADADA',
          },
          _sum: { valor: true },
        }),
      ])

      // Agregar pagamentos por mês
      const pagPorMes: Record<string, number> = {}
      for (const p of pagamentos) {
        const mes = `${p.dataPagamento.getFullYear()}-${String(p.dataPagamento.getMonth() + 1).padStart(2, '0')}`
        pagPorMes[mes] = (pagPorMes[mes] ?? 0) + Number(p._sum.valor ?? 0)
      }
      const recPorMes: Record<string, number> = {}
      for (const r of receitas) {
        recPorMes[r.competencia] = Number(r._sum.valor ?? 0)
      }

      const fluxo = mesesExercicio.map(mes => ({
        competencia: mes,
        receitas:    recPorMes[mes]  ?? 0,
        despesas:    pagPorMes[mes]  ?? 0,
        saldo:       (recPorMes[mes] ?? 0) - (pagPorMes[mes] ?? 0),
      }))

      return NextResponse.json({ relatorio: 'FLUXO', exercicio, fluxo })
    }

    return NextResponse.json({ erro: 'Relatório inválido. Use: EXECUCAO, RECEITA, LRF_PESSOAL, FLUXO' }, { status: 400 })
  } catch (error) {
    console.error('[SEFIN/BALANCETE/GET]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
