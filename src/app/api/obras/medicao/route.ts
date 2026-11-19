import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Medições de Obra ─────────────────────────────────────────────────────────
// Cada medição registra o avanço físico-financeiro do período.
// Ao aprovar uma medição, atualiza-se percentualFisicoAcumulado e valorMedidoAcumulado na Obra
// e valorMedido no Contrato.

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const obraId     = searchParams.get('obraId')
  const contratoId = searchParams.get('contratoId')

  const where: any = { municipioId: usuario.municipioId }
  if (obraId)     where.obraId     = obraId
  if (contratoId) where.contratoId = contratoId

  const medicoes = await prisma.medicaoObra.findMany({
    where, orderBy: { numero: 'asc' },
    include: {
      obra: { select: { numero: true, titulo: true } },
    },
  })

  return NextResponse.json({ medicoes })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    obraId:              z.string(),
    contratoId:          z.string().optional(),
    periodo:             z.string().min(3),
    dataMedicao:         z.string(),
    percentualPeriodo:   z.number().min(0).max(100),
    percentualAcumulado: z.number().min(0).max(100),
    valorBruto:          z.number().min(0),
    descontosRetencoes:  z.number().min(0).default(0),
    notaFiscal:          z.string().optional(),
    observacoes:         z.string().optional(),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const obra = await prisma.obra.findFirst({
    where: { id: d.obraId, municipioId: usuario.municipioId },
  })
  if (!obra) return NextResponse.json({ erro: 'Obra não encontrada' }, { status: 404 })

  if (!['EM_EXECUCAO', 'PARALISADA'].includes(obra.situacao)) {
    return NextResponse.json({ erro: 'Medição só pode ser lançada em obras EM_EXECUCAO ou PARALISADA' }, { status: 409 })
  }

  // Número automático da medição
  const ultimaMedicao = await prisma.medicaoObra.findFirst({
    where: { obraId: d.obraId }, orderBy: { numero: 'desc' },
  })
  const numero = (ultimaMedicao?.numero ?? 0) + 1

  const valorLiquido = d.valorBruto - d.descontosRetencoes

  const medicao = await prisma.medicaoObra.create({
    data: {
      municipioId: usuario.municipioId,
      numero,
      ...d,
      valorLiquido,
      dataMedicao: new Date(d.dataMedicao),
      usuarioId: usuario.id,
    },
  })

  return NextResponse.json({ medicao, numero }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, dataPagamento } = await req.json()
  if (!id || !acao) return NextResponse.json({ erro: 'id e acao obrigatórios' }, { status: 400 })

  const medicao = await prisma.medicaoObra.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!medicao) return NextResponse.json({ erro: 'Medição não encontrada' }, { status: 404 })

  if (acao === 'APROVAR') {
    if (medicao.situacao !== 'PENDENTE') {
      return NextResponse.json({ erro: 'Apenas medições PENDENTE podem ser aprovadas' }, { status: 409 })
    }
    // Atualiza medição + acumulados da obra + valor medido do contrato (transaction)
    await prisma.$transaction(async (tx) => {
      await tx.medicaoObra.update({ where: { id }, data: { situacao: 'APROVADA' } })

      await tx.obra.update({
        where: { id: medicao.obraId },
        data: {
          percentualFisicoAcumulado: medicao.percentualAcumulado,
          valorMedidoAcumulado: { increment: Number(medicao.valorLiquido) },
        },
      })

      if (medicao.contratoId) {
        await tx.contratoObra.update({
          where: { id: medicao.contratoId },
          data: { valorMedido: { increment: Number(medicao.valorLiquido) } },
        })
      }
    })

    return NextResponse.json({ sucesso: true })
  }

  if (acao === 'PAGAR') {
    await prisma.$transaction(async (tx) => {
      await tx.medicaoObra.update({
        where: { id },
        data: { situacao: 'PAGA', dataPagamento: dataPagamento ? new Date(dataPagamento) : new Date() },
      })
      if (medicao.contratoId) {
        await tx.contratoObra.update({
          where: { id: medicao.contratoId },
          data: { valorPago: { increment: Number(medicao.valorLiquido) } },
        })
      }
    })

    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: 'PAGAR_MEDICAO', entidade: 'MedicaoObra', entidadeId: id,
      detalhes: { numero: medicao.numero, valor: medicao.valorLiquido },
    })

    return NextResponse.json({ sucesso: true })
  }

  if (acao === 'REJEITAR') {
    await prisma.medicaoObra.update({ where: { id }, data: { situacao: 'REJEITADA' } })
    return NextResponse.json({ sucesso: true })
  }

  return NextResponse.json({ erro: 'Ação inválida. Use APROVAR, PAGAR ou REJEITAR' }, { status: 400 })
}
