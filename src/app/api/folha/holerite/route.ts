import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Folha — Holerites ────────────────────────────────────────────────────────
// Regras de cálculo automático:
//
// INSS (regime RPPS municipal):
//   Portaria MF — faixas progressivas (2024):
//   Até R$ 1.412,00 → 7,5%
//   R$ 1.412,01 a R$ 2.666,68 → 9%
//   R$ 2.666,69 a R$ 4.000,03 → 12%
//   R$ 4.000,04 a R$ 7.786,02 → 14%
//   (teto: R$ 908,86)
//
// IRPF (Tabela Progressiva 2024 — Lei 11.482/2007 atualizada):
//   Até R$ 2.824,00 → isento
//   R$ 2.824,01 a R$ 3.751,05 → 7,5%  (dedução R$ 211,80)
//   R$ 3.751,06 a R$ 4.664,68 → 15%   (dedução R$ 492,86)
//   R$ 4.664,69 a R$ 5.831,70 → 22,5% (dedução R$ 843,21)
//   Acima de R$ 5.831,70 → 27,5%      (dedução R$ 1.135,02)
//   Dedução por dependente: R$ 189,59

// ── Tabelas de cálculo ────────────────────────────────────────────────────────
const FAIXAS_INSS = [
  { ate: 1412.00,  aliq: 0.075 },
  { ate: 2666.68,  aliq: 0.09  },
  { ate: 4000.03,  aliq: 0.12  },
  { ate: 7786.02,  aliq: 0.14  },
]
const TETO_INSS = 908.86

const FAIXAS_IRPF = [
  { ate: 2824.00,  aliq: 0,     deducao: 0       },
  { ate: 3751.05,  aliq: 0.075, deducao: 211.80  },
  { ate: 4664.68,  aliq: 0.15,  deducao: 492.86  },
  { ate: 5831.70,  aliq: 0.225, deducao: 843.21  },
  { ate: Infinity, aliq: 0.275, deducao: 1135.02 },
]
const DEDUCAO_DEPENDENTE = 189.59
const FGTS_ALIQ = 0.08

function calcINSS(base: number): number {
  let inss = 0
  let baseRestante = Math.min(base, 7786.02)
  let limiteAnterior = 0

  for (const f of FAIXAS_INSS) {
    if (baseRestante <= limiteAnterior) break
    const faixaBase = Math.min(baseRestante, f.ate) - limiteAnterior
    if (faixaBase <= 0) break
    inss += faixaBase * f.aliq
    limiteAnterior = f.ate
    if (baseRestante <= f.ate) break
  }

  return Math.min(Number(inss.toFixed(2)), TETO_INSS)
}

function calcIRPF(base: number, numDependentes: number = 0): number {
  const baseAjustada = base - numDependentes * DEDUCAO_DEPENDENTE
  if (baseAjustada <= 0) return 0

  for (const f of FAIXAS_IRPF) {
    if (baseAjustada <= f.ate) {
      const irpf = baseAjustada * f.aliq - f.deducao
      return Math.max(0, Number(irpf.toFixed(2)))
    }
  }
  return 0
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const competenciaId = searchParams.get('competenciaId')
  const servidorId    = searchParams.get('servidorId')
  const id            = searchParams.get('id')

  // Holerite individual com itens
  if (id) {
    const holerite = await prisma.folhaHolerite.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        itens: {
          include: { rubrica: { select: { codigo: true, nome: true, tipo: true } } },
          orderBy: [{ tipo: 'asc' }, { rubrica: { codigo: 'asc' } }],
        },
        competencia: { select: { mes: true, ano: true, status: true } },
      },
    })
    if (!holerite) return NextResponse.json({ erro: 'Holerite não encontrado' }, { status: 404 })
    return NextResponse.json({ holerite })
  }

  if (!competenciaId) return NextResponse.json({ erro: 'competenciaId obrigatório' }, { status: 400 })

  const where: any = { municipioId: usuario.municipioId, competenciaId }
  if (servidorId) where.servidorId = servidorId

  const holerites = await prisma.folhaHolerite.findMany({
    where,
    orderBy: { nomeServidor: 'asc' },
    select: {
      id: true, matricula: true, nomeServidor: true, cargo: true, lotacao: true,
      regimeJuridico: true, totalProventos: true, totalDescontos: true, totalLiquido: true,
      diasTrabalhados: true, diasFaltas: true, status: true,
    },
  })

  return NextResponse.json({ holerites, total: holerites.length })
}

