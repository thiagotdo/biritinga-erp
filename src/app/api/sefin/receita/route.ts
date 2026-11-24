// @ts-nocheck
// Gestão de Receitas - ReceitaOrcamentaria
// GET    - listar receitas previstas / lançamentos
// POST   - criar receita prevista / registrar arrecadação
// PATCH  - atualizar receita prevista / cancelar lançamento

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma, getConn } from '@/lib/db'
import { extrairContextoRequest, temPermissao } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

const ReceitaSchema = z.object({
  exercicio:      z.number().int().positive(),
  mes:            z.number().min(1).max(12),
  competencia:    z.string().regex(/^\d{4}-\d{2}$/),
  codigoReceita:  z.string().min(2),
  natureza:       z.string(),
  descricao:      z.string().min(5),
  fonte:          z.string().optional(),
  unidadeGestora: z.string().optional(),
  previsto:       z.number().default(0),
  arrecadado:     z.number().default(0),
})

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'sefin:receita:read')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const id          = searchParams.get('id')
    const exercicio   = searchParams.get('exercicio') ? Number(searchParams.get('exercicio')) : new Date().getFullYear()
    const competencia = searchParams.get('competencia')
    const natureza    = searchParams.get('natureza')

    // Detalhe de receita específica
    if (id) {
      const rec = await prisma.ReceitaOrcamentaria.findFirst({
        where: { id, municipioId: ctx.municipioId },
      })
      if (!rec) return NextResponse.json({ erro: 'Receita não encontrada' }, { status: 404 })
      return NextResponse.json({ receita: rec })
    }

    const conn = await getConn()
    try {
      const params: any[] = [ctx.municipioId, exercicio]
      let where = 'municipioId = ? AND exercicio = ?'
      if (competencia) { where += ' AND competencia = ?'; params.push(competencia) }
      if (natureza)    { where += ' AND natureza = ?'; params.push(natureza) }

      const [receitas] = await conn.execute(
        `SELECT * FROM ReceitaOrcamentaria WHERE ${where} ORDER BY natureza ASC, codigoReceita ASC`,
        params
      ) as any[]

      // Resumo por natureza
      const [resumoRows] = await conn.execute(
        `SELECT natureza, SUM(previsto) as previsto, SUM(arrecadado) as arrecadado
         FROM ReceitaOrcamentaria WHERE municipioId = ? AND exercicio = ?
         GROUP BY natureza ORDER BY natureza ASC`,
        [ctx.municipioId, exercicio]
      ) as any[]

      const totalPrevisto   = (resumoRows as any[]).reduce((s, r) => s + Number(r.previsto ?? 0), 0)
      const totalArrecadado = (resumoRows as any[]).reduce((s, r) => s + Number(r.arrecadado ?? 0), 0)

      return NextResponse.json({
        exercicio,
        receitas,
        resumo: {
          porNatureza: (resumoRows as any[]).map((r: any) => ({
            natureza: r.natureza,
            previsto: Number(r.previsto ?? 0),
            arrecadado: Number(r.arrecadado ?? 0),
          })),
          total: { previsto: totalPrevisto, arrecadado: totalArrecadado },
        },
      })
    } finally {
      await conn.end()
    }
  } catch (error) {
    console.error('[SEFIN/RECEITA/GET]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'sefin:receita:create')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const dados = ReceitaSchema.parse(body)

    const rec = await prisma.ReceitaOrcamentaria.upsert({
      where: {
        municipioId_competencia_codigoReceita: {
          municipioId:   ctx.municipioId,
          competencia:   dados.competencia,
          codigoReceita: dados.codigoReceita,
        },
      },
      update: { previsto: dados.previsto, arrecadado: dados.arrecadado },
      create: {
        id:             randomUUID(),
        criadoEm:       new Date(),
        atualizadoEm:   new Date(),
        municipioId:    ctx.municipioId,
        exercicio:      dados.exercicio,
        mes:            dados.mes,
        competencia:    dados.competencia,
        codigoReceita:  dados.codigoReceita,
        natureza:       dados.natureza as any,
        descricao:      dados.descricao,
        fonte:          dados.fonte,
        unidadeGestora: dados.unidadeGestora,
        previsto:       dados.previsto,
        arrecadado:     dados.arrecadado,
      } as any,
    })

    return NextResponse.json({ receita: rec }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[SEFIN/RECEITA/POST]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'sefin:receita:update')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const { id, arrecadado, previsto } = await request.json()
    if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

    const rec = await prisma.ReceitaOrcamentaria.findFirst({
      where: { id, municipioId: ctx.municipioId },
    })
    if (!rec) return NextResponse.json({ erro: 'Receita não encontrada' }, { status: 404 })

    const atualizada = await prisma.ReceitaOrcamentaria.update({
      where: { id },
      data: {
        ...(arrecadado !== undefined && { arrecadado }),
        ...(previsto   !== undefined && { previsto }),
        atualizadoEm: new Date(),
      },
    })

    return NextResponse.json({ receita: atualizada })
  } catch (error) {
    console.error('[SEFIN/RECEITA/PATCH]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
