import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { extrairContextoRequest, auditLog } from '@/lib/audit'
import { temPermissao } from '@/lib/auth/rbac'

const EmpenhoSchema = z.object({
  orcamentoId:         z.string(),
  unidadeId:           z.string().optional(),
  fornecedorId:        z.string().optional(),
  exercicio:           z.number().int().min(2020),
  dataEmissao:         z.string().datetime(),
  tipoDespesa:         z.enum(['PESSOAL','ENCARGOS_SOCIAIS','JUROS_ENCARGOS','OUTRAS_CORRENTES','INVESTIMENTOS','INVERSOES_FINANCEIRAS','AMORTIZACAO_DIVIDA']),
  modalidadeLicitacao: z.enum(['DISPENSA','INEXIGIBILIDADE','PREGAO_ELETRONICO','PREGAO_PRESENCIAL','CONCORRENCIA','TOMADA_PRECOS','CONVITE','CONCURSO','LEILAO','CREDENCIAMENTO','REGISTRO_PRECO']).optional(),
  numeroLicitacao:     z.string().optional(),
  descricao:           z.string().min(5),
  valor:               z.number().positive(),
  contaBancaria:       z.string().optional(),
  observacoes:         z.string().optional(),
})

const LiquidarSchema = z.object({
  id:              z.string(),
  acao:            z.enum(['LIQUIDAR', 'PAGAR', 'ANULAR', 'REFORCO']),
  valor:           z.number().positive().optional(),
  dataEfetiva:     z.string().datetime(),
  documento:       z.string().optional(), // TED, cheque, pix
  contaDebito:     z.string().optional(),
  observacoes:     z.string().optional(),
})

// Gera número sequencial: "2026/0001"
async function gerarNumeroEmpenho(municipioId: string, exercicio: number): Promise<string> {
  const count = await prisma.empenho.count({
    where: { municipioId, exercicio },
  })
  return `${exercicio}/${String(count + 1).padStart(4, '0')}`
}

