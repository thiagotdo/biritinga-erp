import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const pacienteId = searchParams.get('pacienteId')
  const vacinaId   = searchParams.get('vacinaId')
  const unidade    = searchParams.get('unidade')
  const relatorio  = searchParams.get('relatorio')
  const data       = searchParams.get('data')
  const busca      = searchParams.get('busca')

  // ── Dashboard / cobertura vacinal ─────────────────────────────────────────
  if (relatorio === 'DASHBOARD') {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const mesInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

    const [totalHoje, totalMes, porVacina, estoquesCriticos] = await Promise.all([
      prisma.vacinacao.count({
        where: {
          municipioId: usuario.municipioId,
          situacao: 'APLICADA',
          dataAplicacao: { gte: hoje },
        },
      }),
      prisma.vacinacao.count({
        where: {
          municipioId: usuario.municipioId,
          situacao: 'APLICADA',
          dataAplicacao: { gte: mesInicio },
        },
      }),
      prisma.vacinacao.groupBy({
        by: ['vacinaId'],
        where: {
          municipioId: usuario.municipioId,
          situacao: 'APLICADA',
          dataAplicacao: { gte: mesInicio },
        },
        _count: true,
        orderBy: { _count: { vacinaId: 'desc' } },
        take: 10,
      }),
      prisma.estoqueVacina.findMany({
        where: { municipioId: usuario.municipioId },
        include: { vacina: { select: { nome: true } } },
      }),
    ])

    // Enriquecer porVacina com nome
    const vacinasIds = porVacina.map(p => p.vacinaId)
    const vacinas = await prisma.vacina.findMany({
      where: { id: { in: vacinasIds } },
      select: { id: true, nome: true },
    })
    const vacinasMap = Object.fromEntries(vacinas.map(v => [v.id, v.nome]))
    const porVacinaEnrich = porVacina.map(p => ({ ...p, nomeVacina: vacinasMap[p.vacinaId] ?? p.vacinaId }))

    const estoquesCrit = estoquesCriticos.filter(e => e.quantidadeAtual <= e.quantidadeMinima)
    const vencendo30 = estoquesCriticos.filter(e =>
      new Date(e.dataValidade) <= new Date(Date.now() + 30 * 86400000) &&
      new Date(e.dataValidade) >= new Date()
    )

    return NextResponse.json({
      kpis: { totalHoje, totalMes, estoquesCriticos: estoquesCrit.length, vencendo30: vencendo30.length },
      porVacina: porVacinaEnrich,
      alertasEstoque: estoquesCrit.map(e => ({ nome: e.vacina.nome, qtd: e.quantidadeAtual, min: e.quantidadeMinima })),
    })
  }

  // ── Carteira vacinal do paciente ──────────────────────────────────────────
  if (pacienteId) {
    const vacinacoes = await prisma.vacinacao.findMany({
      where: { pacienteId, municipioId: usuario.municipioId },
      orderBy: { dataAplicacao: 'asc' },
      include: { vacina: { select: { nome: true, esquema: true, indicacaoFaixa: true } } },
    })

    // Lista de todas as vacinas (para mostrar não aplicadas)
    const todasVacinas = await prisma.vacina.findMany({
      where: { municipioId: usuario.municipioId, ativo: true },
    })

    // Montar carteira
    const carteira = todasVacinas.map(v => ({
      vacina: v,
      doses: vacinacoes.filter(vac => vac.vacinaId === v.id),
    }))

    return NextResponse.json({ vacinacoes, carteira })
  }

  // ── Estoque de vacinas ────────────────────────────────────────────────────
  if (searchParams.get('aba') === 'estoque') {
    const where: any = { municipioId: usuario.municipioId }
    if (unidade) where.unidadeSaude = unidade
    if (busca) where.vacina = { nome: { contains: busca } }

    const estoques = await prisma.estoqueVacina.findMany({
      where,
      include: { vacina: true },
      orderBy: { dataValidade: 'asc' },
    })

    return NextResponse.json({
      estoques: estoques.map(e => ({
        ...e,
        critico:  e.quantidadeAtual <= e.quantidadeMinima,
        vencendo: new Date(e.dataValidade) <= new Date(Date.now() + 30 * 86400000),
        vencido:  new Date(e.dataValidade) < new Date(),
      })),
    })
  }

  // ── Lista geral ───────────────────────────────────────────────────────────
  const where: any = { municipioId: usuario.municipioId }
  if (vacinaId) where.vacinaId = vacinaId
  if (unidade)  where.unidadeSaude = unidade
  if (data) {
    const d = new Date(data); d.setHours(0, 0, 0, 0)
    const d2 = new Date(d); d2.setDate(d2.getDate() + 1)
    where.dataAplicacao = { gte: d, lt: d2 }
  }

  const vacinacoes = await prisma.vacinacao.findMany({
    where,
    orderBy: { dataAplicacao: 'desc' },
    take: 100,
    include: {
      paciente: { select: { nomeCompleto: true, dataNascimento: true, cns: true } },
      vacina:   { select: { nome: true } },
    },
  })

  return NextResponse.json({ vacinacoes })
}

