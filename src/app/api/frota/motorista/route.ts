import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

// Motoristas são servidores com função de motorista
export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')

  try {
    let rows: any[]
    if (q && q.length >= 2) {
      const like = `%${q}%`
      rows = await db.$queryRaw`
        SELECT s.id, s.nome, s.matricula, s.cpf, s.celular,
               c.nome AS cargoNome, l.funcao, l.secretaria
        FROM Servidor s
        LEFT JOIN Cargo c ON c.id = s.cargoId
        LEFT JOIN Lotacao l ON l.servidorId = s.id AND l.municipioId = ${municipioId} AND l.ativo = 1
        WHERE s.municipioId = ${municipioId} AND s.ativo = 1
          AND (s.nome LIKE ${like} OR s.matricula LIKE ${like})
          AND (c.nome LIKE '%motorista%' OR l.funcao LIKE '%motorista%')
        LIMIT 20`
    } else {
      rows = await db.$queryRaw`
        SELECT s.id, s.nome, s.matricula, s.cpf, s.celular,
               c.nome AS cargoNome, l.funcao, l.secretaria
        FROM Servidor s
        LEFT JOIN Cargo c ON c.id = s.cargoId
        LEFT JOIN Lotacao l ON l.servidorId = s.id AND l.municipioId = ${municipioId} AND l.ativo = 1
        WHERE s.municipioId = ${municipioId} AND s.ativo = 1 AND s.situacao = 'ATIVO'
          AND (c.nome LIKE '%motorista%' OR l.funcao LIKE '%motorista%')
        ORDER BY s.nome`
    }
    return NextResponse.json({ motoristas: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
