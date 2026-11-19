import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Fiscalização Urbanística ─────────────────────────────────────────────────
// Vistorias de obras, autos de infração e embargo

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const obraId   = searchParams.get('obraId')
  const alvaraId = searchParams.get('alvaraId')
  const situacao = searchParams.get('situacao')
  const dataInicio = searchParams.get('dataInicio')
  const dataFim    = searchParams.get('dataFim')

  const where: any = { municipioId: usuario.municipioId }
  if (obraId)   where.obraId   = obraId
  if (alvaraId) where.alvaraId = alvaraId
  if (situacao) where.situacao = situacao

  if (dataInicio || dataFim) {
    where.dataVisita = {
      ...(dataInicio ? { gte: new Date(dataInicio) } : {}),
      ...(dataFim    ? { lte: new Date(dataFim + 'T23:59:59') } : {}),
    }
  }

  const fiscalizacoes = await prisma.fiscalizacaoObra.findMany({
    where, orderBy: { dataVisita: 'desc' }, take: 200,
    include: {
      obra:   { select: { numero: true, titulo: true } },
      alvara: { select: { numero: true, requerentNome: true } },
    },
  })

  return NextResponse.json({ fiscalizacoes, total: fiscalizacoes.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    obraId:    z.string().optional(),
    alvaraId:  z.string().optional(),
    dataVisita: z.string(),
    fiscal:    z.string().min(3),
    conformidade: z.enum(['CONFORME','NÃO_CONFORME','PARCIALMENTE_CONFORME']).optional(),
    relatorio: z.string().optional(),
  }).refine(d => d.obraId || d.alvaraId, { message: 'Informe obraId ou alvaraId' })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const fiscalizacao = await prisma.fiscalizacaoObra.create({
    data: {
      municipioId: usuario.municipioId,
      ...d,
      dataVisita: new Date(d.dataVisita),
      situacao: 'AGENDADA',
      usuarioId: usuario.id,
    },
  })

  return NextResponse.json({ fiscalizacao }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, ...dados } = await req.json()
  if (!id || !acao) return NextResponse.json({ erro: 'id e acao obrigatórios' }, { status: 400 })

  const fisc = await prisma.fiscalizacaoObra.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!fisc) return NextResponse.json({ erro: 'Fiscalização não encontrada' }, { status: 404 })

  const atualizacoes: any = { situacao: acao }

  if (acao === 'REALIZADA') {
    atualizacoes.conformidade = dados.conformidade
    atualizacoes.relatorio    = dados.relatorio
  }

  if (acao === 'IRREGULAR') {
    atualizacoes.conformidade       = 'NÃO_CONFORME'
    atualizacoes.descricaoInfracao  = dados.descricaoInfracao
    atualizacoes.numeroAuto         = dados.numeroAuto
    atualizacoes.valorMulta         = dados.valorMulta
    atualizacoes.prazoRegularizacao = dados.prazoRegularizacao ? new Date(dados.prazoRegularizacao) : undefined

    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: 'AUTO_INFRACAO', entidade: 'FiscalizacaoObra', entidadeId: id,
      detalhes: { auto: dados.numeroAuto, infracao: dados.descricaoInfracao, multa: dados.valorMulta },
    })
  }

  if (acao === 'EMBARGADA') {
    atualizacoes.dataEmbargo   = new Date()
    atualizacoes.motivoEmbargo = dados.motivo

    // Embargar a obra também
    if (fisc.obraId) {
      await prisma.obra.update({
        where: { id: fisc.obraId },
        data: { situacao: 'PARALISADA' },
      })
    }

    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: 'EMBARGAR_OBRA', entidade: 'FiscalizacaoObra', entidadeId: id,
      detalhes: { motivo: dados.motivo, obraId: fisc.obraId },
    })
  }

  if (acao === 'REGULARIZADA') {
    atualizacoes.prazoRegularizacao = null
  }

  await prisma.fiscalizacaoObra.update({ where: { id }, data: atualizacoes })
  return NextResponse.json({ sucesso: true })
}
