import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function mid(req: NextRequest) { return req.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)

  try {
    // Contagem servidores por situação
    const servidoresRows = await db.$queryRaw`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN situacao = 'ATIVO'       THEN 1 ELSE 0 END) AS ativos,
        SUM(CASE WHEN situacao = 'FERIAS'       THEN 1 ELSE 0 END) AS emFerias,
        SUM(CASE WHEN situacao = 'AFASTADO'     THEN 1 ELSE 0 END) AS afastados,
        SUM(CASE WHEN vinculo  = 'EFETIVO'      THEN 1 ELSE 0 END) AS efetivos,
        SUM(CASE WHEN vinculo  = 'COMISSIONADO' THEN 1 ELSE 0 END) AS comissionados,
        SUM(CASE WHEN pcd = 1                   THEN 1 ELSE 0 END) AS pcd
      FROM Servidor WHERE municipioId = ${municipioId} AND ativo = 1`

    // Total de cargos
    const cargosRows = await db.$queryRaw`
      SELECT COUNT(*) AS total FROM Cargo WHERE municipioId = ${municipioId} AND ativo = 1`

    // Folha do mês atual
    const mesAtual = new Date().getMonth() + 1
    const anoAtual = new Date().getFullYear()
    const folhaRows = await db.$queryRaw`
      SELECT totalBruto, totalLiquido, totalDescontos, status
      FROM Folha
      WHERE municipioId = ${municipioId} AND mes = ${mesAtual} AND ano = ${anoAtual} AND tipo = 'MENSAL'
      LIMIT 1`

    // Férias no mês
    const feriasRows = await db.$queryRaw`
      SELECT COUNT(*) AS total
      FROM Ferias
      WHERE municipioId = ${municipioId}
        AND status IN ('APROVADA','EM_GOZO')
        AND dataInicio <= LAST_DAY(NOW())
        AND dataFim >= CURDATE()`

    // Distribuição por secretaria
    const secretariasRows = await db.$queryRaw`
      SELECT l.secretaria, COUNT(*) AS total
      FROM Lotacao l
      WHERE l.municipioId = ${municipioId} AND l.ativo = 1
      GROUP BY l.secretaria
      ORDER BY total DESC
      LIMIT 8`

    const s = servidoresRows[0]
    const f = folhaRows[0]

    return NextResponse.json({
      kpis: {
        totalServidores:  Number(s?.total       ?? 0),
        ativos:           Number(s?.ativos       ?? 0),
        emFerias:         Number(s?.emFerias     ?? 0),
        afastados:        Number(s?.afastados    ?? 0),
        efetivos:         Number(s?.efetivos     ?? 0),
        comissionados:    Number(s?.comissionados ?? 0),
        pcd:              Number(s?.pcd          ?? 0),
        totalCargos:      Number(cargosRows[0]?.total ?? 0),
        feriasAtivas:     Number(feriasRows[0]?.total ?? 0),
        folhaBruto:       Number(f?.totalBruto   ?? 0),
        folhaLiquido:     Number(f?.totalLiquido  ?? 0),
        folhaStatus:      f?.status ?? null,
      },
      secretarias: secretariasRows.map((r: any) => ({
        secretaria: r.secretaria, total: Number(r.total)
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
