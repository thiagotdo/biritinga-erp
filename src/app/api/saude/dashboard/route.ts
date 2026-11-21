import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function municipioId(req: NextRequest) {
  return req.headers.get('x-erp-municipio-id') ?? ''
}

export async function GET(req: NextRequest) {
  const mid = municipioId(req)

  try {
    // Pacientes
    const pacientesRows = await db.$queryRaw`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN situacao = 'ATIVO' THEN 1 ELSE 0 END) AS ativos,
        SUM(CASE WHEN situacao = 'OBITO' THEN 1 ELSE 0 END) AS obitos
      FROM Paciente WHERE municipioId = ${mid}`

    // Atendimentos do mês
    const atendMesRows = await db.$queryRaw`
      SELECT COUNT(*) AS total
      FROM Atendimento
      WHERE municipioId = ${mid}
        AND MONTH(dataHora) = MONTH(NOW())
        AND YEAR(dataHora) = YEAR(NOW())`

    // Atendimentos de hoje
    const atendHojeRows = await db.$queryRaw`
      SELECT COUNT(*) AS total
      FROM Atendimento
      WHERE municipioId = ${mid}
        AND DATE(dataHora) = CURDATE()`

    // Agendamentos de hoje
    const agendHojeRows = await db.$queryRaw`
      SELECT COUNT(*) AS total,
        SUM(CASE WHEN status = 'AGENDADO' THEN 1 ELSE 0 END) AS pendentes,
        SUM(CASE WHEN status = 'ATENDIDO' THEN 1 ELSE 0 END) AS atendidos,
        SUM(CASE WHEN status = 'FALTA' THEN 1 ELSE 0 END) AS faltas
      FROM Agendamento
      WHERE municipioId = ${mid}
        AND DATE(dataHora) = CURDATE()`

    // Unidades ativas
    const unidadesRows = await db.$queryRaw`
      SELECT COUNT(*) AS total
      FROM UnidadeSaude
      WHERE municipioId = ${mid} AND ativo = 1`

    // Profissionais ativos
    const profRows = await db.$queryRaw`
      SELECT COUNT(*) AS total
      FROM ProfissionalSaude
      WHERE municipioId = ${mid} AND ativo = 1`

    // Vacinas do mês
    const vacinaMesRows = await db.$queryRaw`
      SELECT COUNT(*) AS total
      FROM Vacinacao
      WHERE municipioId = ${mid}
        AND MONTH(dataAplicacao) = MONTH(NOW())
        AND YEAR(dataAplicacao) = YEAR(NOW())`

    // Notificações epidemiológicas ativas
    const notifRows = await db.$queryRaw`
      SELECT COUNT(*) AS total
      FROM NotificacaoEpidem
      WHERE municipioId = ${mid}
        AND status IN ('SUSPEITO','INVESTIGANDO','CONFIRMADO')`

    // Estoque crítico
    const estoqueCriticoRows = await db.$queryRaw`
      SELECT COUNT(*) AS total
      FROM MedicamentoEstoque
      WHERE municipioId = ${mid} AND ativo = 1
        AND quantidadeTotal <= quantidadeMin`

    // Atendimentos por tipo (mês)
    const tiposRows = await db.$queryRaw`
      SELECT tipo, COUNT(*) AS total
      FROM Atendimento
      WHERE municipioId = ${mid}
        AND MONTH(dataHora) = MONTH(NOW())
        AND YEAR(dataHora) = YEAR(NOW())
      GROUP BY tipo
      ORDER BY total DESC`

    // Unidades top (mais atendimentos mês)
    const unidadesTopRows = await db.$queryRaw`
      SELECT u.nome, COUNT(a.id) AS atendimentos
      FROM Atendimento a
      JOIN UnidadeSaude u ON u.id = a.unidadeId
      WHERE a.municipioId = ${mid}
        AND MONTH(a.dataHora) = MONTH(NOW())
        AND YEAR(a.dataHora) = YEAR(NOW())
      GROUP BY a.unidadeId, u.nome
      ORDER BY atendimentos DESC
      LIMIT 5`

    // CIDs mais frequentes (mês)
    const cidsRows = await db.$queryRaw`
      SELECT cid10, COUNT(*) AS total
      FROM Atendimento
      WHERE municipioId = ${mid} AND cid10 IS NOT NULL AND cid10 != ''
        AND MONTH(dataHora) = MONTH(NOW())
        AND YEAR(dataHora) = YEAR(NOW())
      GROUP BY cid10
      ORDER BY total DESC
      LIMIT 5`

    const p  = pacientesRows[0]
    const am = atendMesRows[0]
    const ah = atendHojeRows[0]
    const agh = agendHojeRows[0]

    return NextResponse.json({
      kpis: {
        totalPacientes:    Number(p?.total  ?? 0),
        pacientesAtivos:   Number(p?.ativos ?? 0),
        atendimentosMes:   Number(am?.total ?? 0),
        atendimentosHoje:  Number(ah?.total ?? 0),
        agendamentosHoje:  Number(agh?.total    ?? 0),
        agendPendentes:    Number(agh?.pendentes ?? 0),
        agendAtendidos:    Number(agh?.atendidos ?? 0),
        agendFaltas:       Number(agh?.faltas    ?? 0),
        totalUnidades:     Number(unidadesRows[0]?.total ?? 0),
        totalProfissionais:Number(profRows[0]?.total ?? 0),
        vacinasMes:        Number(vacinaMesRows[0]?.total ?? 0),
        notificacoesAtivas:Number(notifRows[0]?.total ?? 0),
        estoqueCritico:    Number(estoqueCriticoRows[0]?.total ?? 0),
      },
      tiposAtendimento: tiposRows.map((r: any) => ({ tipo: r.tipo, total: Number(r.total) })),
      unidadesTop: unidadesTopRows.map((r: any) => ({ nome: r.nome, atendimentos: Number(r.atendimentos) })),
      cidsFrequentes: cidsRows.map((r: any) => ({ cid10: r.cid10, total: Number(r.total) })),
    })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
