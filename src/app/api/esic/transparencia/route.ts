// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Tipos obrigatórios Art. 8 LAI com periodicidade ─────────────────────────
const OBRIGATORIOS_LAI: Record<string, { periodicidade: string; prazo: string }> = {
  RECEITAS_DESPESAS:            { periodicidade: 'Diária',    prazo: 'Art. 48, LC 101/2000 - execução diária' },
  LICITACOES_CONTRATOS:         { periodicidade: 'Imediata',  prazo: 'Art. 8 §1 III LAI - publicação ao publicar' },
  ESTRUTURA_ORGANIZACIONAL:     { periodicidade: 'Anual',     prazo: 'Art. 8 §1 I LAI' },
  ACOES_PROGRAMAS:              { periodicidade: 'Semestral', prazo: 'Art. 8 §1 II LAI' },
  REPASSES_TRANSFERENCIAS:      { periodicidade: 'Mensal',    prazo: 'Art. 8 §1 III LAI' },
  OBRAS_PUBLICAS:               { periodicidade: 'Mensal',    prazo: 'Art. 8 §1 IV LAI' },
  SERVIDORES:                   { periodicidade: 'Mensal',    prazo: 'Art. 8 §1 V LAI' },
  RESPOSTAS_PERGUNTAS_FREQUENTES:{ periodicidade: 'Contínua', prazo: 'Art. 8 §1 VI LAI' },
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const tipo      = searchParams.get('tipo')
  const situacao  = searchParams.get('situacao')
  const busca     = searchParams.get('busca')
  const relatorio = searchParams.get('relatorio')

  // ── Painel de conformidade Art. 8 ─────────────────────────────────────────
  if (relatorio === 'CONFORMIDADE') {
    const publicados = await prisma.TransparenciaAtiva.findMany({
      where: {
        municipioId: usuario.municipioId,
        situacao: 'PUBLICADO',
      },
      select: { tipo: true, dataUltimaAtualizacao: true, dataProximaAtualizacao: true },
    })

    const hoje = new Date()
    const checklist = Object.entries(OBRIGATORIOS_LAI).map(([tipo, meta]) => {
      const item = publicados.find(p => p.tipo === tipo)
      const desatualizado = item?.dataProximaAtualizacao
        ? new Date(item.dataProximaAtualizacao) < hoje
        : false
      return {
        tipo,
        periodicidade: meta.periodicidade,
        fundamento:    meta.prazo,
        publicado:     !!item,
        desatualizado,
        dataUltimaAtualizacao: item?.dataUltimaAtualizacao ?? null,
        status: !item ? 'NAO_PUBLICADO' : desatualizado ? 'DESATUALIZADO' : 'OK',
      }
    })

    const conformidade = {
      total:       checklist.length,
      ok:          checklist.filter(c => c.status === 'OK').length,
      desatualizado: checklist.filter(c => c.status === 'DESATUALIZADO').length,
      naoPub:      checklist.filter(c => c.status === 'NAO_PUBLICADO').length,
      percentual:  Math.round((checklist.filter(c => c.status === 'OK').length / checklist.length) * 100),
    }

    return NextResponse.json({ checklist, conformidade })
  }

  if (id) {
    const item = await prisma.TransparenciaAtiva.findFirst({
      where: { id, municipioId: usuario.municipioId },
    })
    if (!item) return NextResponse.json({ erro: 'Publicação não encontrada' }, { status: 404 })
    return NextResponse.json({ transparencia: item })
  }

  const where: any = { municipioId: usuario.municipioId }
  if (tipo)     where.tipo     = tipo
  if (situacao) where.situacao = situacao
  if (busca)    where.OR = [
    { titulo:      { contains: busca } },
    { descricao:   { contains: busca } },
    { secretaria:  { contains: busca } },
    { palavrasChave:{ contains: busca } },
  ]

  const items = await prisma.TransparenciaAtiva.findMany({
    where,
    orderBy: { atualizadoEm: 'desc' },
  })

  return NextResponse.json({ transparencias: items })
}

// ─── POST ─────────────────────────────────────────────────────────────────────

