import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const status = searchParams.get('status')
  const modalidade = searchParams.get('modalidade')
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = 20
  const offset = (page - 1) * limit

  try {
    if (id) {
      const rows = await db.$queryRaw`SELECT * FROM Licitacao WHERE id = ${id} AND municipioId = ${municipioId} LIMIT 1`
      if (!rows.length) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
      const contratos = await db.$queryRaw`SELECT * FROM ContratoLicitacao WHERE licitacaoId = ${id} AND municipioId = ${municipioId}`
      return NextResponse.json({ licitacao: rows[0], contratos })
    }

    let rows: any[]
    if (status) {
      rows = await db.$queryRaw`
        SELECT * FROM Licitacao WHERE municipioId = ${municipioId} AND status = ${status}
        ORDER BY dataAbertura DESC LIMIT ${limit} OFFSET ${offset}`
    } else if (modalidade) {
      rows = await db.$queryRaw`
        SELECT * FROM Licitacao WHERE municipioId = ${municipioId} AND modalidade = ${modalidade}
        ORDER BY dataAbertura DESC LIMIT ${limit} OFFSET ${offset}`
    } else {
      rows = await db.$queryRaw`
        SELECT * FROM Licitacao WHERE municipioId = ${municipioId}
        ORDER BY dataAbertura DESC LIMIT ${limit} OFFSET ${offset}`
    }
    const [total] = await db.$queryRaw`SELECT COUNT(*) AS n FROM Licitacao WHERE municipioId = ${municipioId}`
    return NextResponse.json({ licitacoes: rows, total: Number(total.n), page, limit })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { numero, modalidade, objeto, valorEstimado, dataAbertura, dataPublicacao,
    unidadeRequisitante, dotacaoOrcamentaria, observacoes } = await req.json()

  if (!numero || !modalidade || !objeto)
    return NextResponse.json({ erro: 'Número, modalidade e objeto obrigatórios' }, { status: 400 })

  try {
    const dup = await db.$queryRaw`SELECT id FROM Licitacao WHERE municipioId = ${municipioId} AND numero = ${numero} LIMIT 1`
    if (dup.length) return NextResponse.json({ erro: 'Número já existe' }, { status: 409 })
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO Licitacao (id, municipioId, numero, modalidade, objeto, valorEstimado,
                             dataAbertura, dataPublicacao, unidadeRequisitante,
                             dotacaoOrcamentaria, observacoes)
      VALUES (${id}, ${municipioId}, ${numero}, ${modalidade}, ${objeto},
              ${valorEstimado || null}, ${dataAbertura || null}, ${dataPublicacao || null},
              ${unidadeRequisitante || null}, ${dotacaoOrcamentaria || null}, ${observacoes || null})`
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, status, valorHomologado, fornecedorVencedor, observacoes } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })
  try {
    if (status !== undefined) await db.$queryRaw`UPDATE Licitacao SET status = ${status} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (valorHomologado !== undefined) await db.$queryRaw`UPDATE Licitacao SET valorHomologado = ${valorHomologado} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (fornecedorVencedor !== undefined) await db.$queryRaw`UPDATE Licitacao SET fornecedorVencedor = ${fornecedorVencedor} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (observacoes !== undefined) await db.$queryRaw`UPDATE Licitacao SET observacoes = ${observacoes} WHERE id = ${id} AND municipioId = ${municipioId}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
