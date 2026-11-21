import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const servidorId = searchParams.get('servidorId')

  try {
    if (id) {
      const rows = await db.$queryRaw`
        SELECT c.*, s.nome AS servidorNome, s.matricula
        FROM ContratoAdm c JOIN Servidor s ON s.id = c.servidorId
        WHERE c.id = ${id} AND c.municipioId = ${municipioId} LIMIT 1`
      return NextResponse.json({ contrato: rows[0] ?? null })
    }
    if (servidorId) {
      const rows = await db.$queryRaw`
        SELECT c.*, s.nome AS servidorNome
        FROM ContratoAdm c JOIN Servidor s ON s.id = c.servidorId
        WHERE c.municipioId = ${municipioId} AND c.servidorId = ${servidorId}
        ORDER BY c.dataInicio DESC`
      return NextResponse.json({ contratos: rows })
    }
    const rows = await db.$queryRaw`
      SELECT c.*, s.nome AS servidorNome, s.matricula
      FROM ContratoAdm c JOIN Servidor s ON s.id = c.servidorId
      WHERE c.municipioId = ${municipioId}
      ORDER BY c.dataInicio DESC LIMIT 100`
    return NextResponse.json({ contratos: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { servidorId, tipo, dataInicio, dataFim, valorMensal, cargaHoraria, observacoes } = await req.json()
  if (!servidorId || !tipo || !dataInicio)
    return NextResponse.json({ erro: 'servidorId, tipo e dataInicio obrigatórios' }, { status: 400 })
  try {
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO ContratoAdm (id, municipioId, servidorId, tipo, dataInicio, dataFim,
                               valorMensal, cargaHoraria, observacoes)
      VALUES (${id}, ${municipioId}, ${servidorId}, ${tipo}, ${dataInicio}, ${dataFim || null},
              ${valorMensal || null}, ${cargaHoraria ?? 40}, ${observacoes || null})`
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, dataFim, status, observacoes } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })
  try {
    if (dataFim !== undefined) await db.$queryRaw`UPDATE ContratoAdm SET dataFim = ${dataFim} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (status !== undefined) await db.$queryRaw`UPDATE ContratoAdm SET status = ${status} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (observacoes !== undefined) await db.$queryRaw`UPDATE ContratoAdm SET observacoes = ${observacoes} WHERE id = ${id} AND municipioId = ${municipioId}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
