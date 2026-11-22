// @ts-nocheck
// Gestão de Empenhos — três estágios da despesa (Lei 4.320/64)
// GET    — listar empenhos com filtros / buscar individual
// POST   — emitir novo empenho
// PATCH  — liquidar / pagar / anular (parcial ou total)

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { extrairContextoRequest, temPermissao } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const EmitirSchema = z.object({
  dotacaoId:       z.string(),
  modalidade:      z.enum(['ORDINARIO','ESTIMATIVA','GLOBAL']).default('ORDINARIO'),
  credorNome:      z.string().min(3),
  credorCpfCnpj:   z.string().min(11),
  credorBanco:     z.string().optional(),
  credorAgencia:   z.string().optional(),
  credorConta:     z.string().optional(),
  credorPix:       z.string().optional(),
  valorOriginal:   z.number().positive(),
  contratoNumero:  z.string().optional(),
  licitacaoNumero: z.string().optional(),
  processoNumero:  z.string().optional(),
  notaFiscal:      z.string().optional(),
  descricao:       z.string().min(10),
  dataVencimento:  z.string().optional(),
  competencia:     z.string().regex(/^\d{4}-\d{2}$/),
  observacoes:     z.string().optional(),
})

const TramitarSchema = z.object({
  id:          z.string(),
  acao:        z.enum(['LIQUIDAR','PAGAR','ANULAR']),
  valor:       z.number().positive(),
  tipo:        z.enum(['TOTAL','PARCIAL']).optional(),
  // Liquidação
  notaFiscal:  z.string().optional(),
  dataDocumento: z.string().optional(),
  descricao:   z.string().optional(),
  // Pagamento
  tipoPagamento: z.enum(['TRANSFERENCIA_BANCARIA','BOLETO','CHEQUE','DINHEIRO','PIX']).optional(),
  autenticacao:  z.string().optional(),
  // Anulação
  motivoAnulacao: z.string().optional(),
})

// ─── Gerar número sequencial ──────────────────────────────────────────────────

