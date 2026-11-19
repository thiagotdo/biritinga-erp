// Gestão de Contratos — Lei 14.133/2021
// GET    — listar / detalhar com aditivos e medições
// POST   — criar contrato / registrar aditivo / registrar medição
// PATCH  — transição de situação / ateste de medição

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { extrairContextoRequest, temPermissao } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const ContratoSchema = z.object({
  licitacaoId:         z.string().optional(),
  contratadoNome:      z.string().min(3),
  contratadoCnpj:      z.string().min(14),
  contratadoEmail:     z.string().email().optional(),
  contratadoTelefone:  z.string().optional(),
  objeto:              z.string().min(10),
  valorInicial:        z.number().positive(),
  dataAssinatura:      z.string().optional(),
  dataVigenciaInicio:  z.string().optional(),
  dataVigenciaFim:     z.string().optional(),
  fiscalNome:          z.string().optional(),
  fiscalMatricula:     z.string().optional(),
  garantiaTipo:        z.enum(['CAUCAO_DINHEIRO','TITULO_CREDITO','SEGURO_GARANTIA','FIANCA_BANCARIA']).optional(),
  garantiaValor:       z.number().optional(),
  garantiaVencimento:  z.string().optional(),
  processoNumero:      z.string().optional(),
  empenhoId:           z.string().optional(),
  fundamentoLegal:     z.string().optional(),
  observacoes:         z.string().optional(),
})

const AditivoSchema = z.object({
  contratoId:          z.string(),
  numero:              z.string(),
  tipo:                z.enum(['PRAZO','VALOR','PRAZO_E_VALOR','OBJETO','SUBCONTRATACAO','CESSAO']),
  dataAssinatura:      z.string(),
  motivoJustificativa: z.string().min(10),
  novaDataFim:         z.string().optional(),
  valorAcrescimo:      z.number().optional(),   // positivo=acréscimo, negativo=decréscimo
})

const MedicaoSchema = z.object({
  contratoId:          z.string(),
  numero:              z.number().int().positive(),
  periodo:             z.string().regex(/^\d{4}-\d{2}$/),
  descricao:           z.string().min(5),
  valorMedicao:        z.number().positive(),
  empenhoId:           z.string().optional(),
  observacoes:         z.string().optional(),
})

// ─── Gerar número sequencial ──────────────────────────────────────────────────

