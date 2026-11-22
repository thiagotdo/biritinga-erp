// @ts-nocheck
// Gestão de Licitações - Lei 14.133/2021 (Nova Lei de Licitações)
// GET    - listar / detalhar com lotes e participantes
// POST   - criar licitação / adicionar lote / registrar participante / registrar proposta
// PATCH  - transições de situação / homologar / adjudicar / habilitar participante

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { extrairContextoRequest, temPermissao } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const LicitacaoSchema = z.object({
  modalidade:      z.enum(['CONCORRENCIA','CONCURSO','LEILAO','PREGAO_ELETRONICO','PREGAO_PRESENCIAL','DISPENSA','INEXIGIBILIDADE','CHAMAMENTO_PUBLICO']),
  criterio:        z.enum(['MENOR_PRECO','MAIOR_DESCONTO','MELHOR_TECNICA','TECNICA_E_PRECO','MAIOR_LANCE','CONTEUDO_ARTISTICO']).default('MENOR_PRECO'),
  tipoObjeto:      z.enum(['OBRAS','SERVICOS_ENGENHARIA','SERVICOS_COMUNS','COMPRAS','LOCACAO_IMOVEIS','CONCESSAO','ALIENACAO']),
  objeto:          z.string().min(10),
  valorEstimado:   z.number().positive().optional(),
  dataAbertura:    z.string().optional(),
  processoNumero:  z.string().optional(),
  pncpNumero:      z.string().optional(),
  fundamentoLegal: z.string().optional(),
  pregoeiro:       z.string().optional(),
  observacoes:     z.string().optional(),
})

const LoteSchema = z.object({
  licitacaoId:   z.string(),
  numero:        z.number().int().positive(),
  descricao:     z.string().min(3),
  unidade:       z.string(),
  quantidade:    z.number().positive(),
  valorUnitario: z.number().optional(),
})

const ParticipanteSchema = z.object({
  licitacaoId:   z.string(),
  nomeEmpresa:   z.string().min(3),
  cnpj:          z.string().min(14),
  representante: z.string().optional(),
  email:         z.string().email().optional(),
  telefone:      z.string().optional(),
  valorProposta: z.number().positive().optional(),
})

// ─── Gerar número sequencial ──────────────────────────────────────────────────

async function gerarNumeroLicitacao(municipioId: string): Promise<string> {
  const ano   = new Date().getFullYear()
  const count = await prisma.licitacao.count({ where: { municipioId, numero: { startsWith: `LIC-${ano}` } } })
  return `LIC-${ano}-${String(count + 1).padStart(3, '0')}`
}

// ─── Mapa de transições válidas ───────────────────────────────────────────────

