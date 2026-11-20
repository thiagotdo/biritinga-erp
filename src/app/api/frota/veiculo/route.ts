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
      const rows = await db.$queryRaw<any[]>`SELECT * FROM Veiculo WHERE id = ${id} AND municipioId = ${municipioId} LIMIT 1`
      if (!rows.length) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
      const abastecimentos = await db.$queryRaw<any[]>`
        SELECT * FROM AbastecimentoVeiculo WHERE veiculoId = ${id} AND municipioId = ${municipioId}
        ORDER BY dataAbastecimento DESC LIMIT 20`
      const manutencoes = await db.$queryRaw<any[]>`
        SELECT * FROM ManutencaoVeiculo WHERE veiculoId = ${id} AND municipioId = ${municipioId}
        ORDER BY dataEntrada DESC LIMIT 10`
      return NextResponse.json({ veiculo: rows[0], abastecimentos, manutencoes })
    }
    if (q && q.length >= 2) {
      const like = `%${q}%`
      const rows = await db.$queryRaw<any[]>`
        SELECT * FROM Veiculo WHERE municipioId = ${municipioId} AND ativo = 1
          AND (placa LIKE ${like} OR descricao LIKE ${like} OR modelo LIKE ${like})
        LIMIT 20`
      return NextResponse.json({ veiculos: rows })
    }
    const rows = await db.$queryRaw<any[]>`
      SELECT * FROM Veiculo WHERE municipioId = ${municipioId} AND ativo = 1
      ORDER BY placa`
    return NextResponse.json({ veiculos: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { placa, descricao, tipo, marca, modelo, anoFabricacao, anoModelo,
    cor, combustivel, renavam, chassi, secretaria, kmAtual } = await req.json()
  if (!placa || !descricao)
    return NextResponse.json({ erro: 'Placa e descrição obrigatórias' }, { status: 400 })
  const placaNorm = placa.toUpperCase().replace(/[^A-Z0-9]/g, '')
  try {
    const dup = await db.$queryRaw<any[]>`SELECT id FROM Veiculo WHERE municipioId = ${municipioId} AND placa = ${placaNorm} AND ativo = 1 LIMIT 1`
    if (dup.length) return NextResponse.json({ erro: 'Placa já cadastrada' }, { status: 409 })
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO Veiculo (id, municipioId, placa, descricao, tipo, marca, modelo,
                           anoFabricacao, anoModelo, cor, combustivel, renavam, chassi,
                           secretaria, kmAtual)
      VALUES (${id}, ${municipioId}, ${placaNorm}, ${descricao}, ${tipo || null},
              ${marca || null}, ${modelo || null}, ${anoFabricacao || null},
              ${anoModelo || null}, ${cor || null}, ${combustivel || 'FLEX'},
              ${renavam || null}, ${chassi || null}, ${secretaria || null}, ${kmAtual ?? 0})`
    return NextResponse.json({ id }, { status: 201 })
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
