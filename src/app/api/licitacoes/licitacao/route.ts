import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Licitações ──────────────────────────────────────────────────────────────
// Lei 14.133/2021 — Nova Lei de Licitações (revoga Lei 8.666 gradualmente)
// Art. 54 — prazo mínimo 25 dias para propostas (concorrência)
// Art. 17 §2 — obrigatório PNCP para municípios > 10 mil hab.
// LC 123/2006 Art. 48 — preferência ME/EPP até 10% (empate ficto)
// Art. 11 Lei 14.133 — princípios: legalidade, impessoalidade, publicidade

async function gerarNumero(municipioId: string): Promise<string> {
  const ano   = new Date().getFullYear()
  const count = await prisma.licitacao.count({ where: { municipioId, numero: { startsWith: `LIC-${ano}` } } })
  return `LIC-${ano}-${String(count + 1).padStart(3, '0')}`
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const relatorio  = searchParams.get('relatorio')
  const id         = searchParams.get('id')
  const situacao   = searchParams.get('situacao')
  const modalidade = searchParams.get('modalidade')
  const exercicio  = searchParams.get('exercicio')

  if (relatorio === 'DASHBOARD') {
    const anoAtual = new Date().getFullYear()
    const [total, porSituacao, porModalidade, totalValor, aVencer] = await Promise.all([
      prisma.licitacao.count({ where: { municipioId: usuario.municipioId } }),
      prisma.licitacao.groupBy({
        by: ['situacao'],
        where: { municipioId: usuario.municipioId },
        _count: { _all: true },
        orderBy: { _count: { situacao: 'desc' } },
      }),
      prisma.licitacao.groupBy({
        by: ['modalidade'],
        where: { municipioId: usuario.municipioId, exercicio: anoAtual },
        _count: { _all: true },
        _sum: { valorEstimado: true },
        orderBy: { _count: { modalidade: 'desc' } },
      }),
      prisma.licitacao.aggregate({
        where: { municipioId: usuario.municipioId, situacao: 'HOMOLOGADA' },
        _sum: { valorHomologado: true },
      }),
      // Licitações em prazo / abertura próxima
      prisma.licitacao.findMany({
        where: {
          municipioId: usuario.municipioId,
          situacao: { in: ['PUBLICADA', 'EM_PRAZO'] },
          dataAbertura: { gte: new Date() },
        },
        orderBy: { dataAbertura: 'asc' }, take: 5,
        select: { id: true, numero: true, objeto: true, modalidade: true, dataAbertura: true, valorEstimado: true },
      }),
    ])

    return NextResponse.json({
      kpis: { total, valorHomologado: totalValor._sum.valorHomologado ?? 0 },
      porSituacao,
      porModalidade: porModalidade.map(m => ({
        modalidade: m.modalidade,
        count: m._count._all,
        valorTotal: Number(m._sum.valorEstimado ?? 0),
      })),
      aVencer,
    })
  }

  if (id) {
    const lic = await prisma.licitacao.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        itens: { orderBy: { numero: 'asc' } },
        propostas: { orderBy: { colocacao: 'asc' } },
        contrato: { select: { id: true, numero: true, situacao: true } },
      },
    })
    if (!lic) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
    return NextResponse.json({ licitacao: lic })
  }

  const where: any = { municipioId: usuario.municipioId }
  if (situacao)   where.situacao   = situacao
  if (modalidade) where.modalidade = modalidade
  if (exercicio)  where.exercicio  = parseInt(exercicio)

  const licitacoes = await prisma.licitacao.findMany({
    where, orderBy: { criadoEm: 'desc' }, take: 200,
    include: {
      _count: { select: { itens: true, propostas: true, contrato: true } },
    },
  })
  return NextResponse.json({ licitacoes, total: licitacoes.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const body = await req.json()

  // ── Adicionar item ──────────────────────────────────────────────────────
  if (body._recurso === 'ITEM') {
    const Schema = z.object({
      licitacaoId: z.string(),
      numero: z.number(),
      descricao: z.string().min(3),
      unidade: z.string(),
      quantidade: z.number().positive(),
      valorUnitRef: z.number().positive(),
    })
    const val = Schema.safeParse(body)
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
    const d = val.data
    const item = await prisma.itemLicitacao.create({
      data: { municipioId: usuario.municipioId, ...d } as any,
    })
    return NextResponse.json({ item }, { status: 201 })
  }

  // ── Registrar proposta ──────────────────────────────────────────────────
  if (body._recurso === 'PROPOSTA') {
    const Schema = z.object({
      licitacaoId: z.string(),
      fornecedorNome: z.string().min(3),
      fornecedorCNPJ: z.string().min(14),
      porte: z.string().optional(),
      valorTotal: z.number().positive(),
      tecnica: z.string().optional(),
    })
    const val = Schema.safeParse(body)
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
    const d = val.data
    const proposta = await prisma.propostaLicitacao.create({
      data: { municipioId: usuario.municipioId, ...d } as any,
    })
    return NextResponse.json({ proposta }, { status: 201 })
  }

  // ── Criar licitação ─────────────────────────────────────────────────────
  const Schema = z.object({
    modalidade: z.string(),
    forma: z.string(),
    objeto: z.string().min(10),
    justificativa: z.string().optional(),
    fundamentacao: z.string().optional(),
    valorEstimado: z.number().positive(),
    exercicio: z.number(),
    dataPublicacao: z.string().optional(),
    dataAbertura: z.string().optional(),
    urlEdital: z.string().optional(),
    pncpNumero: z.string().optional(),
    doeNumero: z.string().optional(),
    comissao: z.string().optional(),
    pregoeiro: z.string().optional(),
    unidadeGestora: z.string().optional(),
    dotacaoOrcamentaria: z.string().optional(),
    fonteCusteio: z.string().optional(),
  })
  const val = Schema.safeParse(body)
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const numero = await gerarNumero(usuario.municipioId)

  const lic = await prisma.licitacao.create({
    data: {
      municipioId: usuario.municipioId,
      usuarioId: usuario.id,
      numero, ...d,
      modalidade: d.modalidade as any,
      forma: d.forma as any,
      dataPublicacao: d.dataPublicacao ? new Date(d.dataPublicacao) : undefined,
      dataAbertura:   d.dataAbertura   ? new Date(d.dataAbertura)   : undefined,
    } as any,
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'CRIAR_LICITACAO', entidade: 'Licitacao', entidadeId: lic.id,
    detalhes: { numero, modalidade: d.modalidade },
  })

  return NextResponse.json({ licitacao: lic, numero }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, ...dados } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const lic = await prisma.licitacao.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!lic) return NextResponse.json({ erro: 'Licitação não encontrada' }, { status: 404 })

  const mapSit: Record<string, string> = {
    PUBLICAR: 'PUBLICADA', ABRIR_PRAZO: 'EM_PRAZO', INICIAR_JULGAMENTO: 'EM_JULGAMENTO',
    HOMOLOGAR: 'HOMOLOGADA', ADJUDICAR: 'ADJUDICADA', DECLARAR_DESERTA: 'DESERTA',
    DECLARAR_FRACASSADA: 'FRACASSADA', REVOGAR: 'REVOGADA', ANULAR: 'ANULADA',
  }

  if (acao && mapSit[acao]) {
    const upd: any = { situacao: mapSit[acao] }
    if (acao === 'PUBLICAR')   { upd.dataPublicacao = new Date() }
    if (acao === 'HOMOLOGAR')  { upd.dataHomologacao = new Date(); upd.valorHomologado = dados.valorHomologado }
    if (acao === 'ADJUDICAR')  { upd.dataAdjudicacao = new Date() }
    if (acao === 'HOMOLOGAR' || acao === 'ADJUDICAR') {
      upd.urlAta = dados.urlAta
      upd.urlResultado = dados.urlResultado
    }
    await prisma.licitacao.update({ where: { id }, data: upd })
    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: `LICITACAO_${acao}`, entidade: 'Licitacao', entidadeId: id,
      detalhes: { numero: lic.numero, novoStatus: mapSit[acao] },
    })
    return NextResponse.json({ sucesso: true })
  }

  // Classificar proposta
  if (acao === 'CLASSIFICAR_PROPOSTA') {
    const { propostaId, situacao: novaSit, colocacao, motivoDesclass } = dados
    await prisma.propostaLicitacao.update({
      where: { id: propostaId },
      data: { situacao: novaSit, colocacao, motivoDesclass },
    })
    // Se vencedora, marcar item como adjudicado
    if (novaSit === 'VENCEDORA' && dados.itemId) {
      await prisma.itemLicitacao.update({
        where: { id: dados.itemId },
        data: { situacao: 'ADJUDICADO', fornecedorNome: dados.fornecedorNome, valorUnitVencedor: dados.valorUnit, valorTotalItem: dados.valorTotal },
      })
    }
    return NextResponse.json({ sucesso: true })
  }

  return NextResponse.json({ erro: 'Ação não reconhecida' }, { status: 400 })
}
