// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { prisma, getConn } from '@/lib/db'
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

  const conn = await getConn()
  try {
    if (tipo === 'execucao') {
      // Execução orçamentária por secretaria via Dotacao
      const orcamento = await prisma.OrcamentoUnidade.findFirst({
        where: { municipioId: ctx.municipioId, exercicio },
      })
      if (!orcamento) {
        return NextResponse.json({ erro: `Orçamento ${exercicio} não encontrado` }, { status: 404 })
      }

      const [dotRows] = await conn.execute(
        `SELECT secretaria, SUM(valorAtual) as dotacaoAtual, SUM(valorEmpenhado) as empenhado,
                SUM(valorLiquidado) as liquidado, SUM(valorPago) as pago
         FROM Dotacao WHERE orcamentoId = ? AND ativo = 1
         GROUP BY secretaria ORDER BY secretaria ASC`,
        [orcamento.id]
      ) as any[]

      const linhas = (dotRows as any[]).map(u => {
        const dotacaoAtual = Number(u.dotacaoAtual ?? 0)
        const empenhado    = Number(u.empenhado ?? 0)
        return {
          unidade:     u.secretaria ?? 'SEM SECRETARIA',
          dotacaoAtual,
          empenhado,
          liquidado:   Number(u.liquidado ?? 0),
          pago:        Number(u.pago ?? 0),
          saldo:       dotacaoAtual - empenhado,
          pctExecucao: dotacaoAtual > 0 ? (empenhado / dotacaoAtual * 100) : 0,
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
        status: orcamento.situacao,
        linhas,
        totais,
        pctExecucaoGeral: totais.dotacaoAtual > 0 ? (totais.empenhado / totais.dotacaoAtual * 100) : 0,
      })
    }

    if (tipo === 'balancete') {
      const mesRef = mes ?? new Date().getMonth() + 1
      const compMes = `${exercicio}-${String(mesRef).padStart(2, '0')}`

      const [recMesRows] = await conn.execute(
        `SELECT SUM(previsto) as previsto, SUM(arrecadado) as arrecadado
         FROM ReceitaOrcamentaria WHERE municipioId = ? AND exercicio = ? AND mes = ?`,
        [ctx.municipioId, exercicio, mesRef]
      ) as any[]

      const [recAcumRows] = await conn.execute(
        `SELECT SUM(previsto) as previsto, SUM(arrecadado) as arrecadado
         FROM ReceitaOrcamentaria WHERE municipioId = ? AND exercicio = ? AND mes <= ?`,
        [ctx.municipioId, exercicio, mesRef]
      ) as any[]

      const [despMesRows] = await conn.execute(
        `SELECT SUM(empenhado) as empenhado, SUM(pago) as pago
         FROM DespesaOrcamentaria WHERE municipioId = ? AND exercicio = ? AND mes = ?`,
        [ctx.municipioId, exercicio, mesRef]
      ) as any[]

      const [despAcumRows] = await conn.execute(
        `SELECT SUM(empenhado) as empenhado, SUM(pago) as pago
         FROM DespesaOrcamentaria WHERE municipioId = ? AND exercicio = ? AND mes <= ?`,
        [ctx.municipioId, exercicio, mesRef]
      ) as any[]

      const rm = (recMesRows as any[])[0] || {}
      const ra = (recAcumRows as any[])[0] || {}
      const dm = (despMesRows as any[])[0] || {}
      const da = (despAcumRows as any[])[0] || {}

      return NextResponse.json({
        tipo: 'balancete',
        exercicio,
        mes: mesRef,
        receita: {
          mes:        { previsto: Number(rm.previsto ?? 0), arrecadado: Number(rm.arrecadado ?? 0) },
          acumulado:  { previsto: Number(ra.previsto ?? 0), arrecadado: Number(ra.arrecadado ?? 0) },
        },
        despesa: {
          mes:        { empenhado: Number(dm.empenhado ?? 0), pago: Number(dm.pago ?? 0) },
          acumulado:  { empenhado: Number(da.empenhado ?? 0), pago: Number(da.pago ?? 0) },
        },
      })
    }

    if (tipo === 'transparencia') {
      const [rows] = await conn.execute(
        `SELECT e.numero, e.dataEmissao, e.descricao, e.modalidade, e.licitacaoNumero,
                e.valorOriginal, e.valorPago, e.situacao, e.credorNome, e.credorCpfCnpj,
                d.secretaria as unidade
         FROM Empenho e
         LEFT JOIN Dotacao d ON d.id = e.dotacaoId
         WHERE e.municipioId = ? AND YEAR(e.dataEmissao) = ? AND e.situacao != 'ANULADO'
         ORDER BY e.dataEmissao DESC LIMIT 1000`,
        [ctx.municipioId, exercicio]
      ) as any[]

      return NextResponse.json({ tipo: 'transparencia', exercicio, dados: rows, total: (rows as any[]).length })
    }

    return NextResponse.json({ erro: 'Tipo de relatório inválido. Use: execucao, balancete, transparencia' }, { status: 400 })
  } catch (error) {
    console.error('[SEFIN/RELATORIOS/GET]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  } finally {
    await conn.end()
  }
}
