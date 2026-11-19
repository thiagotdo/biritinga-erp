import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Folha — Competências ─────────────────────────────────────────────────────
// LC 101/2000 Art. 19: municípios não podem gastar mais de 60% da RCL com pessoal
// A competência é o "envelope" mensal que agrupa todos os holerites do mês/ano.

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const relatorio = searchParams.get('relatorio')

  // ── Dashboard ──────────────────────────────────────────────────────────────
  if (relatorio === 'DASHBOARD') {
    const agora = new Date()
    const mesAtual = agora.getMonth() + 1
    const anoAtual = agora.getFullYear()

    const [compAtual, compAnterior, historico12, totalServidores] = await Promise.all([
      prisma.folhaCompetencia.findUnique({
        where: { municipioId_mes_ano: { municipioId: usuario.municipioId, mes: mesAtual, ano: anoAtual } },
      }),
      prisma.folhaCompetencia.findUnique({
        where: {
          municipioId_mes_ano: {
            municipioId: usuario.municipioId,
            mes: mesAtual === 1 ? 12 : mesAtual - 1,
            ano: mesAtual === 1 ? anoAtual - 1 : anoAtual,
          },
        },
      }),
      prisma.folhaCompetencia.findMany({
        where: { municipioId: usuario.municipioId, status: { in: ['CALCULADA', 'FECHADA'] } },
        orderBy: [{ ano: 'desc' }, { mes: 'desc' }],
        take: 12,
        select: { mes: true, ano: true, totalBruto: true, totalLiquido: true, totalServidores: true, status: true },
      }),
      prisma.folhaHolerite.count({
        where: {
          municipioId: usuario.municipioId,
          competencia: { mes: mesAtual, ano: anoAtual },
          status: { not: 'ESTORNADO' },
        },
      }),
    ])

    // Variação mês a mês
    const variacaoBruto = compAnterior && compAtual
      ? ((Number(compAtual.totalBruto) - Number(compAnterior.totalBruto)) / Number(compAnterior.totalBruto)) * 100
      : 0

    return NextResponse.json({
      kpis: {
        mesAtual: compAtual ? {
          totalBruto: Number(compAtual.totalBruto),
          totalLiquido: Number(compAtual.totalLiquido),
          totalDescontos: Number(compAtual.totalDescontos),
          totalServidores: compAtual.totalServidores,
          status: compAtual.status,
        } : null,
        totalServidoresAtivos: totalServidores,
        variacaoBruto: Number(variacaoBruto.toFixed(2)),
      },
      historico: historico12.reverse().map(h => ({
        mes: h.mes, ano: h.ano,
        totalBruto: Number(h.totalBruto),
        totalLiquido: Number(h.totalLiquido),
        totalServidores: h.totalServidores,
        status: h.status,
      })),
    })
  }

  // ── Lista de competências ──────────────────────────────────────────────────
  const competencias = await prisma.folhaCompetencia.findMany({
    where: { municipioId: usuario.municipioId },
    orderBy: [{ ano: 'desc' }, { mes: 'desc' }],
    take: 36,
  })

  return NextResponse.json({ competencias })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    mes:        z.number().int().min(1).max(12),
    ano:        z.number().int().min(2020).max(2099),
    observacao: z.string().optional(),
    acao:       z.enum(['CRIAR', 'FECHAR', 'REABRIR', 'CANCELAR', 'CALCULAR']).default('CRIAR'),
    id:         z.string().optional(),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  // ── FECHAR/REABRIR/CANCELAR por ID ────────────────────────────────────────
  if (['FECHAR', 'REABRIR', 'CANCELAR'].includes(d.acao)) {
    if (!d.id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

    const comp = await prisma.folhaCompetencia.findFirst({
      where: { id: d.id, municipioId: usuario.municipioId },
    })
    if (!comp) return NextResponse.json({ erro: 'Competência não encontrada' }, { status: 404 })

    // Validações de fluxo
    if (d.acao === 'FECHAR' && !['CALCULADA'].includes(comp.status)) {
      return NextResponse.json({ erro: 'Só é possível fechar folha com status CALCULADA' }, { status: 409 })
    }
    if (d.acao === 'REABRIR' && comp.status !== 'FECHADA') {
      return NextResponse.json({ erro: 'Só é possível reabrir folha fechada' }, { status: 409 })
    }

    const novoStatus: Record<string, string> = {
      FECHAR: 'FECHADA', REABRIR: 'ABERTA', CANCELAR: 'CANCELADA',
    }

    const atualizado = await prisma.folhaCompetencia.update({
      where: { id: d.id },
      data: {
        status: novoStatus[d.acao] as any,
        ...(d.acao === 'FECHAR' && { fechadaEm: new Date(), fechadaPor: usuario.id }),
      },
    })

    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: `FOLHA_${d.acao}`, entidade: 'FolhaCompetencia', entidadeId: d.id,
      detalhes: { mes: comp.mes, ano: comp.ano },
    })

    return NextResponse.json({ competencia: atualizado })
  }

  // ── CALCULAR: recalcula totais de todos os holerites da competência ────────
  if (d.acao === 'CALCULAR') {
    if (!d.id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

    const comp = await prisma.folhaCompetencia.findFirst({
      where: { id: d.id, municipioId: usuario.municipioId },
      include: {
        holerites: {
          where: { status: { not: 'ESTORNADO' } },
          select: { totalProventos: true, totalDescontos: true, totalLiquido: true },
        },
      },
    })
    if (!comp) return NextResponse.json({ erro: 'Competência não encontrada' }, { status: 404 })

    const totalBruto = comp.holerites.reduce((s, h) => s + Number(h.totalProventos), 0)
    const totalDescontos = comp.holerites.reduce((s, h) => s + Number(h.totalDescontos), 0)
    const totalLiquido = comp.holerites.reduce((s, h) => s + Number(h.totalLiquido), 0)

    const atualizado = await prisma.folhaCompetencia.update({
      where: { id: d.id },
      data: {
        totalBruto, totalDescontos, totalLiquido,
        totalServidores: comp.holerites.length,
        status: 'CALCULADA',
      },
    })

    return NextResponse.json({ competencia: atualizado })
  }

  // ── CRIAR nova competência ─────────────────────────────────────────────────
  const existente = await prisma.folhaCompetencia.findUnique({
    where: { municipioId_mes_ano: { municipioId: usuario.municipioId, mes: d.mes, ano: d.ano } },
  })
  if (existente) return NextResponse.json({ erro: 'Competência já existe para este mês/ano' }, { status: 409 })

  const competencia = await prisma.folhaCompetencia.create({
    data: { municipioId: usuario.municipioId, mes: d.mes, ano: d.ano, observacao: d.observacao },
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'FOLHA_COMPETENCIA_CRIADA', entidade: 'FolhaCompetencia', entidadeId: competencia.id,
    detalhes: { mes: d.mes, ano: d.ano },
  })

  return NextResponse.json({ competencia }, { status: 201 })
}
