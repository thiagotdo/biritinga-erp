// @ts-nocheck
/**
 * GET    /api/admin/banners  - lista banners do carrossel
 * POST   /api/admin/banners  - cria novo banner
 * PATCH  /api/admin/banners  - atualiza banner existente
 * DELETE /api/admin/banners  - remove banner (soft delete via ativo=0)
 */
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import { extrairContextoRequest, temPermissao } from '@/lib/rbac'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    const municipioId = ctx.municipioId
    if (!municipioId) return NextResponse.json({ erro: 'Sem município' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const apenasAtivos = searchParams.get('ativo') !== 'false'

    const banners = await prisma.$queryRaw`
      SELECT id, titulo, subtitulo, descricao, imageUrl, linkUrl, linkTexto, ordem, ativo, criadoEm, atualizadoEm
      FROM BannerPortal
      WHERE municipioId = ${municipioId}
        ${apenasAtivos ? prisma.$queryRaw`AND ativo = 1` : prisma.$queryRaw``}
      ORDER BY ordem ASC, criadoEm ASC
    ` as any[]

    return NextResponse.json({ banners, total: banners.length })
  } catch (error: any) {
    console.error('[GET /api/admin/banners]', error)
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    if (!temPermissao(ctx, 'admin:banner:create') && ctx.perfil !== 'SUPER_ADMIN' && ctx.perfil !== 'ADMIN_MUNICIPIO') {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }
    const municipioId = ctx.municipioId

    const body = await req.json()
    const { titulo, subtitulo, descricao, imageUrl, linkUrl, linkTexto, ordem } = body

    if (!titulo || !imageUrl) {
      return NextResponse.json({ erro: 'Título e URL da imagem são obrigatórios' }, { status: 400 })
    }

    const id = randomUUID()
    await prisma.$queryRaw`
      INSERT INTO BannerPortal (id, municipioId, titulo, subtitulo, descricao, imageUrl, linkUrl, linkTexto, ordem, ativo)
      VALUES (${id}, ${municipioId}, ${titulo}, ${subtitulo ?? null}, ${descricao ?? null},
              ${imageUrl}, ${linkUrl ?? null}, ${linkTexto ?? null}, ${ordem ?? 99}, 1)
    `

    return NextResponse.json({ id, titulo, imageUrl }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/admin/banners]', error)
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    if (!temPermissao(ctx, 'admin:banner:update') && ctx.perfil !== 'SUPER_ADMIN' && ctx.perfil !== 'ADMIN_MUNICIPIO') {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }
    const municipioId = ctx.municipioId

    const body = await req.json()
    const { id, titulo, subtitulo, descricao, imageUrl, linkUrl, linkTexto, ordem, ativo } = body
    if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

    await prisma.$queryRaw`
      UPDATE BannerPortal SET
        titulo = COALESCE(${titulo ?? null}, titulo),
        subtitulo = COALESCE(${subtitulo ?? null}, subtitulo),
        descricao = COALESCE(${descricao ?? null}, descricao),
        imageUrl = COALESCE(${imageUrl ?? null}, imageUrl),
        linkUrl = COALESCE(${linkUrl ?? null}, linkUrl),
        linkTexto = COALESCE(${linkTexto ?? null}, linkTexto),
        ordem = COALESCE(${ordem ?? null}, ordem),
        ativo = COALESCE(${ativo !== undefined ? (ativo ? 1 : 0) : null}, ativo),
        atualizadoEm = NOW()
      WHERE id = ${id} AND municipioId = ${municipioId}
    `

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[PATCH /api/admin/banners]', error)
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    if (!temPermissao(ctx, 'admin:banner:delete') && ctx.perfil !== 'SUPER_ADMIN' && ctx.perfil !== 'ADMIN_MUNICIPIO') {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }
    const municipioId = ctx.municipioId

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

    await prisma.$queryRaw`
      UPDATE BannerPortal SET ativo = 0, atualizadoEm = NOW()
      WHERE id = ${id} AND municipioId = ${municipioId}
    `

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[DELETE /api/admin/banners]', error)
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
}
