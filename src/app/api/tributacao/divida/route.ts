import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const contribuinteId = searchParams.get('contribuinteId')
  const tipo = searchParams.get('tipo')

  try {
    let rows: any[]
    const baseStatus = 'INSCRITO_DIVIDA'
    if (contribuinteId) {
      rows = await db.$queryRaw<any[]>`
        SELECT d.*, c.nome AS contribuinteNome
        FROM DebitoTributario d JOIN Contribuinte c ON c.id = d.contribuinteId
        WHERE d.municipioId = ${municipioId} AND d.contribuinteId = ${contribuinteId}
          AND d.status = ${baseStatus}
        ORDER BY d.anoExercicio DESC`
    } else if (tipo) {
      rows = await db.$queryRaw<any[]>`
        SELECT d.*, c.nome AS contribuinteNome, c.cpfCnpj
        FROM DebitoTributario d JOIN Contribuinte c ON c.id = d.contribuinteId
        WHERE d.municipioId = ${municipioId} AND d.tipo = ${tipo} AND d.status = ${baseStatus}
        ORDER BY d.vencimento`
    } else {
      rows = await db.$queryRaw<any[]>`
        SELECT d.*, c.nome AS contribuinteNome, c.cpfCnpj
        FROM DebitoTributario d JOIN Contribuinte c ON c.id = d.contribuinteId
        WHERE d.municipioId = ${municipioId} AND d.status = ${baseStatus}
        ORDER BY d.vencimento LIMIT 200`
    }
    return NextResponse.json({ divida: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, status } = await req.json()
  if (!id || !status) return NextResponse.json({ erro: 'ID e status obrigatórios' }, { status: 400 })
  try {
    await db.$queryRaw`UPDATE DebitoTributario SET status = ${status} WHERE id = ${id} AND municipioId = ${municipioId}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
