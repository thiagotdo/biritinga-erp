import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function municipioId(req: NextRequest) {
  return req.headers.get('x-erp-municipio-id') ?? ''
}

export async function GET(req: NextRequest) {
  const mid = municipioId(req)
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  try {
    if (id) {
      const rows2 = await db.$queryRaw<any[]>`
        SELECT u.*
        FROM UnidadeSaude u
        WHERE u.id = ${id} AND u.municipioId = ${mid}
        LIMIT 1`
      if (!rows2.length) return NextResponse.json({ erro: 'Unidade não encontrada' }, { status: 404 })

      const profissionais = await db.$queryRaw<any[]>`
        SELECT id, nome, especialidade, cargo, telefone, ativo
        FROM ProfissionalSaude
        WHERE unidadeId = ${id} AND municipioId = ${mid}
        ORDER BY nome`

      return NextResponse.json({ unidade: rows2[0], profissionais })
    }

    const unidades = await db.$queryRaw<any[]>`
      SELECT u.id, u.nome, u.tipo, u.cnes, u.bairro, u.telefone, u.responsavel, u.ativo,
        (SELECT COUNT(*) FROM ProfissionalSaude ps WHERE ps.unidadeId = u.id AND ps.ativo = 1) AS totalProfissionais
      FROM UnidadeSaude u
      WHERE u.municipioId = ${mid}
      ORDER BY u.nome`

    return NextResponse.json({ unidades })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const mid = municipioId(req)
  const body = await req.json()
  const { nome, tipo, cnes, cep, logradouro, numero, bairro,
    telefone, email, responsavel, horario } = body

  if (!nome?.trim()) return NextResponse.json({ erro: 'Nome obrigatório' }, { status: 400 })

  try {
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO UnidadeSaude (id, municipioId, nome, tipo, cnes, cep, logradouro,
                                numero, bairro, telefone, email, responsavel, horario)
      VALUES (${id}, ${mid}, ${nome.trim()}, ${tipo ?? 'UBS'}, ${cnes || null},
              ${cep || null}, ${logradouro || null}, ${numero || null}, ${bairro || null},
              ${telefone || null}, ${email || null}, ${responsavel || null}, ${horario || null})`
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const mid = municipioId(req)
  const { id, nome, tipo, cnes, bairro, telefone, email, responsavel, horario, ativo } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })
  try {
    if (nome !== undefined) await db.$queryRaw`UPDATE UnidadeSaude SET nome = ${nome} WHERE id = ${id} AND municipioId = ${mid}`
    if (tipo !== undefined) await db.$queryRaw`UPDATE UnidadeSaude SET tipo = ${tipo} WHERE id = ${id} AND municipioId = ${mid}`
    if (cnes !== undefined) await db.$queryRaw`UPDATE UnidadeSaude SET cnes = ${cnes} WHERE id = ${id} AND municipioId = ${mid}`
    if (bairro !== undefined) await db.$queryRaw`UPDATE UnidadeSaude SET bairro = ${bairro} WHERE id = ${id} AND municipioId = ${mid}`
    if (telefone !== undefined) await db.$queryRaw`UPDATE UnidadeSaude SET telefone = ${telefone} WHERE id = ${id} AND municipioId = ${mid}`
    if (responsavel !== undefined) await db.$queryRaw`UPDATE UnidadeSaude SET responsavel = ${responsavel} WHERE id = ${id} AND municipioId = ${mid}`
    if (ativo !== undefined) await db.$queryRaw`UPDATE UnidadeSaude SET ativo = ${ativo ? 1 : 0} WHERE id = ${id} AND municipioId = ${mid}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
