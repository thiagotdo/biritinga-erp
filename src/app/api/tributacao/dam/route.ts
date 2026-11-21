import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const contribuinteId = searchParams.get('contribuinteId')
  const numero = searchParams.get('numero')

  try {
    if (id) {
      const rows = await db.$queryRaw`
        SELECT d.*, c.nome AS contribuinteNome, c.cpfCnpj
        FROM Dam d JOIN Contribuinte c ON c.id = d.contribuinteId
        WHERE d.id = ${id} AND d.municipioId = ${municipioId} LIMIT 1`
      return NextResponse.json({ dam: rows[0] ?? null })
    }
    if (numero) {
      const rows = await db.$queryRaw`
        SELECT d.*, c.nome AS contribuinteNome
        FROM Dam d JOIN Contribuinte c ON c.id = d.contribuinteId
        WHERE d.municipioId = ${municipioId} AND d.numero = ${numero} LIMIT 1`
      return NextResponse.json({ dam: rows[0] ?? null })
    }
    if (contribuinteId) {
      const rows = await db.$queryRaw`
        SELECT d.* FROM Dam d
        WHERE d.municipioId = ${municipioId} AND d.contribuinteId = ${contribuinteId}
        ORDER BY d.emissao DESC LIMIT 50`
      return NextResponse.json({ dams: rows })
    }
    const rows = await db.$queryRaw`
      SELECT d.*, c.nome AS contribuinteNome
      FROM Dam d JOIN Contribuinte c ON c.id = d.contribuinteId
      WHERE d.municipioId = ${municipioId} AND d.status = 'EMITIDO'
      ORDER BY d.vencimento LIMIT 100`
    return NextResponse.json({ dams: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { contribuinteId, debitoIds, valorTotal, vencimento, observacoes } = await req.json()
  if (!contribuinteId || !valorTotal || !vencimento)
    return NextResponse.json({ erro: 'Dados obrigatórios faltando' }, { status: 400 })
  try {
    // Gerar número sequencial
    const [last] = await db.$queryRaw`
      SELECT numero FROM Dam WHERE municipioId = ${municipioId} ORDER BY numero DESC LIMIT 1`
    const nextNum = last?.numero ? String(Number(last.numero) + 1).padStart(8, '0') : '00000001'

    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO Dam (id, municipioId, numero, contribuinteId, valorTotal, vencimento, observacoes)
      VALUES (${id}, ${municipioId}, ${nextNum}, ${contribuinteId}, ${valorTotal}, ${vencimento}, ${observacoes || null})`

    // Vincular débitos
    if (Array.isArray(debitoIds) && debitoIds.length) {
      for (const dId of debitoIds) {
        await db.$queryRaw`UPDATE DebitoTributario SET damId = ${id}, status = 'EM_DAM' WHERE id = ${dId} AND municipioId = ${municipioId}`
      }
    }
    return NextResponse.json({ id, numero: nextNum }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, status, dataPagamento } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })
  try {
    if (status !== undefined) await db.$queryRaw`UPDATE Dam SET status = ${status} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (dataPagamento !== undefined) await db.$queryRaw`UPDATE Dam SET dataPagamento = ${dataPagamento} WHERE id = ${id} AND municipioId = ${municipioId}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
