import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const servidorId = searchParams.get('servidorId')
  const folhaId = searchParams.get('folhaId')
  const mes = searchParams.get('mes')
  const ano = searchParams.get('ano')

  try {
    if (servidorId) {
      const rows = await db.$queryRaw<any[]>`
        SELECT s.nome AS servidorNome, s.matricula, s.cpf,
               c.nome AS cargoNome, f.mes, f.ano, f.tipo,
               srv.salarioBase, srv.salarioBase AS vencimento
        FROM Servidor srv
        JOIN Cargo c ON c.id = srv.cargoId
        JOIN Folha f ON f.municipioId = ${municipioId}
          AND f.mes = ${mes ?? (new Date().getMonth() + 1)}
          AND f.ano = ${ano ?? new Date().getFullYear()}
        JOIN Servidor s ON s.id = srv.id
        WHERE srv.id = ${servidorId} AND srv.municipioId = ${municipioId}
        LIMIT 1`
      return NextResponse.json({ holerite: rows[0] ?? null })
    }
    if (folhaId) {
      const rows = await db.$queryRaw<any[]>`
        SELECT s.id AS servidorId, s.nome AS servidorNome, s.matricula,
               c.nome AS cargoNome, s.salarioBase, s.salarioBase AS vencimento
        FROM Servidor s
        LEFT JOIN Cargo c ON c.id = s.cargoId
        WHERE s.municipioId = ${municipioId} AND s.ativo = 1 AND s.situacao = 'ATIVO'
        ORDER BY s.nome LIMIT 500`
      return NextResponse.json({ holerites: rows })
    }
    return NextResponse.json({ holerites: [] })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
