import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const bemId = searchParams.get('bemId')
  const ano = searchParams.get('ano') ?? new Date().getFullYear()

  try {
    if (bemId) {
      const bem = await db.$queryRaw`
        SELECT id, descricao, tombamento, valorAquisicao, dataAquisicao
        FROM BemPatrimonial WHERE id = ${bemId} AND municipioId = ${municipioId} LIMIT 1`
      return NextResponse.json({ bem: bem[0] ?? null })
    }
    // Resumo de bens com valor atual para o exercício
    const rows = await db.$queryRaw`
      SELECT id, descricao, tombamento, categoria, valorAquisicao, valorAtual, dataAquisicao
      FROM BemPatrimonial
      WHERE municipioId = ${municipioId} AND ativo = 1 AND valorAquisicao IS NOT NULL
      ORDER BY descricao LIMIT 200`
    return NextResponse.json({ bens: rows, ano })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { bemId, valorDepreciacao, ano, taxaAnual, metodo } = await req.json()
  if (!bemId || !valorDepreciacao || !ano)
    return NextResponse.json({ erro: 'Dados obrigatórios faltando' }, { status: 400 })
  try {
    // Atualiza valorAtual do bem
    await db.$queryRaw`
      UPDATE BemPatrimonial
      SET valorAtual = GREATEST(0, valorAtual - ${valorDepreciacao})
      WHERE id = ${bemId} AND municipioId = ${municipioId}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
