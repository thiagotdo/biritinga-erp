import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Contratos Administrativos ───────────────────────────────────────────────
// Lei 14.133/2021 — Arts. 92–165 (contratos)
// Art. 94 — cláusulas necessárias
// Art. 105 — vigência máx. 60 meses (serviços); 10 anos (tecnologia)
// Art. 107 — fiscalização obrigatória (Art. 117)
// Art. 115 — reajuste anual (Art. 92 §1)
// Art. 125 — acréscimos/supressões até 25% (serviços/obras), 50% reformas
// Art. 137 — rescisão administrativa unilateral

async function gerarNumero(municipioId: string): Promise<string> {
  const ano   = new Date().getFullYear()
  const count = await prisma.contrato.count({ where: { municipioId, numero: { startsWith: `CONT-${ano}` } } })
  return `CONT-${ano}-${String(count + 1).padStart(3, '0')}`
}

// Verifica contratos vencendo nos próximos N dias
async function contratosAVencer(municipioId: string, dias: number) {
  const limite = new Date()
  limite.setDate(limite.getDate() + dias)
  return prisma.contrato.findMany({
    where: {
      municipioId,
      situacao: { in: ['ASSINADO', 'EM_EXECUCAO'] },
      dataFim: { gte: new Date(), lte: limite },
    },
    orderBy: { dataFim: 'asc' }, take: 10,
    select: { id: true, numero: true, objeto: true, contratadaNome: true, dataFim: true, valorAtual: true },
  })
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const relatorio  = searchParams.get('relatorio')
  const id         = searchParams.get('id')
  const situacao   = searchParams.get('situacao')
  const credor     = searchParams.get('credor')

  if (relatorio === 'DASHBOARD') {
    const [total, porSituacao, totalValores, alertas30, alertas90] = await Promise.all([
      prisma.contrato.count({ where: { municipioId: usuario.municipioId } }),
      prisma.contrato.groupBy({
        by: ['situacao'],
        where: { municipioId: usuario.municipioId },
        _count: { _all: true },
        _sum: { valorAtual: true },
      }),
      prisma.contrato.aggregate({
        where: { municipioId: usuario.municipioId, situacao: { in: ['ASSINADO', 'EM_EXECUCAO'] } },
        _sum: { valorAtual: true, valorExecutado: true },
      }),
      contratosAVencer(usuario.municipioId, 30),
      contratosAVencer(usuario.municipioId, 90),
    ])

    return NextResponse.json({
      kpis: {
        total,
        ativos: porSituacao.filter(s => ['ASSINADO', 'EM_EXECUCAO'].includes(s.situacao)).reduce((n, s) => n + s._count._all, 0),
        valorAtivo: Number(totalValores._sum.valorAtual ?? 0),
        valorExecutado: Number(totalValores._sum.valorExecutado ?? 0),
        alertas30: alertas30.length,
        alertas90: alertas90.length,
      },
      porSituacao: porSituacao.map(s => ({
        situacao: s.situacao,
        count: s._count._all,
        valorTotal: Number(s._sum.valorAtual ?? 0),
      })),
      alertas30,
      alertas90,
    })
  }

  if (id) {
    const cont = await prisma.contrato.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        aditivos: { orderBy: { numero: 'asc' } },
        medicoes: { orderBy: { numero: 'asc' } },
        licitacao: { select: { id: true, numero: true, modalidade: true } },
      },
    })
    if (!cont) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
    return NextResponse.json({ contrato: cont })
  }

  const where: any = { municipioId: usuario.municipioId }
  if (situacao) where.situacao = situacao
  if (credor)   where.OR = [
    { contratadaNome: { contains: credor } },
    { contratadaCNPJ: { contains: credor } },
  ]

  const contratos = await prisma.contrato.findMany({
    where, orderBy: { criadoEm: 'desc' }, take: 200,
    include: {
      _count: { select: { aditivos: true, medicoes: true } },
      licitacao: { select: { numero: true, modalidade: true } },
    },
  })
  return NextResponse.json({ contratos, total: contratos.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const body = await req.json()

  // ── Adicionar aditivo ───────────────────────────────────────────────────
  if (body._recurso === 'ADITIVO') {
    const Schema = z.object({
      contratoId: z.string(),
      numero: z.number(),
      tipo: z.string(),
      objeto: z.string().min(5),
      justificativa: z.string().optional(),
      valorAcrescimo: z.number().optional(),
      pctAcrescimo: z.number().optional(),
      diasPrazo: z.number().optional(),
      novaDataFim: z.string().optional(),
      dataAssinatura: z.string().optional(),
      urlAditivo: z.string().optional(),
    })
    const val = Schema.safeParse(body)
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
    const d = val.data

    const contrato = await prisma.contrato.findFirst({ where: { id: d.contratoId, municipioId: usuario.municipioId } })
    if (!contrato) return NextResponse.json({ erro: 'Contrato não encontrado' }, { status: 404 })

    // Atualiza valor e data do contrato
    const upd: any = {}
    if (d.valorAcrescimo) upd.valorAtual = Number(contrato.valorAtual) + d.valorAcrescimo
    if (d.novaDataFim)    upd.dataFim    = new Date(d.novaDataFim)

    await prisma.$transaction([
      prisma.aditivoContrato.create({
        data: {
          municipioId: usuario.municipioId, ...d,
          tipo: d.tipo as any,
          novaDataFim: d.novaDataFim ? new Date(d.novaDataFim) : undefined,
          dataAssinatura: d.dataAssinatura ? new Date(d.dataAssinatura) : undefined,
        } as any,
      }),
      ...(Object.keys(upd).length ? [prisma.contrato.update({ where: { id: d.contratoId }, data: upd })] : []),
    ])

    return NextResponse.json({ sucesso: true }, { status: 201 })
  }

  // ── Registrar medição ───────────────────────────────────────────────────
  if (body._recurso === 'MEDICAO') {
    const Schema = z.object({
      contratoId: z.string(),
      numero: z.number(),
      periodo: z.string(),
      dataInicio: z.string(),
      dataFim: z.string(),
      valorMedido: z.number().positive(),
      observacao: z.string().optional(),
      notaFiscal: z.string().optional(),
    })
    const val = Schema.safeParse(body)
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
    const d = val.data
    const med = await prisma.medicaoContrato.create({
      data: {
        municipioId: usuario.municipioId, ...d,
        dataInicio: new Date(d.dataInicio), dataFim: new Date(d.dataFim),
      } as any,
    })
    return NextResponse.json({ medicao: med }, { status: 201 })
  }

  // ── Criar contrato ──────────────────────────────────────────────────────
  const Schema = z.object({
    licitacaoId: z.string().optional(),
    contratadaNome: z.string().min(3),
    contratadaCNPJ: z.string().min(14),
    contratadaEndereco: z.string().optional(),
    objeto: z.string().min(10),
    descricaoDetalhada: z.string().optional(),
    valorOriginal: z.number().positive(),
    dataAssinatura: z.string().optional(),
    dataInicio: z.string().optional(),
    dataFim: z.string(),
    indiceReajuste: z.string().optional(),
    garantiaTipo: z.string().optional(),
    garantiaValor: z.number().optional(),
    garantiaValidade: z.string().optional(),
    fiscalNome: z.string().optional(),
    fiscalMatricula: z.string().optional(),
    gestorNome: z.string().optional(),
    dotacaoOrcamentaria: z.string().optional(),
    fonteCusteio: z.string().optional(),
    urlContrato: z.string().optional(),
    pncpNumero: z.string().optional(),
  })
  const val = Schema.safeParse(body)
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const numero = await gerarNumero(usuario.municipioId)

  const contrato = await prisma.contrato.create({
    data: {
      municipioId: usuario.municipioId,
      usuarioId: usuario.id,
      numero, ...d,
      valorAtual: d.valorOriginal,
      dataAssinatura: d.dataAssinatura ? new Date(d.dataAssinatura) : undefined,
      dataInicio:     d.dataInicio     ? new Date(d.dataInicio)     : undefined,
      dataFim:        new Date(d.dataFim),
      dataFimOriginal: new Date(d.dataFim),
      garantiaValidade: d.garantiaValidade ? new Date(d.garantiaValidade) : undefined,
    } as any,
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'CRIAR_CONTRATO', entidade: 'Contrato', entidadeId: contrato.id,
    detalhes: { numero, contratada: d.contratadaNome, valor: d.valorOriginal },
  })

  return NextResponse.json({ contrato, numero }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, ...dados } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const contrato = await prisma.contrato.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!contrato) return NextResponse.json({ erro: 'Contrato não encontrado' }, { status: 404 })

  const mapSit: Record<string, string> = {
    ASSINAR: 'ASSINADO', INICIAR: 'EM_EXECUCAO', SUSPENDER: 'SUSPENSO',
    RESCINDIR_ADMIN: 'RESCINDIDO_ADMIN', RESCINDIR_AMIGAVEL: 'RESCINDIDO_AMIGAVEL',
    CONCLUIR: 'CONCLUIDO',
  }

  if (acao && mapSit[acao]) {
    const upd: any = { situacao: mapSit[acao] }
    if (acao === 'ASSINAR') upd.dataAssinatura = new Date()
    if (acao === 'INICIAR') upd.dataInicio = dados.dataInicio ? new Date(dados.dataInicio) : new Date()
    await prisma.contrato.update({ where: { id }, data: upd })
    return NextResponse.json({ sucesso: true })
  }

  // Atualizar executado (medição aprovada)
  if (acao === 'ATUALIZAR_EXECUTADO') {
    const medicoes = await prisma.medicaoContrato.aggregate({
      where: { contratoId: id, situacao: { in: ['APROVADA', 'PAGA'] } },
      _sum: { valorMedido: true },
    })
    await prisma.contrato.update({ where: { id }, data: { valorExecutado: medicoes._sum.valorMedido ?? 0 } })
    return NextResponse.json({ sucesso: true })
  }

  // Atualizar status de medição
  if (acao === 'MEDICAO_STATUS') {
    const { medicaoId, situacao: novaSit } = dados
    const upd: any = { situacao: novaSit }
    if (novaSit === 'APROVADA') upd.dataAprovacao = new Date()
    if (novaSit === 'PAGA')     upd.dataPagamento = new Date()
    await prisma.medicaoContrato.update({ where: { id: medicaoId }, data: upd })

    // Recalcular executado
    const medicoes = await prisma.medicaoContrato.aggregate({
      where: { contratoId: id, situacao: { in: ['APROVADA', 'PAGA'] } },
      _sum: { valorMedido: true },
    })
    await prisma.contrato.update({ where: { id }, data: { valorExecutado: medicoes._sum.valorMedido ?? 0 } })
    return NextResponse.json({ sucesso: true })
  }

  return NextResponse.json({ erro: 'Ação não reconhecida' }, { status: 400 })
}
