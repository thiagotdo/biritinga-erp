// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Helpers de prazo LAI ─────────────────────────────────────────────────────
// Art. 11 Lei 12.527/2011: 20 dias úteis (prorrogável por mais 10 com justificativa)
// Simplificação: dias corridos (municípios pequenos não têm calendário de feriados
// centralizado; ajustar para dias úteis via CRON conforme necessidade)

function adicionarDiasUteis(data: Date, dias: number): Date {
  const result = new Date(data)
  let adicionados = 0
  while (adicionados < dias) {
    result.setDate(result.getDate() + 1)
    const diaSemana = result.getDay()
    if (diaSemana !== 0 && diaSemana !== 6) adicionados++
  }
  return result
}

async function gerarProtocolo(municipioId: string): Promise<string> {
  const ano = new Date().getFullYear()
  const count = await prisma.pedidoAcesso.count({
    where: { municipioId, protocolo: { startsWith: `SIC-${ano}-` } },
  })
  return `SIC-${ano}-${String(count + 1).padStart(4, '0')}`
}

async function gerarNumeroRecurso(municipioId: string): Promise<string> {
  const ano = new Date().getFullYear()
  const count = await prisma.recursoPedido.count({
    where: { municipioId, numero: { startsWith: `REC-${ano}-` } },
  })
  return `REC-${ano}-${String(count + 1).padStart(3, '0')}`
}

// ─── Mapa de prazos por instância (Art. 15 e 16 LAI) ─────────────────────────
const PRAZO_RECURSO_DIAS: Record<string, number> = {
  PRIMEIRA_INSTANCIA: 10,
  SEGUNDA_INSTANCIA:  5,
  TERCEIRA_INSTANCIA: 5,
  CGM_TCM:            15,
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const busca     = searchParams.get('busca')
  const situacao  = searchParams.get('situacao')
  const setor     = searchParams.get('setor')
  const vencendo  = searchParams.get('vencendo') === 'true'
  const relatorio = searchParams.get('relatorio')

  // ── Dashboard / relatório ─────────────────────────────────────────────────
  if (relatorio === 'DASHBOARD') {
    const hoje = new Date()
    const limite48h = new Date(hoje)
    limite48h.setDate(hoje.getDate() + 2)

    const [
      total,
      pendentes,
      respondidos,
      indeferidos,
      atrasados,
      vencendoHoje,
      porSituacao,
      porSetor,
      mediaResposta,
    ] = await Promise.all([
      prisma.pedidoAcesso.count({ where: { municipioId: usuario.municipioId } }),
      prisma.pedidoAcesso.count({
        where: {
          municipioId: usuario.municipioId,
          situacao: { in: ['RECEBIDO','EM_TRAMITACAO','AGUARDANDO_SETOR','PRORROGADO'] },
        },
      }),
      prisma.pedidoAcesso.count({
        where: {
          municipioId: usuario.municipioId,
          situacao: { in: ['RESPONDIDO','PARCIALMENTE_ATENDIDO'] },
        },
      }),
      prisma.pedidoAcesso.count({
        where: { municipioId: usuario.municipioId, situacao: 'INDEFERIDO' },
      }),
      prisma.pedidoAcesso.count({
        where: {
          municipioId: usuario.municipioId,
          situacao: { in: ['RECEBIDO','EM_TRAMITACAO','AGUARDANDO_SETOR','PRORROGADO'] },
          dataLimiteResposta: { lt: hoje },
        },
      }),
      prisma.pedidoAcesso.count({
        where: {
          municipioId: usuario.municipioId,
          situacao: { in: ['RECEBIDO','EM_TRAMITACAO','AGUARDANDO_SETOR','PRORROGADO'] },
          dataLimiteResposta: { gte: hoje, lte: limite48h },
        },
      }),
      prisma.pedidoAcesso.groupBy({
        by: ['situacao'],
        where: { municipioId: usuario.municipioId },
        _count: true,
      }),
      prisma.pedidoAcesso.groupBy({
        by: ['setorDestinatario'],
        where: { municipioId: usuario.municipioId, setorDestinatario: { not: null } },
        _count: true,
        orderBy: { _count: { situacao: 'desc' } },
        take: 10,
      }),
      prisma.pedidoAcesso.aggregate({
        where: {
          municipioId: usuario.municipioId,
          diasResposta: { not: null },
        },
        _avg: { diasResposta: true },
      }),
    ])

    return NextResponse.json({
      kpis: { total, pendentes, respondidos, indeferidos, atrasados, vencendoHoje },
      porSituacao,
      porSetor,
      mediaRespostaDias: mediaResposta._avg.diasResposta ?? 0,
      percentualNoPrazo: total > 0
        ? Math.round(((respondidos - atrasados) / total) * 100)
        : 100,
    })
  }

  // ── Pedido individual ─────────────────────────────────────────────────────
  if (id) {
    const pedido = await prisma.pedidoAcesso.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        tramitacoes: { orderBy: { criadoEm: 'asc' } },
        recursos: { orderBy: { criadoEm: 'asc' } },
      },
    })
    if (!pedido) return NextResponse.json({ erro: 'Pedido não encontrado' }, { status: 404 })
    return NextResponse.json({ pedido })
  }

  // ── Lista ─────────────────────────────────────────────────────────────────
  const where: any = { municipioId: usuario.municipioId }
  if (situacao) where.situacao = situacao
  if (setor)    where.setorDestinatario = setor
  if (vencendo) {
    const limite = new Date()
    limite.setDate(limite.getDate() + 3)
    where.situacao = { in: ['RECEBIDO','EM_TRAMITACAO','AGUARDANDO_SETOR','PRORROGADO'] }
    where.dataLimiteResposta = { lte: limite }
  }
  if (busca) where.OR = [
    { protocolo:        { contains: busca } },
    { assunto:          { contains: busca } },
    { nomeRequerente:   { contains: busca } },
    { setorDestinatario:{ contains: busca } },
    { tematico:         { contains: busca } },
  ]

  const pedidos = await prisma.pedidoAcesso.findMany({
    where,
    orderBy: { dataProtocolo: 'desc' },
    include: {
      _count: { select: { recursos: true } },
    },
  })

  const hoje = new Date()
  // Auto-marcar atrasados (silent — não muda situação, apenas retorna flag)
  const enriched = pedidos.map(p => ({
    ...p,
    atrasado: ['RECEBIDO','EM_TRAMITACAO','AGUARDANDO_SETOR','PRORROGADO'].includes(p.situacao)
      && new Date(p.dataLimiteResposta) < hoje,
    diasRestantes: Math.ceil(
      (new Date(p.dataLimiteResposta).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    ),
  }))

  return NextResponse.json({ pedidos: enriched })
}

