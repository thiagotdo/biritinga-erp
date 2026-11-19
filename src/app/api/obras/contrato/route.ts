import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Contratos de Obra ────────────────────────────────────────────────────────
// Lei 14.133/2021 — Nova Lei de Licitações e Contratos Administrativos
// Art. 92 — cláusulas necessárias
// Art. 96 — garantia contratual (1-5% do valor)

async function gerarNumeroContrato(municipioId: string): Promise<string> {
  const ano   = new Date().getFullYear()
  const count = await prisma.contratoObra.count({ where: { municipioId } })
  return `CT-${ano}-${String(count + 1).padStart(3, '0')}`
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id    = searchParams.get('id')
  const busca = searchParams.get('busca')

  if (id) {
    const contrato = await prisma.contratoObra.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        obras: { select: { id: true, numero: true, titulo: true, situacao: true } },
        medicoes: { orderBy: { numero: 'asc' } },
        aditivos:  { orderBy: { numero: 'asc' } },
      },
    })
    if (!contrato) return NextResponse.json({ erro: 'Contrato não encontrado' }, { status: 404 })

    // Calcular valor total com aditivos
    const valorTotal = Number(contrato.valorContrato) + Number(contrato.valorAditivos)
    const saldoContratual = valorTotal - Number(contrato.valorMedido)
    const percentualExec  = valorTotal > 0 ? (Number(contrato.valorMedido) / valorTotal * 100) : 0

    return NextResponse.json({
      contrato: {
        ...contrato,
        valorTotal: valorTotal.toFixed(2),
        saldoContratual: saldoContratual.toFixed(2),
        percentualExec: percentualExec.toFixed(1),
      },
    })
  }

  const where: any = { municipioId: usuario.municipioId, ativo: true }
  if (busca) {
    where.OR = [
      { numero: { contains: busca } },
      { contratadaNome: { contains: busca } },
      { contratadaCnpj: { contains: busca } },
      { numeroLicitacao: { contains: busca } },
    ]
  }

  const contratos = await prisma.contratoObra.findMany({
    where, orderBy: { criadoEm: 'desc' }, take: 200,
    include: {
      _count: { select: { obras: true, medicoes: true, aditivos: true } },
    },
  })

  return NextResponse.json({ contratos, total: contratos.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    contratadaNome:   z.string().min(3),
    contratadaCnpj:   z.string().min(14),
    contratadaEmail:  z.string().email().optional().or(z.literal('')),
    contratadaTelefone: z.string().optional(),
    modalidade:       z.string().default('PE'),  // PE, CC, CP, TL, D, C
    numeroLicitacao:  z.string().optional(),
    processo:         z.string().optional(),
    valorContrato:    z.number().min(0),
    dataAssinatura:   z.string(),
    dataVigenciaFim:  z.string(),
    prazoDias:        z.number().int().optional(),
    tipoGarantia:     z.string().optional(),
    valorGarantia:    z.number().optional(),
    observacoes:      z.string().optional(),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const numero = await gerarNumeroContrato(usuario.municipioId)

  const contrato = await prisma.contratoObra.create({
    data: {
      municipioId: usuario.municipioId,
      numero,
      ...d,
      contratadaCnpj: d.contratadaCnpj.replace(/\D/g, ''),
      dataAssinatura:  new Date(d.dataAssinatura),
      dataVigenciaFim: new Date(d.dataVigenciaFim),
      usuarioId: usuario.id,
    },
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'CADASTRAR_CONTRATO_OBRA', entidade: 'ContratoObra', entidadeId: contrato.id,
    detalhes: { numero, empresa: d.contratadaNome, valor: d.valorContrato },
  })

  return NextResponse.json({ contrato, numero }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, ...dados } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const contrato = await prisma.contratoObra.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!contrato) return NextResponse.json({ erro: 'Contrato não encontrado' }, { status: 404 })

  // Aditivo
  if (acao === 'ADITIVO') {
    const { tipo, motivo, valorAcrescimo, valorSupressao, diasAcrescimo, novaVigencia } = dados
    if (!tipo || !motivo) return NextResponse.json({ erro: 'tipo e motivo obrigatórios' }, { status: 400 })

    const ultimoAditivo = await prisma.aditivoContrato.findFirst({
      where: { contratoId: id }, orderBy: { numero: 'desc' },
    })

    const novoAditivo = await prisma.$transaction(async (tx) => {
      const aditivo = await tx.aditivoContrato.create({
        data: {
          municipioId: usuario.municipioId,
          contratoId: id,
          numero: (ultimoAditivo?.numero ?? 0) + 1,
          tipo, motivo,
          valorAcrescimo, valorSupressao, diasAcrescimo,
          novaVigencia: novaVigencia ? new Date(novaVigencia) : undefined,
          dataAssinatura: new Date(dados.dataAssinatura ?? new Date()),
          usuarioId: usuario.id,
        },
      })

      // Atualizar totais do contrato
      const atualizacoes: any = {}
      if (valorAcrescimo) {
        atualizacoes.valorAditivos = { increment: Number(valorAcrescimo) }
      }
      if (valorSupressao) {
        atualizacoes.valorAditivos = { decrement: Number(valorSupressao) }
      }
      if (novaVigencia) {
        atualizacoes.dataVigenciaFim = new Date(novaVigencia)
      }

      if (Object.keys(atualizacoes).length > 0) {
        await tx.contratoObra.update({ where: { id }, data: atualizacoes })
      }

      return aditivo
    })

    return NextResponse.json({ aditivo: novoAditivo })
  }

  // Atualização geral
  const atualizado = await prisma.contratoObra.update({ where: { id }, data: dados })
  return NextResponse.json({ contrato: atualizado })
}
