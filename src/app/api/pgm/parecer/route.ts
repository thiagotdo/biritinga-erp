// @ts-nocheck
/**
 * GET   /api/pgm/parecer  — lista pareceres jurídicos
 * POST  /api/pgm/parecer  — cadastra novo parecer
 * PATCH /api/pgm/parecer  — atualiza status/conclusão
 *
 * Tabela: ParecerJuridico
 * Schema real: id, municipioId, numero, tipo, status, classificacao, assunto,
 *              solicitante, solicitanteId, procuradorId, dataSolicitacao,
 *              prazoResposta, dataEmissao, ementa, fundamentacao, conclusao,
 *              ressalvas, ativo, createdAt, updatedAt
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

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    const mun = await prisma.Municipio.findFirst({ where: { ativo: true } })
    if (!mun) return NextResponse.json({ erro: 'Município não encontrado' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const id         = searchParams.get('id')
    const status     = searchParams.get('status')     ?? 'TODOS'
    const tipo       = searchParams.get('tipo')       ?? 'TODOS'
    const classi     = searchParams.get('classificacao') ?? 'TODOS'
    const busca      = searchParams.get('busca')      ?? ''
    const pagina     = Number(searchParams.get('pagina')    ?? 1)
    const porPagina  = Number(searchParams.get('porPagina') ?? 20)
    const offset     = (pagina - 1) * porPagina

    // Detalhe por ID
    if (id) {
      const rows = await prisma.$queryRaw`
        SELECT * FROM ParecerJuridico
        WHERE id = ${id} AND municipioId = ${mun.id} AND ativo = 1
        LIMIT 1` as any[]
      if (!rows.length) return NextResponse.json({ erro: 'Parecer não encontrado' }, { status: 404 })
      return NextResponse.json({ parecer: rows[0] }, { headers: cors() })
    }

    const buscaLike = busca ? `%${busca}%` : null

    const rows = await prisma.$queryRaw`
      SELECT id, numero, tipo, status, classificacao, assunto, solicitante,
             dataSolicitacao, prazoResposta, dataEmissao, conclusao,
             createdAt, updatedAt
      FROM ParecerJuridico
      WHERE municipioId = ${mun.id} AND ativo = 1
        ${status !== 'TODOS' ? prisma.$queryRaw`AND status = ${status}` : prisma.$queryRaw``}
        ${tipo !== 'TODOS' ? prisma.$queryRaw`AND tipo = ${tipo}` : prisma.$queryRaw``}
        ${classi !== 'TODOS' ? prisma.$queryRaw`AND classificacao = ${classi}` : prisma.$queryRaw``}
        ${buscaLike ? prisma.$queryRaw`AND (assunto LIKE ${buscaLike} OR solicitante LIKE ${buscaLike} OR numero LIKE ${buscaLike})` : prisma.$queryRaw``}
      ORDER BY
        CASE status
          WHEN 'PENDENTE' THEN 1
          WHEN 'EM_ANALISE' THEN 2
          ELSE 3
        END,
        dataSolicitacao DESC
      LIMIT ${porPagina} OFFSET ${offset}` as any[]

    const [{ total }] = await prisma.$queryRaw`
      SELECT COUNT(*) AS total FROM ParecerJuridico
      WHERE municipioId = ${mun.id} AND ativo = 1
        ${status !== 'TODOS' ? prisma.$queryRaw`AND status = ${status}` : prisma.$queryRaw``}
        ${tipo !== 'TODOS' ? prisma.$queryRaw`AND tipo = ${tipo}` : prisma.$queryRaw``}` as any[]

    // Resumo por status
    const resumo = await prisma.$queryRaw`
      SELECT status, COUNT(*) AS qtd FROM ParecerJuridico
      WHERE municipioId = ${mun.id} AND ativo = 1
      GROUP BY status` as any[]

    // Resumo por classificação
    const porClassi = await prisma.$queryRaw`
      SELECT classificacao, COUNT(*) AS qtd FROM ParecerJuridico
      WHERE municipioId = ${mun.id} AND ativo = 1
      GROUP BY classificacao ORDER BY qtd DESC` as any[]

    return NextResponse.json({
      pareceres: rows,
      total: Number(total),
      pagina,
      porPagina,
      resumo,
      porClassificacao: porClassi,
    }, { headers: cors() })

  } catch (e: any) {
    console.error('[GET /api/pgm/parecer]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    if (!ctx.municipioId) return NextResponse.json({ erro: 'Sem autenticação' }, { status: 401 })

    const mun = await prisma.Municipio.findFirst({ where: { ativo: true } })
    if (!mun) return NextResponse.json({ erro: 'Município não encontrado' }, { status: 404 })

    const body = await req.json()
    const { tipo, assunto, solicitante, classificacao, fundamentacao, dataSolicitacao, prazoResposta } = body

    if (!tipo || !assunto || !solicitante || !dataSolicitacao) {
      return NextResponse.json({ erro: 'Tipo, assunto, solicitante e dataSolicitacao são obrigatórios' }, { status: 400 })
    }

    // Número sequencial ano/seq
    const ano = new Date().getFullYear()
    const [{ seq }] = await prisma.$queryRaw`
      SELECT COUNT(*) + 1 AS seq FROM ParecerJuridico
      WHERE municipioId = ${mun.id} AND YEAR(createdAt) = ${ano}` as any[]
    const numero = `PGM-${ano}/${String(Number(seq)).padStart(3, '0')}`

    const id = randomUUID()

    await prisma.$queryRaw`
      INSERT INTO ParecerJuridico
        (id, municipioId, numero, tipo, assunto, solicitante, classificacao, fundamentacao,
         status, dataSolicitacao, prazoResposta, ativo, createdAt, updatedAt)
      VALUES
        (${id}, ${mun.id}, ${numero}, ${tipo}, ${assunto}, ${solicitante},
         ${classificacao ?? 'ADMINISTRATIVO'}, ${fundamentacao ?? null},
         'PENDENTE', ${dataSolicitacao}, ${prazoResposta ?? null},
         1, NOW(), NOW())`

    return NextResponse.json({ id, numero, mensagem: 'Parecer cadastrado com sucesso.' }, { status: 201, headers: cors() })

  } catch (e: any) {
    console.error('[POST /api/pgm/parecer]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    if (!ctx.municipioId) return NextResponse.json({ erro: 'Sem autenticação' }, { status: 401 })

    const mun = await prisma.Municipio.findFirst({ where: { ativo: true } })
    const body = await req.json()
    const { id, status, conclusao, fundamentacao, ressalvas, dataEmissao } = body
    if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

    await prisma.$queryRaw`
      UPDATE ParecerJuridico SET
        status       = COALESCE(${status ?? null}, status),
        conclusao    = COALESCE(${conclusao ?? null}, conclusao),
        fundamentacao = COALESCE(${fundamentacao ?? null}, fundamentacao),
        ressalvas    = COALESCE(${ressalvas ?? null}, ressalvas),
        dataEmissao  = COALESCE(${dataEmissao ?? null}, dataEmissao),
        updatedAt    = NOW()
      WHERE id = ${id} AND municipioId = ${mun?.id ?? ctx.municipioId}`

    return NextResponse.json({ ok: true }, { headers: cors() })

  } catch (e: any) {
    console.error('[PATCH /api/pgm/parecer]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}
