import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const id       = searchParams.get('id')
  const busca    = searchParams.get('busca')
  const categoria = searchParams.get('categoria')
  const baixo    = searchParams.get('baixoEstoque')
  const stats    = searchParams.get('stats')

  try {
    if (id) {
      const rows = await db.$queryRaw`
        SELECT i.*, COALESCE((
          SELECT SUM(CASE WHEN m.tipo='ENTRADA' OR m.tipo='DEVOLUCAO' THEN m.quantidade ELSE -m.quantidade END)
          FROM MovimentacaoEstoque m WHERE m.itemId = i.id
        ), 0) AS movTotal
        FROM ItemAlmoxarifado i WHERE i.id = ${id} AND i.municipioId = ${municipioId} LIMIT 1`
      if (!rows.length) return NextResponse.json({ erro: 'Item não encontrado' }, { status: 404 })
      return NextResponse.json({ item: rows[0] })
    }

    if (stats) {
      const totCats = await db.$queryRaw`
        SELECT categoria, COUNT(*) AS total, SUM(quantidadeAtual) AS qtdTotal
        FROM ItemAlmoxarifado WHERE municipioId = ${municipioId} AND ativo = 1
        GROUP BY categoria`
      const totalItens = await db.$queryRaw`
        SELECT COUNT(*) AS t FROM ItemAlmoxarifado WHERE municipioId = ${municipioId} AND ativo = 1`
      const baixoEstq = await db.$queryRaw`
        SELECT COUNT(*) AS t FROM ItemAlmoxarifado
        WHERE municipioId = ${municipioId} AND ativo = 1 AND quantidadeAtual <= quantidadeMinima`
      const semEstq = await db.$queryRaw`
        SELECT COUNT(*) AS t FROM ItemAlmoxarifado
        WHERE municipioId = ${municipioId} AND ativo = 1 AND quantidadeAtual = 0`
      return NextResponse.json({
        totalItens: Number(totalItens[0]?.t ?? 0),
        baixoEstoque: Number(baixoEstq[0]?.t ?? 0),
        semEstoque: Number(semEstq[0]?.t ?? 0),
        porCategoria: totCats
      })
    }

    let rows: any[]
    if (busca && busca.length >= 2) {
      const like = `%${busca}%`
      rows = await db.$queryRaw`
        SELECT * FROM ItemAlmoxarifado
        WHERE municipioId = ${municipioId} AND ativo = 1
          AND (nome LIKE ${like} OR codigo LIKE ${like} OR descricao LIKE ${like})
        ORDER BY nome LIMIT 50`
    } else if (baixo) {
      rows = await db.$queryRaw`
        SELECT * FROM ItemAlmoxarifado
        WHERE municipioId = ${municipioId} AND ativo = 1 AND quantidadeAtual <= quantidadeMinima
        ORDER BY quantidadeAtual ASC LIMIT 50`
    } else if (categoria) {
      rows = await db.$queryRaw`
        SELECT * FROM ItemAlmoxarifado
        WHERE municipioId = ${municipioId} AND ativo = 1 AND categoria = ${categoria}
        ORDER BY nome`
    } else {
      rows = await db.$queryRaw`
        SELECT * FROM ItemAlmoxarifado
        WHERE municipioId = ${municipioId} AND ativo = 1
        ORDER BY nome`
    }
    return NextResponse.json({ itens: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const body = await req.json()
  const { nome, codigo, descricao, categoria, unidade,
    quantidadeAtual, quantidadeMinima, localizacao } = body

  if (!nome) return NextResponse.json({ erro: 'Nome obrigatório' }, { status: 400 })

  try {
    const id = randomUUID()
    // Gerar código automático se não fornecido
    const codigoFinal = codigo || `ALM${Date.now().toString().slice(-6)}`

    await db.$queryRaw`
      INSERT INTO ItemAlmoxarifado
        (id, municipioId, codigo, nome, descricao, categoria, unidade,
         quantidadeAtual, quantidadeMinima, localizacao, ativo, criadoEm, atualizadoEm)
      VALUES (${id}, ${municipioId}, ${codigoFinal}, ${nome}, ${descricao || null},
              ${categoria || 'MATERIAL_CONSUMO'}, ${unidade || 'UN'},
              ${quantidadeAtual ?? 0}, ${quantidadeMinima ?? 0},
              ${localizacao || null}, 1, NOW(), NOW())`

    return NextResponse.json({ id, codigo: codigoFinal }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, ...data } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

  try {
    const fields = Object.entries(data)
      .filter(([k]) => ['nome','descricao','categoria','unidade','quantidadeMinima','localizacao','ativo'].includes(k))
    if (!fields.length) return NextResponse.json({ erro: 'Nenhum campo para atualizar' }, { status: 400 })

    for (const [col, val] of fields) {
      await db.$queryRaw`UPDATE ItemAlmoxarifado SET ${col as any} = ${val}, atualizadoEm = NOW() WHERE id = ${id} AND municipioId = ${municipioId}`
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
