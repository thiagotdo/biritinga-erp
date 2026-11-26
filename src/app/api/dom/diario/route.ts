// @ts-nocheck
/**
 * GET  /api/dom/diario  — lista edições do DOM (público + admin)
 * POST /api/dom/diario  — cria nova edição (autenticado)
 * PATCH /api/dom/diario — atualiza/publica edição (autenticado)
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
    const ano       = searchParams.get('ano')    ? Number(searchParams.get('ano'))  : new Date().getFullYear()
    const status    = searchParams.get('status') ?? 'PUBLICADO'
    const busca     = searchParams.get('busca')  ?? ''
    const pagina    = Number(searchParams.get('pagina')    ?? 1)
    const porPagina = Number(searchParams.get('porPagina') ?? 20)
    const offset    = (pagina - 1) * porPagina
    const id        = searchParams.get('id')

    // Buscar uma edição específica com atos
    if (id) {
      const [edicoes] = await prisma.$queryRaw`
        SELECT id, numero, ano, data, edicao, titulo, sumario, conteudo, status,
               publicadoPor, publicadoEm, secretaria, categorias, pdfUrl
        FROM DiarioOficial
        WHERE id = ${id} AND municipioId = ${mun.id}
        LIMIT 1` as any[][]

      const edicao = Array.isArray(edicoes) ? edicoes[0] : null
      if (!edicao) return NextResponse.json({ erro: 'Edição não encontrada' }, { status: 404 })

      const atos = await prisma.$queryRaw`
        SELECT id, tipo, numero, ementa, conteudo, assinante, cargo, dataAto, secretaria, ordem
        FROM AtoOficial
        WHERE diarioId = ${id}
        ORDER BY ordem, tipo, numero` as any[]

      return NextResponse.json({ edicao, atos }, { headers: cors() })
    }

    // Listagem
    const buscaLike = busca ? `%${busca}%` : null
    const rows = await prisma.$queryRaw`
      SELECT id, numero, ano, data, edicao, titulo, sumario, status, secretaria, categorias, publicadoEm, pdfUrl
      FROM DiarioOficial
      WHERE municipioId = ${mun.id}
        AND ano = ${ano}
        ${status !== 'TODOS' ? prisma.$queryRaw`AND status = ${status}` : prisma.$queryRaw``}
        ${buscaLike ? prisma.$queryRaw`AND (titulo LIKE ${buscaLike} OR sumario LIKE ${buscaLike} OR categorias LIKE ${buscaLike})` : prisma.$queryRaw``}
      ORDER BY numero DESC
      LIMIT ${porPagina} OFFSET ${offset}` as any[]

    const [{ total }] = await prisma.$queryRaw`
      SELECT COUNT(*) AS total FROM DiarioOficial
      WHERE municipioId = ${mun.id} AND ano = ${ano}
        ${status !== 'TODOS' ? prisma.$queryRaw`AND status = ${status}` : prisma.$queryRaw``}` as any[]

    // Anos disponíveis
    const anos = await prisma.$queryRaw`
      SELECT DISTINCT ano FROM DiarioOficial
      WHERE municipioId = ${mun.id}
      ORDER BY ano DESC` as any[]

    return NextResponse.json({
      edicoes: rows,
      total: Number(total),
      pagina,
      porPagina,
      totalPaginas: Math.ceil(Number(total) / porPagina),
      anos: anos.map((a: any) => a.ano),
    }, { headers: cors() })

  } catch (e: any) {
    console.error('[GET /api/dom/diario]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    if (!ctx.municipioId) return NextResponse.json({ erro: 'Sem autenticação' }, { status: 401 })

    const body = await req.json()
    const { numero, ano, data, edicao, titulo, sumario, conteudo, secretaria, categorias, atos } = body

    if (!numero || !data || !titulo || !conteudo) {
      return NextResponse.json({ erro: 'número, data, título e conteúdo são obrigatórios' }, { status: 400 })
    }

    const anoFinal = ano ?? new Date(data).getFullYear()
    const id = randomUUID()

    await prisma.$queryRaw`
      INSERT INTO DiarioOficial
        (id, municipioId, numero, ano, data, edicao, titulo, sumario, conteudo, status, secretaria, categorias)
      VALUES
        (${id}, ${ctx.municipioId}, ${Number(numero)}, ${anoFinal}, ${data},
         ${edicao ?? 'ORDINARIA'}, ${titulo}, ${sumario ?? null}, ${conteudo},
         'RASCUNHO', ${secretaria ?? null}, ${categorias ?? null})`

    // Inserir atos se fornecidos
    if (Array.isArray(atos) && atos.length > 0) {
      for (let i = 0; i < atos.length; i++) {
        const ato = atos[i]
        const atoId = randomUUID()
        await prisma.$queryRaw`
          INSERT INTO AtoOficial
            (id, municipioId, diarioId, tipo, numero, ementa, conteudo, assinante, cargo, dataAto, secretaria, ordem)
          VALUES
            (${atoId}, ${ctx.municipioId}, ${id}, ${ato.tipo}, ${ato.numero},
             ${ato.ementa}, ${ato.conteudo ?? ''}, ${ato.assinante ?? null},
             ${ato.cargo ?? null}, ${ato.dataAto ?? null}, ${ato.secretaria ?? null}, ${i})`
      }
    }

    return NextResponse.json({ id, numero, titulo }, { status: 201, headers: cors() })
  } catch (e: any) {
    console.error('[POST /api/dom/diario]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    if (!ctx.municipioId) return NextResponse.json({ erro: 'Sem autenticação' }, { status: 401 })

    const body = await req.json()
    const { id, titulo, sumario, conteudo, status, secretaria, categorias, pdfUrl, publicar } = body
    if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

    const agora = new Date().toISOString().slice(0, 19).replace('T', ' ')

    if (publicar) {
      await prisma.$queryRaw`
        UPDATE DiarioOficial SET
          status = 'PUBLICADO',
          publicadoPor = ${ctx.usuarioId ?? 'sistema'},
          publicadoEm = ${agora},
          atualizadoEm = NOW()
        WHERE id = ${id} AND municipioId = ${ctx.municipioId}`
    } else {
      await prisma.$queryRaw`
        UPDATE DiarioOficial SET
          titulo = COALESCE(${titulo ?? null}, titulo),
          sumario = COALESCE(${sumario ?? null}, sumario),
          conteudo = COALESCE(${conteudo ?? null}, conteudo),
          status = COALESCE(${status ?? null}, status),
          secretaria = COALESCE(${secretaria ?? null}, secretaria),
          categorias = COALESCE(${categorias ?? null}, categorias),
          pdfUrl = COALESCE(${pdfUrl ?? null}, pdfUrl),
          atualizadoEm = NOW()
        WHERE id = ${id} AND municipioId = ${ctx.municipioId}`
    }

    return NextResponse.json({ ok: true }, { headers: cors() })
  } catch (e: any) {
    console.error('[PATCH /api/dom/diario]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}
