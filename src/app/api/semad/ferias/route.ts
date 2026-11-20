import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function mid(req: NextRequest) { return req.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const servidorId = searchParams.get('servidorId')
  const status     = searchParams.get('status')

  try {
    let ferias: any[]
    if (servidorId) {
      ferias = await db.$queryRaw<any[]>`
        SELECT f.*, s.nome AS servidorNome, s.matricula
        FROM Ferias f JOIN Servidor s ON s.id = f.servidorId
        WHERE f.municipioId = ${municipioId} AND f.servidorId = ${servidorId}
        ORDER BY f.exercicio DESC`
    } else if (status) {
      ferias = await db.$queryRaw<any[]>`
        SELECT f.*, s.nome AS servidorNome, s.matricula
        FROM Ferias f JOIN Servidor s ON s.id = f.servidorId
        WHERE f.municipioId = ${municipioId} AND f.status = ${status}
        ORDER BY f.dataInicio`
    } else {
      ferias = await db.$queryRaw<any[]>`
        SELECT f.*, s.nome AS servidorNome, s.matricula
        FROM Ferias f JOIN Servidor s ON s.id = f.servidorId
        WHERE f.municipioId = ${municipioId}
        ORDER BY f.dataInicio DESC LIMIT 50`
    }
    return NextResponse.json({ ferias })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { servidorId, exercicio, dataInicio, dataFim,
    diasDireito, diasGozo, diasAbono, observacoes } = await req.json()

  if (!servidorId || !exercicio || !dataInicio || !dataFim)
    return NextResponse.json({ erro: 'Dados obrigatórios faltando' }, { status: 400 })

  try {
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO Ferias (id, municipioId, servidorId, exercicio, dataInicio, dataFim,
                          diasDireito, diasGozo, diasAbono, observacoes)
      VALUES (${id}, ${municipioId}, ${servidorId}, ${exercicio}, ${dataInicio}, ${dataFim},
              ${diasDireito ?? 30}, ${diasGozo ?? 30}, ${diasAbono ?? 0}, ${observacoes || null})`
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, status } = await req.json()
  if (!id || !status) return NextResponse.json({ erro: 'ID e status obrigatórios' }, { status: 400 })
  try {
    await db.$queryRaw`UPDATE Ferias SET status = ${status} WHERE id = ${id} AND municipioId = ${municipioId}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
