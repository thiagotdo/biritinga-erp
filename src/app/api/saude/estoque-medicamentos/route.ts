import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { extrairContextoRequest, auditLog } from '@/lib/audit'
import { temPermissao } from '@/lib/auth/rbac'

const EntradaEstoqueSchema = z.object({
  unidadeId: z.string(),
  medicamentoId: z.string(),
  lote: z.string(),
  fabricante: z.string().optional(),
  dataFabricacao: z.string().optional(),
  dataValidade: z.string(),
  quantidade: z.number().int().positive(),
  estoqueMinimo: z.number().int().default(10),
})

const DispensacaoSchema = z.object({
  estoqueId: z.string(),
  pacienteId: z.string(),
  quantidade: z.number().int().positive(),
  observacao: z.string().optional(),
})

// POST /api/saude/estoque-medicamentos — entrada de estoque
export async function POST(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'saude:estoque:create')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await request.json()

    // Detectar se é entrada ou dispensação
    if (body.acao === 'dispensacao') {
      const dados = DispensacaoSchema.parse(body)

      const estoque = await prisma.estoqueMedicamento.findUnique({ where: { id: dados.estoqueId } })
      if (!estoque) return NextResponse.json({ erro: 'Estoque não encontrado' }, { status: 404 })
      if (estoque.quantidadeAtual < dados.quantidade) {
        return NextResponse.json({ erro: 'Quantidade insuficiente no estoque' }, { status: 422 })
      }

      const resultado = await prisma.$transaction(async (tx) => {
        const novoSaldo = estoque.quantidadeAtual - dados.quantidade

        await tx.movEstoqueMed.create({
          data: {
            estoqueId: dados.estoqueId,
            tipo: 'SAIDA_DISPENSACAO',
            quantidade: dados.quantidade,
            saldoAntes: estoque.quantidadeAtual,
            saldoDepois: novoSaldo,
            usuarioId: ctx.usuarioId,
          },
        })

        const estoqueAtualizado = await tx.estoqueMedicamento.update({
          where: { id: dados.estoqueId },
          data: {
            quantidadeAtual: novoSaldo,
            status: novoSaldo === 0 ? 'INDISPONIVEL' : novoSaldo <= estoque.estoqueMinimo ? 'BAIXO_ESTOQUE' : 'DISPONIVEL',
          },
        })

        const dispensacao = await tx.dispensacaoMedicamento.create({
          data: {
            municipioId: ctx.municipioId,
            estoqueId: dados.estoqueId,
            pacienteId: dados.pacienteId,
            quantidade: dados.quantidade,
            dispensadoPor: ctx.usuarioId,
            observacao: dados.observacao,
          },
        })

        return { dispensacao, estoqueAtualizado }
      })

      return NextResponse.json(resultado, { status: 201 })
    }

    // Entrada de estoque
    const dados = EntradaEstoqueSchema.parse(body)
    const dataValidade = new Date(dados.dataValidade)
    const hoje = new Date()
    const statusInicial = dataValidade < hoje ? 'VENCIDO' : 'DISPONIVEL'

    const estoque = await prisma.$transaction(async (tx) => {
      // Buscar se já existe lote para este medicamento/unidade
      const existente = await tx.estoqueMedicamento.findFirst({
        where: { unidadeId: dados.unidadeId, medicamentoId: dados.medicamentoId, lote: dados.lote },
      })

      if (existente) {
        // Atualizar quantidade
        const novoSaldo = existente.quantidadeAtual + dados.quantidade
        await tx.movEstoqueMed.create({
          data: {
            estoqueId: existente.id,
            tipo: 'ENTRADA',
            quantidade: dados.quantidade,
            saldoAntes: existente.quantidadeAtual,
            saldoDepois: novoSaldo,
            usuarioId: ctx.usuarioId,
          },
        })
        return tx.estoqueMedicamento.update({
          where: { id: existente.id },
          data: { quantidadeAtual: novoSaldo, quantidadeTotal: existente.quantidadeTotal + dados.quantidade, status: statusInicial as any },
        })
      }

      // Criar novo registro de lote
      const novoEstoque = await tx.estoqueMedicamento.create({
        data: {
          municipioId: ctx.municipioId,
          unidadeId: dados.unidadeId,
          medicamentoId: dados.medicamentoId,
          lote: dados.lote,
          fabricante: dados.fabricante,
          dataFabricacao: dados.dataFabricacao ? new Date(dados.dataFabricacao) : undefined,
          dataValidade,
          quantidadeTotal: dados.quantidade,
          quantidadeAtual: dados.quantidade,
          estoqueMinimo: dados.estoqueMinimo,
          status: statusInicial as any,
        },
      })

      await tx.movEstoqueMed.create({
        data: {
          estoqueId: novoEstoque.id,
          tipo: 'ENTRADA',
          quantidade: dados.quantidade,
          saldoAntes: 0,
          saldoDepois: dados.quantidade,
          usuarioId: ctx.usuarioId,
        },
      })

      return novoEstoque
    })

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId: ctx.usuarioId,
      acao: 'CREATE',
      modulo: 'saude',
      recurso: 'estoque_medicamento',
      registroId: estoque.id,
      dadosNovos: { lote: dados.lote, quantidade: dados.quantidade, dataValidade: dados.dataValidade },
    })

    return NextResponse.json({ estoque }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[ESTOQUE]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// GET /api/saude/estoque-medicamentos
export async function GET(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'saude:estoque:read')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const unidadeId = searchParams.get('unidadeId')
  const status = searchParams.get('status')
  const vencendoEm = searchParams.get('vencendoEm') // número de dias

  const hoje = new Date()
  let dataLimiteValidade: Date | undefined
  if (vencendoEm) {
    dataLimiteValidade = new Date(hoje.getTime() + parseInt(vencendoEm) * 86400000)
  }

  const estoques = await prisma.estoqueMedicamento.findMany({
    where: {
      municipioId: ctx.municipioId,
      ...(unidadeId && { unidadeId }),
      ...(status && { status: status as any }),
      ...(dataLimiteValidade && { dataValidade: { lte: dataLimiteValidade } }),
    },
    include: {
      medicamento: {
        select: { nomeGenerico: true, concentracao: true, formaFarm: true, via: true, controlado: true },
      },
      unidade: { select: { nome: true } },
    },
    orderBy: [{ status: 'asc' }, { dataValidade: 'asc' }],
  })

  // Resumo
  const resumo = {
    total: estoques.length,
    disponivel: estoques.filter(e => e.status === 'DISPONIVEL').length,
    baixoEstoque: estoques.filter(e => e.status === 'BAIXO_ESTOQUE').length,
    indisponivel: estoques.filter(e => e.status === 'INDISPONIVEL').length,
    vencido: estoques.filter(e => e.status === 'VENCIDO').length,
  }

  return NextResponse.json({ dados: estoques, resumo })
}
