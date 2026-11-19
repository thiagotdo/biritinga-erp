import { NextRequest, NextResponse } from 'next/server'
import { obterUsuario } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const ctx = await obterUsuario(req)
    if (!ctx) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const tipo  = searchParams.get('tipo') ?? ''

    // Listar álbuns
    if (tipo === 'albums') {
      const albums = await prisma.albumMidia.findMany({
        where: { municipioId: ctx.municipioId, ativo: true },
        include: { _count: { select: { midias: true } } },
        orderBy: { criadoEm: 'desc' },
      })
      return NextResponse.json({ albums })
    }

    // Listar mídias
    const pagina  = Math.max(1, Number(searchParams.get('pagina') ?? 1))
    const limite  = Math.min(60, Number(searchParams.get('limite') ?? 20))
    const categoria = searchParams.get('categoria') ?? ''
    const albumId   = searchParams.get('albumId') ?? ''
    const skip    = (pagina - 1) * limite

    const where: any = { municipioId: ctx.municipioId, ativo: true }
    if (tipo)      where.tipo      = tipo
    if (categoria) where.categoria = categoria
    if (albumId)   where.albumId   = albumId

    const [midias, total] = await Promise.all([
      prisma.midia.findMany({
        where, skip, take: limite,
        orderBy: { criadoEm: 'desc' },
        select: { id: true, titulo: true, tipo: true, categoria: true, url: true, urlThumb: true, nomeArquivo: true, tamanhoBytes: true, autor: true, destaque: true, albumId: true, criadoEm: true },
      }),
      prisma.midia.count({ where }),
    ])

    return NextResponse.json({ midias, total, pagina, limite })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await obterUsuario(req)
    if (!ctx) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const data = await req.json()

    // Criar álbum
    if (data.recurso === 'album') {
      if (!data.nome?.trim()) return NextResponse.json({ erro: 'Nome obrigatório' }, { status: 400 })
      const album = await prisma.albumMidia.create({
        data: {
          municipioId: ctx.municipioId,
          nome:        data.nome.trim(),
          descricao:   data.descricao?.trim() ?? null,
          categoria:   data.categoria ?? 'OUTRO',
        },
      })
      return NextResponse.json({ album }, { status: 201 })
    }

    // Criar mídia
    if (!data.titulo?.trim())      return NextResponse.json({ erro: 'Título obrigatório' }, { status: 400 })
    if (!data.url?.trim())         return NextResponse.json({ erro: 'URL obrigatória' }, { status: 400 })
    if (!data.nomeArquivo?.trim()) return NextResponse.json({ erro: 'Nome do arquivo obrigatório' }, { status: 400 })

    const midia = await prisma.midia.create({
      data: {
        municipioId:  ctx.municipioId,
        titulo:       data.titulo.trim(),
        descricao:    data.descricao?.trim() ?? null,
        tipo:         data.tipo ?? 'FOTO',
        categoria:    data.categoria ?? 'OUTRO',
        url:          data.url.trim(),
        urlThumb:     data.urlThumb?.trim() ?? null,
        nomeArquivo:  data.nomeArquivo.trim(),
        tamanhoBytes: data.tamanhoBytes ? Number(data.tamanhoBytes) : null,
        mimeType:     data.mimeType ?? null,
        albumId:      data.albumId ?? null,
        tags:         data.tags?.trim() ?? null,
        autor:        data.autor?.trim() ?? null,
        dataCaptura:  data.dataCaptura ? new Date(data.dataCaptura) : null,
        destaque:     data.destaque ?? false,
      },
    })

    return NextResponse.json({ midia }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await obterUsuario(req)
    if (!ctx) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const data = await req.json()
    if (!data.id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

    if (data.recurso === 'album') {
      const album = await prisma.albumMidia.findFirst({ where: { id: data.id, municipioId: ctx.municipioId } })
      if (!album) return NextResponse.json({ erro: 'Álbum não encontrado' }, { status: 404 })
      const updated = await prisma.albumMidia.update({ where: { id: data.id }, data: { nome: data.nome, descricao: data.descricao, categoria: data.categoria } })
      return NextResponse.json({ album: updated })
    }

    const midia = await prisma.midia.findFirst({ where: { id: data.id, municipioId: ctx.municipioId } })
    if (!midia) return NextResponse.json({ erro: 'Mídia não encontrada' }, { status: 404 })

    const update: any = { atualizadoEm: new Date() }
    const campos = ['titulo','descricao','tipo','categoria','url','urlThumb','nomeArquivo','tags','autor','destaque','albumId']
    campos.forEach(c => { if (data[c] !== undefined) update[c] = data[c] })

    const updated = await prisma.midia.update({ where: { id: data.id }, data: update })
    return NextResponse.json({ midia: updated })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await obterUsuario(req)
    if (!ctx) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id      = searchParams.get('id')
    const recurso = searchParams.get('recurso') ?? 'midia'
    if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

    if (recurso === 'album') {
      await prisma.albumMidia.update({ where: { id }, data: { ativo: false } })
    } else {
      await prisma.midia.update({ where: { id }, data: { ativo: false } })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
