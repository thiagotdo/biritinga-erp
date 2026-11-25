import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

// Schema real de AbastecimentoVeiculo:
// id, municipioId, veiculoId, data (date), combustivel, litros, valorLitro,
// valorTotal, posto, odometro (int), motorista, createdAt
// Veiculo não tem 'descricao' — usa placa + modelo

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
        SELECT a.*, v.placa, v.modelo AS veiculoDesc
        FROM AbastecimentoVeiculo a JOIN Veiculo v ON v.id = a.veiculoId
        WHERE a.municipioId = ${municipioId} AND a.veiculoId = ${veiculoId}
        ORDER BY a.data DESC LIMIT 50`
    } else if (mes && ano) {
      rows = await db.$queryRaw`
        SELECT a.*, v.placa, v.modelo AS veiculoDesc
        FROM AbastecimentoVeiculo a JOIN Veiculo v ON v.id = a.veiculoId
        WHERE a.municipioId = ${municipioId}
          AND MONTH(a.data) = ${mes}
          AND YEAR(a.data) = ${ano}
        ORDER BY a.data DESC`
    } else {
      rows = await db.$queryRaw`
        SELECT a.*, v.placa, v.modelo AS veiculoDesc
        FROM AbastecimentoVeiculo a JOIN Veiculo v ON v.id = a.veiculoId
        WHERE a.municipioId = ${municipioId} AND YEAR(a.data) = ${ano}
        ORDER BY a.data DESC LIMIT 200`
    }

    // Totais do ano
    const [totais]: any[] = await db.$queryRaw`
      SELECT
        COUNT(*) AS qtd,
        SUM(litros) AS totalLitros,
        SUM(valorTotal) AS totalValor
      FROM AbastecimentoVeiculo
      WHERE municipioId = ${municipioId} AND YEAR(data) = ${ano}`

    return NextResponse.json({ abastecimentos: rows, totais: totais ?? {} })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { veiculoId, data, combustivel, litros, valorLitro,
    valorTotal, odometro, motorista, posto } = await req.json()
  if (!veiculoId || !data || !litros)
    return NextResponse.json({ erro: 'Dados obrigatórios faltando' }, { status: 400 })
  try {
    const id = crypto.randomUUID()
    const total = valorTotal ?? (litros * (valorLitro ?? 0))
    await db.$queryRaw`
      INSERT INTO AbastecimentoVeiculo
        (id, municipioId, veiculoId, data, combustivel, litros,
         valorLitro, valorTotal, odometro, motorista, posto)
      VALUES
        (${id}, ${municipioId}, ${veiculoId}, ${data},
         ${combustivel ?? 'FLEX'}, ${litros}, ${valorLitro ?? null}, ${total},
         ${odometro ?? null}, ${motorista ?? null}, ${posto ?? null})`

    // Atualiza odômetro do veículo se informado
    if (odometro) {
      await db.$queryRaw`
        UPDATE Veiculo SET odometroAtual = ${odometro}
        WHERE id = ${veiculoId} AND municipioId = ${municipioId}
          AND (odometroAtual IS NULL OR odometroAtual < ${odometro})`
    }
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
