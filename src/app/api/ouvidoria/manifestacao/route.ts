// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Manifestações da Ouvidoria ───────────────────────────────────────────────
// Lei 13.460/2017 - Código de Defesa do Usuário do Serviço Público
// LAI 12.527/2011 - Acesso à Informação - PRAZO: 20 dias úteis (prorrogável +10)
// Reclamação, Denúncia, Sugestão, Elogio, Solicitação de Info/Serviço

// Prazo de resposta em dias corridos (aproximação das regras da LAI para municípios)
const PRAZO_DIAS: Record<string, number> = {
  RECLAMACAO:         15,
  SUGESTAO:           30,
  ELOGIO:             5,
  DENUNCIA:           30,
  SOLICITACAO_INFO:   20,  // LAI: 20 dias úteis → aproximamos por corridos
  SOLICITACAO_SERVICO: 15,
}

// Prorrogação LAI
const PRAZO_PRORROGACAO: Record<string, number> = {
  SOLICITACAO_INFO: 10,
  RECLAMACAO:       5,
  DENUNCIA:         15,
}

const TRANSICOES: Record<string, string[]> = {
  RECEBIDA:       ['EM_ANALISE', 'DEVOLVIDA', 'ARQUIVADA'],
  EM_ANALISE:     ['AGUARDANDO_RESP', 'RESPONDIDA', 'DEVOLVIDA', 'ARQUIVADA'],
  AGUARDANDO_RESP: ['RESPONDIDA', 'EM_ANALISE'],
  RESPONDIDA:     ['ENCERRADA', 'EM_ANALISE'],  // reabre se insatisfatório
  DEVOLVIDA:      ['EM_ANALISE', 'ARQUIVADA'],
  ENCERRADA:      [],
  ARQUIVADA:      [],
}

