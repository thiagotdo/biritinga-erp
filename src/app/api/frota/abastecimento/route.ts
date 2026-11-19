import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'

export const runtime = 'nodejs'

// ─── Abastecimentos ───────────────────────────────────────────────────────────
// Registra cada abastecimento e calcula consumo km/L automaticamente
// comparando com o último hodômetro registrado para o veículo.

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const veiculoId = searchParams.get('veiculoId')
  const relatorio = searchParams.get('relatorio')
  const dataInicio = searchParams.get('dataInicio')
  const dataFim    = searchParams.get('dataFim')
  const mes        = searchParams.get('mes')   // "2026-11"

  if (relatorio === 'CONSOLIDADO') {
    // Relatório por veículo — período
    const inicioPeriodo = mes
      ? new Date(`${mes}-01T00:00:00`)
      : dataInicio ? new Date(dataInicio) : new Date(new Date().setDate(1))
    const fimPeriodo = mes
      ? new Date(new Date(`${mes}-01`).setMonth(new Date(`${mes}-01`).getMonth() + 1))
      : dataFim ? new Date(dataFim + 'T23:59:59') : new Date()

    const abast = await prisma.abastecimento.findMany({
      where: { municipioId: usuario.municipioId, dataAbast: { gte: inicioPeriodo, lte: fimPeriodo } },
      include: { veiculo: { select: { placa: true, modelo: true, tipo: true } } },
      orderBy: { dataAbast: 'desc' },
    })

    // Agrupa por veículo
    const porVeiculo: Record<string, any> = {}
    for (const a of abast) {
      if (!porVeiculo[a.veiculoId]) {
        porVeiculo[a.veiculoId] = {
          veiculoId: a.veiculoId,
          placa: a.veiculo.placa,
          modelo: a.veiculo.modelo,
          tipo: a.veiculo.tipo,
          totalLitros: 0,
          totalGasto: 0,
          qtdAbast: 0,
          kmRodados: 0,
          consumoMedio: null,
        }
      }
      const v = porVeiculo[a.veiculoId]
      v.totalLitros += Number(a.litros)
      v.totalGasto  += Number(a.valorTotal)
      v.qtdAbast    += 1
      v.kmRodados   += a.kmRodados ?? 0
    }

    const lista = Object.values(porVeiculo).map((v: any) => ({
      ...v,
      totalLitros: v.totalLitros.toFixed(3),
      totalGasto:  v.totalGasto.toFixed(2),
      consumoMedio: v.kmRodados > 0 && v.totalLitros > 0
        ? (v.kmRodados / v.totalLitros).toFixed(2)
        : null,
    }))

    const totais = lista.reduce((acc: any, v: any) => ({
      totalLitros: acc.totalLitros + Number(v.totalLitros),
      totalGasto:  acc.totalGasto  + Number(v.totalGasto),
    }), { totalLitros: 0, totalGasto: 0 })

    return NextResponse.json({ consolidado: lista, totais, periodo: { inicioPeriodo, fimPeriodo } })
  }

  const where: any = { municipioId: usuario.municipioId }
  if (veiculoId) where.veiculoId = veiculoId
  if (dataInicio || dataFim) {
    where.dataAbast = {
      ...(dataInicio ? { gte: new Date(dataInicio) } : {}),
      ...(dataFim    ? { lte: new Date(dataFim + 'T23:59:59') } : {}),
    }
  }

  const abastecimentos = await prisma.abastecimento.findMany({
    where, orderBy: { dataAbast: 'desc' }, take: 200,
    include: {
      veiculo: { select: { placa: true, modelo: true } },
    },
  })

  return NextResponse.json({ abastecimentos, total: abastecimentos.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    veiculoId:   z.string(),
    motoristaId: z.string().optional(),
    dataAbast:   z.string(),
    hodometro:   z.number().int().min(0),
    combustivel: z.enum(['GASOLINA','ETANOL','DIESEL','DIESEL_S10','GNV','FLEX','ELETRICO','HIBRIDO']),
    litros:      z.number().min(0.1),
    valorLitro:  z.number().min(0.01),
    posto:       z.string().optional(),
    nfNumero:    z.string().optional(),
    observacoes: z.string().optional(),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const veiculo = await prisma.veiculo.findFirst({ where: { id: d.veiculoId, municipioId: usuario.municipioId } })
  if (!veiculo) return NextResponse.json({ erro: 'Veículo não encontrado' }, { status: 404 })

  if (d.hodometro < veiculo.hodometro) {
    return NextResponse.json({ erro: `Hodômetro menor que o atual (${veiculo.hodometro} km)` }, { status: 409 })
  }

  // Busca último abastecimento para calcular km rodados e consumo
  const ultimoAbast = await prisma.abastecimento.findFirst({
    where: { veiculoId: d.veiculoId },
    orderBy: { hodometro: 'desc' },
    select: { hodometro: true },
  })

  const kmRodados = ultimoAbast ? d.hodometro - ultimoAbast.hodometro : undefined
  const valorTotal = Number((d.litros * d.valorLitro).toFixed(2))
  const consumoKmL = kmRodados && kmRodados > 0
    ? Number((kmRodados / d.litros).toFixed(2))
    : undefined

  // Registra abastecimento e atualiza hodômetro do veículo em transaction
  const abastecimento = await prisma.$transaction(async (tx) => {
    const abast = await tx.abastecimento.create({
      data: {
        municipioId: usuario.municipioId,
        ...d,
        dataAbast: new Date(d.dataAbast),
        valorTotal,
        kmRodados,
        consumoKmL,
        usuarioId: usuario.id,
      },
    })

    // Atualiza hodômetro do veículo se avançou
    if (d.hodometro > veiculo.hodometro) {
      await tx.veiculo.update({
        where: { id: d.veiculoId },
        data: { hodometro: d.hodometro },
      })
    }

    return abast
  })

  return NextResponse.json({ abastecimento, valorTotal, kmRodados, consumoKmL }, { status: 201 })
}
