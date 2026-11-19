import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'
import { z } from 'zod'

export const runtime = 'nodejs'

const CriarSchema = z.object({
  titulo:         z.string().min(3).max(500),
  descricao:      z.string().optional(),
  tipo:           z.enum(['AUDIENCIA_PUBLICA','REUNIAO','SHOW','ESPORTE','CULTURAL','SAUDE','EDUCACAO','INAUGURACAO','OUTRO']).default('OUTRO'),
  status:         z.enum(['PROGRAMADO','EM_ANDAMENTO','REALIZADO','CANCELADO','ADIADO']).default('PROGRAMADO'),
  local:          z.string().max(500).optional(),
  endereco:       z.string().max(500).optional(),
  dataInicio:     z.string().datetime(),
  dataFim:        z.string().datetime().optional().nullable(),
  horaInicio:     z.string().max(10).optional(),
  horaFim:        z.string().max(10).optional(),
  responsavel:    z.string().max(255).optional(),
  secretaria:     z.string().max(255).optional(),
  publicoEsperado: z.number().int().optional().nullable(),
  linkTransmissao: z.string().url().optional().or(z.literal('')),
  destaque:       z.boolean().default(false),
  imagemCapa:     z.string().optional(),
  observacoes:    z.string().optional(),
})

const AtualizarSchema = CriarSchema.partial().extend({ id: z.string() })

export async function GET(req: NextRequest) {
  try {
    const usuario = await obterUsuario(req)
    if (!usuario) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const mId    = usuario.municipioId
    const id     = searchParams.get('id')
    const mes    = searchParams.get('mes')   // YYYY-MM
    const status = searchParams.get('status')
    const tipo   = searchParams.get('tipo')
    const busca  = searchParams.get('busca')
    const proximos = searchParams.get('proximos') // número de dias

    if (id) {
      const evento = await prisma.eventoAgenda.findFirst({ where: { id, municipioId: mId, ativo: true } })
      if (!evento) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
      return NextResponse.json({ evento })
    }

    const where: any = { municipioId: mId, ativo: true }
    if (status) where.status = status
    if (tipo) where.tipo = tipo
    if (busca) where.OR = [{ titulo: { contains: busca } }, { local: { contains: busca } }]

    if (mes) {
      const [ano, m] = mes.split('-').map(Number)
      where.dataInicio = {
        gte: new Date(ano, m - 1, 1),
        lt:  new Date(ano, m, 1),
      }
    } else if (proximos) {
      const dias = parseInt(proximos)
      const hoje = new Date()
      where.dataInicio = { gte: hoje, lte: new Date(hoje.getTime() + dias * 86400000) }
      where.status = { in: ['PROGRAMADO', 'EM_ANDAMENTO'] }
    }

    const eventos = await prisma.eventoAgenda.findMany({
      where,
      orderBy: [{ destaque: 'desc' }, { dataInicio: 'asc' }],
    })

    // KPIs
    const kpiMap = await prisma.eventoAgenda.groupBy({
      by: ['status'],
      where: { municipioId: mId, ativo: true },
      _count: { _all: true },
    })

    // Próximos 7 dias para alerta
    const hoje = new Date()
    const em7 = new Date(hoje.getTime() + 7 * 86400000)
    const proxSemana = await prisma.eventoAgenda.count({
      where: { municipioId: mId, ativo: true, status: 'PROGRAMADO', dataInicio: { gte: hoje, lte: em7 } }
    })

    return NextResponse.json({ eventos, kpiMap, proxSemana })
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
    const evento = await prisma.eventoAgenda.create({
      data: {
        municipioId:    usuario.municipioId,
        titulo:         d.titulo,
        descricao:      d.descricao,
        tipo:           d.tipo,
        status:         d.status,
        local:          d.local,
        endereco:       d.endereco,
        dataInicio:     new Date(d.dataInicio),
        dataFim:        d.dataFim ? new Date(d.dataFim) : null,
        horaInicio:     d.horaInicio,
        horaFim:        d.horaFim,
        responsavel:    d.responsavel,
        secretaria:     d.secretaria,
        publicoEsperado: d.publicoEsperado,
        linkTransmissao: d.linkTransmissao || null,
        destaque:       d.destaque,
        imagemCapa:     d.imagemCapa,
        observacoes:    d.observacoes,
      }
    })

    auditLog({ usuarioId: usuario.id, acao: 'CRIAR_EVENTO', tabela: 'EventoAgenda', registroId: evento.id, municipioId: usuario.municipioId })
    return NextResponse.json({ evento }, { status: 201 })
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

    const { id, dataInicio, dataFim, ...rest } = parse.data

    const exist = await prisma.eventoAgenda.findFirst({ where: { id, municipioId: usuario.municipioId } })
    if (!exist) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })

    const updateData: any = { ...rest }
    if (dataInicio) updateData.dataInicio = new Date(dataInicio)
    if (dataFim) updateData.dataFim = new Date(dataFim)

    const evento = await prisma.eventoAgenda.update({ where: { id }, data: updateData })
    auditLog({ usuarioId: usuario.id, acao: 'ATUALIZAR_EVENTO', tabela: 'EventoAgenda', registroId: id, municipioId: usuario.municipioId })
    return NextResponse.json({ evento })
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

    await prisma.eventoAgenda.updateMany({ where: { id, municipioId: usuario.municipioId }, data: { ativo: false } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
