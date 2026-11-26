// @ts-nocheck
/**
 * GET   /api/semma/licenca  — lista licenças ambientais
 * POST  /api/semma/licenca  — cadastra nova licença
 * PATCH /api/semma/licenca  — atualiza status/datas
 *
 * Tabela: LicencaAmbiental
 * Schema real: id, municipioId, numero, tipo, status, requerente, cnpjCpf,
 *              empreendimento, atividade, localizacao, dataRequerimento,
 *              dataEmissao, dataVencimento, observacoes, ativo, criadoEm, atualizadoEm
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
        SELECT * FROM LicencaAmbiental WHERE id = ${id} AND municipioId = ${mun.id} AND ativo = 1 LIMIT 1` as any[]
      if (!rows.length) return NextResponse.json({ erro: 'Licença não encontrada' }, { status: 404 })
      return NextResponse.json({ licenca: rows[0] }, { headers: cors() })
    }

    const buscaLike = busca ? `%${busca}%` : null

    const rows = await prisma.$queryRaw`
      SELECT id, numero, tipo, status, requerente, cnpjCpf, empreendimento, atividade,
             localizacao, dataRequerimento, dataEmissao, dataVencimento, criadoEm
      FROM LicencaAmbiental
      WHERE municipioId = ${mun.id} AND ativo = 1
        ${status !== 'TODOS' ? prisma.$queryRaw`AND status = ${status}` : prisma.$queryRaw``}
        ${tipo !== 'TODOS' ? prisma.$queryRaw`AND tipo = ${tipo}` : prisma.$queryRaw``}
        ${buscaLike ? prisma.$queryRaw`AND (requerente LIKE ${buscaLike} OR empreendimento LIKE ${buscaLike} OR numero LIKE ${buscaLike})` : prisma.$queryRaw``}
      ORDER BY
        CASE status
          WHEN 'SOLICITADA' THEN 1
          WHEN 'EM_ANALISE' THEN 2
          WHEN 'VISTORIA' THEN 3
          WHEN 'VENCIDA' THEN 4
          ELSE 5
        END,
        dataRequerimento DESC
      LIMIT ${porPagina} OFFSET ${offset}` as any[]

    const [{ total }] = await prisma.$queryRaw`
      SELECT COUNT(*) AS total FROM LicencaAmbiental
      WHERE municipioId = ${mun.id} AND ativo = 1
        ${status !== 'TODOS' ? prisma.$queryRaw`AND status = ${status}` : prisma.$queryRaw``}
        ${tipo !== 'TODOS' ? prisma.$queryRaw`AND tipo = ${tipo}` : prisma.$queryRaw``}` as any[]

    const resumo = await prisma.$queryRaw`
      SELECT status, COUNT(*) AS qtd FROM LicencaAmbiental
      WHERE municipioId = ${mun.id} AND ativo = 1 GROUP BY status` as any[]

    // Vencendo nos próximos 90 dias
    const vencendo = await prisma.$queryRaw`
      SELECT COUNT(*) AS qtd FROM LicencaAmbiental
      WHERE municipioId = ${mun.id} AND ativo = 1
        AND status = 'APROVADA'
        AND dataVencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 90 DAY)` as any[]

    return NextResponse.json({
      licencas: rows,
      total: Number(total),
      pagina,
      porPagina,
      resumo,
      vencendoEm90Dias: Number(vencendo[0]?.qtd ?? 0),
    }, { headers: cors() })

  } catch (e: any) {
    console.error('[GET /api/semma/licenca]', e)
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
    const { tipo, requerente, cnpjCpf, empreendimento, atividade, localizacao, dataRequerimento } = body
    if (!tipo || !requerente || !atividade || !dataRequerimento) {
      return NextResponse.json({ erro: 'Tipo, requerente, atividade e dataRequerimento são obrigatórios' }, { status: 400 })
    }

    const ano = new Date().getFullYear()
    const [{ seq }] = await prisma.$queryRaw`
      SELECT COUNT(*) + 1 AS seq FROM LicencaAmbiental
      WHERE municipioId = ${mun.id} AND YEAR(criadoEm) = ${ano}` as any[]
    const numero = `LA-${ano}/${String(Number(seq)).padStart(3, '0')}`
    const id = randomUUID()

    await prisma.$queryRaw`
      INSERT INTO LicencaAmbiental
        (id, municipioId, numero, tipo, status, requerente, cnpjCpf, empreendimento,
         atividade, localizacao, dataRequerimento, ativo, criadoEm, atualizadoEm)
      VALUES
        (${id}, ${mun.id}, ${numero}, ${tipo}, 'SOLICITADA', ${requerente},
         ${cnpjCpf ?? null}, ${empreendimento ?? requerente}, ${atividade},
         ${localizacao ?? null}, ${dataRequerimento}, 1, NOW(), NOW())`

    return NextResponse.json({ id, numero, mensagem: 'Solicitação registrada com sucesso.' }, { status: 201, headers: cors() })

  } catch (e: any) {
    console.error('[POST /api/semma/licenca]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    if (!ctx.municipioId) return NextResponse.json({ erro: 'Sem autenticação' }, { status: 401 })

    const mun = await prisma.Municipio.findFirst({ where: { ativo: true } })
    const body = await req.json()
    const { id, status, dataEmissao, dataVencimento, observacoes } = body
    if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

    await prisma.$queryRaw`
      UPDATE LicencaAmbiental SET
        status         = COALESCE(${status ?? null}, status),
        dataEmissao    = COALESCE(${dataEmissao ?? null}, dataEmissao),
        dataVencimento = COALESCE(${dataVencimento ?? null}, dataVencimento),
        observacoes    = COALESCE(${observacoes ?? null}, observacoes),
        atualizadoEm   = NOW()
      WHERE id = ${id} AND municipioId = ${mun?.id ?? ctx.municipioId}`

    return NextResponse.json({ ok: true }, { headers: cors() })

  } catch (e: any) {
    console.error('[PATCH /api/semma/licenca]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}
