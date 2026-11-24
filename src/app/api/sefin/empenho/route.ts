// @ts-nocheck
// Gestão de Empenhos - três estágios da despesa (Lei 4.320/64)
// GET    - listar empenhos com filtros / buscar individual
// POST   - emitir novo empenho
// PATCH  - liquidar / pagar / anular (parcial ou total)

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
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
  const count = await prisma.Empenho.count({ where: { municipioId, competencia: { startsWith: ano } } })
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

    const pool = (prisma as any)._pool ?? (prisma as any).__pool
    // Busca individual com histórico completo
    if (id) {
      const rows = await prisma.$queryRaw`
        SELECT e.*, d.codigo as dotCodigo, d.descricao as dotDescricao, d.secretaria as dotSecretaria, d.natureza as dotNatureza
        FROM Empenho e
        LEFT JOIN Dotacao d ON d.id = e.dotacaoId
        WHERE e.id = ${id} AND e.municipioId = ${ctx.municipioId}
        LIMIT 1
      ` as any[]
      if (!rows.length) return NextResponse.json({ erro: 'Empenho não encontrado' }, { status: 404 })
      const e = rows[0]
      const liquidacoes = await prisma.$queryRaw`SELECT * FROM Liquidacao WHERE empenhoId = ${id} ORDER BY criadoEm ASC` as any[]
      const pagamentos  = await prisma.$queryRaw`SELECT * FROM Pagamento  WHERE empenhoId = ${id} ORDER BY dataPagamento ASC` as any[]
      return NextResponse.json({ empenho: { ...e, dotacao: { codigo: e.dotCodigo, descricao: e.dotDescricao, secretaria: e.dotSecretaria, natureza: e.dotNatureza }, liquidacoes, pagamentos } })
    }

    // Construir filtros
    const filtros: string[] = ['e.municipioId = ?']
    const params: any[] = [ctx.municipioId]
    if (situacao)    { filtros.push('e.situacao = ?');    params.push(situacao) }
    if (competencia) { filtros.push('e.competencia = ?'); params.push(competencia) }
    if (dotacaoId)   { filtros.push('e.dotacaoId = ?');   params.push(dotacaoId) }
    if (busca) {
      filtros.push('(e.numero LIKE ? OR e.credorNome LIKE ? OR e.credorCpfCnpj LIKE ? OR e.contratoNumero LIKE ? OR e.processoNumero LIKE ?)')
      const b = `%${busca}%`
      params.push(b, b, b, b, b)
    }

    const whereClause = filtros.join(' AND ')
    const offset = (pagina - 1) * porPagina

    // Usar getPool via db.$queryRaw com template literal manual
    const { getConn } = await import('@/lib/db')
    const conn = await getConn()
    try {
      const [empenhos] = await conn.execute(`
        SELECT e.id, e.numero, e.situacao, e.modalidade, e.credorNome, e.credorCpfCnpj,
               e.valorOriginal, e.valorLiquidado, e.valorPago, e.valorAnulado,
               e.competencia, e.dataEmissao, e.dataVencimento, e.descricao,
               e.contratoNumero, e.processoNumero,
               d.codigo as dotCodigo, d.descricao as dotDescricao, d.secretaria as dotSecretaria
        FROM Empenho e
        LEFT JOIN Dotacao d ON d.id = e.dotacaoId
        WHERE ${whereClause}
        ORDER BY e.dataEmissao DESC
        LIMIT ? OFFSET ?
      `, [...params, porPagina, offset]) as any[]

      const [totalRows] = await conn.execute(
        `SELECT COUNT(*) as n FROM Empenho e WHERE ${whereClause}`, params
      ) as any[]
      const total = Number((totalRows as any[])[0]?.n ?? 0)

      // Totalizadores
      const baseParams2: any[] = [ctx.municipioId]
      let filtroBase2 = 'municipioId = ?'
      if (competencia) { filtroBase2 += ' AND competencia = ?'; baseParams2.push(competencia) }

      const [totaisRows] = await conn.execute(`
        SELECT SUM(valorOriginal) as somaOriginal, SUM(valorLiquidado) as somaLiquidado,
               SUM(valorPago) as somaPago, COUNT(*) as total
        FROM Empenho WHERE ${filtroBase2}
      `, baseParams2) as any[]

      const [porSitRows] = await conn.execute(`
        SELECT situacao, COUNT(*) as qtd, SUM(valorOriginal) as soma
        FROM Empenho WHERE ${filtroBase2} GROUP BY situacao
      `, baseParams2) as any[]

      const t = (totaisRows as any[])[0] ?? {}
      return NextResponse.json({
        empenhos: (empenhos as any[]).map((e: any) => ({
          ...e,
          dotacao: { codigo: e.dotCodigo, descricao: e.dotDescricao, secretaria: e.dotSecretaria },
        })),
        total,
        pagina,
        porPagina,
        totalPaginas: Math.ceil(total / porPagina),
        resumo: {
          totalEmitido:    Number(t.somaOriginal   ?? 0),
          totalLiquidado:  Number(t.somaLiquidado  ?? 0),
          totalPago:       Number(t.somaPago        ?? 0),
          totalEmpenhos:   Number(t.total           ?? 0),
          porSituacao: (porSitRows as any[]).map((s: any) => ({
            situacao: s.situacao,
            total:    Number(s.qtd),
            valor:    Number(s.soma ?? 0),
          })),
        },
      })
    } finally {
      await conn.end()
    }
  } catch (error) {
    console.error('[SEFIN/EMPENHO/GET]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// ─── POST - Emitir empenho ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'sefin:empenho:create')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const dados = EmitirSchema.parse(await request.json())

    // Verificar dotação
    const dotacaoRows = await prisma.$queryRaw`
      SELECT d.*, o.situacao as orcSituacao, o.exercicio as orcExercicio
      FROM Dotacao d
      LEFT JOIN OrcamentoUnidade o ON o.id = d.orcamentoId
      WHERE d.id = ${dados.dotacaoId} AND d.municipioId = ${ctx.municipioId}
      LIMIT 1
    ` as any[]
    const dotacao = dotacaoRows[0]
    if (!dotacao) return NextResponse.json({ erro: 'Dotação não encontrada' }, { status: 404 })
    // Se orcamento não for vigente e existir
    if (dotacao.orcSituacao && dotacao.orcSituacao !== 'VIGENTE') {
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
      const e = await tx.Empenho.create({
        data: {
          id:              randomUUID(),
          criadoEm:        new Date(),
          atualizadoEm:    new Date(),
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
      await tx.Dotacao.update({
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

// ─── PATCH - Liquidar / Pagar / Anular ───────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'sefin:empenho:update')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const dados = TramitarSchema.parse(await request.json())

    const empenho = await prisma.Empenho.findFirst({
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
        await tx.Liquidacao.create({
          data: {
            id:             randomUUID(),
            criadoEm:       new Date(),
            atualizadoEm:   new Date(),
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
        await tx.Empenho.update({
          where: { id: dados.id },
          data: {
            valorLiquidado: novoLiquidado,
            situacao: novoLiquidado >= Number(empenho.valorOriginal) - Number(empenho.valorAnulado)
              ? 'LIQUIDADO' : 'EMITIDO',
          },
        })
        await tx.Dotacao.update({
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
        await tx.Pagamento.create({
          data: {
            id:            randomUUID(),
            criadoEm:      new Date(),
            atualizadoEm:  new Date(),
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
        await tx.Empenho.update({
          where: { id: dados.id },
          data: {
            valorPago: novoPago,
            situacao: novoPago >= Number(empenho.valorLiquidado) ? 'PAGO' : 'LIQUIDADO',
          },
        })
        await tx.Dotacao.update({
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
        await tx.Empenho.update({
          where: { id: dados.id },
          data: {
            valorAnulado: novoAnulado,
            observacoes:  `${empenho.observacoes ?? ''}\n[ANULAÇÃO R$ ${dados.valor.toFixed(2)}] ${dados.motivoAnulacao ?? ''}`.trim(),
            situacao: novoAnulado >= Number(empenho.valorOriginal) ? 'ANULADO' : empenho.situacao,
          },
        })
        // Estornar saldo da dotação
        await tx.Dotacao.update({
          where: { id: empenho.dotacaoId },
          data: { valorEmpenhado: { decrement: dados.valor } },
        })
      })
    }

    const atualizado = await prisma.Empenho.findUnique({ where: { id: dados.id } })

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
