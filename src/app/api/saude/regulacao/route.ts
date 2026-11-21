import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function municipioId(req: NextRequest) {
  return req.headers.get('x-erp-municipio-id') ?? ''
}

// Regulação: encaminhamentos / referências para serviços especializados
export async function GET(req: NextRequest) {
  const mid = municipioId(req)
  const { searchParams } = new URL(req.url)
  const page  = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 20
  const offset = (page - 1) * limit

  try {
    // Usa Agendamento com tipo CIRURGIA ou especialidade como proxy de regulação
    const encaminhamentos = await db.$queryRaw`
      SELECT ag.id, ag.dataHora, ag.especialidade, ag.tipo, ag.status, ag.observacoes,
             p.nome AS pacienteNome, p.telefone AS pacienteTelefone,
             u.nome AS unidadeNome
      FROM Agendamento ag
      JOIN Paciente p ON p.id = ag.pacienteId
      JOIN UnidadeSaude u ON u.id = ag.unidadeId
      WHERE ag.municipioId = ${mid}
        AND ag.tipo IN ('CIRURGIA','EXAME')
      ORDER BY ag.dataHora DESC
      LIMIT ${limit} OFFSET ${offset}`

    const countRows = await db.$queryRaw`
      SELECT COUNT(*) AS total FROM Agendamento
      WHERE municipioId = ${mid} AND tipo IN ('CIRURGIA','EXAME')`
    const total = Number(countRows[0]?.total ?? 0)

    return NextResponse.json({ encaminhamentos, total })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
