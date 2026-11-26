// @ts-nocheck
/**
 * GET   /api/seagri/assistencia  — lista atendimentos de ATER
 * POST  /api/seagri/assistencia  — cadastra novo atendimento
 *
 * Tabela: AssistenciaTecnicaRural
 * Schema: id, municipioId, propriedadeId, tipo, descricao, tecnico,
 *         beneficiario, dataAtendimento, resultado, criadoEm, atualizadoEm
 */
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import { extrairContextoRequest } from '@/lib/rbac'

export const runtime = 'nodejs'

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    const tipo     = searchParams.get('tipo')  ?? 'TODOS'
    const busca    = searchParams.get('busca') ?? ''
    const pagina   = Number(searchParams.get('pagina')    ?? 1)
    const porPagina = Number(searchParams.get('porPagina') ?? 20)
    const offset   = (pagina - 1) * porPagina
    const buscaLike = busca ? `%${busca}%` : null

    const rows = await prisma.$queryRaw`
      SELECT a.id, a.tipo, a.descricao, a.tecnico, a.beneficiario,
             a.dataAtendimento, a.resultado,
             p.nome AS propriedadeNome, p.comunidade
      FROM AssistenciaTecnicaRural a
      LEFT JOIN PropriedadeRural p ON p.id = a.propriedadeId
      WHERE a.municipioId = ${mun.id}
        ${tipo !== 'TODOS' ? prisma.$queryRaw`AND a.tipo = ${tipo}` : prisma.$queryRaw``}
        ${buscaLike ? prisma.$queryRaw`AND (a.beneficiario LIKE ${buscaLike} OR a.tecnico LIKE ${buscaLike} OR a.descricao LIKE ${buscaLike})` : prisma.$queryRaw``}
      ORDER BY a.dataAtendimento DESC
      LIMIT ${porPagina} OFFSET ${offset}` as any[]

    const [{ total }] = await prisma.$queryRaw`
      SELECT COUNT(*) AS total FROM AssistenciaTecnicaRural
      WHERE municipioId = ${mun.id}
        ${tipo !== 'TODOS' ? prisma.$queryRaw`AND tipo = ${tipo}` : prisma.$queryRaw``}` as any[]

    const porTipo = await prisma.$queryRaw`
      SELECT tipo, COUNT(*) AS qtd FROM AssistenciaTecnicaRural
      WHERE municipioId = ${mun.id} GROUP BY tipo ORDER BY qtd DESC` as any[]

    const porMes = await prisma.$queryRaw`
      SELECT DATE_FORMAT(dataAtendimento,'%Y-%m') AS mes, COUNT(*) AS qtd
      FROM AssistenciaTecnicaRural WHERE municipioId = ${mun.id}
        AND dataAtendimento >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY mes ORDER BY mes ASC` as any[]

    return NextResponse.json({
      atendimentos: rows,
      total: Number(total),
      pagina,
      porPagina,
      porTipo,
      porMes,
    }, { headers: cors() })

  } catch (e: any) {
    console.error('[GET /api/seagri/assistencia]', e)
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
    const { propriedadeId, tipo, descricao, tecnico, beneficiario, dataAtendimento, resultado } = body

    if (!tipo || !descricao || !dataAtendimento) {
      return NextResponse.json({ erro: 'Tipo, descrição e dataAtendimento são obrigatórios' }, { status: 400 })
    }

    const id = randomUUID()
    await prisma.$queryRaw`
      INSERT INTO AssistenciaTecnicaRural
        (id, municipioId, propriedadeId, tipo, descricao, tecnico,
         beneficiario, dataAtendimento, resultado, criadoEm, atualizadoEm)
      VALUES
        (${id}, ${mun.id}, ${propriedadeId ?? null}, ${tipo}, ${descricao},
         ${tecnico ?? null}, ${beneficiario ?? null}, ${dataAtendimento},
         ${resultado ?? null}, NOW(), NOW())`

    return NextResponse.json({ id, mensagem: 'Atendimento registrado.' }, { status: 201, headers: cors() })

  } catch (e: any) {
    console.error('[POST /api/seagri/assistencia]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}
