import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Vigilância Sanitária ─────────────────────────────────────────────────────
// Lei 9.782/1999 — ANVISA e competências municipais de vigilância sanitária
// Lei Orgânica da Saúde 8.080/1990 Art.18 — fiscalização municipal
// Decreto 7.616/2011 — ESPIN (Emergência em Saúde Pública de Importância Nacional)
// IN STN 4/2014 — processo administrativo sanitário

async function gerarCodigo(municipioId: string): Promise<string> {
  const count = await prisma.estabelecimentoVigilancia.count({ where: { municipioId } })
  return `VS-${String(count + 1).padStart(5, '0')}`
}

async function gerarNumeroVistoria(municipioId: string): Promise<string> {
  const ano = new Date().getFullYear()
  const count = await prisma.vistoriaVigilancia.count({ where: { municipioId } })
  return `VST-${ano}-${String(count + 1).padStart(5, '0')}`
}

async function gerarNumeroAI(municipioId: string): Promise<string> {
  const ano = new Date().getFullYear()
  const count = await prisma.autoInfracao.count({ where: { municipioId } })
  return `AI-${ano}-${String(count + 1).padStart(5, '0')}`
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const relatorio = searchParams.get('relatorio')
  const tipo      = searchParams.get('tipo')
  const situacao  = searchParams.get('situacao')
  const recurso   = searchParams.get('recurso')  // 'vistorias' | 'infracoes' | 'estabelecimentos'

  if (relatorio === 'DASHBOARD') {
    const [total, vigentes, vencidas, pendentes, suspensas] = await Promise.all([
      prisma.estabelecimentoVigilancia.count({ where: { municipioId: usuario.municipioId, ativo: true } }),
      prisma.estabelecimentoVigilancia.count({ where: { municipioId: usuario.municipioId, situacaoLicenca: 'VIGENTE' } }),
      prisma.estabelecimentoVigilancia.count({ where: { municipioId: usuario.municipioId, situacaoLicenca: 'VENCIDA' } }),
      prisma.estabelecimentoVigilancia.count({ where: { municipioId: usuario.municipioId, situacaoLicenca: 'PENDENTE_RENOVACAO' } }),
      prisma.estabelecimentoVigilancia.count({ where: { municipioId: usuario.municipioId, situacaoLicenca: 'SUSPENSA' } }),
    ])

    const ano = new Date().getFullYear()
    const [vistoriasAno, aprovados, reprovados, interditados, infracoesAno] = await Promise.all([
      prisma.vistoriaVigilancia.count({ where: { municipioId: usuario.municipioId, dataVistoria: { gte: new Date(`${ano}-01-01`) } } }),
      prisma.vistoriaVigilancia.count({ where: { municipioId: usuario.municipioId, resultado: 'APROVADO' } }),
      prisma.vistoriaVigilancia.count({ where: { municipioId: usuario.municipioId, resultado: 'REPROVADO' } }),
      prisma.vistoriaVigilancia.count({ where: { municipioId: usuario.municipioId, resultado: 'INTERDITADO' } }),
      prisma.autoInfracao.count({ where: { municipioId: usuario.municipioId, criadoEm: { gte: new Date(`${ano}-01-01`) } } }),
    ])

    // Vencendo nos próximos 30 dias
    const em30d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const vencendoBreve = await prisma.estabelecimentoVigilancia.count({
      where: { municipioId: usuario.municipioId, situacaoLicenca: 'VIGENTE', dataVencLic: { lte: em30d, gte: new Date() } },
    })

    return NextResponse.json({
      kpis: { total, vigentes, vencidas, pendentes, suspensas, vencendoBreve, vistoriasAno, aprovados, reprovados, interditados, infracoesAno },
    })
  }

  if (id) {
    const estab = await prisma.estabelecimentoVigilancia.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        vistorias: { orderBy: { dataVistoria: 'desc' }, take: 20 },
        infrações: { orderBy: { criadoEm: 'desc' }, take: 20 },
      },
    })
    if (!estab) return NextResponse.json({ erro: 'Estabelecimento não encontrado' }, { status: 404 })
    return NextResponse.json({ estabelecimento: estab })
  }

  // Lista estabelecimentos
  const where: any = { municipioId: usuario.municipioId, ativo: true }
  if (tipo) where.tipoAtividade = tipo
  if (situacao) where.situacaoLicenca = situacao

  const estabelecimentos = await prisma.estabelecimentoVigilancia.findMany({
    where, orderBy: { razaoSocial: 'asc' }, take: 500,
    select: {
      id: true, codigo: true, razaoSocial: true, nomeFantasia: true,
      tipoAtividade: true, bairro: true, situacaoLicenca: true,
      dataVencLic: true, grauRisco: true, cnpj: true,
      _count: { select: { vistorias: true, infrações: true } },
    },
  })

  // Flag vencendo em 30 dias
  const em30d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const enriched = estabelecimentos.map(e => ({
    ...e,
    vencendoBreve: e.situacaoLicenca === 'VIGENTE' && e.dataVencLic && new Date(e.dataVencLic) <= em30d,
  }))

  return NextResponse.json({ estabelecimentos: enriched, total: enriched.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const body = await req.json()

  // ── VISTORIA ──────────────────────────────────────────────────────────────
  if (body._recurso === 'VISTORIA') {
    const Schema = z.object({
      estabelecimentoId: z.string(),
      tipo:              z.enum(['ROTINA','DENUNCIA','RENOVACAO_LICENCA','ESPECIAL']).default('ROTINA'),
      dataVistoria:      z.string(),
      autuadorNome:      z.string().optional(),
      resultado:         z.enum(['APROVADO','APROVADO_COM_RESSALVAS','REPROVADO','INTERDITADO']),
      observacoes:       z.string().optional(),
      prazoCorrecao:     z.string().optional(),
      laudo:             z.string().optional(),
    })
    const val = Schema.safeParse(body)
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
    const d = val.data

    const numero = await gerarNumeroVistoria(usuario.municipioId)
    const vistoria = await prisma.vistoriaVigilancia.create({
      data: {
        municipioId: usuario.municipioId,
        numero, ...d,
        dataVistoria: new Date(d.dataVistoria),
        prazoCorrecao: d.prazoCorrecao ? new Date(d.prazoCorrecao) : null,
        usuarioId: usuario.id,
      },
    })

    // Se INTERDITADO, suspende a licença
    if (d.resultado === 'INTERDITADO') {
      await prisma.estabelecimentoVigilancia.update({
        where: { id: d.estabelecimentoId },
        data: { situacaoLicenca: 'SUSPENSA' },
      })
    }

    // Se APROVADO na vistoria de renovação, atualiza licença
    if (d.tipo === 'RENOVACAO_LICENCA' && d.resultado === 'APROVADO') {
      const novaVigencia = new Date()
      novaVigencia.setFullYear(novaVigencia.getFullYear() + 1)
      await prisma.estabelecimentoVigilancia.update({
        where: { id: d.estabelecimentoId },
        data: { situacaoLicenca: 'VIGENTE', dataVencLic: novaVigencia },
      })
    }

    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: 'REGISTRAR_VISTORIA', entidade: 'VistoriaVigilancia', entidadeId: vistoria.id,
      detalhes: { numero, resultado: d.resultado, estabelecimentoId: d.estabelecimentoId },
    })

    return NextResponse.json({ vistoria, numero }, { status: 201 })
  }

  // ── AUTO DE INFRAÇÃO ──────────────────────────────────────────────────────
  if (body._recurso === 'AUTO_INFRACAO') {
    const Schema = z.object({
      estabelecimentoId:  z.string(),
      vistoriaId:         z.string().optional(),
      descricaoInfracao:  z.string().min(10),
      dispositivoLegal:   z.string().optional(),
      valorMulta:         z.number().optional(),
      prazoDefesa:        z.string().optional(),
    })
    const val = Schema.safeParse(body)
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
    const d = val.data

    const numero = await gerarNumeroAI(usuario.municipioId)
    const ai = await prisma.autoInfracao.create({
      data: {
        municipioId: usuario.municipioId,
        numero, ...d,
        prazoDefesa: d.prazoDefesa ? new Date(d.prazoDefesa) : null,
        usuarioId: usuario.id,
      },
    })

    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: 'LAVRAR_AUTO_INFRACAO', entidade: 'AutoInfracao', entidadeId: ai.id,
      detalhes: { numero, valorMulta: d.valorMulta },
    })

    return NextResponse.json({ autoInfracao: ai, numero }, { status: 201 })
  }

  // ── ESTABELECIMENTO VIGILÂNCIA ────────────────────────────────────────────
  const Schema = z.object({
    razaoSocial:       z.string().min(2),
    nomeFantasia:      z.string().optional(),
    cnpj:              z.string().optional(),
    tipoAtividade:     z.string(),
    logradouro:        z.string().optional(),
    numero:            z.string().optional(),
    bairro:            z.string().optional(),
    cep:               z.string().optional(),
    responsavelTecnico: z.string().optional(),
    responsavelCpf:    z.string().optional(),
    telefone:          z.string().optional(),
    email:             z.string().optional(),
    grauRisco:         z.string().optional(),
    numeroLicenca:     z.string().optional(),
    dataEmissaoLic:    z.string().optional(),
    dataVencLic:       z.string().optional(),
  })
  const val = Schema.safeParse(body)
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const codigo = await gerarCodigo(usuario.municipioId)
  const situacaoLicenca: any = d.dataVencLic ? (new Date(d.dataVencLic) > new Date() ? 'VIGENTE' : 'VENCIDA') : 'PENDENTE_RENOVACAO'

  const estab = await prisma.estabelecimentoVigilancia.create({
    data: {
      municipioId: usuario.municipioId,
      codigo, ...d,
      tipoAtividade: d.tipoAtividade as any,
      situacaoLicenca,
      dataEmissaoLic: d.dataEmissaoLic ? new Date(d.dataEmissaoLic) : null,
      dataVencLic:    d.dataVencLic    ? new Date(d.dataVencLic)    : null,
      usuarioId: usuario.id,
    },
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'CADASTRAR_ESTAB_VIGILANCIA', entidade: 'EstabelecimentoVigilancia', entidadeId: estab.id,
    detalhes: { razaoSocial: d.razaoSocial, tipo: d.tipoAtividade, codigo },
  })

  return NextResponse.json({ estabelecimento: estab, codigo }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, _recurso, ...dados } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  // Atualizar auto de infração (decisão de defesa)
  if (_recurso === 'AUTO_INFRACAO') {
    const Schema = z.object({
      situacao:        z.string().optional(),
      decisaoDefesa:   z.string().optional(),
      dataJulgamento:  z.string().optional(),
    })
    const val = Schema.safeParse(dados)
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
    await prisma.autoInfracao.update({
      where: { id },
      data: { ...val.data, dataJulgamento: val.data.dataJulgamento ? new Date(val.data.dataJulgamento) : undefined },
    })
    return NextResponse.json({ sucesso: true })
  }

  // Renovar licença manualmente
  if (acao === 'RENOVAR_LICENCA') {
    const { novaVigencia } = dados
    const novaData = novaVigencia ? new Date(novaVigencia) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    await prisma.estabelecimentoVigilancia.update({
      where: { id },
      data: { situacaoLicenca: 'VIGENTE', dataVencLic: novaData, dataEmissaoLic: new Date() },
    })
    return NextResponse.json({ sucesso: true, novaVigencia: novaData })
  }

  // Atualizar dados gerais
  const data: any = { ...dados }
  if (data.situacaoLicenca) data.situacaoLicenca = data.situacaoLicenca
  if (data.dataVencLic) data.dataVencLic = new Date(data.dataVencLic)
  await prisma.estabelecimentoVigilancia.update({ where: { id }, data })
  return NextResponse.json({ sucesso: true })
}
