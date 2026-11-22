/**
 * GET  /api/educacao/aluno         - lista alunos com busca
 * GET  /api/educacao/aluno?id=X    - detalhe com matrículas
 * POST /api/educacao/aluno         - cadastra aluno
 * PATCH /api/educacao/aluno        - atualiza aluno
 *
 * Schema (Aluno): id, municipioId, nome, cpf, dataNascimento, sexo, nomeMae, nomePai,
 *   responsavel, telefoneResponsavel, logradouro, bairro, zona, nee, laudoNEE, ativo
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
  const id    = searchParams.get('id')
  const busca = searchParams.get('busca')
  const nee   = searchParams.get('nee')

  try {
    if (id) {
      const alunos = await db.$queryRaw`
        SELECT * FROM Aluno WHERE id = ${id} AND municipioId = ${municipioId}
      ` as any[]
      if (!alunos.length) return NextResponse.json({ erro: 'Aluno não encontrado' }, { status: 404 })

      const matriculas = await db.$queryRaw`
        SELECT m.*, t.serie, t.codigo, t.turno, t.ano as anoLetivo, t.etapa,
               e.nome as escolaNome
        FROM Matricula m
        JOIN Turma t ON t.id = m.turmaId
        JOIN Escola e ON e.id = t.escolaId
        WHERE m.alunoId = ${id}
        ORDER BY m.anoLetivo DESC
      ` as any[]

      return NextResponse.json({ aluno: { ...alunos[0], matriculas } })
    }

    if (busca) {
      const like = `%${busca}%`
      const alunos = await db.$queryRaw`
        SELECT id, nome, cpf, dataNascimento, sexo, nee, ativo,
               responsavel, telefoneResponsavel
        FROM Aluno
        WHERE municipioId = ${municipioId} AND ativo = 1
          AND (nome LIKE ${like} OR cpf LIKE ${like})
        ORDER BY nome ASC LIMIT 100
      ` as any[]
      return NextResponse.json({ alunos, total: alunos.length })
    }

    // Listagem geral com filtro opcional por NEE
    let alunos: any[]
    if (nee === '1') {
      alunos = await db.$queryRaw`
        SELECT id, nome, cpf, dataNascimento, sexo, nee, ativo,
               responsavel, telefoneResponsavel, bairro
        FROM Aluno
        WHERE municipioId = ${municipioId} AND ativo = 1 AND nee = 1
        ORDER BY nome ASC LIMIT 300
      ` as any[]
    } else {
      alunos = await db.$queryRaw`
        SELECT id, nome, cpf, dataNascimento, sexo, nee, ativo,
               responsavel, telefoneResponsavel, bairro
        FROM Aluno
        WHERE municipioId = ${municipioId} AND ativo = 1
        ORDER BY nome ASC LIMIT 300
      ` as any[]
    }

    return NextResponse.json({ alunos, total: alunos.length })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Sem município' }, { status: 401 })

  try {
    const body = await req.json()
    const {
      nome, nomeMae, nomePai, cpf, dataNascimento, sexo,
      logradouro, bairro, zona, cep,
      responsavel, telefoneResponsavel,
      nee, laudoNEE,
    } = body

    if (!nome) return NextResponse.json({ erro: 'Nome é obrigatório' }, { status: 400 })

    const cpfLimpo = cpf ? cpf.replace(/\D/g, '') : null
    if (cpfLimpo) {
      const existe = await db.$queryRaw`
        SELECT id FROM Aluno WHERE municipioId = ${municipioId} AND cpf = ${cpfLimpo} LIMIT 1
      ` as any[]
      if (existe.length) return NextResponse.json({ erro: 'CPF já cadastrado', alunoId: existe[0].id }, { status: 409 })
    }

    const id = randomUUID()
    await db.$queryRaw`
      INSERT INTO Aluno (id, municipioId, nome, nomeMae, nomePai, cpf, dataNascimento,
        sexo, logradouro, bairro, zona, responsavel, telefoneResponsavel,
        nee, laudoNEE, ativo, criadoEm, atualizadoEm)
      VALUES (
        ${id}, ${municipioId}, ${nome},
        ${nomeMae ?? null}, ${nomePai ?? null}, ${cpfLimpo},
        ${dataNascimento ?? null}, ${sexo ?? null},
        ${logradouro ?? null}, ${bairro ?? null}, ${zona ?? null},
        ${responsavel ?? null}, ${telefoneResponsavel ?? null},
        ${nee ? 1 : 0}, ${laudoNEE ?? null}, 1, NOW(), NOW()
      )
    `

    return NextResponse.json({ aluno: { id, nome, municipioId } }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Sem município' }, { status: 401 })

  try {
    const { id, ...dados } = await req.json()
    if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

    const aluno = await db.$queryRaw`
      SELECT id FROM Aluno WHERE id = ${id} AND municipioId = ${municipioId} LIMIT 1
    ` as any[]
    if (!aluno.length) return NextResponse.json({ erro: 'Aluno não encontrado' }, { status: 404 })

    // Campos permitidos para update
    const allowed = ['nome', 'nomeMae', 'nomePai', 'cpf', 'dataNascimento', 'sexo',
                     'logradouro', 'bairro', 'zona', 'responsavel', 'telefoneResponsavel',
                     'nee', 'laudoNEE', 'ativo']
    const sets = Object.entries(dados)
      .filter(([k]) => allowed.includes(k))
      .map(([k, v]) => `\`${k}\` = ${v === null ? 'NULL' : `'${String(v).replace(/'/g, "\\'")}'`}`)

    if (sets.length) {
      sets.push('atualizadoEm = NOW()')
      await db.$queryRaw`UPDATE Aluno SET ${sets.join(', ')} WHERE id = ${id}`
    }

    return NextResponse.json({ sucesso: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
