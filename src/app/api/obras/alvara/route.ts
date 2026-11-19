import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Alvarás ──────────────────────────────────────────────────────────────────
// Alvará de construção: documento urbanístico obrigatório (Lei 10.257/2001 — Estatuto da Cidade)
// Fluxo: SOLICITADO → EM_ANALISE → APROVADO (emitido) | INDEFERIDO
// Habite-se: após conclusão da obra, inspecção final

const TRANSICOES: Record<string, string[]> = {
  SOLICITADO:  ['EM_ANALISE', 'INDEFERIDO'],
  EM_ANALISE:  ['APROVADO', 'INDEFERIDO'],
  APROVADO:    ['VENCIDO', 'CANCELADO'],
  INDEFERIDO:  ['EM_ANALISE'],  // pode recursar e reabrir análise
  VENCIDO:     ['EM_ANALISE'],  // renovação
  CANCELADO:   [],
}

async function gerarNumeroAlvara(municipioId: string): Promise<string> {
  const ano   = new Date().getFullYear()
  const count = await prisma.alvara.count({ where: { municipioId } })
  return `AV-${ano}-${String(count + 1).padStart(4, '0')}`
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const situacao  = searchParams.get('situacao')
  const tipo      = searchParams.get('tipo')
  const busca     = searchParams.get('busca')
  const relatorio = searchParams.get('relatorio')

  if (relatorio === 'DASHBOARD') {
    const [total, solicitados, emAnalise, aprovados, indeferidos, vencidos] = await Promise.all([
      prisma.alvara.count({ where: { municipioId: usuario.municipioId } }),
      prisma.alvara.count({ where: { municipioId: usuario.municipioId, situacao: 'SOLICITADO' } }),
      prisma.alvara.count({ where: { municipioId: usuario.municipioId, situacao: 'EM_ANALISE' } }),
      prisma.alvara.count({ where: { municipioId: usuario.municipioId, situacao: 'APROVADO' } }),
      prisma.alvara.count({ where: { municipioId: usuario.municipioId, situacao: 'INDEFERIDO' } }),
      prisma.alvara.count({ where: { municipioId: usuario.municipioId, situacao: 'VENCIDO' } }),
    ])

    // Alvarás a vencer em 30 dias
    const em30dias = new Date()
    em30dias.setDate(em30dias.getDate() + 30)
    const aVencer = await prisma.alvara.count({
      where: {
        municipioId: usuario.municipioId,
        situacao: 'APROVADO',
        dataVencimento: { lte: em30dias, gte: new Date() },
      },
    })

    return NextResponse.json({ kpis: { total, solicitados, emAnalise, aprovados, indeferidos, vencidos, aVencer } })
  }

  if (id) {
    const alvara = await prisma.alvara.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: { fiscalizacoes: { orderBy: { dataVisita: 'desc' } } },
    })
    if (!alvara) return NextResponse.json({ erro: 'Alvará não encontrado' }, { status: 404 })
    return NextResponse.json({ alvara })
  }

  const where: any = { municipioId: usuario.municipioId }
  if (situacao) where.situacao = situacao
  if (tipo)     where.tipo     = tipo
  if (busca) {
    where.OR = [
      { numero:          { contains: busca } },
      { requerentNome:   { contains: busca } },
      { requerentCpfCnpj: { contains: busca } },
      { logradouro:      { contains: busca } },
      { bairro:          { contains: busca } },
    ]
  }

  const alvaras = await prisma.alvara.findMany({
    where, orderBy: { dataSolicitacao: 'desc' }, take: 200,
    select: {
      id: true, numero: true, tipo: true, situacao: true,
      requerentNome: true, logradouro: true, numero_imovel: true, bairro: true,
      areaTotal: true, areaConstruida: true,
      dataSolicitacao: true, dataEmissao: true, dataVencimento: true,
      taxaAlvara: true, taxaPaga: true,
    },
  })

  return NextResponse.json({ alvaras, total: alvaras.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    tipo:               z.enum(['CONSTRUCAO','REFORMA','DEMOLIÇÃO','AMPLIACAO','REGULARIZACAO','HABITE_SE','LOCALIZACAO','EVENTOS']),
    requerentNome:      z.string().min(3),
    requerentCpfCnpj:   z.string().optional(),
    requerentTelefone:  z.string().optional(),
    requerentEmail:     z.string().email().optional().or(z.literal('')),
    logradouro:         z.string().optional(),
    numero_imovel:      z.string().optional(),
    bairro:             z.string().optional(),
    cep:                z.string().optional(),
    inscricaoImobiliaria: z.string().optional(),
    responsavelTecnico: z.string().optional(),
    crea:               z.string().optional(),
    areaTotal:          z.number().optional(),
    areaConstruida:     z.number().optional(),
    numeroPavimentos:   z.number().int().optional(),
    usoImovel:          z.string().optional(),
    taxaAlvara:         z.number().optional(),
    observacoes:        z.string().optional(),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  if (d.requerentCpfCnpj) d.requerentCpfCnpj = d.requerentCpfCnpj.replace(/\D/g, '')

  const alvara = await prisma.alvara.create({
    data: {
      municipioId: usuario.municipioId,
      ...d,
      usuarioId: usuario.id,
    },
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'SOLICITAR_ALVARA', entidade: 'Alvara', entidadeId: alvara.id,
    detalhes: { tipo: d.tipo, requerente: d.requerentNome, bairro: d.bairro },
  })

  return NextResponse.json({ alvara }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, ...dados } = await req.json()
  if (!id || !acao) return NextResponse.json({ erro: 'id e acao obrigatórios' }, { status: 400 })

  const alvara = await prisma.alvara.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!alvara) return NextResponse.json({ erro: 'Alvará não encontrado' }, { status: 404 })

  const permitidos = TRANSICOES[alvara.situacao] ?? []
  if (!permitidos.includes(acao)) {
    return NextResponse.json({
      erro: `Transição inválida: ${alvara.situacao} → ${acao}`, permitidos,
    }, { status: 409 })
  }

  const atualizacoes: any = { situacao: acao }

  if (acao === 'EM_ANALISE') {
    atualizacoes.dataAnalise = new Date()
  }

  if (acao === 'APROVADO') {
    // Número do alvará gerado na emissão
    const numero = await gerarNumeroAlvara(usuario.municipioId)
    atualizacoes.numero      = numero
    atualizacoes.dataEmissao = new Date()

    // Vencimento padrão: 1 ano
    const venc = new Date()
    venc.setFullYear(venc.getFullYear() + 1)
    atualizacoes.dataVencimento = dados.dataVencimento ? new Date(dados.dataVencimento) : venc

    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: 'EMITIR_ALVARA', entidade: 'Alvara', entidadeId: id,
      detalhes: { numero, requerente: alvara.requerentNome, tipo: alvara.tipo },
    })
  }

  if (acao === 'INDEFERIDO') {
    atualizacoes.motivoIndeferimento = dados.motivo
  }

  await prisma.alvara.update({ where: { id }, data: atualizacoes })
  return NextResponse.json({ sucesso: true, situacao: acao, numero: atualizacoes.numero })
}
