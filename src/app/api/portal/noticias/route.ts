/**
 * GET /api/portal/noticias?limit=6&destaque=true
 * Retorna notícias publicadas para o portal público.
 * Sem autenticação — somente notícias com status PUBLICADA.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const limit    = Math.min(parseInt(searchParams.get('limit') ?? '6'), 20)
    const destaque = searchParams.get('destaque') === 'true'
    const page     = Math.max(parseInt(searchParams.get('page') ?? '1'), 1)
    const skip     = (page - 1) * limit

    const mun = await prisma.Municipio.findFirst({ where: { ativo: true }, select: { id: true } })
    if (!mun) return NextResponse.json({ noticias: [], total: 0 }, { headers: corsHeaders() })

    const where = {
      municipioId: mun.id,
      status: 'PUBLICADA' as const,
      ativo: true,
      ...(destaque ? { destaque: true } : {}),
    }

    const [noticias, total] = await Promise.all([
      prisma.Noticia.findMany({
        where,
        orderBy: [{ destaque: 'desc' }, { dataPublicacao: 'desc' }],
        take: limit,
        skip,
        select: {
          id: true,
          titulo: true,
          slug: true,
          subtitulo: true,
          resumo: true,
          imagemCapa: true,
          tipo: true,
          destaque: true,
          secretaria: true,
          autor: true,
          dataPublicacao: true,
          visualizacoes: true,
          tags: true,
        },
      }),
      prisma.Noticia.count({ where }),
    ])

    return NextResponse.json({
      noticias: noticias.map(n => ({
        ...n,
        tags: n.tags ? n.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        dataPublicacao: n.dataPublicacao?.toISOString() ?? null,
      })),
      total,
      pagina: page,
      totalPaginas: Math.ceil(total / limit),
    }, { headers: corsHeaders() })

  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500, headers: corsHeaders() })
  }
}
