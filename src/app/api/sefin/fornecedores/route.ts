/**
 * GET  /api/sefin/fornecedores  — lista com busca
 * POST /api/sefin/fornecedores  — cria fornecedor
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

function mid(req: NextRequest) {
  return req.headers.get('x-erp-municipio-id') ?? ''
}

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Sem município' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1'))
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20'))
  const skip  = (page - 1) * limit
  const q     = searchParams.get('q') ?? undefined

  try {
    let data: any[]
    let total: number

    if (q) {
      const like = `%${q}%`
      data = await db.$queryRaw`
        SELECT * FROM Fornecedor
        WHERE municipioId = ${municipioId}
          AND (nome LIKE ${like} OR cpfCnpj LIKE ${like})
        ORDER BY nome LIMIT ${limit} OFFSET ${skip}
      `
      const ct = await db.$queryRaw`
        SELECT COUNT(*) as n FROM Fornecedor
        WHERE municipioId = ${municipioId}
          AND (nome LIKE ${like} OR cpfCnpj LIKE ${like})
      ` as any[]
      total = Number(ct[0]?.n ?? 0)
    } else {
      data  = await db.Fornecedor.findMany({ where: { municipioId }, orderBy: { nome: 'asc' }, take: limit, skip })
      total = await db.Fornecedor.count({ where: { municipioId } })
    }

    return NextResponse.json({ data, meta: { total, page, limit, pages: Math.ceil(total / limit) } })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Sem município' }, { status: 401 })

  try {
    const { cpfCnpj, nome, tipo, email, telefone, endereco } = await req.json()
    if (!cpfCnpj || !nome) return NextResponse.json({ erro: 'cpfCnpj e nome são obrigatórios' }, { status: 400 })

    const fornecedor = await db.Fornecedor.create({
      data: {
        id: randomUUID(),
        municipioId,
        cpfCnpj,
        nome,
        tipo: tipo ?? 'PJ',
        email: email || null,
        telefone: telefone || null,
        endereco: endereco || null,
        ativo: 1,
      },
    })

    return NextResponse.json({ ok: true, fornecedor }, { status: 201 })
  } catch (e: any) {
    if (e.message?.includes('Duplicate entry')) {
      return NextResponse.json({ erro: 'CPF/CNPJ já cadastrado para este município' }, { status: 409 })
    }
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
