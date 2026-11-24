import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const busca = searchParams.get('busca')
  const natureza = searchParams.get('natureza')
  const baixoEstoque = searchParams.get('baixoEstoque')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 20
  const offset = (page - 1) * limit

  try {
    if (id) {
      const rows = await db.$queryRaw`
        SELECT * FROM CatalogoMaterial WHERE id = ${id} AND municipioId = ${municipioId} LIMIT 1`
      if (!rows.length) return NextResponse.json({ erro: 'Material não encontrado' }, { status: 404 })
      return NextResponse.json({ material: rows[0] })
    }

    if (busca && busca.length >= 2) {
      const like = `%${busca}%`
      const rows = await db.$queryRaw`
        SELECT id, codigo, descricao, unidadeMedida, natureza, estoqueAtual,
               estoqueMinimo, custoUnitario, situacao
        FROM CatalogoMaterial
        WHERE municipioId = ${municipioId} AND ativo = 1
          AND (descricao LIKE ${like} OR codigo LIKE ${like})
        ORDER BY descricao LIMIT 50`
      return NextResponse.json({ materiais: rows })
    }

    let rows, countR
    if (baixoEstoque === '1') {
      countR = await db.$queryRaw`
        SELECT COUNT(*) AS t FROM CatalogoMaterial
        WHERE municipioId = ${municipioId} AND ativo = 1
          AND estoqueAtual <= estoqueMinimo`
      rows = await db.$queryRaw`
        SELECT id, codigo, descricao, unidadeMedida, natureza, estoqueAtual,
               estoqueMinimo, custoUnitario, situacao
        FROM CatalogoMaterial
        WHERE municipioId = ${municipioId} AND ativo = 1
          AND estoqueAtual <= estoqueMinimo
        ORDER BY descricao LIMIT ${limit} OFFSET ${offset}`
    } else if (natureza) {
      countR = await db.$queryRaw`
        SELECT COUNT(*) AS t FROM CatalogoMaterial
        WHERE municipioId = ${municipioId} AND ativo = 1 AND natureza = ${natureza}`
      rows = await db.$queryRaw`
        SELECT id, codigo, descricao, unidadeMedida, natureza, estoqueAtual,
               estoqueMinimo, custoUnitario, situacao
        FROM CatalogoMaterial
        WHERE municipioId = ${municipioId} AND ativo = 1 AND natureza = ${natureza}
        ORDER BY descricao LIMIT ${limit} OFFSET ${offset}`
    } else {
      countR = await db.$queryRaw`
        SELECT COUNT(*) AS t FROM CatalogoMaterial WHERE municipioId = ${municipioId} AND ativo = 1`
      rows = await db.$queryRaw`
        SELECT id, codigo, descricao, unidadeMedida, natureza, estoqueAtual,
               estoqueMinimo, custoUnitario, situacao
        FROM CatalogoMaterial
        WHERE municipioId = ${municipioId} AND ativo = 1
        ORDER BY descricao LIMIT ${limit} OFFSET ${offset}`
    }

    const total = Number(countR[0]?.t ?? 0)
    return NextResponse.json({ materiais: rows, total, page, pages: Math.ceil(total / limit) })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { codigo, descricao, especificacao, unidadeMedida, natureza,
    grupoCatmat, classeCatmat, estoqueMinimo, estoqueMaximo, pontoPedido,
    custoUnitario, estoqueAtual, localizacao, fornecedorHabitual } = await req.json()

  if (!codigo || !descricao || !unidadeMedida)
    return NextResponse.json({ erro: 'Código, descrição e unidade são obrigatórios' }, { status: 400 })

  try {
    const dup = await db.$queryRaw`
      SELECT id FROM CatalogoMaterial WHERE municipioId = ${municipioId} AND codigo = ${codigo} LIMIT 1`
    if (dup.length) return NextResponse.json({ erro: 'Código já cadastrado' }, { status: 409 })

    const id = randomUUID()
    await db.$queryRaw`
      INSERT INTO CatalogoMaterial (id, municipioId, codigo, descricao, especificacao,
                                    unidadeMedida, natureza, grupoCatmat, classeCatmat,
                                    estoqueMinimo, estoqueMaximo, pontoPedido,
                                    custoUnitario, estoqueAtual, localizacao,
                                    fornecedorHabitual, ativo, situacao, criadoEm, atualizadoEm)
      VALUES (${id}, ${municipioId}, ${codigo}, ${descricao}, ${especificacao || null},
              ${unidadeMedida}, ${natureza ?? 'CONSUMO'},
              ${grupoCatmat || null}, ${classeCatmat || null},
              ${estoqueMinimo ?? 0}, ${estoqueMaximo || null}, ${pontoPedido || null},
              ${custoUnitario ?? 0}, ${estoqueAtual ?? 0}, ${localizacao || null},
              ${fornecedorHabitual || null}, 1, 'ATIVO', NOW(), NOW())`

    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, estoqueAtual, custoUnitario, estoqueMinimo, situacao, localizacao } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })
  try {
    if (estoqueAtual !== undefined)
      await db.$queryRaw`UPDATE CatalogoMaterial SET estoqueAtual = ${estoqueAtual}, atualizadoEm = NOW() WHERE id = ${id} AND municipioId = ${municipioId}`
    if (custoUnitario !== undefined)
      await db.$queryRaw`UPDATE CatalogoMaterial SET custoUnitario = ${custoUnitario}, atualizadoEm = NOW() WHERE id = ${id} AND municipioId = ${municipioId}`
    if (estoqueMinimo !== undefined)
      await db.$queryRaw`UPDATE CatalogoMaterial SET estoqueMinimo = ${estoqueMinimo}, atualizadoEm = NOW() WHERE id = ${id} AND municipioId = ${municipioId}`
    if (situacao !== undefined)
      await db.$queryRaw`UPDATE CatalogoMaterial SET situacao = ${situacao}, atualizadoEm = NOW() WHERE id = ${id} AND municipioId = ${municipioId}`
    if (localizacao !== undefined)
      await db.$queryRaw`UPDATE CatalogoMaterial SET localizacao = ${localizacao}, atualizadoEm = NOW() WHERE id = ${id} AND municipioId = ${municipioId}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
