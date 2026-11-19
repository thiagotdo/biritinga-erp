import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Bens Patrimoniais ────────────────────────────────────────────────────────
// Lei 4.320/1964 Art. 94-105 — bens públicos permanentes
// NBC T 16.9 — depreciação, vida útil por categoria
// MCASP — custo histórico como base de registro

// Taxas de depreciação anuais padrão por categoria (NBC T 16.9)
const TAXA_DEP_PADRAO: Record<string, number> = {
  VEICULO:         0.2,    // 20% a.a. — vida útil 5 anos
  EQUIPAMENTO:     0.1,    // 10% a.a. — vida útil 10 anos
  MOVEL:           0.1,    // 10% a.a.
  ELETRODOMESTICO: 0.1,
  FERRAMENTA:      0.1667, // ~6 anos
  MAQUINA:         0.1,
  IMOVEL:          0.025,  // 2,5% a.a. — apenas benfeitorias (terrenos não depreciam)
  OBRA_ARTE:       0,      // não deprecia
  INTANGIVEL:      0.2,    // 20% a.a.
  SEMOVENTE:       0.2,
  OUTRO:           0.1,
}

// Vida útil padrão em anos
const VIDA_UTIL_PADRAO: Record<string, number> = {
  VEICULO: 5, EQUIPAMENTO: 10, MOVEL: 10, ELETRODOMESTICO: 10,
  FERRAMENTA: 6, MAQUINA: 10, IMOVEL: 40, INTANGIVEL: 5,
  SEMOVENTE: 5, OUTRO: 10,
}

