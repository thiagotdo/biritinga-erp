import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const contribuinteId = searchParams.get('contribuinteId')
  const tipo = searchParams.get('tipo')
  const status = searchParams.get('status') ?? 'ABERTO'

  try {
    let rows: any[]
    if (contribuinteId) {
      rows = await db.$queryRaw`
        SELECT d.*, c.nome AS contribuinteNome
        FROM DebitoTributario d JOIN Contribuinte c ON c.id = d.contribuinteId
        WHERE d.municipioId = ${municipioId} AND d.contribuinteId = ${contribuinteId}
        ORDER BY d.anoExercicio DESC, d.tipo`
    } else if (tipo) {
      rows = await db.$queryRaw`
        SELECT d.*, c.nome AS contribuinteNome, c.cpfCnpj
        FROM DebitoTributario d JOIN Contribuinte c ON c.id = d.contribuinteId
        WHERE d.municipioId = ${municipioId} AND d.tipo = ${tipo} AND d.status = ${status}
        ORDER BY d.vencimento`
    } else {
      rows = await db.$queryRaw`
        SELECT d.*, c.nome AS contribuinteNome, c.cpfCnpj
        FROM DebitoTributario d JOIN Contribuinte c ON c.id = d.contribuinteId
        WHERE d.municipioId = ${municipioId} AND d.status = ${status}
        ORDER BY d.vencimento LIMIT 100`
    }
    return NextResponse.json({ debitos: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { contribuinteId, tipo, anoExercicio, valorOriginal, vencimento, descricao } = await req.json()
  if (!contribuinteId || !tipo || !anoExercicio || !valorOriginal)
    return NextResponse.json({ erro: 'Dados obrigatórios faltando' }, { status: 400 })
  try {
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO DebitoTributario (id, municipioId, contribuinteId, tipo, anoExercicio,
                                    valorOriginal, valorAtualizado, vencimento, descricao)
      VALUES (${id}, ${municipioId}, ${contribuinteId}, ${tipo}, ${anoExercicio},
              ${valorOriginal}, ${valorOriginal}, ${vencimento || null}, ${descricao || null})`
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, status, valorAtualizado, dataPagamento } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })
  try {
    if (status !== undefined) await db.$queryRaw`UPDATE DebitoTributario SET status = ${status} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (valorAtualizado !== undefined) await db.$queryRaw`UPDATE DebitoTributario SET valorAtualizado = ${valorAtualizado} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (dataPagamento !== undefined) await db.$queryRaw`UPDATE DebitoTributario SET dataPagamento = ${dataPagamento} WHERE id = ${id} AND municipioId = ${municipioId}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
