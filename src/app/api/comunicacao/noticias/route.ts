// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { obterUsuario } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

function gerarSlug(texto: string): string {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-').slice(0, 200)
}

// GET — listar notícias com paginação e filtros
export async function GET(req: NextRequest) {
  try {
    const ctx = await obterUsuario(req)
    if (!ctx) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const pagina  = Math.max(1, Number(searchParams.get('pagina') ?? 1))
    const limite  = Math.min(50, Number(searchParams.get('limite') ?? 15))
    const busca   = searchParams.get('busca') ?? ''
    const status  = searchParams.get('status') ?? ''
    const tipo    = searchParams.get('tipo') ?? ''
    const skip    = (pagina - 1) * limite

    const where: any = { municipioId: ctx.municipioId }
    if (busca)  where.OR = [{ titulo: { contains: busca } }, { autor: { contains: busca } }]
    if (status) where.status = status
    if (tipo)   where.tipo   = tipo

    const [noticias, total] = await Promise.all([
      prisma.noticia.findMany({
        where, skip, take: limite,
        orderBy: [{ dataPublicacao: 'desc' }, { criadoEm: 'desc' }],
        select: {
          id: true, titulo: true, slug: true, tipo: true, status: true,
          autor: true, secretaria: true, destaque: true,
          visualizacoes: true, dataPublicacao: true, criadoEm: true,
        },
      }),
      prisma.noticia.count({ where }),
    ])

    return NextResponse.json({ noticias, total, pagina, limite })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

// POST — criar notícia
export async function POST(req: NextRequest) {
  try {
    const ctx = await obterUsuario(req)
    if (!ctx) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const data = await req.json()
    if (!data.titulo?.trim()) return NextResponse.json({ erro: 'Título obrigatório' }, { status: 400 })
    if (!data.corpo?.trim())  return NextResponse.json({ erro: 'Conteúdo obrigatório' }, { status: 400 })

    // Gerar slug único
    let slug = gerarSlug(data.titulo)
    const existe = await prisma.noticia.findFirst({ where: { slug, municipioId: ctx.municipioId } })
    if (existe) slug = `${slug}-${Date.now().toString(36)}`

    const noticia = await prisma.noticia.create({
      data: {
        municipioId:    ctx.municipioId,
        titulo:         data.titulo.trim(),
        slug,
        subtitulo:      data.subtitulo?.trim() ?? null,
        corpo:          data.corpo.trim(),
        resumo:         data.resumo?.trim() ?? null,
        tipo:           data.tipo ?? 'NOTICIA',
        status:         data.status ?? 'RASCUNHO',
        destaque:       data.destaque ?? false,
        imagemCapa:     data.imagemCapa ?? null,
        tags:           data.tags?.trim() ?? null,
        secretaria:     data.secretaria?.trim() ?? null,
        autor:          data.autor?.trim() || ctx.nome,
        autorId:        ctx.usuarioId,
        dataPublicacao: data.status === 'PUBLICADA' ? new Date() : null,
      },
    })

    return NextResponse.json({ noticia }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

// PUT — atualizar notícia
export async function PUT(req: NextRequest) {
  try {
    const ctx = await obterUsuario(req)
    if (!ctx) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const data = await req.json()
    if (!data.id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

    const atual = await prisma.noticia.findFirst({ where: { id: data.id, municipioId: ctx.municipioId } })
    if (!atual) return NextResponse.json({ erro: 'Notícia não encontrada' }, { status: 404 })

    const update: any = { atualizadoEm: new Date() }
    if (data.titulo    !== undefined) update.titulo    = data.titulo.trim()
    if (data.subtitulo !== undefined) update.subtitulo = data.subtitulo?.trim() ?? null
    if (data.corpo     !== undefined) update.corpo     = data.corpo.trim()
    if (data.resumo    !== undefined) update.resumo    = data.resumo?.trim() ?? null
    if (data.tipo      !== undefined) update.tipo      = data.tipo
    if (data.destaque  !== undefined) update.destaque  = data.destaque
    if (data.imagemCapa !== undefined) update.imagemCapa = data.imagemCapa
    if (data.tags      !== undefined) update.tags      = data.tags?.trim() ?? null
    if (data.secretaria !== undefined) update.secretaria = data.secretaria?.trim() ?? null
    if (data.autor     !== undefined) update.autor     = data.autor.trim()
    if (data.status !== undefined) {
      update.status = data.status
      if (data.status === 'PUBLICADA' && !atual.dataPublicacao) update.dataPublicacao = new Date()
    }

    const noticia = await prisma.noticia.update({ where: { id: data.id }, data: update })
    return NextResponse.json({ noticia })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

// DELETE — excluir notícia
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await obterUsuario(req)
    if (!ctx) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

    const noticia = await prisma.noticia.findFirst({ where: { id, municipioId: ctx.municipioId } })
    if (!noticia) return NextResponse.json({ erro: 'Notícia não encontrada' }, { status: 404 })

    await prisma.noticia.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
