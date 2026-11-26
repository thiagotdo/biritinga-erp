// @ts-nocheck
/**
 * GET   /api/setre/esporte  — lista eventos esportivos
 * POST  /api/setre/esporte  — cadastra evento
 * PATCH /api/setre/esporte  — atualiza status
 *
 * Tabela: EventoEsportivo
 * Schema: id, municipioId, nome, modalidade, tipo, local, dataInicio, dataFim,
 *         participantes, status, observacoes, criadoEm, atualizadoEm
 */
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import { extrairContextoRequest } from '@/lib/rbac'

export const runtime = 'nodejs'

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  }
}
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() })
}

export async function GET(req: NextRequest) {
  try {
    const mun = await prisma.Municipio.findFirst({ where: { ativo: true } })
    if (!mun) return NextResponse.json({ erro: 'Município não encontrado' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const id         = searchParams.get('id')
    const status     = searchParams.get('status')     ?? 'TODOS'
    const modalidade = searchParams.get('modalidade') ?? 'TODOS'
    const busca      = searchParams.get('busca')      ?? ''
    const pagina     = Number(searchParams.get('pagina')    ?? 1)
    const porPagina  = Number(searchParams.get('porPagina') ?? 20)
    const offset     = (pagina - 1) * porPagina

    if (id) {
      const rows = await prisma.$queryRaw`
        SELECT * FROM EventoEsportivo WHERE id = ${id} AND municipioId = ${mun.id} LIMIT 1` as any[]
      if (!rows.length) return NextResponse.json({ erro: 'Evento não encontrado' }, { status: 404 })
      return NextResponse.json({ evento: rows[0] }, { headers: cors() })
    }

    const buscaLike = busca ? `%${busca}%` : null

    const rows = await prisma.$queryRaw`
      SELECT id, nome, modalidade, tipo, local, dataInicio, dataFim,
             participantes, status, criadoEm
      FROM EventoEsportivo
      WHERE municipioId = ${mun.id}
        ${status !== 'TODOS' ? prisma.$queryRaw`AND status = ${status}` : prisma.$queryRaw``}
        ${modalidade !== 'TODOS' ? prisma.$queryRaw`AND modalidade = ${modalidade}` : prisma.$queryRaw``}
        ${buscaLike ? prisma.$queryRaw`AND (nome LIKE ${buscaLike} OR local LIKE ${buscaLike} OR modalidade LIKE ${buscaLike})` : prisma.$queryRaw``}
      ORDER BY dataInicio DESC
      LIMIT ${porPagina} OFFSET ${offset}` as any[]

    const [{ total }] = await prisma.$queryRaw`
      SELECT COUNT(*) AS total FROM EventoEsportivo
      WHERE municipioId = ${mun.id}
        ${status !== 'TODOS' ? prisma.$queryRaw`AND status = ${status}` : prisma.$queryRaw``}
        ${modalidade !== 'TODOS' ? prisma.$queryRaw`AND modalidade = ${modalidade}` : prisma.$queryRaw``}` as any[]

    const porStatus = await prisma.$queryRaw`
      SELECT status, COUNT(*) AS qtd FROM EventoEsportivo
      WHERE municipioId = ${mun.id} GROUP BY status` as any[]

    const porModalidade = await prisma.$queryRaw`
      SELECT modalidade, COUNT(*) AS qtd FROM EventoEsportivo
      WHERE municipioId = ${mun.id} GROUP BY modalidade ORDER BY qtd DESC` as any[]

    const [{ totalParticipantes }] = await prisma.$queryRaw`
      SELECT SUM(participantes) AS totalParticipantes FROM EventoEsportivo
      WHERE municipioId = ${mun.id}` as any[]

    return NextResponse.json({
      eventos: rows,
      total: Number(total),
      pagina,
      porPagina,
      porStatus,
      porModalidade,
      totalParticipantes: Number(totalParticipantes ?? 0),
    }, { headers: cors() })

  } catch (e: any) {
    console.error('[GET /api/setre/esporte]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    if (!ctx.municipioId) return NextResponse.json({ erro: 'Sem autenticação' }, { status: 401 })

    const mun = await prisma.Municipio.findFirst({ where: { ativo: true } })
    if (!mun) return NextResponse.json({ erro: 'Município não encontrado' }, { status: 404 })

    const body = await req.json()
    const { nome, modalidade, tipo, local, dataInicio, dataFim, participantes, observacoes } = body
    if (!nome || !modalidade || !dataInicio) {
      return NextResponse.json({ erro: 'Nome, modalidade e dataInicio são obrigatórios' }, { status: 400 })
    }

    const id = randomUUID()
    await prisma.$queryRaw`
      INSERT INTO EventoEsportivo
        (id, municipioId, nome, modalidade, tipo, local, dataInicio, dataFim,
         participantes, status, observacoes, criadoEm, atualizadoEm)
      VALUES
        (${id}, ${mun.id}, ${nome}, ${modalidade}, ${tipo ?? 'EVENTO_LAZER'},
         ${local ?? null}, ${dataInicio}, ${dataFim ?? null},
         ${participantes ?? null}, 'PLANEJADO',
         ${observacoes ?? null}, NOW(), NOW())`

    return NextResponse.json({ id, mensagem: 'Evento cadastrado com sucesso.' }, { status: 201, headers: cors() })

  } catch (e: any) {
    console.error('[POST /api/setre/esporte]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    if (!ctx.municipioId) return NextResponse.json({ erro: 'Sem autenticação' }, { status: 401 })

    const mun = await prisma.Municipio.findFirst({ where: { ativo: true } })
    const body = await req.json()
    const { id, status, participantes, observacoes } = body
    if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

    await prisma.$queryRaw`
      UPDATE EventoEsportivo SET
        status        = COALESCE(${status ?? null}, status),
        participantes = COALESCE(${participantes ?? null}, participantes),
        observacoes   = COALESCE(${observacoes ?? null}, observacoes),
        atualizadoEm  = NOW()
      WHERE id = ${id} AND municipioId = ${mun?.id ?? ctx.municipioId}`

    return NextResponse.json({ ok: true }, { headers: cors() })

  } catch (e: any) {
    console.error('[PATCH /api/setre/esporte]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}
