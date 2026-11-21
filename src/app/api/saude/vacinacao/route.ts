import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function municipioId(req: NextRequest) {
  return req.headers.get('x-erp-municipio-id') ?? ''
}

export async function GET(req: NextRequest) {
  const mid = municipioId(req)
  const { searchParams } = new URL(req.url)
  const pacienteId = searchParams.get('pacienteId')
  const vacina     = searchParams.get('vacina')
  const page  = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 30
  const offset = (page - 1) * limit

  try {
    let vacinas: any[]
    if (pacienteId) {
      vacinas = await db.$queryRaw`
        SELECT v.*, u.nome AS unidadeNome, ps.nome AS profissionalNome
        FROM Vacinacao v
        LEFT JOIN UnidadeSaude u ON u.id = v.unidadeId
        LEFT JOIN ProfissionalSaude ps ON ps.id = v.profissionalId
        WHERE v.municipioId = ${mid} AND v.pacienteId = ${pacienteId}
        ORDER BY v.dataAplicacao DESC`
    } else if (vacina) {
      const like = `%${vacina}%`
      vacinas = await db.$queryRaw`
        SELECT v.id, v.vacina, v.dose, v.dataAplicacao, v.lote, v.fabricante,
               p.nome AS pacienteNome, u.nome AS unidadeNome
        FROM Vacinacao v
        JOIN Paciente p ON p.id = v.pacienteId
        LEFT JOIN UnidadeSaude u ON u.id = v.unidadeId
        WHERE v.municipioId = ${mid} AND v.vacina LIKE ${like}
        ORDER BY v.dataAplicacao DESC
        LIMIT ${limit} OFFSET ${offset}`
    } else {
      vacinas = await db.$queryRaw`
        SELECT v.id, v.vacina, v.dose, v.dataAplicacao, v.lote,
               p.nome AS pacienteNome, u.nome AS unidadeNome
        FROM Vacinacao v
        JOIN Paciente p ON p.id = v.pacienteId
        LEFT JOIN UnidadeSaude u ON u.id = v.unidadeId
        WHERE v.municipioId = ${mid}
        ORDER BY v.dataAplicacao DESC
        LIMIT ${limit} OFFSET ${offset}`
    }
    return NextResponse.json({ vacinas })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const mid = municipioId(req)
  const { pacienteId, unidadeId, profissionalId, vacina, lote,
    fabricante, dose, dataAplicacao, proximaDose, observacoes } = await req.json()

  if (!pacienteId || !unidadeId || !vacina || !dataAplicacao)
    return NextResponse.json({ erro: 'Paciente, unidade, vacina e data obrigatórios' }, { status: 400 })

  try {
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO Vacinacao (id, municipioId, pacienteId, unidadeId, profissionalId,
                             vacina, lote, fabricante, dose, dataAplicacao, proximaDose, observacoes)
      VALUES (${id}, ${mid}, ${pacienteId}, ${unidadeId}, ${profissionalId || null},
              ${vacina}, ${lote || null}, ${fabricante || null}, ${dose || null},
              ${dataAplicacao}, ${proximaDose || null}, ${observacoes || null})`
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
