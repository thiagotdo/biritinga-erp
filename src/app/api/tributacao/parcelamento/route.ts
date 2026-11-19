import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

const JUROS_PARCELAMENTO = 0.01  // 1% a.m. sobre parcelas

async function gerarNumeroParcelmamento(municipioId: string): Promise<string> {
  const ano = new Date().getFullYear()
  const count = await prisma.parcelamento.count({
    where: { municipioId, numero: { startsWith: `PARC-${ano}-` } },
  })
  return `PARC-${ano}-${String(count + 1).padStart(6, '0')}`
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id             = searchParams.get('id')
  const contribuinteId = searchParams.get('contribuinteId')
  const situacao       = searchParams.get('situacao')
  const relatorio      = searchParams.get('relatorio')

  if (relatorio === 'DASHBOARD') {
    const [ativos, quitados, rescindidos, totalParcelado] = await Promise.all([
      prisma.parcelamento.count({ where: { municipioId: usuario.municipioId, situacao: 'ATIVO' } }),
      prisma.parcelamento.count({ where: { municipioId: usuario.municipioId, situacao: 'QUITADO' } }),
      prisma.parcelamento.count({ where: { municipioId: usuario.municipioId, situacao: 'RESCINDIDO' } }),
      prisma.parcelamento.aggregate({
        where: { municipioId: usuario.municipioId, situacao: 'ATIVO' },
        _sum: { valorTotal: true },
      }),
    ])

    return NextResponse.json({
      kpis: { ativos, quitados, rescindidos, totalParcelado: totalParcelado._sum.valorTotal ?? 0 },
    })
  }

  if (id) {
    const parc = await prisma.parcelamento.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        contribuinte: { select: { nome: true, razaoSocial: true, codigo: true, cpf: true, cnpj: true } },
        dividaAtiva: { select: { numero: true, valorOriginal: true, situacao: true } },
        dams: { orderBy: { parcelaNumero: 'asc' } },
      },
    })
    if (!parc) return NextResponse.json({ erro: 'Parcelamento não encontrado' }, { status: 404 })
    return NextResponse.json({ parcelamento: parc })
  }

  const where: any = { municipioId: usuario.municipioId }
  if (contribuinteId) where.contribuinteId = contribuinteId
  if (situacao) where.situacao = situacao

  const parcelamentos = await prisma.parcelamento.findMany({
    where,
    orderBy: { criadoEm: 'desc' },
    take: 100,
    include: {
      contribuinte: { select: { nome: true, razaoSocial: true, codigo: true } },
      dividaAtiva: { select: { numero: true } },
    },
  })

  return NextResponse.json({ parcelamentos })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    contribuinteId: z.string(),
    dividaAtivaId:  z.string().optional(),
    valorOriginal:  z.number().min(0),
    valorEntrada:   z.number().default(0),
    totalParcelas:  z.number().int().min(1).max(60),
    diaVencimento:  z.number().int().min(1).max(28).default(10),
    gerarDAMs:      z.boolean().default(true),   // criar DAMs para cada parcela
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const saldo = d.valorOriginal - d.valorEntrada
  if (saldo <= 0) return NextResponse.json({ erro: 'Valor de entrada maior que a dívida' }, { status: 400 })

  // Calcular valor da parcela com juros simples
  const jurosTotal   = saldo * JUROS_PARCELAMENTO * d.totalParcelas
  const totalComJuros = saldo + jurosTotal
  const valorParcela  = totalComJuros / d.totalParcelas

  const numero = await gerarNumeroParcelmamento(usuario.municipioId)

  // Data de vencimento: próximo diaVencimento
  const hoje = new Date()
  let dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), d.diaVencimento)
  if (dataInicio <= hoje) dataInicio.setMonth(dataInicio.getMonth() + 1)

  const dataVencimentoFinal = new Date(dataInicio)
  dataVencimentoFinal.setMonth(dataVencimentoFinal.getMonth() + d.totalParcelas - 1)

  const parcelamento = await prisma.$transaction(async tx => {
    const parc = await tx.parcelamento.create({
      data: {
        municipioId:    usuario.municipioId,
        numero,
        contribuinteId: d.contribuinteId,
        dividaAtivaId:  d.dividaAtivaId,
        valorTotal:     totalComJuros + d.valorEntrada,
        valorEntrada:   d.valorEntrada,
        valorParcela,
        totalParcelas:  d.totalParcelas,
        dataInicio,
        dataVencimento: dataVencimentoFinal,
        diaVencimento:  d.diaVencimento,
        situacao:       'ATIVO',
        usuarioId:      usuario.id,
      },
    })

    // Gerar DAMs para cada parcela
    if (d.gerarDAMs) {
      for (let i = 1; i <= d.totalParcelas; i++) {
        const venc = new Date(dataInicio)
        venc.setMonth(venc.getMonth() + (i - 1))

        const anoDAM = new Date().getFullYear()
        const countDAM = await tx.dAM.count({
          where: { municipioId: usuario.municipioId, numero: { startsWith: `DAM-${anoDAM}-` } },
        })
        const numDAM = `DAM-${anoDAM}-${String(countDAM + 1).padStart(5, '0')}`

        await tx.dAM.create({
          data: {
            municipioId:    usuario.municipioId,
            numero:         numDAM,
            parcelamentoId: parc.id,
            parcelaNumero:  i,
            valorPrincipal: valorParcela,
            valorTotal:     valorParcela,
            dataVencimento: venc,
            situacao:       'AGUARDANDO',
            usuarioId:      usuario.id,
          },
        })
      }
    }

    // Atualizar situação da dívida ativa
    if (d.dividaAtivaId) {
      await tx.dividaAtiva.update({
        where: { id: d.dividaAtivaId },
        data: { situacao: 'PARCELADA' },
      })
      await tx.movimentacaoDA.create({
        data: {
          municipioId: usuario.municipioId,
          dividaId:    d.dividaAtivaId,
          tipo:        'PARCELAMENTO',
          valor:       totalComJuros,
          descricao:   `Parcelamento em ${d.totalParcelas}x — ${numero}`,
          usuarioId:   usuario.id,
        },
      })
    }

    return parc
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'CRIAR_PARCELAMENTO', entidade: 'Parcelamento', entidadeId: parcelamento.id,
    detalhes: { numero, totalParcelas: d.totalParcelas, valorParcela },
  })

  return NextResponse.json({ parcelamento, valorParcela, totalComJuros }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, ...extras } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const parc = await prisma.parcelamento.findFirst({
    where: { id, municipioId: usuario.municipioId },
  })
  if (!parc) return NextResponse.json({ erro: 'Parcelamento não encontrado' }, { status: 404 })

  const data: any = { atualizadoEm: new Date() }

  if (acao === 'RESCINDIR') {
    data.situacao = 'RESCINDIDO'
    // Reativar dívida ativa
    if (parc.dividaAtivaId) {
      await prisma.dividaAtiva.update({
        where: { id: parc.dividaAtivaId },
        data: { situacao: 'ATIVA' },
      })
      await prisma.movimentacaoDA.create({
        data: {
          municipioId: usuario.municipioId,
          dividaId:    parc.dividaAtivaId,
          tipo:        'INSCRICAO',
          descricao:   `Parcelamento ${parc.numero} rescindido por inadimplência`,
          usuarioId:   usuario.id,
        },
      })
    }
  } else if (acao === 'CANCELAR') {
    data.situacao = 'CANCELADO'
  }

  const atualizado = await prisma.parcelamento.update({ where: { id }, data })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: acao ?? 'ATUALIZAR_PARCELAMENTO', entidade: 'Parcelamento', entidadeId: id,
  })

  return NextResponse.json({ parcelamento: atualizado })
}
