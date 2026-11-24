import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get('itemId')
  const tipo   = searchParams.get('tipo')
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit  = 50
  const offset = (page - 1) * limit

  try {
    let rows: any[]
    if (itemId) {
      rows = await db.$queryRaw`
        SELECT m.*, i.nome AS itemNome, i.unidade
        FROM MovimentacaoConsumo m
        JOIN ItemAlmoxarifado i ON i.id = m.itemId
        WHERE m.municipioId = ${municipioId} AND m.itemId = ${itemId}
        ORDER BY m.dataMovimento DESC LIMIT ${limit}`
    } else if (tipo) {
      rows = await db.$queryRaw`
        SELECT m.*, i.nome AS itemNome, i.unidade
        FROM MovimentacaoConsumo m
        JOIN ItemAlmoxarifado i ON i.id = m.itemId
        WHERE m.municipioId = ${municipioId} AND m.tipo = ${tipo}
        ORDER BY m.dataMovimento DESC LIMIT ${limit} OFFSET ${offset}`
    } else {
      rows = await db.$queryRaw`
        SELECT m.*, i.nome AS itemNome, i.unidade
        FROM MovimentacaoConsumo m
        JOIN ItemAlmoxarifado i ON i.id = m.itemId
        WHERE m.municipioId = ${municipioId}
        ORDER BY m.dataMovimento DESC LIMIT ${limit} OFFSET ${offset}`
    }
    return NextResponse.json({ movimentacoes: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const body = await req.json()
  const { itemId, tipo, quantidade, motivo, fornecedor, numeroNF,
    setor, solicitante, observacoes, usuarioNome } = body

  if (!itemId || !tipo || !quantidade)
    return NextResponse.json({ erro: 'itemId, tipo e quantidade são obrigatórios' }, { status: 400 })

  if (!['ENTRADA','SAIDA','AJUSTE','DEVOLUCAO'].includes(tipo))
    return NextResponse.json({ erro: 'Tipo inválido' }, { status: 400 })

  try {
    // Buscar quantidade atual
    const item = await db.$queryRaw`
      SELECT quantidadeAtual FROM ItemAlmoxarifado WHERE id = ${itemId} AND municipioId = ${municipioId} LIMIT 1`
    if (!item.length) return NextResponse.json({ erro: 'Item não encontrado' }, { status: 404 })

    const qtdAnterior = Number(item[0].quantidadeAtual ?? 0)
    const qtd = Number(quantidade)
    let qtdPosterior: number

    if (tipo === 'ENTRADA' || tipo === 'DEVOLUCAO') {
      qtdPosterior = qtdAnterior + qtd
    } else if (tipo === 'SAIDA') {
      if (qtdAnterior < qtd) return NextResponse.json({ erro: 'Quantidade insuficiente em estoque' }, { status: 400 })
      qtdPosterior = qtdAnterior - qtd
    } else { // AJUSTE
      qtdPosterior = qtd
    }

    const id = randomUUID()
    await db.$queryRaw`
      INSERT INTO MovimentacaoConsumo
        (id, municipioId, itemId, tipo, quantidade, quantidadeAnterior, quantidadePosterior,
         motivo, fornecedor, numeroNF, setor, solicitante, observacoes, usuarioNome,
         dataMovimento, criadoEm, atualizadoEm)
      VALUES (${id}, ${municipioId}, ${itemId}, ${tipo}, ${qtd}, ${qtdAnterior}, ${qtdPosterior},
              ${motivo || null}, ${fornecedor || null}, ${numeroNF || null},
              ${setor || null}, ${solicitante || null}, ${observacoes || null},
              ${usuarioNome || null}, NOW(), NOW(), NOW())`

    // Atualizar quantidade no item
    await db.$queryRaw`
      UPDATE ItemAlmoxarifado SET quantidadeAtual = ${qtdPosterior}, atualizadoEm = NOW()
      WHERE id = ${itemId} AND municipioId = ${municipioId}`

    return NextResponse.json({ id, quantidadePosterior: qtdPosterior }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
