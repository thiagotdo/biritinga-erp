import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const categoria = searchParams.get('categoria')
  const estado = searchParams.get('estado')

  try {
    // Summary by category
    const categorias = await db.$queryRaw<any[]>`
      SELECT categoria,
        COUNT(*) AS total,
        SUM(CASE WHEN estado = 'OTIMO' THEN 1 ELSE 0 END) AS otimo,
        SUM(CASE WHEN estado = 'BOM' THEN 1 ELSE 0 END) AS bom,
        SUM(CASE WHEN estado = 'REGULAR' THEN 1 ELSE 0 END) AS regular,
        SUM(CASE WHEN estado = 'RUIM' THEN 1 ELSE 0 END) AS ruim,
        SUM(CASE WHEN estado = 'INSERVIVEL' THEN 1 ELSE 0 END) AS inservivel,
        SUM(valorAtual) AS valorTotal
      FROM BemPatrimonial
      WHERE municipioId = ${municipioId} AND ativo = 1
      GROUP BY categoria
      ORDER BY categoria`

    const [totais] = await db.$queryRaw<any[]>`
      SELECT COUNT(*) AS total, SUM(valorAtual) AS valorTotal, SUM(valorAquisicao) AS valorAquisicao
      FROM BemPatrimonial WHERE municipioId = ${municipioId} AND ativo = 1`

    return NextResponse.json({
      categorias: categorias.map((c: any) => ({ ...c, total: Number(c.total), valorTotal: Number(c.valorTotal) })),
      totais: { total: Number(totais.total), valorTotal: Number(totais.valorTotal), valorAquisicao: Number(totais.valorAquisicao) }
    })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
