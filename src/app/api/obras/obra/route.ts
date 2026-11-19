import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Obras Públicas ───────────────────────────────────────────────────────────
// Lei 14.133/2021 — Nova Lei de Licitações
// Fluxo: PLANEJADA → LICITANDO → CONTRATADA → EM_EXECUCAO → CONCLUIDA

const TRANSICOES: Record<string, string[]> = {
  PLANEJADA:    ['LICITANDO', 'EM_EXECUCAO', 'CANCELADA'],  // execução direta sem licitação
  LICITANDO:    ['CONTRATADA', 'CANCELADA'],
  CONTRATADA:   ['EM_EXECUCAO', 'CANCELADA'],
  EM_EXECUCAO:  ['PARALISADA', 'CONCLUIDA', 'CANCELADA'],
  PARALISADA:   ['EM_EXECUCAO', 'CANCELADA'],
  CONCLUIDA:    [],
  CANCELADA:    [],
}

async function gerarNumeroObra(municipioId: string): Promise<string> {
  const ano   = new Date().getFullYear()
  const count = await prisma.obra.count({ where: { municipioId } })
  return `OB-${ano}-${String(count + 1).padStart(3, '0')}`
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
    const [total, planejadas, emExecucao, paralisadas, concluidas, canceladas] = await Promise.all([
      prisma.obra.count({ where: { municipioId: usuario.municipioId } }),
      prisma.obra.count({ where: { municipioId: usuario.municipioId, situacao: 'PLANEJADA' } }),
      prisma.obra.count({ where: { municipioId: usuario.municipioId, situacao: 'EM_EXECUCAO' } }),
      prisma.obra.count({ where: { municipioId: usuario.municipioId, situacao: 'PARALISADA' } }),
      prisma.obra.count({ where: { municipioId: usuario.municipioId, situacao: 'CONCLUIDA' } }),
      prisma.obra.count({ where: { municipioId: usuario.municipioId, situacao: 'CANCELADA' } }),
    ])

    const agg = await prisma.obra.aggregate({
      where: { municipioId: usuario.municipioId },
      _sum: { valorOrcado: true, valorMedidoAcumulado: true },
    })

    const emExecucaoObras = await prisma.obra.findMany({
      where: { municipioId: usuario.municipioId, situacao: 'EM_EXECUCAO' },
      select: { percentualFisicoAcumulado: true },
    })
    const avgPercFisico = emExecucaoObras.length > 0
      ? emExecucaoObras.reduce((s, o) => s + Number(o.percentualFisicoAcumulado), 0) / emExecucaoObras.length
      : 0

    return NextResponse.json({
      kpis: {
        total, planejadas, emExecucao, paralisadas, concluidas, canceladas,
        totalOrcado:  Number(agg._sum.valorOrcado  ?? 0).toFixed(2),
        totalMedido:  Number(agg._sum.valorMedidoAcumulado ?? 0).toFixed(2),
        avgPercFisico: avgPercFisico.toFixed(1),
      },
    })
  }

  if (id) {
    const obra = await prisma.obra.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        contrato: {
          include: { aditivos: { orderBy: { numero: 'asc' } } },
        },
        medicoes: { orderBy: { numero: 'asc' } },
        fiscalizacoes: { orderBy: { dataVisita: 'desc' } },
      },
    })
    if (!obra) return NextResponse.json({ erro: 'Obra não encontrada' }, { status: 404 })
    return NextResponse.json({ obra })
  }

  const where: any = { municipioId: usuario.municipioId }
  if (situacao) where.situacao = situacao
  if (tipo)     where.tipo     = tipo
  if (busca) {
    where.OR = [
      { titulo:      { contains: busca } },
      { numero:      { contains: busca } },
      { logradouro:  { contains: busca } },
      { bairro:      { contains: busca } },
      { fontRecurso: { contains: busca } },
    ]
  }

  const obras = await prisma.obra.findMany({
    where, orderBy: { criadoEm: 'desc' }, take: 200,
    include: {
      contrato: { select: { numero: true, contratadaNome: true, valorContrato: true } },
      _count: { select: { medicoes: true, fiscalizacoes: true } },
    },
  })

  return NextResponse.json({ obras, total: obras.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    titulo:      z.string().min(5),
    tipo:        z.enum(['PAVIMENTACAO','DRENAGEM','CONSTRUCAO','REFORMA','AMPLIACAO','DEMOLIÇÃO','REVITALIZACAO','SANEAMENTO','ILUMINACAO','PONTES_VIADUTOS','OUTRO']),
    descricao:   z.string().optional(),
    logradouro:  z.string().optional(),
    bairro:      z.string().optional(),
    cep:         z.string().optional(),
    valorOrcado: z.number().min(0),
    fontRecurso: z.string().optional(),
    programaFederal: z.string().optional(),
    dataInicioPrevista:    z.string().optional(),
    dataConclusaoPrevista: z.string().optional(),
    responsavelTecnico:    z.string().optional(),
    crea:                  z.string().optional(),
    contratoId:            z.string().optional(),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const numero = await gerarNumeroObra(usuario.municipioId)

  const obra = await prisma.obra.create({
    data: {
      municipioId: usuario.municipioId,
      numero,
      ...d,
      dataInicioPrevista:    d.dataInicioPrevista    ? new Date(d.dataInicioPrevista)    : undefined,
      dataConclusaoPrevista: d.dataConclusaoPrevista ? new Date(d.dataConclusaoPrevista) : undefined,
      usuarioId: usuario.id,
    },
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'CADASTRAR_OBRA', entidade: 'Obra', entidadeId: obra.id,
    detalhes: { numero, titulo: d.titulo, tipo: d.tipo, valorOrcado: d.valorOrcado },
  })

  return NextResponse.json({ obra, numero }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, ...dados } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const obra = await prisma.obra.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!obra) return NextResponse.json({ erro: 'Obra não encontrada' }, { status: 404 })

  if (acao) {
    // Mudança de situação
    const permitidos = TRANSICOES[obra.situacao] ?? []
    if (!permitidos.includes(acao)) {
      return NextResponse.json({
        erro: `Transição inválida: ${obra.situacao} → ${acao}`, permitidos,
      }, { status: 409 })
    }

    const atualizacoes: any = { situacao: acao }
    if (acao === 'EM_EXECUCAO' && !obra.dataInicioReal) {
      atualizacoes.dataInicioReal = new Date()
    }
    if (acao === 'CONCLUIDA') {
      atualizacoes.dataConclusaoReal  = new Date()
      atualizacoes.percentualFisicoAcumulado = 100
    }

    await prisma.obra.update({ where: { id }, data: atualizacoes })
    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: `OBRA_${acao}`, entidade: 'Obra', entidadeId: id,
      detalhes: { numero: obra.numero, de: obra.situacao, para: acao },
    })

    return NextResponse.json({ sucesso: true, situacao: acao })
  }

  // Atualização de dados
  if (dados.dataInicioPrevista)    dados.dataInicioPrevista    = new Date(dados.dataInicioPrevista)
  if (dados.dataConclusaoPrevista) dados.dataConclusaoPrevista = new Date(dados.dataConclusaoPrevista)
  if (dados.dataInicioReal)        dados.dataInicioReal        = new Date(dados.dataInicioReal)

  const atualizada = await prisma.obra.update({ where: { id }, data: dados })
  return NextResponse.json({ obra: atualizada })
}
