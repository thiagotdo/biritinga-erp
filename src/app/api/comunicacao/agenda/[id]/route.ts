// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { obterUsuario } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

// GET - obter evento por ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await obterUsuario(req)
    if (!ctx) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const evento = await prisma.EventoAgenda.findFirst({
      where: { id: params.id, municipioId: ctx.municipioId },
    })

    if (!evento) {
      return NextResponse.json({ erro: 'Evento não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ evento })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

// PATCH - atualizar evento
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await obterUsuario(req)
    if (!ctx) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const data = await req.json()

    const evento = await prisma.EventoAgenda.findFirst({
      where: { id: params.id, municipioId: ctx.municipioId },
    })
    if (!evento) return NextResponse.json({ erro: 'Evento não encontrado' }, { status: 404 })

    const atualizado = await prisma.EventoAgenda.update({
      where: { id: params.id },
      data: { ...data, atualizadoEm: new Date() },
    })

    return NextResponse.json({ evento: atualizado })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
