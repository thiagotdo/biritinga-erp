import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const status = searchParams.get('status')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 20
  const offset = (page - 1) * limit

  try {
    if (id) {
      const rows = await db.$queryRaw`
        SELECT * FROM Requisicao WHERE id = ${id} AND municipioId = ${municipioId} LIMIT 1`
      if (!rows.length) return NextResponse.json({ erro: 'Requisição não encontrada' }, { status: 404 })
      const itens = await db.$queryRaw`
        SELECT ir.*, cm.descricao AS materialDesc, cm.unidadeMedida
        FROM item_requisicao ir
        LEFT JOIN CatalogoMaterial cm ON cm.id = ir.catalogoId
        WHERE ir.requisicaoId = ${id}`
      return NextResponse.json({ requisicao: rows[0], itens })
    }

    const countR = status
      ? await db.$queryRaw`SELECT COUNT(*) AS t FROM Requisicao WHERE municipioId = ${municipioId} AND status = ${status}`
      : await db.$queryRaw`SELECT COUNT(*) AS t FROM Requisicao WHERE municipioId = ${municipioId}`

    const rows = status
      ? await db.$queryRaw`
          SELECT * FROM Requisicao WHERE municipioId = ${municipioId} AND status = ${status}
          ORDER BY dataRequisicao DESC LIMIT ${limit} OFFSET ${offset}`
      : await db.$queryRaw`
          SELECT * FROM Requisicao WHERE municipioId = ${municipioId}
          ORDER BY dataRequisicao DESC LIMIT ${limit} OFFSET ${offset}`

    const total = Number(countR[0]?.t ?? 0)
    return NextResponse.json({ requisicoes: rows, total, page, pages: Math.ceil(total / limit) })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { titulo, justificativa, secretaria, solicitante, prioridade,
    dataLimite, valorEstimado, observacao, itens } = await req.json()

  if (!titulo || !secretaria || !solicitante)
    return NextResponse.json({ erro: 'Título, secretaria e solicitante são obrigatórios' }, { status: 400 })

  try {
    const ano = new Date().getFullYear()
    const countR = await db.$queryRaw`
      SELECT COUNT(*) AS t FROM Requisicao
      WHERE municipioId = ${municipioId} AND YEAR(dataRequisicao) = ${ano}`
    const seq = Number(countR[0]?.t ?? 0) + 1
    const numero = `REQ-${ano}-${String(seq).padStart(4, '0')}`

    const id = randomUUID()
    await db.$queryRaw`
      INSERT INTO Requisicao (id, municipioId, numero, titulo, justificativa, secretaria,
                              solicitante, prioridade, status, dataRequisicao,
                              dataLimite, valorEstimado, observacao, criadoEm, atualizadoEm)
      VALUES (${id}, ${municipioId}, ${numero}, ${titulo}, ${justificativa || ''},
              ${secretaria}, ${solicitante}, ${prioridade ?? 'NORMAL'},
              'AGUARDANDO_APROVACAO', NOW(),
              ${dataLimite ? new Date(dataLimite) : null},
              ${valorEstimado || null}, ${observacao || null}, NOW(), NOW())`

    // Inserir itens
    if (Array.isArray(itens)) {
      for (const item of itens) {
        const itemId = randomUUID()
        await db.$queryRaw`
          INSERT INTO item_requisicao (id, requisicaoId, descricao, unidade, quantidade,
                                       valorUnitEstimado, especificacao, catalogoId)
          VALUES (${itemId}, ${id}, ${item.descricao}, ${item.unidade ?? 'UN'},
                  ${item.quantidade ?? 1}, ${item.valorUnitEstimado || null},
                  ${item.especificacao || null}, ${item.catalogoId || null})`
      }
    }

    return NextResponse.json({ id, numero }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, status, aprovadoPor, motivoRejeicao } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })
  try {
    if (status === 'APROVADA') {
      await db.$queryRaw`
        UPDATE Requisicao SET status = 'APROVADA', aprovadoPor = ${aprovadoPor || null},
               dataAprovacao = NOW(), atualizadoEm = NOW()
        WHERE id = ${id} AND municipioId = ${municipioId}`
    } else if (status === 'REJEITADA') {
      await db.$queryRaw`
        UPDATE Requisicao SET status = 'REJEITADA',
               motivoRejeicao = ${motivoRejeicao || null}, atualizadoEm = NOW()
        WHERE id = ${id} AND municipioId = ${municipioId}`
    } else if (status) {
      await db.$queryRaw`
        UPDATE Requisicao SET status = ${status}, atualizadoEm = NOW()
        WHERE id = ${id} AND municipioId = ${municipioId}`
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
