/**
 * GET  /api/educacao/frequencia?turmaId=X&data=YYYY-MM-DD  — frequência do dia
 * POST /api/educacao/frequencia                             — registra frequência
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
  const data        = searchParams.get('data')
  const matriculaId = searchParams.get('matriculaId')

  try {
    if (matriculaId) {
      // Histórico de frequência de um aluno
      const freq = await db.$queryRaw`
        SELECT fa.*, ar.data, ar.disciplina
        FROM FrequenciaAluno fa
        JOIN AulaRegistro ar ON ar.id = fa.aulaId
        WHERE fa.matriculaId = ${matriculaId}
        ORDER BY ar.data DESC LIMIT 60
      ` as any[]
      return NextResponse.json({ frequencias: freq })
    }

    if (turmaId && data) {
      // Frequência do dia para a turma
      const aulas = await db.$queryRaw`
        SELECT * FROM AulaRegistro WHERE turmaId = ${turmaId} AND data = ${data}
      ` as any[]

      if (!aulas.length) {
        // Retorna lista de alunos para registrar
        const alunos = await db.$queryRaw`
          SELECT m.id as matriculaId, m.numero, a.nome, a.pcd
          FROM Matricula m JOIN Aluno a ON a.id = m.alunoId
          WHERE m.turmaId = ${turmaId} AND m.situacao = 'ATIVA'
          ORDER BY a.nome ASC
        ` as any[]
        return NextResponse.json({ aula: null, alunos, registros: [] })
      }

      const aula = aulas[0]
      const registros = await db.$queryRaw`
        SELECT fa.*, a.nome as alunoNome
        FROM FrequenciaAluno fa
        JOIN Matricula m ON m.id = fa.matriculaId
        JOIN Aluno a ON a.id = m.alunoId
        WHERE fa.aulaId = ${aula.id}
        ORDER BY a.nome ASC
      ` as any[]

      return NextResponse.json({ aula, registros })
    }

    if (turmaId) {
      // Resumo de frequência por aluno na turma
      const resumo = await db.$queryRaw`
        SELECT m.id as matriculaId, m.numero, m.percentualFreq, a.nome,
          COUNT(fa.id) as totalAulas,
          SUM(CASE WHEN fa.presente = 1 THEN 1 ELSE 0 END) as presencas,
          SUM(CASE WHEN fa.presente = 0 THEN 1 ELSE 0 END) as faltas
        FROM Matricula m
        JOIN Aluno a ON a.id = m.alunoId
        LEFT JOIN FrequenciaAluno fa ON fa.matriculaId = m.id
        WHERE m.turmaId = ${turmaId} AND m.situacao = 'ATIVA'
        GROUP BY m.id ORDER BY a.nome ASC
      ` as any[]
      return NextResponse.json({ resumo })
    }

    return NextResponse.json({ erro: 'Informe turmaId' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Sem município' }, { status: 401 })

  try {
    const { turmaId, data, disciplina, conteudo, registros } = await req.json()
    // registros: Array<{ matriculaId, presente, justificada?, observacao? }>

    if (!turmaId || !data || !registros?.length) {
      return NextResponse.json({ erro: 'turmaId, data e registros são obrigatórios' }, { status: 400 })
    }

    // Criar ou buscar AulaRegistro
    let aula = await db.AulaRegistro.findFirst({ where: { turmaId, data } })
    if (!aula) {
      aula = await db.AulaRegistro.create({
        data: {
          id: randomUUID(), municipioId, turmaId, data,
          disciplina: disciplina || null, conteudo: conteudo || null, totalAulas: 1,
        },
      })
    }

    const aulaId = (aula as any).id

    // Inserir/atualizar frequências
    let salvos = 0
    for (const r of registros) {
      const existe = await db.FrequenciaAluno.findFirst({ where: { aulaId, matriculaId: r.matriculaId } })
      if (existe) {
        await db.FrequenciaAluno.update({
          where: { id: (existe as any).id },
          data: { presente: r.presente ? 1 : 0, justificada: r.justificada ? 1 : 0, observacao: r.observacao || null },
        })
      } else {
        await db.FrequenciaAluno.create({
          data: {
            id: randomUUID(), municipioId, aulaId,
            matriculaId: r.matriculaId,
            presente: r.presente ? 1 : 0,
            justificada: r.justificada ? 1 : 0,
            observacao: r.observacao || null,
          },
        })
      }
      salvos++
    }

    // Recalcular percentual de frequência para cada aluno
    for (const r of registros) {
      const totais = await db.$queryRaw`
        SELECT COUNT(*) as total, SUM(CASE WHEN fa.presente = 1 THEN 1 ELSE 0 END) as presencas
        FROM FrequenciaAluno fa WHERE fa.matriculaId = ${r.matriculaId}
      ` as any[]
      const { total, presencas } = totais[0]
      const pct = total > 0 ? (Number(presencas) / Number(total) * 100) : 100
      await db.Matricula.update({
        where: { id: r.matriculaId },
        data: { percentualFreq: pct.toFixed(2) },
      })
    }

    return NextResponse.json({ sucesso: true, aulaId, salvos })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
