import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

async function gerarNumeroDAM(municipioId: string): Promise<string> {
  const ano = new Date().getFullYear()
  const count = await prisma.dAM.count({
    where: { municipioId, numero: { startsWith: `DAM-${ano}-` } },
  })
  return `DAM-${ano}-${String(count + 1).padStart(5, '0')}`
}

// Gera código PIX copia-e-cola (simulado — integrar com banco para produção)
function gerarCodigoPix(valor: number, chave: string, nome: string, cidade: string): string {
  const valorStr = valor.toFixed(2)
  // Formato básico PIX estático (EMV)
  const payload = [
    '000201',                              // Format indicator
    '010212',                              // PIX key type: static
    `26${String(28 + chave.length + 4 + nome.length).padStart(2,'0')}` +
      `0014BR.GOV.BCB.PIX` +
      `01${String(chave.length).padStart(2,'0')}${chave}`,
    '52040000',                            // MCC
    '5303986',                             // BRL
    `54${String(valorStr.length).padStart(2,'0')}${valorStr}`,
    `6009${String(cidade.length).padStart(2,'0')}${cidade}`,
    `62${String(nome.length + 4).padStart(2,'0')}` +
      `05${String(nome.length).padStart(2,'0')}${nome}`,
    '6304',
  ].join('')
  // CRC16 simplificado (placeholder — usar lib crc em produção)
  return payload + 'ABCD'
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id               = searchParams.get('id')
  const lancamentoIPTUId = searchParams.get('lancamentoIPTUId')
  const lancamentoISSId  = searchParams.get('lancamentoISSId')
  const parcelamentoId   = searchParams.get('parcelamentoId')
  const situacao         = searchParams.get('situacao')
  const relatorio        = searchParams.get('relatorio')

  if (relatorio === 'DASHBOARD') {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const mesInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

    const [emitidosHoje, pagosHoje, vencidosTotal, valorMes] = await Promise.all([
      prisma.dAM.count({
        where: { municipioId: usuario.municipioId, criadoEm: { gte: hoje } },
      }),
      prisma.dAM.count({
        where: { municipioId: usuario.municipioId, situacao: 'PAGO', dataPagamento: { gte: hoje } },
      }),
      prisma.dAM.count({
        where: { municipioId: usuario.municipioId, situacao: 'VENCIDO' },
      }),
      prisma.dAM.aggregate({
        where: { municipioId: usuario.municipioId, situacao: 'PAGO', dataPagamento: { gte: mesInicio } },
        _sum: { valorTotal: true },
      }),
    ])

    return NextResponse.json({
      kpis: { emitidosHoje, pagosHoje, vencidosTotal, valorMes: valorMes._sum.valorTotal ?? 0 },
    })
  }

  if (id) {
    const dam = await prisma.dAM.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        lancamentoIPTU: {
          include: { contribuinte: { select: { nome: true, razaoSocial: true, cpf: true, cnpj: true } } },
        },
        lancamentoISS: {
          include: { contribuinte: { select: { nome: true, razaoSocial: true, cnpj: true } } },
        },
        parcelamento: { include: { contribuinte: { select: { nome: true, razaoSocial: true } } } },
      },
    })
    if (!dam) return NextResponse.json({ erro: 'DAM não encontrado' }, { status: 404 })
    return NextResponse.json({ dam })
  }

  const where: any = { municipioId: usuario.municipioId }
  if (lancamentoIPTUId) where.lancamentoIPTUId = lancamentoIPTUId
  if (lancamentoISSId)  where.lancamentoISSId  = lancamentoISSId
  if (parcelamentoId)   where.parcelamentoId   = parcelamentoId
  if (situacao)         where.situacao         = situacao

  const dams = await prisma.dAM.findMany({
    where,
    orderBy: { criadoEm: 'desc' },
    take: 100,
  })

  return NextResponse.json({ dams })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    lancamentoIPTUId: z.string().optional(),
    lancamentoISSId:  z.string().optional(),
    parcelamentoId:   z.string().optional(),
    parcelaNumero:    z.number().int().optional(),
    valorPrincipal:   z.number().min(0),
    valorJuros:       z.number().default(0),
    valorMulta:       z.number().default(0),
    dataVencimento:   z.string(),
    // Configuração PIX (opcional — integrar com banco para produção)
    chavePix:         z.string().optional(),
    nomeBeneficiario: z.string().optional(),
    cidadeBeneficiario: z.string().optional(),
  }).refine(d => d.lancamentoIPTUId || d.lancamentoISSId || d.parcelamentoId, {
    message: 'Informe pelo menos um vínculo (IPTU, ISS ou parcelamento)',
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const valorTotal = d.valorPrincipal + d.valorJuros + d.valorMulta
  const numero = await gerarNumeroDAM(usuario.municipioId)

  // Gerar código PIX se chave informada
  let codigoPix: string | undefined
  if (d.chavePix && d.nomeBeneficiario && d.cidadeBeneficiario) {
    codigoPix = gerarCodigoPix(valorTotal, d.chavePix, d.nomeBeneficiario, d.cidadeBeneficiario)
  }

  const dam = await prisma.dAM.create({
    data: {
      municipioId:      usuario.municipioId,
      numero,
      lancamentoIPTUId: d.lancamentoIPTUId,
      lancamentoISSId:  d.lancamentoISSId,
      parcelamentoId:   d.parcelamentoId,
      parcelaNumero:    d.parcelaNumero,
      valorPrincipal:   d.valorPrincipal,
      valorJuros:       d.valorJuros,
      valorMulta:       d.valorMulta,
      valorTotal,
      dataVencimento:   new Date(d.dataVencimento),
      situacao:         'AGUARDANDO',
      codigoPix,
      usuarioId:        usuario.id,
    },
  })

  return NextResponse.json({ dam }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, ...extras } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const dam = await prisma.dAM.findFirst({
    where: { id, municipioId: usuario.municipioId },
  })
  if (!dam) return NextResponse.json({ erro: 'DAM não encontrado' }, { status: 404 })

  const data: any = { atualizadoEm: new Date() }

  if (acao === 'CONFIRMAR_PAGAMENTO') {
    const { formaPagamento, dataPagamento, comprovante } = extras
    data.situacao       = 'PAGO'
    data.dataPagamento  = dataPagamento ? new Date(dataPagamento) : new Date()
    data.formaPagamento = formaPagamento
    data.comprovante    = comprovante

    // Atualizar lançamento de origem
    await prisma.$transaction(async tx => {
      await tx.dAM.update({ where: { id }, data })

      if (dam.lancamentoIPTUId) {
        const lanc = await tx.lancamentoIPTU.findUnique({ where: { id: dam.lancamentoIPTUId } })
        if (lanc) {
          const novoTotal = lanc.valorPago + dam.valorTotal
          await tx.lancamentoIPTU.update({
            where: { id: dam.lancamentoIPTUId },
            data: {
              valorPago: novoTotal,
              dataPagamento: data.dataPagamento,
              situacao: novoTotal >= lanc.valorFinal ? 'PAGO' : 'PAGO_PARCIAL',
            },
          })
        }
      }

      if (dam.lancamentoISSId) {
        const lanc = await tx.lancamentoISS.findUnique({ where: { id: dam.lancamentoISSId } })
        if (lanc) {
          const novoTotal = lanc.valorPago + dam.valorTotal
          await tx.lancamentoISS.update({
            where: { id: dam.lancamentoISSId },
            data: {
              valorPago: novoTotal,
              dataPagamento: data.dataPagamento,
              situacao: novoTotal >= lanc.valorFinal ? 'PAGO' : 'EMITIDO',
            },
          })
        }
      }

      if (dam.parcelamentoId) {
        const parc = await tx.parcelamento.findUnique({ where: { id: dam.parcelamentoId } })
        if (parc) {
          const novasPagas = parc.parcelasPagas + 1
          await tx.parcelamento.update({
            where: { id: dam.parcelamentoId },
            data: {
              parcelasPagas: novasPagas,
              situacao: novasPagas >= parc.totalParcelas ? 'QUITADO' : 'ATIVO',
            },
          })
        }
      }
    })

    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: 'CONFIRMAR_PAGAMENTO_DAM', entidade: 'DAM', entidadeId: id,
      detalhes: { numero: dam.numero, valorTotal: dam.valorTotal, formaPagamento },
    })

    return NextResponse.json({ dam: { ...dam, ...data } })
  }

  if (acao === 'CANCELAR') {
    data.situacao = 'CANCELADO'
  } else if (acao === 'VENCER') {
    data.situacao = 'VENCIDO'
  }

  const atualizado = await prisma.dAM.update({ where: { id }, data })
  return NextResponse.json({ dam: atualizado })
}
