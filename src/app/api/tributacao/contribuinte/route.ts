import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const q = searchParams.get('q')
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = 20
  const offset = (page - 1) * limit

  try {
    if (id) {
      const rows = await db.$queryRaw`SELECT * FROM Contribuinte WHERE id = ${id} AND municipioId = ${municipioId} LIMIT 1`
      if (!rows.length) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
      const debitos = await db.$queryRaw`
        SELECT * FROM DebitoTributario WHERE contribuinteId = ${id} AND municipioId = ${municipioId} ORDER BY anoExercicio DESC, tipo`
      return NextResponse.json({ contribuinte: rows[0], debitos })
    }
    if (q && q.length >= 3) {
      const like = `%${q}%`
      const rows = await db.$queryRaw`
        SELECT * FROM Contribuinte
        WHERE municipioId = ${municipioId} AND ativo = 1
          AND (nome LIKE ${like} OR cpfCnpj LIKE ${like} OR inscricaoMunicipal LIKE ${like})
        LIMIT 30`
      return NextResponse.json({ contribuintes: rows })
    }
    const [total] = await db.$queryRaw`SELECT COUNT(*) AS n FROM Contribuinte WHERE municipioId = ${municipioId} AND ativo = 1`
    const rows = await db.$queryRaw`
      SELECT * FROM Contribuinte WHERE municipioId = ${municipioId} AND ativo = 1
      ORDER BY nome LIMIT ${limit} OFFSET ${offset}`
    return NextResponse.json({ contribuintes: rows, total: Number(total.n), page, limit })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { nome, cpfCnpj, tipo, inscricaoMunicipal, email, telefone,
    logradouro, numero, bairro, cep, ie } = await req.json()
  if (!nome?.trim() || !cpfCnpj) return NextResponse.json({ erro: 'Nome e CPF/CNPJ obrigatórios' }, { status: 400 })

  const doc = cpfCnpj.replace(/\D/g, '')
  try {
    const dup = await db.$queryRaw`SELECT id FROM Contribuinte WHERE municipioId = ${municipioId} AND cpfCnpj = ${doc} LIMIT 1`
    if (dup.length) return NextResponse.json({ erro: 'CPF/CNPJ já cadastrado' }, { status: 409 })
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO Contribuinte (id, municipioId, nome, cpfCnpj, tipo, inscricaoMunicipal,
                                email, telefone, logradouro, numero, bairro, cep, ie)
      VALUES (${id}, ${municipioId}, ${nome.trim()}, ${doc}, ${tipo ?? 'PF'},
              ${inscricaoMunicipal || null}, ${email || null}, ${telefone || null},
              ${logradouro || null}, ${numero || null}, ${bairro || null}, ${cep || null}, ${ie || null})`
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, nome, email, telefone, logradouro, numero, bairro, cep, ativo } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })
  try {
    if (nome !== undefined) await db.$queryRaw`UPDATE Contribuinte SET nome = ${nome} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (email !== undefined) await db.$queryRaw`UPDATE Contribuinte SET email = ${email} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (telefone !== undefined) await db.$queryRaw`UPDATE Contribuinte SET telefone = ${telefone} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (logradouro !== undefined) await db.$queryRaw`UPDATE Contribuinte SET logradouro = ${logradouro} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (numero !== undefined) await db.$queryRaw`UPDATE Contribuinte SET numero = ${numero} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (bairro !== undefined) await db.$queryRaw`UPDATE Contribuinte SET bairro = ${bairro} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (cep !== undefined) await db.$queryRaw`UPDATE Contribuinte SET cep = ${cep} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (ativo !== undefined) await db.$queryRaw`UPDATE Contribuinte SET ativo = ${ativo ? 1 : 0} WHERE id = ${id} AND municipioId = ${municipioId}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
