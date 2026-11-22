// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── FUNDEB ───────────────────────────────────────────────────────────────────
// EC 108/2020 - FUNDEB permanente · Mínimo 70% professores
// Lei 14.113/2020 · Portaria Interministerial 06/2020

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const ano         = Number(searchParams.get('ano') ?? new Date().getFullYear())
  const mes         = searchParams.get('mes')
  const municipioId = usuario.municipioId

  try {
    if (mes) {
      const repasse = await db.RepaseFUNDEB.findFirst({
        where: { municipioId, mes },
      })
      return NextResponse.json({ repasse })
    }

    // Resumo do ano
    const repasses = await db.RepaseFUNDEB.findMany({
      where: { municipioId, competencia: ano },
      orderBy: { mes: 'asc' },
    })

    const totalRepasse    = repasses.reduce((s, r) => s + Number(r.valorRepasse ?? 0), 0)
    const totalFundeb     = repasses.reduce((s, r) => s + Number(r.valorFundeb ?? 0), 0)
    const totalAplicProf  = repasses.reduce((s, r) => s + Number(r.aplicacaoProfessores ?? 0), 0)
    const totalMeses      = repasses.length
    const pctProfGeral    = totalFundeb > 0 ? Math.round((totalAplicProf / totalFundeb) * 100 * 10) / 10 : 0
    const alertaProfGeral = pctProfGeral < 70

    // Alerta: meses com aplicação abaixo de 70%
    const mesesAlerta = repasses.filter(r => r.alertaProfessores)

    return NextResponse.json({
      ano,
      repasses: repasses.map(r => ({
        ...r,
        valorRepasse:    Number(r.valorRepasse),
        valorFundeb:     Number(r.valorFundeb),
        saldo:           Number(r.saldo),
        aplicacaoProfessores: r.aplicacaoProfessores ? Number(r.aplicacaoProfessores) : null,
        pctProfessores:  r.pctProfessores ? Number(r.pctProfessores) : null,
      })),
      resumo: {
        totalRepasse, totalFundeb, totalAplicProf, totalMeses,
        pctProfGeral, alertaProfGeral,
        mesesAlerta: mesesAlerta.length,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  try {
    const d = await req.json()
    const municipioId = usuario.municipioId

    const valorRepasse   = Number(d.valorRepasse)
    const valorFundeb    = Number(d.valorFundeb)
    const saldo          = valorRepasse - valorFundeb
    const aplicProf      = d.aplicacaoProfessores ? Number(d.aplicacaoProfessores) : null
    const pctProf        = aplicProf && valorFundeb > 0
      ? Math.round((aplicProf / valorFundeb) * 100 * 100) / 100
      : null
    const alertaProf     = pctProf !== null && pctProf < 70

    const repasse = await db.RepaseFUNDEB.upsert({
      where: { municipioId_mes: { municipioId, mes: d.mes } },
      update: {
        valorRepasse, valorFundeb, saldo,
        matriculasApuradas: d.matriculasApuradas ? Number(d.matriculasApuradas) : undefined,
        valorPorAluno: d.valorPorAluno ? Number(d.valorPorAluno) : undefined,
        aplicacaoProfessores: aplicProf,
        pctProfessores: pctProf,
        alertaProfessores: alertaProf,
      },
      create: {
        municipioId,
        mes: d.mes,
        competencia: Number(d.mes.slice(0, 4)),
        valorRepasse, valorFundeb, saldo,
        matriculasApuradas: d.matriculasApuradas ? Number(d.matriculasApuradas) : 0,
        valorPorAluno: d.valorPorAluno ? Number(d.valorPorAluno) : undefined,
        aplicacaoProfessores: aplicProf,
        pctProfessores: pctProf,
        alertaProfessores: alertaProf,
      },
    })

    await auditLog({ municipioId, usuarioId: usuario.usuarioId, acao: 'CREATE',
      modulo: 'educacao', recurso: 'RepaseFUNDEB', registroId: repasse.id,
      dadosNovos: { mes: d.mes, valorRepasse, alertaProf } })

    return NextResponse.json({ repasse, alertaProf, pctProf }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
