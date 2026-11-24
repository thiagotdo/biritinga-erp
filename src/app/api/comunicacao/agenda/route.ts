// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { obterUsuario } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const ctx = await obterUsuario(req)
    if (!ctx) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const pagina  = Math.max(1, Number(searchParams.get('pagina') ?? 1))
    const limite  = Math.min(50, Number(searchParams.get('limite') ?? 15))
    const status  = searchParams.get('status') ?? ''
    const tipo    = searchParams.get('tipo') ?? ''
    const skip    = (pagina - 1) * limite

    const where: any = { municipioId: ctx.municipioId, ativo: true }
    if (status) where.status = status
    if (tipo)   where.tipo   = tipo

    const [eventos, total] = await Promise.all([
      prisma.EventoAgenda.findMany({
        where, skip, take: limite,
        orderBy: [{ dataInicio: 'desc' }],
        select: {
          id: true, titulo: true, tipo: true, status: true,
          local: true, dataInicio: true, dataFim: true,
          horaInicio: true, horaFim: true, responsavel: true,
          secretaria: true, destaque: true, publicoEsperado: true,
        },
      }),
      prisma.EventoAgenda.count({ where }),
    ])

    return NextResponse.json({ eventos, total, pagina, limite })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await obterUsuario(req)
    if (!ctx) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const data = await req.json()
    if (!data.titulo?.trim())    return NextResponse.json({ erro: 'Título obrigatório' }, { status: 400 })
    if (!data.dataInicio)        return NextResponse.json({ erro: 'Data de início obrigatória' }, { status: 400 })

    const evento = await prisma.EventoAgenda.create({
      data: {
        id:             randomUUID(),
        municipioId:    ctx.municipioId,
        titulo:         data.titulo.trim(),
        descricao:      data.descricao?.trim() ?? null,
        tipo:           data.tipo ?? 'OUTRO',
        status:         data.status ?? 'PROGRAMADO',
        local:          data.local?.trim() ?? null,
        endereco:       data.endereco?.trim() ?? null,
        dataInicio:     new Date(data.dataInicio),
        dataFim:        data.dataFim ? new Date(data.dataFim) : null,
        horaInicio:     data.horaInicio ?? null,
        horaFim:        data.horaFim ?? null,
        responsavel:    data.responsavel?.trim() ?? null,
        secretaria:     data.secretaria?.trim() ?? null,
        publicoEsperado: data.publicoEsperado ? Number(data.publicoEsperado) : null,
        linkTransmissao: data.linkTransmissao?.trim() ?? null,
        destaque:       data.destaque ?? false,
        imagemCapa:     data.imagemCapa ?? null,
        observacoes:    data.observacoes?.trim() ?? null,
        criadoEm:       new Date(),
        atualizadoEm:   new Date(),
      },
    })

    return NextResponse.json({ evento }, { status: 201 })
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

    const atual = await prisma.EventoAgenda.findFirst({ where: { id: data.id, municipioId: ctx.municipioId } })
    if (!atual) return NextResponse.json({ erro: 'Evento não encontrado' }, { status: 404 })

    const update: any = { atualizadoEm: new Date() }
    const campos = ['titulo','descricao','tipo','status','local','endereco','horaInicio','horaFim','responsavel','secretaria','linkTransmissao','imagemCapa','observacoes','destaque']
    campos.forEach(c => { if (data[c] !== undefined) update[c] = data[c] })
    if (data.dataInicio) update.dataInicio = new Date(data.dataInicio)
    if (data.dataFim)    update.dataFim    = new Date(data.dataFim)
    if (data.publicoEsperado) update.publicoEsperado = Number(data.publicoEsperado)

    const evento = await prisma.EventoAgenda.update({ where: { id: data.id }, data: update })
    return NextResponse.json({ evento })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await obterUsuario(req)
    if (!ctx) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

    const evento = await prisma.EventoAgenda.findFirst({ where: { id, municipioId: ctx.municipioId } })
    if (!evento) return NextResponse.json({ erro: 'Evento não encontrado' }, { status: 404 })

    await prisma.EventoAgenda.update({ where: { id }, data: { ativo: false } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
