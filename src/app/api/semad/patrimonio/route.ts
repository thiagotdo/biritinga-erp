import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

// Redirect patrimônio queries for server-linked assets
export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const servidorId = searchParams.get('servidorId')

  try {
    let rows: any[]
    if (servidorId) {
      rows = await db.$queryRaw<any[]>`
        SELECT b.*, s.nome AS responsavelNome
        FROM BemPatrimonial b
        LEFT JOIN Servidor s ON s.id = b.responsavelId
        WHERE b.municipioId = ${municipioId} AND b.responsavelId = ${servidorId}
        ORDER BY b.descricao`
    } else {
      rows = await db.$queryRaw<any[]>`
        SELECT b.*,
          s.nome AS responsavelNome,
          u.nome AS unidadeNome
        FROM BemPatrimonial b
        LEFT JOIN Servidor s ON s.id = b.responsavelId
        LEFT JOIN UnidadeAdm u ON u.id = b.unidadeId
        WHERE b.municipioId = ${municipioId} AND b.ativo = 1
        ORDER BY b.descricao LIMIT 200`
    }
    return NextResponse.json({ bens: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
