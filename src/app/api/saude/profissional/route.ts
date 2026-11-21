import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function municipioId(req: NextRequest) {
  return req.headers.get('x-erp-municipio-id') ?? ''
}

export async function GET(req: NextRequest) {
  const mid = municipioId(req)
  const { searchParams } = new URL(req.url)
  const unidadeId = searchParams.get('unidadeId')

  try {
    let profissionais: any[]
    if (unidadeId) {
      profissionais = await db.$queryRaw`
        SELECT ps.id, ps.nome, ps.especialidade, ps.cargo, ps.conselho,
               ps.numeroConselho, ps.telefone, ps.email, ps.ativo,
               u.nome AS unidadeNome
        FROM ProfissionalSaude ps
        LEFT JOIN UnidadeSaude u ON u.id = ps.unidadeId
        WHERE ps.municipioId = ${mid} AND ps.unidadeId = ${unidadeId}
        ORDER BY ps.nome`
    } else {
      profissionais = await db.$queryRaw`
        SELECT ps.id, ps.nome, ps.especialidade, ps.cargo, ps.conselho,
               ps.numeroConselho, ps.telefone, ps.email, ps.ativo,
               u.nome AS unidadeNome
        FROM ProfissionalSaude ps
        LEFT JOIN UnidadeSaude u ON u.id = ps.unidadeId
        WHERE ps.municipioId = ${mid}
        ORDER BY ps.nome`
    }
    return NextResponse.json({ profissionais })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const mid = municipioId(req)
  const { nome, unidadeId, cpf, cns, especialidade, conselho,
    numeroConselho, cargo, telefone, email } = await req.json()

  if (!nome?.trim()) return NextResponse.json({ erro: 'Nome obrigatório' }, { status: 400 })

  try {
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO ProfissionalSaude (id, municipioId, unidadeId, nome, cpf, cns,
                                     especialidade, conselho, numeroConselho, cargo, telefone, email)
      VALUES (${id}, ${mid}, ${unidadeId || null}, ${nome.trim()},
              ${cpf?.replace(/\D/g, '') || null}, ${cns?.replace(/\D/g, '') || null},
              ${especialidade || null}, ${conselho || null}, ${numeroConselho || null},
              ${cargo || null}, ${telefone || null}, ${email || null})`
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
