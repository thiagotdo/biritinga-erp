// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Respostas às Manifestações ───────────────────────────────────────────────
// Uma manifestação pode ter múltiplas respostas (parciais + definitiva)
// Tipos: OFICIAL (pública), COMPLEMENTO (acompanhamento), INTERNO (nota interna)
// Ao responder oficialmente → situação vai para RESPONDIDA

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const manifestacaoId = searchParams.get('manifestacaoId')
  if (!manifestacaoId) return NextResponse.json({ erro: 'manifestacaoId obrigatório' }, { status: 400 })

  // Verifica se a manifestação pertence ao município
  const manifestacao = await prisma.manifestacao.findFirst({
    where: { id: manifestacaoId, municipioId: usuario.municipioId },
  })
  if (!manifestacao) return NextResponse.json({ erro: 'Manifestação não encontrada' }, { status: 404 })

  const respostas = await prisma.respostaManifestacao.findMany({
    where: { manifestacaoId },
    orderBy: { criadoEm: 'asc' },
  })

  return NextResponse.json({ respostas })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    manifestacaoId: z.string(),
    texto:          z.string().min(10),
    tipo:           z.enum(['OFICIAL','COMPLEMENTO','INTERNO']).default('OFICIAL'),
    remetente:      z.string().optional(),
    publica:        z.boolean().default(true),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const manifestacao = await prisma.manifestacao.findFirst({
    where: { id: d.manifestacaoId, municipioId: usuario.municipioId },
  })
  if (!manifestacao) return NextResponse.json({ erro: 'Manifestação não encontrada' }, { status: 404 })

  if (['ENCERRADA', 'ARQUIVADA'].includes(manifestacao.situacao)) {
    return NextResponse.json({ erro: 'Manifestação já encerrada — não aceita mais respostas' }, { status: 409 })
  }

  const resposta = await prisma.respostaManifestacao.create({
    data: {
      municipioId: usuario.municipioId,
      manifestacaoId: d.manifestacaoId,
      texto: d.texto,
      tipo: d.tipo,
      remetente: d.remetente ?? usuario.usuarioId,
      publica: d.publica,
      usuarioId: usuario.usuarioId,
    },
  })

  // Se resposta oficial → atualiza situação da manifestação para RESPONDIDA
  if (d.tipo === 'OFICIAL') {
    await prisma.$transaction(async (tx) => {
      await tx.manifestacao.update({
        where: { id: d.manifestacaoId },
        data: { situacao: 'RESPONDIDA' },
      })
      await tx.movimentacaoManifestacao.create({
        data: {
          municipioId: usuario.municipioId,
          manifestacaoId: d.manifestacaoId,
          situacaoDe:  manifestacao.situacao as any,
          situacaoPara: 'RESPONDIDA',
          motivo: 'Resposta oficial emitida',
          usuarioId: usuario.usuarioId,
        },
      })
    })
  }

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.usuarioId,
    acao: 'CREATE', modulo: 'misc', recurso: 'RespostaManifestacao', registroId: resposta.id,
    dadosNovos: { protocolo: manifestacao.protocolo, tipo: d.tipo, publica: d.publica },
  })

  return NextResponse.json({ resposta }, { status: 201 })
}
