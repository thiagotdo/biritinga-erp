/**
 * GET  /api/educacao/turma           - lista turmas
 * GET  /api/educacao/turma?id=X      - detalhe com alunos matriculados
 * POST /api/educacao/turma           - cria turma
 * PATCH /api/educacao/turma          - atualiza turma
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
  const id        = searchParams.get('id')
  const escolaId  = searchParams.get('escolaId')
  const anoLetivo = searchParams.get('anoLetivo')
  const turno     = searchParams.get('turno')

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
        SELECT m.id as matriculaId, m.numero, m.situacao, m.percentualFreq, m.mediaGeral, m.resultadoFinal,
               a.id as alunoId, a.nome, a.pcd, a.bolsaFamilia
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
    const ano = anoLetivo ? parseInt(anoLetivo) : null
    let turmas: any[]

    if (escolaId && ano && turno) {
      turmas = await db.$queryRaw`
        SELECT t.*, e.nome as escolaNome, COUNT(m.id) as totalMatriculas
        FROM Turma t JOIN Escola e ON e.id = t.escolaId
        LEFT JOIN Matricula m ON m.turmaId = t.id AND m.situacao = 'ATIVA'
        WHERE t.municipioId = ${municipioId} AND t.ativo = 1
          AND t.escolaId = ${escolaId} AND t.anoLetivo = ${ano} AND t.turno = ${turno}
        GROUP BY t.id ORDER BY t.serie ASC, t.turma ASC
      ` as any[]
    } else if (escolaId && ano) {
      turmas = await db.$queryRaw`
        SELECT t.*, e.nome as escolaNome, COUNT(m.id) as totalMatriculas
        FROM Turma t JOIN Escola e ON e.id = t.escolaId
        LEFT JOIN Matricula m ON m.turmaId = t.id AND m.situacao = 'ATIVA'
        WHERE t.municipioId = ${municipioId} AND t.ativo = 1
          AND t.escolaId = ${escolaId} AND t.anoLetivo = ${ano}
        GROUP BY t.id ORDER BY t.serie ASC, t.turma ASC
      ` as any[]
    } else if (escolaId) {
      turmas = await db.$queryRaw`
        SELECT t.*, e.nome as escolaNome, COUNT(m.id) as totalMatriculas
        FROM Turma t JOIN Escola e ON e.id = t.escolaId
        LEFT JOIN Matricula m ON m.turmaId = t.id AND m.situacao = 'ATIVA'
        WHERE t.municipioId = ${municipioId} AND t.ativo = 1 AND t.escolaId = ${escolaId}
        GROUP BY t.id ORDER BY t.serie ASC, t.turma ASC
      ` as any[]
    } else if (ano) {
      turmas = await db.$queryRaw`
        SELECT t.*, e.nome as escolaNome, COUNT(m.id) as totalMatriculas
        FROM Turma t JOIN Escola e ON e.id = t.escolaId
        LEFT JOIN Matricula m ON m.turmaId = t.id AND m.situacao = 'ATIVA'
        WHERE t.municipioId = ${municipioId} AND t.ativo = 1 AND t.anoLetivo = ${ano}
        GROUP BY t.id ORDER BY t.serie ASC, t.turma ASC
      ` as any[]
    } else {
      turmas = await db.$queryRaw`
        SELECT t.*, e.nome as escolaNome, COUNT(m.id) as totalMatriculas
        FROM Turma t JOIN Escola e ON e.id = t.escolaId
        LEFT JOIN Matricula m ON m.turmaId = t.id AND m.situacao = 'ATIVA'
        WHERE t.municipioId = ${municipioId} AND t.ativo = 1
        GROUP BY t.id ORDER BY t.serie ASC, t.turma ASC
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
    const { escolaId, serie, segmento, turma, turno, anoLetivo,
            professorNome, professorEmail, capacidade } = await req.json()

    if (!escolaId || !serie || !turma || !turno) {
      return NextResponse.json({ erro: 'Obrigatórios: escolaId, serie, turma, turno' }, { status: 400 })
    }

    const escola = await db.Escola.findFirst({ where: { id: escolaId, municipioId } })
    if (!escola) return NextResponse.json({ erro: 'Escola não encontrada' }, { status: 404 })

    const ano = anoLetivo ?? new Date().getFullYear()
    const existente = await db.Turma.findFirst({
      where: { municipioId, escolaId, serie, turma, turno, anoLetivo: ano },
    })
    if (existente) {
      return NextResponse.json({ erro: 'Turma já existe para este período e escola', turmaId: existente.id }, { status: 409 })
    }

    const created = await db.Turma.create({
      data: {
        id: randomUUID(), municipioId, escolaId, serie,
        segmento: segmento ?? 'EF1', turma, turno,
        anoLetivo: ano,
        professorNome: professorNome || null,
        professorEmail: professorEmail || null,
        capacidade: capacidade ?? 30,
      },
    })

    return NextResponse.json({ turma: created }, { status: 201 })
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

    const turma = await db.Turma.findFirst({ where: { id, municipioId } })
    if (!turma) return NextResponse.json({ erro: 'Turma não encontrada' }, { status: 404 })

    await db.Turma.update({ where: { id }, data: dados })
    return NextResponse.json({ sucesso: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
