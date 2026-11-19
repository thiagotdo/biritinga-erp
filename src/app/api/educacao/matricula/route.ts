import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Matrícula ────────────────────────────────────────────────────────────────
// Número: "2026-00001"
// Regras LDB Art. 24 V-a: frequência mínima 75% para aprovação.
// Resultado final calculado ao fechar ano letivo.

async function gerarNumeroMatricula(municipioId: string, ano: number): Promise<string> {
  const count = await prisma.matricula.count({ where: { municipioId, anoLetivo: ano } })
  return `${ano}-${String(count + 1).padStart(5, '0')}`
}

function calcularResultado(percentualFreq: number, mediaGeral: number | null, mediaAprovacao = 5.0): string {
  if (percentualFreq < 75) return 'REPROVADO'  // LDB Art. 24 V-a
  if (mediaGeral === null) return 'EM_PROGRESSO'
  return mediaGeral >= mediaAprovacao ? 'APROVADO' : 'REPROVADO'
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const turmaId   = searchParams.get('turmaId')
  const alunoId   = searchParams.get('alunoId')
  const relatorio = searchParams.get('relatorio')
  const anoLetivo = searchParams.get('anoLetivo')

  if (relatorio === 'DASHBOARD') {
    const ano = Number(anoLetivo) || new Date().getFullYear()
    const [totalMatriculas, ativas, transferidas, evadidas, pcd, bolsaFamilia] = await Promise.all([
      prisma.matricula.count({ where: { municipioId: usuario.municipioId, anoLetivo: ano } }),
      prisma.matricula.count({ where: { municipioId: usuario.municipioId, anoLetivo: ano, situacao: 'ATIVA' } }),
      prisma.matricula.count({ where: { municipioId: usuario.municipioId, anoLetivo: ano, situacao: 'TRANSFERIDA' } }),
      prisma.matricula.count({ where: { municipioId: usuario.municipioId, anoLetivo: ano, situacao: 'EVADIDA' } }),
      prisma.matricula.count({
        where: { municipioId: usuario.municipioId, anoLetivo: ano, situacao: 'ATIVA', aluno: { pcd: true } },
      }),
      prisma.matricula.count({
        where: { municipioId: usuario.municipioId, anoLetivo: ano, situacao: 'ATIVA', aluno: { bolsaFamilia: true } },
      }),
    ])

    // Matriculas por escola
    const porEscola = await prisma.matricula.groupBy({
      by: ['turmaId'],
      where: { municipioId: usuario.municipioId, anoLetivo: ano, situacao: 'ATIVA' },
      _count: true,
    })

    // Frequência média geral
    const freqAgg = await prisma.matricula.aggregate({
      where: { municipioId: usuario.municipioId, anoLetivo: ano, situacao: 'ATIVA' },
      _avg: { percentualFreq: true },
    })

    // Alunos em risco (freq < 75%)
    const emRisco = await prisma.matricula.count({
      where: {
        municipioId: usuario.municipioId, anoLetivo: ano, situacao: 'ATIVA',
        percentualFreq: { lt: 75 },
      },
    })

    return NextResponse.json({
      kpis: {
        totalMatriculas, ativas, transferidas, evadidas, pcd, bolsaFamilia, emRisco,
        freqMedia: Number(freqAgg._avg.percentualFreq ?? 100).toFixed(1),
      },
    })
  }

  if (id) {
    const mat = await prisma.matricula.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        aluno: true,
        turma: { include: { escola: { select: { nome: true } } } },
        notas: {
          include: { avaliacao: true },
          orderBy: [{ avaliacao: { bimestre: 'asc' } }],
        },
        frequencias: {
          include: { aula: true },
          orderBy: { aula: { data: 'desc' } },
          take: 30,
        },
      },
    })
    if (!mat) return NextResponse.json({ erro: 'Matrícula não encontrada' }, { status: 404 })
    return NextResponse.json({ matricula: mat })
  }

  const where: any = { municipioId: usuario.municipioId }
  if (turmaId)   where.turmaId   = turmaId
  if (alunoId)   where.alunoId   = alunoId
  if (anoLetivo) where.anoLetivo = Number(anoLetivo)

  const matriculas = await prisma.matricula.findMany({
    where, orderBy: { aluno: { nome: 'asc' } }, take: 500,
    include: {
      aluno: { select: { nome: true, dataNascimento: true, pcd: true, bolsaFamilia: true } },
      turma: { select: { serie: true, turma: true, turno: true } },
    },
  })

  return NextResponse.json({ matriculas, total: matriculas.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    alunoId:  z.string(),
    turmaId:  z.string(),
    anoLetivo: z.number().int().default(new Date().getFullYear()),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  // Verificar turma existe e tem vaga
  const turma = await prisma.turma.findFirst({
    where: { id: d.turmaId, municipioId: usuario.municipioId },
    include: { _count: { select: { matriculas: { where: { situacao: 'ATIVA' } } } } },
  })
  if (!turma) return NextResponse.json({ erro: 'Turma não encontrada' }, { status: 404 })

  if (turma._count.matriculas >= turma.capacidade) {
    return NextResponse.json({
      erro: `Turma sem vagas. Capacidade: ${turma.capacidade}, Matriculados: ${turma._count.matriculas}`,
    }, { status: 409 })
  }

  // Verificar duplicidade
  const existente = await prisma.matricula.findFirst({
    where: { alunoId: d.alunoId, turmaId: d.turmaId, anoLetivo: d.anoLetivo },
  })
  if (existente) {
    return NextResponse.json({ erro: 'Aluno já matriculado nesta turma no ano letivo', matriculaId: existente.id }, { status: 409 })
  }

  const numero = await gerarNumeroMatricula(usuario.municipioId, d.anoLetivo)
  const matricula = await prisma.matricula.create({
    data: {
      municipioId: usuario.municipioId,
      numero, alunoId: d.alunoId, turmaId: d.turmaId,
      anoLetivo: d.anoLetivo, usuarioId: usuario.id,
    },
    include: { aluno: { select: { nome: true } }, turma: { select: { serie: true, turma: true } } },
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'MATRICULAR_ALUNO', entidade: 'Matricula', entidadeId: matricula.id,
    detalhes: { numero, aluno: matricula.aluno.nome, turma: `${matricula.turma.serie}${matricula.turma.turma}` },
  })

  return NextResponse.json({ matricula, numero }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, ...extras } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const mat = await prisma.matricula.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!mat) return NextResponse.json({ erro: 'Matrícula não encontrada' }, { status: 404 })

  if (acao === 'TRANSFERIR') {
    const { escolaDestino } = extras
    if (!escolaDestino) return NextResponse.json({ erro: 'escolaDestino obrigatório' }, { status: 400 })
    await prisma.matricula.update({
      where: { id },
      data: { situacao: 'TRANSFERIDA', dataTransferencia: new Date(), escolaDestino },
    })
    await prisma.aluno.update({ where: { id: mat.alunoId }, data: { situacao: 'TRANSFERIDO' } })
    return NextResponse.json({ sucesso: true })
  }

  if (acao === 'CANCELAR') {
    await prisma.matricula.update({
      where: { id },
      data: { situacao: 'CANCELADA', motivoCancelamento: extras.motivo },
    })
    return NextResponse.json({ sucesso: true })
  }

  if (acao === 'FECHAR_ANO') {
    // Recalcular resultado final
    const resultado = calcularResultado(
      Number(mat.percentualFreq),
      mat.mediaGeral !== null ? Number(mat.mediaGeral) : null,
    )
    await prisma.matricula.update({
      where: { id },
      data: {
        situacao: resultado === 'APROVADO' ? 'CONCLUIDA' : 'ATIVA',
        resultadoFinal: resultado as any,
      },
    })
    return NextResponse.json({ sucesso: true, resultadoFinal: resultado })
  }

  if (acao === 'CONSELHO_APROVACAO') {
    // Conselho de classe pode aprovar aluno reprovado por nota (mantendo freq obrigatória)
    if (Number(mat.percentualFreq) < 75) {
      return NextResponse.json({ erro: 'Frequência abaixo de 75% não pode ser aprovada pelo conselho (LDB Art. 24)' }, { status: 409 })
    }
    await prisma.matricula.update({
      where: { id },
      data: { resultadoFinal: 'APROVADO_CONSELHO', situacao: 'CONCLUIDA' },
    })
    return NextResponse.json({ sucesso: true })
  }

  return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
}