async function gerarNumeroContrato(municipioId: string): Promise<string> {
  const ano   = new Date().getFullYear()
  const count = await prisma.contrato.count({ where: { municipioId, numero: { startsWith: `CONT-${ano}` } } })
  return `CONT-${ano}-${String(count + 1).padStart(3, '0')}`
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'semad:contrato:read')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const id        = searchParams.get('id')
    const situacao  = searchParams.get('situacao')
    const busca     = searchParams.get('busca')
    const vencendo  = searchParams.get('vencendo') === 'true'  // contratos próximos do vencimento
    const pagina    = Number(searchParams.get('pagina') ?? 1)
    const porPagina = Math.min(Number(searchParams.get('porPagina') ?? 20), 100)

    if (id) {
      const contrato = await prisma.contrato.findFirst({
        where: { id, municipioId: ctx.municipioId },
        include: {
          licitacao:  { select: { numero: true, modalidade: true, objeto: true } },
          aditivos:   { orderBy: { dataAssinatura: 'asc' } },
          medicoes:   { orderBy: { numero: 'asc' } },
        },
      })
      if (!contrato) return NextResponse.json({ erro: 'Contrato não encontrado' }, { status: 404 })
      return NextResponse.json({ contrato })
    }

    const hoje = new Date()
    const em60dias = new Date(hoje.getTime() + 60 * 24 * 60 * 60 * 1000)

    const where: any = {
      municipioId: ctx.municipioId,
      ...(situacao && { situacao }),
      ...(vencendo && {
        dataVigenciaFim: { gte: hoje, lte: em60dias },
        situacao: { in: ['ASSINADO','EM_EXECUCAO'] },
      }),
      ...(busca && {
        OR: [
          { numero:          { contains: busca } },
          { objeto:          { contains: busca } },
          { contratadoNome:  { contains: busca } },
          { contratadoCnpj:  { contains: busca } },
          { processoNumero:  { contains: busca } },
        ],
      }),
    }

    const [contratos, total] = await Promise.all([
      prisma.contrato.findMany({
        where,
        select: {
          id: true, numero: true, situacao: true,
          contratadoNome: true, contratadoCnpj: true,
          objeto: true, valorInicial: true, valorAtual: true,
          dataAssinatura: true, dataVigenciaInicio: true, dataVigenciaFim: true,
          fiscalNome: true, processoNumero: true, percentualAcrescimo: true,
          licitacao: { select: { numero: true, modalidade: true } },
          _count: { select: { aditivos: true, medicoes: true } },
        },
        orderBy: { criadoEm: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
      prisma.contrato.count({ where }),
    ])

    // KPIs
    const totais = await prisma.contrato.aggregate({
      where: { municipioId: ctx.municipioId, situacao: { in: ['ASSINADO','EM_EXECUCAO'] } },
      _sum:   { valorAtual: true },
      _count: { id: true },
    })

    const vencendoCount = await prisma.contrato.count({
      where: {
        municipioId:     ctx.municipioId,
        dataVigenciaFim: { gte: hoje, lte: em60dias },
        situacao:        { in: ['ASSINADO','EM_EXECUCAO'] },
      },
    })

    const porSituacao = await prisma.contrato.groupBy({
      by: ['situacao'],
      where: { municipioId: ctx.municipioId },
      _count: { id: true },
      _sum:   { valorAtual: true },
    })

    return NextResponse.json({
      contratos,
      total,
      pagina,
      porPagina,
      totalPaginas: Math.ceil(total / porPagina),
      resumo: {
        totalVigentes:    totais._count.id,
        valorTotalVigente:Number(totais._sum.valorAtual ?? 0),
        vencendoEm60Dias: vencendoCount,
        porSituacao: porSituacao.map(s => ({
          situacao: s.situacao,
          total:    s._count.id,
          valor:    Number(s._sum.valorAtual ?? 0),
        })),
      },
    })
  } catch (error) {
    console.error('[SEMAD/CONTRATO/GET]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'semad:contrato:create')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()

    // ── Novo contrato ──────────────────────────────────────────────────────────
    if (body.tipo === 'CONTRATO') {
      const dados = ContratoSchema.parse(body)
      const numero = await gerarNumeroContrato(ctx.municipioId)

      const contrato = await prisma.contrato.create({
        data: {
          municipioId:        ctx.municipioId,
          numero,
          licitacaoId:        dados.licitacaoId,
          contratadoNome:     dados.contratadoNome,
          contratadoCnpj:     dados.contratadoCnpj,
          contratadoEmail:    dados.contratadoEmail,
          contratadoTelefone: dados.contratadoTelefone,
          objeto:             dados.objeto,
          valorInicial:       dados.valorInicial,
          valorAtual:         dados.valorInicial,
          dataAssinatura:     dados.dataAssinatura     ? new Date(dados.dataAssinatura)    : undefined,
          dataVigenciaInicio: dados.dataVigenciaInicio ? new Date(dados.dataVigenciaInicio): undefined,
          dataVigenciaFim:    dados.dataVigenciaFim    ? new Date(dados.dataVigenciaFim)   : undefined,
          fiscalNome:         dados.fiscalNome,
          fiscalMatricula:    dados.fiscalMatricula,
          garantiaTipo:       dados.garantiaTipo,
          garantiaValor:      dados.garantiaValor,
          garantiaVencimento: dados.garantiaVencimento ? new Date(dados.garantiaVencimento): undefined,
          processoNumero:     dados.processoNumero,
          empenhoId:          dados.empenhoId,
          fundamentoLegal:    dados.fundamentoLegal,
          observacoes:        dados.observacoes,
          usuarioId:          ctx.usuarioId,
          situacao:           dados.dataAssinatura ? 'ASSINADO' : 'MINUTA',
        },
      })

      // Atualizar licitação para CONTRATADA se vinculada
      if (dados.licitacaoId) {
        await prisma.licitacao.updateMany({
          where: { id: dados.licitacaoId, municipioId: ctx.municipioId },
          data: { situacao: 'CONTRATADA' },
        })
      }

      await auditLog({
        municipioId: ctx.municipioId, usuarioId: ctx.usuarioId,
        acao: 'CREATE', modulo: 'semad', recurso: 'contrato', registroId: contrato.id,
        dadosNovos: { numero, contratado: dados.contratadoNome, valor: dados.valorInicial },
      })

      return NextResponse.json({ contrato: { id: contrato.id, numero } }, { status: 201 })
    }

    // ── Novo aditivo ───────────────────────────────────────────────────────────
    if (body.tipo === 'ADITIVO') {
      if (!temPermissao(ctx, 'semad:contrato:update')) {
        return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
      }
      const dados = AditivoSchema.parse(body)

      const contrato = await prisma.contrato.findFirst({
        where: { id: dados.contratoId, municipioId: ctx.municipioId },
        include: { _count: { select: { aditivos: true } } },
      })
      if (!contrato) return NextResponse.json({ erro: 'Contrato não encontrado' }, { status: 404 })
      if (['RESCINDIDO','CONCLUIDO','EXPIRADO'].includes(contrato.situacao)) {
        return NextResponse.json({ erro: 'Não é possível aditivo em contrato encerrado' }, { status: 422 })
      }

      // Verificar limite legal: 25% (obras/serv) ou 50% (compras) — Art. 125 Lei 14.133
      if (dados.valorAcrescimo && dados.valorAcrescimo > 0) {
        const totalAditivosAnteriores = await prisma.aditivoContrato.aggregate({
          where: { contratoId: dados.contratoId, valorAcrescimo: { gt: 0 } },
          _sum: { valorAcrescimo: true },
        })
        const totalAcumulado = Number(totalAditivosAnteriores._sum.valorAcrescimo ?? 0) + dados.valorAcrescimo
        const limite25pct = Number(contrato.valorInicial) * 0.25
        const percAcum = (totalAcumulado / Number(contrato.valorInicial)) * 100

        if (percAcum > 50) {
          return NextResponse.json({
            erro: `Acréscimo excede 50% do valor original (R$ ${Number(contrato.valorInicial).toFixed(2)}). Exige novo processo licitatório.`,
          }, { status: 422 })
        }
      }

      const aditivo = await prisma.$transaction(async (tx) => {
        const ad = await tx.aditivoContrato.create({
          data: {
            municipioId:         ctx.municipioId,
            contratoId:          dados.contratoId,
            numero:              dados.numero,
            tipo:                dados.tipo,
            dataAssinatura:      new Date(dados.dataAssinatura),
            motivoJustificativa: dados.motivoJustificativa,
            novaDataFim:         dados.novaDataFim ? new Date(dados.novaDataFim) : undefined,
            valorAcrescimo:      dados.valorAcrescimo,
            percentualSobreOriginal: dados.valorAcrescimo
              ? (dados.valorAcrescimo / Number(contrato.valorInicial)) * 100
              : undefined,
            usuarioId: ctx.usuarioId,
          },
        })

        // Atualizar contrato
        const updateData: Record<string, any> = {}
        if (dados.novaDataFim) updateData.dataVigenciaFim = new Date(dados.novaDataFim)
        if (dados.valorAcrescimo) {
          updateData.valorAtual = { increment: dados.valorAcrescimo }
          updateData.percentualAcrescimo = {
            increment: (dados.valorAcrescimo / Number(contrato.valorInicial)) * 100,
          }
        }
        if (Object.keys(updateData).length > 0) {
          await tx.contrato.update({ where: { id: dados.contratoId }, data: updateData })
        }

        return ad
      })

      return NextResponse.json({ aditivo }, { status: 201 })
    }

    // ── Nova medição ───────────────────────────────────────────────────────────
    if (body.tipo === 'MEDICAO') {
      const dados = MedicaoSchema.parse(body)
      const contrato = await prisma.contrato.findFirst({
        where: { id: dados.contratoId, municipioId: ctx.municipioId },
      })
      if (!contrato) return NextResponse.json({ erro: 'Contrato não encontrado' }, { status: 404 })

      const medicao = await prisma.medicaoContrato.create({
        data: {
          municipioId:  ctx.municipioId,
          contratoId:   dados.contratoId,
          numero:       dados.numero,
          periodo:      dados.periodo,
          descricao:    dados.descricao,
          valorMedicao: dados.valorMedicao,
          empenhoId:    dados.empenhoId,
          observacoes:  dados.observacoes,
          usuarioId:    ctx.usuarioId,
        },
      })
      return NextResponse.json({ medicao }, { status: 201 })
    }

    return NextResponse.json({ erro: 'tipo inválido. Use: CONTRATO, ADITIVO, MEDICAO' }, { status: 400 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[SEMAD/CONTRATO/POST]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// ─── PATCH — transições e ateste de medição ───────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'semad:contrato:update')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const { id, acao } = await request.json()
    if (!id || !acao) return NextResponse.json({ erro: 'id e acao obrigatórios' }, { status: 400 })

    // ── Ateste de medição (fiscal) ────────────────────────────────────────────
    if (acao === 'ATESTAR_MEDICAO') {
      const medicao = await prisma.medicaoContrato.findFirst({
        where: { id, municipioId: ctx.municipioId },
      })
      if (!medicao) return NextResponse.json({ erro: 'Medição não encontrada' }, { status: 404 })
      if (medicao.atestado) return NextResponse.json({ erro: 'Medição já atestada' }, { status: 422 })

      const atualizada = await prisma.medicaoContrato.update({
        where: { id },
        data: { atestado: true, dataAteste: new Date() },
      })
      return NextResponse.json({ medicao: atualizada })
    }

    // ── Transições de contrato ────────────────────────────────────────────────
    const TRANSICOES_CONTRATO: Record<string, string> = {
      INICIAR_EXECUCAO: 'EM_EXECUCAO',
      SUSPENDER:        'SUSPENSO',
      RETOMAR:          'EM_EXECUCAO',
      CONCLUIR:         'CONCLUIDO',
      RESCINDIR:        'RESCINDIDO',
    }

    const novoStatus = TRANSICOES_CONTRATO[acao]
    if (!novoStatus) return NextResponse.json({ erro: `Ação inválida: ${acao}` }, { status: 400 })

    const contrato = await prisma.contrato.findFirst({ where: { id, municipioId: ctx.municipioId } })
    if (!contrato) return NextResponse.json({ erro: 'Contrato não encontrado' }, { status: 404 })

    const atualizado = await prisma.contrato.update({
      where: { id },
      data: { situacao: novoStatus as any },
    })

    await auditLog({
      municipioId: ctx.municipioId, usuarioId: ctx.usuarioId,
      acao: 'UPDATE', modulo: 'semad', recurso: 'contrato', registroId: id,
      dadosAntigos: { situacao: contrato.situacao },
      dadosNovos:   { situacao: atualizado.situacao },
    })

    return NextResponse.json({ contrato: { id, situacao: atualizado.situacao } })
  } catch (error) {
    console.error('[SEMAD/CONTRATO/PATCH]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