const SchemaVacinacao = z.object({
  pacienteId:      z.string(),
  vacinaId:        z.string(),
  dose:            z.string(),
  lote:            z.string().optional(),
  dataAplicacao:   z.string(),
  unidadeSaude:    z.string().min(2),
  profissionalNome:z.string().optional(),
  localAplicacao:  z.string().optional(),
  situacao:        z.string().default('APLICADA'),
  motivoContraindicacao: z.string().optional(),
  motivoRecusa:    z.string().optional(),
  observacoes:     z.string().optional(),
  estoqueId:       z.string().optional(),   // para baixar estoque
})

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { tipo, ...dados } = body

  // ── Registrar vacina no catálogo ──────────────────────────────────────────
  if (tipo === 'VACINA') {
    const SchemaVacina = z.object({
      nome:           z.string().min(2),
      fabricante:     z.string().optional(),
      esquema:        z.string().optional(),
      indicacaoFaixa: z.string().optional(),
      viaAplicacao:   z.string().optional(),
      doseML:         z.number().optional(),
      observacoes:    z.string().optional(),
    })
    const val = SchemaVacina.safeParse(dados)
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
    const d = val.data

    const vacina = await prisma.vacina.create({
      data: { municipioId: usuario.municipioId, ...d, usuarioId: usuario.id } as any,
    })
    return NextResponse.json({ vacina }, { status: 201 })
  }

  // ── Entrada de estoque de vacina ──────────────────────────────────────────
  if (tipo === 'ENTRADA_ESTOQUE') {
    const SchemaEst = z.object({
      vacinaId:       z.string(),
      unidadeSaude:   z.string(),
      lote:           z.string(),
      dataFabricacao: z.string().optional(),
      dataValidade:   z.string(),
      quantidade:     z.number().int().positive(),
      quantidadeMinima:z.number().int().default(5),
    })
    const val = SchemaEst.safeParse(dados)
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
    const d = val.data

    const estoque = await prisma.estoqueVacina.upsert({
      where: {
        municipioId_vacinaId_unidadeSaude_lote: {
          municipioId: usuario.municipioId,
          vacinaId: d.vacinaId,
          unidadeSaude: d.unidadeSaude,
          lote: d.lote,
        },
      },
      update: { quantidadeAtual: { increment: d.quantidade } },
      create: {
        municipioId:     usuario.municipioId,
        vacinaId:        d.vacinaId,
        unidadeSaude:    d.unidadeSaude,
        lote:            d.lote,
        dataFabricacao:  d.dataFabricacao ? new Date(d.dataFabricacao) : undefined,
        dataValidade:    new Date(d.dataValidade),
        quantidadeAtual: d.quantidade,
        quantidadeMinima:d.quantidadeMinima,
      },
    })

    return NextResponse.json({ estoque }, { status: 201 })
  }

  // ── Registrar aplicação ───────────────────────────────────────────────────
  const val = SchemaVacinacao.safeParse(dados)
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  // Baixar estoque se aplicada e estoqueId informado
  const vacinacao = await prisma.$transaction(async tx => {
    if (d.situacao === 'APLICADA' && d.estoqueId) {
      const est = await tx.estoqueVacina.findFirst({
        where: { id: d.estoqueId, municipioId: usuario.municipioId },
      })
      if (!est) throw new Error('Estoque de vacina não encontrado')
      if (est.quantidadeAtual < 1) throw new Error('Estoque zerado para esta vacina/lote')
      await tx.estoqueVacina.update({
        where: { id: d.estoqueId },
        data: { quantidadeAtual: { decrement: 1 } },
      })
    }

    return tx.vacinacao.create({
      data: {
        municipioId:           usuario.municipioId,
        pacienteId:            d.pacienteId,
        vacinaId:              d.vacinaId,
        situacao:              d.situacao as any,
        dose:                  d.dose,
        lote:                  d.lote,
        dataAplicacao:         new Date(d.dataAplicacao),
        unidadeSaude:          d.unidadeSaude,
        profissionalNome:      d.profissionalNome,
        localAplicacao:        d.localAplicacao,
        motivoContraindicacao: d.motivoContraindicacao,
        motivoRecusa:          d.motivoRecusa,
        observacoes:           d.observacoes,
        usuarioId:             usuario.id,
      },
    })
  }).catch(err => {
    throw new Error(err.message)
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'REGISTRAR_VACINACAO', entidade: 'Vacinacao', entidadeId: vacinacao.id,
    detalhes: { vacinaId: d.vacinaId, dose: d.dose, situacao: d.situacao },
  })

  return NextResponse.json({ vacinacao }, { status: 201 })
}
