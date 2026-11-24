// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { prisma, getConn } from '@/lib/db'
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
      const em30 = new Date(hoje.getTime() + 30 * 86400000)
      const em7  = new Date(hoje.getTime() + 7 * 86400000)

      const conn = await getConn()
      let noticiasPorStatus: any[] = [], noticiasPorTipo: any[] = [], eventosPorStatus: any[] = [], midiasPorTipo: any[] = [], totalVisualizacoes = 0
      try {
        const [nsRows] = await conn.execute(`SELECT status, COUNT(*) as total FROM Noticia WHERE municipioId = ? AND ativo = 1 GROUP BY status`, [mId]) as any[]
        noticiasPorStatus = (nsRows as any[]).map((r: any) => ({ status: r.status, _count: { _all: Number(r.total) } }))

        const [ntRows] = await conn.execute(`SELECT tipo, COUNT(*) as total FROM Noticia WHERE municipioId = ? AND ativo = 1 AND status = 'PUBLICADA' GROUP BY tipo`, [mId]) as any[]
        noticiasPorTipo = (ntRows as any[]).map((r: any) => ({ tipo: r.tipo, _count: { _all: Number(r.total) } }))

        const [esRows] = await conn.execute(`SELECT status, COUNT(*) as total FROM EventoAgenda WHERE municipioId = ? AND ativo = 1 GROUP BY status`, [mId]) as any[]
        eventosPorStatus = (esRows as any[]).map((r: any) => ({ status: r.status, _count: { _all: Number(r.total) } }))

        const [mtRows] = await conn.execute(`SELECT tipo, COUNT(*) as total FROM Midia WHERE municipioId = ? AND ativo = 1 GROUP BY tipo`, [mId]) as any[]
        midiasPorTipo = (mtRows as any[]).map((r: any) => ({ tipo: r.tipo, _count: { _all: Number(r.total) } }))

        const [vizRows] = await conn.execute(`SELECT SUM(visualizacoes) as total FROM Noticia WHERE municipioId = ? AND ativo = 1`, [mId]) as any[]
        totalVisualizacoes = Number((vizRows as any[])[0]?.total ?? 0)
      } finally {
        await conn.end()
      }

      const [proximosEventos, ultimasNoticias] = await Promise.all([
        prisma.EventoAgenda.findMany({
          where: { municipioId: mId, ativo: true, status: 'PROGRAMADO', dataInicio: { gte: hoje, lte: em30 } },
          orderBy: { dataInicio: 'asc' },
          take: 5,
          select: { id: true, titulo: true, tipo: true, local: true, dataInicio: true, horaInicio: true, destaque: true }
        }),
        prisma.Noticia.findMany({
          where: { municipioId: mId, ativo: true, status: 'PUBLICADA' },
          orderBy: { dataPublicacao: 'desc' },
          take: 5,
          select: { id: true, titulo: true, tipo: true, visualizacoes: true, dataPublicacao: true, imagemCapa: true }
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
          prisma.Noticia.count({ where: { municipioId: mId, dataPublicacao: { gte: ini, lte: fim } } }),
          prisma.EventoAgenda.count({ where: { municipioId: mId, dataInicio: { gte: ini, lte: fim } } }),
        ])
        publicacoesMes.push({ mes: ini.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), noticias: n, eventos: e })
      }

      return NextResponse.json({
        noticiasPorStatus, noticiasPorTipo, eventosPorStatus, midiasPorTipo,
        proximosEventos, ultimasNoticias,
        totalVisualizacoes,
        publicacoesMes,
        emSemana: proximosEventos.filter((e: any) => new Date(e.dataInicio) <= em7).length,
      })
    }

    if (tipo === 'NOTICIAS_MES') {
      const historico = []
      const conn = await getConn()
      try {
        for (let i = 11; i >= 0; i--) {
          const d   = new Date()
          d.setMonth(d.getMonth() - i)
          const ini = new Date(d.getFullYear(), d.getMonth(), 1)
          const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0)
          const [rows] = await conn.execute(
            `SELECT tipo, COUNT(*) as total FROM Noticia WHERE municipioId = ? AND dataPublicacao >= ? AND dataPublicacao <= ? GROUP BY tipo`,
            [mId, ini, fim]
          ) as any[]
          const por_tipo = (rows as any[]).map((r: any) => ({ tipo: r.tipo, _count: { _all: Number(r.total) } }))
          historico.push({ mes: ini.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), por_tipo })
        }
      } finally {
        await conn.end()
      }
      return NextResponse.json({ historico })
    }

    if (tipo === 'MAIS_LIDAS') {
      const noticias = await prisma.Noticia.findMany({
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
