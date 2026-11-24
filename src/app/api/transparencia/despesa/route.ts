// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma, getConn } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

// ─── Despesas Orçamentárias ───────────────────────────────────────────────────
// Lei 4.320/1964 - estágios da despesa: empenho, liquidação, pagamento
// LC 101/2000 LRF - controle de gastos com pessoal (limite 60% RCL)
// Portaria SOF 42/1999 - classificação funcional programática
// Portaria Interministerial STN/SOF 163/2001 - classificação da despesa
// Decreto 93.872/1986 - execução orçamentária e financeira

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const relatorio   = searchParams.get('relatorio')
  const exercicio   = searchParams.get('exercicio') ? parseInt(searchParams.get('exercicio')!) : new Date().getFullYear()
  const competencia = searchParams.get('competencia')
  const natureza    = searchParams.get('natureza')
  const orgao       = searchParams.get('orgao')
  const credor      = searchParams.get('credor')

  if (relatorio === 'DASHBOARD') {
    const conn = await getConn()
    try {
      const mid = usuario.municipioId

      // Totais gerais
      const [totaisRows] = await conn.execute(
        `SELECT SUM(orcado) as orcado, SUM(empenhado) as empenhado, SUM(liquidado) as liquidado, SUM(pago) as pago
         FROM DespesaOrcamentaria WHERE municipioId = ? AND exercicio = ?`,
        [mid, exercicio]
      ) as any[]
      const t = totaisRows[0] || {}
      const orcado    = Number(t.orcado ?? 0)
      const empenhado = Number(t.empenhado ?? 0)
      const liquidado = Number(t.liquidado ?? 0)
      const pago      = Number(t.pago ?? 0)

      // Por natureza
      const [porNaturezaRows] = await conn.execute(
        `SELECT natureza, SUM(orcado) as orcado, SUM(pago) as pago
         FROM DespesaOrcamentaria WHERE municipioId = ? AND exercicio = ?
         GROUP BY natureza ORDER BY SUM(pago) DESC`,
        [mid, exercicio]
      ) as any[]

      // Por órgão (top 8)
      const [porOrgaoRows] = await conn.execute(
        `SELECT orgao, SUM(pago) as pago
         FROM DespesaOrcamentaria WHERE municipioId = ? AND exercicio = ?
         GROUP BY orgao ORDER BY SUM(pago) DESC LIMIT 8`,
        [mid, exercicio]
      ) as any[]

      // Evolução mensal
      const [evolucaoRows] = await conn.execute(
        `SELECT mes, competencia, SUM(empenhado) as empenhado, SUM(pago) as pago
         FROM DespesaOrcamentaria WHERE municipioId = ? AND exercicio = ?
         GROUP BY mes, competencia ORDER BY mes ASC`,
        [mid, exercicio]
      ) as any[]

      // Top credores
      const [topCredoresRows] = await conn.execute(
        `SELECT credorNome, credorCPFCNPJ, SUM(pago) as pago
         FROM DespesaOrcamentaria WHERE municipioId = ? AND exercicio = ? AND credorNome IS NOT NULL AND credorNome != ''
         GROUP BY credorNome, credorCPFCNPJ ORDER BY SUM(pago) DESC LIMIT 10`,
        [mid, exercicio]
      ) as any[]

      return NextResponse.json({
        kpis: { orcado, empenhado, liquidado, pago, pctExec: orcado > 0 ? ((pago / orcado) * 100).toFixed(1) : '0' },
        porNatureza: (porNaturezaRows as any[]).map((r: any) => ({
          natureza: r.natureza,
          orcado: Number(r.orcado ?? 0),
          pago: Number(r.pago ?? 0),
        })),
        porOrgao: (porOrgaoRows as any[]).map((r: any) => ({
          orgao: r.orgao,
          pago: Number(r.pago ?? 0),
        })),
        evolucao: (evolucaoRows as any[]).map((r: any) => ({
          mes: r.mes, competencia: r.competencia,
          empenhado: Number(r.empenhado ?? 0),
          pago: Number(r.pago ?? 0),
        })),
        topCredores: (topCredoresRows as any[]).map((r: any) => ({
          nome: r.credorNome,
          cpfCnpj: r.credorCPFCNPJ,
          pago: Number(r.pago ?? 0),
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
    if (orgao)       { where += ' AND orgao LIKE ?'; params.push(`%${orgao}%`) }
    if (credor)      { where += ' AND (credorNome LIKE ? OR credorCPFCNPJ LIKE ?)'; params.push(`%${credor}%`, `%${credor}%`) }

    const [despesas] = await conn.execute(
      `SELECT * FROM DespesaOrcamentaria WHERE ${where} ORDER BY orgao ASC, competencia ASC LIMIT 500`,
      params
    ) as any[]

    return NextResponse.json({ despesas, total: (despesas as any[]).length })
  } finally {
    await conn.end()
  }
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const body = await req.json()

  // Importação em lote (integração com módulo financeiro)
  if (body._recurso === 'IMPORTAR_LOTE') {
    const rows: any[] = body.rows ?? []
    if (!rows.length) return NextResponse.json({ erro: 'Nenhum registro' }, { status: 400 })

    // Mapeamento de natureza para ENUM válido
    const mapNatureza = (n: string) => {
      const m: Record<string, string> = {
        'PESSOAL': 'PESSOAL_ENCARGOS', 'CUSTEIO': 'OUTRAS_CORRENTES',
        'INVESTIMENTO': 'INVESTIMENTOS', 'PESSOAL_ENCARGOS': 'PESSOAL_ENCARGOS',
        'OUTRAS_CORRENTES': 'OUTRAS_CORRENTES', 'INVESTIMENTOS': 'INVESTIMENTOS',
        'JUROS_ENCARGOS_DIVIDA': 'JUROS_ENCARGOS_DIVIDA',
        'INVERSOES_FINANCEIRAS': 'INVERSOES_FINANCEIRAS',
        'AMORTIZACAO_DIVIDA': 'AMORTIZACAO_DIVIDA',
        'RESERVA_CONTINGENCIA': 'RESERVA_CONTINGENCIA',
      }
      return (m[n] ?? 'OUTRAS_CORRENTES') as any
    }

    const criados = await prisma.$transaction(
      rows.map((r: any) => prisma.DespesaOrcamentaria.create({
        data: {
          id: randomUUID(),
          criadoEm: new Date(),
          atualizadoEm: new Date(),
          municipioId: usuario.municipioId,
          exercicio: r.exercicio ?? new Date().getFullYear(),
          mes: r.mes ?? parseInt(r.competencia?.split('-')[1] ?? '1'),
          competencia: r.competencia,
          orgao: r.orgao,
          unidade: r.unidade,
          funcao: r.funcao,
          subfuncao: r.subfuncao,
          programa: r.programa,
          acao: r.acao,
          natureza: mapNatureza(r.natureza),
          elementoDespesa: r.elementoDespesa,
          descricao: r.descricao,
          fonte: r.fonte,
          orcado: r.orcado ?? 0,
          empenhado: r.empenhado ?? 0,
          liquidado: r.liquidado ?? 0,
          pago: r.pago ?? 0,
          credorNome: r.credorNome,
          credorCPFCNPJ: r.credorCPFCNPJ,
          numeroEmpenho: r.numeroEmpenho,
          documentoFiscal: r.documentoFiscal,
        } as any,
      }))
    )
    return NextResponse.json({ importados: criados.length }, { status: 201 })
  }

  // Lançamento individual
  const Schema = z.object({
    exercicio: z.number(),
    mes: z.number().min(1).max(12),
    competencia: z.string(),
    orgao: z.string().min(2),
    unidade: z.string().optional(),
    funcao: z.string().optional(),
    subfuncao: z.string().optional(),
    programa: z.string().optional(),
    acao: z.string().optional(),
    natureza: z.string(),
    elementoDespesa: z.string().optional(),
    descricao: z.string().min(3),
    fonte: z.string().optional(),
    orcado: z.number().default(0),
    empenhado: z.number().default(0),
    liquidado: z.number().default(0),
    pago: z.number().default(0),
    credorNome: z.string().optional(),
    credorCPFCNPJ: z.string().optional(),
    numeroEmpenho: z.string().optional(),
    documentoFiscal: z.string().optional(),
  })
  const val = Schema.safeParse(body)
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const desp = await prisma.DespesaOrcamentaria.create({
    data: { id: randomUUID(), criadoEm: new Date(), atualizadoEm: new Date(), municipioId: usuario.municipioId, ...d, natureza: d.natureza as any } as any,
  })
  return NextResponse.json({ despesa: desp }, { status: 201 })
}
