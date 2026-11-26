// @ts-nocheck
/**
 * GET   /api/seagri/propriedade  — lista propriedades rurais
 * POST  /api/seagri/propriedade  — cadastra nova propriedade
 * PATCH /api/seagri/propriedade  — atualiza dados
 *
 * Tabela: PropriedadeRural
 * Schema real: id, municipioId, produtorId, nome, tipo, areaTotal, areaAgricultavel,
 *              areaPreservacao, nirf, car, logradouro, comunidade, coordLat, coordLng,
 *              atividades, principaisCulturas, sistemaIrrigacao, aguaDisponivel,
 *              observacoes, ativo, createdAt, updatedAt
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
    const tipo     = searchParams.get('tipo')  ?? 'TODOS'
    const busca    = searchParams.get('busca') ?? ''
    const pagina   = Number(searchParams.get('pagina')    ?? 1)
    const porPagina = Number(searchParams.get('porPagina') ?? 20)
    const offset   = (pagina - 1) * porPagina

    if (id) {
      const rows = await prisma.$queryRaw`
        SELECT * FROM PropriedadeRural
        WHERE id = ${id} AND municipioId = ${mun.id} AND ativo = 1 LIMIT 1` as any[]
      if (!rows.length) return NextResponse.json({ erro: 'Propriedade não encontrada' }, { status: 404 })
      return NextResponse.json({ propriedade: rows[0] }, { headers: cors() })
    }

    const buscaLike = busca ? `%${busca}%` : null

    const rows = await prisma.$queryRaw`
      SELECT id, nome, tipo, areaTotal, areaAgricultavel, areaPreservacao,
             comunidade, nirf, car, principaisCulturas, sistemaIrrigacao,
             aguaDisponivel, coordLat, coordLng, createdAt
      FROM PropriedadeRural
      WHERE municipioId = ${mun.id} AND ativo = 1
        ${tipo !== 'TODOS' ? prisma.$queryRaw`AND tipo = ${tipo}` : prisma.$queryRaw``}
        ${buscaLike ? prisma.$queryRaw`AND (nome LIKE ${buscaLike} OR comunidade LIKE ${buscaLike} OR principaisCulturas LIKE ${buscaLike})` : prisma.$queryRaw``}
      ORDER BY nome ASC
      LIMIT ${porPagina} OFFSET ${offset}` as any[]

    const [{ total }] = await prisma.$queryRaw`
      SELECT COUNT(*) AS total FROM PropriedadeRural
      WHERE municipioId = ${mun.id} AND ativo = 1
        ${tipo !== 'TODOS' ? prisma.$queryRaw`AND tipo = ${tipo}` : prisma.$queryRaw``}` as any[]

    const porTipo = await prisma.$queryRaw`
      SELECT tipo, COUNT(*) AS qtd, SUM(areaTotal) AS totalHa
      FROM PropriedadeRural WHERE municipioId = ${mun.id} AND ativo = 1
      GROUP BY tipo ORDER BY qtd DESC` as any[]

    const [areas] = await prisma.$queryRaw`
      SELECT SUM(areaTotal) AS totalArea, SUM(areaAgricultavel) AS totalAgricultavel,
             SUM(areaPreservacao) AS totalPreservacao
      FROM PropriedadeRural WHERE municipioId = ${mun.id} AND ativo = 1` as any[]

    return NextResponse.json({
      propriedades: rows,
      total: Number(total),
      pagina,
      porPagina,
      porTipo,
      areas,
    }, { headers: cors() })

  } catch (e: any) {
    console.error('[GET /api/seagri/propriedade]', e)
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
    const { nome, tipo, areaTotal, areaAgricultavel, areaPreservacao,
            nirf, car, logradouro, comunidade, coordLat, coordLng,
            atividades, principaisCulturas, sistemaIrrigacao, aguaDisponivel, observacoes } = body

    if (!nome || !tipo || !areaTotal) {
      return NextResponse.json({ erro: 'Nome, tipo e areaTotal são obrigatórios' }, { status: 400 })
    }

    const id = randomUUID()
    await prisma.$queryRaw`
      INSERT INTO PropriedadeRural
        (id, municipioId, nome, tipo, areaTotal, areaAgricultavel, areaPreservacao,
         nirf, car, logradouro, comunidade, coordLat, coordLng,
         atividades, principaisCulturas, sistemaIrrigacao, aguaDisponivel,
         observacoes, ativo, createdAt, updatedAt)
      VALUES
        (${id}, ${mun.id}, ${nome}, ${tipo}, ${areaTotal},
         ${areaAgricultavel ?? null}, ${areaPreservacao ?? null},
         ${nirf ?? null}, ${car ?? null}, ${logradouro ?? null}, ${comunidade ?? null},
         ${coordLat ?? null}, ${coordLng ?? null},
         ${atividades ?? null}, ${principaisCulturas ?? null},
         ${sistemaIrrigacao ?? null}, ${aguaDisponivel ?? 0},
         ${observacoes ?? null}, 1, NOW(), NOW())`

    return NextResponse.json({ id, mensagem: 'Propriedade cadastrada com sucesso.' }, { status: 201, headers: cors() })

  } catch (e: any) {
    console.error('[POST /api/seagri/propriedade]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    if (!ctx.municipioId) return NextResponse.json({ erro: 'Sem autenticação' }, { status: 401 })

    const mun = await prisma.Municipio.findFirst({ where: { ativo: true } })
    const body = await req.json()
    const { id, principaisCulturas, sistemaIrrigacao, aguaDisponivel, observacoes, ativo } = body
    if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

    await prisma.$queryRaw`
      UPDATE PropriedadeRural SET
        principaisCulturas = COALESCE(${principaisCulturas ?? null}, principaisCulturas),
        sistemaIrrigacao   = COALESCE(${sistemaIrrigacao ?? null}, sistemaIrrigacao),
        aguaDisponivel     = COALESCE(${aguaDisponivel ?? null}, aguaDisponivel),
        observacoes        = COALESCE(${observacoes ?? null}, observacoes),
        ativo              = COALESCE(${ativo ?? null}, ativo),
        updatedAt          = NOW()
      WHERE id = ${id} AND municipioId = ${mun?.id ?? ctx.municipioId}`

    return NextResponse.json({ ok: true }, { headers: cors() })

  } catch (e: any) {
    console.error('[PATCH /api/seagri/propriedade]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}