async function gerarProtocolo(municipioId: string): Promise<string> {
  const ano   = new Date().getFullYear()
  const count = await prisma.manifestacao.count({ where: { municipioId } })
  return `OUV-${ano}-${String(count + 1).padStart(5, '0')}`
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const relatorio = searchParams.get('relatorio')
  const tipo      = searchParams.get('tipo')
  const situacao  = searchParams.get('situacao')
  const secretaria = searchParams.get('secretaria')
  const busca     = searchParams.get('busca')
  const vencendo  = searchParams.get('vencendo')   // "true" = prazos a vencer em 48h

  if (relatorio === 'DASHBOARD') {
    const hoje = new Date()
    const em48h = new Date(hoje.getTime() + 48 * 60 * 60 * 1000)
    const em7d  = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000)

    const [total, recebidas, emAnalise, aguardando, respondidas, encerradas, vencendo48h, atrasadas] = await Promise.all([
      prisma.manifestacao.count({ where: { municipioId: usuario.municipioId } }),
      prisma.manifestacao.count({ where: { municipioId: usuario.municipioId, situacao: 'RECEBIDA' } }),
      prisma.manifestacao.count({ where: { municipioId: usuario.municipioId, situacao: 'EM_ANALISE' } }),
      prisma.manifestacao.count({ where: { municipioId: usuario.municipioId, situacao: 'AGUARDANDO_RESP' } }),
      prisma.manifestacao.count({ where: { municipioId: usuario.municipioId, situacao: 'RESPONDIDA' } }),
      prisma.manifestacao.count({ where: { municipioId: usuario.municipioId, situacao: 'ENCERRADA' } }),
      prisma.manifestacao.count({
        where: {
          municipioId: usuario.municipioId,
          situacao: { notIn: ['ENCERRADA', 'ARQUIVADA'] },
          prazoResposta: { gte: hoje, lte: em48h },
        },
      }),
      prisma.manifestacao.count({
        where: {
          municipioId: usuario.municipioId,
          situacao: { notIn: ['ENCERRADA', 'ARQUIVADA'] },
          prazoResposta: { lt: hoje },
        },
      }),
    ])

    // Por tipo
    const porTipo = await prisma.manifestacao.groupBy({
      by: ['tipo'],
      where: { municipioId: usuario.municipioId },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    })

    // Por secretaria
    const porSecretaria = await prisma.manifestacao.groupBy({
      by: ['secretariaDestino'],
      where: { municipioId: usuario.municipioId, situacao: { notIn: ['ENCERRADA', 'ARQUIVADA'] } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    })

    // Satisfação média
    const satisfacao = await prisma.manifestacao.findMany({
      where: { municipioId: usuario.municipioId, avaliado: true },
      select: { satisfacao: true },
    })
    const mapVal: Record<string, number> = { MUITO_SATISFEITO: 5, SATISFEITO: 4, NEUTRO: 3, INSATISFEITO: 2, MUITO_INSATISFEITO: 1 }
    const notas = satisfacao.filter(s => s.satisfacao).map(s => mapVal[s.satisfacao!] ?? 3)
    const mediaSatisfacao = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1) : null

    return NextResponse.json({ kpis: { total, recebidas, emAnalise, aguardando, respondidas, encerradas, vencendo48h, atrasadas }, porTipo, porSecretaria, mediaSatisfacao })
  }

  if (id) {
    const manifestacao = await prisma.manifestacao.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        movimentacoes: { orderBy: { criadoEm: 'asc' } },
        respostas:     { orderBy: { criadoEm: 'asc' } },
      },
    })
    if (!manifestacao) return NextResponse.json({ erro: 'Manifestação não encontrada' }, { status: 404 })

    const hoje = new Date()
    const diasRestantes = Math.ceil((manifestacao.prazoResposta.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

    return NextResponse.json({ manifestacao, diasRestantes })
  }

  const where: any = { municipioId: usuario.municipioId }
  if (tipo)      where.tipo      = tipo
  if (situacao)  where.situacao  = situacao
  if (secretaria) where.secretariaDestino = { contains: secretaria }
  if (busca) {
    where.OR = [
      { protocolo:    { contains: busca } },
      { assunto:      { contains: busca } },
      { nomeManifestante: { contains: busca } },
    ]
  }
  if (vencendo === 'true') {
    const em48h = new Date(Date.now() + 48 * 60 * 60 * 1000)
    where.prazoResposta = { lte: em48h }
    where.situacao = { notIn: ['ENCERRADA', 'ARQUIVADA'] }
  }

  const manifestacoes = await prisma.manifestacao.findMany({
    where, orderBy: { criadoEm: 'desc' }, take: 200,
    select: {
      id: true, protocolo: true, tipo: true, situacao: true, assunto: true,
      secretariaDestino: true, prioridade: true, prazoResposta: true, prorrogado: true,
      anonima: true, nomeManifestante: true, lai: true, avaliado: true, satisfacao: true,
      criadoEm: true,
    },
  })

  // Enriquece com flags de prazo
  const hoje = new Date()
  const em48h = new Date(hoje.getTime() + 48 * 60 * 60 * 1000)
  const enriched = manifestacoes.map(m => ({
    ...m,
    atrasada: m.prazoResposta < hoje && !['ENCERRADA','ARQUIVADA'].includes(m.situacao),
    vencendoBreve: m.prazoResposta >= hoje && m.prazoResposta <= em48h && !['ENCERRADA','ARQUIVADA'].includes(m.situacao),
    diasRestantes: Math.ceil((m.prazoResposta.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)),
  }))

  return NextResponse.json({ manifestacoes: enriched, total: enriched.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    tipo:               z.enum(['RECLAMACAO','SUGESTAO','ELOGIO','DENUNCIA','SOLICITACAO_INFO','SOLICITACAO_SERVICO']),
    assunto:            z.string().min(5),
    descricao:          z.string().min(10),
    secretariaDestino:  z.string().optional(),
    prioridade:         z.enum(['BAIXA','NORMAL','ALTA','URGENTE']).default('NORMAL'),
    anonima:            z.boolean().default(false),
    nomeManifestante:   z.string().optional(),
    cpfManifestante:    z.string().optional(),
    emailManifestante:  z.string().email().optional().or(z.literal('')),
    telefoneManifestante: z.string().optional(),
    enderecoManifestante: z.string().optional(),
    lai:                z.boolean().default(false),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  // Valida: denúncia pode ser anônima; elogio/sugestão exigem identificação
  if (!d.anonima && !d.nomeManifestante && d.tipo !== 'DENUNCIA') {
    return NextResponse.json({ erro: 'Nome do manifestante obrigatório (ou marque como anônima)' }, { status: 400 })
  }

  const protocolo = await gerarProtocolo(usuario.municipioId)

  // Calcula prazo de resposta
  const prazo = new Date()
  prazo.setDate(prazo.getDate() + PRAZO_DIAS[d.tipo])
  const lai = d.lai || d.tipo === 'SOLICITACAO_INFO'

  const manifestacao = await prisma.manifestacao.create({
    data: {
      municipioId: usuario.municipioId,
      protocolo,
      tipo: d.tipo as any,
      assunto: d.assunto,
      descricao: d.descricao,
      secretariaDestino: d.secretariaDestino,
      prioridade: d.prioridade,
      prazoResposta: prazo,
      anonima: d.anonima,
      nomeManifestante: d.anonima ? null : d.nomeManifestante,
      cpfManifestante:  d.anonima ? null : (d.cpfManifestante?.replace(/\D/g, '') || null),
      emailManifestante: d.anonima ? null : (d.emailManifestante || null),
      telefoneManifestante: d.telefoneManifestante,
      enderecoManifestante: d.enderecoManifestante,
      lai,
      usuarioId: usuario.usuarioId,
    },
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.usuarioId,
    acao: 'CREATE', modulo: 'misc', recurso: 'Manifestacao', registroId: manifestacao.id,
    dadosNovos: { protocolo, tipo: d.tipo, assunto: d.assunto, lai },
  })

  return NextResponse.json({ manifestacao, protocolo }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, ...dados } = await req.json()
  if (!id || !acao) return NextResponse.json({ erro: 'id e acao obrigatórios' }, { status: 400 })

  const manifestacao = await prisma.manifestacao.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!manifestacao) return NextResponse.json({ erro: 'Manifestação não encontrada' }, { status: 404 })

  const permitidos = TRANSICOES[manifestacao.situacao] ?? []
  if (!permitidos.includes(acao) && acao !== 'PRORROGAR' && acao !== 'ATRIBUIR' && acao !== 'AVALIAR') {
    return NextResponse.json({ erro: `Transição ${manifestacao.situacao}→${acao} não permitida` }, { status: 409 })
  }

  if (acao === 'PRORROGAR') {
    if (manifestacao.prorrogado) {
      return NextResponse.json({ erro: 'Manifestação já foi prorrogada' }, { status: 409 })
    }
    const diasExtra = PRAZO_PRORROGACAO[manifestacao.tipo] ?? 10
    const novoPrazo = new Date(manifestacao.prazoResposta)
    novoPrazo.setDate(novoPrazo.getDate() + diasExtra)

    await prisma.manifestacao.update({
      where: { id },
      data: { prorrogado: true, prazoApos: novoPrazo },
    })
    return NextResponse.json({ sucesso: true, novoPrazo, diasExtras: diasExtra })
  }

  if (acao === 'ATRIBUIR') {
    const { atribuidoA, secretariaDestino } = dados
    await prisma.manifestacao.update({
      where: { id },
      data: {
        atribuidoA,
        ...(secretariaDestino ? { secretariaDestino } : {}),
        situacao: manifestacao.situacao === 'RECEBIDA' ? 'EM_ANALISE' : manifestacao.situacao,
      },
    })
    return NextResponse.json({ sucesso: true })
  }

  if (acao === 'AVALIAR') {
    const { satisfacao, comentario } = dados
    await prisma.manifestacao.update({
      where: { id },
      data: {
        avaliado: true,
        satisfacao: satisfacao as any,
        comentarioAval: comentario,
        avaliadoEm: new Date(),
        situacao: 'ENCERRADA',
      },
    })
    return NextResponse.json({ sucesso: true })
  }

  // Transições de situação
  await prisma.$transaction(async (tx) => {
    await tx.manifestacao.update({
      where: { id },
      data: { situacao: acao as any },
    })
    await tx.movimentacaoManifestacao.create({
      data: {
        municipioId: usuario.municipioId,
        manifestacaoId: id,
        situacaoDe:    manifestacao.situacao as any,
        situacaoPara:  acao as any,
        motivo: dados.motivo,
        usuarioId: usuario.usuarioId,
      },
    })
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.usuarioId,
    acao: 'UPDATE', modulo: 'misc', recurso: 'Manifestacao', registroId: id,
    dadosNovos: { protocolo: manifestacao.protocolo, de: manifestacao.situacao, para: acao },
  })

  return NextResponse.json({ sucesso: true })
}