const TRANSICOES: Record<string, { destino: string; permissao: string }> = {
  PUBLICAR:     { destino: 'PUBLICADA',     permissao: 'semad:licitacao:update' },
  INICIAR:      { destino: 'EM_ANDAMENTO',  permissao: 'semad:licitacao:update' },
  JULGAR:       { destino: 'JULGAMENTO',    permissao: 'semad:licitacao:update' },
  HOMOLOGAR:    { destino: 'HOMOLOGADA',    permissao: 'semad:licitacao:homologar' },
  ADJUDICAR:    { destino: 'ADJUDICADA',    permissao: 'semad:licitacao:homologar' },
  CONTRATAR:    { destino: 'CONTRATADA',    permissao: 'semad:licitacao:update' },
  DECLARAR_DESERTA: { destino: 'DESERTA',   permissao: 'semad:licitacao:update' },
  DECLARAR_FRACASSADA: { destino: 'FRACASSADA', permissao: 'semad:licitacao:update' },
  REVOGAR:      { destino: 'REVOGADA',      permissao: 'semad:licitacao:revogar' },
  ANULAR:       { destino: 'ANULADA',       permissao: 'semad:licitacao:revogar' },
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'semad:licitacao:read')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const id         = searchParams.get('id')
    const situacao   = searchParams.get('situacao')
    const modalidade = searchParams.get('modalidade')
    const busca      = searchParams.get('busca')
    const pagina     = Number(searchParams.get('pagina') ?? 1)
    const porPagina  = Math.min(Number(searchParams.get('porPagina') ?? 20), 100)

    if (id) {
      const lic = await prisma.licitacao.findFirst({
        where: { id, municipioId: ctx.municipioId },
        include: {
          lotes:        { orderBy: { numero: 'asc' } },
          participantes:{ orderBy: { classificacao: 'asc' } },
          _count:       { select: { contrato: true } },
        },
      })
      if (!lic) return NextResponse.json({ erro: 'Licitação não encontrada' }, { status: 404 })
      return NextResponse.json({ licitacao: lic })
    }

    const where: any = {
      municipioId: ctx.municipioId,
      ...(situacao   && { situacao }),
      ...(modalidade && { modalidade }),
      ...(busca && {
        OR: [
          { numero:         { contains: busca } },
          { objeto:         { contains: busca } },
          { processoNumero: { contains: busca } },
          { pncpNumero:     { contains: busca } },
        ],
      }),
    }

    const [licitacoes, total] = await Promise.all([
      prisma.licitacao.findMany({
        where,
        select: {
          id: true, numero: true, situacao: true, modalidade: true, tipoObjeto: true,
          criterio: true, objeto: true, valorEstimado: true, valorHomologado: true,
          dataPublicacao: true, dataAbertura: true, dataHomologacao: true,
          processoNumero: true, pregoeiro: true, criadoEm: true,
          _count: { select: { lotes: true, participantes: true, contrato: true } },
        },
        orderBy: { criadoEm: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
      prisma.licitacao.count({ where }),
    ])

    // Resumo por situação
    const porSituacao = await prisma.licitacao.groupBy({
      by: ['situacao'],
      where: { municipioId: ctx.municipioId },
      _count: { id: true },
      _sum:   { valorEstimado: true },
    })

    return NextResponse.json({
      licitacoes,
      total,
      pagina,
      porPagina,
      totalPaginas: Math.ceil(total / porPagina),
      resumo: {
        porSituacao: porSituacao.map(s => ({
          situacao: s.situacao,
          total:    s._count.id,
          valor:    Number(s._sum.valorEstimado ?? 0),
        })),
      },
    })
  } catch (error) {
    console.error('[SEMAD/LICITACAO/GET]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'semad:licitacao:create')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()

    // ── Nova licitação ────────────────────────────────────────────────────────
    if (body.tipo === 'LICITACAO') {
      const dados = LicitacaoSchema.parse(body)
      const numero = await gerarNumeroLicitacao(ctx.municipioId)

      // Validação: dispensa deve ter fundamentoLegal
      if (['DISPENSA','INEXIGIBILIDADE'].includes(dados.modalidade) && !dados.fundamentoLegal) {
        return NextResponse.json({ erro: 'Dispensa/Inexigibilidade requer fundamentação legal (Art. 72/74 Lei 14.133)' }, { status: 422 })
      }

      const licitacao = await prisma.licitacao.create({
        data: {
          municipioId:     ctx.municipioId,
          numero,
          modalidade:      dados.modalidade,
          criterio:        dados.criterio,
          tipoObjeto:      dados.tipoObjeto,
          objeto:          dados.objeto,
          valorEstimado:   dados.valorEstimado ?? 0,
          dataAbertura:    dados.dataAbertura ? new Date(dados.dataAbertura) : undefined,
          processoNumero:  dados.processoNumero,
          pncpNumero:      dados.pncpNumero,
          fundamentoLegal: dados.fundamentoLegal,
          pregoeiro:       dados.pregoeiro,
          observacoes:     dados.observacoes,
          usuarioId:       ctx.usuarioId,
        },
      })

      await auditLog({
        municipioId: ctx.municipioId, usuarioId: ctx.usuarioId,
        acao: 'CREATE', modulo: 'semad', recurso: 'licitacao', registroId: licitacao.id,
        dadosNovos: { numero, modalidade: dados.modalidade, objeto: dados.objeto.substring(0, 100) },
      })

      return NextResponse.json({ licitacao: { id: licitacao.id, numero } }, { status: 201 })
    }

    // ── Novo lote ─────────────────────────────────────────────────────────────
    if (body.tipo === 'LOTE') {
      const dados = LoteSchema.parse(body)
      const lic = await prisma.licitacao.findFirst({
        where: { id: dados.licitacaoId, municipioId: ctx.municipioId },
      })
      if (!lic) return NextResponse.json({ erro: 'Licitação não encontrada' }, { status: 404 })
      if (!['RASCUNHO','PUBLICADA'].includes(lic.situacao)) {
        return NextResponse.json({ erro: 'Lotes só podem ser adicionados em licitações em RASCUNHO ou PUBLICADA' }, { status: 422 })
      }

      const lote = await prisma.loteLicitacao.create({
        data: {
          licitacaoId:  dados.licitacaoId,
          numero:       dados.numero,
          descricao:    dados.descricao,
          unidade:      dados.unidade,
          quantidade:   dados.quantidade,
          valorUnitario:dados.valorUnitario,
          valorTotal:   dados.valorUnitario ? dados.valorUnitario * dados.quantidade : undefined,
        },
      })
      return NextResponse.json({ lote }, { status: 201 })
    }

    // ── Novo participante ─────────────────────────────────────────────────────
    if (body.tipo === 'PARTICIPANTE') {
      const dados = ParticipanteSchema.parse(body)
      const lic = await prisma.licitacao.findFirst({
        where: { id: dados.licitacaoId, municipioId: ctx.municipioId },
      })
      if (!lic) return NextResponse.json({ erro: 'Licitação não encontrada' }, { status: 404 })

      const participante = await prisma.participanteLicitacao.upsert({
        where: { licitacaoId_cnpj: { licitacaoId: dados.licitacaoId, cnpj: dados.cnpj } },
        update: { valorProposta: dados.valorProposta, representante: dados.representante },
        create: {
          licitacaoId:   dados.licitacaoId,
          nomeEmpresa:   dados.nomeEmpresa,
          cnpj:          dados.cnpj,
          representante: dados.representante,
          email:         dados.email,
          telefone:      dados.telefone,
          valorProposta: dados.valorProposta,
        },
      })
      return NextResponse.json({ participante }, { status: 201 })
    }

    return NextResponse.json({ erro: 'tipo inválido. Use: LICITACAO, LOTE, PARTICIPANTE' }, { status: 400 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[SEMAD/LICITACAO/POST]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// ─── PATCH - transições, homologação, classificação ──────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)

    const body = await request.json()
    const { id, acao } = body

    if (!id || !acao) return NextResponse.json({ erro: 'id e acao obrigatórios' }, { status: 400 })

    // ── Habilitar/inabilitar participante ─────────────────────────────────────
    if (acao === 'HABILITAR_PARTICIPANTE' || acao === 'INABILITAR_PARTICIPANTE') {
      if (!temPermissao(ctx, 'semad:licitacao:update')) {
        return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
      }
      const part = await prisma.participanteLicitacao.findFirst({
        where: { id, licitacao: { municipioId: ctx.municipioId } },
      })
      if (!part) return NextResponse.json({ erro: 'Participante não encontrado' }, { status: 404 })

      await prisma.participanteLicitacao.update({
        where: { id },
        data: {
          habilitado: acao === 'HABILITAR_PARTICIPANTE',
          motivoInabilitacao: acao === 'INABILITAR_PARTICIPANTE' ? (body.motivo ?? null) : null,
        },
      })
      return NextResponse.json({ mensagem: 'Atualizado' })
    }

    // ── Classificar vencedor (definir ordem por valor proposta) ───────────────
    if (acao === 'CLASSIFICAR') {
      if (!temPermissao(ctx, 'semad:licitacao:update')) {
        return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
      }
      // Ordena participantes habilitados pelo valor da proposta, do menor ao maior
      const participantes = await prisma.participanteLicitacao.findMany({
        where: { licitacaoId: id, habilitado: true, valorProposta: { not: null } },
        orderBy: { valorProposta: 'asc' },
      })
      await Promise.all(participantes.map((p, i) =>
        prisma.participanteLicitacao.update({ where: { id: p.id }, data: { classificacao: i + 1 } })
      ))
      return NextResponse.json({ mensagem: `${participantes.length} participantes classificados` })
    }

    // ── Homologar com valor ───────────────────────────────────────────────────
    if (acao === 'HOMOLOGAR') {
      if (!temPermissao(ctx, 'semad:licitacao:homologar')) {
        return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
      }
      const lic = await prisma.licitacao.findFirst({
        where: { id, municipioId: ctx.municipioId },
      })
      if (!lic) return NextResponse.json({ erro: 'Licitação não encontrada' }, { status: 404 })

      await prisma.licitacao.update({
        where: { id },
        data: {
          situacao:         'HOMOLOGADA',
          valorHomologado:  body.valorHomologado ?? undefined,
          dataHomologacao:  new Date(),
        },
      })
      await auditLog({
        municipioId: ctx.municipioId, usuarioId: ctx.usuarioId,
        acao: 'UPDATE', modulo: 'semad', recurso: 'licitacao', registroId: id,
        dadosAntigos: { situacao: lic.situacao },
        dadosNovos:   { situacao: 'HOMOLOGADA', dataHomologacao: new Date() },
      })
      return NextResponse.json({ mensagem: 'Licitação homologada' })
    }

    // ── Transições simples ────────────────────────────────────────────────────
    const transicao = TRANSICOES[acao]
    if (!transicao) return NextResponse.json({ erro: `Ação inválida: ${acao}` }, { status: 400 })

    if (!temPermissao(ctx, transicao.permissao)) {
      return NextResponse.json({ erro: 'Sem permissão para esta ação' }, { status: 403 })
    }

    const lic = await prisma.licitacao.findFirst({ where: { id, municipioId: ctx.municipioId } })
    if (!lic) return NextResponse.json({ erro: 'Licitação não encontrada' }, { status: 404 })

    const dataExtra: Record<string, any> = {}
    if (acao === 'PUBLICAR') dataExtra.dataPublicacao = new Date()
    if (acao === 'ADJUDICAR') dataExtra.dataAdjudicacao = new Date()

    const atualizada = await prisma.licitacao.update({
      where: { id },
      data: { situacao: transicao.destino as any, ...dataExtra },
    })

    await auditLog({
      municipioId: ctx.municipioId, usuarioId: ctx.usuarioId,
      acao: 'UPDATE', modulo: 'semad', recurso: 'licitacao', registroId: id,
      dadosAntigos: { situacao: lic.situacao },
      dadosNovos:   { situacao: atualizada.situacao },
    })

    return NextResponse.json({ licitacao: { id, situacao: atualizada.situacao } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[SEMAD/LICITACAO/PATCH]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
