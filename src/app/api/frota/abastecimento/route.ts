import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const veiculoId = searchParams.get('veiculoId')
  const mes = searchParams.get('mes')
  const ano = searchParams.get('ano') ?? new Date().getFullYear()

  try {
    let rows: any[]
    if (veiculoId) {
      rows = await db.$queryRaw`
        SELECT a.*, v.placa, v.descricao AS veiculoDesc
        FROM AbastecimentoVeiculo a JOIN Veiculo v ON v.id = a.veiculoId
        WHERE a.municipioId = ${municipioId} AND a.veiculoId = ${veiculoId}
        ORDER BY a.dataAbastecimento DESC LIMIT 50`
    } else if (mes && ano) {
      rows = await db.$queryRaw`
        SELECT a.*, v.placa, v.descricao AS veiculoDesc
        FROM AbastecimentoVeiculo a JOIN Veiculo v ON v.id = a.veiculoId
        WHERE a.municipioId = ${municipioId}
          AND MONTH(a.dataAbastecimento) = ${mes}
          AND YEAR(a.dataAbastecimento) = ${ano}
        ORDER BY a.dataAbastecimento DESC`
    } else {
      rows = await db.$queryRaw`
        SELECT a.*, v.placa, v.descricao AS veiculoDesc
        FROM AbastecimentoVeiculo a JOIN Veiculo v ON v.id = a.veiculoId
        WHERE a.municipioId = ${municipioId} AND YEAR(a.dataAbastecimento) = ${ano}
        ORDER BY a.dataAbastecimento DESC LIMIT 100`
    }
    return NextResponse.json({ abastecimentos: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { veiculoId, dataAbastecimento, combustivel, litros, valorLitro,
    valorTotal, kmAbastecimento, motorista, posto, observacoes } = await req.json()
  if (!veiculoId || !dataAbastecimento || !litros)
    return NextResponse.json({ erro: 'Dados obrigatórios faltando' }, { status: 400 })
  try {
    const id = crypto.randomUUID()
    const total = valorTotal ?? (litros * (valorLitro ?? 0))
    await db.$queryRaw`
      INSERT INTO AbastecimentoVeiculo (id, municipioId, veiculoId, dataAbastecimento,
                                        combustivel, litros, valorLitro, valorTotal,
                                        kmAbastecimento, motorista, posto, observacoes)
      VALUES (${id}, ${municipioId}, ${veiculoId}, ${dataAbastecimento},
              ${combustivel ?? 'FLEX'}, ${litros}, ${valorLitro || null}, ${total},
              ${kmAbastecimento || null}, ${motorista || null}, ${posto || null}, ${observacoes || null})`
    // Atualiza KM do veículo
    if (kmAbastecimento) {
      await db.$queryRaw`UPDATE Veiculo SET kmAtual = ${kmAbastecimento} WHERE id = ${veiculoId} AND municipioId = ${municipioId} AND kmAtual < ${kmAbastecimento}`
    }
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
