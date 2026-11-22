/**
 * GET  /api/educacao/turma           - lista turmas
 * GET  /api/educacao/turma?id=X      - detalhe com alunos matriculados
 * POST /api/educacao/turma           - cria turma
 * PATCH /api/educacao/turma          - atualiza turma
 *
 * Schema (Turma): id, escolaId, municipioId, codigo, etapa, ano, serie, turno, capacidade, sala
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
  const id       = searchParams.get('id')
  const escolaId = searchParams.get('escolaId')
  const ano      = searchParams.get('ano') ?? searchParams.get('anoLetivo')
  const turno    = searchParams.get('turno')
  const etapa    = searchParams.get('etapa')

  try {
    if (id) {
      const turmas = await db.$queryRaw`
        SELECT t.*, e.nome as escolaNome,
          COUNT(m.id) as totalMatriculas
        FROM Turma t
        JOIN Escola e ON e.id = t.escolaId
        LEFT JOIN Matricula m ON m.turmaId = t.id AND m.situacao = 'ATIVA'
        WHERE t.id = ${id} AND t.municipioId = ${municipioId}
        GROUP BY t.id
      ` as any[]
      if (!turmas.length) return NextResponse.json({ erro: 'Turma não encontrada' }, { status: 404 })

      const alunos = await db.$queryRaw`
        SELECT m.id as matriculaId, m.numeroChamada, m.situacao,
               a.id as alunoId, a.nome, a.nee
        FROM Matricula m
        JOIN Aluno a ON a.id = m.alunoId
        WHERE m.turmaId = ${id} AND m.situacao = 'ATIVA'
        ORDER BY a.nome ASC
      ` as any[]

      const t = turmas[0]
      return NextResponse.json({
        turma: {
          ...t,
          vagasDisponiveis: t.capacidade - Number(t.totalMatriculas),
          lotado: Number(t.totalMatriculas) >= t.capacidade,
          matriculas: alunos,
        },
      })
    }

    // Monta filtros dinamicamente
    const anoInt = ano ? parseInt(ano) : null

    let turmas: any[]

    if (escolaId && anoInt && turno) {
      turmas = await db.$queryRaw`
        SELECT t.*, e.nome as escolaNome, COUNT(m.id) as totalMatriculas
        FROM Turma t JOIN Escola e ON e.id = t.escolaId
        LEFT JOIN Matricula m ON m.turmaId = t.id AND m.situacao = 'ATIVA'
        WHERE t.municipioId = ${municipioId}
          AND t.escolaId = ${escolaId} AND t.ano = ${anoInt} AND t.turno = ${turno}
        GROUP BY t.id ORDER BY t.etapa ASC, t.serie ASC, t.codigo ASC
      ` as any[]
    } else if (escolaId && anoInt) {
      turmas = await db.$queryRaw`
        SELECT t.*, e.nome as escolaNome, COUNT(m.id) as totalMatriculas
        FROM Turma t JOIN Escola e ON e.id = t.escolaId
        LEFT JOIN Matricula m ON m.turmaId = t.id AND m.situacao = 'ATIVA'
        WHERE t.municipioId = ${municipioId}
          AND t.escolaId = ${escolaId} AND t.ano = ${anoInt}
        GROUP BY t.id ORDER BY t.etapa ASC, t.serie ASC, t.codigo ASC
      ` as any[]
    } else if (escolaId) {
      turmas = await db.$queryRaw`
        SELECT t.*, e.nome as escolaNome, COUNT(m.id) as totalMatriculas
        FROM Turma t JOIN Escola e ON e.id = t.escolaId
        LEFT JOIN Matricula m ON m.turmaId = t.id AND m.situacao = 'ATIVA'
        WHERE t.municipioId = ${municipioId} AND t.escolaId = ${escolaId}
        GROUP BY t.id ORDER BY t.etapa ASC, t.serie ASC, t.codigo ASC
      ` as any[]
    } else if (anoInt && etapa) {
      turmas = await db.$queryRaw`
        SELECT t.*, e.nome as escolaNome, COUNT(m.id) as totalMatriculas
        FROM Turma t JOIN Escola e ON e.id = t.escolaId
        LEFT JOIN Matricula m ON m.turmaId = t.id AND m.situacao = 'ATIVA'
        WHERE t.municipioId = ${municipioId} AND t.ano = ${anoInt} AND t.etapa = ${etapa}
        GROUP BY t.id ORDER BY e.nome ASC, t.serie ASC, t.codigo ASC
      ` as any[]
    } else if (anoInt) {
      turmas = await db.$queryRaw`
        SELECT t.*, e.nome as escolaNome, COUNT(m.id) as totalMatriculas
        FROM Turma t JOIN Escola e ON e.id = t.escolaId
        LEFT JOIN Matricula m ON m.turmaId = t.id AND m.situacao = 'ATIVA'
        WHERE t.municipioId = ${municipioId} AND t.ano = ${anoInt}
        GROUP BY t.id ORDER BY e.nome ASC, t.etapa ASC, t.serie ASC, t.codigo ASC
      ` as any[]
    } else {
      const anoAtual = new Date().getFullYear()
      turmas = await db.$queryRaw`
        SELECT t.*, e.nome as escolaNome, COUNT(m.id) as totalMatriculas
        FROM Turma t JOIN Escola e ON e.id = t.escolaId
        LEFT JOIN Matricula m ON m.turmaId = t.id AND m.situacao = 'ATIVA'
        WHERE t.municipioId = ${municipioId} AND t.ano = ${anoAtual}
        GROUP BY t.id ORDER BY e.nome ASC, t.etapa ASC, t.serie ASC, t.codigo ASC
      ` as any[]
    }

    const enriched = turmas.map(t => ({
      ...t,
      vagasDisponiveis: t.capacidade - Number(t.totalMatriculas),
      lotado: Number(t.totalMatriculas) >= t.capacidade,
      _count: { matriculas: Number(t.totalMatriculas) },
    }))

    return NextResponse.json({ turmas: enriched, total: turmas.length })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Sem município' }, { status: 401 })

  try {
    const { escolaId, codigo, etapa, serie, turno, ano, capacidade, sala } = await req.json()

    if (!escolaId || !codigo || !etapa || !turno) {
      return NextResponse.json({ erro: 'Obrigatórios: escolaId, codigo, etapa, turno' }, { status: 400 })
    }

    const escola = await db.$queryRaw`
      SELECT id FROM Escola WHERE id = ${escolaId} AND municipioId = ${municipioId} LIMIT 1
    ` as any[]
    if (!escola.length) return NextResponse.json({ erro: 'Escola não encontrada' }, { status: 404 })

    const anoLetivo = ano ?? new Date().getFullYear()

    const existente = await db.$queryRaw`
      SELECT id FROM Turma WHERE municipioId = ${municipioId} AND escolaId = ${escolaId}
        AND codigo = ${codigo} AND ano = ${anoLetivo} LIMIT 1
    ` as any[]
    if (existente.length) {
      return NextResponse.json({ erro: 'Turma já existe para este período e escola', turmaId: existente[0].id }, { status: 409 })
    }

    const id = randomUUID()
    await db.$queryRaw`
      INSERT INTO Turma (id, municipioId, escolaId, codigo, etapa, serie, turno, ano, capacidade, sala, criadoEm, atualizadoEm)
      VALUES (${id}, ${municipioId}, ${escolaId}, ${codigo}, ${etapa}, ${serie ?? null}, ${turno}, ${anoLetivo}, ${capacidade ?? 30}, ${sala ?? null}, NOW(), NOW())
    `

    return NextResponse.json({ turma: { id, municipioId, escolaId, codigo, etapa, serie, turno, ano: anoLetivo, capacidade: capacidade ?? 30 } }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Sem município' }, { status: 401 })

  try {
    const { id, codigo, etapa, serie, turno, capacidade, sala } = await req.json()
    if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

    const turma = await db.$queryRaw`
      SELECT id FROM Turma WHERE id = ${id} AND municipioId = ${municipioId} LIMIT 1
    ` as any[]
    if (!turma.length) return NextResponse.json({ erro: 'Turma não encontrada' }, { status: 404 })

    const sets: string[] = []
    if (codigo    !== undefined) sets.push(`codigo = '${codigo}'`)
    if (etapa     !== undefined) sets.push(`etapa = '${etapa}'`)
    if (serie     !== undefined) sets.push(`serie = '${serie}'`)
    if (turno     !== undefined) sets.push(`turno = '${turno}'`)
    if (capacidade !== undefined) sets.push(`capacidade = ${capacidade}`)
    if (sala      !== undefined) sets.push(`sala = '${sala}'`)
    sets.push(`atualizadoEm = NOW()`)

    if (sets.length > 1) {
      await db.$queryRaw`UPDATE Turma SET ${sets.join(', ')} WHERE id = ${id}`
    }

    return NextResponse.json({ sucesso: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
