import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const obraId = searchParams.get('obraId')

  if (!obraId) return NextResponse.json({ erro: 'obraId obrigatório' }, { status: 400 })

  try {
    const obra = await db.$queryRaw`
      SELECT id, nome, valorContrato, valorExecutado, percentualConcluido
      FROM Obra WHERE id = ${obraId} AND municipioId = ${municipioId} LIMIT 1`
    return NextResponse.json({ obra: obra[0] ?? null })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { obraId, valorMedicao, percentualAcumulado, dataMedicao, observacoes } = await req.json()
  if (!obraId || !valorMedicao) return NextResponse.json({ erro: 'Dados obrigatórios faltando' }, { status: 400 })
  try {
    if (valorMedicao !== undefined) await db.$queryRaw`
      UPDATE Obra SET valorExecutado = valorExecutado + ${valorMedicao} WHERE id = ${obraId} AND municipioId = ${municipioId}`
    if (percentualAcumulado !== undefined) await db.$queryRaw`
      UPDATE Obra SET percentualConcluido = ${percentualAcumulado} WHERE id = ${obraId} AND municipioId = ${municipioId}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
