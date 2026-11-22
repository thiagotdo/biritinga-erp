// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Patrimônio Municipal ─────────────────────────────────────────────────────
// MCASP — Método Linear de Depreciação · Lei 4.320/64

async function gerarPlaqueta(municipioId: string): Promise<string> {
  const count = await db.BemPatrimonial.count({ where: { municipioId } })
  return `BEM-${String(count + 1).padStart(5, '0')}`
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const relatorio = searchParams.get('relatorio')
  const situacao  = searchParams.get('situacao')
  const busca     = searchParams.get('busca')
  const municipioId = usuario.municipioId

  try {
    if (relatorio === 'DASHBOARD') {
      const [total, ativos, manutencao, alienados, baixados] = await Promise.all([
        db.BemPatrimonial.count({ where: { municipioId } }),
        db.BemPatrimonial.count({ where: { municipioId, situacao: 'ATIVO' } }),
        db.BemPatrimonial.count({ where: { municipioId, situacao: 'EM_MANUTENCAO' } }),
        db.BemPatrimonial.count({ where: { municipioId, situacao: 'ALIENADO' } }),
        db.BemPatrimonial.count({ where: { municipioId, situacao: 'BAIXADO' } }),
      ])
      const valorTotal = await db.$queryRaw`
        SELECT COALESCE(SUM(valorAquisicao), 0) AS total FROM bens_patrimoniais WHERE municipioId = ${municipioId} AND ativo = 1`
      const porGrupo = await db.$queryRaw`
        SELECT grupoPatrimonial, COUNT(*) as count FROM bens_patrimoniais
        WHERE municipioId = ${municipioId} AND ativo = 1
        GROUP BY grupoPatrimonial`
      return NextResponse.json({
        kpis: { total, ativos, manutencao, alienados, baixados,
          valorTotal: Number((valorTotal as any[])[0]?.total ?? 0) },
        porGrupo,
      })
    }

    if (id) {
      const bem = await db.BemPatrimonial.findFirst({ where: { id, municipioId } })
      if (!bem) return NextResponse.json({ erro: 'Bem não encontrado' }, { status: 404 })
      const [manutencoes, movimentacoes] = await Promise.all([
        db.ManutencaoBem.findMany({ where: { bemId: id }, orderBy: { criadoEm: 'desc' }, take: 10 }),
        db.$queryRaw`SELECT * FROM movimentacoes_patrimoniais WHERE bemId = ${id} ORDER BY dataMovimentacao DESC LIMIT 10`,
      ])
      return NextResponse.json({ bem, manutencoes, movimentacoes })
    }

    const where: any = { municipioId, ativo: true }
    if (situacao) where.situacao = situacao
    if (busca) {
      where.OR = [
        { plaqueta:  { contains: busca } },
        { descricao: { contains: busca } },
        { responsavelNome: { contains: busca } },
      ]
    }

    const bens = await db.BemPatrimonial.findMany({
      where, orderBy: { descricao: 'asc' }, take: 200,
    })
    return NextResponse.json({ bens, total: bens.length })
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

    // POST pode ser tombamento de bem (tipo='BEM') ou manutenção (tipo='MANUTENCAO')
    if (d.tipo === 'MANUTENCAO') {
      if (!d.bemId) return NextResponse.json({ erro: 'bemId obrigatório para manutenção' }, { status: 400 })

      const manutencao = await db.ManutencaoBem.create({
        data: {
          municipioId,
          bemId:          d.bemId,
          tipo:           d.tipoManutencao ?? 'CORRETIVA',
          descricao:      d.descricao,
          fornecedorNome: d.fornecedorNome,
          valorManutencao:d.valorManutencao ? Number(d.valorManutencao) : undefined,
          dataInicio:     d.dataInicio ? new Date(d.dataInicio) : new Date(),
          usuarioId:      usuario.usuarioId,
        },
      })

      // Atualizar situação do bem para EM_MANUTENCAO
      await db.BemPatrimonial.update({
        where: { id: d.bemId },
        data: { situacao: 'EM_MANUTENCAO' },
      })

      await auditLog({
        municipioId, usuarioId: usuario.usuarioId,
        acao: 'CREATE', modulo: 'semad', recurso: 'ManutencaoBem', registroId: manutencao.id,
        dadosNovos: { bemId: d.bemId, tipo: d.tipoManutencao, valor: d.valorManutencao },
      })

      return NextResponse.json({ manutencao }, { status: 201 })
    }

    // Tombamento de novo bem
    if (!d.descricao || !d.valorAquisicao || !d.dataAquisicao) {
      return NextResponse.json({ erro: 'descricao, valorAquisicao e dataAquisicao são obrigatórios' }, { status: 400 })
    }

    const plaqueta = await gerarPlaqueta(municipioId)
    const valorAquisicao = Number(d.valorAquisicao)
    const valorResidual  = d.valorResidual ? Number(d.valorResidual) : 0
    const taxaDepreciacao = d.taxaDepreciacao ? Number(d.taxaDepreciacao) : undefined

    const bem = await db.BemPatrimonial.create({
      data: {
        municipioId,
        plaqueta,
        descricao:         d.descricao,
        especificacao:     d.especificacao,
        marca:             d.marca,
        modelo:            d.modelo,
        fabricante:        d.fabricante,
        serie:             d.serie,
        grupoPatrimonial:  d.grupoPatrimonial,
        subgrupo:          d.subgrupo,
        contaContabil:     d.contaContabil,
        setorResponsavel:  d.setorResponsavel,
        responsavelNome:   d.responsavelNome,
        responsavelCpf:    d.responsavelCpf,
        localizacao:       d.localizacao,
        valorAquisicao,
        dataAquisicao:     new Date(d.dataAquisicao),
        fornecedorNome:    d.fornecedorNome,
        fornecedorCnpj:    d.fornecedorCnpj,
        empenhoNumero:     d.empenhoNumero,
        vidaUtilAnos:      d.vidaUtilAnos ? Number(d.vidaUtilAnos) : undefined,
        taxaDepreciacao,
        valorResidual,
        valorLiquido:      valorAquisicao - valorResidual,
        situacao:          'ATIVO',
        usuarioId:         usuario.usuarioId,
      },
    })

    await auditLog({
      municipioId, usuarioId: usuario.usuarioId,
      acao: 'CREATE', modulo: 'semad', recurso: 'BemPatrimonial', registroId: bem.id,
      dadosNovos: { plaqueta, descricao: d.descricao, valorAquisicao },
    })

    return NextResponse.json({ bem, plaqueta }, { status: 201 })
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
    const bem = await db.BemPatrimonial.findFirst({ where: { id, municipioId } })
    if (!bem) return NextResponse.json({ erro: 'Bem não encontrado' }, { status: 404 })

    const updateData: any = {}

    if (acao === 'MANUTENCAO_CONCLUIDA') {
      // Concluir manutenção e reativar bem
      if (dados.manutencaoId) {
        await db.ManutencaoBem.update({
          where: { id: dados.manutencaoId },
          data: { concluida: true, dataConclusao: new Date() },
        })
      }
      updateData.situacao = 'ATIVO'
    } else if (acao === 'ALIENAR') {
      updateData.situacao      = 'ALIENADO'
      updateData.dataAlienacao = new Date()
      updateData.motivoAlienacao = dados.motivo
      if (dados.valorAlienacao) updateData.valorAlienacao = Number(dados.valorAlienacao)
    } else if (acao === 'BAIXAR') {
      updateData.situacao = 'BAIXADO'
      updateData.ativo = false
    } else {
      // Atualização geral
      if (dados.descricao)       updateData.descricao       = dados.descricao
      if (dados.setorResponsavel)updateData.setorResponsavel= dados.setorResponsavel
      if (dados.responsavelNome) updateData.responsavelNome = dados.responsavelNome
      if (dados.localizacao)     updateData.localizacao     = dados.localizacao
      if (dados.situacao)        updateData.situacao        = dados.situacao
    }

    const updated = await db.BemPatrimonial.update({ where: { id }, data: updateData })

    await auditLog({
      municipioId, usuarioId: usuario.usuarioId,
      acao: 'UPDATE', modulo: 'semad', recurso: 'BemPatrimonial', registroId: id,
      dadosNovos: { acao, ...updateData },
    })

    return NextResponse.json({ sucesso: true, bem: updated })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
