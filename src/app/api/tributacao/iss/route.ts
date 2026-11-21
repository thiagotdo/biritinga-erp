import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const contribuinteId = searchParams.get('contribuinteId')
  const anoExercicio = searchParams.get('anoExercicio') ?? new Date().getFullYear()

  try {
    let rows: any[]
    if (contribuinteId) {
      rows = await db.$queryRaw`
        SELECT d.*, c.nome AS contribuinteNome
        FROM DebitoTributario d JOIN Contribuinte c ON c.id = d.contribuinteId
        WHERE d.municipioId = ${municipioId} AND d.contribuinteId = ${contribuinteId}
          AND d.tipo = 'ISS'
        ORDER BY d.anoExercicio DESC`
    } else {
      rows = await db.$queryRaw`
        SELECT d.*, c.nome AS contribuinteNome, c.cpfCnpj
        FROM DebitoTributario d JOIN Contribuinte c ON c.id = d.contribuinteId
        WHERE d.municipioId = ${municipioId} AND d.tipo = 'ISS' AND d.anoExercicio = ${anoExercicio}
        ORDER BY c.nome LIMIT 200`
    }
    return NextResponse.json({ iss: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { contribuinteId, anoExercicio, mes, valorServicos, aliquota, valorOriginal, vencimento } = await req.json()
  if (!contribuinteId || !anoExercicio || !valorOriginal)
    return NextResponse.json({ erro: 'Dados obrigatórios faltando' }, { status: 400 })
  try {
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO DebitoTributario (id, municipioId, contribuinteId, tipo, anoExercicio,
                                    valorOriginal, valorAtualizado, vencimento, descricao)
      VALUES (${id}, ${municipioId}, ${contribuinteId}, 'ISS', ${anoExercicio},
              ${valorOriginal}, ${valorOriginal}, ${vencimento || null},
              ${mes ? `ISS ref. ${mes}/${anoExercicio}` : null})`
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
