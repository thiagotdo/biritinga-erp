import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

// Alias for licitacao — processo refers to the full procurement process
export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  try {
    let rows: any[]
    if (status) {
      rows = await db.$queryRaw<any[]>`
        SELECT * FROM Licitacao WHERE municipioId = ${municipioId} AND status = ${status}
        ORDER BY dataAbertura DESC LIMIT 50`
    } else {
      rows = await db.$queryRaw<any[]>`
        SELECT * FROM Licitacao WHERE municipioId = ${municipioId}
        ORDER BY dataAbertura DESC LIMIT 50`
    }
    return NextResponse.json({ processos: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
