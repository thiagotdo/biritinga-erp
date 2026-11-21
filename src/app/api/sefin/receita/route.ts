// @ts-nocheck
// Gestão de Receitas — ReceitaPrevista + LancamentoReceita
// GET    — listar receitas previstas / lançamentos
// POST   — criar receita prevista / registrar arrecadação
// PATCH  — atualizar receita prevista / cancelar lançamento

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { extrairContextoRequest, temPermissao } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

const ReceitaPrevistaSchema = z.object({
  orcamentoId:   z.string(),
  codigo:        z.string().min(2),
  descricao:     z.string().min(5),
  natureza:      z.enum([
    'TRIBUTARIA','CONTRIBUICOES','PATRIMONIAL','AGROPECUARIA','INDUSTRIAL',
    'SERVICOS','TRANSFERENCIAS_CORRENTES','OUTRAS_CORRENTES',
    'OPERACOES_CREDITO','ALIENACAO_BENS','TRANSFERENCIAS_CAPITAL','OUTRAS_CAPITAL',
  ]),
  fonte:         z.string().default('00'),
  valorPrevisto: z.number().positive(),
})

const LancamentoSchema = z.object({
  receitaPrevistaId: z.string(),
  valor:             z.number().positive(),
  competencia:       z.string().regex(/^\d{4}-\d{2}$/),
  situacao:          z.enum(['LANCADA','ARRECADADA']).default('ARRECADADA'),
  documentoOrigem:   z.string().optional(),
  descricao:         z.string().optional(),
})

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'sefin:receita:read')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const id          = searchParams.get('id')
    const exercicio   = searchParams.get('exercicio') ? Number(searchParams.get('exercicio')) : undefined
    const competencia = searchParams.get('competencia')
    const natureza    = searchParams.get('natureza')

    // Detalhe de lançamento específico
    if (id) {
      const lancamento = await prisma.lancamentoReceita.findFirst({
        where: { id, municipioId: ctx.municipioId },
        include: { receitaPrevista: true },
      })
      if (!lancamento) return NextResponse.json({ erro: 'Lançamento não encontrado' }, { status: 404 })
      return NextResponse.json({ lancamento })
    }

    // Buscar orçamento do exercício
    const exercicioAlvo = exercicio ?? new Date().getFullYear()
    const orcamento = await prisma.orcamento.findFirst({
      where: { municipioId: ctx.municipioId, exercicio: exercicioAlvo },
    })
    if (!orcamento) {
      return NextResponse.json({ erro: `Orçamento ${exercicioAlvo} não encontrado` }, { status: 404 })
    }

    // Receitas previstas com totais arrecadados
    const previstas = await prisma.receitaPrevista.findMany({
      where: {
        orcamentoId: orcamento.id,
        ...(natureza && { natureza: natureza as any }),
      },
      include: {
        lancamentos: {
          where: competencia ? { competencia } : undefined,
          orderBy: { criadoEm: 'desc' },
        },
      },
      orderBy: [{ natureza: 'asc' }, { codigo: 'asc' }],
    })

    // Enriquecer com totais
    const receitasEnriquecidas = previstas.map(r => {
      const arrecadado = r.lancamentos
        .filter(l => l.situacao === 'ARRECADADA')
        .reduce((s, l) => s + Number(l.valor), 0)
      const lancada = r.lancamentos
        .filter(l => l.situacao === 'LANCADA')
        .reduce((s, l) => s + Number(l.valor), 0)
      return {
        ...r,
        totais: {
          arrecadado,
          lancada,
          previsto:       Number(r.valorPrevisto),
          saldo:          Number(r.valorPrevisto) - arrecadado,
          percArrecadado: r.valorPrevisto > 0 ? ((arrecadado / Number(r.valorPrevisto)) * 100).toFixed(1) : '0.0',
        },
      }
    })

    // Resumo por natureza
    const resumoPorNatureza: Record<string, { previsto: number; arrecadado: number }> = {}
    for (const r of receitasEnriquecidas) {
      const key = r.natureza
      if (!resumoPorNatureza[key]) resumoPorNatureza[key] = { previsto: 0, arrecadado: 0 }
      resumoPorNatureza[key].previsto    += r.totais.previsto
      resumoPorNatureza[key].arrecadado  += r.totais.arrecadado
    }

    // Total geral
    const totalPrevisto    = receitasEnriquecidas.reduce((s, r) => s + r.totais.previsto,    0)
    const totalArrecadado  = receitasEnriquecidas.reduce((s, r) => s + r.totais.arrecadado,  0)

    // Lançamentos recentes (últimos 30, toda competência ou filtrada)
    const lancamentosRecentes = await prisma.lancamentoReceita.findMany({
      where: {
        municipioId: ctx.municipioId,
        ...(competencia && { competencia }),
        ...(orcamento && {
          receitaPrevista: { orcamentoId: orcamento.id },
        }),
      },
      include: {
        receitaPrevista: { select: { codigo: true, descricao: true, natureza: true } },
      },
      orderBy: { criadoEm: 'desc' },
      take: 30,
    })

    return NextResponse.json({
      exercicio: exercicioAlvo,
      orcamento: { id: orcamento.id, situacao: orcamento.situacao },
      receitas: receitasEnriquecidas,
      lancamentosRecentes,
      resumo: {
        porNatureza: Object.entries(resumoPorNatureza).map(([natureza, v]) => ({ natureza, ...v })),
        total: { previsto: totalPrevisto, arrecadado: totalArrecadado },
      },
    })
  } catch (error) {
    console.error('[SEFIN/RECEITA/GET]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'sefin:receita:create')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()

    // Discriminar por tipo de operação
    if (body.tipo === 'PREVISTA') {
      const dados = ReceitaPrevistaSchema.parse(body)

      // Verificar orçamento
      const orc = await prisma.orcamento.findFirst({
        where: { id: dados.orcamentoId, municipioId: ctx.municipioId },
      })
      if (!orc) return NextResponse.json({ erro: 'Orçamento não encontrado' }, { status: 404 })

      // Verificar duplicidade de código
      const existe = await prisma.receitaPrevista.findUnique({
        where: { orcamentoId_codigo: { orcamentoId: dados.orcamentoId, codigo: dados.codigo } },
      })
      if (existe) return NextResponse.json({ erro: `Código de receita ${dados.codigo} já existe neste orçamento` }, { status: 409 })

      const receita = await prisma.receitaPrevista.create({
        data: {
          municipioId:   ctx.municipioId,
          orcamentoId:   dados.orcamentoId,
          codigo:        dados.codigo,
          descricao:     dados.descricao,
          natureza:      dados.natureza,
          fonte:         dados.fonte,
          valorPrevisto: dados.valorPrevisto,
        },
      })

      return NextResponse.json({ receita }, { status: 201 })
    }

    // Lançamento de arrecadação
    const dados = LancamentoSchema.parse(body)

    const prevista = await prisma.receitaPrevista.findFirst({
      where: { id: dados.receitaPrevistaId, municipioId: ctx.municipioId },
    })
    if (!prevista) return NextResponse.json({ erro: 'Receita prevista não encontrada' }, { status: 404 })

    const lancamento = await prisma.lancamentoReceita.create({
      data: {
        municipioId:       ctx.municipioId,
        receitaPrevistaId: dados.receitaPrevistaId,
        valor:             dados.valor,
        competencia:       dados.competencia,
        situacao:          dados.situacao,
        documentoOrigem:   dados.documentoOrigem,
        descricao:         dados.descricao,
        usuarioId:         ctx.usuarioId,
      },
    })

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId:   ctx.usuarioId,
      acao: 'CREATE', modulo: 'sefin', recurso: 'lancamento_receita',
      registroId: lancamento.id,
      dadosNovos: { receita: prevista.descricao, valor: dados.valor, competencia: dados.competencia },
    })

    return NextResponse.json({ lancamento }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[SEFIN/RECEITA/POST]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// ─── PATCH — cancelar / confirmar lançamento ──────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'sefin:receita:update')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const { id, acao, valorPrevisto } = await request.json()
    if (!id || !acao) return NextResponse.json({ erro: 'id e acao obrigatórios' }, { status: 400 })

    // Atualizar receita prevista
    if (acao === 'ATUALIZAR_PREVISTO' && valorPrevisto) {
      const receita = await prisma.receitaPrevista.findFirst({
        where: { id, municipioId: ctx.municipioId },
      })
      if (!receita) return NextResponse.json({ erro: 'Receita não encontrada' }, { status: 404 })

      const atualizada = await prisma.receitaPrevista.update({
        where: { id },
        data: { valorPrevisto },
      })
      return NextResponse.json({ receita: atualizada })
    }

    // Cancelar lançamento
    if (acao === 'CANCELAR') {
      const lanc = await prisma.lancamentoReceita.findFirst({
        where: { id, municipioId: ctx.municipioId },
      })
      if (!lanc) return NextResponse.json({ erro: 'Lançamento não encontrado' }, { status: 404 })
      if (lanc.situacao === 'CANCELADA') {
        return NextResponse.json({ erro: 'Lançamento já cancelado' }, { status: 422 })
      }

      const atualizado = await prisma.lancamentoReceita.update({
        where: { id },
        data: { situacao: 'CANCELADA' },
      })

      await auditLog({
        municipioId: ctx.municipioId,
        usuarioId:   ctx.usuarioId,
        acao: 'UPDATE', modulo: 'sefin', recurso: 'lancamento_receita',
        registroId: id,
        dadosAntigos: { situacao: lanc.situacao },
        dadosNovos:   { situacao: 'CANCELADA' },
      })

      return NextResponse.json({ lancamento: atualizado })
    }

    // Confirmar lançamento (LANCADA → ARRECADADA)
    if (acao === 'CONFIRMAR') {
      const lanc = await prisma.lancamentoReceita.findFirst({
        where: { id, municipioId: ctx.municipioId },
      })
      if (!lanc) return NextResponse.json({ erro: 'Lançamento não encontrado' }, { status: 404 })
      if (lanc.situacao !== 'LANCADA') {
        return NextResponse.json({ erro: 'Apenas lançamentos LANCADA podem ser confirmados' }, { status: 422 })
      }

      const atualizado = await prisma.lancamentoReceita.update({
        where: { id },
        data: { situacao: 'ARRECADADA', dataArrecadacao: new Date() },
      })
      return NextResponse.json({ lancamento: atualizado })
    }

    return NextResponse.json({ erro: 'Ação inválida. Use: CANCELAR, CONFIRMAR, ATUALIZAR_PREVISTO' }, { status: 400 })
  } catch (error) {
    console.error('[SEFIN/RECEITA/PATCH]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
