import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Farmácia Básica ──────────────────────────────────────────────────────────
// RDC ANVISA 44/2009 — Dispensação de medicamentos
// Controle de estoque: ENTRADA (recebimento), SAIDA (dispensação), AJUSTE, DESCARTE
// Alerta de estoque mínimo e medicamentos a vencer em 60 dias.

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const unidadeId = searchParams.get('unidadeId')
  const relatorio = searchParams.get('relatorio')
  const busca     = searchParams.get('busca')

  if (relatorio === 'DASHBOARD') {
    const hoje60 = new Date(Date.now() + 60 * 86400000)
    const [totalItens, emFalta, aVencer, controlados] = await Promise.all([
      prisma.estoqueFarmacia.count({ where: { municipioId: usuario.municipioId, ativo: true } }),
      prisma.estoqueFarmacia.count({
        where: { municipioId: usuario.municipioId, ativo: true, situacao: { in: ['EM_FALTA'] } },
      }),
      prisma.estoqueFarmacia.count({
        where: {
          municipioId: usuario.municipioId, ativo: true,
          dataValidade: { lte: hoje60, gte: new Date() },
        },
      }),
      prisma.estoqueFarmacia.count({ where: { municipioId: usuario.municipioId, ativo: true, controlado: true } }),
    ])

    // Itens abaixo do mínimo (calculado em memória — Prisma não suporta comparação entre colunas diretamente)
    const todos = await prisma.estoqueFarmacia.findMany({
      where: { municipioId: usuario.municipioId, ativo: true },
      select: { quantidadeAtual: true, quantidadeMinima: true },
    })
    const abaixoMinimo = todos.filter(i => i.quantidadeAtual < i.quantidadeMinima).length

    return NextResponse.json({ kpis: { totalItens, emFalta, aVencer, controlados, abaixoMinimo } })
  }

  if (id) {
    const item = await prisma.estoqueFarmacia.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        movimentacoes: { orderBy: { criadoEm: 'desc' }, take: 20 },
        unidade: { select: { nome: true } },
      },
    })
    if (!item) return NextResponse.json({ erro: 'Item não encontrado' }, { status: 404 })
    return NextResponse.json({ item })
  }

  const where: any = { municipioId: usuario.municipioId, ativo: true }
  if (unidadeId) where.unidadeId = unidadeId
  if (busca) {
    where.OR = [
      { principioAtivo: { contains: busca } },
      { nomeComercial:  { contains: busca } },
    ]
  }

  const estoque = await prisma.estoqueFarmacia.findMany({
    where, orderBy: { principioAtivo: 'asc' }, take: 500,
    include: { unidade: { select: { nome: true } } },
  })

  // Enriquecer com alertas
  const hoje = new Date()
  const hoje60 = new Date(Date.now() + 60 * 86400000)
  const enriquecido = estoque.map(item => ({
    ...item,
    alertas: {
      abaixoMinimo: item.quantidadeAtual < item.quantidadeMinima,
      aVencer: item.dataValidade ? item.dataValidade <= hoje60 && item.dataValidade >= hoje : false,
      vencido: item.dataValidade ? item.dataValidade < hoje : false,
    },
  }))

  return NextResponse.json({ estoque: enriquecido, total: enriquecido.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    unidadeId:       z.string(),
    principioAtivo:  z.string().min(3),
    nomeComercial:   z.string().optional(),
    apresentacao:    z.string(),
    codigoBrasindice: z.string().optional(),
    controlado:      z.boolean().default(false),
    tarja:           z.enum(['BRANCA','VERMELHA','PRETA']).default('BRANCA'),
    quantidadeAtual: z.number().int().min(0).default(0),
    quantidadeMinima: z.number().int().min(0).default(10),
    unidadeMedida:   z.string().default('UNIDADE'),
    lote:            z.string().optional(),
    dataValidade:    z.string().optional(),
    fornecedor:      z.string().optional(),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const item = await prisma.$transaction(async (tx) => {
    const it = await tx.estoqueFarmacia.create({
      data: {
        municipioId: usuario.municipioId,
        unidadeId:   d.unidadeId,
        principioAtivo: d.principioAtivo,
        nomeComercial:  d.nomeComercial,
        apresentacao:   d.apresentacao,
        codigoBrasindice: d.codigoBrasindice,
        controlado:     d.controlado,
        tarja:          d.tarja,
        quantidadeAtual: d.quantidadeAtual,
        quantidadeMinima: d.quantidadeMinima,
        unidadeMedida:  d.unidadeMedida,
        lote:           d.lote,
        dataValidade:   d.dataValidade ? new Date(d.dataValidade) : null,
        fornecedor:     d.fornecedor,
        dataEntrada:    d.quantidadeAtual > 0 ? new Date() : null,
        quantidadeEntrada: d.quantidadeAtual > 0 ? d.quantidadeAtual : null,
      },
    })

    // Registrar movimentação inicial de entrada
    if (d.quantidadeAtual > 0) {
      await tx.movimentacaoFarmacia.create({
        data: {
          municipioId: usuario.municipioId,
          estoqueId: it.id,
          tipo: 'ENTRADA',
          quantidade: d.quantidadeAtual,
          saldoApos: d.quantidadeAtual,
          lote: d.lote,
          dataValidade: d.dataValidade ? new Date(d.dataValidade) : null,
          observacao: 'Cadastro inicial',
          usuarioId: usuario.id,
        },
      })
    }
    return it
  })

  return NextResponse.json({ item }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, ...extras } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const item = await prisma.estoqueFarmacia.findFirst({
    where: { id, municipioId: usuario.municipioId },
  })
  if (!item) return NextResponse.json({ erro: 'Item não encontrado' }, { status: 404 })

  // ── ENTRADA ───────────────────────────────────────────────────────────────
  if (acao === 'ENTRADA') {
    const EntSchema = z.object({
      quantidade:  z.number().int().positive(),
      lote:        z.string().optional(),
      dataValidade: z.string().optional(),
      fornecedor:  z.string().optional(),
      observacao:  z.string().optional(),
    })
    const ev = EntSchema.safeParse(extras)
    if (!ev.success) return NextResponse.json({ erro: ev.error.flatten() }, { status: 400 })
    const e = ev.data

    const novoSaldo = item.quantidadeAtual + e.quantidade

    await prisma.$transaction(async (tx) => {
      await tx.estoqueFarmacia.update({
        where: { id },
        data: {
          quantidadeAtual: novoSaldo,
          situacao: novoSaldo >= item.quantidadeMinima ? 'ATIVO' : 'EM_FALTA',
          lote: e.lote ?? item.lote,
          dataValidade: e.dataValidade ? new Date(e.dataValidade) : item.dataValidade,
          fornecedor: e.fornecedor ?? item.fornecedor,
          dataEntrada: new Date(),
          quantidadeEntrada: e.quantidade,
        },
      })
      await tx.movimentacaoFarmacia.create({
        data: {
          municipioId: usuario.municipioId, estoqueId: id,
          tipo: 'ENTRADA', quantidade: e.quantidade, saldoApos: novoSaldo,
          lote: e.lote, dataValidade: e.dataValidade ? new Date(e.dataValidade) : undefined,
          observacao: e.observacao, usuarioId: usuario.id,
        },
      })
    })
    return NextResponse.json({ sucesso: true, novoSaldo })
  }

  // ── DISPENSAR (SAÍDA) ─────────────────────────────────────────────────────
  if (acao === 'DISPENSAR') {
    const DispSchema = z.object({
      quantidade:    z.number().int().positive(),
      prescricaoId:  z.string().optional(),
      pacienteNome:  z.string().optional(),
      pacienteCpf:   z.string().optional(),
      observacao:    z.string().optional(),
    })
    const dv = DispSchema.safeParse(extras)
    if (!dv.success) return NextResponse.json({ erro: dv.error.flatten() }, { status: 400 })
    const disp = dv.data

    if (item.quantidadeAtual < disp.quantidade) {
      return NextResponse.json({
        erro: `Estoque insuficiente. Disponível: ${item.quantidadeAtual}`,
        disponivel: item.quantidadeAtual,
      }, { status: 400 })
    }

    const novoSaldo = item.quantidadeAtual - disp.quantidade

    await prisma.$transaction(async (tx) => {
      await tx.estoqueFarmacia.update({
        where: { id },
        data: {
          quantidadeAtual: novoSaldo,
          situacao: novoSaldo === 0 ? 'EM_FALTA' : novoSaldo < item.quantidadeMinima ? 'EM_FALTA' : 'ATIVO',
        },
      })
      await tx.movimentacaoFarmacia.create({
        data: {
          municipioId: usuario.municipioId, estoqueId: id,
          tipo: 'SAIDA', quantidade: disp.quantidade, saldoApos: novoSaldo,
          prescricaoId: disp.prescricaoId, pacienteNome: disp.pacienteNome,
          pacienteCpf: disp.pacienteCpf, observacao: disp.observacao,
          usuarioId: usuario.id,
        },
      })

      // Marcar prescrição como dispensada
      if (disp.prescricaoId) {
        await tx.prescricaoAtendimento.update({
          where: { id: disp.prescricaoId },
          data: { dispensado: true, dataDispensacao: new Date() },
        })
      }
    })

    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: 'DISPENSAR_MEDICAMENTO', entidade: 'EstoqueFarmacia', entidadeId: id,
      detalhes: {
        medicamento: item.principioAtivo, quantidade: disp.quantidade,
        paciente: disp.pacienteNome, novoSaldo,
      },
    })

    return NextResponse.json({ sucesso: true, novoSaldo })
  }

  // ── AJUSTE ────────────────────────────────────────────────────────────────
  if (acao === 'AJUSTE') {
    const AjSchema = z.object({
      novoSaldo:  z.number().int().min(0),
      motivo:     z.string(),
    })
    const aj = AjSchema.safeParse(extras)
    if (!aj.success) return NextResponse.json({ erro: aj.error.flatten() }, { status: 400 })

    const diff = aj.data.novoSaldo - item.quantidadeAtual

    await prisma.$transaction(async (tx) => {
      await tx.estoqueFarmacia.update({
        where: { id },
        data: {
          quantidadeAtual: aj.data.novoSaldo,
          situacao: aj.data.novoSaldo < item.quantidadeMinima ? 'EM_FALTA' : 'ATIVO',
        },
      })
      await tx.movimentacaoFarmacia.create({
        data: {
          municipioId: usuario.municipioId, estoqueId: id,
          tipo: 'AJUSTE', quantidade: diff, saldoApos: aj.data.novoSaldo,
          observacao: aj.data.motivo, usuarioId: usuario.id,
        },
      })
    })
    return NextResponse.json({ sucesso: true, novoSaldo: aj.data.novoSaldo })
  }

  return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
}
