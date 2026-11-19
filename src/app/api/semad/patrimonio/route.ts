// Gestão do Patrimônio Municipal — MCASP / Ativo Imobilizado
// GET    — listar bens / detalhar / inventário / relatório depreciação
// POST   — cadastrar bem / registrar manutenção
// PATCH  — movimentar / baixar / tombamento / atualizar depreciação

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { extrairContextoRequest, temPermissao } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Taxas de depreciação por classificação (MCASP 10.ª ed.) ─────────────────

const TAXA_DEPRECIACAO: Record<string, number> = {
  BENS_MOVEIS_INFORMATICA:         0.20,  // 20% aa — vida útil 5 anos
  BENS_MOVEIS_MOVEIS_UTENSILIOS:   0.10,  // 10% aa — 10 anos
  BENS_MOVEIS_MAQUINAS_EQUIPAMENTOS:0.10, // 10% aa — 10 anos
  BENS_MOVEIS_VEICULOS:            0.20,  // 20% aa — 5 anos
  BENS_IMOVEIS_PREDIOS:            0.025, // 2,5% aa — 40 anos
  BENS_IMOVEIS_TERRENOS:           0,     // não deprecia
  BENS_IMOVEIS_OBRAS_ANDAMENTO:    0,     // não deprecia (enquanto em andamento)
  BENS_INTANGIVEIS_SOFTWARE:       0.20,  // 20% aa — 5 anos
  BENS_INTANGIVEIS_OUTROS:         0.10,  // 10% aa — 10 anos
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const BemSchema = z.object({
  classificacao: z.enum([
    'BENS_MOVEIS_INFORMATICA','BENS_MOVEIS_MOVEIS_UTENSILIOS','BENS_MOVEIS_MAQUINAS_EQUIPAMENTOS',
    'BENS_MOVEIS_VEICULOS','BENS_IMOVEIS_TERRENOS','BENS_IMOVEIS_PREDIOS',
    'BENS_IMOVEIS_OBRAS_ANDAMENTO','BENS_INTANGIVEIS_SOFTWARE','BENS_INTANGIVEIS_OUTROS',
  ]),
  descricao:        z.string().min(3),
  marca:            z.string().optional(),
  modelo:           z.string().optional(),
  serie:            z.string().optional(),
  cor:              z.string().optional(),
  especificacoes:   z.string().optional(),
  secretaria:       z.string().optional(),
  setor:            z.string().optional(),
  responsavel:      z.string().optional(),
  dataAquisicao:    z.string().optional(),
  fornecedorNome:   z.string().optional(),
  fornecedorCnpj:   z.string().optional(),
  notaFiscal:       z.string().optional(),
  processoNumero:   z.string().optional(),
  contratoId:       z.string().optional(),
  empenhoId:        z.string().optional(),
  valorAquisicao:   z.number().positive().optional(),
  vidaUtilAnos:     z.number().int().positive().optional(),
  garantiaVencimento:z.string().optional(),
  observacoes:      z.string().optional(),
})

const ManutencaoSchema = z.object({
  bemId:           z.string(),
  tipo:            z.enum(['PREVENTIVA','CORRETIVA','GARANTIA']),
  descricao:       z.string().min(5),
  fornecedorNome:  z.string().optional(),
  valorManutencao: z.number().positive().optional(),
  dataInicio:      z.string(),
  dataConclusao:   z.string().optional(),
  empenhoId:       z.string().optional(),
})

// ─── Gerar tombamento sequencial ──────────────────────────────────────────────

async function gerarTombamento(municipioId: string): Promise<string> {
  const count = await prisma.bemPatrimonial.count({ where: { municipioId } })
  return `PATRIM-${String(count + 1).padStart(5, '0')}`
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'semad:patrimonio:read')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const id             = searchParams.get('id')
    const relatorio      = searchParams.get('relatorio')
    const situacao       = searchParams.get('situacao')
    const classificacao  = searchParams.get('classificacao')
    const secretaria     = searchParams.get('secretaria')
    const busca          = searchParams.get('busca')
    const pagina         = Number(searchParams.get('pagina') ?? 1)
    const porPagina      = Math.min(Number(searchParams.get('porPagina') ?? 30), 100)

    // Detalhe de um bem
    if (id) {
      const bem = await prisma.bemPatrimonial.findFirst({
        where: { id, municipioId: ctx.municipioId },
        include: {
          movimentacoes: { orderBy: { criadoEm: 'desc' }, take: 10 },
          manutencoes:   { orderBy: { dataInicio: 'desc' } },
        },
      })
      if (!bem) return NextResponse.json({ erro: 'Bem não encontrado' }, { status: 404 })
      return NextResponse.json({ bem })
    }

    // Relatório de depreciação acumulada
    if (relatorio === 'DEPRECIACAO') {
      const bens = await prisma.bemPatrimonial.findMany({
        where: { municipioId: ctx.municipioId, ativo: true, valorAquisicao: { not: null } },
        select: {
          id: true, tombamento: true, descricao: true, classificacao: true,
          secretaria: true, valorAquisicao: true, valorAtual: true,
          dataAquisicao: true, taxaDepreciacao: true, dataUltimaDepreciacao: true,
        },
      })

      const linhas = bens.map(b => {
        const valorAq  = Number(b.valorAquisicao ?? 0)
        const valorAt  = Number(b.valorAtual ?? valorAq)
        const deprecAcum = valorAq - valorAt
        const percDeprec = valorAq > 0 ? (deprecAcum / valorAq) * 100 : 0
        return { ...b, deprecAcumulada: deprecAcum, percDepreciacao: percDeprec.toFixed(1) }
      })

      const totalAquisicao  = linhas.reduce((s, l) => s + Number(l.valorAquisicao ?? 0), 0)
      const totalAtual      = linhas.reduce((s, l) => s + Number(l.valorAtual ?? l.valorAquisicao ?? 0), 0)
      const totalDepreciacao = totalAquisicao - totalAtual

      return NextResponse.json({
        relatorio: 'DEPRECIACAO',
        bens: linhas,
        total: { totalAquisicao, totalAtual, totalDepreciacao },
      })
    }

    // Lista com filtros
    const where: any = {
      municipioId: ctx.municipioId,
      ativo: true,
      ...(situacao      && { situacao }),
      ...(classificacao && { classificacao }),
      ...(secretaria    && { secretaria }),
      ...(busca && {
        OR: [
          { tombamento:  { contains: busca } },
          { descricao:   { contains: busca } },
          { marca:       { contains: busca } },
          { modelo:      { contains: busca } },
          { serie:       { contains: busca } },
          { responsavel: { contains: busca } },
        ],
      }),
    }

    const [bens, total] = await Promise.all([
      prisma.bemPatrimonial.findMany({
        where,
        select: {
          id: true, tombamento: true, descricao: true, classificacao: true,
          situacao: true, marca: true, modelo: true, serie: true,
          secretaria: true, setor: true, responsavel: true,
          valorAquisicao: true, valorAtual: true, dataAquisicao: true,
          garantiaVencimento: true, proximaManutencao: true,
        },
        orderBy: [{ secretaria: 'asc' }, { tombamento: 'asc' }],
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
      prisma.bemPatrimonial.count({ where }),
    ])

    // KPIs
    const [totalBens, valorTotal, porClassificacao, porSituacao, porSecretaria] = await Promise.all([
      prisma.bemPatrimonial.count({ where: { municipioId: ctx.municipioId, ativo: true } }),
      prisma.bemPatrimonial.aggregate({
        where: { municipioId: ctx.municipioId, ativo: true },
        _sum: { valorAquisicao: true, valorAtual: true },
      }),
      prisma.bemPatrimonial.groupBy({
        by: ['classificacao'],
        where: { municipioId: ctx.municipioId, ativo: true },
        _count: { id: true },
        _sum:   { valorAtual: true },
      }),
      prisma.bemPatrimonial.groupBy({
        by: ['situacao'],
        where: { municipioId: ctx.municipioId, ativo: true },
        _count: { id: true },
      }),
      prisma.bemPatrimonial.groupBy({
        by: ['secretaria'],
        where: { municipioId: ctx.municipioId, ativo: true },
        _count: { id: true },
        _sum:   { valorAtual: true },
      }),
    ])

    return NextResponse.json({
      bens,
      total,
      pagina,
      porPagina,
      totalPaginas: Math.ceil(total / porPagina),
      resumo: {
        totalBens,
        valorAquisicao: Number(valorTotal._sum.valorAquisicao ?? 0),
        valorAtual:     Number(valorTotal._sum.valorAtual     ?? 0),
        porClassificacao: porClassificacao.map(c => ({
          classificacao: c.classificacao, total: c._count.id,
          valor: Number(c._sum.valorAtual ?? 0),
        })),
        porSituacao: porSituacao.map(s => ({ situacao: s.situacao, total: s._count.id })),
        porSecretaria: porSecretaria.map(s => ({
          secretaria: s.secretaria ?? '—', total: s._count.id,
          valor: Number(s._sum.valorAtual ?? 0),
        })),
      },
    })
  } catch (error) {
    console.error('[SEMAD/PATRIMONIO/GET]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'semad:patrimonio:create')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()

    if (body.tipo === 'BEM') {
      const dados = BemSchema.parse(body)
      const tombamento     = await gerarTombamento(ctx.municipioId)
      const taxaDepreciacao = TAXA_DEPRECIACAO[dados.classificacao] ?? 0

      const bem = await prisma.bemPatrimonial.create({
        data: {
          municipioId:       ctx.municipioId,
          tombamento,
          classificacao:     dados.classificacao,
          descricao:         dados.descricao,
          marca:             dados.marca,
          modelo:            dados.modelo,
          serie:             dados.serie,
          cor:               dados.cor,
          especificacoes:    dados.especificacoes,
          secretaria:        dados.secretaria,
          setor:             dados.setor,
          responsavel:       dados.responsavel,
          dataAquisicao:     dados.dataAquisicao     ? new Date(dados.dataAquisicao)    : undefined,
          fornecedorNome:    dados.fornecedorNome,
          fornecedorCnpj:    dados.fornecedorCnpj,
          notaFiscal:        dados.notaFiscal,
          processoNumero:    dados.processoNumero,
          contratoId:        dados.contratoId,
          empenhoId:         dados.empenhoId,
          valorAquisicao:    dados.valorAquisicao,
          valorAtual:        dados.valorAquisicao,   // começa sem depreciação
          taxaDepreciacao,
          vidaUtilAnos:      dados.vidaUtilAnos,
          garantiaVencimento:dados.garantiaVencimento ? new Date(dados.garantiaVencimento): undefined,
          observacoes:       dados.observacoes,
        },
      })

      await auditLog({
        municipioId: ctx.municipioId, usuarioId: ctx.usuarioId,
        acao: 'CREATE', modulo: 'semad', recurso: 'patrimonio', registroId: bem.id,
        dadosNovos: { tombamento, classificacao: dados.classificacao, valor: dados.valorAquisicao },
      })

      return NextResponse.json({ bem: { id: bem.id, tombamento } }, { status: 201 })
    }

    if (body.tipo === 'MANUTENCAO') {
      const dados = ManutencaoSchema.parse(body)
      const bem = await prisma.bemPatrimonial.findFirst({
        where: { id: dados.bemId, municipioId: ctx.municipioId },
      })
      if (!bem) return NextResponse.json({ erro: 'Bem não encontrado' }, { status: 404 })

      const manutencao = await prisma.$transaction(async (tx) => {
        const m = await tx.manutencaoBem.create({
          data: {
            municipioId:    ctx.municipioId,
            bemId:          dados.bemId,
            tipo:           dados.tipo,
            descricao:      dados.descricao,
            fornecedorNome: dados.fornecedorNome,
            valorManutencao:dados.valorManutencao,
            dataInicio:     new Date(dados.dataInicio),
            dataConclusao:  dados.dataConclusao ? new Date(dados.dataConclusao) : undefined,
            concluida:      !!dados.dataConclusao,
            empenhoId:      dados.empenhoId,
            usuarioId:      ctx.usuarioId,
          },
        })
        // Atualizar situação do bem
        await tx.bemPatrimonial.update({
          where: { id: dados.bemId },
          data: {
            situacao: dados.dataConclusao ? 'ATIVO' : 'EM_MANUTENCAO',
            ultimaManutencao: dados.dataConclusao ? new Date(dados.dataConclusao) : undefined,
          },
        })
        return m
      })
      return NextResponse.json({ manutencao }, { status: 201 })
    }

    return NextResponse.json({ erro: 'tipo inválido. Use: BEM, MANUTENCAO' }, { status: 400 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[SEMAD/PATRIMONIO/POST]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// ─── PATCH — movimentar / baixar / depreciar ──────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'semad:patrimonio:update')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const { id, acao } = body
    if (!id || !acao) return NextResponse.json({ erro: 'id e acao obrigatórios' }, { status: 400 })

    const bem = await prisma.bemPatrimonial.findFirst({ where: { id, municipioId: ctx.municipioId } })
    if (!bem) return NextResponse.json({ erro: 'Bem não encontrado' }, { status: 404 })

    // ── Transferência entre setores ───────────────────────────────────────────
    if (acao === 'TRANSFERIR') {
      const { destinoSetor, destinoResponsavel, justificativa } = body
      await prisma.$transaction(async (tx) => {
        await tx.movimentacaoBem.create({
          data: {
            municipioId: ctx.municipioId, bemId: id,
            tipo: 'TRANSFERENCIA',
            origemSetor:         bem.setor ?? undefined,
            origemResponsavel:   bem.responsavel ?? undefined,
            destinoSetor,
            destinoResponsavel,
            justificativa,
            usuarioId: ctx.usuarioId,
          },
        })
        await tx.bemPatrimonial.update({
          where: { id },
          data: { setor: destinoSetor, responsavel: destinoResponsavel },
        })
      })
      return NextResponse.json({ mensagem: 'Bem transferido' })
    }

    // ── Baixa patrimonial ─────────────────────────────────────────────────────
    if (acao === 'BAIXAR') {
      if (bem.situacao === 'BAIXADO') {
        return NextResponse.json({ erro: 'Bem já baixado' }, { status: 422 })
      }
      const { motivoBaixa, valorBaixa, justificativa, documentoAutorizacao } = body
      await prisma.$transaction(async (tx) => {
        await tx.movimentacaoBem.create({
          data: {
            municipioId: ctx.municipioId, bemId: id,
            tipo: 'BAIXA', motivoBaixa, valorBaixa,
            justificativa, documentoAutorizacao,
            usuarioId: ctx.usuarioId,
          },
        })
        await tx.bemPatrimonial.update({
          where: { id },
          data: { situacao: 'BAIXADO', ativo: false },
        })
      })
      await auditLog({
        municipioId: ctx.municipioId, usuarioId: ctx.usuarioId,
        acao: 'UPDATE', modulo: 'semad', recurso: 'patrimonio', registroId: id,
        dadosAntigos: { situacao: bem.situacao },
        dadosNovos:   { situacao: 'BAIXADO', motivoBaixa },
      })
      return NextResponse.json({ mensagem: 'Bem baixado' })
    }

    // ── Depreciar (calcular e registrar depreciação anual) ────────────────────
    if (acao === 'DEPRECIAR') {
      if (!bem.valorAquisicao || !bem.taxaDepreciacao || Number(bem.taxaDepreciacao) === 0) {
        return NextResponse.json({ erro: 'Bem sem valor de aquisição ou taxa de depreciação' }, { status: 422 })
      }
      const valorAtual = Number(bem.valorAtual ?? bem.valorAquisicao)
      const valorAquisicao = Number(bem.valorAquisicao)
      const taxa = Number(bem.taxaDepreciacao)
      // Método linear — valor residual mínimo de 10%
      const valorMinimo = valorAquisicao * 0.10
      const deprecAnual = valorAquisicao * taxa
      const novoValor   = Math.max(valorAtual - deprecAnual, valorMinimo)

      await prisma.bemPatrimonial.update({
        where: { id },
        data: { valorAtual: novoValor, dataUltimaDepreciacao: new Date() },
      })
      return NextResponse.json({
        mensagem: 'Depreciação registrada',
        valorAnterior: valorAtual,
        deprecAplicada: valorAtual - novoValor,
        novoValor,
      })
    }

    // ── Inventário ────────────────────────────────────────────────────────────
    if (acao === 'INVENTARIAR') {
      const { encontrado, observacoes } = body
      await prisma.movimentacaoBem.create({
        data: {
          municipioId: ctx.municipioId, bemId: id,
          tipo: 'INVENTARIO',
          justificativa: encontrado ? `Bem localizado. ${observacoes ?? ''}` : `Bem NÃO localizado. ${observacoes ?? ''}`,
          usuarioId: ctx.usuarioId,
        },
      })
      if (!encontrado) {
        await prisma.bemPatrimonial.update({
          where: { id },
          data: { situacao: 'INVENTARIO_PENDENTE' },
        })
      }
      return NextResponse.json({ mensagem: encontrado ? 'Bem localizado no inventário' : 'Bem marcado como não localizado' })
    }

    return NextResponse.json({ erro: `Ação inválida: ${acao}. Use: TRANSFERIR, BAIXAR, DEPRECIAR, INVENTARIAR` }, { status: 400 })
  } catch (error) {
    console.error('[SEMAD/PATRIMONIO/PATCH]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
