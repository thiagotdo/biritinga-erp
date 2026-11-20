import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function municipioId(req: NextRequest) {
  return req.headers.get('x-erp-municipio-id') ?? ''
}

// ESF — Estratégia Saúde da Família: retorna resumo de cada UBS
export async function GET(req: NextRequest) {
  const mid = municipioId(req)

  try {
    const unidades = await db.$queryRaw<any[]>`
      SELECT u.id, u.nome, u.bairro, u.responsavel, u.telefone,
        (SELECT COUNT(*) FROM ProfissionalSaude ps WHERE ps.unidadeId = u.id AND ps.ativo = 1) AS totalProfissionais,
        (SELECT COUNT(*) FROM Paciente p WHERE p.unidadeReferenciaId = u.id AND p.situacao = 'ATIVO') AS totalPacientes,
        (SELECT COUNT(*) FROM Agendamento ag WHERE ag.unidadeId = u.id AND ag.dataHora >= CURDATE() AND ag.dataHora < DATE_ADD(CURDATE(), INTERVAL 7 DAY)) AS agendamentosSemana
      FROM UnidadeSaude u
      WHERE u.municipioId = ${mid} AND u.ativo = 1 AND u.tipo = 'UBS'
      ORDER BY u.nome`

    // Atendimentos do mês corrente por UBS
    const atendimentosMes = await db.$queryRaw<any[]>`
      SELECT a.unidadeId, COUNT(*) AS total
      FROM Atendimento a
      WHERE a.municipioId = ${mid}
        AND MONTH(a.dataHora) = MONTH(NOW())
        AND YEAR(a.dataHora) = YEAR(NOW())
      GROUP BY a.unidadeId`

    const atMap: Record<string, number> = {}
    atendimentosMes.forEach((r: any) => { atMap[r.unidadeId] = Number(r.total) })

    const result = unidades.map((u: any) => ({
      ...u,
      atendimentosMes: atMap[u.id] ?? 0,
    }))

    return NextResponse.json({ equipes: result })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
