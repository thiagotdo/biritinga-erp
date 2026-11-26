// @ts-nocheck
/**
 * GET   /api/setre/curso  — lista cursos de capacitação
 * POST  /api/setre/curso  — cadastra novo curso
 * PATCH /api/setre/curso  — atualiza status/inscritos
 *
 * Tabela: CursoCapacitacao
 * Schema: id, municipioId, nome, area, cargaHoraria, vagas, inscritos,
 *         instrutor, local, dataInicio, dataFim, status, parceiro,
 *         observacoes, criadoEm, atualizadoEm
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
    const id       = searchParams.get('id')
    const status   = searchParams.get('status') ?? 'TODOS'
    const area     = searchParams.get('area')   ?? 'TODOS'
    const busca    = searchParams.get('busca')  ?? ''
    const pagina   = Number(searchParams.get('pagina')    ?? 1)
    const porPagina = Number(searchParams.get('porPagina') ?? 20)
    const offset   = (pagina - 1) * porPagina

    if (id) {
      const rows = await prisma.$queryRaw`
        SELECT * FROM CursoCapacitacao WHERE id = ${id} AND municipioId = ${mun.id} LIMIT 1` as any[]
      if (!rows.length) return NextResponse.json({ erro: 'Curso não encontrado' }, { status: 404 })
      return NextResponse.json({ curso: rows[0] }, { headers: cors() })
    }

    const buscaLike = busca ? `%${busca}%` : null

    const rows = await prisma.$queryRaw`
      SELECT id, nome, area, cargaHoraria, vagas, inscritos,
             instrutor, local, dataInicio, dataFim, status, parceiro, criadoEm
      FROM CursoCapacitacao
      WHERE municipioId = ${mun.id}
        ${status !== 'TODOS' ? prisma.$queryRaw`AND status = ${status}` : prisma.$queryRaw``}
        ${area !== 'TODOS' ? prisma.$queryRaw`AND area = ${area}` : prisma.$queryRaw``}
        ${buscaLike ? prisma.$queryRaw`AND (nome LIKE ${buscaLike} OR instrutor LIKE ${buscaLike} OR parceiro LIKE ${buscaLike})` : prisma.$queryRaw``}
      ORDER BY dataInicio DESC
      LIMIT ${porPagina} OFFSET ${offset}` as any[]

    const [{ total }] = await prisma.$queryRaw`
      SELECT COUNT(*) AS total FROM CursoCapacitacao
      WHERE municipioId = ${mun.id}
        ${status !== 'TODOS' ? prisma.$queryRaw`AND status = ${status}` : prisma.$queryRaw``}
        ${area !== 'TODOS' ? prisma.$queryRaw`AND area = ${area}` : prisma.$queryRaw``}` as any[]

    const porStatus = await prisma.$queryRaw`
      SELECT status, COUNT(*) AS qtd FROM CursoCapacitacao
      WHERE municipioId = ${mun.id} GROUP BY status` as any[]

    const [totais] = await prisma.$queryRaw`
      SELECT SUM(vagas) AS totalVagas, SUM(inscritos) AS totalInscritos
      FROM CursoCapacitacao WHERE municipioId = ${mun.id}
        AND status IN ('EM_ANDAMENTO','CONCLUIDO','INSCRICOES_ABERTAS')` as any[]

    return NextResponse.json({
      cursos: rows,
      total: Number(total),
      pagina,
      porPagina,
      porStatus,
      totalVagas: Number(totais?.totalVagas ?? 0),
      totalInscritos: Number(totais?.totalInscritos ?? 0),
    }, { headers: cors() })

  } catch (e: any) {
    console.error('[GET /api/setre/curso]', e)
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
    const { nome, area, cargaHoraria, vagas, instrutor, local, dataInicio, dataFim, parceiro, observacoes } = body
    if (!nome || !area || !dataInicio) {
      return NextResponse.json({ erro: 'Nome, área e dataInicio são obrigatórios' }, { status: 400 })
    }

    const id = randomUUID()
    await prisma.$queryRaw`
      INSERT INTO CursoCapacitacao
        (id, municipioId, nome, area, cargaHoraria, vagas, inscritos,
         instrutor, local, dataInicio, dataFim, status, parceiro, observacoes,
         criadoEm, atualizadoEm)
      VALUES
        (${id}, ${mun.id}, ${nome}, ${area}, ${cargaHoraria ?? null},
         ${vagas ?? null}, 0,
         ${instrutor ?? null}, ${local ?? null}, ${dataInicio}, ${dataFim ?? null},
         'PLANEJADO', ${parceiro ?? null}, ${observacoes ?? null},
         NOW(), NOW())`

    return NextResponse.json({ id, mensagem: 'Curso cadastrado com sucesso.' }, { status: 201, headers: cors() })

  } catch (e: any) {
    console.error('[POST /api/setre/curso]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    if (!ctx.municipioId) return NextResponse.json({ erro: 'Sem autenticação' }, { status: 401 })

    const mun = await prisma.Municipio.findFirst({ where: { ativo: true } })
    const body = await req.json()
    const { id, status, inscritos, observacoes } = body
    if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

    await prisma.$queryRaw`
      UPDATE CursoCapacitacao SET
        status       = COALESCE(${status ?? null}, status),
        inscritos    = COALESCE(${inscritos ?? null}, inscritos),
        observacoes  = COALESCE(${observacoes ?? null}, observacoes),
        atualizadoEm = NOW()
      WHERE id = ${id} AND municipioId = ${mun?.id ?? ctx.municipioId}`

    return NextResponse.json({ ok: true }, { headers: cors() })

  } catch (e: any) {
    console.error('[PATCH /api/setre/curso]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}
