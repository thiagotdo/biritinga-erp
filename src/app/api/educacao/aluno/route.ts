/**
 * GET  /api/educacao/aluno         - lista alunos com busca
 * GET  /api/educacao/aluno?id=X    - detalhe com matrículas
 * POST /api/educacao/aluno         - cadastra aluno
 * PATCH /api/educacao/aluno        - atualiza aluno
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
  const pcd   = searchParams.get('pcd')
  const bolsa = searchParams.get('bolsaFamilia')

  try {
    if (id) {
      const alunos = await db.$queryRaw`
        SELECT * FROM Aluno WHERE id = ${id} AND municipioId = ${municipioId}
      ` as any[]
      if (!alunos.length) return NextResponse.json({ erro: 'Aluno não encontrado' }, { status: 404 })

      const matriculas = await db.$queryRaw`
        SELECT m.*, t.serie, t.turma, t.turno, t.anoLetivo, e.nome as escolaNome
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
        SELECT id, nome, cpf, nis, dataNascimento, sexo, pcd, bolsaFamilia,
               situacao, responsavelNome, responsavelTelefone
        FROM Aluno
        WHERE municipioId = ${municipioId} AND ativo = 1
          AND (nome LIKE ${like} OR cpf LIKE ${like} OR nis LIKE ${like})
        ORDER BY nome ASC LIMIT 100
      ` as any[]
      return NextResponse.json({ alunos, total: alunos.length })
    }

    // Filtros opcionais
    let sql = `SELECT id, nome, cpf, nis, dataNascimento, sexo, pcd, bolsaFamilia,
                      situacao, responsavelNome, responsavelTelefone
               FROM Aluno WHERE municipioId = ${municipioId} AND ativo = 1`

    const filters: string[] = []
    if (pcd === '1')   filters.push(' AND pcd = 1')
    if (bolsa === '1') filters.push(' AND bolsaFamilia = 1')

    const alunos = await db.$queryRaw`
      SELECT id, nome, cpf, nis, dataNascimento, sexo, pcd, bolsaFamilia,
             situacao, responsavelNome, responsavelTelefone
      FROM Aluno
      WHERE municipioId = ${municipioId} AND ativo = 1
        ${pcd === '1' ? 'AND pcd = 1' : ''}
        ${bolsa === '1' ? 'AND bolsaFamilia = 1' : ''}
      ORDER BY nome ASC LIMIT 200
    ` as any[]

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
    const { nome, nomeMae, nomePai, cpf, nis, dataNascimento, sexo, racaCor,
            logradouro, numero, bairro, cep,
            responsavelNome, responsavelTelefone, responsavelEmail, responsavelCpf,
            bolsaFamilia, pcd, laudoPcd } = body

    if (!nome) return NextResponse.json({ erro: 'Nome é obrigatório' }, { status: 400 })

    const cpfLimpo = cpf ? cpf.replace(/\D/g, '') : null
    if (cpfLimpo) {
      const existe = await db.Aluno.findFirst({ where: { municipioId, cpf: cpfLimpo } })
      if (existe) return NextResponse.json({ erro: 'CPF já cadastrado', alunoId: existe.id }, { status: 409 })
    }

    const aluno = await db.Aluno.create({
      data: {
        id: randomUUID(), municipioId, nome,
        nomeMae: nomeMae || null, nomePai: nomePai || null,
        cpf: cpfLimpo, nis: nis ? nis.replace(/\D/g, '') : null,
        dataNascimento: dataNascimento || null,
        sexo: sexo || null, racaCor: racaCor || null,
        logradouro: logradouro || null, numero: numero || null,
        bairro: bairro || null, cep: cep || null,
        responsavelNome: responsavelNome || null,
        responsavelTelefone: responsavelTelefone || null,
        responsavelEmail: responsavelEmail || null,
        responsavelCpf: responsavelCpf || null,
        bolsaFamilia: bolsaFamilia ? 1 : 0,
        pcd: pcd ? 1 : 0,
        laudoPcd: laudoPcd || null,
      },
    })

    return NextResponse.json({ aluno }, { status: 201 })
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

    const aluno = await db.Aluno.findFirst({ where: { id, municipioId } })
    if (!aluno) return NextResponse.json({ erro: 'Aluno não encontrado' }, { status: 404 })

    if (dados.cpf) dados.cpf = dados.cpf.replace(/\D/g, '')
    if (dados.nis) dados.nis = dados.nis.replace(/\D/g, '')

    await db.Aluno.update({ where: { id }, data: dados })
    return NextResponse.json({ sucesso: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