// ── POST: criar ou recalcular holerite ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    competenciaId:  z.string(),
    servidorId:     z.string(),
    matricula:      z.string(),
    nomeServidor:   z.string(),
    cargo:          z.string().optional(),
    lotacao:        z.string().optional(),
    regimeJuridico: z.enum(['ESTATUTARIO', 'CLT', 'COMISSIONADO', 'ESTAGIARIO']).default('ESTATUTARIO'),
    diasTrabalhados: z.number().int().min(0).max(31).default(30),
    diasFaltas:     z.number().int().min(0).max(31).default(0),
    diasAfastamento: z.number().int().min(0).max(31).default(0),
    numDependentes: z.number().int().min(0).default(0),
    // Itens manuais (rubricas variáveis)
    itens: z.array(z.object({
      rubricaId: z.string(),
      valor:     z.number(),
      referencia: z.string().optional(),
    })),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  // Verificar competência
  const comp = await prisma.folhaCompetencia.findFirst({
    where: { id: d.competenciaId, municipioId: usuario.municipioId },
  })
  if (!comp) return NextResponse.json({ erro: 'Competência não encontrada' }, { status: 404 })
  if (comp.status === 'FECHADA') return NextResponse.json({ erro: 'Competência já fechada' }, { status: 409 })

  // Buscar rubricas para cálculo automático
  const rubricas = await prisma.folhaRubrica.findMany({
    where: { municipioId: usuario.municipioId, ativo: true },
  })
  const rubricaMap = Object.fromEntries(rubricas.map(r => [r.id, r]))
  const rubricaCodigo = Object.fromEntries(rubricas.map(r => [r.codigo, r]))

  // Calcular proventos dos itens manuais
  let totalProventos = 0
  let baseInss = 0
  let baseIrpf = 0
  let baseFgts = 0

  const itensFinal: Array<{ rubricaId: string; valor: number; tipo: string; referencia?: string }> = []

  for (const item of d.itens) {
    const rubrica = rubricaMap[item.rubricaId]
    if (!rubrica) continue

    // Proporcional por dias trabalhados (se aplicável)
    const valorProporcional = d.diasFaltas > 0
      ? Number((item.valor * (d.diasTrabalhados / 30)).toFixed(2))
      : item.valor

    itensFinal.push({ rubricaId: item.rubricaId, valor: valorProporcional, tipo: rubrica.tipo, referencia: item.referencia })

    if (rubrica.tipo === 'PROVENTO') {
      totalProventos += valorProporcional
      if (rubrica.incideInss) baseInss += valorProporcional
      if (rubrica.incideIrpf) baseIrpf += valorProporcional
      if (rubrica.incideFgts) baseFgts += valorProporcional
    }
  }

  // Calcular INSS automático
  const valorInss = calcINSS(baseInss)
  const rubricaInss = rubricaCodigo['1001']
  if (rubricaInss && valorInss > 0) {
    itensFinal.push({ rubricaId: rubricaInss.id, valor: valorInss, tipo: 'DESCONTO', referencia: `Base: R$ ${baseInss.toFixed(2)}` })
  }

  // Base IRPF = base bruta - INSS
  const baseIrpfLiquida = Math.max(0, baseIrpf - valorInss)
  const valorIrpf = calcIRPF(baseIrpfLiquida, d.numDependentes)
  const rubricaIrpf = rubricaCodigo['1002']
  if (rubricaIrpf && valorIrpf > 0) {
    itensFinal.push({ rubricaId: rubricaIrpf.id, valor: valorIrpf, tipo: 'DESCONTO', referencia: `Base: R$ ${baseIrpfLiquida.toFixed(2)} / ${d.numDependentes} dep.` })
  }

  // FGTS (informativo — apenas CLT)
  if (d.regimeJuridico === 'CLT') {
    const valorFgts = Number((baseFgts * FGTS_ALIQ).toFixed(2))
    const rubricaFgts = rubricaCodigo['2001']
    if (rubricaFgts && valorFgts > 0) {
      itensFinal.push({ rubricaId: rubricaFgts.id, valor: valorFgts, tipo: 'INFORMATIVO', referencia: `Base: R$ ${baseFgts.toFixed(2)} × 8%` })
    }
  }

  // Totais finais
  const totalDescontos = itensFinal
    .filter(i => i.tipo === 'DESCONTO')
    .reduce((s, i) => s + i.valor, 0)
  const totalLiquido = totalProventos - totalDescontos

  // Upsert holerite
  const holerite = await prisma.$transaction(async tx => {
    // Remover holerite anterior se existir
    const anterior = await tx.folhaHolerite.findUnique({
      where: { competenciaId_servidorId: { competenciaId: d.competenciaId, servidorId: d.servidorId } },
    })
    if (anterior) {
      await tx.folhaHoleriteItem.deleteMany({ where: { holeriteId: anterior.id } })
      await tx.folhaHolerite.delete({ where: { id: anterior.id } })
    }

    const novo = await tx.folhaHolerite.create({
      data: {
        municipioId: usuario.municipioId,
        competenciaId: d.competenciaId,
        servidorId: d.servidorId,
        matricula: d.matricula,
        nomeServidor: d.nomeServidor,
        cargo: d.cargo,
        lotacao: d.lotacao,
        regimeJuridico: d.regimeJuridico,
        diasTrabalhados: d.diasTrabalhados,
        diasFaltas: d.diasFaltas,
        diasAfastamento: d.diasAfastamento,
        totalProventos, totalDescontos, totalLiquido,
        baseInss, baseIrpf: baseIrpfLiquida, baseFgts,
        status: 'CALCULADO',
        itens: {
          create: itensFinal.map(i => ({
            rubricaId: i.rubricaId,
            valor: i.valor,
            tipo: i.tipo as any,
            referencia: i.referencia,
          })),
        },
      },
    })

    return novo
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'HOLERITE_CALCULADO', entidade: 'FolhaHolerite', entidadeId: holerite.id,
    detalhes: { servidorId: d.servidorId, totalLiquido },
  })

  return NextResponse.json({ holerite, totalProventos, totalDescontos, totalLiquido, valorInss, valorIrpf }, { status: 201 })
}

// ── PATCH: estornar holerite ──────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const holerite = await prisma.folhaHolerite.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!holerite) return NextResponse.json({ erro: 'Holerite não encontrado' }, { status: 404 })

  if (acao === 'ESTORNAR') {
    // Verificar se competência está aberta
    const comp = await prisma.folhaCompetencia.findFirst({ where: { id: holerite.competenciaId } })
    if (comp?.status === 'FECHADA') return NextResponse.json({ erro: 'Não é possível estornar holerite de folha fechada' }, { status: 409 })

    await prisma.folhaHolerite.update({ where: { id }, data: { status: 'ESTORNADO' } })
    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: 'HOLERITE_ESTORNADO', entidade: 'FolhaHolerite', entidadeId: id,
      detalhes: { matricula: holerite.matricula },
    })
    return NextResponse.json({ sucesso: true })
  }

  return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
}
