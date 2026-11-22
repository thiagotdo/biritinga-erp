// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { extrairContextoRequest } from '@/lib/audit'
import { temPermissao } from '@/lib/auth/rbac'

// GET /api/sefin/relatorios?tipo=balancete|execucao|transparencia&exercicio=2026&mes=11
// Endpoints de leitura agregada para dashboards e relatórios legais (LRF, TCM-BA)
export async function GET(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'sefin:relatorio:read')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const tipo      = searchParams.get('tipo') ?? 'execucao'
  const exercicio = parseInt(searchParams.get('exercicio') ?? String(new Date().getFullYear()))
  const mes       = searchParams.get('mes') ? parseInt(searchParams.get('mes')!) : undefined

  if (tipo === 'execucao') {
    // Execução orçamentária: dotação × empenhado × liquidado × pago por unidade
    const orcamento = await prisma.orcamentoAnual.findFirst({
      where: { municipioId: ctx.municipioId, exercicio },
      include: {
        unidades: {
          select: {
            id: true, nomeUnidade: true,
            dotacaoInicial: true, suplementacao: true, reducao: true,
            empenhado: true, liquidado: true, pago: true,
          },
          orderBy: { nomeUnidade: 'asc' },
        },
      },
    })

    if (!orcamento) {
      return NextResponse.json({ erro: `Orçamento ${exercicio} não encontrado` }, { status: 404 })
    }

    const linhas = orcamento.unidades.map(u => {
      const dotacaoAtual = Number(u.dotacaoInicial) + Number(u.suplementacao) - Number(u.reducao)
      const empenhado    = Number(u.empenhado)
      const liquidado    = Number(u.liquidado)
      const pago         = Number(u.pago)
      return {
        unidade:       u.nomeUnidade,
        dotacaoAtual,
        empenhado,
        liquidado,
        pago,
        saldo:         dotacaoAtual - empenhado,
        pctExecucao:   dotacaoAtual > 0 ? (empenhado / dotacaoAtual * 100) : 0,
      }
    })

    const totais = linhas.reduce((acc, l) => ({
      dotacaoAtual:  acc.dotacaoAtual  + l.dotacaoAtual,
      empenhado:     acc.empenhado     + l.empenhado,
      liquidado:     acc.liquidado     + l.liquidado,
      pago:          acc.pago          + l.pago,
      saldo:         acc.saldo         + l.saldo,
    }), { dotacaoAtual: 0, empenhado: 0, liquidado: 0, pago: 0, saldo: 0 })

    return NextResponse.json({
      tipo: 'execucao',
      exercicio,
      status: orcamento.status,
      linhas,
      totais,
      pctExecucaoGeral: totais.dotacaoAtual > 0 ? (totais.empenhado / totais.dotacaoAtual * 100) : 0,
    })
  }

  if (tipo === 'balancete') {
    // Balancete receita × despesa do mês/acumulado
    const mesRef = mes ?? new Date().getMonth() + 1

    const [receitasMes, receitasAcum, empenhosMes, empenhosAcum] = await Promise.all([
      // Receitas do mês
      prisma.receita.findMany({
        where: { municipioId: ctx.municipioId, exercicio, mes: mesRef },
        select: { natureza: true, valorPrevisto: true, valorArrecadado: true },
      }),
      // Receitas acumuladas até o mês
      prisma.receita.findMany({
        where: { municipioId: ctx.municipioId, exercicio, mes: { lte: mesRef } },
        select: { natureza: true, valorPrevisto: true, valorArrecadado: true },
      }),
      // Empenhos do mês
      prisma.empenho.findMany({
        where: {
          municipioId: ctx.municipioId, exercicio,
          status: { not: 'ANULADO' },
          dataEmissao: {
            gte: new Date(exercicio, mesRef - 1, 1),
            lte: new Date(exercicio, mesRef, 0, 23, 59, 59),
          },
        },
        select: { tipoDespesa: true, valorOriginal: true, valorPago: true, valorAnulado: true },
      }),
      // Empenhos acumulados até o mês
      prisma.empenho.findMany({
        where: {
          municipioId: ctx.municipioId, exercicio,
          status: { not: 'ANULADO' },
          dataEmissao: { lte: new Date(exercicio, mesRef, 0, 23, 59, 59) },
        },
        select: { tipoDespesa: true, valorOriginal: true, valorPago: true, valorAnulado: true },
      }),
    ])

    const somarReceita = (arr: typeof receitasMes) => ({
      previsto:    arr.reduce((s, r) => s + Number(r.valorPrevisto), 0),
      arrecadado:  arr.reduce((s, r) => s + Number(r.valorArrecadado), 0),
    })
    const somarEmpenho = (arr: typeof empenhosMes) => ({
      empenhado: arr.reduce((s, e) => s + Number(e.valorOriginal), 0),
      pago:      arr.reduce((s, e) => s + Number(e.valorPago), 0),
    })

    return NextResponse.json({
      tipo: 'balancete',
      exercicio,
      mes: mesRef,
      receita: {
        mes:        somarReceita(receitasMes),
        acumulado:  somarReceita(receitasAcum),
      },
      despesa: {
        mes:        somarEmpenho(empenhosMes),
        acumulado:  somarEmpenho(empenhosAcum),
      },
    })
  }

  if (tipo === 'transparencia') {
    // Portal da Transparência - empenhos públicos com dados completos
    const empenhos = await prisma.empenho.findMany({
      where: {
        municipioId: ctx.municipioId,
        exercicio,
        status: { not: 'ANULADO' },
      },
      select: {
        numero: true, exercicio: true, dataEmissao: true,
        descricao: true, tipoDespesa: true, modalidadeLicitacao: true,
        numeroLicitacao: true, valorOriginal: true, valorPago: true, status: true,
        fornecedor: { select: { nome: true, cnpjCpf: true } },
        unidade:    { select: { nomeUnidade: true } },
      },
      orderBy: [{ exercicio: 'desc' }, { dataEmissao: 'desc' }],
      take: 1000,
    })

    return NextResponse.json({ tipo: 'transparencia', exercicio, dados: empenhos, total: empenhos.length })
  }

  return NextResponse.json({ erro: 'Tipo de relatório inválido. Use: execucao, balancete, transparencia' }, { status: 400 })
}
