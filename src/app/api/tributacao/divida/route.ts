import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// CTN Art. 161 — Juros de mora: 1% a.m.
// CTN Art. 134 / 97 — Multa moratória: 20% sobre o valor
// CTN Art. 174 — Prescrição: 5 anos

const MULTA_MORATORIA = 0.20   // 20%
const JUROS_MES       = 0.01   // 1% a.m.

function calcularJuros(valorOriginal: number, dataInscricao: Date): number {
  const hoje = new Date()
  const meses = Math.floor(
    (hoje.getTime() - dataInscricao.getTime()) / (1000 * 60 * 60 * 24 * 30)
  )
  return valorOriginal * JUROS_MES * meses
}

async function gerarNumeroCDA(municipioId: string): Promise<string> {
  const ano = new Date().getFullYear()
  const count = await prisma.dividaAtiva.count({
    where: { municipioId, numero: { startsWith: `DA-${ano}-` } },
  })
  return `DA-${ano}-${String(count + 1).padStart(6, '0')}`
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id             = searchParams.get('id')
  const contribuinteId = searchParams.get('contribuinteId')
  const situacao       = searchParams.get('situacao')
  const relatorio      = searchParams.get('relatorio')
  const busca          = searchParams.get('busca')

  // ── Dashboard Dívida Ativa ─────────────────────────────────────────────────
  if (relatorio === 'DASHBOARD') {
    const [totalAtiva, emExecucao, parceladas] = await Promise.all([
      prisma.dividaAtiva.aggregate({
        where: { municipioId: usuario.municipioId, situacao: 'ATIVA' },
        _sum: { valorTotal: true },
        _count: true,
      }),
      prisma.dividaAtiva.count({
        where: { municipioId: usuario.municipioId, situacao: 'EM_EXECUCAO' },
      }),
      prisma.dividaAtiva.count({
        where: { municipioId: usuario.municipioId, situacao: 'PARCELADA' },
      }),
    ])

    const quitadasAno = await prisma.dividaAtiva.count({
      where: {
        municipioId: usuario.municipioId,
        situacao: 'QUITADA',
        dataQuitacao: { gte: new Date(new Date().getFullYear(), 0, 1) },
      },
    })

    const porSituacao = await prisma.dividaAtiva.groupBy({
      by: ['situacao'],
      where: { municipioId: usuario.municipioId },
      _count: true,
      _sum: { valorTotal: true },
    })

    return NextResponse.json({
      kpis: {
        totalAtiva: totalAtiva._sum.valorTotal ?? 0,
        quantidadeAtiva: totalAtiva._count,
        emExecucao,
        parceladas,
        quitadasAno,
      },
      porSituacao: porSituacao.map(p => ({
        situacao: p.situacao,
        quantidade: p._count,
        valor: p._sum.valorTotal ?? 0,
      })),
    })
  }

  // ── Detalhe CDA ────────────────────────────────────────────────────────────
  if (id) {
    const divida = await prisma.dividaAtiva.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        contribuinte: true,
        lancamentoIPTU: {
          include: { imovel: { select: { inscricaoCadastral: true, logradouro: true } } },
        },
        lancamentoISS: true,
        movimentacoes: { orderBy: { criadoEm: 'desc' } },
        parcelamentos: { where: { situacao: 'ATIVO' } },
      },
    })
    if (!divida) return NextResponse.json({ erro: 'Dívida não encontrada' }, { status: 404 })

    // Calcular valor atualizado
    const jurosAtual = calcularJuros(divida.valorOriginal, divida.dataInscricao)
    const valorAtualizado = divida.valorOriginal + divida.valorMulta + jurosAtual

    return NextResponse.json({ divida: { ...divida, valorAtualizado, jurosAtual } })
  }

  // ── Lista dívidas ──────────────────────────────────────────────────────────
  const where: any = { municipioId: usuario.municipioId }
  if (contribuinteId) where.contribuinteId = contribuinteId
  if (situacao) where.situacao = situacao
  if (busca) {
    where.OR = [
      { numero: { contains: busca } },
      { contribuinte: {
        OR: [
          { nome:        { contains: busca } },
          { razaoSocial: { contains: busca } },
          { cpf:         { contains: busca } },
          { cnpj:        { contains: busca } },
        ],
      }},
    ]
  }

  const dividas = await prisma.dividaAtiva.findMany({
    where,
    orderBy: { dataInscricao: 'desc' },
    take: 100,
    include: {
      contribuinte: { select: { nome: true, razaoSocial: true, codigo: true, cpf: true, cnpj: true } },
      _count: { select: { parcelamentos: { where: { situacao: 'ATIVO' } } } },
    },
  })

  return NextResponse.json({ dividas })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { tipo, ...dados } = body

  // ── Inscrição em Dívida Ativa ──────────────────────────────────────────────
  const Schema = z.object({
    contribuinteId:   z.string(),
    lancamentoIPTUId: z.string().optional(),
    lancamentoISSId:  z.string().optional(),
    valorOriginal:    z.number().min(0),
    observacoes:      z.string().optional(),
  }).refine(d => d.lancamentoIPTUId || d.lancamentoISSId, {
    message: 'Informe lancamentoIPTUId ou lancamentoISSId',
  })

  const val = Schema.safeParse(dados)
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const valorMulta = d.valorOriginal * MULTA_MORATORIA
  const valorTotal = d.valorOriginal + valorMulta
  const numero = await gerarNumeroCDA(usuario.municipioId)

  const divida = await prisma.$transaction(async tx => {
    const da = await tx.dividaAtiva.create({
      data: {
        municipioId:      usuario.municipioId,
        numero,
        contribuinteId:   d.contribuinteId,
        lancamentoIPTUId: d.lancamentoIPTUId,
        lancamentoISSId:  d.lancamentoISSId,
        valorOriginal:    d.valorOriginal,
        valorMulta,
        valorTotal,
        situacao:         'ATIVA',
        observacoes:      d.observacoes,
        usuarioId:        usuario.id,
      },
    })

    // Registrar movimentação
    await tx.movimentacaoDA.create({
      data: {
        municipioId: usuario.municipioId,
        dividaId:    da.id,
        tipo:        'INSCRICAO',
        valor:       valorTotal,
        descricao:   `Inscrição em dívida ativa — ${numero}`,
        usuarioId:   usuario.id,
      },
    })

    // Atualizar situação do lançamento de origem
    if (d.lancamentoIPTUId) {
      await tx.lancamentoIPTU.update({
        where: { id: d.lancamentoIPTUId },
        data: { situacao: 'INSCRITO_DA' },
      })
    }
    if (d.lancamentoISSId) {
      await tx.lancamentoISS.update({
        where: { id: d.lancamentoISSId },
        data: { situacao: 'INSCRITO_DA' },
      })
    }

    return da
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'INSCREVER_DIVIDA_ATIVA', entidade: 'DividaAtiva', entidadeId: divida.id,
    detalhes: { numero, valorTotal },
  })

  return NextResponse.json({ divida }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, ...extras } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const divida = await prisma.dividaAtiva.findFirst({
    where: { id, municipioId: usuario.municipioId },
  })
  if (!divida) return NextResponse.json({ erro: 'Dívida não encontrada' }, { status: 404 })

  const data: any = { atualizadoEm: new Date() }
  let movDescricao = ''

  if (acao === 'AJUIZAR') {
    data.situacao       = 'EM_EXECUCAO'
    data.dataAjuizamento = new Date()
    movDescricao = 'Dívida ajuizada para execução fiscal — Lei 6.830/1980'
  } else if (acao === 'QUITAR') {
    data.situacao      = 'QUITADA'
    data.dataQuitacao  = new Date()
    movDescricao = 'Dívida quitada integralmente'
  } else if (acao === 'CANCELAR') {
    data.situacao    = 'CANCELADA'
    data.observacoes = extras.motivo
    movDescricao = `Cancelamento: ${extras.motivo ?? '—'}`
  } else if (acao === 'PRESCREVER') {
    data.situacao = 'PRESCRITA'
    movDescricao = 'Prescrição — CTN Art. 174 (5 anos)'
  } else if (acao === 'PARCELAR') {
    data.situacao = 'PARCELADA'
    movDescricao = 'Parcelamento iniciado'
  } else {
    if (extras.observacoes !== undefined) data.observacoes = extras.observacoes
    if (extras.valorAtualizado !== undefined) {
      data.valorAtualizado = extras.valorAtualizado
      data.dataAtualizacao = new Date()
      movDescricao = `Valor atualizado para R$ ${extras.valorAtualizado}`
    }
  }

  const atualizada = await prisma.dividaAtiva.update({ where: { id }, data })

  if (movDescricao) {
    await prisma.movimentacaoDA.create({
      data: {
        municipioId: usuario.municipioId,
        dividaId: id,
        tipo: (acao === 'AJUIZAR' ? 'AJUIZAMENTO' :
               acao === 'QUITAR'  ? 'PAGAMENTO'   :
               acao === 'CANCELAR'? 'CANCELAMENTO':
               acao === 'PRESCREVER' ? 'PRESCRICAO' :
               acao === 'PARCELAR' ? 'PARCELAMENTO' : 'INSCRICAO') as any,
        valor: extras.valorPago,
        descricao: movDescricao,
        usuarioId: usuario.id,
      },
    })
  }

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: acao ?? 'ATUALIZAR_DA', entidade: 'DividaAtiva', entidadeId: id,
  })

  return NextResponse.json({ divida: atualizada })
}
