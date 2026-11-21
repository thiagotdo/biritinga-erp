import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function municipioId(req: NextRequest) {
  return req.headers.get('x-erp-municipio-id') ?? ''
}

export async function GET(req: NextRequest) {
  const mid = municipioId(req)
  const { searchParams } = new URL(req.url)
  const unidadeId  = searchParams.get('unidadeId')
  const critico    = searchParams.get('critico') === '1'
  const busca      = searchParams.get('busca')

  try {
    let medicamentos: any[]

    if (busca) {
      const like = `%${busca}%`
      medicamentos = await db.$queryRaw`
        SELECT m.*, u.nome AS unidadeNome
        FROM MedicamentoEstoque m
        LEFT JOIN UnidadeSaude u ON u.id = m.unidadeId
        WHERE m.municipioId = ${mid} AND m.ativo = 1
          AND (m.nome LIKE ${like} OR m.principioAtivo LIKE ${like})
        ORDER BY m.nome
        LIMIT 50`
    } else if (unidadeId && critico) {
      medicamentos = await db.$queryRaw`
        SELECT m.*, u.nome AS unidadeNome
        FROM MedicamentoEstoque m
        LEFT JOIN UnidadeSaude u ON u.id = m.unidadeId
        WHERE m.municipioId = ${mid} AND m.unidadeId = ${unidadeId}
          AND m.ativo = 1 AND m.quantidadeTotal <= m.quantidadeMin
        ORDER BY m.quantidadeTotal ASC`
    } else if (unidadeId) {
      medicamentos = await db.$queryRaw`
        SELECT m.*, u.nome AS unidadeNome
        FROM MedicamentoEstoque m
        LEFT JOIN UnidadeSaude u ON u.id = m.unidadeId
        WHERE m.municipioId = ${mid} AND m.unidadeId = ${unidadeId} AND m.ativo = 1
        ORDER BY m.nome`
    } else if (critico) {
      medicamentos = await db.$queryRaw`
        SELECT m.*, u.nome AS unidadeNome
        FROM MedicamentoEstoque m
        LEFT JOIN UnidadeSaude u ON u.id = m.unidadeId
        WHERE m.municipioId = ${mid} AND m.ativo = 1
          AND m.quantidadeTotal <= m.quantidadeMin
        ORDER BY m.quantidadeTotal ASC`
    } else {
      medicamentos = await db.$queryRaw`
        SELECT m.*, u.nome AS unidadeNome
        FROM MedicamentoEstoque m
        LEFT JOIN UnidadeSaude u ON u.id = m.unidadeId
        WHERE m.municipioId = ${mid} AND m.ativo = 1
        ORDER BY m.nome`
    }

    // Adicionar flag critico
    const result = medicamentos.map(m => ({
      ...m, critico: m.quantidadeTotal <= m.quantidadeMin
    }))

    return NextResponse.json({ medicamentos: result })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const mid = municipioId(req)
  const { unidadeId, nome, principioAtivo, apresentacao, lote,
    dataVencimento, quantidadeTotal, quantidadeMin, valorUnitario } = await req.json()

  if (!unidadeId || !nome?.trim())
    return NextResponse.json({ erro: 'Unidade e nome obrigatórios' }, { status: 400 })

  try {
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO MedicamentoEstoque (id, municipioId, unidadeId, nome, principioAtivo,
                                      apresentacao, lote, dataVencimento, quantidadeTotal,
                                      quantidadeMin, valorUnitario)
      VALUES (${id}, ${mid}, ${unidadeId}, ${nome.trim()}, ${principioAtivo || null},
              ${apresentacao || null}, ${lote || null}, ${dataVencimento || null},
              ${quantidadeTotal ?? 0}, ${quantidadeMin ?? 10}, ${valorUnitario || null})`
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const mid = municipioId(req)
  const { id, quantidadeTotal, quantidadeMin, ativo } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })
  try {
    if (quantidadeTotal !== undefined) await db.$queryRaw`UPDATE MedicamentoEstoque SET quantidadeTotal = ${quantidadeTotal} WHERE id = ${id} AND municipioId = ${mid}`
    if (quantidadeMin !== undefined) await db.$queryRaw`UPDATE MedicamentoEstoque SET quantidadeMin = ${quantidadeMin} WHERE id = ${id} AND municipioId = ${mid}`
    if (ativo !== undefined) await db.$queryRaw`UPDATE MedicamentoEstoque SET ativo = ${ativo ? 1 : 0} WHERE id = ${id} AND municipioId = ${mid}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
