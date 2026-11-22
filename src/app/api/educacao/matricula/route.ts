/**
 * GET  /api/educacao/matricula                     - lista / dashboard
 * POST /api/educacao/matricula                     - matricula aluno
 * PATCH /api/educacao/matricula                    - ação (transferir/cancelar)
 *
 * Schema (Matricula): id, alunoId, turmaId, municipioId, anoLetivo, situacao,
 *   dataMatricula, dataTransferencia, motivoTransferencia, escolaDestino, numeroChamada
 * Schema (Aluno): nome, nee, zona, sexo
 * Schema (Turma): codigo, etapa, serie, turno, ano, capacidade
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
          SUM(CASE WHEN situacao = 'DESISTENTE'  THEN 1 ELSE 0 END) as evadidas
        FROM Matricula
        WHERE municipioId = ${municipioId} AND anoLetivo = ${ano}
      ` as any[]

      const neeCount = await db.$queryRaw`
        SELECT COUNT(*) as n FROM Matricula m JOIN Aluno a ON a.id = m.alunoId
        WHERE m.municipioId = ${municipioId} AND m.anoLetivo = ${ano}
          AND m.situacao = 'ATIVA' AND a.nee = 1
      ` as any[]

      // Contagem de frequência vem de RegistroFrequencia
      const freqData = await db.$queryRaw`
        SELECT
          AVG(CASE WHEN rf.presente = 1 THEN 100 ELSE 0 END) as freqMedia,
          SUM(CASE WHEN rf.presente = 0 THEN 1 ELSE 0 END) as faltas
        FROM RegistroFrequencia rf
        JOIN Matricula m ON m.alunoId = rf.alunoId AND m.anoLetivo = ${ano}
        WHERE rf.municipioId = ${municipioId} AND m.situacao = 'ATIVA'
      ` as any[]

      const c = counts[0] ?? {}
      const f = freqData[0] ?? {}
      const freqMedia = Number(f.freqMedia ?? 100)
      const emRisco = 0 // calculado por turma futuramente

      return NextResponse.json({
        kpis: {
          totalMatriculas: Number(c.totalMatriculas ?? 0),
          ativas:          Number(c.ativas ?? 0),
          transferidas:    Number(c.transferidas ?? 0),
          evadidas:        Number(c.evadidas ?? 0),
          emRisco,
          pcd:             Number(neeCount[0]?.n ?? 0),
          bolsaFamilia:    0, // campo não está no schema atual
          freqMedia:       freqMedia.toFixed(1),
        },
      })
    }

    if (id) {
      const mats = await db.$queryRaw`
        SELECT m.*, a.nome as alunoNome, a.dataNascimento, a.nee,
               t.serie, t.codigo, t.turno, t.etapa, e.nome as escolaNome
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
        SELECT m.*, a.nome as alunoNome, a.dataNascimento, a.nee
        FROM Matricula m JOIN Aluno a ON a.id = m.alunoId
        WHERE m.turmaId = ${turmaId} AND m.municipioId = ${municipioId}
        ORDER BY a.nome ASC
      ` as any[]
      return NextResponse.json({ matriculas, total: matriculas.length })
    }

    if (alunoId) {
      const matriculas = await db.$queryRaw`
        SELECT m.*, t.serie, t.codigo, t.turno, t.etapa, e.nome as escolaNome
        FROM Matricula m
        JOIN Turma t ON t.id = m.turmaId JOIN Escola e ON e.id = t.escolaId
        WHERE m.alunoId = ${alunoId} AND m.municipioId = ${municipioId}
        ORDER BY m.anoLetivo DESC
      ` as any[]
      return NextResponse.json({ matriculas, total: matriculas.length })
    }

    const ano = anoLetivo ? parseInt(anoLetivo) : new Date().getFullYear()
    const matriculas = await db.$queryRaw`
      SELECT m.numeroChamada, m.situacao, m.anoLetivo,
             a.nome as alunoNome, a.nee,
             t.serie, t.codigo, t.turno, t.etapa
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
    const { alunoId, turmaId, anoLetivo, numeroChamada } = await req.json()
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
    const existente = await db.$queryRaw`
      SELECT id FROM Matricula WHERE alunoId = ${alunoId} AND turmaId = ${turmaId} AND anoLetivo = ${ano} LIMIT 1
    ` as any[]
    if (existente.length) {
      return NextResponse.json({ erro: 'Aluno já matriculado nesta turma no ano letivo', matriculaId: existente[0].id }, { status: 409 })
    }

    const id = randomUUID()
    await db.$queryRaw`
      INSERT INTO Matricula (id, municipioId, alunoId, turmaId, anoLetivo, situacao, numeroChamada, dataMatricula, criadoEm, atualizadoEm)
      VALUES (${id}, ${municipioId}, ${alunoId}, ${turmaId}, ${ano}, 'ATIVA', ${numeroChamada ?? null}, NOW(), NOW(), NOW())
    `

    return NextResponse.json({ matricula: { id, municipioId, alunoId, turmaId, anoLetivo: ano, situacao: 'ATIVA' } }, { status: 201 })
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

    const mat = await db.$queryRaw`
      SELECT * FROM Matricula WHERE id = ${id} AND municipioId = ${municipioId} LIMIT 1
    ` as any[]
    if (!mat.length) return NextResponse.json({ erro: 'Matrícula não encontrada' }, { status: 404 })

    if (acao === 'TRANSFERIR') {
      const { escolaDestino, motivo } = extras
      if (!escolaDestino) return NextResponse.json({ erro: 'escolaDestino obrigatório' }, { status: 400 })
      await db.$queryRaw`
        UPDATE Matricula
        SET situacao = 'TRANSFERIDA', dataTransferencia = NOW(),
            escolaDestino = ${escolaDestino}, motivoTransferencia = ${motivo ?? null},
            atualizadoEm = NOW()
        WHERE id = ${id}
      `
      return NextResponse.json({ sucesso: true })
    }

    if (acao === 'CANCELAR') {
      await db.$queryRaw`
        UPDATE Matricula SET situacao = 'CANCELADA', atualizadoEm = NOW() WHERE id = ${id}
      `
      return NextResponse.json({ sucesso: true })
    }

    if (acao === 'DESISTENTE') {
      await db.$queryRaw`
        UPDATE Matricula SET situacao = 'DESISTENTE', atualizadoEm = NOW() WHERE id = ${id}
      `
      return NextResponse.json({ sucesso: true })
    }

    return NextResponse.json({ erro: 'Ação inválida. Use: TRANSFERIR, CANCELAR, DESISTENTE' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
