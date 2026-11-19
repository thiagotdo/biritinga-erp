import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'

export const runtime = 'nodejs'

// ─── ESF — Estratégia Saúde da Família ───────────────────────────────────────
// Portaria GM/MS 2.436/2017 — PNAB
// Meta ACS: visitar 100% das famílias cadastradas mensalmente
// Parâmetro: 1 ACS para 400-750 famílias (máx. 750)

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const relatorio = searchParams.get('relatorio')
  const mes       = searchParams.get('mes') // "2026-10"

  if (relatorio === 'DASHBOARD') {
    const mesRef = mes ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

    const [equipes, visitas, totalFamilias, totalPacientes] = await Promise.all([
      prisma.equipeESF.findMany({
        where: { municipioId: usuario.municipioId, ativo: true },
        include: { membros: { where: { ativo: true } }, unidade: { select: { nome: true } } },
      }),
      prisma.visitaACS.findMany({
        where: { municipioId: usuario.municipioId, mes: mesRef },
        orderBy: { familiasCadastradas: 'desc' },
      }),
      prisma.equipeESF.aggregate({
        where: { municipioId: usuario.municipioId, ativo: true },
        _sum: { familiasTotal: true, populacaoTotal: true },
      }),
      prisma.paciente.count({ where: { municipioId: usuario.municipioId, ativo: true } }),
    ])

    const totalVisitadas = visitas.reduce((s, v) => s + v.familiasVisitadas, 0)
    const totalCadastradas = visitas.reduce((s, v) => s + v.familiasCadastradas, 0)
    const pctVisitas = totalCadastradas > 0 ? (totalVisitadas / totalCadastradas * 100).toFixed(0) : '0'

    return NextResponse.json({
      kpis: {
        totalEquipes: equipes.length,
        totalFamilias: Number(totalFamilias._sum.familiasTotal ?? 0),
        totalPopulacao: Number(totalFamilias._sum.populacaoTotal ?? 0),
        totalPacientes,
        pctCobertura: pctVisitas,
        visitasMes: totalVisitadas,
      },
      equipes: equipes.map(e => ({
        ...e,
        totalACS: e.membros.filter(m => m.tipo === 'ACS').length,
        totalMembros: e.membros.length,
      })),
      visitasMes: visitas,
    })
  }

  const equipes = await prisma.equipeESF.findMany({
    where: { municipioId: usuario.municipioId },
    include: {
      membros: true,
      unidade: { select: { nome: true } },
      _count: { select: { visitasACS: true } },
    },
  })
  return NextResponse.json({ equipes, total: equipes.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const body = await req.json()

  // ── Registrar visita ACS ─────────────────────────────────────────────────
  if (body._recurso === 'VISITA') {
    const Schema = z.object({
      equipeId: z.string(),
      acsNome: z.string().min(3),
      microarea: z.string(),
      mes: z.string(),
      familiasCadastradas: z.number().int().min(0),
      familiasVisitadas: z.number().int().min(0),
      gestantesAcomp: z.number().int().optional(),
      criancasAcomp: z.number().int().optional(),
      idososAcomp: z.number().int().optional(),
      hipertensosAcomp: z.number().int().optional(),
      diabeticosAcomp: z.number().int().optional(),
    })
    const val = Schema.safeParse(body)
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
    const d = val.data

    const visita = await prisma.visitaACS.upsert({
      where: { equipeId_acsNome_mes: { equipeId: d.equipeId, acsNome: d.acsNome, mes: d.mes } },
      update: { ...d },
      create: { municipioId: usuario.municipioId, ...d },
    })
    return NextResponse.json({ visita }, { status: 201 })
  }

  // ── Criar equipe ESF ─────────────────────────────────────────────────────
  const Schema = z.object({
    unidadeId: z.string(),
    ine: z.string().optional(),
    nome: z.string().min(3),
    area: z.string().optional(),
    populacaoTotal: z.number().int().optional(),
    familiasTotal: z.number().int().optional(),
    membros: z.array(z.object({ nome: z.string(), tipo: z.string(), microarea: z.string().optional() })).optional(),
  })
  const val = Schema.safeParse(body)
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const equipe = await prisma.equipeESF.create({
    data: {
      municipioId: usuario.municipioId,
      unidadeId: d.unidadeId,
      ine: d.ine, nome: d.nome, area: d.area,
      populacaoTotal: d.populacaoTotal, familiasTotal: d.familiasTotal,
      membros: d.membros?.length ? {
        create: d.membros.map(m => ({ nome: m.nome, tipo: m.tipo as any, microarea: m.microarea })),
      } : undefined,
    } as any,
  })
  return NextResponse.json({ equipe }, { status: 201 })
}
