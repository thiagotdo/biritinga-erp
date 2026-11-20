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
      const obra = await db.$queryRaw<any[]>`SELECT * FROM Obra WHERE id = ${obraId} AND municipioId = ${municipioId} LIMIT 1`
      if (!obra.length) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
      const contrato = obra[0].licitacaoId
        ? await db.$queryRaw<any[]>`SELECT * FROM ContratoAdm WHERE licitacaoId = ${obra[0].licitacaoId} AND municipioId = ${municipioId} LIMIT 1`
        : []
      return NextResponse.json({ obra: obra[0], contrato: contrato[0] ?? null })
    }
    const rows = await db.$queryRaw<any[]>`
      SELECT o.id, o.nome, o.valorContrato, o.executora, o.dataInicio,
             c.numero AS contratoNumero, c.contratadoNome AS fornecedor
      FROM Obra o
      LEFT JOIN ContratoAdm c ON c.licitacaoId = o.licitacaoId
      WHERE o.municipioId = ${municipioId}
      ORDER BY o.dataInicio DESC LIMIT 50`
    return NextResponse.json({ contratos: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
