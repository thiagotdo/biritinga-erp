import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function municipioId(req: NextRequest) {
  return req.headers.get('x-erp-municipio-id') ?? ''
}

export async function GET(req: NextRequest) {
  const mid = municipioId(req)
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const agravo = searchParams.get('agravo')
  const page  = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 30
  const offset = (page - 1) * limit

  try {
    let notificacoes: any[]
    if (status) {
      notificacoes = await db.$queryRaw<any[]>`
        SELECT n.*, u.nome AS unidadeNome, p.nome AS pacienteNome
        FROM NotificacaoEpidem n
        LEFT JOIN UnidadeSaude u ON u.id = n.unidadeId
        LEFT JOIN Paciente p ON p.id = n.pacienteId
        WHERE n.municipioId = ${mid} AND n.status = ${status}
        ORDER BY n.dataNotificacao DESC
        LIMIT ${limit} OFFSET ${offset}`
    } else if (agravo) {
      const like = `%${agravo}%`
      notificacoes = await db.$queryRaw<any[]>`
        SELECT n.*, u.nome AS unidadeNome, p.nome AS pacienteNome
        FROM NotificacaoEpidem n
        LEFT JOIN UnidadeSaude u ON u.id = n.unidadeId
        LEFT JOIN Paciente p ON p.id = n.pacienteId
        WHERE n.municipioId = ${mid} AND n.agravo LIKE ${like}
        ORDER BY n.dataNotificacao DESC
        LIMIT ${limit} OFFSET ${offset}`
    } else {
      notificacoes = await db.$queryRaw<any[]>`
        SELECT n.*, u.nome AS unidadeNome, p.nome AS pacienteNome
        FROM NotificacaoEpidem n
        LEFT JOIN UnidadeSaude u ON u.id = n.unidadeId
        LEFT JOIN Paciente p ON p.id = n.pacienteId
        WHERE n.municipioId = ${mid}
        ORDER BY n.dataNotificacao DESC
        LIMIT ${limit} OFFSET ${offset}`
    }

    // Contagens por status
    const contagens = await db.$queryRaw<any[]>`
      SELECT status, COUNT(*) AS total
      FROM NotificacaoEpidem
      WHERE municipioId = ${mid}
      GROUP BY status`

    return NextResponse.json({ notificacoes, contagens })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const mid = municipioId(req)
  const { unidadeId, pacienteId, agravo, cid10,
    dataNotificacao, dataSintomas, bairro, observacoes } = await req.json()

  if (!agravo?.trim())
    return NextResponse.json({ erro: 'Agravo obrigatório' }, { status: 400 })

  try {
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO NotificacaoEpidem (id, municipioId, unidadeId, pacienteId,
                                     agravo, cid10, dataNotificacao, dataSintomas, bairro, observacoes)
      VALUES (${id}, ${mid}, ${unidadeId || null}, ${pacienteId || null},
              ${agravo.trim()}, ${cid10 || null},
              ${dataNotificacao ?? new Date().toISOString().split('T')[0]},
              ${dataSintomas || null}, ${bairro || null}, ${observacoes || null})`
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const mid = municipioId(req)
  const { id, status, observacoes } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })
  try {
    if (status) await db.$queryRaw`UPDATE NotificacaoEpidem SET status = ${status} WHERE id = ${id} AND municipioId = ${mid}`
    if (observacoes) await db.$queryRaw`UPDATE NotificacaoEpidem SET observacoes = ${observacoes} WHERE id = ${id} AND municipioId = ${mid}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
