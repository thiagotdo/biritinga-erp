// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { obterUsuario } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const ctx = await obterUsuario(req)
    if (!ctx) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const tipo  = searchParams.get('tipo') ?? ''

    // Listar álbuns (sem _count include — não suportado pelo makeModel)
    if (tipo === 'albums') {
      const albums = await prisma.AlbumMidia.findMany({
        where: { municipioId: ctx.municipioId, ativo: true },
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
      prisma.Midia.findMany({
        where, skip, take: limite,
        orderBy: { criadoEm: 'desc' },
        select: { id: true, titulo: true, tipo: true, categoria: true, url: true, urlThumb: true, nomeArquivo: true, tamanhoBytes: true, autor: true, destaque: true, albumId: true, criadoEm: true },
      }),
      prisma.Midia.count({ where }),
    ])

    return NextResponse.json({ midias, total, pagina, limite })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
