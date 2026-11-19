import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Geração de número ────────────────────────────────────────────────────────
// Padrão: "001/2026" por modalidade no exercício
async function gerarNumeroProcesso(municipioId: string, anoExercicio: number): Promise<string> {
  const count = await prisma.processoLicitatorio.count({
    where: { municipioId, anoExercicio },
  })
  return `${String(count + 1).padStart(3, '0')}/${anoExercicio}`
}

// ─── Fluxo de situações permitidas ───────────────────────────────────────────
const TRANSICOES: Record<string, string[]> = {
  RASCUNHO:      ['PUBLICADO', 'CANCELADO'],
  PUBLICADO:     ['EM_JULGAMENTO', 'SUSPENSO', 'DESERTO', 'CANCELADO'],
  EM_JULGAMENTO: ['ADJUDICADO', 'FRACASSADO', 'SUSPENSO', 'CANCELADO'],
  SUSPENSO:      ['PUBLICADO', 'EM_JULGAMENTO', 'CANCELADO'],
  ADJUDICADO:    ['HOMOLOGADO', 'CANCELADO'],
  HOMOLOGADO:    ['CONTRATADO'],
  FRACASSADO:    ['PUBLICADO', 'CANCELADO'],
  DESERTO:       ['PUBLICADO', 'CANCELADO'],
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const relatorio = searchParams.get('relatorio')
  const situacao  = searchParams.get('situacao')
  const modalidade = searchParams.get('modalidade')
  const ano       = searchParams.get('ano')
  const busca     = searchParams.get('busca')

  if (relatorio === 'DASHBOARD') {
    const ano = new Date().getFullYear()
    const [
      total, rascunhos, publicados, emJulgamento,
      homologados, cancelados, contrataados
    ] = await Promise.all([
      prisma.processoLicitatorio.count({ where: { municipioId: usuario.municipioId, anoExercicio: ano } }),
      prisma.processoLicitatorio.count({ where: { municipioId: usuario.municipioId, anoExercicio: ano, situacao: 'RASCUNHO' } }),
      prisma.processoLicitatorio.count({ where: { municipioId: usuario.municipioId, anoExercicio: ano, situacao: 'PUBLICADO' } }),
      prisma.processoLicitatorio.count({ where: { municipioId: usuario.municipioId, anoExercicio: ano, situacao: 'EM_JULGAMENTO' } }),
      prisma.processoLicitatorio.count({ where: { municipioId: usuario.municipioId, anoExercicio: ano, situacao: 'HOMOLOGADO' } }),
      prisma.processoLicitatorio.count({ where: { municipioId: usuario.municipioId, anoExercicio: ano, situacao: 'CANCELADO' } }),
      prisma.processoLicitatorio.count({ where: { municipioId: usuario.municipioId, anoExercicio: ano, situacao: 'CONTRATADO' } }),
    ])

    const valores = await prisma.processoLicitatorio.aggregate({
      where: { municipioId: usuario.municipioId, anoExercicio: ano },
      _sum: { valorEstimado: true, valorHomologado: true },
    })

    // Economia: diferença entre estimado e homologado nos processos com resultado
    const economiaTotal = (Number(valores._sum.valorEstimado ?? 0)) -
      (Number(valores._sum.valorHomologado ?? 0))

    // Próximos vencimentos (publicados com dataAberturaPropostas nos próximos 15 dias)
    const em15Dias = new Date(Date.now() + 15 * 86400000)
    const vencendoBreve = await prisma.processoLicitatorio.findMany({
      where: {
        municipioId: usuario.municipioId,
        situacao: 'PUBLICADO',
        dataAberturaPropostas: { lte: em15Dias, gte: new Date() },
      },
      select: { id: true, numero: true, objeto: true, dataAberturaPropostas: true, modalidade: true },
      orderBy: { dataAberturaPropostas: 'asc' },
      take: 5,
    })

    return NextResponse.json({
      kpis: {
        total, rascunhos, publicados, emJulgamento,
        homologados, cancelados, contratados: contrataados,
        valorEstimadoTotal: Number(valores._sum.valorEstimado ?? 0),
        valorHomologadoTotal: Number(valores._sum.valorHomologado ?? 0),
        economiaTotal: Math.max(0, economiaTotal),
        percentualEconomia: valores._sum.valorEstimado
          ? (economiaTotal / Number(valores._sum.valorEstimado) * 100).toFixed(1)
          : '0',
      },
      vencendoBreve,
    })
  }

  if (id) {
    const processo = await prisma.processoLicitatorio.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        itens:    { orderBy: { numero: 'asc' } },
        propostas: {
          include: { fornecedor: { select: { razaoSocial: true, cnpjCpf: true } } },
          orderBy: { classificacao: 'asc' },
        },
        contrato: true,
      },
    })
    if (!processo) return NextResponse.json({ erro: 'Processo não encontrado' }, { status: 404 })
    return NextResponse.json({ processo })
  }

  const where: any = { municipioId: usuario.municipioId }
  if (situacao)   where.situacao   = situacao
  if (modalidade) where.modalidade = modalidade
  if (ano)        where.anoExercicio = Number(ano)
  if (busca) {
    where.OR = [
      { numero: { contains: busca } },
      { objeto: { contains: busca } },
    ]
  }

  const processos = await prisma.processoLicitatorio.findMany({
    where,
    orderBy: [{ anoExercicio: 'desc' }, { numero: 'desc' }],
    take: 100,
    include: {
      _count: { select: { propostas: true, itens: true } },
    },
  })

  return NextResponse.json({ processos, total: processos.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const ItemSchema = z.object({
    numero:    z.number().int().positive(),
    descricao: z.string().min(5),
    unidade:   z.string().min(1),
    quantidade: z.number().positive(),
    valorUnitarioEstimado: z.number().positive(),
    codigoMaterial: z.string().optional(),
    especificacoes: z.string().optional(),
  })

  const Schema = z.object({
    modalidade:   z.enum(['PREGAO','CONCORRENCIA','CONCURSO','LEILAO','DIALOGO_COMPETITIVO','DISPENSA','INEXIGIBILIDADE']),
    criterio:     z.enum(['MENOR_PRECO','MAIOR_DESCONTO','MELHOR_TECNICA_PRECO','MELHOR_TECNICA','MAIOR_LANCE','MAIOR_RETORNO']),
    modoDisputa:  z.enum(['ABERTO','FECHADO','ABERTO_FECHADO']).default('ABERTO'),
    objeto:       z.string().min(10),
    justificativa: z.string().optional(),
    valorEstimado: z.number().positive(),
    anoExercicio:  z.number().int().default(new Date().getFullYear()),
    agenteContratacao: z.string().optional(),
    pregoeiro:    z.string().optional(),
    unidadeRequisitante: z.string().optional(),
    secretariaResponsavel: z.string().optional(),
    dataPublicacao: z.string().optional(),
    dataAberturaPropostas: z.string().optional(),
    fundamentoLegal: z.string().optional(),
    empenhoNumero: z.string().optional(),
    dotacaoOrcamentaria: z.string().optional(),
    observacoes: z.string().optional(),
    itens: z.array(ItemSchema).optional(),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const numero = await gerarNumeroProcesso(usuario.municipioId, d.anoExercicio)

  const processo = await prisma.$transaction(async (tx) => {
    const p = await tx.processoLicitatorio.create({
      data: {
        municipioId:  usuario.municipioId,
        numero,
        anoExercicio: d.anoExercicio,
        modalidade:   d.modalidade,
        criterio:     d.criterio,
        modoDisputa:  d.modoDisputa,
        objeto:       d.objeto,
        justificativa: d.justificativa,
        valorEstimado: d.valorEstimado,
        agenteContratacao: d.agenteContratacao,
        pregoeiro:    d.pregoeiro,
        unidadeRequisitante: d.unidadeRequisitante,
        secretariaResponsavel: d.secretariaResponsavel,
        dataPublicacao: d.dataPublicacao ? new Date(d.dataPublicacao) : undefined,
        dataAberturaPropostas: d.dataAberturaPropostas ? new Date(d.dataAberturaPropostas) : undefined,
        fundamentoLegal: d.fundamentoLegal,
        empenhoNumero: d.empenhoNumero,
        dotacaoOrcamentaria: d.dotacaoOrcamentaria,
        observacoes:  d.observacoes,
        usuarioId:    usuario.id,
      },
    })

    if (d.itens && d.itens.length > 0) {
      await tx.itemLicitacao.createMany({
        data: d.itens.map(item => ({
          processoId: p.id,
          numero:     item.numero,
          descricao:  item.descricao,
          unidade:    item.unidade,
          quantidade: item.quantidade,
          valorUnitarioEstimado: item.valorUnitarioEstimado,
          valorTotalEstimado:    item.quantidade * item.valorUnitarioEstimado,
          codigoMaterial: item.codigoMaterial,
          especificacoes: item.especificacoes,
        })),
      })
    }

    return p
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'CRIAR_PROCESSO_LICITATORIO', entidade: 'ProcessoLicitatorio', entidadeId: processo.id,
    detalhes: { numero, modalidade: d.modalidade, valorEstimado: d.valorEstimado },
  })

  return NextResponse.json({ processo, numero }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, ...extras } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const processo = await prisma.processoLicitatorio.findFirst({
    where: { id, municipioId: usuario.municipioId },
  })
  if (!processo) return NextResponse.json({ erro: 'Processo não encontrado' }, { status: 404 })

  // Avançar/retroceder situação
  if (acao === 'ALTERAR_SITUACAO') {
    const novaSituacao = extras.situacao
    const permitidas = TRANSICOES[processo.situacao] ?? []
    if (!permitidas.includes(novaSituacao)) {
      return NextResponse.json({
        erro: `Transição ${processo.situacao} → ${novaSituacao} não permitida`,
        permitidas,
      }, { status: 409 })
    }

    const data: any = {
      situacao: novaSituacao,
      observacoes: extras.observacoes,
    }
    if (novaSituacao === 'PUBLICADO')      data.dataPublicacao = new Date()
    if (novaSituacao === 'EM_JULGAMENTO')  data.dataJulgamento = new Date()
    if (novaSituacao === 'ADJUDICADO')     data.dataAdjudicacao = new Date()
    if (novaSituacao === 'HOMOLOGADO') {
      data.dataHomologacao = new Date()
      if (extras.valorHomologado) data.valorHomologado = extras.valorHomologado
    }

    await prisma.processoLicitatorio.update({ where: { id }, data })
    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: `PROCESSO_${novaSituacao}`, entidade: 'ProcessoLicitatorio', entidadeId: id,
      detalhes: { de: processo.situacao, para: novaSituacao },
    })
    return NextResponse.json({ sucesso: true })
  }

  // Atualizar dados gerais (fase interna)
  if (acao === 'ATUALIZAR') {
    if (processo.situacao !== 'RASCUNHO') {
      return NextResponse.json({ erro: 'Processo publicado não pode ser editado' }, { status: 409 })
    }
    const campos = ['objeto','justificativa','valorEstimado','agenteContratacao','pregoeiro',
      'dataPublicacao','dataAberturaPropostas','fundamentoLegal','empenhoNumero',
      'dotacaoOrcamentaria','observacoes','numeroEdital','numeroDoe','linkPublicacao']
    const data: any = {}
    for (const c of campos) {
      if (extras[c] !== undefined) {
        data[c] = c.startsWith('data') && extras[c] ? new Date(extras[c]) : extras[c]
      }
    }
    const atualizado = await prisma.processoLicitatorio.update({ where: { id }, data })
    return NextResponse.json({ processo: atualizado })
  }

  // Adjudicar + definir vencedor dos itens
  if (acao === 'ADJUDICAR') {
    // extras.itensVencedores: [{ itemId, fornecedorId, valorUnitarioHomologado }]
    await prisma.$transaction(async (tx) => {
      await tx.processoLicitatorio.update({
        where: { id },
        data: { situacao: 'ADJUDICADO', dataAdjudicacao: new Date() },
      })
      if (extras.itensVencedores) {
        for (const iv of extras.itensVencedores) {
          const item = await tx.itemLicitacao.findUnique({ where: { id: iv.itemId } })
          if (item) {
            await tx.itemLicitacao.update({
              where: { id: iv.itemId },
              data: {
                valorUnitarioHomologado: iv.valorUnitarioHomologado,
                valorTotalHomologado: Number(item.quantidade) * iv.valorUnitarioHomologado,
                fornecedorVencedorId: iv.fornecedorId,
              },
            })
          }
        }
      }
      if (extras.valorHomologado) {
        await tx.processoLicitatorio.update({
          where: { id },
          data: { valorHomologado: extras.valorHomologado },
        })
      }
    })
    return NextResponse.json({ sucesso: true })
  }

  return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
}
