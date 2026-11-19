import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'
import { z } from 'zod'

export const runtime = 'nodejs'

const CriarSchema = z.object({
  titulo:        z.string().min(3).max(500),
  subtitulo:     z.string().max(500).optional(),
  corpo:         z.string().min(10),
  resumo:        z.string().max(1000).optional(),
  tipo:          z.enum(['NOTICIA','NOTA_OFICIAL','COMUNICADO','DECRETO','PORTARIA','EDITAL','RESULTADO']).default('NOTICIA'),
  status:        z.enum(['RASCUNHO','REVISAO','PUBLICADA','ARQUIVADA']).default('RASCUNHO'),
  destaque:      z.boolean().default(false),
  imagemCapa:    z.string().url().optional().or(z.literal('')),
  tags:          z.string().max(500).optional(),
  secretaria:    z.string().max(255).optional(),
  dataPublicacao: z.string().datetime().optional().nullable(),
})

const AtualizarSchema = CriarSchema.partial().extend({ id: z.string() })

function gerarSlug(titulo: string): string {
  return titulo
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200) + '-' + Date.now().toString(36)
}

export async function GET(req: NextRequest) {
  try {
    const usuario = await obterUsuario(req)
    if (!usuario) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const mId     = usuario.municipioId
    const id      = searchParams.get('id')
    const tipo    = searchParams.get('tipo')
    const status  = searchParams.get('status')
    const busca   = searchParams.get('busca')
    const destaque = searchParams.get('destaque')
    const page    = parseInt(searchParams.get('page') ?? '1')
    const limit   = parseInt(searchParams.get('limit') ?? '20')
    const skip    = (page - 1) * limit

    if (id) {
      const noticia = await prisma.noticia.findFirst({
        where: { id, municipioId: mId, ativo: true }
      })
      if (!noticia) return NextResponse.json({ erro: 'Não encontrada' }, { status: 404 })
      return NextResponse.json({ noticia })
    }

    const where: any = { municipioId: mId, ativo: true }
    if (tipo) where.tipo = tipo
    if (status) where.status = status
    if (destaque === 'true') where.destaque = true
    if (busca) where.OR = [
      { titulo: { contains: busca } },
      { subtitulo: { contains: busca } },
      { tags: { contains: busca } },
    ]

    const [noticias, total] = await Promise.all([
      prisma.noticia.findMany({
        where,
        orderBy: [{ destaque: 'desc' }, { dataPublicacao: 'desc' }, { criadoEm: 'desc' }],
        skip,
        take: limit,
        select: {
          id: true, titulo: true, subtitulo: true, resumo: true, tipo: true,
          status: true, destaque: true, imagemCapa: true, tags: true,
          secretaria: true, autor: true, visualizacoes: true,
          dataPublicacao: true, criadoEm: true,
        }
      }),
      prisma.noticia.count({ where }),
    ])

    // KPIs
    const kpiMap = await prisma.noticia.groupBy({
      by: ['status'],
      where: { municipioId: mId, ativo: true },
      _count: { _all: true },
    })

    return NextResponse.json({ noticias, total, page, limit, kpiMap })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const usuario = await obterUsuario(req)
    if (!usuario) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const parse = CriarSchema.safeParse(body)
    if (!parse.success) return NextResponse.json({ erro: parse.error.flatten() }, { status: 400 })

    const d = parse.data
    const slug = gerarSlug(d.titulo)

    const noticia = await prisma.noticia.create({
      data: {
        municipioId:   usuario.municipioId,
        titulo:        d.titulo,
        slug,
        subtitulo:     d.subtitulo,
        corpo:         d.corpo,
        resumo:        d.resumo,
        tipo:          d.tipo,
        status:        d.status,
        destaque:      d.destaque,
        imagemCapa:    d.imagemCapa || null,
        tags:          d.tags,
        secretaria:    d.secretaria,
        autor:         usuario.nome || usuario.email,
        autorId:       usuario.id,
        dataPublicacao: d.status === 'PUBLICADA' ? (d.dataPublicacao ? new Date(d.dataPublicacao) : new Date()) : null,
      }
    })

    auditLog({ usuarioId: usuario.id, acao: 'CRIAR_NOTICIA', tabela: 'Noticia', registroId: noticia.id, municipioId: usuario.municipioId })
    return NextResponse.json({ noticia }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const usuario = await obterUsuario(req)
    if (!usuario) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const body = await req.json()
    const parse = AtualizarSchema.safeParse(body)
    if (!parse.success) return NextResponse.json({ erro: parse.error.flatten() }, { status: 400 })

    const { id, dataPublicacao, status, ...rest } = parse.data

    const exist = await prisma.noticia.findFirst({ where: { id, municipioId: usuario.municipioId } })
    if (!exist) return NextResponse.json({ erro: 'Não encontrada' }, { status: 404 })

    const updateData: any = { ...rest }
    if (status) {
      updateData.status = status
      if (status === 'PUBLICADA' && !exist.dataPublicacao) {
        updateData.dataPublicacao = dataPublicacao ? new Date(dataPublicacao) : new Date()
      }
    }
    if (dataPublicacao) updateData.dataPublicacao = new Date(dataPublicacao)

    const noticia = await prisma.noticia.update({ where: { id }, data: updateData })

    auditLog({ usuarioId: usuario.id, acao: 'ATUALIZAR_NOTICIA', tabela: 'Noticia', registroId: id, municipioId: usuario.municipioId })
    return NextResponse.json({ noticia })
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
    if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

    await prisma.noticia.updateMany({ where: { id, municipioId: usuario.municipioId }, data: { ativo: false } })
    auditLog({ usuarioId: usuario.id, acao: 'EXCLUIR_NOTICIA', tabela: 'Noticia', registroId: id, municipioId: usuario.municipioId })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
