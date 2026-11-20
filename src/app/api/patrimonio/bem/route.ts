import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const q = searchParams.get('q')
  const categoria = searchParams.get('categoria')
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = 20
  const offset = (page - 1) * limit

  try {
    if (id) {
      const rows = await db.$queryRaw<any[]>`SELECT * FROM BemPatrimonial WHERE id = ${id} AND municipioId = ${municipioId} LIMIT 1`
      return NextResponse.json({ bem: rows[0] ?? null })
    }
    if (q && q.length >= 3) {
      const like = `%${q}%`
      const rows = await db.$queryRaw<any[]>`
        SELECT * FROM BemPatrimonial
        WHERE municipioId = ${municipioId} AND ativo = 1
          AND (descricao LIKE ${like} OR tombamento LIKE ${like} OR plaqueta LIKE ${like})
        LIMIT 30`
      return NextResponse.json({ bens: rows })
    }
    let rows: any[]
    if (categoria) {
      rows = await db.$queryRaw<any[]>`
        SELECT * FROM BemPatrimonial
        WHERE municipioId = ${municipioId} AND ativo = 1 AND categoria = ${categoria}
        ORDER BY descricao LIMIT ${limit} OFFSET ${offset}`
    } else {
      rows = await db.$queryRaw<any[]>`
        SELECT * FROM BemPatrimonial WHERE municipioId = ${municipioId} AND ativo = 1
        ORDER BY descricao LIMIT ${limit} OFFSET ${offset}`
    }
    const [total] = await db.$queryRaw<any[]>`SELECT COUNT(*) AS n FROM BemPatrimonial WHERE municipioId = ${municipioId} AND ativo = 1`
    return NextResponse.json({ bens: rows, total: Number(total.n), page, limit })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { descricao, tombamento, plaqueta, categoria, especificacao,
    marca, modelo, serie, valorAquisicao, dataAquisicao, fornecedor,
    localizacao, unidadeId, responsavelId, estado } = await req.json()
  if (!descricao?.trim() || !tombamento)
    return NextResponse.json({ erro: 'Descrição e tombamento obrigatórios' }, { status: 400 })
  try {
    const dup = await db.$queryRaw<any[]>`SELECT id FROM BemPatrimonial WHERE municipioId = ${municipioId} AND tombamento = ${tombamento} AND ativo = 1 LIMIT 1`
    if (dup.length) return NextResponse.json({ erro: 'Tombamento já existe' }, { status: 409 })
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO BemPatrimonial (id, municipioId, descricao, tombamento, plaqueta, categoria,
                                  especificacao, marca, modelo, serie, valorAquisicao,
                                  dataAquisicao, fornecedor, localizacao, unidadeId, responsavelId, estado)
      VALUES (${id}, ${municipioId}, ${descricao.trim()}, ${tombamento}, ${plaqueta || null},
              ${categoria || null}, ${especificacao || null}, ${marca || null}, ${modelo || null},
              ${serie || null}, ${valorAquisicao || null}, ${dataAquisicao || null},
              ${fornecedor || null}, ${localizacao || null}, ${unidadeId || null},
              ${responsavelId || null}, ${estado ?? 'BOM'})`
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, estado, localizacao, responsavelId, unidadeId, valorAtual, ativo } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })
  try {
    if (estado !== undefined) await db.$queryRaw`UPDATE BemPatrimonial SET estado = ${estado} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (localizacao !== undefined) await db.$queryRaw`UPDATE BemPatrimonial SET localizacao = ${localizacao} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (responsavelId !== undefined) await db.$queryRaw`UPDATE BemPatrimonial SET responsavelId = ${responsavelId} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (unidadeId !== undefined) await db.$queryRaw`UPDATE BemPatrimonial SET unidadeId = ${unidadeId} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (valorAtual !== undefined) await db.$queryRaw`UPDATE BemPatrimonial SET valorAtual = ${valorAtual} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (ativo !== undefined) await db.$queryRaw`UPDATE BemPatrimonial SET ativo = ${ativo ? 1 : 0} WHERE id = ${id} AND municipioId = ${municipioId}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
