import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const veiculoId = searchParams.get('veiculoId')
  const data = searchParams.get('data')

  try {
    if (veiculoId) {
      const rows = await db.$queryRaw`
        SELECT m.*, v.placa FROM ManutencaoVeiculo m JOIN Veiculo v ON v.id = m.veiculoId
        WHERE m.municipioId = ${municipioId} AND m.veiculoId = ${veiculoId}
        ORDER BY m.dataEntrada DESC LIMIT 10`
      return NextResponse.json({ agendamentos: rows })
    }
    if (data) {
      const rows = await db.$queryRaw`
        SELECT m.*, v.placa, v.descricao AS veiculoDesc
        FROM ManutencaoVeiculo m JOIN Veiculo v ON v.id = m.veiculoId
        WHERE m.municipioId = ${municipioId} AND DATE(m.dataEntrada) = ${data}
        ORDER BY m.dataEntrada`
      return NextResponse.json({ agendamentos: rows })
    }
    // Próximas manutenções agendadas
    const rows = await db.$queryRaw`
      SELECT m.*, v.placa, v.descricao AS veiculoDesc
      FROM ManutencaoVeiculo m JOIN Veiculo v ON v.id = m.veiculoId
      WHERE m.municipioId = ${municipioId} AND m.status IN ('AGUARDANDO', 'EM_ANDAMENTO')
      ORDER BY m.dataEntrada LIMIT 50`
    return NextResponse.json({ agendamentos: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
