// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'

export const runtime = 'nodejs'

// ─── Boletim Online ───────────────────────────────────────────────────────────
// LDB 9.394/96 Art. 24 - avaliação contínua e cumulativa

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const alunoId   = searchParams.get('alunoId')
  const turmaId   = searchParams.get('turmaId')
  const anoLetivo = Number(searchParams.get('anoLetivo') ?? new Date().getFullYear())
  const municipioId = usuario.municipioId

  if (!alunoId && !turmaId) {
    return NextResponse.json({ erro: 'Informe alunoId ou turmaId' }, { status: 400 })
  }

  try {
    if (alunoId) {
      // Boletim individual - notas por disciplina + frequência
      const matricula = await db.$queryRaw`
        SELECT m.id, m.situacao, m.numeroChamada,
               t.nome AS turmaNome, t.serie, t.turno, t.anoLetivo,
               e.nome AS escolaNome
        FROM Matricula m
        JOIN Turma t ON t.id = m.turmaId
        JOIN Escola e ON e.id = t.escolaId
        WHERE m.alunoId = ${alunoId} AND m.municipioId = ${municipioId} AND m.anoLetivo = ${anoLetivo}
        ORDER BY m.anoLetivo DESC LIMIT 1` as any[]

      const aluno = await db.Aluno.findFirst({ where: { id: alunoId, municipioId } })
      if (!aluno) return NextResponse.json({ erro: 'Aluno não encontrado' }, { status: 404 })

      const notas = await db.$queryRaw`
        SELECT n.disciplina, n.bimestre, n.nota, n.recuperacao, n.mediaFinal, n.situacao,
               n.professorNome
        FROM NotaAluno n
        WHERE n.alunoId = ${alunoId} AND n.municipioId = ${municipioId} AND n.anoLetivo = ${anoLetivo}
        ORDER BY n.disciplina, n.bimestre`

      // Calcular frequência total
      const freq = await db.$queryRaw`
        SELECT
          COUNT(*) as totalAulas,
          SUM(CASE WHEN rf.presente = 1 THEN 1 ELSE 0 END) as presencas,
          SUM(CASE WHEN rf.presente = 0 THEN 1 ELSE 0 END) as faltas,
          SUM(CASE WHEN rf.presente = 0 AND rf.justificada = 1 THEN 1 ELSE 0 END) as faltasJustificadas
        FROM RegistroFrequencia rf
        WHERE rf.alunoId = ${alunoId} AND rf.municipioId = ${municipioId}
          AND YEAR(rf.data) = ${anoLetivo}`

      const f = (freq as any[])[0] ?? {}
      const totalAulas = Number(f.totalAulas ?? 0)
      const presencas  = Number(f.presencas  ?? 0)
      const pctFreq    = totalAulas > 0 ? Math.round((presencas / totalAulas) * 100 * 10) / 10 : 0
      const aprovado   = pctFreq >= 75  // LDB Art. 24 - mínimo 75%

      // Agrupar notas por disciplina
      const disciplinas: Record<string, any> = {}
      for (const n of notas as any[]) {
        if (!disciplinas[n.disciplina]) {
          disciplinas[n.disciplina] = { disciplina: n.disciplina, bimestres: {}, mediaFinal: null, situacao: null }
        }
        if (n.bimestre) {
          disciplinas[n.disciplina].bimestres[`b${n.bimestre}`] = { nota: Number(n.nota ?? 0), recuperacao: n.recuperacao ? Number(n.recuperacao) : null }
        }
        if (n.mediaFinal !== null) {
          disciplinas[n.disciplina].mediaFinal = Number(n.mediaFinal)
          disciplinas[n.disciplina].situacao   = n.situacao
        }
      }

      return NextResponse.json({
        aluno,
        matricula: (matricula as any[])[0] ?? null,
        disciplinas: Object.values(disciplinas),
        frequencia: {
          totalAulas, presencas,
          faltas:           Number(f.faltas ?? 0),
          faltasJustificadas: Number(f.faltasJustificadas ?? 0),
          percentual: pctFreq,
          aprovado,
          emRisco: pctFreq < 75 && pctFreq >= 60,
          reprovadoFreq: pctFreq < 75,
        },
      })
    }

    // Boletim da turma - lista de alunos com médias
    const alunos = await db.$queryRaw`
      SELECT m.id AS matriculaId, m.numeroChamada, m.situacao,
             a.id AS alunoId, a.nome,
             (SELECT ROUND(AVG(n.mediaFinal), 1) FROM NotaAluno n
              WHERE n.alunoId = a.id AND n.municipioId = ${municipioId} AND n.anoLetivo = ${anoLetivo}
              AND n.mediaFinal IS NOT NULL) AS mediaGeral,
             (SELECT ROUND(SUM(CASE WHEN rf.presente = 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1)
              FROM RegistroFrequencia rf
              WHERE rf.alunoId = a.id AND rf.municipioId = ${municipioId} AND YEAR(rf.data) = ${anoLetivo}
             ) AS pctFrequencia
      FROM Matricula m
      JOIN Aluno a ON a.id = m.alunoId
      WHERE m.turmaId = ${turmaId} AND m.municipioId = ${municipioId} AND m.situacao = 'ATIVA'
      ORDER BY m.numeroChamada, a.nome`

    return NextResponse.json({ alunos })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
