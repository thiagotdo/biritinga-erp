/**
 * GET  /api/educacao/escola        - lista escolas
 * GET  /api/educacao/escola?id=X   - detalhe com turmas
 * POST /api/educacao/escola        - cria escola
 * PATCH /api/educacao/escola       - atualiza escola
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function mid(req: NextRequest) {
  return req.headers.get('x-erp-municipio-id') ?? ''
}

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Não autenticado', codigo: 'UNAUTHENTICATED' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id   = searchParams.get('id')
  const zona = searchParams.get('zona') // URBANA | RURAL

  try {
    if (id) {
      const escola = await prisma.escola.findFirst({
        where: { id, municipioId },
        include: {
          turmas: {
            where: { ativo: true },
            orderBy: [{ etapa: 'asc' }, { serie: 'asc' }],
          },
        },
      })
      if (!escola) return NextResponse.json({ erro: 'Escola não encontrada' }, { status: 404 })
      return NextResponse.json({ escola })
    }

    const where: any = { municipioId, situacao: 'ATIVA' }
    if (zona) where.zona = zona

    const escolas = await prisma.escola.findMany({
      where,
      orderBy: { nome: 'asc' },
      include: {
        _count: { select: { turmas: { where: { ativo: true } } } },
      },
    })

    const resultado = escolas.map(e => ({
      id:          e.id,
      nome:        e.nome,
      inep:        e.inep,
      zona:        e.zona,
      situacao:    e.situacao,
      salas:       e.salas,
      capacidadeTotal: e.capacidadeTotal,
      logradouro:  e.logradouro,
      bairro:      e.bairro,
      telefone:    e.telefone,
      email:       e.email,
      diretor:     e.diretor,
      totalTurmas: e._count.turmas,
    }))

    return NextResponse.json({ escolas: resultado, total: resultado.length })
  } catch (e: any) {
    console.error('[escola GET]', e)
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Não autenticado', codigo: 'UNAUTHENTICATED' }, { status: 401 })

  try {
    const {
      nome, inep, zona, diretor, secretario,
      logradouro, bairro, cep, telefone, email,
      salas, capacidadeTotal,
    } = await req.json()

    if (!nome) return NextResponse.json({ erro: 'Nome é obrigatório' }, { status: 400 })

    if (inep) {
      const existe = await prisma.escola.findFirst({ where: { municipioId, inep } })
      if (existe) return NextResponse.json({ erro: 'Código INEP já cadastrado' }, { status: 409 })
    }

    const escola = await prisma.escola.create({
      data: {
        municipioId, nome,
        inep:           inep || null,
        zona:           zona || null,
        diretor:        diretor || null,
        secretario:     secretario || null,
        logradouro:     logradouro || null,
        bairro:         bairro || null,
        cep:            cep || null,
        telefone:       telefone || null,
        email:          email || null,
        salas:          salas ? Number(salas) : null,
        capacidadeTotal: capacidadeTotal ? Number(capacidadeTotal) : null,
      },
    })

    return NextResponse.json({ escola }, { status: 201 })
  } catch (e: any) {
    console.error('[escola POST]', e)
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Não autenticado', codigo: 'UNAUTHENTICATED' }, { status: 401 })

  try {
    const { id, ...dados } = await req.json()
    if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

    const escola = await prisma.escola.findFirst({ where: { id, municipioId } })
    if (!escola) return NextResponse.json({ erro: 'Escola não encontrada' }, { status: 404 })

    await prisma.escola.update({ where: { id }, data: dados })
    return NextResponse.json({ sucesso: true })
  } catch (e: any) {
    console.error('[escola PATCH]', e)
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
