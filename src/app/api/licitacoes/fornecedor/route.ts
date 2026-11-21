import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')

  try {
    // Fornecedores são os mesmos da tabela Contribuinte tipo PJ
    let rows: any[]
    if (q && q.length >= 3) {
      const like = `%${q}%`
      rows = await db.$queryRaw`
        SELECT id, nome, cpfCnpj, email, telefone, ie AS inscricaoEstadual
        FROM Contribuinte
        WHERE municipioId = ${municipioId} AND ativo = 1
          AND (nome LIKE ${like} OR cpfCnpj LIKE ${like})
        LIMIT 30`
    } else {
      rows = await db.$queryRaw`
        SELECT id, nome, cpfCnpj, email, telefone, ie AS inscricaoEstadual
        FROM Contribuinte
        WHERE municipioId = ${municipioId} AND tipo = 'PJ' AND ativo = 1
        ORDER BY nome LIMIT 100`
    }
    return NextResponse.json({ fornecedores: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { nome, cnpj, email, telefone, logradouro, numero, bairro, cep, ie } = await req.json()
  if (!nome?.trim() || !cnpj) return NextResponse.json({ erro: 'Nome e CNPJ obrigatórios' }, { status: 400 })
  const doc = cnpj.replace(/\D/g, '')
  try {
    const dup = await db.$queryRaw`SELECT id FROM Contribuinte WHERE municipioId = ${municipioId} AND cpfCnpj = ${doc} LIMIT 1`
    if (dup.length) return NextResponse.json({ erro: 'CNPJ já cadastrado' }, { status: 409 })
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO Contribuinte (id, municipioId, nome, cpfCnpj, tipo, email, telefone,
                                logradouro, numero, bairro, cep, ie)
      VALUES (${id}, ${municipioId}, ${nome.trim()}, ${doc}, 'PJ',
              ${email || null}, ${telefone || null}, ${logradouro || null},
              ${numero || null}, ${bairro || null}, ${cep || null}, ${ie || null})`
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
