// @ts-nocheck
/**
 * GET  /api/educacao/nota?turmaId=X&bimestre=N  - notas de uma turma por bimestre
 * POST /api/educacao/nota                        - registra / atualiza nota
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
  const turmaId     = searchParams.get('turmaId')
  const matriculaId = searchParams.get('matriculaId')
  const bimestre    = searchParams.get('bimestre')

  try {
    if (matriculaId) {
      const notas = await db.$queryRaw`
        SELECT n.*, av.bimestre, av.disciplina, av.descricao, av.peso
        FROM NotaAluno n JOIN Avaliacao av ON av.id = n.avaliacaoId
        WHERE n.matriculaId = ${matriculaId}
        ORDER BY av.bimestre ASC, av.disciplina ASC
      ` as any[]
      return NextResponse.json({ notas })
    }

    if (turmaId) {
      const bim = bimestre ? parseInt(bimestre) : null
      let avaliacoes: any[]
      if (bim) {
        avaliacoes = await db.$queryRaw`
          SELECT * FROM Avaliacao
          WHERE turmaId = ${turmaId} AND municipioId = ${municipioId} AND bimestre = ${bim}
          ORDER BY disciplina ASC
        ` as any[]
      } else {
        avaliacoes = await db.$queryRaw`
          SELECT * FROM Avaliacao
          WHERE turmaId = ${turmaId} AND municipioId = ${municipioId}
          ORDER BY bimestre ASC, disciplina ASC
        ` as any[]
      }

      // Para cada avaliação, buscar notas dos alunos
      const enriched = []
      for (const av of avaliacoes) {
        const notas = await db.$queryRaw`
          SELECT n.*, a.nome as alunoNome
          FROM NotaAluno n
          JOIN Matricula m ON m.id = n.matriculaId
          JOIN Aluno a ON a.id = m.alunoId
          WHERE n.avaliacaoId = ${av.id}
          ORDER BY a.nome ASC
        ` as any[]
        enriched.push({ ...av, notas })
      }
      return NextResponse.json({ avaliacoes: enriched })
    }

    return NextResponse.json({ erro: 'Informe turmaId ou matriculaId' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Sem município' }, { status: 401 })

  try {
    const body = await req.json()

    // Registrar avaliação e notas em lote
    if (body.tipo === 'CRIAR_AVALIACAO') {
      const { turmaId, bimestre, disciplina, descricao, peso } = body
      if (!turmaId || !bimestre || !disciplina) {
        return NextResponse.json({ erro: 'turmaId, bimestre e disciplina são obrigatórios' }, { status: 400 })
      }
      const av = await db.Avaliacao.create({
        data: {
          id: randomUUID(), municipioId, turmaId,
          bimestre: parseInt(bimestre), disciplina,
          descricao: descricao || null,
          peso: peso ?? 1.0,
        },
      })
      return NextResponse.json({ avaliacao: av }, { status: 201 })
    }

    // Lançar notas: { avaliacaoId, notas: [{matriculaId, nota}] }
    const { avaliacaoId, notas } = body
    if (!avaliacaoId || !notas?.length) {
      return NextResponse.json({ erro: 'avaliacaoId e notas são obrigatórios' }, { status: 400 })
    }

    let salvos = 0
    for (const n of notas) {
      const existe = await db.NotaAluno.findFirst({ where: { avaliacaoId, matriculaId: n.matriculaId } })
      if (existe) {
        await db.NotaAluno.update({
          where: { id: (existe as any).id },
          data: { nota: parseFloat(n.nota), observacao: n.observacao || null },
        })
      } else {
        await db.NotaAluno.create({
          data: {
            id: randomUUID(), municipioId, avaliacaoId,
            matriculaId: n.matriculaId,
            nota: parseFloat(n.nota),
            observacao: n.observacao || null,
          },
        })
      }
      salvos++

      // Recalcular média geral da matrícula
      const medias = await db.$queryRaw`
        SELECT AVG(n2.nota) as media
        FROM NotaAluno n2
        JOIN Avaliacao av ON av.id = n2.avaliacaoId
        WHERE n2.matriculaId = ${n.matriculaId}
      ` as any[]
      const media = medias[0]?.media ?? null
      await db.Matricula.update({
        where: { id: n.matriculaId },
        data: { mediaGeral: media !== null ? parseFloat(Number(media).toFixed(2)) : null },
      })
    }

    return NextResponse.json({ sucesso: true, salvos })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
