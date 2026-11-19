import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { extrairContextoRequest, auditLog } from '@/lib/audit'
import { temPermissao } from '@/lib/auth/rbac'

const ReceitaSchema = z.object({
  exercicio:        z.number().int().min(2020).max(2050),
  natureza:         z.enum([
    'TRIBUTARIA','PATRIMONIAL','AGROPECUARIA','INDUSTRIAL','SERVICOS',
    'TRANSFERENCIAS_CORRENTES','OUTRAS_CORRENTES','OPERACOES_CREDITO',
    'ALIENACAO_BENS','AMORTIZACAO_EMPRESTIMOS','TRANSFERENCIAS_CAPITAL','OUTRAS_CAPITAL',
  ]),
  tipoTransferencia: z.enum([
    'FPM','ICMS','IPVA','ITR','FUNDEB','SUS','FNAS','FNDE',
    'CONVENIO','EMENDA','ROYALTIES','OUTRAS',
  ]).optional(),
  descricao:        z.string().min(3),
  mes:              z.number().int().min(1).max(12),
  valorPrevisto:    z.number().nonnegative(),
  contaBancaria:    z.string().optional(),
  observacoes:      z.string().optional(),
})

const ArrecadarSchema = z.object({
  id:              z.string(),
  valorArrecadado: z.number().positive(),
  dataArrecadacao: z.string().datetime(),
  contaBancaria:   z.string().optional(),
  observacoes:     z.string().optional(),
})

// POST /api/sefin/receitas
export async function POST(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'sefin:receita:create')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const dados = ReceitaSchema.parse(body)

    const receita = await prisma.receita.create({
      data: {
        municipioId: ctx.municipioId,
        ...dados,
        natureza: dados.natureza as any,
        tipoTransferencia: dados.tipoTransferencia as any,
        status: 'PREVISTA',
        lancadoPor: ctx.usuarioId,
      },
    })

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId: ctx.usuarioId,
      acao: 'CREATE',
      modulo: 'sefin',
      recurso: 'receita',
      registroId: receita.id,
      dadosNovos: { natureza: dados.natureza, mes: dados.mes, valorPrevisto: dados.valorPrevisto },
    })

    return NextResponse.json({ receita }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[RECEITA]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// GET /api/sefin/receitas — com agrupamento opcional por natureza/mês
export async function GET(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'sefin:receita:read')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const exercicio  = searchParams.get('exercicio')
  const mes        = searchParams.get('mes')
  const natureza   = searchParams.get('natureza')
  const status     = searchParams.get('status')
  const agrupar    = searchParams.get('agrupar') // 'natureza' | 'mes'

  const receitas = await prisma.receita.findMany({
    where: {
      municipioId: ctx.municipioId,
      ...(exercicio && { exercicio: parseInt(exercicio) }),
      ...(mes       && { mes: parseInt(mes) }),
      ...(natureza  && { natureza: natureza as any }),
      ...(status    && { status: status as any }),
    },
    orderBy: [{ exercicio: 'desc' }, { mes: 'asc' }, { natureza: 'asc' }],
    take: 500,
  })

  // Resumo financeiro
  const totalPrevisto    = receitas.reduce((s, r) => s + Number(r.valorPrevisto), 0)
  const totalArrecadado  = receitas.reduce((s, r) => s + Number(r.valorArrecadado), 0)
  const pctRealizacao    = totalPrevisto > 0 ? (totalArrecadado / totalPrevisto) * 100 : 0

  // Agrupamento por natureza
  let porNatureza: Record<string, { previsto: number; arrecadado: number; count: number }> | undefined
  if (agrupar === 'natureza') {
    porNatureza = {}
    for (const r of receitas) {
      if (!porNatureza[r.natureza]) porNatureza[r.natureza] = { previsto: 0, arrecadado: 0, count: 0 }
      porNatureza[r.natureza].previsto    += Number(r.valorPrevisto)
      porNatureza[r.natureza].arrecadado  += Number(r.valorArrecadado)
      porNatureza[r.natureza].count++
    }
  }

  // Agrupamento por mês
  let porMes: Record<number, { previsto: number; arrecadado: number }> | undefined
  if (agrupar === 'mes') {
    porMes = {}
    for (const r of receitas) {
      if (!porMes[r.mes]) porMes[r.mes] = { previsto: 0, arrecadado: 0 }
      porMes[r.mes].previsto   += Number(r.valorPrevisto)
      porMes[r.mes].arrecadado += Number(r.valorArrecadado)
    }
  }

  return NextResponse.json({
    dados: receitas,
    total: receitas.length,
    resumo: { totalPrevisto, totalArrecadado, pctRealizacao },
    ...(porNatureza && { porNatureza }),
    ...(porMes && { porMes }),
  })
}

// PATCH /api/sefin/receitas — registrar arrecadação efetiva
export async function PATCH(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'sefin:receita:update')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const dados = ArrecadarSchema.parse(body)

    const atual = await prisma.receita.findFirst({
      where: { id: dados.id, municipioId: ctx.municipioId },
    })
    if (!atual) return NextResponse.json({ erro: 'Receita não encontrada' }, { status: 404 })
    if (atual.status === 'CANCELADA') return NextResponse.json({ erro: 'Receita cancelada não pode ser arrecadada' }, { status: 422 })

    const atualizada = await prisma.receita.update({
      where: { id: dados.id },
      data: {
        valorArrecadado: { increment: dados.valorArrecadado },
        dataArrecadacao: new Date(dados.dataArrecadacao),
        contaBancaria:   dados.contaBancaria ?? atual.contaBancaria,
        observacoes:     dados.observacoes ?? atual.observacoes,
        status:          'ARRECADADA',
      },
    })

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId: ctx.usuarioId,
      acao: 'UPDATE',
      modulo: 'sefin',
      recurso: 'receita',
      registroId: dados.id,
      dadosAntigos: { valorArrecadado: atual.valorArrecadado, status: atual.status },
      dadosNovos:   { valorArrecadado: dados.valorArrecadado, status: 'ARRECADADA' },
    })

    return NextResponse.json({ receita: atualizada })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[RECEITA PATCH]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
