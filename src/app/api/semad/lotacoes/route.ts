import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { extrairContextoRequest, auditLog } from '@/lib/audit'
import { temPermissao } from '@/lib/auth/rbac'

const LotacaoSchema = z.object({
  servidorId: z.string(),
  unidadeId:  z.string(),
  dataInicio: z.string().datetime(),
  cargo:      z.string().optional(),
  funcao:     z.string().optional(),
  portaria:   z.string().optional(),
})

// POST /api/semad/lotacoes — transferir / lotar servidor
export async function POST(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'semad:lotacao:create')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const dados = LotacaoSchema.parse(body)

    const lotacao = await prisma.$transaction(async (tx) => {
      // Encerrar lotação ativa anterior
      await tx.lotacaoServidor.updateMany({
        where: { servidorId: dados.servidorId, ativo: true },
        data:  { ativo: false, dataFim: new Date(dados.dataInicio) },
      })

      // Criar nova lotação
      const l = await tx.lotacaoServidor.create({
        data: {
          servidorId: dados.servidorId,
          unidadeId:  dados.unidadeId,
          dataInicio: new Date(dados.dataInicio),
          cargo:      dados.cargo,
          funcao:     dados.funcao,
          portaria:   dados.portaria,
          ativo: true,
        },
      })

      // Registrar movimentação
      const unidade = await tx.unidadeAdm.findUnique({ where: { id: dados.unidadeId }, select: { nome: true } })
      await tx.movimentacaoFuncional.create({
        data: {
          municipioId:    ctx.municipioId,
          servidorId:     dados.servidorId,
          tipo:           'TRANSFERENCIA',
          dataEfetiva:    new Date(dados.dataInicio),
          descricao:      `Transferência/lotação para ${unidade?.nome ?? dados.unidadeId}`,
          unidadeNova:    dados.unidadeId,
          registradoPor:  ctx.usuarioId,
        },
      })

      return l
    })

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId: ctx.usuarioId,
      acao: 'CREATE',
      modulo: 'semad',
      recurso: 'lotacao',
      registroId: lotacao.id,
      dadosNovos: { servidorId: dados.servidorId, unidadeId: dados.unidadeId },
    })

    return NextResponse.json({ lotacao }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[LOTACAO]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// GET /api/semad/lotacoes
export async function GET(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'semad:lotacao:read')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const servidorId = searchParams.get('servidorId')
  const unidadeId  = searchParams.get('unidadeId')
  const ativo      = searchParams.get('ativo') !== 'false' // default true

  const lotacoes = await prisma.lotacaoServidor.findMany({
    where: {
      ativo,
      ...(servidorId && { servidorId }),
      ...(unidadeId  && { unidadeId }),
      servidor: { municipioId: ctx.municipioId },
    },
    include: {
      servidor: { select: { id: true, nome: true, matricula: true } },
      unidade:  { select: { id: true, nome: true, sigla: true, tipo: true } },
    },
    orderBy: { dataInicio: 'desc' },
    take: 200,
  })

  return NextResponse.json({ dados: lotacoes, total: lotacoes.length })
}
