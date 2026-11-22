// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Conselho Tutelar / Frequência em Risco ───────────────────────────────────
// ECA Art. 56 - comunicação obrigatória ao CT quando freq < 50%
// LDB Art. 24 - frequência mínima 75%

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const anoLetivo   = Number(searchParams.get('anoLetivo') ?? new Date().getFullYear())
  const nivelAlerta = searchParams.get('nivel') ?? 'RISCO' // RISCO (<75%) | CRITICO (<50%)
  const escolaId    = searchParams.get('escolaId')
  const relatorio   = searchParams.get('relatorio')
  const municipioId = usuario.municipioId

  try {
    if (relatorio === 'DASHBOARD') {
      const [emRisco, criticos, encaminhados] = await Promise.all([
        db.$queryRaw`
          SELECT COUNT(DISTINCT rf.alunoId) as c
          FROM RegistroFrequencia rf
          JOIN Matricula m ON m.alunoId = rf.alunoId AND m.situacao = 'ATIVA'
          WHERE rf.municipioId = ${municipioId} AND YEAR(rf.data) = ${anoLetivo}
          GROUP BY rf.alunoId
          HAVING (SUM(CASE WHEN rf.presente = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) < 75`,
        db.$queryRaw`
          SELECT COUNT(DISTINCT rf.alunoId) as c
          FROM RegistroFrequencia rf
          JOIN Matricula m ON m.alunoId = rf.alunoId AND m.situacao = 'ATIVA'
          WHERE rf.municipioId = ${municipioId} AND YEAR(rf.data) = ${anoLetivo}
          GROUP BY rf.alunoId
          HAVING (SUM(CASE WHEN rf.presente = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) < 50`,
        db.$queryRaw`
          SELECT COUNT(*) as c FROM NotificacaoCT
          WHERE municipioId = ${municipioId} AND anoLetivo = ${anoLetivo}` as any,
      ])

      return NextResponse.json({
        kpis: {
          emRisco:      (emRisco as any[]).length,
          criticos:     (criticos as any[]).length,
          encaminhados: Number((encaminhados as any[])[0]?.c ?? 0),
        },
      })
    }

    // Lista alunos em risco
    const limite = nivelAlerta === 'CRITICO' ? 50 : 75

    const alunosRisco = await db.$queryRaw`
      SELECT a.id AS alunoId, a.nome, a.telefoneResponsavel, a.responsavel,
             e.nome AS escolaNome, t.serie, t.nome AS turmaNome,
             COUNT(*) as totalAulas,
             SUM(CASE WHEN rf.presente = 1 THEN 1 ELSE 0 END) as presencas,
             SUM(CASE WHEN rf.presente = 0 THEN 1 ELSE 0 END) as faltas,
             ROUND(SUM(CASE WHEN rf.presente = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as pctFreq
      FROM RegistroFrequencia rf
      JOIN Aluno a ON a.id = rf.alunoId
      JOIN Matricula m ON m.alunoId = rf.alunoId AND m.situacao = 'ATIVA' AND m.anoLetivo = ${anoLetivo}
      JOIN Turma t ON t.id = m.turmaId
      JOIN Escola e ON e.id = t.escolaId
      WHERE rf.municipioId = ${municipioId} AND YEAR(rf.data) = ${anoLetivo}
        ${escolaId ? db.$queryRaw`AND e.id = ${escolaId}` : db.$queryRaw``}
      GROUP BY a.id, a.nome, a.telefoneResponsavel, a.responsavel, e.nome, t.serie, t.nome
      HAVING pctFreq < ${limite}
      ORDER BY pctFreq ASC
      LIMIT 200`

    return NextResponse.json({ alunos: alunosRisco, total: (alunosRisco as any[]).length })
  } catch (e: any) {
    // NotificacaoCT pode não existir ainda - retornar dados parciais
    if (e.message?.includes('NotificacaoCT')) {
      return NextResponse.json({ kpis: { emRisco: 0, criticos: 0, encaminhados: 0 }, alunos: [] })
    }
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  try {
    const d = await req.json()
    const municipioId = usuario.municipioId

    // Registrar encaminhamento ao CT
    // Como não há model NotificacaoCT, usamos AuditLog como registro
    await auditLog({
      municipioId, usuarioId: usuario.usuarioId,
      acao: 'CREATE', modulo: 'educacao', recurso: 'EncaminhamentoCT',
      dadosNovos: {
        alunoId:  d.alunoId,
        alunoNome:d.alunoNome,
        pctFreq:  d.pctFreq,
        anoLetivo:d.anoLetivo,
        observacao:d.observacao,
        dataEncaminhamento: new Date().toISOString(),
      },
    })

    return NextResponse.json({ sucesso: true, mensagem: 'Encaminhamento registrado ao Conselho Tutelar' }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
