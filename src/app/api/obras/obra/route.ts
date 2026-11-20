import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const status = searchParams.get('status')
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = 20
  const offset = (page - 1) * limit

  try {
    if (id) {
      const rows = await db.$queryRaw<any[]>`SELECT * FROM Obra WHERE id = ${id} AND municipioId = ${municipioId} LIMIT 1`
      if (!rows.length) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
      return NextResponse.json({ obra: rows[0] })
    }
    let rows: any[]
    if (status) {
      rows = await db.$queryRaw<any[]>`
        SELECT * FROM Obra WHERE municipioId = ${municipioId} AND status = ${status}
        ORDER BY dataInicio DESC LIMIT ${limit} OFFSET ${offset}`
    } else {
      rows = await db.$queryRaw<any[]>`
        SELECT * FROM Obra WHERE municipioId = ${municipioId}
        ORDER BY dataInicio DESC LIMIT ${limit} OFFSET ${offset}`
    }
    const [total] = await db.$queryRaw<any[]>`SELECT COUNT(*) AS n FROM Obra WHERE municipioId = ${municipioId}`
    return NextResponse.json({ obras: rows, total: Number(total.n), page, limit })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { nome, descricao, endereco, bairro, tipo, fonte, licitacaoId,
    valorContrato, dataInicio, dataPrevistaConclusao, executora, anotacaoArt,
    responsavelTecnico, observacoes } = await req.json()
  if (!nome?.trim()) return NextResponse.json({ erro: 'Nome obrigatório' }, { status: 400 })
  try {
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO Obra (id, municipioId, nome, descricao, endereco, bairro, tipo, fonte,
                        licitacaoId, valorContrato, dataInicio, dataPrevistaConclusao,
                        executora, anotacaoArt, responsavelTecnico, observacoes)
      VALUES (${id}, ${municipioId}, ${nome.trim()}, ${descricao || null},
              ${endereco || null}, ${bairro || null}, ${tipo || null},
              ${fonte || null}, ${licitacaoId || null}, ${valorContrato || null},
              ${dataInicio || null}, ${dataPrevistaConclusao || null},
              ${executora || null}, ${anotacaoArt || null}, ${responsavelTecnico || null},
              ${observacoes || null})`
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, status, percentualConcluido, valorExecutado, dataConclusao, observacoes } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })
  try {
    if (status !== undefined) await db.$queryRaw`UPDATE Obra SET status = ${status} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (percentualConcluido !== undefined) await db.$queryRaw`UPDATE Obra SET percentualConcluido = ${percentualConcluido} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (valorExecutado !== undefined) await db.$queryRaw`UPDATE Obra SET valorExecutado = ${valorExecutado} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (dataConclusao !== undefined) await db.$queryRaw`UPDATE Obra SET dataConclusao = ${dataConclusao} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (observacoes !== undefined) await db.$queryRaw`UPDATE Obra SET observacoes = ${observacoes} WHERE id = ${id} AND municipioId = ${municipioId}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
