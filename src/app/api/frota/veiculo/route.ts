import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const q = searchParams.get('q')

  try {
    if (id) {
      const rows = await db.$queryRaw`SELECT * FROM Veiculo WHERE id = ${id} AND municipioId = ${municipioId} LIMIT 1`
      if (!rows.length) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
      const abastecimentos = await db.$queryRaw`
        SELECT * FROM AbastecimentoVeiculo WHERE veiculoId = ${id} AND municipioId = ${municipioId}
        ORDER BY dataAbastecimento DESC LIMIT 20`
      const manutencoes = await db.$queryRaw`
        SELECT * FROM ManutencaoVeiculo WHERE veiculoId = ${id} AND municipioId = ${municipioId}
        ORDER BY dataEntrada DESC LIMIT 10`
      return NextResponse.json({ veiculo: rows[0], abastecimentos, manutencoes })
    }
    if (q && q.length >= 2) {
      const like = `%${q}%`
      const rows = await db.$queryRaw`
        SELECT * FROM Veiculo WHERE municipioId = ${municipioId}
          AND (placa LIKE ${like} OR observacoes LIKE ${like} OR modelo LIKE ${like})
        LIMIT 20`
      return NextResponse.json({ veiculos: rows })
    }
    const rows = await db.$queryRaw`
      SELECT * FROM Veiculo WHERE municipioId = ${municipioId} AND status != 'INATIVO'
      ORDER BY placa`
    return NextResponse.json({ veiculos: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { placa, descricao, tipo, marca, modelo, anoFabricacao, anoModelo,
    cor, combustivel, renavam, chassi, chassis, secretaria, kmAtual, odometroAtual } = await req.json()
  if (!placa)
    return NextResponse.json({ erro: 'Placa obrigatória' }, { status: 400 })
  const placaNorm = placa.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const chassisVal = chassi || chassis || null
  const km = odometroAtual ?? kmAtual ?? 0
  try {
    const dup = await db.$queryRaw`SELECT id FROM Veiculo WHERE municipioId = ${municipioId} AND placa = ${placaNorm} LIMIT 1`
    if ((dup as any[]).length) return NextResponse.json({ erro: 'Placa já cadastrada' }, { status: 409 })
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO Veiculo (id, municipioId, placa, tipo, marca, modelo,
                           anoFabricacao, anoModelo, cor, combustivel, renavam, chassis,
                           secretaria, odometroAtual, observacoes)
      VALUES (${id}, ${municipioId}, ${placaNorm}, ${tipo || 'CARRO'},
              ${marca || null}, ${modelo || null}, ${anoFabricacao || null},
              ${anoModelo || null}, ${cor || null}, ${combustivel || 'FLEX'},
              ${renavam || null}, ${chassisVal},
              ${secretaria || null}, ${km}, ${descricao || null})`
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const municipioId = mid(req)
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })
  try {
    const rows: any[] = await db.$queryRaw`SELECT id FROM Veiculo WHERE id = ${id} AND municipioId = ${municipioId} LIMIT 1`
    if (!rows.length) return NextResponse.json({ erro: 'Veículo não encontrado' }, { status: 404 })
    await db.$queryRaw`DELETE FROM Veiculo WHERE id = ${id} AND municipioId = ${municipioId}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, status, kmAtual, secretaria, motoristaPadrao, ativo, observacoes } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })
  try {
    if (status !== undefined) await db.$queryRaw`UPDATE Veiculo SET status = ${status} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (kmAtual !== undefined) await db.$queryRaw`UPDATE Veiculo SET kmAtual = ${kmAtual} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (secretaria !== undefined) await db.$queryRaw`UPDATE Veiculo SET secretaria = ${secretaria} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (motoristaPadrao !== undefined) await db.$queryRaw`UPDATE Veiculo SET motoristaPadrao = ${motoristaPadrao} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (ativo !== undefined) await db.$queryRaw`UPDATE Veiculo SET ativo = ${ativo ? 1 : 0} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (observacoes !== undefined) await db.$queryRaw`UPDATE Veiculo SET observacoes = ${observacoes} WHERE id = ${id} AND municipioId = ${municipioId}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
