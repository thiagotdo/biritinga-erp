import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'
import { z } from 'zod'

export const runtime = 'nodejs'

const MidiaSchema = z.object({
  titulo:       z.string().min(2).max(500),
  descricao:    z.string().optional(),
  tipo:         z.enum(['FOTO','VIDEO','DOCUMENTO','AUDIO']).default('FOTO'),
  categoria:    z.enum(['INFRAESTRUTURA','SAUDE','EDUCACAO','CULTURA','ESPORTE','EVENTO','INSTITUCIONAL','OUTRO']).default('OUTRO'),
  url:          z.string().min(1).max(1000),
  urlThumb:     z.string().max(1000).optional().nullable(),
  nomeArquivo:  z.string().max(500),
  tamanhoBytes: z.number().int().optional().nullable(),
  mimeType:     z.string().max(100).optional(),
  largura:      z.number().int().optional().nullable(),
  altura:       z.number().int().optional().nullable(),
  duracao:      z.number().int().optional().nullable(),
  albumId:      z.string().optional().nullable(),
  tags:         z.string().max(500).optional(),
  autor:        z.string().max(255).optional(),
  dataCaptura:  z.string().datetime().optional().nullable(),
  destaque:     z.boolean().default(false),
})

const AlbumSchema = z.object({
  nome:      z.string().min(2).max(255),
  descricao: z.string().optional(),
  categoria: z.enum(['INFRAESTRUTURA','SAUDE','EDUCACAO','CULTURA','ESPORTE','EVENTO','INSTITUCIONAL','OUTRO']).default('OUTRO'),
})

export async function GET(req: NextRequest) {
  try {
    const usuario = await obterUsuario(req)
    if (!usuario) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const mId       = usuario.municipioId
    const id        = searchParams.get('id')
    const albumId   = searchParams.get('albumId')
    const tipo      = searchParams.get('tipo')
    const categoria = searchParams.get('categoria')
    const busca     = searchParams.get('busca')
    const listarAlbuns = searchParams.get('albuns') === 'true'
    const page  = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '24')
    const skip  = (page - 1) * limit

    if (listarAlbuns) {
      const albuns = await prisma.albumMidia.findMany({
        where: { municipioId: mId, ativo: true },
        include: { _count: { select: { midias: true } } },
        orderBy: { criadoEm: 'desc' },
      })
      return NextResponse.json({ albuns })
    }

    if (id) {
      const midia = await prisma.midia.findFirst({ where: { id, municipioId: mId, ativo: true }, include: { album: true } })
      if (!midia) return NextResponse.json({ erro: 'Não encontrada' }, { status: 404 })
      return NextResponse.json({ midia })
    }

    const where: any = { municipioId: mId, ativo: true }
    if (albumId) where.albumId = albumId
    if (tipo) where.tipo = tipo
    if (categoria) where.categoria = categoria
    if (busca) where.OR = [{ titulo: { contains: busca } }, { tags: { contains: busca } }]

    const [midias, total] = await Promise.all([
      prisma.midia.findMany({
        where, orderBy: [{ destaque: 'desc' }, { criadoEm: 'desc' }],
        skip, take: limit,
        include: { album: { select: { id: true, nome: true } } }
      }),
      prisma.midia.count({ where }),
    ])

    const kpiMap = await prisma.midia.groupBy({
      by: ['tipo'],
      where: { municipioId: mId, ativo: true },
      _count: { _all: true },
    })

    return NextResponse.json({ midias, total, page, limit, kpiMap })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const usuario = await obterUsuario(req)
    if (!usuario) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const acao = body.acao

    if (acao === 'CRIAR_ALBUM') {
      const parse = AlbumSchema.safeParse(body)
      if (!parse.success) return NextResponse.json({ erro: parse.error.flatten() }, { status: 400 })
      const album = await prisma.albumMidia.create({
        data: { municipioId: usuario.municipioId, ...parse.data }
      })
      return NextResponse.json({ album }, { status: 201 })
    }

    // Criar mídia (pode ser array para upload em lote)
    const itens = Array.isArray(body.midias) ? body.midias : [body]
    const resultados = []
    for (const item of itens) {
      const parse = MidiaSchema.safeParse(item)
      if (!parse.success) { resultados.push({ erro: parse.error.flatten() }); continue }
      const d = parse.data
      const midia = await prisma.midia.create({
        data: {
          municipioId:  usuario.municipioId,
          titulo:       d.titulo,
          descricao:    d.descricao,
          tipo:         d.tipo,
          categoria:    d.categoria,
          url:          d.url,
          urlThumb:     d.urlThumb,
          nomeArquivo:  d.nomeArquivo,
          tamanhoBytes: d.tamanhoBytes,
          mimeType:     d.mimeType,
          largura:      d.largura,
          altura:       d.altura,
          duracao:      d.duracao,
          albumId:      d.albumId,
          tags:         d.tags,
          autor:        d.autor,
          dataCaptura:  d.dataCaptura ? new Date(d.dataCaptura) : null,
          destaque:     d.destaque,
        }
      })
      resultados.push({ midia })
    }
    auditLog({ usuarioId: usuario.id, acao: 'UPLOAD_MIDIA', tabela: 'Midia', registroId: 'batch', municipioId: usuario.municipioId })
    return NextResponse.json({ resultados }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const usuario = await obterUsuario(req)
    if (!usuario) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const { id, ...rest } = body
    if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

    const exist = await prisma.midia.findFirst({ where: { id, municipioId: usuario.municipioId } })
    if (!exist) return NextResponse.json({ erro: 'Não encontrada' }, { status: 404 })

    const midia = await prisma.midia.update({ where: { id }, data: rest })
    return NextResponse.json({ midia })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const usuario = await obterUsuario(req)
    if (!usuario) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const albumId = searchParams.get('albumId')

    if (albumId) {
      await prisma.albumMidia.updateMany({ where: { id: albumId, municipioId: usuario.municipioId }, data: { ativo: false } })
      return NextResponse.json({ ok: true })
    }
    if (id) {
      await prisma.midia.updateMany({ where: { id, municipioId: usuario.municipioId }, data: { ativo: false } })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