async function gerarNumeroEmpenho(municipioId: string, competencia: string): Promise<string> {
  const ano   = competencia.split('-')[0]
  const count = await prisma.empenho.count({ where: { municipioId, competencia: { startsWith: ano } } })
  return `EMP-${ano}-${String(count + 1).padStart(5, '0')}`
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'sefin:empenho:read')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const id          = searchParams.get('id')
    const competencia = searchParams.get('competencia')
    const situacao    = searchParams.get('situacao')
    const busca       = searchParams.get('busca')
    const dotacaoId   = searchParams.get('dotacaoId')
    const pagina      = Number(searchParams.get('pagina') ?? 1)
    const porPagina   = Math.min(Number(searchParams.get('porPagina') ?? 20), 100)

    // Busca individual com histórico completo
    if (id) {
      const empenho = await prisma.empenho.findFirst({
        where: { id, municipioId: ctx.municipioId },
        include: {
          dotacao: { select: { codigo: true, descricao: true, secretaria: true, natureza: true } },
          liquidacoes: { orderBy: { criadoEm: 'asc' } },
          pagamentos:  { orderBy: { dataPagamento: 'asc' } },
        },
      })
      if (!empenho) return NextResponse.json({ erro: 'Empenho não encontrado' }, { status: 404 })
      return NextResponse.json({ empenho })
    }

    const where: any = {
      municipioId: ctx.municipioId,
      ...(situacao    && { situacao }),
      ...(competencia && { competencia }),
      ...(dotacaoId   && { dotacaoId }),
      ...(busca && {
        OR: [
          { numero:       { contains: busca } },
          { credorNome:   { contains: busca } },
          { credorCpfCnpj:{ contains: busca } },
          { contratoNumero:{ contains: busca } },
          { processoNumero:{ contains: busca } },
        ],
      }),
    }

    const [empenhos, total] = await Promise.all([
      prisma.empenho.findMany({
        where,
        select: {
          id: true, numero: true, situacao: true, modalidade: true,
          credorNome: true, credorCpfCnpj: true,
          valorOriginal: true, valorLiquidado: true, valorPago: true, valorAnulado: true,
          competencia: true, dataEmissao: true, dataVencimento: true,
          descricao: true, contratoNumero: true, processoNumero: true,
          dotacao: { select: { codigo: true, descricao: true, secretaria: true } },
        },
        orderBy: { dataEmissao: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
      prisma.empenho.count({ where }),
    ])

    // Totalizadores para o painel
    const totais = await prisma.empenho.aggregate({
      where: { municipioId: ctx.municipioId, ...(competencia && { competencia }) },
      _sum: { valorOriginal: true, valorLiquidado: true, valorPago: true },
      _count: { id: true },
    })

    const porSituacao = await prisma.empenho.groupBy({
      by: ['situacao'],
      where: { municipioId: ctx.municipioId, ...(competencia && { competencia }) },
      _sum: { valorOriginal: true },
      _count: { id: true },
    })

    return NextResponse.json({
      empenhos,
      total,
      pagina,
      porPagina,
      totalPaginas: Math.ceil(total / porPagina),
      resumo: {
        totalEmitido:    Number(totais._sum.valorOriginal  ?? 0),
        totalLiquidado:  Number(totais._sum.valorLiquidado ?? 0),
        totalPago:       Number(totais._sum.valorPago      ?? 0),
        totalEmpenhos:   totais._count.id,
        porSituacao: porSituacao.map(s => ({
          situacao: s.situacao,
          total:    s._count.id,
          valor:    Number(s._sum.valorOriginal ?? 0),
        })),
      },
    })
  } catch (error) {
    console.error('[SEFIN/EMPENHO/GET]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// ─── POST — Emitir empenho ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'sefin:empenho:create')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const dados = EmitirSchema.parse(await request.json())

    // Verificar dotação
    const dotacao = await prisma.dotacao.findFirst({
      where: { id: dados.dotacaoId, municipioId: ctx.municipioId, ativo: true },
      include: { orcamento: { select: { exercicio: true, situacao: true } } },
    })
    if (!dotacao) return NextResponse.json({ erro: 'Dotação não encontrada' }, { status: 404 })
    if (dotacao.orcamento.situacao !== 'VIGENTE') {
      return NextResponse.json({ erro: 'Orçamento não está vigente' }, { status: 422 })
    }

    // Verificar saldo disponível
    const saldoDisponivel = Number(dotacao.valorAtual) - Number(dotacao.valorEmpenhado)
    if (dados.valorOriginal > saldoDisponivel) {
      return NextResponse.json({
        erro: `Saldo insuficiente. Disponível: R$ ${saldoDisponivel.toFixed(2)}`,
      }, { status: 422 })
    }

    const numero = await gerarNumeroEmpenho(ctx.municipioId, dados.competencia)

    const empenho = await prisma.$transaction(async (tx) => {
      const e = await tx.empenho.create({
        data: {
          municipioId:     ctx.municipioId,
          numero,
          dotacaoId:       dados.dotacaoId,
          modalidade:      dados.modalidade,
          credorNome:      dados.credorNome,
          credorCpfCnpj:   dados.credorCpfCnpj,
          credorBanco:     dados.credorBanco,
          credorAgencia:   dados.credorAgencia,
          credorConta:     dados.credorConta,
          credorPix:       dados.credorPix,
          valorOriginal:   dados.valorOriginal,
          contratoNumero:  dados.contratoNumero,
          licitacaoNumero: dados.licitacaoNumero,
          processoNumero:  dados.processoNumero,
          notaFiscal:      dados.notaFiscal,
          descricao:       dados.descricao,
          dataVencimento:  dados.dataVencimento ? new Date(dados.dataVencimento) : undefined,
          competencia:     dados.competencia,
          observacoes:     dados.observacoes,
          usuarioId:       ctx.usuarioId,
        },
      })

      // Atualizar saldo da dotação
      await tx.dotacao.update({
        where: { id: dados.dotacaoId },
        data: { valorEmpenhado: { increment: dados.valorOriginal } },
      })

      return e
    })

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId:   ctx.usuarioId,
      acao: 'CREATE', modulo: 'sefin', recurso: 'empenho',
      registroId: empenho.id,
      dadosNovos: { numero, credor: dados.credorNome, valor: dados.valorOriginal, competencia: dados.competencia },
    })

    return NextResponse.json({ empenho: { id: empenho.id, numero }, mensagem: `Empenho ${numero} emitido` }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[SEFIN/EMPENHO/POST]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// ─── PATCH — Liquidar / Pagar / Anular ───────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'sefin:empenho:update')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const dados = TramitarSchema.parse(await request.json())

    const empenho = await prisma.empenho.findFirst({
      where: { id: dados.id, municipioId: ctx.municipioId },
    })
    if (!empenho) return NextResponse.json({ erro: 'Empenho não encontrado' }, { status: 404 })
    if (empenho.situacao === 'ANULADO') {
      return NextResponse.json({ erro: 'Empenho anulado não pode ser alterado' }, { status: 422 })
    }

    const dadosAntigos = { situacao: empenho.situacao, valorPago: empenho.valorPago }

    if (dados.acao === 'LIQUIDAR') {
      const saldoALiquidar = Number(empenho.valorOriginal) - Number(empenho.valorLiquidado) - Number(empenho.valorAnulado)
      if (dados.valor > saldoALiquidar) {
        return NextResponse.json({ erro: `Valor excede o saldo a liquidar (R$ ${saldoALiquidar.toFixed(2)})` }, { status: 422 })
      }
      await prisma.$transaction(async (tx) => {
        await tx.liquidacao.create({
          data: {
            municipioId:    ctx.municipioId,
            empenhoId:      dados.id,
            tipo:           dados.tipo ?? (dados.valor === saldoALiquidar ? 'TOTAL' : 'PARCIAL'),
            valor:          dados.valor,
            notaFiscal:     dados.notaFiscal,
            dataDocumento:  dados.dataDocumento ? new Date(dados.dataDocumento) : undefined,
            descricao:      dados.descricao,
            usuarioId:      ctx.usuarioId,
          },
        })
        const novoLiquidado = Number(empenho.valorLiquidado) + dados.valor
        await tx.empenho.update({
          where: { id: dados.id },
          data: {
            valorLiquidado: novoLiquidado,
            situacao: novoLiquidado >= Number(empenho.valorOriginal) - Number(empenho.valorAnulado)
              ? 'LIQUIDADO' : 'EMITIDO',
          },
        })
        await tx.dotacao.update({
          where: { id: empenho.dotacaoId },
          data: { valorLiquidado: { increment: dados.valor } },
        })
      })
    }

    if (dados.acao === 'PAGAR') {
      const saldoAPagar = Number(empenho.valorLiquidado) - Number(empenho.valorPago)
      if (dados.valor > saldoAPagar) {
        return NextResponse.json({ erro: `Valor excede o saldo a pagar (R$ ${saldoAPagar.toFixed(2)})` }, { status: 422 })
      }
      await prisma.$transaction(async (tx) => {
        await tx.pagamento.create({
          data: {
            municipioId:   ctx.municipioId,
            empenhoId:     dados.id,
            valor:         dados.valor,
            tipo:          dados.tipoPagamento ?? 'TRANSFERENCIA_BANCARIA',
            autenticacao:  dados.autenticacao,
            descricao:     dados.descricao,
            usuarioId:     ctx.usuarioId,
          },
        })
        const novoPago = Number(empenho.valorPago) + dados.valor
        await tx.empenho.update({
          where: { id: dados.id },
          data: {
            valorPago: novoPago,
            situacao: novoPago >= Number(empenho.valorLiquidado) ? 'PAGO' : 'LIQUIDADO',
          },
        })
        await tx.dotacao.update({
          where: { id: empenho.dotacaoId },
          data: { valorPago: { increment: dados.valor } },
        })
      })
    }

    if (dados.acao === 'ANULAR') {
      const saldoAnular = Number(empenho.valorOriginal) - Number(empenho.valorPago) - Number(empenho.valorAnulado)
      if (dados.valor > saldoAnular) {
        return NextResponse.json({ erro: `Valor de anulação excede o saldo disponível (R$ ${saldoAnular.toFixed(2)})` }, { status: 422 })
      }
      await prisma.$transaction(async (tx) => {
        const novoAnulado = Number(empenho.valorAnulado) + dados.valor
        await tx.empenho.update({
          where: { id: dados.id },
          data: {
            valorAnulado: novoAnulado,
            observacoes:  `${empenho.observacoes ?? ''}\n[ANULAÇÃO R$ ${dados.valor.toFixed(2)}] ${dados.motivoAnulacao ?? ''}`.trim(),
            situacao: novoAnulado >= Number(empenho.valorOriginal) ? 'ANULADO' : empenho.situacao,
          },
        })
        // Estornar saldo da dotação
        await tx.dotacao.update({
          where: { id: empenho.dotacaoId },
          data: { valorEmpenhado: { decrement: dados.valor } },
        })
      })
    }

    const atualizado = await prisma.empenho.findUnique({ where: { id: dados.id } })

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId:   ctx.usuarioId,
      acao: 'UPDATE', modulo: 'sefin', recurso: 'empenho',
      registroId: dados.id,
      dadosAntigos,
      dadosNovos: { acao: dados.acao, valor: dados.valor, situacao: atualizado?.situacao },
    })

    return NextResponse.json({ empenho: atualizado })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[SEFIN/EMPENHO/PATCH]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
