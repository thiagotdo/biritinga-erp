import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { extrairContextoRequest, auditLog } from '@/lib/audit'
import { temPermissao } from '@/lib/auth/rbac'

const AgendamentoSchema = z.object({
  pacienteId: z.string(),
  unidadeId: z.string(),
  profissionalId: z.string().optional(),
  dataHora: z.string().datetime(),
  tipoConsulta: z.string(),
  prioridade: z.number().int().min(0).max(1).default(0),
  observacoes: z.string().optional(),
})

const AtualizarStatusSchema = z.object({
  status: z.enum(['CONFIRMADO', 'EM_ATENDIMENTO', 'REALIZADO', 'CANCELADO', 'FALTA', 'REMARCADO']),
  motivoCancelamento: z.string().optional(),
  novaDataHora: z.string().datetime().optional(), // para REMARCADO
})

// POST /api/saude/agendamentos
export async function POST(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'saude:agendamento:create')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const dados = AgendamentoSchema.parse(body)

    const dataHora = new Date(dados.dataHora)

    // Verificar disponibilidade do profissional (conflito de horário)
    if (dados.profissionalId) {
      const conflito = await prisma.agendamento.findFirst({
        where: {
          profissionalId: dados.profissionalId,
          dataHora: {
            gte: new Date(dataHora.getTime() - 20 * 60 * 1000), // ±20 min
            lte: new Date(dataHora.getTime() + 20 * 60 * 1000),
          },
          status: { notIn: ['CANCELADO', 'FALTA'] },
        },
      })
      if (conflito) {
        return NextResponse.json(
          { erro: 'Profissional já possui agendamento neste horário', conflito: conflito.id },
          { status: 409 }
        )
      }
    }

    const agendamento = await prisma.agendamento.create({
      data: {
        municipioId: ctx.municipioId,
        pacienteId: dados.pacienteId,
        unidadeId: dados.unidadeId,
        profissionalId: dados.profissionalId,
        dataHora,
        tipoConsulta: dados.tipoConsulta as any,
        prioridade: dados.prioridade,
        observacoes: dados.observacoes,
        agendadoPor: ctx.usuarioId,
      },
      include: {
        paciente: { select: { nome: true } },
        profissional: { select: { nome: true, especialidade: true } },
        unidade: { select: { nome: true } },
      },
    })

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId: ctx.usuarioId,
      acao: 'CREATE',
      modulo: 'saude',
      recurso: 'agendamento',
      registroId: agendamento.id,
      dadosNovos: {
        paciente: agendamento.paciente.nome,
        dataHora: dataHora.toISOString(),
        tipo: dados.tipoConsulta,
      },
    })

    return NextResponse.json({ agendamento }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[AGENDAMENTO]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// GET /api/saude/agendamentos
export async function GET(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'saude:agendamento:read')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const data = searchParams.get('data')           // "2026-11-13"
  const semana = searchParams.get('semana')       // "2026-W46"
  const unidadeId = searchParams.get('unidadeId')
  const profissionalId = searchParams.get('profissionalId')
  const pacienteId = searchParams.get('pacienteId')
  const status = searchParams.get('status')

  let dataInicio: Date | undefined
  let dataFim: Date | undefined

  if (data) {
    dataInicio = new Date(`${data}T00:00:00`)
    dataFim = new Date(`${data}T23:59:59`)
  } else if (semana) {
    // parsear "2026-W46"
    const [ano, semStr] = semana.split('-W')
    const sem = parseInt(semStr)
    const janFirst = new Date(parseInt(ano), 0, 1)
    const dayOfWeek = janFirst.getDay() || 7
    dataInicio = new Date(janFirst.getTime() + (sem - 1) * 7 * 86400000 - (dayOfWeek - 1) * 86400000)
    dataFim = new Date(dataInicio.getTime() + 6 * 86400000 + 86399000)
  }

  const agendamentos = await prisma.agendamento.findMany({
    where: {
      municipioId: ctx.municipioId,
      ...(unidadeId && { unidadeId }),
      ...(profissionalId && { profissionalId }),
      ...(pacienteId && { pacienteId }),
      ...(status && { status: status as any }),
      ...(dataInicio && dataFim && { dataHora: { gte: dataInicio, lte: dataFim } }),
    },
    include: {
      paciente: { select: { id: true, nome: true, dataNascimento: true, cns: true, gruposAtendimento: true } },
      profissional: { select: { id: true, nome: true, especialidade: true, cbo: true } },
      unidade: { select: { id: true, nome: true } },
    },
    orderBy: [{ dataHora: 'asc' }, { prioridade: 'desc' }],
  })

  return NextResponse.json({ dados: agendamentos, total: agendamentos.length })
}