// Número de plaqueta/tombamento: "PAT-2026-00001"
async function gerarNumeroPlaqueta(municipioId: string): Promise<string> {
  const ano   = new Date().getFullYear()
  const count = await prisma.bemPatrimonial.count({ where: { municipioId } })
  return `PAT-${ano}-${String(count + 1).padStart(5, '0')}`
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const relatorio = searchParams.get('relatorio')
  const categoria = searchParams.get('categoria')
  const situacao  = searchParams.get('situacao')
  const secretaria = searchParams.get('secretaria')
  const busca     = searchParams.get('busca')

  if (relatorio === 'DASHBOARD') {
    const [total, ativos, emManut, extraviados, baixados, alienados] = await Promise.all([
      prisma.bemPatrimonial.count({ where: { municipioId: usuario.municipioId, ativo: true } }),
      prisma.bemPatrimonial.count({ where: { municipioId: usuario.municipioId, ativo: true, situacao: 'ATIVO' } }),
      prisma.bemPatrimonial.count({ where: { municipioId: usuario.municipioId, ativo: true, situacao: 'EM_MANUTENCAO' } }),
      prisma.bemPatrimonial.count({ where: { municipioId: usuario.municipioId, ativo: true, situacao: 'EXTRAVIADO' } }),
      prisma.bemPatrimonial.count({ where: { municipioId: usuario.municipioId, ativo: true, situacao: 'BAIXADO' } }),
      prisma.bemPatrimonial.count({ where: { municipioId: usuario.municipioId, ativo: true, situacao: 'ALIENADO' } }),
    ])

    // Valor total do patrimônio (valor atual)
    const valorTotal = await prisma.bemPatrimonial.aggregate({
      where: { municipioId: usuario.municipioId, ativo: true, situacao: 'ATIVO' },
      _sum: { valorAtual: true, valorAquisicao: true, depAcumulada: true },
    })

    // Por categoria
    const porCategoria = await prisma.bemPatrimonial.groupBy({
      by: ['categoria'],
      where: { municipioId: usuario.municipioId, ativo: true },
      _count: { id: true },
      _sum: { valorAtual: true },
      orderBy: { _count: { id: 'desc' } },
    })

    return NextResponse.json({
      kpis: {
        total, ativos, emManut, extraviados, baixados, alienados,
        valorAtual:     valorTotal._sum.valorAtual     ?? 0,
        valorAquisicao: valorTotal._sum.valorAquisicao ?? 0,
        depAcumulada:   valorTotal._sum.depAcumulada   ?? 0,
      },
      porCategoria,
    })
  }

  if (id) {
    const bem = await prisma.bemPatrimonial.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        movimentacoes: { orderBy: { dataMovimentacao: 'desc' }, take: 15 },
      },
    })
    if (!bem) return NextResponse.json({ erro: 'Bem não encontrado' }, { status: 404 })

    // Histórico de depreciação recente
    const depreciacoes = await prisma.depreciacaoRegistro.findMany({
      where: { bemId: id, municipioId: usuario.municipioId },
      orderBy: { competencia: 'desc' }, take: 12,
    })

    return NextResponse.json({ bem, depreciacoes })
  }

  const where: any = { municipioId: usuario.municipioId, ativo: true }
  if (categoria)  where.categoria  = categoria
  if (situacao)   where.situacao   = situacao
  if (secretaria) where.secretaria = { contains: secretaria }
  if (busca) {
    where.OR = [
      { numeroPlaqueta: { contains: busca } },
      { descricao:     { contains: busca } },
      { marca:         { contains: busca } },
      { modelo:        { contains: busca } },
      { serie:         { contains: busca } },
      { responsavel:   { contains: busca } },
      { local:         { contains: busca } },
    ]
  }

  const bens = await prisma.bemPatrimonial.findMany({
    where, orderBy: { numeroPlaqueta: 'asc' }, take: 500,
    select: {
      id: true, numeroPlaqueta: true, descricao: true, categoria: true,
      marca: true, modelo: true, estado: true, situacao: true,
      secretaria: true, setor: true, local: true, responsavel: true,
      valorAquisicao: true, valorAtual: true, dataAquisicao: true,
      taxaDepAnual: true, vidaUtilAnos: true, depAcumulada: true,
    },
  })

  return NextResponse.json({ bens, total: bens.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    descricao:      z.string().min(3),
    categoria:      z.enum(['IMOVEL','VEICULO','MOVEL','EQUIPAMENTO','ELETRODOMESTICO','FERRAMENTA','MAQUINA','OBRA_ARTE','SEMOVENTE','INTANGIVEL','OUTRO']),
    marca:          z.string().optional(),
    modelo:         z.string().optional(),
    fabricante:     z.string().optional(),
    serie:          z.string().optional(),
    anoFab:         z.number().int().optional(),
    cor:            z.string().optional(),
    secretaria:     z.string().min(2),
    setor:          z.string().optional(),
    local:          z.string().optional(),
    responsavel:    z.string().optional(),
    valorAquisicao: z.number().min(0.01),
    dataAquisicao:  z.string(),
    valorResidual:  z.number().min(0).default(0),
    vidaUtilAnos:   z.number().int().optional(),
    taxaDepAnual:   z.number().min(0).max(1).optional(),
    fornecedor:     z.string().optional(),
    nfNumero:       z.string().optional(),
    processo:       z.string().optional(),
    origemRecurso:  z.string().optional(),
    estado:         z.enum(['OTIMO','BOM','REGULAR','RUIM','PESSIMO','IRRECUPERAVEL']).default('BOM'),
    seguro:         z.boolean().default(false),
    seguradora:     z.string().optional(),
    apolice:        z.string().optional(),
    vencSeguro:     z.string().optional(),
    observacoes:    z.string().optional(),
    // Permite passar plaqueta manualmente (p/ migração) ou gera automático
    numeroPlaqueta: z.string().optional(),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const plaqueta = d.numeroPlaqueta ?? await gerarNumeroPlaqueta(usuario.municipioId)

  const existe = await prisma.bemPatrimonial.findFirst({
    where: { municipioId: usuario.municipioId, numeroPlaqueta: plaqueta },
  })
  if (existe) return NextResponse.json({ erro: `Plaqueta ${plaqueta} já cadastrada` }, { status: 409 })

  // Taxa e vida útil padrão se não informados
  const taxa      = d.taxaDepAnual   ?? TAXA_DEP_PADRAO[d.categoria]  ?? 0.1
  const vidaUtil  = d.vidaUtilAnos   ?? VIDA_UTIL_PADRAO[d.categoria] ?? 10

  const bem = await prisma.bemPatrimonial.create({
    data: {
      municipioId: usuario.municipioId,
      ...d,
      numeroPlaqueta: plaqueta,
      valorAtual:     d.valorAquisicao,  // valor atual = custo histórico ao entrar
      taxaDepAnual:   taxa,
      vidaUtilAnos:   vidaUtil,
      dataAquisicao:  new Date(d.dataAquisicao),
      vencSeguro:     d.vencSeguro ? new Date(d.vencSeguro) : undefined,
    },
  })

  // Registra entrada no histórico de movimentações
  await prisma.movimentacaoBem.create({
    data: {
      municipioId: usuario.municipioId,
      bemId: bem.id,
      tipo: 'ENTRADA',
      secretariaDestino: d.secretaria,
      setorDestino:      d.setor,
      responsavelDestino: d.responsavel,
      motivo:    `Entrada patrimonial — ${d.fornecedor ?? 'fornecedor não informado'}`,
      documento: d.nfNumero,
      usuarioId: usuario.id,
    },
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'CADASTRAR_BEM', entidade: 'BemPatrimonial', entidadeId: bem.id,
    detalhes: { plaqueta, descricao: d.descricao, valor: d.valorAquisicao, categoria: d.categoria },
  })

  return NextResponse.json({ bem, plaqueta }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, ...dados } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const bem = await prisma.bemPatrimonial.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!bem) return NextResponse.json({ erro: 'Bem não encontrado' }, { status: 404 })

  if (acao === 'TRANSFERIR') {
    const { secretariaDestino, setorDestino, responsavelDestino, motivo, documento } = dados
    if (!secretariaDestino || !motivo) {
      return NextResponse.json({ erro: 'secretariaDestino e motivo obrigatórios' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.bemPatrimonial.update({
        where: { id },
        data: {
          secretaria: secretariaDestino,
          setor:      setorDestino,
          responsavel: responsavelDestino,
        },
      })
      await tx.movimentacaoBem.create({
        data: {
          municipioId: usuario.municipioId,
          bemId: id, tipo: 'TRANSFERENCIA',
          secretariaOrigem:  bem.secretaria, setorOrigem:  bem.setor,
          responsavelOrigem: bem.responsavel,
          secretariaDestino, setorDestino, responsavelDestino,
          motivo, documento, usuarioId: usuario.id,
        },
      })
    })

    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: 'TRANSFERIR_BEM', entidade: 'BemPatrimonial', entidadeId: id,
      detalhes: { plaqueta: bem.numeroPlaqueta, de: bem.secretaria, para: secretariaDestino },
    })
    return NextResponse.json({ sucesso: true })
  }

  if (acao === 'BAIXA' || acao === 'ALIENACAO') {
    const motivo = dados.motivo ?? acao
    await prisma.$transaction(async (tx) => {
      await tx.bemPatrimonial.update({
        where: { id },
        data: { situacao: acao === 'ALIENACAO' ? 'ALIENADO' : 'BAIXADO', ativo: false },
      })
      await tx.movimentacaoBem.create({
        data: {
          municipioId: usuario.municipioId,
          bemId: id,
          tipo: acao === 'ALIENACAO' ? 'ALIENACAO' : 'BAIXA',
          secretariaOrigem: bem.secretaria,
          motivo, documento: dados.documento, usuarioId: usuario.id,
        },
      })
    })

    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: acao === 'ALIENACAO' ? 'ALIENAR_BEM' : 'BAIXAR_BEM',
      entidade: 'BemPatrimonial', entidadeId: id,
      detalhes: { plaqueta: bem.numeroPlaqueta, motivo },
    })
    return NextResponse.json({ sucesso: true })
  }

  // Atualização geral
  const atualizacoes: any = { ...dados }
  if (dados.vencSeguro) atualizacoes.vencSeguro = new Date(dados.vencSeguro)

  const atualizado = await prisma.bemPatrimonial.update({ where: { id }, data: atualizacoes })
  return NextResponse.json({ bem: atualizado })
}
