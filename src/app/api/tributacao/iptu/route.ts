import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const contribuinteId = searchParams.get('contribuinteId')
  const ano = searchParams.get('ano') ?? new Date().getFullYear()
  // competencia é 'YYYY-MM'; filtramos pelo ano via LIKE 'YYYY-%'
  const competenciaLike = `${ano}-%`

  try {
    let rows: any[]
    if (contribuinteId) {
      rows = await db.$queryRaw`
        SELECT d.*, c.nome AS contribuinteNome
        FROM DebitoTributario d JOIN Contribuinte c ON c.id = d.contribuinteId
        WHERE d.municipioId = ${municipioId} AND d.contribuinteId = ${contribuinteId}
          AND d.tipo = 'IPTU'
        ORDER BY d.vencimento DESC`
    } else {
      rows = await db.$queryRaw`
        SELECT d.*, c.nome AS contribuinteNome, c.cpfCnpj
        FROM DebitoTributario d JOIN Contribuinte c ON c.id = d.contribuinteId
        WHERE d.municipioId = ${municipioId} AND d.tipo = 'IPTU'
          AND d.competencia LIKE ${competenciaLike}
        ORDER BY c.nome LIMIT 200`
    }
    return NextResponse.json({ lancamentos: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { contribuinteId, ano, mes, valorOriginal, vencimento, inscricaoImovel } = await req.json()
  if (!contribuinteId || !valorOriginal)
    return NextResponse.json({ erro: 'Dados obrigatórios faltando' }, { status: 400 })

  const anoReal = ano ?? new Date().getFullYear()
  const mesReal = String(mes ?? 1).padStart(2, '0')
  const competencia = `${anoReal}-${mesReal}`

  try {
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO DebitoTributario
        (id, municipioId, contribuinteId, tipo, competencia,
         valorOriginal, valorTotal, vencimento, descricao, status)
      VALUES
        (${id}, ${municipioId}, ${contribuinteId}, 'IPTU', ${competencia},
         ${valorOriginal}, ${valorOriginal},
         ${vencimento ?? null},
         ${inscricaoImovel ? `Inscrição: ${inscricaoImovel}` : null},
         'ABERTO')`
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
