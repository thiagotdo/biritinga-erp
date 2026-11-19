import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Inventário Patrimonial ───────────────────────────────────────────────────
// Decreto 93.872/1986 — inventário anual obrigatório de bens públicos
// Fluxo: ABERTO → gera itens para todos os bens ativos
//        EM_ANDAMENTO → conferência bem a bem
//        CONCLUIDO → consolida: encontrados, não encontrados, divergências

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id  = searchParams.get('id')
  const ano = searchParams.get('ano')

  if (id) {
    const inventario = await prisma.inventario.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        itens: {
          include: {
            bem: {
              select: {
                numeroPlaqueta: true, descricao: true, categoria: true,
                secretaria: true, local: true, valorAtual: true, estado: true,
              },
            },
          },
          orderBy: [{ encontrado: 'asc' }, { bem: { numeroPlaqueta: 'asc' } }],
        },
      },
    })
    if (!inventario) return NextResponse.json({ erro: 'Inventário não encontrado' }, { status: 404 })

    const stats = {
      total:         inventario.itens.length,
      conferidos:    inventario.itens.filter(i => i.encontrado !== null).length,
      encontrados:   inventario.itens.filter(i => i.encontrado === true).length,
      naoEncontrados: inventario.itens.filter(i => i.encontrado === false).length,
      pendentes:     inventario.itens.filter(i => i.encontrado === null).length,
    }

    return NextResponse.json({ inventario, stats })
  }

  const where: any = { municipioId: usuario.municipioId }
  if (ano) where.ano = parseInt(ano)

  const inventarios = await prisma.inventario.findMany({
    where, orderBy: { ano: 'desc' },
    select: { id: true, ano: true, descricao: true, situacao: true, dataInicio: true, dataFim: true, responsavel: true, totalBens: true, bensConfirmados: true, bensNaoEncontrados: true },
  })

  return NextResponse.json({ inventarios })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const acao = searchParams.get('acao')

  // ── CONFERIR item do inventário
  if (acao === 'CONFERIR') {
    const Schema = z.object({
      itemId:               z.string(),
      encontrado:           z.boolean(),
      estadoEncontrado:     z.enum(['OTIMO','BOM','REGULAR','RUIM','PESSIMO','IRRECUPERAVEL']).optional(),
      localEncontrado:      z.string().optional(),
      responsavelEncontrado: z.string().optional(),
      observacoes:          z.string().optional(),
    })
    const val = Schema.safeParse(await req.json())
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
    const d = val.data

    const item = await prisma.inventarioBemItem.findFirst({
      where: { id: d.itemId, municipioId: usuario.municipioId },
    })
    if (!item) return NextResponse.json({ erro: 'Item não encontrado' }, { status: 404 })

    await prisma.inventarioBemItem.update({
      where: { id: d.itemId },
      data: {
        encontrado:            d.encontrado,
        estadoEncontrado:      d.estadoEncontrado,
        localEncontrado:       d.localEncontrado,
        responsavelEncontrado: d.responsavelEncontrado,
        observacoes:           d.observacoes,
        conferidoEm:           new Date(),
        conferidoPor:          usuario.id,
      },
    })

    return NextResponse.json({ sucesso: true })
  }

  // ── CRIAR novo inventário e gerar itens para todos os bens ativos
  const Schema = z.object({
    ano:         z.number().int().min(2000).max(2100),
    descricao:   z.string().optional(),
    responsavel: z.string().min(3),
    secretaria:  z.string().optional(),   // filtrar por secretaria (inventário setorial)
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  // Verifica se já existe inventário para o ano
  const existe = await prisma.inventario.findFirst({
    where: { municipioId: usuario.municipioId, ano: d.ano },
  })
  if (existe) {
    return NextResponse.json({ erro: `Já existe inventário para ${d.ano}` }, { status: 409 })
  }

  // Busca bens a incluir no inventário
  const whereBens: any = { municipioId: usuario.municipioId, ativo: true, situacao: 'ATIVO' }
  if (d.secretaria) whereBens.secretaria = { contains: d.secretaria }

  const bens = await prisma.bemPatrimonial.findMany({
    where: whereBens, select: { id: true },
  })

  if (bens.length === 0) {
    return NextResponse.json({ erro: 'Nenhum bem ativo encontrado para inventariar' }, { status: 404 })
  }

  const inventario = await prisma.$transaction(async (tx) => {
    const inv = await tx.inventario.create({
      data: {
        municipioId: usuario.municipioId,
        ano: d.ano,
        descricao: d.descricao,
        responsavel: d.responsavel,
        situacao: 'ABERTO',
        totalBens: bens.length,
        usuarioId: usuario.id,
      },
    })

    // Gera itens em lote
    await tx.inventarioBemItem.createMany({
      data: bens.map(b => ({
        inventarioId: inv.id,
        bemId:        b.id,
        municipioId:  usuario.municipioId,
      })),
    })

    return inv
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'ABRIR_INVENTARIO', entidade: 'Inventario', entidadeId: inventario.id,
    detalhes: { ano: d.ano, totalBens: bens.length, responsavel: d.responsavel },
  })

  return NextResponse.json({ inventario, totalItens: bens.length }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao } = await req.json()
  if (!id || !acao) return NextResponse.json({ erro: 'id e acao obrigatórios' }, { status: 400 })

  const inventario = await prisma.inventario.findFirst({
    where: { id, municipioId: usuario.municipioId },
    include: { _count: { select: { itens: true } } },
  })
  if (!inventario) return NextResponse.json({ erro: 'Inventário não encontrado' }, { status: 404 })

  if (acao === 'INICIAR') {
    if (inventario.situacao !== 'ABERTO') {
      return NextResponse.json({ erro: 'Inventário não está ABERTO' }, { status: 409 })
    }
    await prisma.inventario.update({ where: { id }, data: { situacao: 'EM_ANDAMENTO' } })
    return NextResponse.json({ sucesso: true })
  }

  if (acao === 'CONCLUIR') {
    if (inventario.situacao !== 'EM_ANDAMENTO') {
      return NextResponse.json({ erro: 'Inventário não está EM_ANDAMENTO' }, { status: 409 })
    }

    // Consolida resultados
    const [encontrados, naoEncontrados] = await Promise.all([
      prisma.inventarioBemItem.count({ where: { inventarioId: id, encontrado: true } }),
      prisma.inventarioBemItem.count({ where: { inventarioId: id, encontrado: false } }),
    ])

    await prisma.inventario.update({
      where: { id },
      data: {
        situacao:          'CONCLUIDO',
        dataFim:           new Date(),
        bensConfirmados:   encontrados,
        bensNaoEncontrados: naoEncontrados,
      },
    })

    // Marca bens não encontrados como EXTRAVIADOS
    const itensFaltantes = await prisma.inventarioBemItem.findMany({
      where: { inventarioId: id, encontrado: false },
      select: { bemId: true },
    })
    if (itensFaltantes.length > 0) {
      await prisma.bemPatrimonial.updateMany({
        where: { id: { in: itensFaltantes.map(i => i.bemId) } },
        data: { situacao: 'EXTRAVIADO' },
      })
    }

    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: 'CONCLUIR_INVENTARIO', entidade: 'Inventario', entidadeId: id,
      detalhes: { ano: inventario.ano, encontrados, naoEncontrados },
    })

    return NextResponse.json({ sucesso: true, encontrados, naoEncontrados })
  }

  if (acao === 'CANCELAR') {
    await prisma.inventario.update({ where: { id }, data: { situacao: 'CANCELADO' } })
    return NextResponse.json({ sucesso: true })
  }

  return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
}
