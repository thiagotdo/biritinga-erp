import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function mid(req: NextRequest) { return req.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const servidorId = searchParams.get('servidorId')
  const mes        = searchParams.get('mes')
  const ano        = searchParams.get('ano')

  try {
    let rows: any[]
    if (servidorId) {
      rows = await db.$queryRaw<any[]>`
        SELECT f.*, s.nome AS servidorNome
        FROM FrequenciaServidor f JOIN Servidor s ON s.id = f.servidorId
        WHERE f.municipioId = ${municipioId} AND f.servidorId = ${servidorId}
        ORDER BY f.ano DESC, f.mes DESC LIMIT 24`
    } else if (mes && ano) {
      rows = await db.$queryRaw<any[]>`
        SELECT f.*, s.nome AS servidorNome, s.matricula
        FROM FrequenciaServidor f JOIN Servidor s ON s.id = f.servidorId
        WHERE f.municipioId = ${municipioId} AND f.mes = ${mes} AND f.ano = ${ano}
        ORDER BY s.nome`
    } else {
      const curMes = new Date().getMonth() + 1
      const curAno = new Date().getFullYear()
      rows = await db.$queryRaw<any[]>`
        SELECT f.*, s.nome AS servidorNome, s.matricula
        FROM FrequenciaServidor f JOIN Servidor s ON s.id = f.servidorId
        WHERE f.municipioId = ${municipioId} AND f.mes = ${curMes} AND f.ano = ${curAno}
        ORDER BY s.nome`
    }
    return NextResponse.json({ frequencias: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { servidorId, mes, ano, diasUteis, diasPresenca, diasFalta, horasExtras, observacoes } = await req.json()
  if (!servidorId || !mes || !ano) return NextResponse.json({ erro: 'Dados obrigatórios faltando' }, { status: 400 })
  try {
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO FrequenciaServidor (id, municipioId, servidorId, mes, ano, diasUteis,
                                      diasPresenca, diasFalta, horasExtras, observacoes)
      VALUES (${id}, ${municipioId}, ${servidorId}, ${mes}, ${ano},
              ${diasUteis ?? 22}, ${diasPresenca ?? 22}, ${diasFalta ?? 0},
              ${horasExtras ?? 0}, ${observacoes || null})
      ON DUPLICATE KEY UPDATE
        diasUteis = VALUES(diasUteis), diasPresenca = VALUES(diasPresenca),
        diasFalta = VALUES(diasFalta), horasExtras = VALUES(horasExtras),
        observacoes = VALUES(observacoes)`
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
