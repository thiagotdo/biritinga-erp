import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Benefícios ───────────────────────────────────────────────────────────────
// LOAS Art. 20 — BPC (1 salário mínimo): idoso ≥65 anos OU PcD com renda per capita ≤ 1/4 SM
// LOAS Art. 22 — Benefícios Eventuais: natalidade, morte, calamidade
// Lei 10.836/2004 — Bolsa Família

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const familiaId = searchParams.get('familiaId')
  const tipo      = searchParams.get('tipo')
  const situacao  = searchParams.get('situacao')
  const relatorio = searchParams.get('relatorio')

  if (relatorio === 'CONSOLIDADO') {
    // Consolidado de benefícios por tipo
    const consolidado = await prisma.beneficioFamilia.groupBy({
      by: ['tipo', 'situacao'],
      where: { municipioId: usuario.municipioId },
      _count: true,
      _sum: { valor: true },
    })

    // Benefícios a vencer nos próximos 30 dias
    const em30dias = new Date()
    em30dias.setDate(em30dias.getDate() + 30)
    const aVencer = await prisma.beneficioFamilia.count({
      where: {
        municipioId: usuario.municipioId,
        situacao: 'ATIVO',
        dataVencimento: { lte: em30dias, gte: new Date() },
      },
    })

    return NextResponse.json({ consolidado, aVencer })
  }

  const where: any = { municipioId: usuario.municipioId }
  if (familiaId) where.familiaId = familiaId
  if (tipo)      where.tipo      = tipo
  if (situacao)  where.situacao  = situacao

  const beneficios = await prisma.beneficioFamilia.findMany({
    where, orderBy: { criadoEm: 'desc' }, take: 500,
    include: {
      familia: { select: { responsavelNome: true, numeroProntuario: true } },
    },
  })

  return NextResponse.json({ beneficios, total: beneficios.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    familiaId:   z.string(),
    tipo:        z.enum([
      'BPC_IDOSO','BPC_PCD','BOLSA_FAMILIA','AUXILIO_BRASIL',
      'VALE_GAS','BENEFICIO_EVENTUAL','BENEFICIO_MUNICIPAL','OUTRO',
    ]),
    descricao:   z.string().optional(),
    valor:       z.number().min(0).optional(),
    dataConcessao:  z.string().optional(),
    dataVencimento: z.string().optional(),
    referenciaExterna: z.string().optional(),
    observacoes: z.string().optional(),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  // Verificar que família pertence ao município
  const familia = await prisma.familiaReferenciada.findFirst({
    where: { id: d.familiaId, municipioId: usuario.municipioId },
    select: { responsavelNome: true },
  })
  if (!familia) return NextResponse.json({ erro: 'Família não encontrada' }, { status: 404 })

  const beneficio = await prisma.beneficioFamilia.create({
    data: {
      municipioId: usuario.municipioId,
      ...d,
      dataConcessao:  d.dataConcessao  ? new Date(d.dataConcessao)  : new Date(),
      dataVencimento: d.dataVencimento ? new Date(d.dataVencimento) : undefined,
      usuarioId: usuario.id,
    },
  })

  // Atualizar flags na família
  const flagMap: Record<string, Partial<{ bolsaFamilia: boolean; bpc: boolean }>> = {
    BOLSA_FAMILIA:  { bolsaFamilia: true },
    AUXILIO_BRASIL: { bolsaFamilia: true },
    BPC_IDOSO:      { bpc: true },
    BPC_PCD:        { bpc: true },
  }
  const flags = flagMap[d.tipo]
  if (flags) {
    await prisma.familiaReferenciada.update({ where: { id: d.familiaId }, data: flags })
  }

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'CONCEDER_BENEFICIO', entidade: 'BeneficioFamilia', entidadeId: beneficio.id,
    detalhes: { familia: familia.responsavelNome, tipo: d.tipo, valor: d.valor },
  })

  return NextResponse.json({ beneficio }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, motivo } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const benef = await prisma.beneficioFamilia.findFirst({
    where: { id, municipioId: usuario.municipioId },
  })
  if (!benef) return NextResponse.json({ erro: 'Benefício não encontrado' }, { status: 404 })

  if (acao === 'SUSPENDER') {
    await prisma.beneficioFamilia.update({ where: { id }, data: { situacao: 'SUSPENSO' } })
  } else if (acao === 'REVOGAR') {
    await prisma.beneficioFamilia.update({
      where: { id },
      data: { situacao: 'CANCELADO', dataRevogacao: new Date(), motivoRevogacao: motivo },
    })
  } else if (acao === 'REATIVAR') {
    await prisma.beneficioFamilia.update({ where: { id }, data: { situacao: 'ATIVO' } })
  } else {
    return NextResponse.json({ erro: 'Ação inválida. Use SUSPENDER, REVOGAR ou REATIVAR' }, { status: 400 })
  }

  return NextResponse.json({ sucesso: true })
}
