import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const obraId = searchParams.get('obraId')
  const q = searchParams.get('q')

  try {
    if (obraId) {
      const rows = await db.$queryRaw<any[]>`SELECT * FROM Obra WHERE id = ${obraId} AND municipioId = ${municipioId} LIMIT 1`
      return NextResponse.json({ obra: rows[0] ?? null })
    }
    // Obras que necessitam/têm alvará
    if (q && q.length >= 3) {
      const like = `%${q}%`
      const rows = await db.$queryRaw<any[]>`
        SELECT * FROM Obra WHERE municipioId = ${municipioId}
          AND (nome LIKE ${like} OR anotacaoArt LIKE ${like})
        LIMIT 20`
      return NextResponse.json({ obras: rows })
    }
    const rows = await db.$queryRaw<any[]>`
      SELECT * FROM Obra WHERE municipioId = ${municipioId}
      ORDER BY dataInicio DESC LIMIT 50`
    return NextResponse.json({ obras: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
