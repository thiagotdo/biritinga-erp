import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const ano = searchParams.get('ano') ?? new Date().getFullYear()

  try {
    if (id) {
      const rows = await db.$queryRaw`SELECT * FROM Folha WHERE id = ${id} AND municipioId = ${municipioId} LIMIT 1`
      return NextResponse.json({ folha: rows[0] ?? null })
    }
    const rows = await db.$queryRaw`
      SELECT * FROM Folha WHERE municipioId = ${municipioId} AND ano = ${ano}
      ORDER BY mes DESC, tipo`
    return NextResponse.json({ competencias: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { mes, ano, tipo, totalBruto, totalDescontos, totalLiquido,
    totalServidores, observacoes } = await req.json()
  if (!mes || !ano) return NextResponse.json({ erro: 'Mês e ano obrigatórios' }, { status: 400 })
  try {
    const dup = await db.$queryRaw`
      SELECT id FROM Folha WHERE municipioId = ${municipioId} AND mes = ${mes} AND ano = ${ano} AND tipo = ${tipo ?? 'MENSAL'} LIMIT 1`
    if (dup.length) return NextResponse.json({ erro: 'Competência já existe' }, { status: 409 })
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO Folha (id, municipioId, mes, ano, tipo, totalBruto, totalDescontos,
                         totalLiquido, totalServidores, observacoes)
      VALUES (${id}, ${municipioId}, ${mes}, ${ano}, ${tipo ?? 'MENSAL'},
              ${totalBruto ?? 0}, ${totalDescontos ?? 0}, ${totalLiquido ?? 0},
              ${totalServidores ?? 0}, ${observacoes || null})`
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, status, totalBruto, totalDescontos, totalLiquido, totalServidores } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })
  try {
    if (status !== undefined) await db.$queryRaw`UPDATE Folha SET status = ${status} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (totalBruto !== undefined) await db.$queryRaw`UPDATE Folha SET totalBruto = ${totalBruto} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (totalDescontos !== undefined) await db.$queryRaw`UPDATE Folha SET totalDescontos = ${totalDescontos} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (totalLiquido !== undefined) await db.$queryRaw`UPDATE Folha SET totalLiquido = ${totalLiquido} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (totalServidores !== undefined) await db.$queryRaw`UPDATE Folha SET totalServidores = ${totalServidores} WHERE id = ${id} AND municipioId = ${municipioId}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
