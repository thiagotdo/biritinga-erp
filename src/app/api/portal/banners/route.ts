/**
 * GET /api/portal/banners
 * Retorna banners ativos do carrossel do portal público.
 * Sem autenticação — dados públicos.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

export async function GET(req: NextRequest) {
  try {
    const mun = await prisma.Municipio.findFirst({ where: { ativo: true } })
    if (!mun) {
      return NextResponse.json({ ok: false, error: 'Município não encontrado' }, { status: 404 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erp.biritinga.ba.gov.br'

    const rows = await prisma.$queryRaw`
      SELECT id, titulo, subtitulo, descricao, imageUrl, linkUrl, linkTexto, ordem
      FROM BannerPortal
      WHERE municipioId = ${mun.id} AND ativo = 1
      ORDER BY ordem ASC, criadoEm ASC
    ` as any[]

    const banners = rows.map((b: any) => ({
      id: b.id,
      titulo: b.titulo,
      subtitulo: b.subtitulo ?? null,
      descricao: b.descricao ?? null,
      // Se for caminho relativo, prependar a URL do ERP
      imageUrl: b.imageUrl?.startsWith('/') ? `${appUrl}${b.imageUrl}` : b.imageUrl,
      linkUrl: b.linkUrl ?? null,
      linkTexto: b.linkTexto ?? 'Saiba mais',
      ordem: b.ordem,
    }))

    return NextResponse.json({ ok: true, banners }, { headers: corsHeaders() })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500, headers: corsHeaders() }
    )
  }
}
