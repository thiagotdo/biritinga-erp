// Gestão do Orçamento Anual (LOA) e Dotações
// GET    — listar orçamentos / buscar dotações de um exercício
// POST   — criar LOA / adicionar dotação
// PATCH  — aprovar LOA / suplementar dotação

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { extrairContextoRequest, temPermissao } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

const DotacaoSchema = z.object({
  unidadeGestora:      z.string(),
  unidadeOrcamentaria: z.string(),
  funcao:              z.string().length(2),
  subfuncao:           z.string().length(3),
  programa:            z.string(),
  acao:                z.string(),
  natureza:            z.enum(['PESSOAL_ENCARGOS','JUROS_ENCARGOS_DIVIDA','OUTRAS_CORRENTES','INVESTIMENTOS','INVERSOES_FINANCEIRAS','AMORTIZACAO_DIVIDA']),
  fonte:               z.string(),
  codigo:              z.string(),
  descricao:           z.string().min(5),
  valorOriginal:       z.number().positive(),
  secretaria:          z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'sefin:orcamento:read')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const exercicio  = searchParams.get('exercicio') ? Number(searchParams.get('exercicio')) : undefined
    const secretaria = searchParams.get('secretaria')
    const natureza   = searchParams.get('natureza')

    // Lista de orçamentos por exercício
    if (!exercicio) {
      const orcamentos = await prisma.orcamento.findMany({
        where: { municipioId: ctx.municipioId },
        orderBy: { exercicio: 'desc' },
      })
      return NextResponse.json({ orcamentos })
    }

    // Detalhe do orçamento + dotações
    const orcamento = await prisma.orcamento.findFirst({
      where: { municipioId: ctx.municipioId, exercicio },
    })
    if (!orcamento) return NextResponse.json({ erro: 'Orçamento não encontrado' }, { status: 404 })

    const dotacoes = await prisma.dotacao.findMany({
      where: {
        orcamentoId: orcamento.id,
        ativo: true,
        ...(secretaria && { secretaria }),
        ...(natureza   && { natureza: natureza as any }),
      },
      orderBy: [{ secretaria: 'asc' }, { codigo: 'asc' }],
    })

    // Totais consolidados por secretaria
    const porSecretaria = await prisma.dotacao.groupBy({
      by: ['secretaria'],
      where: { orcamentoId: orcamento.id, ativo: true },
      _sum: { valorAtual: true, valorEmpenhado: true, valorPago: true },
    })

    // Totais por natureza de despesa
    const porNatureza = await prisma.dotacao.groupBy({
      by: ['natureza'],
      where: { orcamentoId: orcamento.id, ativo: true },
      _sum: { valorAtual: true, valorEmpenhado: true },
    })

    // Execução financeira global
    const execucao = await prisma.dotacao.aggregate({
      where: { orcamentoId: orcamento.id, ativo: true },
      _sum: { valorOriginal: true, valorAtual: true, valorEmpenhado: true, valorLiquidado: true, valorPago: true },
    })

    return NextResponse.json({
      orcamento,
      dotacoes,
      resumo: {
        porSecretaria: porSecretaria.map(s => ({
          secretaria:    s.secretaria ?? '—',
          valorAtual:    Number(s._sum.valorAtual    ?? 0),
          valorEmpenhado:Number(s._sum.valorEmpenhado ?? 0),
          valorPago:     Number(s._sum.valorPago      ?? 0),
        })),
        porNatureza: porNatureza.map(n => ({
          natureza:      n.natureza,
          valorAtual:    Number(n._sum.valorAtual    ?? 0),
          valorEmpenhado:Number(n._sum.valorEmpenhado ?? 0),
        })),
        execucao: {
          valorOriginal:  Number(execucao._sum.valorOriginal  ?? 0),
          valorAtual:     Number(execucao._sum.valorAtual     ?? 0),
          valorEmpenhado: Number(execucao._sum.valorEmpenhado ?? 0),
          valorLiquidado: Number(execucao._sum.valorLiquidado ?? 0),
          valorPago:      Number(execucao._sum.valorPago      ?? 0),
          percEmpenhado:  execucao._sum.valorAtual
            ? (Number(execucao._sum.valorEmpenhado) / Number(execucao._sum.valorAtual)) * 100
            : 0,
        },
      },
    })
  } catch (error) {
    console.error('[SEFIN/ORCAMENTO/GET]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'sefin:orcamento:update')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const CreateSchema = z.discriminatedUnion('tipo', [
      z.object({
        tipo:         z.literal('LOA'),
        exercicio:    z.number().int().min(2024),
        totalDespesa: z.number().positive(),
        totalReceita: z.number().positive(),
        leiNumero:    z.string().optional(),
        leiData:      z.string().optional(),
        observacoes:  z.string().optional(),
      }),
      z.object({
        tipo:       z.literal('DOTACAO'),
        orcamentoId:z.string(),
        dotacao:    DotacaoSchema,
      }),
      z.object({
        tipo:          z.literal('SUPLEMENTO'),
        dotacaoId:     z.string(),
        orcamentoId:   z.string(),
        tipoSuplemento:z.enum(['SUPLEMENTACAO','ESPECIAL','EXTRAORDINARIO']),
        valor:         z.number(),       // positivo=suplementação, negativo=redução
        decreto:       z.string().optional(),
        dataDecreto:   z.string().optional(),
        justificativa: z.string().optional(),
      }),
    ])

    const dados = CreateSchema.parse(await request.json())

    if (dados.tipo === 'LOA') {
      const existe = await prisma.orcamento.findFirst({
        where: { municipioId: ctx.municipioId, exercicio: dados.exercicio },
      })
      if (existe) return NextResponse.json({ erro: `Orçamento ${dados.exercicio} já existe` }, { status: 409 })

      const orc = await prisma.orcamento.create({
        data: {
          municipioId:  ctx.municipioId,
          exercicio:    dados.exercicio,
          totalDespesa: dados.totalDespesa,
          totalReceita: dados.totalReceita,
          leiNumero:    dados.leiNumero,
          leiData:      dados.leiData ? new Date(dados.leiData) : undefined,
          observacoes:  dados.observacoes,
        },
      })
      return NextResponse.json({ orcamento: orc }, { status: 201 })
    }

    if (dados.tipo === 'DOTACAO') {
      const orc = await prisma.orcamento.findFirst({
        where: { id: dados.orcamentoId, municipioId: ctx.municipioId },
      })
      if (!orc) return NextResponse.json({ erro: 'Orçamento não encontrado' }, { status: 404 })

      const dotacao = await prisma.dotacao.create({
        data: {
          orcamentoId:         dados.orcamentoId,
          municipioId:         ctx.municipioId,
          unidadeGestora:      dados.dotacao.unidadeGestora,
          unidadeOrcamentaria: dados.dotacao.unidadeOrcamentaria,
          funcao:              dados.dotacao.funcao,
          subfuncao:           dados.dotacao.subfuncao,
          programa:            dados.dotacao.programa,
          acao:                dados.dotacao.acao,
          natureza:            dados.dotacao.natureza,
          fonte:               dados.dotacao.fonte,
          codigo:              dados.dotacao.codigo,
          descricao:           dados.dotacao.descricao,
          valorOriginal:       dados.dotacao.valorOriginal,
          valorAtual:          dados.dotacao.valorOriginal,
          secretaria:          dados.dotacao.secretaria,
        },
      })
      return NextResponse.json({ dotacao }, { status: 201 })
    }

    if (dados.tipo === 'SUPLEMENTO') {
      const dotacao = await prisma.dotacao.findFirst({
        where: { id: dados.dotacaoId, municipioId: ctx.municipioId },
      })
      if (!dotacao) return NextResponse.json({ erro: 'Dotação não encontrada' }, { status: 404 })

      // Verificar que suplementação não ultrapassa limite legal (25% da dotação original — art. 43 Lei 4.320)
      if (dados.tipoSuplemento === 'SUPLEMENTACAO') {
        const totalSuplem = await prisma.suplemento.aggregate({
          where: { dotacaoId: dados.dotacaoId, tipo: 'SUPLEMENTACAO' },
          _sum: { valor: true },
        })
        const totalAcumulado = Number(totalSuplem._sum.valor ?? 0) + dados.valor
        const limite25pct    = Number(dotacao.valorOriginal) * 0.25
        if (totalAcumulado > limite25pct) {
          return NextResponse.json({
            erro: `Suplementação excede 25% da dotação original (limite: R$ ${limite25pct.toFixed(2)}). Exige lei específica.`,
          }, { status: 422 })
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.suplemento.create({
          data: {
            municipioId:   ctx.municipioId,
            orcamentoId:   dados.orcamentoId,
            dotacaoId:     dados.dotacaoId,
            tipo:          dados.tipoSuplemento,
            valor:         dados.valor,
            decreto:       dados.decreto,
            dataDecreto:   dados.dataDecreto ? new Date(dados.dataDecreto) : undefined,
            justificativa: dados.justificativa,
            usuarioId:     ctx.usuarioId,
          },
        })
        await tx.dotacao.update({
          where: { id: dados.dotacaoId },
          data: { valorAtual: { increment: dados.valor } },
        })
      })

      return NextResponse.json({ mensagem: `Dotação ${dados.tipoSuplemento === 'SUPLEMENTACAO' ? 'suplementada' : 'alterada'} em R$ ${Math.abs(dados.valor).toFixed(2)}` })
    }

    return NextResponse.json({ erro: 'Tipo inválido' }, { status: 400 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[SEFIN/ORCAMENTO/POST]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'sefin:orcamento:update')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const { id, acao, leiNumero, leiData } = await request.json()
    if (!id || !acao) return NextResponse.json({ erro: 'id e acao obrigatórios' }, { status: 400 })

    const orc = await prisma.orcamento.findFirst({ where: { id, municipioId: ctx.municipioId } })
    if (!orc) return NextResponse.json({ erro: 'Orçamento não encontrado' }, { status: 404 })

    const TRANSICOES: Record<string, string> = {
      ENVIAR_PL: 'APROVADO_PL',
      APROVAR:   'VIGENTE',
      ENCERRAR:  'ENCERRADO',
    }
    if (!TRANSICOES[acao]) return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })

    const atualizado = await prisma.orcamento.update({
      where: { id },
      data: {
        situacao:  TRANSICOES[acao] as any,
        ...(leiNumero && { leiNumero }),
        ...(leiData   && { leiData: new Date(leiData) }),
      },
    })

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId:   ctx.usuarioId,
      acao: 'UPDATE', modulo: 'sefin', recurso: 'orcamento',
      registroId: id,
      dadosNovos: { situacao: atualizado.situacao, exercicio: orc.exercicio },
    })

    return NextResponse.json({ orcamento: atualizado })
  } catch (error) {
    console.error('[SEFIN/ORCAMENTO/PATCH]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
