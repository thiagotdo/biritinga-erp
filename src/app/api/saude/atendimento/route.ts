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
  const page  = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 20
  const offset = (page - 1) * limit

  try {
    let atendimentos: any[]
    if (pacienteId) {
      atendimentos = await db.$queryRaw`
        SELECT a.*, u.nome AS unidadeNome, ps.nome AS profissionalNome
        FROM Atendimento a
        LEFT JOIN UnidadeSaude u ON u.id = a.unidadeId
        LEFT JOIN ProfissionalSaude ps ON ps.id = a.profissionalId
        WHERE a.municipioId = ${mid} AND a.pacienteId = ${pacienteId}
        ORDER BY a.dataHora DESC
        LIMIT ${limit} OFFSET ${offset}`
    } else {
      atendimentos = await db.$queryRaw`
        SELECT a.id, a.dataHora, a.tipo, a.cid10,
               p.nome AS pacienteNome, u.nome AS unidadeNome, ps.nome AS profissionalNome
        FROM Atendimento a
        JOIN Paciente p ON p.id = a.pacienteId
        LEFT JOIN UnidadeSaude u ON u.id = a.unidadeId
        LEFT JOIN ProfissionalSaude ps ON ps.id = a.profissionalId
        WHERE a.municipioId = ${mid}
        ORDER BY a.dataHora DESC
        LIMIT ${limit} OFFSET ${offset}`
    }
    return NextResponse.json({ atendimentos })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const mid = municipioId(req)
  const { pacienteId, unidadeId, profissionalId, agendamentoId,
    dataHora, tipo, cid10, queixa, evolucao, prescricao,
    peso, altura, pressao, temperatura } = await req.json()

  if (!pacienteId || !unidadeId)
    return NextResponse.json({ erro: 'Paciente e unidade obrigatórios' }, { status: 400 })

  try {
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO Atendimento (id, municipioId, pacienteId, unidadeId, profissionalId,
                               agendamentoId, dataHora, tipo, cid10, queixa, evolucao,
                               prescricao, peso, altura, pressao, temperatura)
      VALUES (${id}, ${mid}, ${pacienteId}, ${unidadeId}, ${profissionalId || null},
              ${agendamentoId || null}, ${dataHora ?? new Date()}, ${tipo ?? 'CONSULTA'},
              ${cid10 || null}, ${queixa || null}, ${evolucao || null}, ${prescricao || null},
              ${peso || null}, ${altura || null}, ${pressao || null}, ${temperatura || null})`

    // Se veio de agendamento, marcar como ATENDIDO
    if (agendamentoId) {
      await db.$queryRaw`UPDATE Agendamento SET status = 'ATENDIDO' WHERE id = ${agendamentoId} AND municipioId = ${mid}`
    }

    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
