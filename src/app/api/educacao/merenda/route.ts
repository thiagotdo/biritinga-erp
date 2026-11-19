import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'

export const runtime = 'nodejs'

// ─── Merenda Escolar / PNAE ───────────────────────────────────────────────────
// Lei 11.947/2009 — 30% do orçamento do PNAE deve ser de agricultura familiar.
// Fluxo: Cardápio semanal (planejado pelo nutricionista) → Refeição diária (executado)

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const escolaId  = searchParams.get('escolaId')
  const semana    = searchParams.get('semana')    // "2026-11-17" (segunda da semana)
  const relatorio = searchParams.get('relatorio')
  const mes       = searchParams.get('mes')
  const ano       = searchParams.get('ano')

  // Relatório PNAE — conformidade mensal com 30% agricultura familiar
  if (relatorio === 'PNAE') {
    const anoNum = Number(ano) || new Date().getFullYear()
    const mesNum = Number(mes) || new Date().getMonth() + 1

    const dataInicio = new Date(anoNum, mesNum - 1, 1)
    const dataFim    = new Date(anoNum, mesNum, 0, 23, 59, 59)

    const refeicoes = await prisma.refeicaoDiaria.findMany({
      where: {
        municipioId: usuario.municipioId,
        data: { gte: dataInicio, lte: dataFim },
      },
    })

    const totalRefeicoes      = refeicoes.reduce((s, r) => s + r.refeicoes, 0)
    const totalAlunos         = refeicoes.reduce((s, r) => s + r.totalAlunos, 0)
    const custoTotal          = refeicoes.reduce((s, r) => s + Number(r.custoTotal ?? 0), 0)
    const refComAgFamiliar    = refeicoes.filter(r => r.percentualAgFamiliar !== null)
    const mediaAgFamiliar     = refComAgFamiliar.length > 0
      ? refComAgFamiliar.reduce((s, r) => s + Number(r.percentualAgFamiliar!), 0) / refComAgFamiliar.length
      : 0
    const conformePNAE        = mediaAgFamiliar >= 30

    return NextResponse.json({
      periodo: `${mesNum}/${anoNum}`,
      totalRefeicoes, totalAlunos,
      custoTotal: custoTotal.toFixed(2),
      mediaAgFamiliar: mediaAgFamiliar.toFixed(1),
      conformePNAE,
      alerta: !conformePNAE ? 'Abaixo de 30% — Lei 11.947/2009 Art. 14' : null,
      refeicoes: refeicoes.length,
    })
  }

  // Cardápio da semana
  if (escolaId && semana) {
    const semanaData = new Date(semana)
    const cardapios  = await prisma.cardapioMerenda.findMany({
      where: {
        escolaId, municipioId: usuario.municipioId,
        semana: {
          gte: semanaData,
          lt:  new Date(semanaData.getTime() + 7 * 86400000),
        },
      },
      include: { refeicoes: { orderBy: { data: 'asc' } } },
    })
    return NextResponse.json({ cardapios })
  }

  // Lista de cardápios de uma escola
  if (escolaId) {
    const cardapios = await prisma.cardapioMerenda.findMany({
      where: { escolaId, municipioId: usuario.municipioId },
      orderBy: { semana: 'desc' },
      take: 20,
      select: {
        id: true, semana: true, turno: true, aprovado: true,
        nutricionistaResp: true,
        _count: { select: { refeicoes: true } },
      },
    })
    return NextResponse.json({ cardapios })
  }

  return NextResponse.json({ erro: 'Parâmetros insuficientes' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo') ?? 'CARDAPIO'

  if (tipo === 'CARDAPIO') {
    const Schema = z.object({
      escolaId:         z.string(),
      semana:           z.string(),  // segunda-feira da semana ISO
      turno:            z.enum(['MATUTINO','VESPERTINO','NOTURNO','INTEGRAL']),
      cardapioDias:     z.object({
        seg: z.string().optional(),
        ter: z.string().optional(),
        qua: z.string().optional(),
        qui: z.string().optional(),
        sex: z.string().optional(),
      }),
      nutricionistaResp: z.string().optional(),
    })

    const val = Schema.safeParse(await req.json())
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
    const d = val.data

    // Verificar escola pertence ao município
    const escola = await prisma.escola.findFirst({
      where: { id: d.escolaId, municipioId: usuario.municipioId },
    })
    if (!escola) return NextResponse.json({ erro: 'Escola não encontrada' }, { status: 404 })

    const cardapio = await prisma.cardapioMerenda.create({
      data: {
        municipioId:       usuario.municipioId,
        escolaId:          d.escolaId,
        semana:            new Date(d.semana),
        turno:             d.turno,
        cardapioDias:      JSON.stringify(d.cardapioDias),
        nutricionistaResp: d.nutricionistaResp,
      },
    })
    return NextResponse.json({ cardapio }, { status: 201 })
  }

  // Registrar refeição diária executada
  if (tipo === 'REFEICAO') {
    const Schema = z.object({
      cardapioId:          z.string(),
      data:                z.string(),
      totalAlunos:         z.number().int().min(0),
      refeicoes:           z.number().int().min(0),
      custoTotal:          z.number().min(0).optional(),
      percentualAgFamiliar: z.number().min(0).max(100).optional(),
    })

    const val = Schema.safeParse(await req.json())
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
    const d = val.data

    // Verificar cardápio pertence ao município
    const cardapio = await prisma.cardapioMerenda.findFirst({
      where: { id: d.cardapioId, municipioId: usuario.municipioId },
    })
    if (!cardapio) return NextResponse.json({ erro: 'Cardápio não encontrado' }, { status: 404 })

    const custoPerCapita = d.custoTotal && d.refeicoes > 0
      ? d.custoTotal / d.refeicoes
      : undefined

    const refeicao = await prisma.refeicaoDiaria.create({
      data: {
        municipioId:         usuario.municipioId,
        cardapioId:          d.cardapioId,
        data:                new Date(d.data),
        totalAlunos:         d.totalAlunos,
        refeicoes:           d.refeicoes,
        custoTotal:          d.custoTotal,
        custoPerCapita,
        percentualAgFamiliar: d.percentualAgFamiliar,
        usuarioId:           usuario.id,
      },
    })

    return NextResponse.json({ refeicao }, { status: 201 })
  }

  return NextResponse.json({ erro: 'Tipo inválido. Use ?tipo=CARDAPIO ou ?tipo=REFEICAO' }, { status: 400 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  if (acao === 'APROVAR') {
    await prisma.cardapioMerenda.update({
      where: { id },
      data: { aprovado: true },
    })
    return NextResponse.json({ sucesso: true })
  }

  return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
}
