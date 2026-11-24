import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

// Tabela Viagem — schema:
// numero, ano, servidorId, servidorNome, servidorCargo, servidorMatricula
// destino, municipioDestino, estadoDestino, objetivo
// dataPartida, dataRetorno, quantidadeDiarias, valorDiaria, valorTotal
// adiantamento, saldo, meioDTransporte, status, autorizado
// autorizadoPor, dataAutorizacao, numeroEmpenho, observacoes

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const id      = searchParams.get('id')
  const status  = searchParams.get('status')
  const ano     = searchParams.get('ano')
  const stats   = searchParams.get('stats')
  const page    = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit   = 20
  const offset  = (page - 1) * limit

  try {
    if (id) {
      const rows = await db.$queryRaw`
        SELECT * FROM Viagem WHERE id = ${id} AND municipioId = ${municipioId} LIMIT 1`
      if (!rows.length) return NextResponse.json({ erro: 'Viagem não encontrada' }, { status: 404 })
      return NextResponse.json({ viagem: rows[0] })
    }

    if (stats) {
      const porStatus = await db.$queryRaw`
        SELECT status, COUNT(*) AS total, SUM(valorTotal) AS totalValor
        FROM Viagem WHERE municipioId = ${municipioId} GROUP BY status`
      const totalGasto = await db.$queryRaw`
        SELECT SUM(valorTotal) AS t FROM Viagem WHERE municipioId = ${municipioId} AND status = 'CONCLUIDA'`
      const recentes = await db.$queryRaw`
        SELECT * FROM Viagem WHERE municipioId = ${municipioId} ORDER BY criadoEm DESC LIMIT 5`
      return NextResponse.json({ porStatus, totalGasto: Number(totalGasto[0]?.t ?? 0), recentes })
    }

    const anoInt = ano ? parseInt(ano) : null
    const countR = anoInt
      ? await db.$queryRaw`SELECT COUNT(*) AS t FROM Viagem WHERE municipioId = ${municipioId} AND ano = ${anoInt}`
      : status
      ? await db.$queryRaw`SELECT COUNT(*) AS t FROM Viagem WHERE municipioId = ${municipioId} AND status = ${status}`
      : await db.$queryRaw`SELECT COUNT(*) AS t FROM Viagem WHERE municipioId = ${municipioId}`

    const rows = anoInt
      ? await db.$queryRaw`SELECT * FROM Viagem WHERE municipioId = ${municipioId} AND ano = ${anoInt} ORDER BY dataPartida DESC LIMIT ${limit} OFFSET ${offset}`
      : status
      ? await db.$queryRaw`SELECT * FROM Viagem WHERE municipioId = ${municipioId} AND status = ${status} ORDER BY dataPartida DESC LIMIT ${limit} OFFSET ${offset}`
      : await db.$queryRaw`SELECT * FROM Viagem WHERE municipioId = ${municipioId} ORDER BY dataPartida DESC LIMIT ${limit} OFFSET ${offset}`

    const total = Number(countR[0]?.t ?? 0)
    return NextResponse.json({ viagens: rows, total, page, pages: Math.ceil(total / limit) })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const body = await req.json()
  const { servidorNome, servidorCargo, servidorMatricula, servidorId,
    destino, municipioDestino, estadoDestino, objetivo,
    dataPartida, dataRetorno, quantidadeDiarias, valorDiaria,
    meioDTransporte, adiantamento, numeroEmpenho, observacoes } = body

  if (!servidorNome || !destino || !objetivo || !dataPartida || !dataRetorno)
    return NextResponse.json({ erro: 'Campos obrigatórios: servidorNome, destino, objetivo, dataPartida, dataRetorno' }, { status: 400 })

  try {
    const ano = new Date(dataPartida).getFullYear()
    const countR = await db.$queryRaw`
      SELECT COUNT(*) AS t FROM Viagem WHERE municipioId = ${municipioId} AND ano = ${ano}`
    const seq = Number(countR[0]?.t ?? 0) + 1
    const numero = `VIAG-${ano}/${String(seq).padStart(4,'0')}`

    const qtd = Number(quantidadeDiarias ?? 1)
    const vlrDiaria = Number(valorDiaria ?? 0)
    const valorTotal = qtd * vlrDiaria
    const adiant = Number(adiantamento ?? 0)
    const saldo = adiant - valorTotal

    const id = randomUUID()
    await db.$queryRaw`
      INSERT INTO Viagem
        (id, municipioId, numero, ano, servidorId, servidorNome, servidorCargo, servidorMatricula,
         destino, municipioDestino, estadoDestino, objetivo,
         dataPartida, dataRetorno, quantidadeDiarias, valorDiaria, valorTotal,
         adiantamento, saldo, meioDTransporte, status, autorizado,
         numeroEmpenho, observacoes, criadoEm, atualizadoEm)
      VALUES (${id}, ${municipioId}, ${numero}, ${ano},
              ${servidorId || null}, ${servidorNome},
              ${servidorCargo || null}, ${servidorMatricula || null},
              ${destino}, ${municipioDestino || null}, ${estadoDestino || null},
              ${objetivo}, ${new Date(dataPartida)}, ${new Date(dataRetorno)},
              ${qtd}, ${vlrDiaria}, ${valorTotal},
              ${adiant}, ${saldo},
              ${meioDTransporte || 'VEICULO_OFICIAL'}, 'SOLICITADA', 0,
              ${numeroEmpenho || null}, ${observacoes || null},
              NOW(), NOW())`

    return NextResponse.json({ id, numero, valorTotal }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, status, autorizadoPor } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

  try {
    if (status === 'APROVADA' && autorizadoPor) {
      await db.$queryRaw`
        UPDATE Viagem SET status = 'APROVADA', autorizado = 1,
          autorizadoPor = ${autorizadoPor}, dataAutorizacao = NOW(), atualizadoEm = NOW()
        WHERE id = ${id} AND municipioId = ${municipioId}`
    } else if (status) {
      await db.$queryRaw`
        UPDATE Viagem SET status = ${status}, atualizadoEm = NOW()
        WHERE id = ${id} AND municipioId = ${municipioId}`
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
