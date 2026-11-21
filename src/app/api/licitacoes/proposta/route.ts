import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const licitacaoId = searchParams.get('licitacaoId')

  if (!licitacaoId) return NextResponse.json({ erro: 'licitacaoId obrigatório' }, { status: 400 })

  try {
    // Propostas ficam linkadas à licitação via fornecedorVencedor e valorHomologado
    const rows = await db.$queryRaw`
      SELECT * FROM Licitacao WHERE id = ${licitacaoId} AND municipioId = ${municipioId} LIMIT 1`
    return NextResponse.json({ licitacao: rows[0] ?? null })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
