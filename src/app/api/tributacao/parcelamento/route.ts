import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const contribuinteId = searchParams.get('contribuinteId')
  const status = searchParams.get('status')

  try {
    let rows: any[]
    if (contribuinteId) {
      rows = await db.$queryRaw<any[]>`
        SELECT p.*, c.nome AS contribuinteNome
        FROM Parcelamento p JOIN Contribuinte c ON c.id = p.contribuinteId
        WHERE p.municipioId = ${municipioId} AND p.contribuinteId = ${contribuinteId}
        ORDER BY p.dataAcordo DESC`
    } else {
      const statusFilter = status ?? 'ATIVO'
      rows = await db.$queryRaw<any[]>`
        SELECT p.*, c.nome AS contribuinteNome, c.cpfCnpj
        FROM Parcelamento p JOIN Contribuinte c ON c.id = p.contribuinteId
        WHERE p.municipioId = ${municipioId} AND p.status = ${statusFilter}
        ORDER BY p.dataAcordo DESC LIMIT 100`
    }
    return NextResponse.json({ parcelamentos: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { contribuinteId, debitoIds, valorTotal, numeroParcelas, valorParcela, dataAcordo, observacoes } = await req.json()
  if (!contribuinteId || !valorTotal || !numeroParcelas)
    return NextResponse.json({ erro: 'Dados obrigatórios faltando' }, { status: 400 })
  try {
    const id = crypto.randomUUID()
    const parcVal = valorParcela ?? (valorTotal / numeroParcelas)
    await db.$queryRaw`
      INSERT INTO Parcelamento (id, municipioId, contribuinteId, valorTotal, numeroParcelas,
                                valorParcela, parcelasPagas, dataAcordo, observacoes)
      VALUES (${id}, ${municipioId}, ${contribuinteId}, ${valorTotal}, ${numeroParcelas},
              ${parcVal}, 0, ${dataAcordo || new Date().toISOString().slice(0,10)}, ${observacoes || null})`
    // Vincular débitos
    if (Array.isArray(debitoIds) && debitoIds.length) {
      for (const dId of debitoIds) {
        await db.$queryRaw`UPDATE DebitoTributario SET parcelamentoId = ${id}, status = 'PARCELADO' WHERE id = ${dId} AND municipioId = ${municipioId}`
      }
    }
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, parcelasPagas, status } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })
  try {
    if (parcelasPagas !== undefined) await db.$queryRaw`UPDATE Parcelamento SET parcelasPagas = ${parcelasPagas} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (status !== undefined) await db.$queryRaw`UPDATE Parcelamento SET status = ${status} WHERE id = ${id} AND municipioId = ${municipioId}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
