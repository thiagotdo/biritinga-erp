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
  const busca = searchParams.get('busca')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 20
  const offset = (page - 1) * limit

  try {
    if (id) {
      const rows = await db.$queryRaw`
        SELECT * FROM Diaria WHERE id = ${id} AND municipioId = ${municipioId} LIMIT 1`
      if (!rows.length) return NextResponse.json({ erro: 'Diária não encontrada' }, { status: 404 })
      return NextResponse.json({ diaria: rows[0] })
    }

    if (busca && busca.length >= 2) {
      const like = `%${busca}%`
      const rows = await db.$queryRaw`
        SELECT id, numero, nomeServidor, cargo, destino, dataPartida, dataRetorno,
               quantidadeDiarias, valorTotal, status, secretaria
        FROM Diaria
        WHERE municipioId = ${municipioId}
          AND (nomeServidor LIKE ${like} OR destino LIKE ${like} OR numero LIKE ${like})
        ORDER BY dataPartida DESC LIMIT 50`
      return NextResponse.json({ diarias: rows })
    }

    const countR = status
      ? await db.$queryRaw`SELECT COUNT(*) AS t FROM Diaria WHERE municipioId = ${municipioId} AND status = ${status} AND ativo = 1`
      : await db.$queryRaw`SELECT COUNT(*) AS t FROM Diaria WHERE municipioId = ${municipioId} AND ativo = 1`

    const rows = status
      ? await db.$queryRaw`
          SELECT id, numero, nomeServidor, cargo, destino, dataPartida, dataRetorno,
                 quantidadeDiarias, valorDiaria, valorTotal, status, secretaria, aprovadoPor
          FROM Diaria WHERE municipioId = ${municipioId} AND status = ${status} AND ativo = 1
          ORDER BY dataPartida DESC LIMIT ${limit} OFFSET ${offset}`
      : await db.$queryRaw`
          SELECT id, numero, nomeServidor, cargo, destino, dataPartida, dataRetorno,
                 quantidadeDiarias, valorDiaria, valorTotal, status, secretaria, aprovadoPor
          FROM Diaria WHERE municipioId = ${municipioId} AND ativo = 1
          ORDER BY dataPartida DESC LIMIT ${limit} OFFSET ${offset}`

    const total = Number(countR[0]?.t ?? 0)
    return NextResponse.json({ diarias: rows, total, page, pages: Math.ceil(total / limit) })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const {
    nomeServidor, cargo, matricula, secretaria, destino, objetivo,
    dataPartida, dataRetorno, quantidadeDiarias, valorDiaria, adiantamento, observacao
  } = await req.json()

  if (!nomeServidor || !destino || !objetivo || !dataPartida || !dataRetorno || !valorDiaria)
    return NextResponse.json({ erro: 'Campos obrigatórios: servidor, destino, objetivo, datas e valor' }, { status: 400 })

  try {
    const ano = new Date().getFullYear()
    const countR = await db.$queryRaw`
      SELECT COUNT(*) AS t FROM Diaria WHERE municipioId = ${municipioId} AND YEAR(criadoEm) = ${ano}`
    const seq = Number(countR[0]?.t ?? 0) + 1
    const numero = `DIA-${ano}-${String(seq).padStart(4, '0')}`

    const qtd = quantidadeDiarias ?? 1
    const valorTotal = qtd * valorDiaria
    const saldoPagar = valorTotal - (adiantamento ?? 0)

    const id = randomUUID()
    await db.$queryRaw`
      INSERT INTO Diaria (id, municipioId, numero, nomeServidor, cargo, matricula,
                          secretaria, destino, objetivo, dataPartida, dataRetorno,
                          quantidadeDiarias, valorDiaria, valorTotal, adiantamento,
                          saldoPagar, status, observacao, ativo, criadoEm, atualizadoEm)
      VALUES (${id}, ${municipioId}, ${numero}, ${nomeServidor}, ${cargo || null},
              ${matricula || null}, ${secretaria || null}, ${destino}, ${objetivo},
              ${new Date(dataPartida)}, ${new Date(dataRetorno)},
              ${qtd}, ${valorDiaria}, ${valorTotal}, ${adiantamento ?? 0},
              ${saldoPagar}, 'SOLICITADA', ${observacao || null},
              1, NOW(), NOW())`

    return NextResponse.json({ id, numero, valorTotal }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, status, aprovadoPor, dataAprovacao, empenhoNumero, observacao } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

  try {
    if (status)
      await db.$queryRaw`UPDATE Diaria SET status = ${status}, atualizadoEm = NOW()
        WHERE id = ${id} AND municipioId = ${municipioId}`
    if (aprovadoPor !== undefined)
      await db.$queryRaw`UPDATE Diaria SET aprovadoPor = ${aprovadoPor},
        dataAprovacao = ${dataAprovacao ? new Date(dataAprovacao) : null}, atualizadoEm = NOW()
        WHERE id = ${id} AND municipioId = ${municipioId}`
    if (empenhoNumero !== undefined)
      await db.$queryRaw`UPDATE Diaria SET empenhoNumero = ${empenhoNumero}, atualizadoEm = NOW()
        WHERE id = ${id} AND municipioId = ${municipioId}`
    if (observacao !== undefined)
      await db.$queryRaw`UPDATE Diaria SET observacao = ${observacao}, atualizadoEm = NOW()
        WHERE id = ${id} AND municipioId = ${municipioId}`

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
