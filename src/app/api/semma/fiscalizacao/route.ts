// @ts-nocheck
/**
 * GET   /api/semma/fiscalizacao  — lista fiscalizações ambientais
 * POST  /api/semma/fiscalizacao  — cadastra nova fiscalização
 * PATCH /api/semma/fiscalizacao  — atualiza status
 *
 * Tabela: FiscalizacaoAmbiental
 * Schema: id, municipioId, numero, ano, tipo, descricao, local, autuado,
 *         cpfCnpjAutuado, fiscal, status, valorMulta, dataOcorrencia,
 *         dataVistoria, observacoes, criadoEm, atualizadoEm
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
    const tipo     = searchParams.get('tipo')   ?? 'TODOS'
    const busca    = searchParams.get('busca')  ?? ''
    const pagina   = Number(searchParams.get('pagina')    ?? 1)
    const porPagina = Number(searchParams.get('porPagina') ?? 20)
    const offset   = (pagina - 1) * porPagina

    if (id) {
      const rows = await prisma.$queryRaw`
        SELECT * FROM FiscalizacaoAmbiental
        WHERE id = ${id} AND municipioId = ${mun.id} LIMIT 1` as any[]
      if (!rows.length) return NextResponse.json({ erro: 'Fiscalização não encontrada' }, { status: 404 })
      return NextResponse.json({ fiscalizacao: rows[0] }, { headers: cors() })
    }

    const buscaLike = busca ? `%${busca}%` : null

    const rows = await prisma.$queryRaw`
      SELECT id, numero, ano, tipo, status, descricao, local, autuado,
             fiscal, valorMulta, dataOcorrencia, dataVistoria, criadoEm
      FROM FiscalizacaoAmbiental
      WHERE municipioId = ${mun.id}
        ${status !== 'TODOS' ? prisma.$queryRaw`AND status = ${status}` : prisma.$queryRaw``}
        ${tipo !== 'TODOS' ? prisma.$queryRaw`AND tipo = ${tipo}` : prisma.$queryRaw``}
        ${buscaLike ? prisma.$queryRaw`AND (autuado LIKE ${buscaLike} OR numero LIKE ${buscaLike} OR local LIKE ${buscaLike})` : prisma.$queryRaw``}
      ORDER BY dataOcorrencia DESC
      LIMIT ${porPagina} OFFSET ${offset}` as any[]

    const [{ total }] = await prisma.$queryRaw`
      SELECT COUNT(*) AS total FROM FiscalizacaoAmbiental
      WHERE municipioId = ${mun.id}
        ${status !== 'TODOS' ? prisma.$queryRaw`AND status = ${status}` : prisma.$queryRaw``}
        ${tipo !== 'TODOS' ? prisma.$queryRaw`AND tipo = ${tipo}` : prisma.$queryRaw``}` as any[]

    const resumo = await prisma.$queryRaw`
      SELECT status, COUNT(*) AS qtd FROM FiscalizacaoAmbiental
      WHERE municipioId = ${mun.id} GROUP BY status` as any[]

    const porTipo = await prisma.$queryRaw`
      SELECT tipo, COUNT(*) AS qtd FROM FiscalizacaoAmbiental
      WHERE municipioId = ${mun.id} GROUP BY tipo ORDER BY qtd DESC` as any[]

    const [multas] = await prisma.$queryRaw`
      SELECT SUM(valorMulta) AS totalMultas FROM FiscalizacaoAmbiental
      WHERE municipioId = ${mun.id} AND valorMulta IS NOT NULL` as any[]

    return NextResponse.json({
      fiscalizacoes: rows,
      total: Number(total),
      pagina,
      porPagina,
      resumo,
      porTipo,
      totalMultas: Number(multas?.totalMultas ?? 0),
    }, { headers: cors() })

  } catch (e: any) {
    console.error('[GET /api/semma/fiscalizacao]', e)
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
    const { tipo, descricao, local, autuado, cpfCnpjAutuado, fiscal, valorMulta, dataOcorrencia } = body
    if (!tipo || !descricao || !dataOcorrencia) {
      return NextResponse.json({ erro: 'Tipo, descrição e dataOcorrencia são obrigatórios' }, { status: 400 })
    }

    const ano = new Date().getFullYear()
    const [{ seq }] = await prisma.$queryRaw`
      SELECT COUNT(*) + 1 AS seq FROM FiscalizacaoAmbiental
      WHERE municipioId = ${mun.id} AND ano = ${ano}` as any[]
    const numero = `AFM-${ano}/${String(Number(seq)).padStart(3, '0')}`
    const id = randomUUID()

    await prisma.$queryRaw`
      INSERT INTO FiscalizacaoAmbiental
        (id, municipioId, numero, ano, tipo, descricao, local, autuado, cpfCnpjAutuado,
         fiscal, valorMulta, dataOcorrencia, status, criadoEm, atualizadoEm)
      VALUES
        (${id}, ${mun.id}, ${numero}, ${ano}, ${tipo}, ${descricao},
         ${local ?? null}, ${autuado ?? null}, ${cpfCnpjAutuado ?? null},
         ${fiscal ?? null}, ${valorMulta ?? null}, ${dataOcorrencia},
         'ABERTA', NOW(), NOW())`

    return NextResponse.json({ id, numero, mensagem: 'Fiscalização registrada.' }, { status: 201, headers: cors() })

  } catch (e: any) {
    console.error('[POST /api/semma/fiscalizacao]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    if (!ctx.municipioId) return NextResponse.json({ erro: 'Sem autenticação' }, { status: 401 })

    const mun = await prisma.Municipio.findFirst({ where: { ativo: true } })
    const body = await req.json()
    const { id, status, dataVistoria, observacoes } = body
    if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

    await prisma.$queryRaw`
      UPDATE FiscalizacaoAmbiental SET
        status       = COALESCE(${status ?? null}, status),
        dataVistoria = COALESCE(${dataVistoria ?? null}, dataVistoria),
        observacoes  = COALESCE(${observacoes ?? null}, observacoes),
        atualizadoEm = NOW()
      WHERE id = ${id} AND municipioId = ${mun?.id ?? ctx.municipioId}`

    return NextResponse.json({ ok: true }, { headers: cors() })

  } catch (e: any) {
    console.error('[PATCH /api/semma/fiscalizacao]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}
