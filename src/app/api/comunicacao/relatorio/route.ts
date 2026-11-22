// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const usuario = await obterUsuario(req)
    if (!usuario) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const tipo = searchParams.get('tipo') ?? 'DASHBOARD'
    const mId  = usuario.municipioId

    if (tipo === 'DASHBOARD') {
      const hoje = new Date()
      const em7  = new Date(hoje.getTime() + 7 * 86400000)
      const em30 = new Date(hoje.getTime() + 30 * 86400000)

      const [
        noticiasPorStatus,
        noticiasPorTipo,
        eventosPorStatus,
        midiasPorTipo,
        proximosEventos,
        ultimasNoticias,
        totalVisualizacoes,
      ] = await Promise.all([
        prisma.noticia.groupBy({
          by: ['status'],
          where: { municipioId: mId, ativo: true },
          _count: { _all: true },
        }),
        prisma.noticia.groupBy({
          by: ['tipo'],
          where: { municipioId: mId, ativo: true, status: 'PUBLICADA' },
          _count: { _all: true },
        }),
        prisma.eventoAgenda.groupBy({
          by: ['status'],
          where: { municipioId: mId, ativo: true },
          _count: { _all: true },
        }),
        prisma.midia.groupBy({
          by: ['tipo'],
          where: { municipioId: mId, ativo: true },
          _count: { _all: true },
        }),
        prisma.eventoAgenda.findMany({
          where: { municipioId: mId, ativo: true, status: 'PROGRAMADO', dataInicio: { gte: hoje, lte: em30 } },
          orderBy: { dataInicio: 'asc' },
          take: 5,
          select: { id: true, titulo: true, tipo: true, local: true, dataInicio: true, horaInicio: true, destaque: true }
        }),
        prisma.noticia.findMany({
          where: { municipioId: mId, ativo: true, status: 'PUBLICADA' },
          orderBy: { dataPublicacao: 'desc' },
          take: 5,
          select: { id: true, titulo: true, tipo: true, visualizacoes: true, dataPublicacao: true, imagemCapa: true }
        }),
        prisma.noticia.aggregate({
          where: { municipioId: mId, ativo: true },
          _sum: { visualizacoes: true },
        }),
      ])

      // Publicações últimos 12 meses
      const publicacoesMes: { mes: string; noticias: number; eventos: number }[] = []
      for (let i = 11; i >= 0; i--) {
        const d   = new Date()
        d.setMonth(d.getMonth() - i)
        const ini = new Date(d.getFullYear(), d.getMonth(), 1)
        const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0)
        const [n, e] = await Promise.all([
          prisma.noticia.count({ where: { municipioId: mId, dataPublicacao: { gte: ini, lte: fim } } }),
          prisma.eventoAgenda.count({ where: { municipioId: mId, dataInicio: { gte: ini, lte: fim } } }),
        ])
        publicacoesMes.push({ mes: ini.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), noticias: n, eventos: e })
      }

      return NextResponse.json({
        noticiasPorStatus, noticiasPorTipo, eventosPorStatus, midiasPorTipo,
        proximosEventos, ultimasNoticias,
        totalVisualizacoes: totalVisualizacoes._sum.visualizacoes ?? 0,
        publicacoesMes,
        emSemana: proximosEventos.filter(e => new Date(e.dataInicio) <= em7).length,
      })
    }

    if (tipo === 'NOTICIAS_MES') {
      const historico = []
      for (let i = 11; i >= 0; i--) {
        const d   = new Date()
        d.setMonth(d.getMonth() - i)
        const ini = new Date(d.getFullYear(), d.getMonth(), 1)
        const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0)
        const por_tipo = await prisma.noticia.groupBy({
          by: ['tipo'],
          where: { municipioId: mId, dataPublicacao: { gte: ini, lte: fim } },
          _count: { _all: true },
        })
        historico.push({ mes: ini.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), por_tipo })
      }
      return NextResponse.json({ historico })
    }

    if (tipo === 'MAIS_LIDAS') {
      const noticias = await prisma.noticia.findMany({
        where: { municipioId: mId, ativo: true, status: 'PUBLICADA' },
        orderBy: { visualizacoes: 'desc' },
        take: 20,
        select: { id: true, titulo: true, tipo: true, visualizacoes: true, dataPublicacao: true, secretaria: true }
      })
      return NextResponse.json({ noticias })
    }

    return NextResponse.json({ erro: 'Tipo inválido' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
