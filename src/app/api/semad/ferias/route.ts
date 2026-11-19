import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { extrairContextoRequest, auditLog } from '@/lib/audit'
import { temPermissao } from '@/lib/auth/rbac'

const FeriasSchema = z.object({
  servidorId:  z.string(),
  exercicio:   z.number().int().min(2000).max(2100),
  dataInicio:  z.string().datetime(),
  dataFim:     z.string().datetime(),
  diasDireito: z.number().int().min(1).max(30).default(30),
  diasGozo:    z.number().int().min(1).max(30).default(30),
  diasAbono:   z.number().int().min(0).max(10).default(0),
  observacoes: z.string().optional(),
})

const AprovarSchema = z.object({
  id:          z.string(),
  status:      z.enum(['APROVADA', 'CANCELADA']),
  observacoes: z.string().optional(),
})

// POST /api/semad/ferias
export async function POST(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'semad:ferias:create')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const dados = FeriasSchema.parse(body)

    const dataInicio = new Date(dados.dataInicio)
    const dataFim    = new Date(dados.dataFim)

    // Validar: dias de gozo + abono ≤ dias de direito
    if (dados.diasGozo + dados.diasAbono > dados.diasDireito) {
      return NextResponse.json({ erro: 'Soma dos dias de gozo e abono excede os dias de direito' }, { status: 422 })
    }

    // Verificar sobreposição de períodos para o mesmo servidor
    const sobreposicao = await prisma.periodoFerias.findFirst({
      where: {
        servidorId: dados.servidorId,
        status: { in: ['SOLICITADA', 'APROVADA', 'EM_GOZO'] },
        OR: [
          { dataInicio: { lte: dataFim }, dataFim: { gte: dataInicio } },
        ],
      },
    })
    if (sobreposicao) {
      return NextResponse.json({ erro: 'Já existe um período de férias sobreposto para este servidor', periodoId: sobreposicao.id }, { status: 409 })
    }

    const ferias = await prisma.periodoFerias.create({
      data: {
        municipioId: ctx.municipioId,
        servidorId: dados.servidorId,
        exercicio: dados.exercicio,
        dataInicio,
        dataFim,
        diasDireito: dados.diasDireito,
        diasGozo: dados.diasGozo,
        diasAbono: dados.diasAbono,
        status: 'SOLICITADA',
        observacoes: dados.observacoes,
      },
    })

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId: ctx.usuarioId,
      acao: 'CREATE',
      modulo: 'semad',
      recurso: 'ferias',
      registroId: ferias.id,
      dadosNovos: { servidorId: dados.servidorId, exercicio: dados.exercicio, dataInicio: dados.dataInicio },
    })

    return NextResponse.json({ ferias }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[FERIAS]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// GET /api/semad/ferias
export async function GET(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'semad:ferias:read')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const servidorId = searchParams.get('servidorId')
  const exercicio  = searchParams.get('exercicio')
  const status     = searchParams.get('status')

  const ferias = await prisma.periodoFerias.findMany({
    where: {
      municipioId: ctx.municipioId,
      ...(servidorId && { servidorId }),
      ...(exercicio  && { exercicio: parseInt(exercicio) }),
      ...(status     && { status: status as any }),
    },
    include: {
      servidor: { select: { id: true, nome: true, matricula: true, cargo: { select: { nome: true } } } },
    },
    orderBy: [{ exercicio: 'desc' }, { dataInicio: 'asc' }],
    take: 100,
  })

  return NextResponse.json({ dados: ferias, total: ferias.length })
}

// PATCH /api/semad/ferias — aprovar / cancelar
export async function PATCH(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'semad:ferias:update')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const dados = AprovarSchema.parse(body)

    const atual = await prisma.periodoFerias.findFirst({
      where: { id: dados.id, municipioId: ctx.municipioId },
    })
    if (!atual) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })

    const atualizado = await prisma.$transaction(async (tx) => {
      const f = await tx.periodoFerias.update({
        where: { id: dados.id },
        data: {
          status: dados.status as any,
          aprovadoPor: dados.status === 'APROVADA' ? ctx.usuarioId : undefined,
          dataAprovacao: dados.status === 'APROVADA' ? new Date() : undefined,
          observacoes: dados.observacoes ?? atual.observacoes,
        },
      })

      // Se aprovada, atualizar situação do servidor
      if (dados.status === 'APROVADA') {
        const hoje = new Date()
        const inicio = atual.dataInicio
        const fim    = atual.dataFim
        if (hoje >= inicio && hoje <= fim) {
          await tx.servidor.update({
            where: { id: atual.servidorId },
            data: { situacao: 'FERIAS' },
          })
        }
      }

      return f
    })

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId: ctx.usuarioId,
      acao: 'UPDATE',
      modulo: 'semad',
      recurso: 'ferias',
      registroId: dados.id,
      dadosAntigos: { status: atual.status },
      dadosNovos: { status: dados.status },
    })

    return NextResponse.json({ ferias: atualizado })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[FERIAS PATCH]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