// POST /api/sefin/empenhos
export async function POST(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'sefin:empenho:create')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const dados = EmpenhoSchema.parse(body)

    const empenho = await prisma.$transaction(async (tx) => {
      // Verificar saldo disponível na unidade
      if (dados.unidadeId) {
        const unidade = await tx.orcamentoUnidade.findFirst({
          where: { id: dados.unidadeId, orcamentoId: dados.orcamentoId },
        })
        if (unidade) {
          const dotacaoAtual = Number(unidade.dotacaoInicial) + Number(unidade.suplementacao) - Number(unidade.reducao)
          const saldoDisponivel = dotacaoAtual - Number(unidade.empenhado)
          if (dados.valor > saldoDisponivel) {
            throw new Error(`SALDO_INSUFICIENTE:${saldoDisponivel.toFixed(2)}`)
          }
          // Atualizar empenhado na unidade
          await tx.orcamentoUnidade.update({
            where: { id: dados.unidadeId },
            data:  { empenhado: { increment: dados.valor } },
          })
        }
      }

      const numero = await gerarNumeroEmpenho(ctx.municipioId, dados.exercicio)

      return tx.empenho.create({
        data: {
          municipioId:          ctx.municipioId,
          orcamentoId:          dados.orcamentoId,
          unidadeId:            dados.unidadeId,
          fornecedorId:         dados.fornecedorId,
          numero,
          exercicio:            dados.exercicio,
          dataEmissao:          new Date(dados.dataEmissao),
          tipoDespesa:          dados.tipoDespesa as any,
          modalidadeLicitacao:  dados.modalidadeLicitacao as any,
          numeroLicitacao:      dados.numeroLicitacao,
          descricao:            dados.descricao,
          valorOriginal:        dados.valor,
          contaBancaria:        dados.contaBancaria,
          observacoes:          dados.observacoes,
          emitidoPor:           ctx.usuarioId,
          status:               'EMITIDO',
        },
      })
    })

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId: ctx.usuarioId,
      acao: 'CREATE',
      modulo: 'sefin',
      recurso: 'empenho',
      registroId: empenho.id,
      dadosNovos: { numero: empenho.numero, valor: dados.valor, tipoDespesa: dados.tipoDespesa },
    })

    return NextResponse.json({ empenho }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    if (error instanceof Error && error.message.startsWith('SALDO_INSUFICIENTE')) {
      const saldo = error.message.split(':')[1]
      return NextResponse.json({ erro: 'Saldo insuficiente na dotação da unidade', saldoDisponivel: parseFloat(saldo) }, { status: 422 })
    }
    console.error('[EMPENHO]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// GET /api/sefin/empenhos
export async function GET(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'sefin:empenho:read')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const exercicio     = searchParams.get('exercicio')
  const status        = searchParams.get('status')
  const tipoDespesa   = searchParams.get('tipoDespesa')
  const fornecedorId  = searchParams.get('fornecedorId')
  const unidadeId     = searchParams.get('unidadeId')
  const busca         = searchParams.get('busca')
  const page          = parseInt(searchParams.get('page') || '1')
  const limit         = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const skip          = (page - 1) * limit

  const where: any = {
    municipioId: ctx.municipioId,
    ...(exercicio    && { exercicio: parseInt(exercicio) }),
    ...(status       && { status: status as any }),
    ...(tipoDespesa  && { tipoDespesa: tipoDespesa as any }),
    ...(fornecedorId && { fornecedorId }),
    ...(unidadeId    && { unidadeId }),
    ...(busca && {
      OR: [
        { numero:    { contains: busca } },
        { descricao: { contains: busca } },
        { fornecedor: { nome: { contains: busca } } },
      ],
    }),
  }

  const [empenhos, total] = await Promise.all([
    prisma.empenho.findMany({
      where,
      include: {
        fornecedor: { select: { id: true, nome: true, cnpjCpf: true } },
        unidade:    { select: { id: true, nomeUnidade: true } },
        _count:     { select: { pagamentos: true } },
      },
      orderBy: [{ exercicio: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.empenho.count({ where }),
  ])

  return NextResponse.json({
    dados: empenhos,
    paginacao: { total, page, limit, totalPages: Math.ceil(total / limit) },
  })
}

// PATCH /api/sefin/empenhos — liquidar / pagar / anular / reforçar
export async function PATCH(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'sefin:empenho:update')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const dados = LiquidarSchema.parse(body)

    const atual = await prisma.empenho.findFirst({
      where: { id: dados.id, municipioId: ctx.municipioId },
    })
    if (!atual) return NextResponse.json({ erro: 'Empenho não encontrado' }, { status: 404 })

    const valorEfetivo = dados.valor ?? Number(atual.valorOriginal) + Number(atual.valorReforco) - Number(atual.valorAnulado)

    const atualizado = await prisma.$transaction(async (tx) => {
      let updateData: Record<string, unknown> = {}

      if (dados.acao === 'LIQUIDAR') {
        if (atual.status !== 'EMITIDO' && atual.status !== 'REFORCO') throw new Error('Empenho não pode ser liquidado neste status')
        updateData = { status: 'LIQUIDADO', valorLiquidado: { increment: valorEfetivo }, dataLiquidacao: new Date(dados.dataEfetiva) }
        if (atual.unidadeId) await tx.orcamentoUnidade.update({ where: { id: atual.unidadeId }, data: { liquidado: { increment: valorEfetivo } } })
      }

      if (dados.acao === 'PAGAR') {
        if (atual.status !== 'LIQUIDADO') throw new Error('Empenho precisa estar liquidado antes de pagar')
        updateData = { status: 'PAGO', valorPago: { increment: valorEfetivo }, dataPagamento: new Date(dados.dataEfetiva) }
        if (atual.unidadeId) await tx.orcamentoUnidade.update({ where: { id: atual.unidadeId }, data: { pago: { increment: valorEfetivo } } })
        // Registrar pagamento
        await tx.pagamentoEmpenho.create({
          data: {
            municipioId:   ctx.municipioId,
            empenhoId:     dados.id,
            valor:         valorEfetivo,
            dataPagamento: new Date(dados.dataEfetiva),
            contaDebito:   dados.contaDebito,
            documento:     dados.documento,
            observacoes:   dados.observacoes,
            registradoPor: ctx.usuarioId,
          },
        })
      }

      if (dados.acao === 'ANULAR') {
        const valorAnular = dados.valor ?? Number(atual.valorOriginal)
        updateData = { status: 'ANULADO', valorAnulado: { increment: valorAnular } }
        if (atual.unidadeId) await tx.orcamentoUnidade.update({ where: { id: atual.unidadeId }, data: { empenhado: { decrement: valorAnular } } })
      }

      if (dados.acao === 'REFORCO') {
        if (!dados.valor) throw new Error('Valor do reforço é obrigatório')
        updateData = { status: 'REFORCO', valorReforco: { increment: dados.valor } }
        if (atual.unidadeId) await tx.orcamentoUnidade.update({ where: { id: atual.unidadeId }, data: { empenhado: { increment: dados.valor } } })
      }

      return tx.empenho.update({ where: { id: dados.id }, data: updateData })
    })

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId: ctx.usuarioId,
      acao: 'UPDATE',
      modulo: 'sefin',
      recurso: 'empenho',
      registroId: dados.id,
      dadosAntigos: { status: atual.status },
      dadosNovos:   { status: dados.acao, valor: valorEfetivo },
    })

    return NextResponse.json({ empenho: atualizado })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    if (error instanceof Error) {
      return NextResponse.json({ erro: error.message }, { status: 422 })
    }
    console.error('[EMPENHO PATCH]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
