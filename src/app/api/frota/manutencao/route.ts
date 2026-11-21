import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const veiculoId = searchParams.get('veiculoId')
  const status = searchParams.get('status') ?? 'EM_ANDAMENTO'

  try {
    let rows: any[]
    if (veiculoId) {
      rows = await db.$queryRaw`
        SELECT m.*, v.placa, v.descricao AS veiculoDesc
        FROM ManutencaoVeiculo m JOIN Veiculo v ON v.id = m.veiculoId
        WHERE m.municipioId = ${municipioId} AND m.veiculoId = ${veiculoId}
        ORDER BY m.dataEntrada DESC`
    } else {
      rows = await db.$queryRaw`
        SELECT m.*, v.placa, v.descricao AS veiculoDesc
        FROM ManutencaoVeiculo m JOIN Veiculo v ON v.id = m.veiculoId
        WHERE m.municipioId = ${municipioId} AND m.status = ${status}
        ORDER BY m.dataEntrada DESC LIMIT 50`
    }
    return NextResponse.json({ manutencoes: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { veiculoId, tipo, descricao, dataEntrada, officina, orcamento, observacoes } = await req.json()
  if (!veiculoId || !descricao || !dataEntrada)
    return NextResponse.json({ erro: 'Dados obrigatórios faltando' }, { status: 400 })
  try {
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO ManutencaoVeiculo (id, municipioId, veiculoId, tipo, descricao,
                                     dataEntrada, officina, orcamento, observacoes)
      VALUES (${id}, ${municipioId}, ${veiculoId}, ${tipo ?? 'CORRETIVA'}, ${descricao},
              ${dataEntrada}, ${officina || null}, ${orcamento || null}, ${observacoes || null})`
    // Marca veículo como em manutenção
    await db.$queryRaw`UPDATE Veiculo SET status = 'MANUTENCAO' WHERE id = ${veiculoId} AND municipioId = ${municipioId}`
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, status, dataSaida, valorFinal, observacoes } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })
  try {
    if (status !== undefined) await db.$queryRaw`UPDATE ManutencaoVeiculo SET status = ${status} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (dataSaida !== undefined) await db.$queryRaw`UPDATE ManutencaoVeiculo SET dataSaida = ${dataSaida} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (valorFinal !== undefined) await db.$queryRaw`UPDATE ManutencaoVeiculo SET valorFinal = ${valorFinal} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (observacoes !== undefined) await db.$queryRaw`UPDATE ManutencaoVeiculo SET observacoes = ${observacoes} WHERE id = ${id} AND municipioId = ${municipioId}`
    // Se concluída, libera veículo
    if (status === 'CONCLUIDA') {
      const m = await db.$queryRaw`SELECT veiculoId FROM ManutencaoVeiculo WHERE id = ${id} LIMIT 1`
      if (m.length) await db.$queryRaw`UPDATE Veiculo SET status = 'ATIVO' WHERE id = ${m[0].veiculoId} AND municipioId = ${municipioId}`
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
