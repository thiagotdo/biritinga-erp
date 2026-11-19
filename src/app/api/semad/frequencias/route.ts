import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { extrairContextoRequest, auditLog } from '@/lib/audit'
import { temPermissao } from '@/lib/auth/rbac'

const OcorrenciaSchema = z.object({
  servidorId:    z.string(),
  data:          z.string().datetime(),
  tipo:          z.enum([
    'FALTA_JUSTIFICADA', 'FALTA_INJUSTIFICADA', 'ATRASO',
    'SAIDA_ANTECIPADA', 'HORA_EXTRA', 'DISPENSA_MEDICA',
    'DISPENSA_ADMINISTRATIVA', 'PLANTAO_EXTRA',
  ]),
  horas:         z.number().positive().optional(),
  justificativa: z.string().optional(),
  comprovante:   z.string().optional(),
})

const LoteSchema = z.object({
  ocorrencias: z.array(OcorrenciaSchema).min(1).max(100),
})

// POST /api/semad/frequencias — lança ocorrência individual ou em lote
export async function POST(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'semad:frequencia:create')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await request.json()

    // Detectar se é lote ou individual
    const isLote = Array.isArray(body.ocorrencias)
    const ocorrencias = isLote
      ? LoteSchema.parse(body).ocorrencias
      : [OcorrenciaSchema.parse(body)]

    const criadas = await prisma.ocorrenciaFrequencia.createMany({
      data: ocorrencias.map(o => ({
        municipioId: ctx.municipioId,
        servidorId: o.servidorId,
        data: new Date(o.data),
        tipo: o.tipo as any,
        horas: o.horas,
        justificativa: o.justificativa,
        comprovante: o.comprovante,
        lancadoPor: ctx.usuarioId,
      })),
      skipDuplicates: true,
    })

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId: ctx.usuarioId,
      acao: 'CREATE',
      modulo: 'semad',
      recurso: 'frequencia',
      registroId: 'lote',
      dadosNovos: { count: criadas.count, isLote },
    })

    return NextResponse.json({ criadas: criadas.count }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[FREQUENCIA]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// GET /api/semad/frequencias — relatório do período
export async function GET(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'semad:frequencia:read')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const servidorId = searchParams.get('servidorId')
  const tipo       = searchParams.get('tipo')
  const dataInicio = searchParams.get('dataInicio')
  const dataFim    = searchParams.get('dataFim')
  const mes        = searchParams.get('mes')   // "2026-11" — atalho
  const ano        = searchParams.get('ano')

  // Montar intervalo de data
  let rangeInicio: Date | undefined
  let rangeFim: Date | undefined

  if (mes) {
    const [y, m] = mes.split('-').map(Number)
    rangeInicio = new Date(y, m - 1, 1)
    rangeFim    = new Date(y, m, 0, 23, 59, 59)
  } else if (ano) {
    rangeInicio = new Date(parseInt(ano), 0, 1)
    rangeFim    = new Date(parseInt(ano), 11, 31, 23, 59, 59)
  } else if (dataInicio && dataFim) {
    rangeInicio = new Date(dataInicio)
    rangeFim    = new Date(dataFim)
  }

  const ocorrencias = await prisma.ocorrenciaFrequencia.findMany({
    where: {
      municipioId: ctx.municipioId,
      ...(servidorId && { servidorId }),
      ...(tipo && { tipo: tipo as any }),
      ...(rangeInicio && rangeFim && { data: { gte: rangeInicio, lte: rangeFim } }),
    },
    include: {
      servidor: { select: { id: true, nome: true, matricula: true } },
    },
    orderBy: [{ servidorId: 'asc' }, { data: 'desc' }],
    take: 500,
  })

  // Resumo agregado por tipo
  const resumo = ocorrencias.reduce((acc, o) => {
    acc[o.tipo] = (acc[o.tipo] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return NextResponse.json({ dados: ocorrencias, resumo, total: ocorrencias.length })
}
