import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'

export const runtime = 'nodejs'

// ─── Folha — Relatórios ───────────────────────────────────────────────────────
// LC 101/2000 Art. 55 — RGF deve informar despesa com pessoal e % da RCL
// LC 101/2000 Art. 19 — Limite: 60% da RCL para municípios
// STN Portaria 72/2012 — SIOPS relatórios de saúde/pessoal

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo') // DASHBOARD | ANUAL | POR_LOTACAO | LRF | RUBRICAS
  const ano  = parseInt(searchParams.get('ano') ?? String(new Date().getFullYear()))

  if (tipo === 'DASHBOARD' || !tipo) {
    // ── Resumo geral (últimos 12 meses) ──────────────────────────────────────
    const historico = await prisma.folhaCompetencia.findMany({
      where: { municipioId: usuario.municipioId, ano: { in: [ano - 1, ano] } },
      orderBy: [{ ano: 'asc' }, { mes: 'asc' }],
      select: { mes: true, ano: true, totalBruto: true, totalLiquido: true, totalDescontos: true, totalServidores: true, status: true },
    })

    const totalAno = historico
      .filter(h => h.ano === ano && ['CALCULADA', 'FECHADA'].includes(h.status))
      .reduce((s, h) => ({
        bruto: s.bruto + Number(h.totalBruto),
        liquido: s.liquido + Number(h.totalLiquido),
        descontos: s.descontos + Number(h.totalDescontos),
      }), { bruto: 0, liquido: 0, descontos: 0 })

    return NextResponse.json({ historico, totalAno, ano })
  }

  if (tipo === 'POR_LOTACAO') {
    // ── Folha por secretaria (lotação) ────────────────────────────────────────
    const mes = parseInt(searchParams.get('mes') ?? String(new Date().getMonth() + 1))

    const comp = await prisma.folhaCompetencia.findUnique({
      where: { municipioId_mes_ano: { municipioId: usuario.municipioId, mes, ano } },
    })
    if (!comp) return NextResponse.json({ erro: 'Competência não encontrada' }, { status: 404 })

    const holerites = await prisma.folhaHolerite.findMany({
      where: { competenciaId: comp.id, status: { not: 'ESTORNADO' } },
      select: { lotacao: true, totalProventos: true, totalDescontos: true, totalLiquido: true },
    })

    const porLotacao: Record<string, { lotacao: string; servidores: number; totalBruto: number; totalLiquido: number }> = {}
    for (const h of holerites) {
      const lot = h.lotacao ?? 'Não informada'
      if (!porLotacao[lot]) porLotacao[lot] = { lotacao: lot, servidores: 0, totalBruto: 0, totalLiquido: 0 }
      porLotacao[lot].servidores++
      porLotacao[lot].totalBruto += Number(h.totalProventos)
      porLotacao[lot].totalLiquido += Number(h.totalLiquido)
    }

    return NextResponse.json({
      mes, ano,
      porLotacao: Object.values(porLotacao).sort((a, b) => b.totalBruto - a.totalBruto),
    })
  }

  if (tipo === 'LRF') {
    // ── Relatório LRF — Demonstrativo Despesa com Pessoal ────────────────────
    // LC 101/2000 Art. 19: limite 60% RCL — municípios
    // Alerta prudencial: 51,3% · Limite: 54%
    // Passagem do limite → LDO Art. 23 — redução obrigatória em 2 quadrimestres
    const rcl = parseFloat(searchParams.get('rcl') ?? '0') // RCL do exercício informada pelo usuário

    const folhasMeses = await prisma.folhaCompetencia.findMany({
      where: { municipioId: usuario.municipioId, ano, status: { in: ['CALCULADA', 'FECHADA'] } },
      orderBy: { mes: 'asc' },
    })

    const totalAnual = folhasMeses.reduce((s, f) => s + Number(f.totalBruto), 0)
    const percentualRCL = rcl > 0 ? (totalAnual / rcl) * 100 : null

    let alertaLRF: string | null = null
    if (percentualRCL !== null) {
      if (percentualRCL > 54)       alertaLRF = 'LIMITE_EXCEDIDO'
      else if (percentualRCL > 51.3) alertaLRF = 'ALERTA_PRUDENCIAL'
    }

    return NextResponse.json({
      ano,
      meses: folhasMeses.map(f => ({
        mes: f.mes, totalBruto: Number(f.totalBruto), status: f.status,
      })),
      totalAnual,
      rcl,
      percentualRCL: percentualRCL ? Number(percentualRCL.toFixed(2)) : null,
      limiteRCL: 54.0,
      alertaPrudencial: 51.3,
      alertaLRF,
      referencia: 'LC 101/2000 Art. 19 — Limite 60% RCL · Municípios',
    })
  }

  if (tipo === 'RUBRICAS') {
    // ── Totais por rubrica no mês ─────────────────────────────────────────────
    const mes = parseInt(searchParams.get('mes') ?? String(new Date().getMonth() + 1))

    const comp = await prisma.folhaCompetencia.findUnique({
      where: { municipioId_mes_ano: { municipioId: usuario.municipioId, mes, ano } },
    })
    if (!comp) return NextResponse.json({ erro: 'Competência não encontrada' }, { status: 404 })

    const itens = await prisma.folhaHoleriteItem.groupBy({
      by: ['rubricaId'],
      where: { holerite: { competenciaId: comp.id, status: { not: 'ESTORNADO' } } },
      _sum: { valor: true },
      _count: { _all: true },
    })

    // Enriquecer com nome da rubrica
    const rubricas = await prisma.folhaRubrica.findMany({
      where: { id: { in: itens.map(i => i.rubricaId) } },
      select: { id: true, codigo: true, nome: true, tipo: true },
    })
    const rubricaMap = Object.fromEntries(rubricas.map(r => [r.id, r]))

    return NextResponse.json({
      mes, ano,
      porRubrica: itens.map(i => ({
        ...rubricaMap[i.rubricaId],
        total: Number(i._sum.valor ?? 0),
        ocorrencias: i._count._all,
      })).sort((a, b) => b.total - a.total),
    })
  }

  return NextResponse.json({ erro: 'Tipo de relatório inválido' }, { status: 400 })
}
