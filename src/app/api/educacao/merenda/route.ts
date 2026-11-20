/**
 * GET  /api/educacao/merenda?semana=YYYY-MM-DD  — cardápio da semana
 * POST /api/educacao/merenda                     — registra item de cardápio
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

function mid(req: NextRequest) {
  return req.headers.get('x-erp-municipio-id') ?? ''
}

function getInicioSemana(dateStr: string): string {
  const d = new Date(dateStr)
  const dia = d.getDay()
  d.setDate(d.getDate() - dia + (dia === 0 ? -6 : 1)) // segunda-feira
  return d.toISOString().split('T')[0]
}

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Sem município' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const semanaParam = searchParams.get('semana') ?? new Date().toISOString().split('T')[0]
  const escolaId = searchParams.get('escolaId')
  const semana = getInicioSemana(semanaParam)

  try {
    let cardapio: any[]
    if (escolaId) {
      cardapio = await db.$queryRaw`
        SELECT * FROM CardapioMerenda
        WHERE municipioId = ${municipioId} AND semana = ${semana}
          AND (escolaId = ${escolaId} OR escolaId IS NULL)
        ORDER BY diaSemana ASC, turno ASC
      ` as any[]
    } else {
      cardapio = await db.$queryRaw`
        SELECT * FROM CardapioMerenda
        WHERE municipioId = ${municipioId} AND semana = ${semana}
        ORDER BY diaSemana ASC, turno ASC
      ` as any[]
    }

    // Agrupar por dia
    const dias: Record<number, any[]> = {}
    for (const item of cardapio) {
      const d = Number(item.diaSemana)
      if (!dias[d]) dias[d] = []
      dias[d].push(item)
    }

    return NextResponse.json({ semana, cardapio, dias })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Sem município' }, { status: 401 })

  try {
    const { semana, diaSemana, turno, categoria, descricao, calorias, escolaId } = await req.json()

    if (!semana || diaSemana === undefined || !categoria || !descricao) {
      return NextResponse.json({ erro: 'semana, diaSemana, categoria e descricao são obrigatórios' }, { status: 400 })
    }

    const semanaFormatada = getInicioSemana(semana)

    const item = await db.CardapioMerenda.create({
      data: {
        id: randomUUID(), municipioId,
        escolaId: escolaId || null,
        semana: semanaFormatada,
        diaSemana: parseInt(diaSemana),
        turno: turno ?? 'MATUTINO',
        categoria, descricao,
        calorias: calorias ? parseInt(calorias) : null,
      },
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
