import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Débitos, Pagamentos, Parcelamentos e Dívida Ativa ────────────────────────
// CTN Art.156 — extinção do crédito tributário (pagamento, compensação, etc.)
// CTN Art.174 — prescrição do crédito tributário: 5 anos da constituição
// CTN Art.201 — dívida ativa: crédito definitivamente constituído, não pago
// Lei 6.830/1980 — execução fiscal
// Lei 9.492/1997 — protesto extrajudicial de CDA
// Juros: SELIC ou taxa definida em lei municipal (geralmente 1%/mês)
// Multa mora: geralmente 2% sobre o principal
// Correção: IPCA ou IGPM (definição em lei municipal)

// Taxas de acréscimo (padrão municipal — deve ser confirmado com lei local)
const TAXA_MULTA_MORA = 0.02       // 2% sobre o principal
const TAXA_JUROS_MES  = 0.01       // 1% ao mês
// const TAXA_CORRECAO  = 0.004  // IPCA mensal médio (varia; usar tabela real)

function calcularAcrescimos(valorPrincipal: number, dataVencimento: Date, dataPagamento: Date = new Date()) {
  if (dataPagamento <= dataVencimento) {
    return { multa: 0, juros: 0, total: valorPrincipal }
  }

  const mesesAtraso = Math.max(0,
    (dataPagamento.getFullYear() - dataVencimento.getFullYear()) * 12
    + (dataPagamento.getMonth() - dataVencimento.getMonth())
    + (dataPagamento.getDate() >= dataVencimento.getDate() ? 0 : -1)
  )

  const multa  = valorPrincipal * TAXA_MULTA_MORA
  const juros  = valorPrincipal * TAXA_JUROS_MES * Math.max(mesesAtraso, 1)
  const total  = valorPrincipal + multa + juros

  return { multa, juros, total }
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id             = searchParams.get('id')
  const relatorio      = searchParams.get('relatorio')
  const contribuinteId = searchParams.get('contribuinteId')
  const situacao       = searchParams.get('situacao')
  const tipo           = searchParams.get('tipo')
  const vencidos       = searchParams.get('vencidos') // "true"

  if (relatorio === 'DASHBOARD') {
    const hoje = new Date()
    const anoAtual = hoje.getFullYear()

    const [totalAbertos, totalVencidos, divAtiva, parcelamentos, prescricao] = await Promise.all([
      prisma.lancamentoTributario.aggregate({
        where: { municipioId: usuario.municipioId, situacao: 'ABERTO', ativo: true },
        _sum: { valorSaldo: true }, _count: { id: true },
      }),
      prisma.lancamentoTributario.aggregate({
        where: {
          municipioId: usuario.municipioId,
          situacao: 'ABERTO',
          vencimento: { lt: hoje },
        },
        _sum: { valorTotal: true }, _count: { id: true },
      }),
      prisma.lancamentoTributario.aggregate({
        where: { municipioId: usuario.municipioId, situacao: { in: ['PROTESTADO', 'AJUIZADO'] } },
        _sum: { valorTotal: true }, _count: { id: true },
      }),
      prisma.lancamentoTributario.count({ where: { municipioId: usuario.municipioId, situacao: 'PARCELADO' } }),
      prisma.lancamentoTributario.count({
        where: {
          municipioId: usuario.municipioId,
          situacao: 'ABERTO',
          criadoEm: { lt: new Date(hoje.getTime() - 5 * 365 * 24 * 60 * 60 * 1000) }, // > 5 anos
        },
      }),
    ])

    // Arrecadação por tipo no ano
    const arrPorTipo = await prisma.pagamentoTributario.groupBy({
      by: ['lancamentoId'],
      where: {
        municipioId: usuario.municipioId,
        dataPagamento: { gte: new Date(`${anoAtual}-01-01`) },
      },
      _sum: { valorPago: true },
    })

    // Pagamentos últimos 30 dias
    const em30d = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000)
    const pagsRecentes = await prisma.pagamentoTributario.aggregate({
      where: { municipioId: usuario.municipioId, dataPagamento: { gte: em30d } },
      _sum: { valorPago: true }, _count: { id: true },
    })

    return NextResponse.json({
      kpis: {
        totalAbertos: Number(totalAbertos._sum.valorSaldo ?? 0),
        totalAbertosCount: totalAbertos._count.id,
        totalVencidos: Number(totalVencidos._sum.valorTotal ?? 0),
        totalVencidosCount: totalVencidos._count.id,
        divAtiva: Number(divAtiva._sum.valorTotal ?? 0),
        divAtivaCount: divAtiva._count.id,
        parcelamentos,
        prescricaoRisco: prescricao,
        pagsRecentes30d: Number(pagsRecentes._sum.valorPago ?? 0),
        pagsRecentesCount: pagsRecentes._count.id,
      },
    })
  }

  if (id) {
    const lanc = await prisma.lancamentoTributario.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        contribuinte: { select: { inscricaoMunicipal: true, nomeCompleto: true, razaoSocial: true } },
        imovel:       { select: { inscricaoImobiliaria: true, logradouro: true, numero: true } },
        pagamentos:   { orderBy: { dataPagamento: 'desc' } },
        parcelas:     { orderBy: { numeroParcela: 'asc' } },
      },
    })
    if (!lanc) return NextResponse.json({ erro: 'Lançamento não encontrado' }, { status: 404 })

    const { multa, juros, total } = calcularAcrescimos(
      Number(lanc.valorPrincipal), lanc.vencimento
    )

    return NextResponse.json({ lancamento: lanc, acrescimos: { multa, juros, totalAtualizado: total } })
  }

  // Lista de débitos
  const where: any = { municipioId: usuario.municipioId, ativo: true }
  if (contribuinteId) where.contribuinteId = contribuinteId
  if (situacao)       where.situacao       = situacao
  if (tipo)           where.tipoLancamento = tipo
  if (vencidos === 'true') {
    where.situacao   = 'ABERTO'
    where.vencimento = { lt: new Date() }
  }

  const lancamentos = await prisma.lancamentoTributario.findMany({
    where, orderBy: { vencimento: 'asc' }, take: 500,
    include: {
      contribuinte: { select: { inscricaoMunicipal: true, nomeCompleto: true, razaoSocial: true, nomeFantasia: true } },
      imovel:       { select: { inscricaoImobiliaria: true, logradouro: true } },
    },
  })

  const hoje = new Date()
  const enriched = lancamentos.map(l => {
    const vencido = l.vencimento < hoje && l.situacao === 'ABERTO'
    let acrescimos = { multa: 0, juros: 0, total: Number(l.valorSaldo) }
    if (vencido) {
      const calc = calcularAcrescimos(Number(l.valorPrincipal), l.vencimento)
      acrescimos = { multa: calc.multa, juros: calc.juros, total: calc.total - Number(l.valorPago) }
    }
    return { ...l, vencido, acrescimos }
  })

  return NextResponse.json({ lancamentos: enriched, total: enriched.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { acao, ...dados } = await req.json()

  // ── Registrar pagamento ───────────────────────────────────────────────────
  if (acao === 'PAGAR') {
    const Schema = z.object({
      lancamentoId:   z.string(),
      valorPago:      z.number().positive(),
      dataPagamento:  z.string().optional(),
      formaPagamento: z.string().default('PIX'),
      nossoNumero:    z.string().optional(),
      autenticacao:   z.string().optional(),
      origem:         z.string().optional(),
    })

    const val = Schema.safeParse(dados)
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
    const d = val.data

    const lanc = await prisma.lancamentoTributario.findFirst({
      where: { id: d.lancamentoId, municipioId: usuario.municipioId },
    })
    if (!lanc) return NextResponse.json({ erro: 'Lançamento não encontrado' }, { status: 404 })

    if (['PRESCRITO', 'CANCELADO'].includes(lanc.situacao)) {
      return NextResponse.json({ erro: `Lançamento ${lanc.situacao} — não aceita pagamento` }, { status: 409 })
    }

    const dataPagamento = d.dataPagamento ? new Date(d.dataPagamento) : new Date()
    const novoValorPago = Number(lanc.valorPago) + d.valorPago
    const novoSaldo     = Math.max(0, Number(lanc.valorTotal) - novoValorPago)
    const quitado       = novoSaldo <= 0.01 // tolerância centavo

    await prisma.$transaction(async (tx) => {
      await tx.pagamentoTributario.create({
        data: {
          municipioId:    usuario.municipioId,
          lancamentoId:   d.lancamentoId,
          dataPagamento,
          valorPago:      d.valorPago,
          formaPagamento: d.formaPagamento,
          nossoNumero:    d.nossoNumero,
          autenticacao:   d.autenticacao,
          origem:         d.origem ?? 'CAIXA_MUNICIPAL',
          usuarioId:      usuario.id,
        },
      })
      await tx.lancamentoTributario.update({
        where: { id: d.lancamentoId },
        data: {
          valorPago:   novoValorPago,
          valorSaldo:  novoSaldo,
          situacao:    quitado ? 'PAGO' : 'ABERTO',
        },
      })
    })

    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: 'REGISTRAR_PAGAMENTO', entidade: 'LancamentoTributario', entidadeId: d.lancamentoId,
      detalhes: { valorPago: d.valorPago, novoSaldo, quitado, formaPagamento: d.formaPagamento },
    })

    return NextResponse.json({ sucesso: true, novoSaldo, quitado })
  }

  // ── Parcelamento ──────────────────────────────────────────────────────────
  if (acao === 'PARCELAR') {
    const Schema = z.object({
      lancamentoId: z.string(),
      parcelas:     z.number().int().min(2).max(60),
      dataInicio:   z.string().optional(),
    })

    const val = Schema.safeParse(dados)
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
    const d = val.data

    const lanc = await prisma.lancamentoTributario.findFirst({
      where: { id: d.lancamentoId, municipioId: usuario.municipioId },
    })
    if (!lanc) return NextResponse.json({ erro: 'Lançamento não encontrado' }, { status: 404 })

    if (!['ABERTO', 'PROTESTADO'].includes(lanc.situacao)) {
      return NextResponse.json({ erro: 'Apenas lançamentos ABERTOS ou PROTESTADOS podem ser parcelados' }, { status: 409 })
    }

    // Calcula acréscimos até hoje (multa+juros consolidados no parcelamento)
    const { total: saldoComAcrescimos } = calcularAcrescimos(
      Number(lanc.valorPrincipal), lanc.vencimento
    )
    const saldoRestante = saldoComAcrescimos - Number(lanc.valorPago)
    const valorParcela  = saldoRestante / d.parcelas
    const inicio        = d.dataInicio ? new Date(d.dataInicio) : new Date()

    await prisma.$transaction(async (tx) => {
      // Cria parcelas
      await Promise.all(Array.from({ length: d.parcelas }, (_, i) => {
        const venc = new Date(inicio)
        venc.setMonth(venc.getMonth() + i + 1)
        venc.setDate(10)

        return tx.parcelamentoTributario.create({
          data: {
            municipioId:   usuario.municipioId,
            lancamentoId:  d.lancamentoId,
            numeroParcela: i + 1,
            totalParcelas: d.parcelas,
            vencimento:    venc,
            valorParcela,
          },
        })
      }))

      // Atualiza lançamento — consolida acréscimos
      await tx.lancamentoTributario.update({
        where: { id: d.lancamentoId },
        data: {
          situacao:    'PARCELADO',
          valorTotal:  saldoComAcrescimos,
          valorSaldo:  saldoRestante,
          valorMulta:  Number(lanc.valorMulta) + (saldoComAcrescimos - Number(lanc.valorTotal)),
        },
      })
    })

    return NextResponse.json({ sucesso: true, parcelas: d.parcelas, valorParcela, saldoTotal: saldoRestante })
  }

  // ── Inscrição em Dívida Ativa ─────────────────────────────────────────────
  if (acao === 'INSCREVER_DIVIDA') {
    const Schema = z.object({ lancamentoId: z.string() })
    const val = Schema.safeParse(dados)
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })

    const lanc = await prisma.lancamentoTributario.findFirst({
      where: { id: val.data.lancamentoId, municipioId: usuario.municipioId },
    })
    if (!lanc) return NextResponse.json({ erro: 'Lançamento não encontrado' }, { status: 404 })

    if (lanc.situacao !== 'ABERTO') {
      return NextResponse.json({ erro: 'Apenas lançamentos ABERTOS podem ser inscritos em dívida ativa' }, { status: 409 })
    }

    // Verifica se está vencido há mais de 90 dias (prática comum)
    const diasAtraso = Math.ceil((Date.now() - lanc.vencimento.getTime()) / (1000 * 60 * 60 * 24))
    if (diasAtraso < 90) {
      return NextResponse.json({ erro: `Vencimento há apenas ${diasAtraso} dias — aguarde 90 dias para inscrição em dívida ativa` }, { status: 409 })
    }

    const anoAtual = new Date().getFullYear()
    const countCda = await prisma.lancamentoTributario.count({ where: { municipioId: usuario.municipioId, datainscricaoCda: { not: null } } })
    const numeroCda = `CDA-${anoAtual}-${String(countCda + 1).padStart(5, '0')}`

    // Atualiza com acréscimos de dívida ativa
    const { multa, juros, total } = calcularAcrescimos(Number(lanc.valorPrincipal), lanc.vencimento)

    await prisma.lancamentoTributario.update({
      where: { id: val.data.lancamentoId },
      data: {
        situacao:          'PROTESTADO',
        numeroCda,
        datainscricaoCda:  new Date(),
        valorMulta:        multa,
        valorJuros:        juros,
        valorTotal:        total,
        valorSaldo:        total - Number(lanc.valorPago),
      },
    })

    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: 'INSCREVER_DIVIDA_ATIVA', entidade: 'LancamentoTributario', entidadeId: val.data.lancamentoId,
      detalhes: { numeroCda, valorTotal: total },
    })

    return NextResponse.json({ sucesso: true, numeroCda, valorTotal: total })
  }

  return NextResponse.json({ erro: `Ação '${acao}' não reconhecida` }, { status: 400 })
}
