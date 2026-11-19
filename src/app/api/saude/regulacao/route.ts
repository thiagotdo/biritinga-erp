import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

async function gerarNumeroRegulacao(municipioId: string): Promise<string> {
  const ano = new Date().getFullYear()
  const count = await prisma.regulacao.count({
    where: { municipioId, numero: { startsWith: `REG-${ano}-` } },
  })
  return `REG-${ano}-${String(count + 1).padStart(3, '0')}`
}

const TRANSICOES: Record<string, string> = {
  INICIAR_REGULACAO: 'EM_REGULACAO',
  AGENDAR:           'AGENDADO',
  REGISTRAR_REALIZADO: 'REALIZADO',
  CANCELAR:          'CANCELADO',
  DEVOLVER:          'DEVOLVIDO',
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id         = searchParams.get('id')
  const pacienteId = searchParams.get('pacienteId')
  const situacao   = searchParams.get('situacao')
  const tipo       = searchParams.get('tipo')
  const prioridade = searchParams.get('prioridade')
  const relatorio  = searchParams.get('relatorio')
  const busca      = searchParams.get('busca')

  if (relatorio === 'DASHBOARD') {
    const [total, solicitado, emRegulacao, agendado, urgentes, porTipo] = await Promise.all([
      prisma.regulacao.count({ where: { municipioId: usuario.municipioId } }),
      prisma.regulacao.count({ where: { municipioId: usuario.municipioId, situacao: 'SOLICITADO' } }),
      prisma.regulacao.count({ where: { municipioId: usuario.municipioId, situacao: 'EM_REGULACAO' } }),
      prisma.regulacao.count({ where: { municipioId: usuario.municipioId, situacao: 'AGENDADO' } }),
      prisma.regulacao.count({ where: { municipioId: usuario.municipioId, prioridade: 'URGENTE', situacao: { notIn: ['REALIZADO','CANCELADO'] } } }),
      prisma.regulacao.groupBy({
        by: ['tipo'],
        where: { municipioId: usuario.municipioId, situacao: { notIn: ['REALIZADO','CANCELADO'] } },
        _count: true,
      }),
    ])
    return NextResponse.json({ kpis: { total, solicitado, emRegulacao, agendado, urgentes }, porTipo })
  }

  if (id) {
    const reg = await prisma.regulacao.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: { paciente: { select: { nomeCompleto: true, dataNascimento: true, cns: true, telefone: true } } },
    })
    if (!reg) return NextResponse.json({ erro: 'Regulação não encontrada' }, { status: 404 })
    return NextResponse.json({ regulacao: reg })
  }

  const where: any = { municipioId: usuario.municipioId }
  if (pacienteId) where.pacienteId = pacienteId
  if (situacao)   where.situacao   = situacao
  if (tipo)       where.tipo       = tipo
  if (prioridade) where.prioridade = prioridade
  if (busca) where.OR = [
    { numero:            { contains: busca } },
    { procedimentoNome:  { contains: busca } },
    { unidadeDestino:    { contains: busca } },
    { paciente: { nomeCompleto: { contains: busca } } },
  ]

  const regulacoes = await prisma.regulacao.findMany({
    where,
    orderBy: [{ prioridade: 'desc' }, { dataSolicitacao: 'asc' }],
    include: {
      paciente: { select: { nomeCompleto: true, dataNascimento: true, cns: true } },
    },
  })

  return NextResponse.json({ regulacoes })
}

const SchemaRegulacao = z.object({
  pacienteId:              z.string(),
  tipo:                    z.string(),
  prioridade:              z.string().default('ELETIVO'),
  procedimentoNome:        z.string().min(3),
  procedimentoCod:         z.string().optional(),
  cid10Indicacao:          z.string().optional(),
  justificativaClinica:    z.string().min(10),
  unidadeSolicitante:      z.string().min(2),
  profissionalSolicitante: z.string().min(2),
  atendimentoOrigemId:     z.string().optional(),
})

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const val = SchemaRegulacao.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const numero = await gerarNumeroRegulacao(usuario.municipioId)

  const regulacao = await prisma.regulacao.create({
    data: {
      municipioId:             usuario.municipioId,
      numero,
      pacienteId:              d.pacienteId,
      tipo:                    d.tipo as any,
      prioridade:              d.prioridade as any,
      situacao:                'SOLICITADO',
      procedimentoNome:        d.procedimentoNome,
      procedimentoCod:         d.procedimentoCod,
      cid10Indicacao:          d.cid10Indicacao,
      justificativaClinica:    d.justificativaClinica,
      unidadeSolicitante:      d.unidadeSolicitante,
      profissionalSolicitante: d.profissionalSolicitante,
      atendimentoOrigemId:     d.atendimentoOrigemId,
      usuarioId:               usuario.id,
    },
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'CRIAR_REGULACAO', entidade: 'Regulacao', entidadeId: regulacao.id,
    detalhes: { numero, tipo: d.tipo, prioridade: d.prioridade },
  })

  return NextResponse.json({ regulacao }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, ...extras } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const reg = await prisma.regulacao.findFirst({
    where: { id, municipioId: usuario.municipioId },
  })
  if (!reg) return NextResponse.json({ erro: 'Regulação não encontrada' }, { status: 404 })

  const destino = TRANSICOES[acao]
  if (!destino) return NextResponse.json({ erro: `Ação '${acao}' inválida` }, { status: 400 })

  const data: any = { situacao: destino }

  if (acao === 'INICIAR_REGULACAO') {
    data.reguladorNome  = extras.reguladorNome
    data.dataRegulacao  = new Date()
    data.observacaoRegulacao = extras.observacaoRegulacao
  }

  if (acao === 'AGENDAR') {
    if (!extras.unidadeDestino)   return NextResponse.json({ erro: 'unidadeDestino obrigatório' }, { status: 400 })
    if (!extras.dataAgendamento)  return NextResponse.json({ erro: 'dataAgendamento obrigatório' }, { status: 400 })
    data.unidadeDestino      = extras.unidadeDestino
    data.profissionalDestino = extras.profissionalDestino
    data.dataAgendamento     = new Date(extras.dataAgendamento)
    data.reguladorNome       = extras.reguladorNome ?? reg.reguladorNome
    if (!reg.dataRegulacao) data.dataRegulacao = new Date()
  }

  if (acao === 'REGISTRAR_REALIZADO') {
    data.dataRealizacao = extras.dataRealizacao ? new Date(extras.dataRealizacao) : new Date()
    data.laudoResultado = extras.laudoResultado
  }

  if (acao === 'CANCELAR') {
    data.motivoCancelamento = extras.motivoCancelamento
  }

  if (acao === 'DEVOLVER') {
    data.motivoDevolucao = extras.motivoDevolucao
  }

  const atualizada = await prisma.regulacao.update({ where: { id }, data })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao, entidade: 'Regulacao', entidadeId: id,
  })

  return NextResponse.json({ regulacao: atualizada })
}
