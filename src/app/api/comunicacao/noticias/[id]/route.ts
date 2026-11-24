// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { obterUsuario } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

// GET - obter notícia completa por ID ou slug
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await obterUsuario(req)
    if (!ctx) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const { id } = params

    // Buscar por ID ou slug
    const noticia = await prisma.Noticia.findFirst({
      where: {
        municipioId: ctx.municipioId,
        OR: [{ id }, { slug: id }],
      },
    })

    if (!noticia) {
      return NextResponse.json({ erro: 'Notícia não encontrada' }, { status: 404 })
    }

    // Incrementar visualizações
    try {
      await prisma.Noticia.update({
        where: { id: noticia.id },
        data: { visualizacoes: (noticia.visualizacoes ?? 0) + 1, atualizadoEm: new Date() },
      })
    } catch { /* ignora falha no contador */ }

    return NextResponse.json({ noticia })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

// PATCH - atualizar notícia
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await obterUsuario(req)
    if (!ctx) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const { id } = params
    const data = await req.json()

    const noticia = await prisma.Noticia.findFirst({
      where: { id, municipioId: ctx.municipioId },
    })
    if (!noticia) return NextResponse.json({ erro: 'Notícia não encontrada' }, { status: 404 })

    const atualizada = await prisma.Noticia.update({
      where: { id },
      data: {
        ...data,
        atualizadoEm: new Date(),
      },
    })

    return NextResponse.json({ noticia: atualizada })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

// DELETE - arquivar notícia
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await obterUsuario(req)
    if (!ctx) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const { id } = params

    const noticia = await prisma.Noticia.findFirst({
      where: { id, municipioId: ctx.municipioId },
    })
    if (!noticia) return NextResponse.json({ erro: 'Notícia não encontrada' }, { status: 404 })

    await prisma.Noticia.update({
      where: { id },
      data: { status: 'ARQUIVADA', ativo: false, atualizadoEm: new Date() },
    })

    return NextResponse.json({ mensagem: 'Notícia arquivada com sucesso' })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
