import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── IPTU — Imposto Predial e Territorial Urbano ──────────────────────────────
// CF/88 Art.156 I — competência municipal
// CTN Art.32-34 — fato gerador, contribuinte, base de cálculo
// Lei 10.257/2001 (Estatuto da Cidade) Art.7 — IPTU Progressivo no Tempo
//   1º ano: 1%, 2º: 2%, 3º: 4%, 4º: 8%, 5º+: 15% máximo (Art.7 §1º)
//   Aplica-se a imóvel que não cumpre função social (subutilizado/não edificado)
//
// CÁLCULO:
//   IPTU = valorVenal × alíquota × (1 - reduçãoFiscal/100)
//   Descontos por pontualidade: legislação municipal (geralmente 5-15%)
//
// LANÇAMENTO: lançado de ofício (CTN Art.149) no início de cada exercício
//   para todos os imóveis urbanos cadastrados

// Alíquotas progressivas IPTU Social (Estatuto da Cidade)
const ALIQUOTAS_PROGRESSIVAS: Record<number, number> = {
  1: 1.0,   // 1º ano de IPTU Progressivo
  2: 2.0,
  3: 4.0,
  4: 8.0,
  5: 15.0,  // 5º ano em diante (máximo legal)
}

function calcularIPTU(imovel: {
  valorVenal: any
  aliquotaIPTU: any
  reducaoFiscal?: any
  iptuProgressivo?: boolean
  anoProgressivo?: number | null
  isento?: boolean
}, exercicio: number): { iptuCalculado: number; aliquotaEfetiva: number; ehProgressivo: boolean } {
  if (imovel.isento) return { iptuCalculado: 0, aliquotaEfetiva: 0, ehProgressivo: false }

  const valorVenal = Number(imovel.valorVenal)
  let aliquota     = Number(imovel.aliquotaIPTU)
  let ehProgressivo = false

  // IPTU Progressivo (Estatuto da Cidade Art.7)
  if (imovel.iptuProgressivo && imovel.anoProgressivo) {
    const anosDecorridos = exercicio - imovel.anoProgressivo + 1
    const anoChave = Math.min(anosDecorridos, 5)
    aliquota = ALIQUOTAS_PROGRESSIVAS[anoChave] ?? 15.0
    ehProgressivo = true
  }

  const reducao = Number(imovel.reducaoFiscal ?? 0) / 100
  const iptuCalculado = valorVenal * (aliquota / 100) * (1 - reducao)

  return { iptuCalculado, aliquotaEfetiva: aliquota, ehProgressivo }
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const relatorio = searchParams.get('relatorio')
  const busca     = searchParams.get('busca')
  const bairro    = searchParams.get('bairro')
  const tipo      = searchParams.get('tipo')
  const exercicio = searchParams.get('exercicio')

  if (relatorio === 'DASHBOARD') {
    const anoAtual = new Date().getFullYear()

    const [totalImoveis, isentosCount, progressivosCount] = await Promise.all([
      prisma.imovel.count({ where: { municipioId: usuario.municipioId, ativo: true } }),
      prisma.imovel.count({ where: { municipioId: usuario.municipioId, isento: true } }),
      prisma.imovel.count({ where: { municipioId: usuario.municipioId, iptuProgressivo: true } }),
    ])

    // Valor venal total (base tributável)
    const baseValorVenal = await prisma.imovel.aggregate({
      where: { municipioId: usuario.municipioId, ativo: true, isento: false },
      _sum: { valorVenal: true },
    })

    // Lançamentos IPTU do exercício corrente
    const iptuAno = await prisma.lancamentoTributario.aggregate({
      where: {
        municipioId: usuario.municipioId,
        tipoLancamento: 'IPTU',
        exercicio: anoAtual,
      },
      _sum: { valorPrincipal: true, valorPago: true },
      _count: { id: true },
    })

    const iptuAberto = await prisma.lancamentoTributario.aggregate({
      where: {
        municipioId: usuario.municipioId,
        tipoLancamento: 'IPTU',
        situacao: 'ABERTO',
        exercicio: anoAtual,
      },
      _sum: { valorTotal: true },
    })

    // Por tipo de imóvel
    const porTipo = await prisma.imovel.groupBy({
      by: ['tipoImovel'],
      where: { municipioId: usuario.municipioId, ativo: true },
      _count: { id: true },
      _sum: { valorVenal: true },
    })

    // Por bairro
    const porBairro = await prisma.imovel.groupBy({
      by: ['bairro'],
      where: { municipioId: usuario.municipioId, ativo: true, bairro: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    })

    // Eficiência de arrecadação IPTU
    const totalLancado = Number(iptuAno._sum.valorPrincipal ?? 0)
    const totalPago    = Number(iptuAno._sum.valorPago ?? 0)
    const percArrecad  = totalLancado > 0 ? ((totalPago / totalLancado) * 100).toFixed(1) : '0.0'

    return NextResponse.json({
      kpis: {
        totalImoveis, isentosCount, progressivosCount,
        baseValorVenal: Number(baseValorVenal._sum.valorVenal ?? 0),
        iptuLancado: totalLancado,
        iptuArrecadado: totalPago,
        iptuAberto: Number(iptuAberto._sum.valorTotal ?? 0),
        iptuCount: iptuAno._count.id,
        percArrecad,
      },
      porTipo,
      porBairro,
    })
  }

  if (id) {
    const imovel = await prisma.imovel.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        contribuinte: { select: { inscricaoMunicipal: true, nomeCompleto: true, razaoSocial: true, email: true, telefone: true } },
        lancamentos: {
          where: { tipoLancamento: 'IPTU' },
          orderBy: { exercicio: 'desc' },
          take: 10,
          include: { pagamentos: { orderBy: { dataPagamento: 'desc' } } },
        },
      },
    })
    if (!imovel) return NextResponse.json({ erro: 'Imóvel não encontrado' }, { status: 404 })

    const anoAtual = new Date().getFullYear()
    const { iptuCalculado, aliquotaEfetiva, ehProgressivo } = calcularIPTU(imovel, anoAtual)

    return NextResponse.json({ imovel, previewIPTU: { iptuCalculado, aliquotaEfetiva, ehProgressivo } })
  }

  const where: any = { municipioId: usuario.municipioId, ativo: true }
  if (tipo)   where.tipoImovel = tipo
  if (bairro) where.bairro     = { contains: bairro }
  if (busca)  {
    where.OR = [
      { inscricaoImobiliaria: { contains: busca } },
      { logradouro:           { contains: busca } },
      { proprietarioNome:     { contains: busca } },
      { proprietarioCpfCnpj:  { contains: busca.replace(/\D/g, '') } },
    ]
  }

  const imoveis = await prisma.imovel.findMany({
    where, orderBy: { inscricaoImobiliaria: 'asc' }, take: 500,
    select: {
      id: true, inscricaoImobiliaria: true, tipoImovel: true, situacao: true,
      logradouro: true, numero: true, bairro: true,
      areaTerreno: true, areaConstruida: true,
      valorVenal: true, aliquotaIPTU: true, reducaoFiscal: true, isento: true,
      iptuProgressivo: true, anoProgressivo: true,
      proprietarioNome: true, proprietarioCpfCnpj: true,
      contribuinteId: true,
      _count: { select: { lancamentos: true } },
    },
  })

  // Enriquece com preview IPTU
  const anoAtual = new Date().getFullYear()
  const enriched = imoveis.map(im => {
    const { iptuCalculado, aliquotaEfetiva } = calcularIPTU(im, anoAtual)
    return { ...im, iptuPreview: iptuCalculado, aliquotaEfetiva }
  })

  return NextResponse.json({ imoveis: enriched, total: enriched.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { acao, ...dados } = await req.json()

  // ── Cadastro de imóvel ────────────────────────────────────────────────────
  if (!acao || acao === 'CADASTRAR') {
    const Schema = z.object({
      contribuinteId:   z.string().optional(),
      tipoImovel:       z.enum(['RESIDENCIAL','COMERCIAL','INDUSTRIAL','RURAL','MISTO','TERRENO','ESPECIAL']),
      logradouro:       z.string().min(3),
      numero:           z.string().optional(),
      complemento:      z.string().optional(),
      bairro:           z.string().optional(),
      cep:              z.string().optional(),
      areaTerreno:      z.number().positive(),
      areaConstruida:   z.number().optional(),
      testada:          z.number().optional(),
      valorVenalTerreno: z.number().positive(),
      valorVenalConstrucao: z.number().optional(),
      aliquotaIPTU:     z.number().positive(),
      reducaoFiscal:    z.number().optional(),
      motivoReducao:    z.string().optional(),
      isento:           z.boolean().default(false),
      motivoIsencao:    z.string().optional(),
      proprietarioNome: z.string().optional(),
      proprietarioCpfCnpj: z.string().optional(),
    })

    const val = Schema.safeParse(dados)
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
    const d = val.data

    // Gera inscrição imobiliária sequencial simples
    const count = await prisma.imovel.count({ where: { municipioId: usuario.municipioId } })
    const inscricao = `${String(Math.floor(count / 1000) + 1).padStart(4, '0')}.${String(Math.floor((count % 1000) / 100) + 1).padStart(3, '0')}.${String(count % 100 + 1).padStart(4, '0')}.001`

    const valorVenal = d.valorVenalTerreno + (d.valorVenalConstrucao ?? 0)

    const imovel = await prisma.imovel.create({
      data: {
        municipioId: usuario.municipioId,
        inscricaoImobiliaria: inscricao,
        contribuinteId: d.contribuinteId,
        tipoImovel: d.tipoImovel as any,
        logradouro: d.logradouro,
        numero: d.numero, complemento: d.complemento, bairro: d.bairro, cep: d.cep,
        areaTerreno: d.areaTerreno,
        areaConstruida: d.areaConstruida,
        testada: d.testada,
        valorVenalTerreno: d.valorVenalTerreno,
        valorVenalConstrucao: d.valorVenalConstrucao,
        valorVenal,
        valorVenalAno: new Date().getFullYear(),
        aliquotaIPTU: d.aliquotaIPTU,
        reducaoFiscal: d.reducaoFiscal,
        motivoReducao: d.motivoReducao,
        isento: d.isento,
        motivoIsencao: d.motivoIsencao,
        proprietarioNome: d.proprietarioNome,
        proprietarioCpfCnpj: d.proprietarioCpfCnpj?.replace(/\D/g, ''),
      },
    })

    return NextResponse.json({ imovel, inscricaoImobiliaria: inscricao }, { status: 201 })
  }

  // ── Lançamento IPTU (exercício) ────────────────────────────────────────────
  if (acao === 'LANCAR_EXERCICIO') {
    const Schema = z.object({
      exercicio:    z.number().int(),
      parcelas:     z.number().int().min(1).max(12).default(1),
      descontoAVista: z.number().optional(), // % desconto pagamento à vista
    })

    const val = Schema.safeParse(dados)
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
    const d = val.data

    // Busca todos os imóveis ativos
    const imoveis = await prisma.imovel.findMany({
      where: { municipioId: usuario.municipioId, ativo: true, isento: false },
    })

    let totalLancado = 0
    let totalImoveis = 0
    const erros: string[] = []

    for (const im of imoveis) {
      // Verifica se já foi lançado
      const exLanc = await prisma.lancamentoTributario.findFirst({
        where: { municipioId: usuario.municipioId, imovelId: im.id, tipoLancamento: 'IPTU', exercicio: d.exercicio },
      })
      if (exLanc) { erros.push(`Imóvel ${im.inscricaoImobiliaria} já lançado`); continue }

      const { iptuCalculado } = calcularIPTU(im, d.exercicio)
      if (iptuCalculado <= 0) continue

      const valorParcela = iptuCalculado / d.parcelas

      await prisma.$transaction(
        Array.from({ length: d.parcelas }, (_, i) => {
          const mes = ((i + 1) % 12 || 12).toString().padStart(2, '0')
          const anoVenc = i < 11 ? d.exercicio : d.exercicio
          const vencimento = new Date(`${anoVenc}-${mes}-10`)

          return prisma.lancamentoTributario.create({
            data: {
              municipioId: usuario.municipioId,
              imovelId: im.id,
              contribuinteId: im.contribuinteId,
              tipoLancamento: 'IPTU',
              origem: 'DECLARACAO',
              exercicio: d.exercicio,
              competencia: `${d.exercicio}-${mes}`,
              vencimento,
              valorPrincipal: valorParcela,
              valorTotal:     valorParcela,
              valorSaldo:     valorParcela,
              descricao:      `IPTU ${d.exercicio} — ${im.inscricaoImobiliaria} — ${d.parcelas > 1 ? `Parcela ${i + 1}/${d.parcelas}` : 'Cota Única'}`,
              usuarioId:      usuario.id,
            },
          })
        })
      )

      totalLancado += iptuCalculado
      totalImoveis++
    }

    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: 'LANCAR_IPTU_EXERCICIO', entidade: 'LancamentoTributario', entidadeId: usuario.municipioId,
      detalhes: { exercicio: d.exercicio, totalImoveis, totalLancado, parcelas: d.parcelas },
    })

    return NextResponse.json({
      sucesso: true, totalImoveis, totalLancado,
      erros: erros.length ? erros : undefined,
    }, { status: 201 })
  }

  return NextResponse.json({ erro: `Ação '${acao}' não reconhecida` }, { status: 400 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, ...dados } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const imovel = await prisma.imovel.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!imovel) return NextResponse.json({ erro: 'Imóvel não encontrado' }, { status: 404 })

  const UpdateSchema = z.object({
    tipoImovel:       z.string().optional(),
    logradouro:       z.string().optional(),
    bairro:           z.string().optional(),
    areaTerreno:      z.number().optional(),
    areaConstruida:   z.number().optional(),
    valorVenalTerreno: z.number().optional(),
    valorVenalConstrucao: z.number().optional(),
    aliquotaIPTU:     z.number().optional(),
    reducaoFiscal:    z.number().optional(),
    motivoReducao:    z.string().optional(),
    isento:           z.boolean().optional(),
    motivoIsencao:    z.string().optional(),
    iptuProgressivo:  z.boolean().optional(),
    anoProgressivo:   z.number().optional(),
    proprietarioNome: z.string().optional(),
  })

  const val = UpdateSchema.safeParse(dados)
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const upd = val.data

  // Recalcula valor venal se componentes mudaram
  const novoVVTerreno = upd.valorVenalTerreno ?? Number(imovel.valorVenalTerreno)
  const novoVVConstrucao = upd.valorVenalConstrucao ?? Number(imovel.valorVenalConstrucao ?? 0)
  const novoVenal = novoVVTerreno + novoVVConstrucao

  await prisma.imovel.update({
    where: { id },
    data: {
      ...upd,
      tipoImovel: upd.tipoImovel as any,
      valorVenal: (upd.valorVenalTerreno || upd.valorVenalConstrucao) ? novoVenal : undefined,
      valorVenalAno: (upd.valorVenalTerreno || upd.valorVenalConstrucao) ? new Date().getFullYear() : undefined,
    },
  })

  return NextResponse.json({ sucesso: true })
}
