import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// Propostas recebidas para um processo licitatório.
// Fase de julgamento: habilitação → classificação → lance (pregão) → vencedor.

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const processoId = searchParams.get('processoId')
  const fornecedorId = searchParams.get('fornecedorId')

  const where: any = { municipioId: usuario.municipioId }
  if (processoId)  where.processoId  = processoId
  if (fornecedorId) where.fornecedorId = fornecedorId

  const propostas = await prisma.proposta.findMany({
    where,
    orderBy: [{ classificacao: 'asc' }, { valorTotal: 'asc' }],
    include: {
      fornecedor: { select: { razaoSocial: true, nomeFantasia: true, cnpjCpf: true } },
      processo: { select: { numero: true, objeto: true, modalidade: true, criterio: true } },
    },
  })

  return NextResponse.json({ propostas, total: propostas.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    processoId:   z.string(),
    fornecedorId: z.string(),
    valorTotal:   z.number().positive(),
    desconto:     z.number().min(0).max(100).default(0),
    observacoes:  z.string().optional(),
    arquivoDocumentos: z.string().optional(),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  // Verificar se processo está em estado que aceita propostas
  const processo = await prisma.processoLicitatorio.findFirst({
    where: { id: d.processoId, municipioId: usuario.municipioId },
  })
  if (!processo) return NextResponse.json({ erro: 'Processo não encontrado' }, { status: 404 })
  if (!['PUBLICADO', 'EM_JULGAMENTO'].includes(processo.situacao)) {
    return NextResponse.json({ erro: `Processo em situação ${processo.situacao} não aceita propostas` }, { status: 409 })
  }

  // Proposta duplicada?
  const existente = await prisma.proposta.findUnique({
    where: { processoId_fornecedorId: { processoId: d.processoId, fornecedorId: d.fornecedorId } },
  })
  if (existente) return NextResponse.json({ erro: 'Fornecedor já possui proposta neste processo' }, { status: 409 })

  const proposta = await prisma.proposta.create({
    data: {
      municipioId:  usuario.municipioId,
      processoId:   d.processoId,
      fornecedorId: d.fornecedorId,
      valorTotal:   d.valorTotal,
      desconto:     d.desconto,
      observacoes:  d.observacoes,
      arquivoDocumentos: d.arquivoDocumentos,
      usuarioId:    usuario.id,
    },
  })

  return NextResponse.json({ proposta }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, ...extras } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const proposta = await prisma.proposta.findFirst({
    where: { id, municipioId: usuario.municipioId },
  })
  if (!proposta) return NextResponse.json({ erro: 'Proposta não encontrada' }, { status: 404 })

  // Habilitar / inabilitar
  if (acao === 'HABILITAR') {
    await prisma.proposta.update({
      where: { id },
      data: { habilitada: true, situacao: 'HABILITADA', motivoInabilitacao: null },
    })
    return NextResponse.json({ sucesso: true })
  }

  if (acao === 'INABILITAR') {
    await prisma.proposta.update({
      where: { id },
      data: {
        habilitada: false,
        situacao: 'INABILITADA',
        motivoInabilitacao: extras.motivo,
      },
    })
    return NextResponse.json({ sucesso: true })
  }

  // Registrar lance (pregão)
  if (acao === 'LANCE') {
    if (proposta.situacao === 'INABILITADA') {
      return NextResponse.json({ erro: 'Proposta inabilitada não pode dar lance' }, { status: 409 })
    }
    await prisma.proposta.update({
      where: { id },
      data: {
        valorLance: extras.valorLance,
        dataLance:  new Date(),
        situacao:   'EM_ANALISE',
      },
    })
    return NextResponse.json({ sucesso: true })
  }

  // Classificar (define ranking e vencedor)
  if (acao === 'CLASSIFICAR') {
    // extras.classificacoes: [{ id, classificacao }]
    await prisma.$transaction(
      extras.classificacoes.map((c: { id: string; classificacao: number }) =>
        prisma.proposta.update({
          where: { id: c.id },
          data: {
            classificacao: c.classificacao,
            situacao: c.classificacao === 1 ? 'VENCEDORA'
              : c.classificacao === 2 ? 'SEGUNDA_COLOCADA'
              : 'HABILITADA',
            dataJulgamento: new Date(),
          },
        })
      )
    )
    return NextResponse.json({ sucesso: true })
  }

  // Desclassificar
  if (acao === 'DESCLASSIFICAR') {
    await prisma.proposta.update({
      where: { id },
      data: {
        situacao: 'DESCLASSIFICADA',
        motivoDesclassificacao: extras.motivo,
      },
    })
    return NextResponse.json({ sucesso: true })
  }

  return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
}