// ─── POST ─────────────────────────────────────────────────────────────────────

const SchemaPedido = z.object({
  tipoSolicitante:   z.string().default('PESSOA_FISICA'),
  nomeRequerente:    z.string().optional(),
  cpfCnpjRequerente: z.string().optional(),
  emailRequerente:   z.string().email().optional(),
  telefoneRequerente:z.string().optional(),
  enderecoRequerente:z.string().optional(),
  assunto:           z.string().min(5, 'Assunto muito curto'),
  descricaoPedido:   z.string().min(10, 'Descrição muito curta'),
  palavrasChave:     z.string().optional(),
  setorDestinatario: z.string().optional(),
  formaEntrega:      z.string().default('EMAIL'),
  tematico:          z.string().optional(),
})

const SchemaTramitacao = z.object({
  pedidoId:    z.string(),
  despacho:    z.string().min(5),
  setorOrigem: z.string().optional(),
  setorDestino:z.string().optional(),
})

const SchemaRecurso = z.object({
  pedidoId:      z.string(),
  instancia:     z.string(),
  nomeRecorrente:z.string().optional(),
  motivoRecurso: z.string().min(10),
})

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { tipo, ...dados } = body

  // ── Novo pedido ───────────────────────────────────────────────────────────
  if (tipo === 'PEDIDO') {
    const val = SchemaPedido.safeParse(dados)
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
    const d = val.data

    const protocolo           = await gerarProtocolo(usuario.municipioId)
    const dataProtocolo       = new Date()
    // Art. 11 — 20 dias úteis
    const dataLimiteResposta  = adicionarDiasUteis(dataProtocolo, 20)

    const pedido = await prisma.pedidoAcesso.create({
      data: {
        municipioId:        usuario.municipioId,
        protocolo,
        situacao:           'RECEBIDO',
        tipoSolicitante:    d.tipoSolicitante as any,
        nomeRequerente:     d.nomeRequerente,
        cpfCnpjRequerente:  d.cpfCnpjRequerente,
        emailRequerente:    d.emailRequerente,
        telefoneRequerente: d.telefoneRequerente,
        enderecoRequerente: d.enderecoRequerente,
        assunto:            d.assunto,
        descricaoPedido:    d.descricaoPedido,
        palavrasChave:      d.palavrasChave,
        setorDestinatario:  d.setorDestinatario,
        formaEntrega:       d.formaEntrega as any,
        dataProtocolo,
        dataLimiteResposta,
        tematico:           d.tematico,
        usuarioId:          usuario.usuarioId,
      },
    })

    // Tramitação inicial automática
    await prisma.tramitacaoPedido.create({
      data: {
        municipioId:  usuario.municipioId,
        pedidoId:     pedido.id,
        despacho:     `Pedido protocolado. Prazo legal: ${dataLimiteResposta.toLocaleDateString('pt-BR')} (20 dias úteis — Art. 11 Lei 12.527/2011).`,
        setorDestino: d.setorDestinatario ?? 'SIC',
        usuarioId:    usuario.usuarioId,
      },
    })

    await auditLog({
      municipioId: usuario.municipioId,
      usuarioId:   usuario.usuarioId,
      acao: 'CREATE',
      modulo: 'esic', recurso: 'pedido',
      registroId:  pedido.id,
      dadosNovos: { protocolo },
    })

    return NextResponse.json({ pedido }, { status: 201 })
  }

  // ── Tramitação interna ─────────────────────────────────────────────────────
  if (tipo === 'TRAMITACAO') {
    const val = SchemaTramitacao.safeParse(dados)
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
    const d = val.data

    const pedido = await prisma.pedidoAcesso.findFirst({
      where: { id: d.pedidoId, municipioId: usuario.municipioId },
    })
    if (!pedido) return NextResponse.json({ erro: 'Pedido não encontrado' }, { status: 404 })

    const tramitacao = await prisma.$transaction(async tx => {
      const t = await tx.tramitacaoPedido.create({
        data: {
          municipioId:  usuario.municipioId,
          pedidoId:     d.pedidoId,
          despacho:     d.despacho,
          setorOrigem:  d.setorOrigem,
          setorDestino: d.setorDestino,
          usuarioId:    usuario.usuarioId,
        },
      })

      // Atualizar situação do pedido
      if (d.setorDestino && pedido.situacao === 'RECEBIDO') {
        await tx.pedidoAcesso.update({
          where: { id: d.pedidoId },
          data: {
            situacao:          'EM_TRAMITACAO',
            setorDestinatario: d.setorDestino,
          },
        })
      }
      return t
    })

    return NextResponse.json({ tramitacao }, { status: 201 })
  }

  // ── Recurso ────────────────────────────────────────────────────────────────
  if (tipo === 'RECURSO') {
    const val = SchemaRecurso.safeParse(dados)
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
    const d = val.data

    const pedido = await prisma.pedidoAcesso.findFirst({
      where: { id: d.pedidoId, municipioId: usuario.municipioId },
    })
    if (!pedido) return NextResponse.json({ erro: 'Pedido não encontrado' }, { status: 404 })

    const numero = await gerarNumeroRecurso(usuario.municipioId)
    const prazoDias = PRAZO_RECURSO_DIAS[d.instancia] ?? 10
    const dataLimiteDecisao = new Date()
    dataLimiteDecisao.setDate(dataLimiteDecisao.getDate() + prazoDias)

    const recurso = await prisma.$transaction(async tx => {
      const r = await tx.recursoPedido.create({
        data: {
          municipioId:      usuario.municipioId,
          pedidoId:         d.pedidoId,
          instancia:        d.instancia as any,
          situacao:         'RECEBIDO',
          numero,
          nomeRecorrente:   d.nomeRecorrente,
          motivoRecurso:    d.motivoRecurso,
          dataLimiteDecisao,
          usuarioId:        usuario.usuarioId,
        },
      })

      // Marcar pedido como RECURSO_ABERTO
      await tx.pedidoAcesso.update({
        where: { id: d.pedidoId },
        data:  { situacao: 'RECURSO_ABERTO' },
      })

      return r
    })

    await auditLog({
      municipioId: usuario.municipioId,
      usuarioId:   usuario.usuarioId,
      acao: 'UPDATE',
      modulo: 'esic', recurso: 'recurso',
      registroId:  recurso.id,
      dadosNovos: { numero, instancia: d.instancia },
    })

    return NextResponse.json({ recurso }, { status: 201 })
  }

  return NextResponse.json({ erro: 'tipo inválido' }, { status: 400 })
}

