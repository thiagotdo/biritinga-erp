// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'

export const runtime = 'nodejs'

// ─── Censo Escolar ────────────────────────────────────────────────────────────
// INEP/MEC - EducaCenso · Portaria MEC 264/2007
// Schema: Turma usa (ano, etapa, codigo, serie, turno, capacidade)
//         Aluno usa (nee, zona, sexo)
//         Matricula usa (situacao, anoLetivo)

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const anoLetivo = Number(searchParams.get('anoLetivo') ?? new Date().getFullYear())
  const municipioId = usuario.municipioId

  try {
    // Resumo geral de matrículas
    const [matriculas, turmasPorEtapa, escolas] = await Promise.all([
      db.$queryRaw`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN m.situacao = 'ATIVA'       THEN 1 ELSE 0 END) as ativas,
          SUM(CASE WHEN m.situacao = 'TRANSFERIDA'  THEN 1 ELSE 0 END) as transferidas,
          SUM(CASE WHEN m.situacao = 'DESISTENTE'   THEN 1 ELSE 0 END) as evadidas,
          SUM(CASE WHEN m.situacao = 'CONCLUINTE'   THEN 1 ELSE 0 END) as concluidas,
          SUM(CASE WHEN a.nee = 1  THEN 1 ELSE 0 END) as nee,
          SUM(CASE WHEN a.zona = 'RURAL'  THEN 1 ELSE 0 END) as rural,
          SUM(CASE WHEN a.zona = 'URBANA' THEN 1 ELSE 0 END) as urbana,
          SUM(CASE WHEN a.sexo = 'M' THEN 1 ELSE 0 END) as masculino,
          SUM(CASE WHEN a.sexo = 'F' THEN 1 ELSE 0 END) as feminino
        FROM Matricula m
        JOIN Aluno a ON a.id = m.alunoId
        WHERE m.municipioId = ${municipioId} AND m.anoLetivo = ${anoLetivo}`,

      db.$queryRaw`
        SELECT t.etapa, t.turno, COUNT(*) as turmas,
               SUM(t.capacidade) as vagas
        FROM Turma t
        WHERE t.municipioId = ${municipioId} AND t.ano = ${anoLetivo}
        GROUP BY t.etapa, t.turno`,

      db.$queryRaw`
        SELECT e.id, e.nome, e.zona, e.inep,
               (SELECT COUNT(*) FROM Turma t WHERE t.escolaId = e.id AND t.ano = ${anoLetivo}) as totalTurmas,
               (SELECT COUNT(*) FROM Matricula m JOIN Turma t ON t.id = m.turmaId
                WHERE t.escolaId = e.id AND m.anoLetivo = ${anoLetivo} AND m.situacao = 'ATIVA') as totalAlunos
        FROM Escola e
        WHERE e.municipioId = ${municipioId} AND e.situacao = 'ATIVA'
        ORDER BY e.nome`,
    ])

    const m = (matriculas as any[])[0] ?? {}

    // Por série (agrupado por etapa + serie)
    const porSerie = await db.$queryRaw`
      SELECT t.serie, t.etapa, COUNT(DISTINCT m.alunoId) as alunos,
             COUNT(DISTINCT t.id) as turmas
      FROM Matricula m
      JOIN Turma t ON t.id = m.turmaId
      WHERE m.municipioId = ${municipioId} AND m.anoLetivo = ${anoLetivo} AND m.situacao = 'ATIVA'
      GROUP BY t.serie, t.etapa
      ORDER BY t.etapa, t.serie`

    return NextResponse.json({
      anoLetivo,
      resumo: {
        totalMatriculas: Number(m.total ?? 0),
        ativas:      Number(m.ativas ?? 0),
        transferidas: Number(m.transferidas ?? 0),
        evadidas:    Number(m.evadidas ?? 0),
        concluidas:  Number(m.concluidas ?? 0),
        nee:         Number(m.nee ?? 0),
        rural:       Number(m.rural ?? 0),
        urbana:      Number(m.urbana ?? 0),
        masculino:   Number(m.masculino ?? 0),
        feminino:    Number(m.feminino ?? 0),
      },
      porEtapa: turmasPorEtapa,
      porSerie,
      escolas,
    })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
