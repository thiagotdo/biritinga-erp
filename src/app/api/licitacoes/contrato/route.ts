import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const licitacaoId = searchParams.get('licitacaoId')
  const status = searchParams.get('status') ?? 'VIGENTE'

  try {
    if (id) {
      const rows = await db.$queryRaw<any[]>`SELECT * FROM ContratoAdm WHERE id = ${id} AND municipioId = ${municipioId} LIMIT 1`
      return NextResponse.json({ contrato: rows[0] ?? null })
    }
    if (licitacaoId) {
      const rows = await db.$queryRaw<any[]>`
        SELECT * FROM ContratoAdm WHERE municipioId = ${municipioId} AND licitacaoId = ${licitacaoId}
        ORDER BY dataInicio DESC`
      return NextResponse.json({ contratos: rows })
    }
    const rows = await db.$queryRaw<any[]>`
      SELECT c.*, l.numero AS licitacaoNumero, l.objeto AS licitacaoObjeto
      FROM ContratoAdm c LEFT JOIN Licitacao l ON l.id = c.licitacaoId
      WHERE c.municipioId = ${municipioId} AND c.status = ${status}
      ORDER BY c.dataFim LIMIT 100`
    return NextResponse.json({ contratos: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { licitacaoId, numero, contratadoNome, contratadoCnpj, objeto, valorTotal,
    dataInicio, dataFim, dataPublicacao, dotacao, gestor, observacoes } = await req.json()
  if (!numero || !contratadoNome || !valorTotal)
    return NextResponse.json({ erro: 'Número, contratado e valor obrigatórios' }, { status: 400 })
  try {
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO ContratoAdm (id, municipioId, licitacaoId, numero, contratadoNome,
                               contratadoCnpj, objeto, valorTotal, dataInicio, dataFim,
                               dataPublicacao, dotacao, gestor, observacoes)
      VALUES (${id}, ${municipioId}, ${licitacaoId || null}, ${numero}, ${contratadoNome},
              ${contratadoCnpj || ''}, ${objeto || ''}, ${valorTotal},
              ${dataInicio || new Date().toISOString().slice(0,10)},
              ${dataFim || new Date(Date.now() + 365*86400000).toISOString().slice(0,10)},
              ${dataPublicacao || null}, ${dotacao || null}, ${gestor || null}, ${observacoes || null})`
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, status, valorAditivos, dataFim, observacoes } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })
  try {
    if (status !== undefined) await db.$queryRaw`UPDATE ContratoAdm SET status = ${status} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (dataFim !== undefined) await db.$queryRaw`UPDATE ContratoAdm SET dataFim = ${dataFim} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (valorAditivos !== undefined) await db.$queryRaw`UPDATE ContratoAdm SET valorAditivos = valorAditivos + ${valorAditivos} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (observacoes !== undefined) await db.$queryRaw`UPDATE ContratoAdm SET observacoes = ${observacoes} WHERE id = ${id} AND municipioId = ${municipioId}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
