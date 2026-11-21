import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function municipioId(req: NextRequest) {
  return req.headers.get('x-erp-municipio-id') ?? ''
}

export async function GET(req: NextRequest) {
  const mid = municipioId(req)
  const { searchParams } = new URL(req.url)
  const id     = searchParams.get('id')
  const busca  = searchParams.get('busca')
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit  = 20
  const offset = (page - 1) * limit

  try {
    // Detalhe de um paciente
    if (id) {
      const rows = await db.$queryRaw`
        SELECT p.*,
               u.nome AS unidadeNome
        FROM Paciente p
        LEFT JOIN UnidadeSaude u ON u.id = p.unidadeReferenciaId
        WHERE p.id = ${id} AND p.municipioId = ${mid}
        LIMIT 1`
      if (!rows.length) return NextResponse.json({ erro: 'Paciente não encontrado' }, { status: 404 })

      // Atendimentos recentes
      const atendimentos = await db.$queryRaw`
        SELECT a.id, a.dataHora, a.tipo, a.cid10, a.queixa,
               u.nome AS unidadeNome, ps.nome AS profissionalNome
        FROM Atendimento a
        LEFT JOIN UnidadeSaude u  ON u.id  = a.unidadeId
        LEFT JOIN ProfissionalSaude ps ON ps.id = a.profissionalId
        WHERE a.pacienteId = ${id} AND a.municipioId = ${mid}
        ORDER BY a.dataHora DESC
        LIMIT 10`

      // Vacinas
      const vacinas = await db.$queryRaw`
        SELECT v.id, v.vacina, v.dose, v.dataAplicacao, v.lote, v.proximaDose
        FROM Vacinacao v
        WHERE v.pacienteId = ${id} AND v.municipioId = ${mid}
        ORDER BY v.dataAplicacao DESC
        LIMIT 20`

      // Próximos agendamentos
      const agendamentos = await db.$queryRaw`
        SELECT ag.id, ag.dataHora, ag.tipo, ag.status, ag.especialidade,
               u.nome AS unidadeNome
        FROM Agendamento ag
        LEFT JOIN UnidadeSaude u ON u.id = ag.unidadeId
        WHERE ag.pacienteId = ${id} AND ag.municipioId = ${mid}
          AND ag.dataHora >= NOW()
          AND ag.status IN ('AGENDADO','CONFIRMADO')
        ORDER BY ag.dataHora ASC
        LIMIT 5`

      return NextResponse.json({ paciente: rows[0], atendimentos, vacinas, agendamentos })
    }

    // Busca
    if (busca && busca.length >= 3) {
      const like = `%${busca}%`
      const pacientes = await db.$queryRaw`
        SELECT p.id, p.nome, p.cpf, p.cns, p.dataNascimento, p.sexo,
               p.telefone, p.situacao, u.nome AS unidadeNome
        FROM Paciente p
        LEFT JOIN UnidadeSaude u ON u.id = p.unidadeReferenciaId
        WHERE p.municipioId = ${mid}
          AND (p.nome LIKE ${like} OR p.cpf LIKE ${like} OR p.cns LIKE ${like})
        ORDER BY p.nome
        LIMIT 50`
      return NextResponse.json({ pacientes })
    }

    // Lista paginada
    const countRows = await db.$queryRaw`
      SELECT COUNT(*) as total FROM Paciente WHERE municipioId = ${mid}`
    const total = Number(countRows[0]?.total ?? 0)

    const pacientes = await db.$queryRaw`
      SELECT p.id, p.nome, p.cpf, p.cns, p.dataNascimento, p.sexo,
             p.telefone, p.situacao, u.nome AS unidadeNome
      FROM Paciente p
      LEFT JOIN UnidadeSaude u ON u.id = p.unidadeReferenciaId
      WHERE p.municipioId = ${mid}
      ORDER BY p.nome
      LIMIT ${limit} OFFSET ${offset}`

    return NextResponse.json({ pacientes, total, page, pages: Math.ceil(total / limit) })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const mid = municipioId(req)
  const body = await req.json()

  const { nome, cpf, cns, dataNascimento, sexo, racaCor, nomeMae,
    logradouro, numero, bairro, cep, telefone, email, unidadeReferenciaId } = body

  if (!nome?.trim()) return NextResponse.json({ erro: 'Nome obrigatório' }, { status: 400 })

  const cpfClean = cpf?.replace(/\D/g, '') || null
  const cnsClean = cns?.replace(/\D/g, '') || null

  try {
    // Checar CPF duplicado
    if (cpfClean) {
      const dup = await db.$queryRaw`
        SELECT id FROM Paciente WHERE municipioId = ${mid} AND cpf = ${cpfClean} LIMIT 1`
      if (dup.length) return NextResponse.json({ erro: 'CPF já cadastrado' }, { status: 409 })
    }

    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO Paciente (id, municipioId, nome, cpf, cns, dataNascimento, sexo, racaCor,
                            nomeMae, logradouro, numero, bairro, cep, telefone, email, unidadeReferenciaId)
      VALUES (${id}, ${mid}, ${nome.trim()}, ${cpfClean}, ${cnsClean},
              ${dataNascimento || null}, ${sexo || null}, ${racaCor || null},
              ${nomeMae || null}, ${logradouro || null}, ${numero || null},
              ${bairro || null}, ${cep || null}, ${telefone || null},
              ${email || null}, ${unidadeReferenciaId || null})`

    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const mid = municipioId(req)
  const { id, nome, telefone, email, situacao, bairro, logradouro, cep, unidadeReferenciaId } = await req.json()

  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

  try {
    if (nome            !== undefined) await db.$queryRaw`UPDATE Paciente SET nome               = ${nome}               WHERE id = ${id} AND municipioId = ${mid}`
    if (telefone        !== undefined) await db.$queryRaw`UPDATE Paciente SET telefone           = ${telefone}           WHERE id = ${id} AND municipioId = ${mid}`
    if (email           !== undefined) await db.$queryRaw`UPDATE Paciente SET email              = ${email}              WHERE id = ${id} AND municipioId = ${mid}`
    if (situacao        !== undefined) await db.$queryRaw`UPDATE Paciente SET situacao           = ${situacao}           WHERE id = ${id} AND municipioId = ${mid}`
    if (bairro          !== undefined) await db.$queryRaw`UPDATE Paciente SET bairro             = ${bairro}             WHERE id = ${id} AND municipioId = ${mid}`
    if (logradouro      !== undefined) await db.$queryRaw`UPDATE Paciente SET logradouro         = ${logradouro}         WHERE id = ${id} AND municipioId = ${mid}`
    if (cep             !== undefined) await db.$queryRaw`UPDATE Paciente SET cep                = ${cep}                WHERE id = ${id} AND municipioId = ${mid}`
    if (unidadeReferenciaId !== undefined) await db.$queryRaw`UPDATE Paciente SET unidadeReferenciaId = ${unidadeReferenciaId} WHERE id = ${id} AND municipioId = ${mid}`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
