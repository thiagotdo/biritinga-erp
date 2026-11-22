// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── ESF - Estratégia Saúde da Família ───────────────────────────────────────
// PNAB - Portaria GM/MS 2.436/2017

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const relatorio = searchParams.get('relatorio')
  const mes       = searchParams.get('mes')   // "2026-11"
  const municipioId = usuario.municipioId

  try {
    if (relatorio === 'DASHBOARD') {
      const mesBusca = mes ?? new Date().toISOString().slice(0, 7)
      const [equipes, visitas, cobertura] = await Promise.all([
        db.EquipeESF.count({ where: { municipioId, ativo: true } }),
        db.$queryRaw`
          SELECT COALESCE(SUM(familiasVisitadas), 0) AS total,
                 COALESCE(SUM(familiasCadastradas), 0) AS cadastradas
          FROM VisitaACS WHERE municipioId = ${municipioId} AND mes = ${mesBusca}`,
        db.$queryRaw`
          SELECT COALESCE(SUM(populacaoTotal), 0) AS popTotal,
                 COALESCE(SUM(familiasTotal), 0)  AS famTotal
          FROM EquipeESF WHERE municipioId = ${municipioId} AND ativo = 1`,
      ])
      const v   = (visitas as any[])[0] ?? {}
      const cob = (cobertura as any[])[0] ?? {}
      const famVisitadas  = Number(v.total ?? 0)
      const famCadastradas= Number(v.cadastradas ?? 0)
      const pctCobertura  = cob.famTotal > 0
        ? Math.round((famCadastradas / Number(cob.famTotal)) * 100)
        : 0
      return NextResponse.json({
        kpis: { equipes, famVisitadas, famCadastradas, popTotal: Number(cob.popTotal ?? 0),
                famTotal: Number(cob.famTotal ?? 0), pctCobertura },
      })
    }

    // Lista equipes com membros e visitas do mês atual
    const mesBusca = mes ?? new Date().toISOString().slice(0, 7)
    const equipes = await db.$queryRaw`
      SELECT e.id, e.nome, e.area, e.ine, e.populacaoTotal, e.familiasTotal,
             u.nome AS unidadeNome, u.bairro,
             (SELECT COUNT(*) FROM MembroEquipeESF m WHERE m.equipeId = e.id AND m.ativo = 1) AS totalMembros,
             (SELECT COALESCE(SUM(v.familiasVisitadas), 0) FROM VisitaACS v WHERE v.equipeId = e.id AND v.mes = ${mesBusca}) AS famVisitadas,
             (SELECT COALESCE(SUM(v.familiasCadastradas), 0) FROM VisitaACS v WHERE v.equipeId = e.id AND v.mes = ${mesBusca}) AS famCadastradas
      FROM EquipeESF e
      LEFT JOIN UnidadeSaude u ON u.id = e.unidadeId
      WHERE e.municipioId = ${municipioId} AND e.ativo = 1
      ORDER BY e.nome`

    return NextResponse.json({ equipes })
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

    // POST distingue: registro de visita ACS (_recurso = 'visita') vs cadastro de equipe
    if (d._recurso === 'visita') {
      // VisitaACS - upsert por equipe/acsNome/mes
      const existing = await db.$queryRaw`
        SELECT id FROM VisitaACS WHERE equipeId = ${d.equipeId} AND acsNome = ${d.acsNome} AND mes = ${d.mes} LIMIT 1` as any[]

      if (existing.length) {
        await db.VisitaACS.update({
          where: { id: existing[0].id },
          data: {
            familiasCadastradas: Number(d.familiasCadastradas),
            familiasVisitadas:   Number(d.familiasVisitadas),
            gestantesAcomp:      Number(d.gestantesAcomp ?? 0),
            criancasAcomp:       Number(d.criancasAcomp  ?? 0),
            hipertensosAcomp:    Number(d.hipertensosAcomp ?? 0),
            diabeticosAcomp:     Number(d.diabeticosAcomp  ?? 0),
          },
        })
        return NextResponse.json({ sucesso: true })
      }

      const visita = await db.VisitaACS.create({
        data: {
          municipioId,
          equipeId:           d.equipeId,
          acsNome:            d.acsNome,
          microarea:          d.microarea ?? '',
          mes:                d.mes,
          familiasCadastradas:Number(d.familiasCadastradas),
          familiasVisitadas:  Number(d.familiasVisitadas),
          gestantesAcomp:     Number(d.gestantesAcomp ?? 0),
          criancasAcomp:      Number(d.criancasAcomp  ?? 0),
          hipertensosAcomp:   Number(d.hipertensosAcomp ?? 0),
          diabeticosAcomp:    Number(d.diabeticosAcomp  ?? 0),
        },
      })
      await auditLog({ municipioId, usuarioId: usuario.usuarioId, acao: 'CREATE',
        modulo: 'saude', recurso: 'VisitaACS', registroId: visita.id,
        dadosNovos: { equipeId: d.equipeId, mes: d.mes, familiasVisitadas: d.familiasVisitadas } })
      return NextResponse.json({ visita }, { status: 201 })
    }

    // Cadastro de nova equipe ESF
    const equipe = await db.EquipeESF.create({
      data: {
        municipioId,
        unidadeId:      d.unidadeId,
        nome:           d.nome,
        ine:            d.ine,
        area:           d.area,
        microareas:     d.microareas,
        populacaoTotal: d.populacaoTotal ? Number(d.populacaoTotal) : undefined,
        familiasTotal:  d.familiasTotal  ? Number(d.familiasTotal)  : undefined,
      },
    })
    await auditLog({ municipioId, usuarioId: usuario.usuarioId, acao: 'CREATE',
      modulo: 'saude', recurso: 'EquipeESF', registroId: equipe.id,
      dadosNovos: { nome: d.nome, unidadeId: d.unidadeId } })
    return NextResponse.json({ equipe }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
