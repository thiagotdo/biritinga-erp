import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function municipioId(req: NextRequest) {
  return req.headers.get('x-erp-municipio-id') ?? ''
}

export async function GET(req: NextRequest) {
  const mid = municipioId(req)
  const { searchParams } = new URL(req.url)
  const data     = searchParams.get('data')   // YYYY-MM-DD
  const unidade  = searchParams.get('unidade')
  const status   = searchParams.get('status')
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit    = 30
  const offset   = (page - 1) * limit

  try {
    // Filtros dinâmicos via arrays de condições e parâmetros
    let agendamentos: any[]

    if (data && unidade) {
      agendamentos = await db.$queryRaw`
        SELECT ag.id, ag.dataHora, ag.tipo, ag.status, ag.especialidade, ag.observacoes,
               p.id AS pacienteId, p.nome AS pacienteNome, p.telefone AS pacienteTelefone,
               u.nome AS unidadeNome, ps.nome AS profissionalNome
        FROM Agendamento ag
        JOIN Paciente p ON p.id = ag.pacienteId
        JOIN UnidadeSaude u ON u.id = ag.unidadeId
        LEFT JOIN ProfissionalSaude ps ON ps.id = ag.profissionalId
        WHERE ag.municipioId = ${mid}
          AND DATE(ag.dataHora) = ${data}
          AND ag.unidadeId = ${unidade}
        ORDER BY ag.dataHora
        LIMIT ${limit} OFFSET ${offset}`
    } else if (data) {
      agendamentos = await db.$queryRaw`
        SELECT ag.id, ag.dataHora, ag.tipo, ag.status, ag.especialidade,
               p.nome AS pacienteNome, p.telefone AS pacienteTelefone,
               u.nome AS unidadeNome, ps.nome AS profissionalNome
        FROM Agendamento ag
        JOIN Paciente p ON p.id = ag.pacienteId
        JOIN UnidadeSaude u ON u.id = ag.unidadeId
        LEFT JOIN ProfissionalSaude ps ON ps.id = ag.profissionalId
        WHERE ag.municipioId = ${mid}
          AND DATE(ag.dataHora) = ${data}
        ORDER BY ag.dataHora
        LIMIT ${limit} OFFSET ${offset}`
    } else {
      agendamentos = await db.$queryRaw`
        SELECT ag.id, ag.dataHora, ag.tipo, ag.status, ag.especialidade,
               p.nome AS pacienteNome, p.telefone AS pacienteTelefone,
               u.nome AS unidadeNome, ps.nome AS profissionalNome
        FROM Agendamento ag
        JOIN Paciente p ON p.id = ag.pacienteId
        JOIN UnidadeSaude u ON u.id = ag.unidadeId
        LEFT JOIN ProfissionalSaude ps ON ps.id = ag.profissionalId
        WHERE ag.municipioId = ${mid}
          AND ag.dataHora >= NOW()
        ORDER BY ag.dataHora
        LIMIT ${limit} OFFSET ${offset}`
    }

    return NextResponse.json({ agendamentos })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const mid = municipioId(req)
  const { pacienteId, unidadeId, profissionalId, dataHora,
    especialidade, tipo, observacoes } = await req.json()

  if (!pacienteId || !unidadeId || !dataHora)
    return NextResponse.json({ erro: 'Paciente, unidade e data obrigatórios' }, { status: 400 })

  try {
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO Agendamento (id, municipioId, pacienteId, unidadeId, profissionalId,
                               dataHora, especialidade, tipo, observacoes)
      VALUES (${id}, ${mid}, ${pacienteId}, ${unidadeId}, ${profissionalId || null},
              ${dataHora}, ${especialidade || null}, ${tipo ?? 'CONSULTA'}, ${observacoes || null})`
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const mid = municipioId(req)
  const { id, status, observacoes } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })
  try {
    if (status)      await db.$queryRaw`UPDATE Agendamento SET status = ${status} WHERE id = ${id} AND municipioId = ${mid}`
    if (observacoes) await db.$queryRaw`UPDATE Agendamento SET observacoes = ${observacoes} WHERE id = ${id} AND municipioId = ${mid}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
