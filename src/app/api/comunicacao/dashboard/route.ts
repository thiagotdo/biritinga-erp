// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { obterUsuario } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const ctx = await obterUsuario(req)
    if (!ctx) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const mid = ctx.municipioId
    const agora = new Date()

    const [
      totalNoticias, publicadas, rascunhos, emRevisao,
      totalEventos, eventosProximos,
      totalMidias, totalAlbums,
      ultimasNoticias, proximosEventos,
    ] = await Promise.all([
      prisma.Noticia.count({ where: { municipioId: mid } }),
      prisma.Noticia.count({ where: { municipioId: mid, status: 'PUBLICADA' } }),
      prisma.Noticia.count({ where: { municipioId: mid, status: 'RASCUNHO' } }),
      prisma.Noticia.count({ where: { municipioId: mid, status: 'REVISAO' } }),

      prisma.EventoAgenda.count({ where: { municipioId: mid, ativo: true } }),
      prisma.EventoAgenda.count({ where: { municipioId: mid, ativo: true, status: 'PROGRAMADO', dataInicio: { gte: agora } } }),

      prisma.Midia.count({ where: { municipioId: mid, ativo: true } }),
      prisma.AlbumMidia.count({ where: { municipioId: mid, ativo: true } }),

      prisma.Noticia.findMany({
        where: { municipioId: mid },
        orderBy: { criadoEm: 'desc' },
        take: 5,
        select: { id: true, titulo: true, status: true, criadoEm: true },
      }),

      prisma.EventoAgenda.findMany({
        where: { municipioId: mid, ativo: true, status: 'PROGRAMADO', dataInicio: { gte: agora } },
        orderBy: { dataInicio: 'asc' },
        take: 5,
        select: { id: true, titulo: true, tipo: true, dataInicio: true, local: true },
      }),
    ])

    return NextResponse.json({
      totalNoticias, publicadas, rascunhos, emRevisao,
      totalEventos, eventosProximos,
      totalMidias, totalAlbums,
      ultimasNoticias, proximosEventos,
    })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
