import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── ISS — Imposto Sobre Serviços ─────────────────────────────────────────────
// LC 116/2003 — fato gerador, sujeito passivo, base de cálculo, alíquotas
// LC 157/2016 — alíquota mínima 2%, vedação de isenções abaixo do mínimo
// CGSN 140/2018 — ISS no Simples Nacional (recolhimento unificado no DAS)
// CTN Art.156 — hipóteses de extinção do crédito tributário
//
// CÁLCULO ISS VARIÁVEL (prestador):
//   base = valorServico - deduções (materiais, subempreitada — LC 116 Art.7)
//   ISS = base × alíquota
//   Se retidoFonte = true → recolhido pelo tomador (LC 116 Art.6)
//
// ISS FIXO (autônomos / sociedades uniprofissionais — LC 116 Art.9 §1º):
//   valor fixo anual definido por lei municipal (não incide sobre receita)
//   Lançamento único por exercício, parcelas mensais

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const relatorio    = searchParams.get('relatorio')
  const contribuinteId = searchParams.get('contribuinteId')
  const competencia  = searchParams.get('competencia')
  const exercicio    = searchParams.get('exercicio')

  if (relatorio === 'DASHBOARD') {
    const anoAtual = new Date().getFullYear()
    const mesAtual = new Date().toISOString().slice(0, 7)

    const [lancsAbertos, lancsPagos, dessMes, totalArrecadado] = await Promise.all([
      prisma.lancamentoTributario.aggregate({
        where: {
          municipioId: usuario.municipioId,
          situacao: 'ABERTO',
          tipoLancamento: { in: ['ISS_FIXO', 'ISS_VARIAVEL', 'ISS_RETIDO'] },
        },
        _sum: { valorTotal: true }, _count: { id: true },
      }),
      prisma.lancamentoTributario.aggregate({
        where: {
          municipioId: usuario.municipioId,
          situacao: 'PAGO',
          exercicio: anoAtual,
          tipoLancamento: { in: ['ISS_FIXO', 'ISS_VARIAVEL', 'ISS_RETIDO'] },
        },
        _sum: { valorPago: true }, _count: { id: true },
      }),
      prisma.desServicos.count({
        where: { municipioId: usuario.municipioId, competencia: mesAtual, status: 'DECLARADA' },
      }),
      prisma.pagamentoTributario.aggregate({
        where: {
          municipioId: usuario.municipioId,
          dataPagamento: { gte: new Date(`${anoAtual}-01-01`) },
          lancamento: { tipoLancamento: { in: ['ISS_FIXO', 'ISS_VARIAVEL', 'ISS_RETIDO'] } },
        },
        _sum: { valorPago: true },
      }),
    ])

    // ISS por competência (últimos 12 meses)
    const porCompetencia = await prisma.lancamentoTributario.groupBy({
      by: ['competencia'],
      where: {
        municipioId: usuario.municipioId,
        tipoLancamento: { in: ['ISS_FIXO', 'ISS_VARIAVEL', 'ISS_RETIDO'] },
        competencia: { not: null },
      },
      _sum: { valorPrincipal: true, valorPago: true },
      orderBy: { competencia: 'desc' },
      take: 12,
    })

    // Maiores contribuintes por arrecadação
    const topContribuintes = await prisma.pagamentoTributario.groupBy({
      by: ['lancamentoId'],
      where: {
        municipioId: usuario.municipioId,
        lancamento: {
          tipoLancamento: { in: ['ISS_FIXO', 'ISS_VARIAVEL', 'ISS_RETIDO'] },
          exercicio: anoAtual,
        },
      },
      _sum: { valorPago: true },
      orderBy: { _sum: { valorPago: 'desc' } },
      take: 5,
    })

    return NextResponse.json({
      kpis: {
        issAbertoTotal: Number(lancsAbertos._sum.valorTotal ?? 0),
        issAbertoCount: lancsAbertos._count.id,
        issPagoAno: Number(lancsPagos._sum.valorPago ?? 0),
        issPagoCount: lancsPagos._count.id,
        dessMes,
        totalArrecadado: Number(totalArrecadado._sum.valorPago ?? 0),
      },
      porCompetencia,
      topContribuintes,
    })
  }

  // DES por contribuinte / competência
  const whereD: any = { municipioId: usuario.municipioId }
  if (contribuinteId) whereD.contribuinteId = contribuinteId
  if (competencia)    whereD.competencia    = competencia

  const dess = await prisma.desServicos.findMany({
    where: whereD, orderBy: { competencia: 'desc' }, take: 100,
    include: { contribuinte: { select: { inscricaoMunicipal: true, nomeCompleto: true, razaoSocial: true } } },
  })

  // Lançamentos ISS
  const whereL: any = {
    municipioId: usuario.municipioId,
    tipoLancamento: { in: ['ISS_FIXO', 'ISS_VARIAVEL', 'ISS_RETIDO'] },
  }
  if (contribuinteId) whereL.contribuinteId = contribuinteId
  if (exercicio)      whereL.exercicio      = parseInt(exercicio)
  if (competencia)    whereL.competencia    = competencia

  const lancamentos = await prisma.lancamentoTributario.findMany({
    where: whereL, orderBy: { vencimento: 'desc' }, take: 100,
    include: {
      contribuinte: { select: { inscricaoMunicipal: true, nomeCompleto: true, razaoSocial: true } },
    },
  })

  return NextResponse.json({ dess, lancamentos })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { acao, ...dados } = await req.json()

  // ── DES — Declaração de Serviços ──────────────────────────────────────────
  if (acao === 'DES') {
    const Schema = z.object({
      contribuinteId:   z.string(),
      competencia:      z.string().regex(/^\d{4}-\d{2}$/),
      numeroNfs:        z.string().optional(),
      tomadorCnpjCpf:   z.string().optional(),
      tomadorNome:      z.string().optional(),
      tomadorMunicipio: z.string().optional(),
      tomadorUF:        z.string().optional(),
      listaServico:     z.string(),
      descricaoServico: z.string().optional(),
      valorServico:     z.number().positive(),
      valorDeducao:     z.number().default(0),
      retidoFonte:      z.boolean().default(false),
      issRetido:        z.number().optional(),
    })

    const val = Schema.safeParse(dados)
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
    const d = val.data

    const contribuinte = await prisma.contribuinte.findFirst({
      where: { id: d.contribuinteId, municipioId: usuario.municipioId },
    })
    if (!contribuinte) return NextResponse.json({ erro: 'Contribuinte não encontrado' }, { status: 404 })

    const aliquota = Number(contribuinte.aliquotaISS ?? 3.0)
    const baseCalculo = d.valorServico - d.valorDeducao
    if (baseCalculo <= 0) return NextResponse.json({ erro: 'Base de cálculo não pode ser zero ou negativa' }, { status: 400 })

    const valorISS = (baseCalculo * aliquota) / 100
    const issRetido = d.issRetido ?? (d.retidoFonte ? valorISS : 0)
    const issDever = Math.max(0, valorISS - issRetido)

    const des = await prisma.desServicos.create({
      data: {
        municipioId: usuario.municipioId,
        contribuinteId: d.contribuinteId,
        competencia: d.competencia,
        numeroNfs: d.numeroNfs,
        tomadorCnpjCpf: d.tomadorCnpjCpf?.replace(/\D/g, ''),
        tomadorNome: d.tomadorNome,
        tomadorMunicipio: d.tomadorMunicipio,
        tomadorUF: d.tomadorUF,
        listaServico: d.listaServico,
        descricaoServico: d.descricaoServico,
        valorServico: d.valorServico,
        valorDeducao: d.valorDeducao,
        baseCalculo,
        aliquota,
        valorISS,
        retidoFonte: d.retidoFonte,
        issRetido,
        issDever,
        usuarioId: usuario.id,
      },
    })

    // Se há ISS a recolher → gera lançamento
    if (issDever > 0) {
      const venc = new Date(d.competencia + '-20')  // vencimento dia 20
      venc.setMonth(venc.getMonth() + 1)             // mês seguinte

      await prisma.lancamentoTributario.create({
        data: {
          municipioId: usuario.municipioId,
          contribuinteId: d.contribuinteId,
          tipoLancamento: d.retidoFonte ? 'ISS_RETIDO' : 'ISS_VARIAVEL',
          origem: 'DECLARACAO',
          exercicio: parseInt(d.competencia.slice(0, 4)),
          competencia: d.competencia,
          vencimento: venc,
          valorPrincipal: issDever,
          valorTotal: issDever,
          valorSaldo: issDever,
          descricao: `ISS ${d.competencia} — NFS ${d.numeroNfs ?? 'S/N'} — Lista ${d.listaServico}`,
          usuarioId: usuario.id,
        },
      })
    }

    return NextResponse.json({ des, valorISS, issDever, aliquota }, { status: 201 })
  }

  // ── Lançamento ISS Fixo Anual ─────────────────────────────────────────────
  if (acao === 'ISS_FIXO') {
    const Schema = z.object({
      contribuinteId: z.string(),
      exercicio:      z.number(),
      valorAnual:     z.number().positive(),
      parcelas:       z.number().int().min(1).max(12).default(12),
    })

    const val = Schema.safeParse(dados)
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
    const d = val.data

    const contribuinte = await prisma.contribuinte.findFirst({
      where: { id: d.contribuinteId, municipioId: usuario.municipioId },
    })
    if (!contribuinte) return NextResponse.json({ erro: 'Contribuinte não encontrado' }, { status: 404 })

    // Checa duplicidade de ISS fixo para o exercício
    const exLanc = await prisma.lancamentoTributario.findFirst({
      where: { municipioId: usuario.municipioId, contribuinteId: d.contribuinteId, tipoLancamento: 'ISS_FIXO', exercicio: d.exercicio },
    })
    if (exLanc) return NextResponse.json({ erro: `ISS Fixo ${d.exercicio} já lançado para este contribuinte` }, { status: 409 })

    const valorParcela = d.valorAnual / d.parcelas

    const lancamentos = await prisma.$transaction(
      Array.from({ length: d.parcelas }, (_, i) => {
        const mes = (i + 1).toString().padStart(2, '0')
        const competencia = `${d.exercicio}-${mes}`
        const vencimento  = new Date(`${d.exercicio}-${mes}-20`)

        return prisma.lancamentoTributario.create({
          data: {
            municipioId: usuario.municipioId,
            contribuinteId: d.contribuinteId,
            tipoLancamento: 'ISS_FIXO',
            origem: 'DECLARACAO',
            exercicio: d.exercicio,
            competencia,
            vencimento,
            valorPrincipal: valorParcela,
            valorTotal:     valorParcela,
            valorSaldo:     valorParcela,
            descricao:      `ISS Fixo ${competencia} — ${contribuinte.nomeCompleto ?? contribuinte.razaoSocial}`,
            usuarioId:      usuario.id,
          },
        })
      })
    )

    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: 'LANCAR_ISS_FIXO', entidade: 'LancamentoTributario', entidadeId: lancamentos[0].id,
      detalhes: { contribuinteId: d.contribuinteId, exercicio: d.exercicio, valorAnual: d.valorAnual, parcelas: d.parcelas },
    })

    return NextResponse.json({ lancamentos, totalParcelas: d.parcelas, valorParcela }, { status: 201 })
  }

  return NextResponse.json({ erro: `Ação '${acao}' não reconhecida` }, { status: 400 })
}
