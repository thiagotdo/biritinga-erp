import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const mes = Number(searchParams.get('mes') ?? new Date().getMonth() + 1)
  const ano = Number(searchParams.get('ano') ?? new Date().getFullYear())

  try {
    // Resumo por secretaria
    const secretarias = await db.$queryRaw`
      SELECT l.secretaria,
        COUNT(DISTINCT s.id) AS totalServidores,
        SUM(s.salarioBase) AS totalBruto
      FROM Servidor s
      JOIN Lotacao l ON l.servidorId = s.id AND l.municipioId = ${municipioId} AND l.ativo = 1
      WHERE s.municipioId = ${municipioId} AND s.ativo = 1 AND s.situacao = 'ATIVO'
      GROUP BY l.secretaria
      ORDER BY l.secretaria`

    // Resumo geral
    const [geral] = await db.$queryRaw`
      SELECT
        COUNT(*) AS totalServidores,
        SUM(salarioBase) AS totalBruto
      FROM Servidor
      WHERE municipioId = ${municipioId} AND ativo = 1 AND situacao = 'ATIVO'`

    // Folha do mês
    const folha = await db.$queryRaw`
      SELECT * FROM Folha WHERE municipioId = ${municipioId} AND mes = ${mes} AND ano = ${ano} LIMIT 1`

    return NextResponse.json({
      mes, ano,
      geral: { totalServidores: Number(geral.totalServidores ?? 0), totalBruto: Number(geral.totalBruto ?? 0) },
      secretarias: secretarias.map((r: any) => ({
        secretaria: r.secretaria,
        totalServidores: Number(r.totalServidores),
        totalBruto: Number(r.totalBruto)
      })),
      folha: folha[0] ?? null,
    })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