const SchemaTransparencia = z.object({
  tipo:          z.string(),
  titulo:        z.string().min(5),
  descricao:     z.string().min(10),
  conteudo:      z.string().optional(),
  urlExterna:    z.string().url().optional(),
  urlArquivo:    z.string().optional(),
  periodoCoberto:z.string().optional(),
  periodicidade: z.string().optional(),
  palavrasChave: z.string().optional(),
  secretaria:    z.string().optional(),
  dataProximaAtualizacao: z.string().optional(),
  publicarAgora: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const val = SchemaTransparencia.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const agora = new Date()

  const item = await prisma.TransparenciaAtiva.create({
    data: {
      municipioId:   usuario.municipioId,
      tipo:          d.tipo as any,
      situacao:      d.publicarAgora ? 'PUBLICADO' : 'RASCUNHO',
      titulo:        d.titulo,
      descricao:     d.descricao,
      conteudo:      d.conteudo,
      urlExterna:    d.urlExterna,
      urlArquivo:    d.urlArquivo,
      periodoCoberto:d.periodoCoberto,
      periodicidade: d.periodicidade ?? OBRIGATORIOS_LAI[d.tipo]?.periodicidade,
      palavrasChave: d.palavrasChave,
      secretaria:    d.secretaria,
      dataProximaAtualizacao: d.dataProximaAtualizacao
        ? new Date(d.dataProximaAtualizacao)
        : null,
      publicadoEm:         d.publicarAgora ? agora : null,
      dataUltimaAtualizacao: d.publicarAgora ? agora : null,
      usuarioId:     usuario.usuarioId,
    },
  })

  await auditLog({
    municipioId: usuario.municipioId,
    usuarioId:   usuario.usuarioId,
    acao: 'CREATE',
    modulo: 'esic', recurso: 'transparencia',
    registroId:  item.id,
    dadosNovos: { tipo: d.tipo, titulo: d.titulo },
  })

  return NextResponse.json({ transparencia: item }, { status: 201 })
}

// ─── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, ...extras } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const item = await prisma.TransparenciaAtiva.findFirst({
    where: { id, municipioId: usuario.municipioId },
  })
  if (!item) return NextResponse.json({ erro: 'Publicação não encontrada' }, { status: 404 })

  const dataAtualizada: any = {}

  if (acao === 'PUBLICAR') {
    dataAtualizada.situacao              = 'PUBLICADO'
    dataAtualizada.publicadoEm           = new Date()
    dataAtualizada.dataUltimaAtualizacao = new Date()
    if (extras.conteudo)      dataAtualizada.conteudo = extras.conteudo
    if (extras.urlExterna)    dataAtualizada.urlExterna = extras.urlExterna
    if (extras.urlArquivo)    dataAtualizada.urlArquivo = extras.urlArquivo
    if (extras.periodoCoberto) dataAtualizada.periodoCoberto = extras.periodoCoberto
    if (extras.dataProximaAtualizacao) {
      dataAtualizada.dataProximaAtualizacao = new Date(extras.dataProximaAtualizacao)
    }
  }

  if (acao === 'ATUALIZAR') {
    dataAtualizada.dataUltimaAtualizacao = new Date()
    dataAtualizada.situacao              = 'PUBLICADO'
    if (extras.conteudo)        dataAtualizada.conteudo        = extras.conteudo
    if (extras.urlArquivo)      dataAtualizada.urlArquivo      = extras.urlArquivo
    if (extras.urlExterna)      dataAtualizada.urlExterna      = extras.urlExterna
    if (extras.periodoCoberto)  dataAtualizada.periodoCoberto  = extras.periodoCoberto
    if (extras.titulo)          dataAtualizada.titulo          = extras.titulo
    if (extras.descricao)       dataAtualizada.descricao       = extras.descricao
    if (extras.dataProximaAtualizacao) {
      dataAtualizada.dataProximaAtualizacao = new Date(extras.dataProximaAtualizacao)
    }
  }

  if (acao === 'ARQUIVAR') {
    dataAtualizada.situacao = 'ARQUIVADO'
  }

  if (acao === 'INCREMENTAR_VISUALIZACAO') {
    dataAtualizada.visualizacoes = { increment: 1 }
  }

  if (acao === 'INCREMENTAR_DOWNLOAD') {
    dataAtualizada.downloads = { increment: 1 }
  }

  const atualizado = await prisma.TransparenciaAtiva.update({
    where: { id },
    data:  dataAtualizada,
  })

  if (!['INCREMENTAR_VISUALIZACAO','INCREMENTAR_DOWNLOAD'].includes(acao)) {
    await auditLog({
      municipioId: usuario.municipioId,
      usuarioId:   usuario.usuarioId,
      acao,
      modulo: 'esic', recurso: 'transparencia',
      registroId:  id,
    })
  }

  return NextResponse.json({ transparencia: atualizado })
}
