/**
 * GET  /api/educacao/matricula                     — lista / dashboard
 * POST /api/educacao/matricula                     — matricula aluno
 * PATCH /api/educacao/matricula                    — ação (transferir/cancelar/fecharAno)
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
  const turmaId   = searchParams.get('turmaId')
  const alunoId   = searchParams.get('alunoId')
  const relatorio = searchParams.get('relatorio')
  const anoLetivo = searchParams.get('anoLetivo')

  try {
    if (relatorio === 'DASHBOARD') {
      const ano = Number(anoLetivo) || new Date().getFullYear()

      const counts = await db.$queryRaw`
        SELECT
          COUNT(*) as totalMatriculas,
          SUM(CASE WHEN situacao = 'ATIVA'       THEN 1 ELSE 0 END) as ativas,
          SUM(CASE WHEN situacao = 'TRANSFERIDA' THEN 1 ELSE 0 END) as transferidas,
          SUM(CASE WHEN situacao = 'EVADIDA'     THEN 1 ELSE 0 END) as evadidas,
          SUM(CASE WHEN situacao = 'ATIVA' AND percentualFreq < 75 THEN 1 ELSE 0 END) as emRisco,
          AVG(CASE WHEN situacao = 'ATIVA' THEN percentualFreq END) as freqMedia
        FROM Matricula
        WHERE municipioId = ${municipioId} AND anoLetivo = ${ano}
      ` as any[]

      const pcdCount = await db.$queryRaw`
        SELECT COUNT(*) as n FROM Matricula m JOIN Aluno a ON a.id = m.alunoId
        WHERE m.municipioId = ${municipioId} AND m.anoLetivo = ${ano}
          AND m.situacao = 'ATIVA' AND a.pcd = 1
      ` as any[]

      const bolsaCount = await db.$queryRaw`
        SELECT COUNT(*) as n FROM Matricula m JOIN Aluno a ON a.id = m.alunoId
        WHERE m.municipioId = ${municipioId} AND m.anoLetivo = ${ano}
          AND m.situacao = 'ATIVA' AND a.bolsaFamilia = 1
      ` as any[]

      const c = counts[0] ?? {}
      return NextResponse.json({
        kpis: {
          totalMatriculas: Number(c.totalMatriculas ?? 0),
          ativas:          Number(c.ativas ?? 0),
          transferidas:    Number(c.transferidas ?? 0),
          evadidas:        Number(c.evadidas ?? 0),
          emRisco:         Number(c.emRisco ?? 0),
          pcd:             Number(pcdCount[0]?.n ?? 0),
          bolsaFamilia:    Number(bolsaCount[0]?.n ?? 0),
          freqMedia:       Number(c.freqMedia ?? 100).toFixed(1),
        },
      })
    }

    if (id) {
      const mats = await db.$queryRaw`
        SELECT m.*, a.nome as alunoNome, a.dataNascimento, a.pcd, a.bolsaFamilia,
               t.serie, t.turma, t.turno, e.nome as escolaNome
        FROM Matricula m
        JOIN Aluno a ON a.id = m.alunoId
        JOIN Turma t ON t.id = m.turmaId
        JOIN Escola e ON e.id = t.escolaId
        WHERE m.id = ${id} AND m.municipioId = ${municipioId}
      ` as any[]
      if (!mats.length) return NextResponse.json({ erro: 'Matrícula não encontrada' }, { status: 404 })
      return NextResponse.json({ matricula: mats[0] })
    }

    if (turmaId) {
      const matriculas = await db.$queryRaw`
        SELECT m.*, a.nome as alunoNome, a.dataNascimento, a.pcd, a.bolsaFamilia
        FROM Matricula m JOIN Aluno a ON a.id = m.alunoId
        WHERE m.turmaId = ${turmaId} AND m.municipioId = ${municipioId}
        ORDER BY a.nome ASC
      ` as any[]
      return NextResponse.json({ matriculas, total: matriculas.length })
    }

    if (alunoId) {
      const matriculas = await db.$queryRaw`
        SELECT m.*, t.serie, t.turma, t.turno, e.nome as escolaNome
        FROM Matricula m
        JOIN Turma t ON t.id = m.turmaId JOIN Escola e ON e.id = t.escolaId
        WHERE m.alunoId = ${alunoId} AND m.municipioId = ${municipioId}
        ORDER BY m.anoLetivo DESC
      ` as any[]
      return NextResponse.json({ matriculas, total: matriculas.length })
    }

    const ano = anoLetivo ? parseInt(anoLetivo) : new Date().getFullYear()
    const matriculas = await db.$queryRaw`
      SELECT m.numero, m.situacao, m.anoLetivo, m.percentualFreq, m.mediaGeral, m.resultadoFinal,
             a.nome as alunoNome, a.pcd, a.bolsaFamilia,
             t.serie, t.turma, t.turno
      FROM Matricula m
      JOIN Aluno a ON a.id = m.alunoId
      JOIN Turma t ON t.id = m.turmaId
      WHERE m.municipioId = ${municipioId} AND m.anoLetivo = ${ano}
      ORDER BY a.nome ASC LIMIT 500
    ` as any[]

    return NextResponse.json({ matriculas, total: matriculas.length })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Sem município' }, { status: 401 })

  try {
    const { alunoId, turmaId, anoLetivo } = await req.json()
    if (!alunoId || !turmaId) return NextResponse.json({ erro: 'alunoId e turmaId são obrigatórios' }, { status: 400 })

    const ano = anoLetivo ?? new Date().getFullYear()

    // Verifica turma e vagas
    const turmas = await db.$queryRaw`
      SELECT t.*, COUNT(m.id) as totalMatriculas
      FROM Turma t
      LEFT JOIN Matricula m ON m.turmaId = t.id AND m.situacao = 'ATIVA'
      WHERE t.id = ${turmaId} AND t.municipioId = ${municipioId}
      GROUP BY t.id
    ` as any[]

    if (!turmas.length) return NextResponse.json({ erro: 'Turma não encontrada' }, { status: 404 })
    const turma = turmas[0]
    if (Number(turma.totalMatriculas) >= turma.capacidade) {
      return NextResponse.json({ erro: `Turma sem vagas. Capacidade: ${turma.capacidade}` }, { status: 409 })
    }

    // Duplicidade
    const existente = await db.Matricula.findFirst({ where: { alunoId, turmaId, anoLetivo: ano } })
    if (existente) {
      return NextResponse.json({ erro: 'Aluno já matriculado nesta turma no ano letivo', matriculaId: existente.id }, { status: 409 })
    }

    // Número sequencial
    const ct = await db.$queryRaw`
      SELECT COUNT(*) as n FROM Matricula WHERE municipioId = ${municipioId} AND anoLetivo = ${ano}
    ` as any[]
    const numero = `${ano}-${String(Number(ct[0].n) + 1).padStart(5, '0')}`

    const matricula = await db.Matricula.create({
      data: {
        id: randomUUID(), municipioId, numero,
        alunoId, turmaId, anoLetivo: ano,
      },
    })

    return NextResponse.json({ matricula, numero }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Sem município' }, { status: 401 })

  try {
    const { id, acao, ...extras } = await req.json()
    if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

    const mat = await db.Matricula.findFirst({ where: { id, municipioId } })
    if (!mat) return NextResponse.json({ erro: 'Matrícula não encontrada' }, { status: 404 })

    if (acao === 'TRANSFERIR') {
      const { escolaDestino } = extras
      if (!escolaDestino) return NextResponse.json({ erro: 'escolaDestino obrigatório' }, { status: 400 })
      await db.Matricula.update({
        where: { id },
        data: { situacao: 'TRANSFERIDA', dataTransferencia: new Date().toISOString().split('T')[0], escolaDestino },
      })
      await db.Aluno.update({ where: { id: (mat as any).alunoId }, data: { situacao: 'TRANSFERIDO' } })
      return NextResponse.json({ sucesso: true })
    }

    if (acao === 'CANCELAR') {
      await db.Matricula.update({ where: { id }, data: { situacao: 'CANCELADA', motivoCancelamento: extras.motivo } })
      return NextResponse.json({ sucesso: true })
    }

    if (acao === 'FECHAR_ANO') {
      const freq = Number((mat as any).percentualFreq)
      const media = (mat as any).mediaGeral !== null ? Number((mat as any).mediaGeral) : null
      let resultado = 'EM_PROGRESSO'
      if (freq < 75) resultado = 'REPROVADO'
      else if (media !== null) resultado = media >= 5.0 ? 'APROVADO' : 'REPROVADO'

      await db.Matricula.update({
        where: { id },
        data: {
          resultadoFinal: resultado,
          situacao: resultado === 'APROVADO' ? 'CONCLUIDA' : 'ATIVA',
        },
      })
      return NextResponse.json({ sucesso: true, resultadoFinal: resultado })
    }

    return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
