import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function mid(req: NextRequest) { return req.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const id      = searchParams.get('id')
  const busca   = searchParams.get('busca')
  const situacao= searchParams.get('situacao')
  const page    = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit   = 20
  const offset  = (page - 1) * limit

  try {
    if (id) {
      const rows = await db.$queryRaw<any[]>`
        SELECT s.*, c.nome AS cargoNome
        FROM Servidor s
        LEFT JOIN Cargo c ON c.id = s.cargoId
        WHERE s.id = ${id} AND s.municipioId = ${municipioId} LIMIT 1`
      if (!rows.length) return NextResponse.json({ erro: 'Servidor não encontrado' }, { status: 404 })

      const lotacoes = await db.$queryRaw<any[]>`
        SELECT * FROM Lotacao WHERE servidorId = ${id} ORDER BY dataInicio DESC LIMIT 5`
      const ferias = await db.$queryRaw<any[]>`
        SELECT * FROM Ferias WHERE servidorId = ${id} ORDER BY exercicio DESC LIMIT 5`

      return NextResponse.json({ servidor: rows[0], lotacoes, ferias })
    }

    if (busca && busca.length >= 2) {
      const like = `%${busca}%`
      const rows = await db.$queryRaw<any[]>`
        SELECT s.id, s.matricula, s.nome, s.cpf, s.vinculo, s.situacao, s.dataAdmissao,
               c.nome AS cargoNome
        FROM Servidor s LEFT JOIN Cargo c ON c.id = s.cargoId
        WHERE s.municipioId = ${municipioId}
          AND (s.nome LIKE ${like} OR s.matricula LIKE ${like} OR s.cpf LIKE ${like})
        ORDER BY s.nome LIMIT 50`
      return NextResponse.json({ servidores: rows })
    }

    // Lista com filtro opcional de situação
    let rows: any[]
    const countR = situacao
      ? await db.$queryRaw<any[]>`SELECT COUNT(*) AS t FROM Servidor WHERE municipioId = ${municipioId} AND situacao = ${situacao} AND ativo = 1`
      : await db.$queryRaw<any[]>`SELECT COUNT(*) AS t FROM Servidor WHERE municipioId = ${municipioId} AND ativo = 1`

    if (situacao) {
      rows = await db.$queryRaw<any[]>`
        SELECT s.id, s.matricula, s.nome, s.cpf, s.vinculo, s.regime, s.situacao,
               s.dataAdmissao, s.salarioBase, c.nome AS cargoNome
        FROM Servidor s LEFT JOIN Cargo c ON c.id = s.cargoId
        WHERE s.municipioId = ${municipioId} AND s.situacao = ${situacao} AND s.ativo = 1
        ORDER BY s.nome LIMIT ${limit} OFFSET ${offset}`
    } else {
      rows = await db.$queryRaw<any[]>`
        SELECT s.id, s.matricula, s.nome, s.cpf, s.vinculo, s.regime, s.situacao,
               s.dataAdmissao, s.salarioBase, c.nome AS cargoNome
        FROM Servidor s LEFT JOIN Cargo c ON c.id = s.cargoId
        WHERE s.municipioId = ${municipioId} AND s.ativo = 1
        ORDER BY s.nome LIMIT ${limit} OFFSET ${offset}`
    }

    const total = Number(countR[0]?.t ?? 0)
    return NextResponse.json({ servidores: rows, total, page, pages: Math.ceil(total / limit) })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const body = await req.json()
  const { matricula, nome, cpf, dataNascimento, sexo, estadoCivil,
    email, emailInstitucional, telefone, celular, cep, logradouro,
    numero, bairro, cidade, estado, cargoId, vinculo, regime,
    dataAdmissao, cargaHoraria, salarioBase } = body

  if (!matricula || !nome || !cpf || !dataAdmissao)
    return NextResponse.json({ erro: 'Matricula, nome, CPF e dataAdmissão obrigatórios' }, { status: 400 })

  const cpfClean = cpf.replace(/\D/g, '')
  try {
    const dup = await db.$queryRaw<any[]>`
      SELECT id FROM Servidor WHERE municipioId = ${municipioId} AND matricula = ${matricula} LIMIT 1`
    if (dup.length) return NextResponse.json({ erro: 'Matrícula já cadastrada' }, { status: 409 })

    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO Servidor (id, municipioId, matricula, nome, cpf, dataNascimento, sexo,
                            estadoCivil, email, emailInstitucional, telefone, celular,
                            cep, logradouro, numero, bairro, cidade, estado, cargoId,
                            vinculo, regime, dataAdmissao, cargaHoraria, salarioBase)
      VALUES (${id}, ${municipioId}, ${matricula}, ${nome}, ${cpfClean},
              ${dataNascimento || null}, ${sexo || null}, ${estadoCivil || null},
              ${email || null}, ${emailInstitucional || null}, ${telefone || null},
              ${celular || null}, ${cep || null}, ${logradouro || null}, ${numero || null},
              ${bairro || null}, ${cidade || null}, ${estado || null}, ${cargoId || null},
              ${vinculo ?? 'EFETIVO'}, ${regime ?? 'ESTATUTARIO'}, ${dataAdmissao},
              ${cargaHoraria ?? 40}, ${salarioBase || null})`

    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, situacao, cargoId, salarioBase, email, celular, bairro, observacoes } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })
  try {
    if (situacao    !== undefined) await db.$queryRaw`UPDATE Servidor SET situacao    = ${situacao}    WHERE id = ${id} AND municipioId = ${municipioId}`
    if (cargoId     !== undefined) await db.$queryRaw`UPDATE Servidor SET cargoId     = ${cargoId}     WHERE id = ${id} AND municipioId = ${municipioId}`
    if (salarioBase !== undefined) await db.$queryRaw`UPDATE Servidor SET salarioBase = ${salarioBase} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (email       !== undefined) await db.$queryRaw`UPDATE Servidor SET email       = ${email}       WHERE id = ${id} AND municipioId = ${municipioId}`
    if (celular     !== undefined) await db.$queryRaw`UPDATE Servidor SET celular     = ${celular}     WHERE id = ${id} AND municipioId = ${municipioId}`
    if (bairro      !== undefined) await db.$queryRaw`UPDATE Servidor SET bairro      = ${bairro}      WHERE id = ${id} AND municipioId = ${municipioId}`
    if (observacoes !== undefined) await db.$queryRaw`UPDATE Servidor SET observacoes = ${observacoes} WHERE id = ${id} AND municipioId = ${municipioId}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
