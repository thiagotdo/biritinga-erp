import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const obraId = searchParams.get('obraId')

  try {
    if (obraId) {
      const obra = await db.$queryRaw`
        SELECT id, nome, status, percentualConcluido, responsavelTecnico, observacoes
        FROM Obra WHERE id = ${obraId} AND municipioId = ${municipioId} LIMIT 1`
      return NextResponse.json({ obra: obra[0] ?? null })
    }
    // Obras em fiscalização (em andamento)
    const rows = await db.$queryRaw`
      SELECT id, nome, status, percentualConcluido, responsavelTecnico,
             valorContrato, valorExecutado, dataInicio, dataPrevistaConclusao
      FROM Obra WHERE municipioId = ${municipioId} AND status = 'EM_ANDAMENTO'
      ORDER BY percentualConcluido DESC`
    return NextResponse.json({ obras: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