// ─── PATCH ─────────────────────────────────────────────────────────────────────

const ACOES_PEDIDO = [
  'ENCAMINHAR_SETOR',
  'PRORROGAR',       // Art. 11 §2 — +10 dias úteis com justificativa
  'RESPONDER',
  'INDEFERIR',
  'ATENDER_PARCIALMENTE',
  'ENCERRAR',
]

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, recursoId, ...extras } = await req.json()

  // ── Ação em recurso ────────────────────────────────────────────────────────
  if (recursoId) {
    const recurso = await prisma.recursoPedido.findFirst({
      where: { id: recursoId, municipioId: usuario.municipioId },
    })
    if (!recurso) return NextResponse.json({ erro: 'Recurso não encontrado' }, { status: 404 })

    if (!['DECIDIR_PROVIDO','DECIDIR_PROVIDO_PARCIAL','DECIDIR_IMPROVIDO','DESISTIR'].includes(acao)) {
      return NextResponse.json({ erro: `Ação '${acao}' inválida para recurso` }, { status: 400 })
    }

    const situacaoRecurso =
      acao === 'DECIDIR_PROVIDO'         ? 'PROVIDO' :
      acao === 'DECIDIR_PROVIDO_PARCIAL' ? 'PARCIALMENTE_PROVIDO' :
      acao === 'DECIDIR_IMPROVIDO'       ? 'IMPROVIDO' : 'DESISTIDO'

    const updatedRecurso = await prisma.$transaction(async tx => {
      const r = await tx.recursoPedido.update({
        where: { id: recursoId },
        data: {
          situacao:      situacaoRecurso as any,
          textoDecisao:  extras.textoDecisao,
          autoridade:    extras.autoridade,
          dataDecisao:   new Date(),
          dentroDoPrazo: new Date() <= new Date(recurso.dataLimiteDecisao),
        },
      })

      // Se provido, reabrir o pedido para resposta
      if (situacaoRecurso === 'PROVIDO' || situacaoRecurso === 'PARCIALMENTE_PROVIDO') {
        await tx.pedidoAcesso.update({
          where: { id: recurso.pedidoId },
          data:  { situacao: 'EM_TRAMITACAO' },
        })
      } else if (situacaoRecurso === 'IMPROVIDO') {
        await tx.pedidoAcesso.update({
          where: { id: recurso.pedidoId },
          data:  { situacao: 'ENCERRADO' },
        })
      }
      return r
    })

    return NextResponse.json({ recurso: updatedRecurso })
  }

  // ── Ação em pedido ─────────────────────────────────────────────────────────
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  if (!ACOES_PEDIDO.includes(acao)) {
    return NextResponse.json({ erro: `Ação '${acao}' inválida` }, { status: 400 })
  }

  const pedido = await prisma.pedidoAcesso.findFirst({
    where: { id, municipioId: usuario.municipioId },
  })
  if (!pedido) return NextResponse.json({ erro: 'Pedido não encontrado' }, { status: 404 })

  const dataAtualizada: any = {}

  if (acao === 'ENCAMINHAR_SETOR') {
    if (!extras.setorDestino) return NextResponse.json({ erro: 'setorDestino obrigatório' }, { status: 400 })
    dataAtualizada.situacao          = 'AGUARDANDO_SETOR'
    dataAtualizada.setorDestinatario = extras.setorDestino

    // Registrar tramitação
    await prisma.tramitacaoPedido.create({
      data: {
        municipioId:  usuario.municipioId,
        pedidoId:     id,
        despacho:     extras.despacho ?? `Encaminhado para ${extras.setorDestino}`,
        setorOrigem:  extras.setorOrigem,
        setorDestino: extras.setorDestino,
        usuarioId:    usuario.usuarioId,
      },
    })
  }

  if (acao === 'PRORROGAR') {
    if (!extras.motivoProrrogacao) return NextResponse.json({ erro: 'motivoProrrogacao obrigatório (Art. 11 §2)' }, { status: 400 })
    // +10 dias úteis sobre o prazo original
    const novaData = adicionarDiasUteis(new Date(pedido.dataLimiteResposta), 10)
    dataAtualizada.situacao          = 'PRORROGADO'
    dataAtualizada.prorrogado        = true
    dataAtualizada.motivoProrrogacao = extras.motivoProrrogacao
    dataAtualizada.dataProrrogacaoFim = novaData
    dataAtualizada.dataLimiteResposta = novaData
  }

  if (acao === 'RESPONDER') {
    if (!extras.textoResposta) return NextResponse.json({ erro: 'textoResposta obrigatório' }, { status: 400 })
    const dataResposta = new Date()
    const dentroDoPrazo = dataResposta <= new Date(pedido.dataLimiteResposta)
    // Calcular dias úteis de resposta
    let diasResposta = 0
    const cursor = new Date(pedido.dataProtocolo)
    while (cursor < dataResposta) {
      cursor.setDate(cursor.getDate() + 1)
      const d = cursor.getDay()
      if (d !== 0 && d !== 6) diasResposta++
    }

    dataAtualizada.situacao          = dentroDoPrazo ? 'RESPONDIDO' : 'RESPONDIDO_TARDIO'
    dataAtualizada.textoResposta     = extras.textoResposta
    dataAtualizada.formaResposta     = extras.formaResposta
    dataAtualizada.urlDocumento      = extras.urlDocumento
    dataAtualizada.tecnicoResponsavel = extras.tecnicoResponsavel
    dataAtualizada.setorResposavel   = extras.setorResposavel
    dataAtualizada.dataResposta      = dataResposta
    dataAtualizada.diasResposta      = diasResposta
    dataAtualizada.dentroDoPrazo     = dentroDoPrazo
  }

  if (acao === 'INDEFERIR') {
    if (!extras.motivoIndeferimento) return NextResponse.json({ erro: 'motivoIndeferimento obrigatório' }, { status: 400 })
    if (!extras.fundamentoLegal) return NextResponse.json({ erro: 'fundamentoLegal obrigatório (ex: Art. 23, I, Lei 12.527/2011)' }, { status: 400 })
    dataAtualizada.situacao             = 'INDEFERIDO'
    dataAtualizada.motivoIndeferimento  = extras.motivoIndeferimento
    dataAtualizada.fundamentoLegal      = extras.fundamentoLegal
    dataAtualizada.textoResposta        = extras.textoResposta
    dataAtualizada.dataResposta         = new Date()
    dataAtualizada.dentroDoPrazo        = new Date() <= new Date(pedido.dataLimiteResposta)
  }

  if (acao === 'ATENDER_PARCIALMENTE') {
    if (!extras.textoResposta) return NextResponse.json({ erro: 'textoResposta obrigatório' }, { status: 400 })
    dataAtualizada.situacao          = 'PARCIALMENTE_ATENDIDO'
    dataAtualizada.textoResposta     = extras.textoResposta
    dataAtualizada.motivoIndeferimento = extras.motivoIndeferimento
    dataAtualizada.fundamentoLegal   = extras.fundamentoLegal
    dataAtualizada.dataResposta      = new Date()
    dataAtualizada.dentroDoPrazo     = new Date() <= new Date(pedido.dataLimiteResposta)
  }

  if (acao === 'ENCERRAR') {
    dataAtualizada.situacao = 'ENCERRADO'
  }

  const atualizado = await prisma.pedidoAcesso.update({
    where: { id },
    data:  dataAtualizada,
  })

  await auditLog({
    municipioId: usuario.municipioId,
    usuarioId:   usuario.usuarioId,
    acao,
    modulo: 'esic', recurso: 'pedido',
    registroId:  id,
  })

  return NextResponse.json({ pedido: atualizado })
}
