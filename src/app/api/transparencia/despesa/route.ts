// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
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
    const [totais, porNatureza, porOrgao, evolucao] = await Promise.all([
      prisma.DespesaOrcamentaria.aggregate({
        where: { municipioId: usuario.municipioId, exercicio },
        _sum: { orcado: true, empenhado: true, liquidado: true, pago: true },
      }),
      prisma.DespesaOrcamentaria.groupBy({
        by: ['natureza'],
        where: { municipioId: usuario.municipioId, exercicio },
        _sum: { orcado: true, pago: true },
        orderBy: { _sum: { pago: 'desc' } },
      }),
      prisma.DespesaOrcamentaria.groupBy({
        by: ['orgao'],
        where: { municipioId: usuario.municipioId, exercicio },
        _sum: { pago: true },
        orderBy: { _sum: { pago: 'desc' } },
        take: 8,
      }),
      prisma.DespesaOrcamentaria.groupBy({
        by: ['mes', 'competencia'],
        where: { municipioId: usuario.municipioId, exercicio },
        _sum: { empenhado: true, pago: true },
        orderBy: { mes: 'asc' },
      }),
    ])

    // Top 10 credores
    const topCredores = await prisma.DespesaOrcamentaria.groupBy({
      by: ['credorNome', 'credorCPFCNPJ'],
      where: { municipioId: usuario.municipioId, exercicio, credorNome: { not: null } },
      _sum: { pago: true },
      orderBy: { _sum: { pago: 'desc' } },
      take: 10,
    })

    const orcado    = Number(totais._sum.orcado ?? 0)
    const empenhado = Number(totais._sum.empenhado ?? 0)
    const pago      = Number(totais._sum.pago ?? 0)

    return NextResponse.json({
      kpis: { orcado, empenhado, liquidado: Number(totais._sum.liquidado ?? 0), pago, pctExec: orcado > 0 ? ((pago / orcado) * 100).toFixed(1) : '0' },
      porNatureza: porNatureza.map(r => ({
        natureza: r.natureza,
        orcado: Number(r._sum.orcado ?? 0),
        pago: Number(r._sum.pago ?? 0),
      })),
      porOrgao: porOrgao.map(r => ({
        orgao: r.orgao,
        pago: Number(r._sum.pago ?? 0),
      })),
      evolucao: evolucao.map(r => ({
        mes: r.mes, competencia: r.competencia,
        empenhado: Number(r._sum.empenhado ?? 0),
        pago: Number(r._sum.pago ?? 0),
      })),
      topCredores: topCredores.map(r => ({
        nome: r.credorNome,
        cpfCnpj: r.credorCPFCNPJ,
        pago: Number(r._sum.pago ?? 0),
      })),
    })
  }

  const where: any = { municipioId: usuario.municipioId, exercicio }
  if (competencia) where.competencia = competencia
  if (natureza)    where.natureza = natureza
  if (orgao)       where.orgao = { contains: orgao }
  if (credor)      where.OR = [
    { credorNome: { contains: credor } },
    { credorCPFCNPJ: { contains: credor } },
  ]

  const despesas = await prisma.DespesaOrcamentaria.findMany({
    where, orderBy: [{ orgao: 'asc' }, { competencia: 'asc' }], take: 500,
  })
  return NextResponse.json({ despesas, total: despesas.length })
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
