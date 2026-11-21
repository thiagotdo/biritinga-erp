import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function mid(req: NextRequest) { return req.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const servidorId  = searchParams.get('servidorId')
  const secretaria  = searchParams.get('secretaria')

  try {
    let rows: any[]
    if (servidorId) {
      rows = await db.$queryRaw`
        SELECT l.*, s.nome AS servidorNome, s.matricula
        FROM Lotacao l JOIN Servidor s ON s.id = l.servidorId
        WHERE l.municipioId = ${municipioId} AND l.servidorId = ${servidorId}
        ORDER BY l.dataInicio DESC`
    } else if (secretaria) {
      rows = await db.$queryRaw`
        SELECT l.*, s.nome AS servidorNome, s.matricula
        FROM Lotacao l JOIN Servidor s ON s.id = l.servidorId
        WHERE l.municipioId = ${municipioId} AND l.secretaria = ${secretaria} AND l.ativo = 1
        ORDER BY s.nome`
    } else {
      rows = await db.$queryRaw`
        SELECT l.secretaria, COUNT(*) AS totalServidores
        FROM Lotacao l
        WHERE l.municipioId = ${municipioId} AND l.ativo = 1
        GROUP BY l.secretaria
        ORDER BY l.secretaria`
    }
    return NextResponse.json({ lotacoes: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { servidorId, secretaria, setor, funcao, dataInicio, portaria } = await req.json()
  if (!servidorId || !secretaria || !dataInicio)
    return NextResponse.json({ erro: 'Servidor, secretaria e data obrigatórios' }, { status: 400 })
  try {
    // Fechar lotação anterior
    await db.$queryRaw`
      UPDATE Lotacao SET ativo = 0, dataFim = ${dataInicio}
      WHERE servidorId = ${servidorId} AND municipioId = ${municipioId} AND ativo = 1`

    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO Lotacao (id, municipioId, servidorId, secretaria, setor, funcao, dataInicio, portaria)
      VALUES (${id}, ${municipioId}, ${servidorId}, ${secretaria}, ${setor || null},
              ${funcao || null}, ${dataInicio}, ${portaria || null})`
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
