/**
 * POST /api/cidadao/esic
 * Permite ao cidadão registrar pedido de acesso à informação (e-SIC) sem autenticação.
 * Lei 12.527/2011 — prazo de 20 dias úteis (prorrogável por mais 10).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

function adicionarDiasUteis(data: Date, dias: number): Date {
  const result = new Date(data)
  let adicionados = 0
  while (adicionados < dias) {
    result.setDate(result.getDate() + 1)
    const dia = result.getDay()
    if (dia !== 0 && dia !== 6) adicionados++
  }
  return result
}

async function gerarProtocolo(municipioId: string): Promise<string> {
  const ano = new Date().getFullYear()
  const count = await prisma.PedidoAcesso.count({
    where: { municipioId, protocolo: { startsWith: `SIC-${ano}-` } },
  })
  return `SIC-${ano}-${String(count + 1).padStart(4, '0')}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      nomeRequerente, emailRequerente, telefoneRequerente,
      cpfCnpjRequerente, assunto, descricaoPedido,
      formaEntrega = 'EMAIL', tipoSolicitante = 'PESSOA_FISICA',
    } = body

    if (!assunto?.trim() || !descricaoPedido?.trim()) {
      return NextResponse.json(
        { erro: 'Assunto e descrição do pedido são obrigatórios' },
        { status: 400, headers: corsHeaders() }
      )
    }

    const mun = await prisma.Municipio.findFirst({ where: { ativo: true } })
    if (!mun) {
      return NextResponse.json({ erro: 'Município não encontrado' }, { status: 404, headers: corsHeaders() })
    }

    const protocolo = await gerarProtocolo(mun.id)
    const dataProtocolo = new Date()
    const dataLimiteResposta = adicionarDiasUteis(dataProtocolo, 20)

    const pedido = await prisma.PedidoAcesso.create({
      data: {
        municipioId: mun.id,
        protocolo,
        situacao: 'RECEBIDO',
        tipoSolicitante,
        nomeRequerente: nomeRequerente || 'Anônimo',
        cpfCnpjRequerente,
        emailRequerente,
        telefoneRequerente,
        assunto,
        descricaoPedido,
        formaEntrega,
        dataProtocolo,
        dataLimiteResposta,
      },
    })

    // Tramitação inicial
    await prisma.TramitacaoPedido.create({
      data: {
        municipioId: mun.id,
        pedidoId: pedido.id,
        despacho: `Pedido registrado pelo Portal do Cidadão. Prazo legal: ${dataLimiteResposta.toLocaleDateString('pt-BR')} (20 dias úteis — Art. 11 Lei 12.527/2011).`,
        setorDestino: 'SIC',
      },
    })

    return NextResponse.json({
      ok: true,
      protocolo,
      dataLimiteResposta: dataLimiteResposta.toISOString().split('T')[0],
      mensagem: `Pedido registrado com sucesso. Protocolo: ${protocolo}. Prazo de resposta: ${dataLimiteResposta.toLocaleDateString('pt-BR')}.`,
    }, { headers: corsHeaders() })

  } catch (e: any) {
    console.error('Erro ao registrar pedido e-SIC:', e)
    return NextResponse.json(
      { erro: 'Erro interno ao registrar pedido' },
      { status: 500, headers: corsHeaders() }
    )
  }
}
