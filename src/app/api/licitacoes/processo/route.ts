// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Processos Licitatórios ───────────────────────────────────────────────────
// Lei 14.133/2021 — Nova Lei de Licitações e Contratos

async function gerarNumero(municipioId: string, modalidade: string): Promise<string> {
  const ano   = new Date().getFullYear()
  const count = await db.ProcessoLicitatorio.count({ where: { municipioId, exercicio: ano } })
  const sigla = { PREGAO_ELETRONICO: 'PE', PREGAO_PRESENCIAL: 'PP', CONCORRENCIA: 'CC',
    TOMADA_PRECOS: 'TP', CONVITE: 'CV', DISPENSA: 'DI', INEXIGIBILIDADE: 'IN',
    CONCURSO: 'CO', LEILAO: 'LE', DIALOGO_COMPETITIVO: 'DC' }[modalidade] ?? 'PR'
  return `${sigla} ${String(count + 1).padStart(3, '0')}/${ano}`
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const situacao  = searchParams.get('situacao')
  const modalidade = searchParams.get('modalidade')
  const busca     = searchParams.get('busca')
  const municipioId = usuario.municipioId

  try {
    if (id) {
      const proc = await db.ProcessoLicitatorio.findFirst({
        where: { id, municipioId },
      })
      if (!proc) return NextResponse.json({ erro: 'Processo não encontrado' }, { status: 404 })
      const [itens, propostas, contratos] = await Promise.all([
        db.$queryRaw`SELECT * FROM ItemLicitacao WHERE processoId = ${id}`,
        db.$queryRaw`SELECT p.*, f.nome AS fornecedorNome FROM Proposta p LEFT JOIN Fornecedor f ON f.id = p.fornecedorId WHERE p.processoId = ${id} ORDER BY p.valorTotal`,
        db.$queryRaw`SELECT c.*, f.nome AS fornecedorNome FROM Contrato c LEFT JOIN Fornecedor f ON f.id = c.fornecedorId WHERE c.processoId = ${id}`,
      ])
      return NextResponse.json({ processo: proc, itens, propostas, contratos })
    }

    const where: any = { municipioId, ativo: true }
    if (situacao)   where.situacao   = situacao
    if (modalidade) where.modalidade = modalidade
    if (busca) {
      where.OR = [
        { numero:  { contains: busca } },
        { objeto:  { contains: busca } },
      ]
    }

    const processos = await db.ProcessoLicitatorio.findMany({
      where, orderBy: { criadoEm: 'desc' }, take: 200,
    })

    // Enriquecer com contagem de propostas e contratos
    const enriched = await Promise.all(processos.map(async (p: any) => {
      const [nPropostas, nContratos] = await Promise.all([
        db.Proposta.count({ where: { processoId: p.id } }),
        db.Contrato.count({ where: { processoId: p.id } }),
      ])
      return { ...p, _count: { propostas: nPropostas, contratos: nContratos } }
    }))

    return NextResponse.json({ processos: enriched, total: enriched.length })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  try {
    const d = await req.json()
    const municipioId = usuario.municipioId
    const numero = await gerarNumero(municipioId, d.modalidade)

    const processo = await db.ProcessoLicitatorio.create({
      data: {
        municipioId,
        numero,
        modalidade:        d.modalidade,
        tipoObjeto:        d.tipoObjeto ?? 'BENS',
        objeto:            d.objeto,
        justificativa:     d.justificativa,
        valorEstimado:     Number(d.valorEstimado ?? 0),
        dotacaoOrca:       d.dotacaoOrca,
        exercicio:         d.exercicio ?? new Date().getFullYear(),
        criterioJulgamento:d.criterioJulgamento ?? 'MENOR_PRECO',
        exclusivoMePP:     d.exclusivoMePP ?? false,
        situacao:          'RASCUNHO',
        responsavelId:     usuario.usuarioId,
        usuarioId:         usuario.usuarioId,
        observacoes:       d.observacoes,
      },
    })

    await auditLog({
      municipioId, usuarioId: usuario.usuarioId,
      acao: 'CREATE', modulo: 'licitacoes', recurso: 'ProcessoLicitatorio', registroId: processo.id,
      dadosNovos: { numero, modalidade: d.modalidade, objeto: d.objeto, valorEstimado: d.valorEstimado },
    })

    return NextResponse.json({ processo, numero }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  try {
    const { id, acao, ...dados } = await req.json()
    if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

    const municipioId = usuario.municipioId
    const proc = await db.ProcessoLicitatorio.findFirst({ where: { id, municipioId } })
    if (!proc) return NextResponse.json({ erro: 'Processo não encontrado' }, { status: 404 })

    const updateData: any = {}

    if (acao === 'ALTERAR_SITUACAO' && dados.situacao) {
      updateData.situacao = dados.situacao
      if (dados.situacao === 'PUBLICADO')   updateData.dataPublicacao  = new Date()
      if (dados.situacao === 'EM_JULGAMENTO') updateData.dataAbertura  = new Date()
      if (dados.situacao === 'HOMOLOGADO')  updateData.dataHomologacao = new Date()
    } else {
      if (dados.objeto)          updateData.objeto          = dados.objeto
      if (dados.valorEstimado)   updateData.valorEstimado   = Number(dados.valorEstimado)
      if (dados.dataPublicacao)  updateData.dataPublicacao  = new Date(dados.dataPublicacao)
      if (dados.dataAbertura)    updateData.dataAbertura    = new Date(dados.dataAbertura)
      if (dados.editalUrl)       updateData.editalUrl       = dados.editalUrl
      if (dados.observacoes)     updateData.observacoes     = dados.observacoes
    }

    const updated = await db.ProcessoLicitatorio.update({ where: { id }, data: updateData })

    await auditLog({
      municipioId, usuarioId: usuario.usuarioId,
      acao: 'UPDATE', modulo: 'licitacoes', recurso: 'ProcessoLicitatorio', registroId: id,
      dadosNovos: { acao, ...updateData },
    })

    return NextResponse.json({ sucesso: true, processo: updated })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
