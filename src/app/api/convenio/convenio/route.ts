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
        SELECT * FROM Convenio WHERE id = ${id} AND municipioId = ${municipioId} LIMIT 1`
      if (!rows.length) return NextResponse.json({ erro: 'Convênio não encontrado' }, { status: 404 })
      return NextResponse.json({ convenio: rows[0] })
    }

    const countR = status
      ? await db.$queryRaw`SELECT COUNT(*) AS t FROM Convenio WHERE municipioId = ${municipioId} AND status = ${status} AND ativo = 1`
      : await db.$queryRaw`SELECT COUNT(*) AS t FROM Convenio WHERE municipioId = ${municipioId} AND ativo = 1`

    const rows = status
      ? await db.$queryRaw`
          SELECT id, numero, objeto, concedente, valorTotal, valorRepasse,
                 valorDesembolsado, dataAssinatura, dataFim, status, secretariaExecutora
          FROM Convenio WHERE municipioId = ${municipioId} AND status = ${status} AND ativo = 1
          ORDER BY dataAssinatura DESC LIMIT ${limit} OFFSET ${offset}`
      : await db.$queryRaw`
          SELECT id, numero, objeto, concedente, valorTotal, valorRepasse,
                 valorDesembolsado, dataAssinatura, dataFim, status, secretariaExecutora
          FROM Convenio WHERE municipioId = ${municipioId} AND ativo = 1
          ORDER BY dataAssinatura DESC LIMIT ${limit} OFFSET ${offset}`

    const total = Number(countR[0]?.t ?? 0)
    return NextResponse.json({ convenios: rows, total, page, pages: Math.ceil(total / limit) })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { numero, objeto, concedente, proponente, valorTotal, valorRepasse,
    valorContrapartida, valorDesembolsado, dataAssinatura, dataInicio, dataFim,
    status, programaFederal, orgaoConcedente, processoSEI, linkSIAFI,
    secretariaExecutora, descricao, observacoes } = await req.json()

  if (!numero || !objeto || !concedente || !valorTotal || !dataAssinatura)
    return NextResponse.json({ erro: 'Número, objeto, concedente, valor e data são obrigatórios' }, { status: 400 })

  try {
    const dup = await db.$queryRaw`
      SELECT id FROM Convenio WHERE municipioId = ${municipioId} AND numero = ${numero} LIMIT 1`
    if (dup.length) return NextResponse.json({ erro: 'Número de convênio já cadastrado' }, { status: 409 })

    const id = randomUUID()
    await db.$queryRaw`
      INSERT INTO Convenio (id, municipioId, numero, objeto, concedente, proponente,
                            valorTotal, valorRepasse, valorContrapartida, valorDesembolsado,
                            dataAssinatura, dataInicio, dataFim, status, programaFederal,
                            orgaoConcedente, processoSEI, linkSIAFI, secretariaExecutora,
                            descricao, observacoes, ativo, criadoEm, atualizadoEm)
      VALUES (${id}, ${municipioId}, ${numero}, ${objeto}, ${concedente},
              ${proponente || null}, ${valorTotal}, ${valorRepasse ?? 0},
              ${valorContrapartida ?? 0}, ${valorDesembolsado ?? 0},
              ${new Date(dataAssinatura)},
              ${dataInicio ? new Date(dataInicio) : null},
              ${dataFim ? new Date(dataFim) : null},
              ${status ?? 'VIGENTE'},
              ${programaFederal || null}, ${orgaoConcedente || null},
              ${processoSEI || null}, ${linkSIAFI || null},
              ${secretariaExecutora || null}, ${descricao || null},
              ${observacoes || null}, 1, NOW(), NOW())`

    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, status, valorDesembolsado, dataFim, observacoes } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })
  try {
    if (status !== undefined)
      await db.$queryRaw`UPDATE Convenio SET status = ${status}, atualizadoEm = NOW() WHERE id = ${id} AND municipioId = ${municipioId}`
    if (valorDesembolsado !== undefined)
      await db.$queryRaw`UPDATE Convenio SET valorDesembolsado = ${valorDesembolsado}, atualizadoEm = NOW() WHERE id = ${id} AND municipioId = ${municipioId}`
    if (dataFim !== undefined)
      await db.$queryRaw`UPDATE Convenio SET dataFim = ${dataFim ? new Date(dataFim) : null}, atualizadoEm = NOW() WHERE id = ${id} AND municipioId = ${municipioId}`
    if (observacoes !== undefined)
      await db.$queryRaw`UPDATE Convenio SET observacoes = ${observacoes}, atualizadoEm = NOW() WHERE id = ${id} AND municipioId = ${municipioId}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
