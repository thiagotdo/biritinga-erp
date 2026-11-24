/**
 * GET /api/cidadao/consulta?protocolo=SIC-2025-0001
 * Permite ao cidadão consultar o status do seu pedido/manifestação sem autenticação.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

export async function GET(req: NextRequest) {
  const protocolo = req.nextUrl.searchParams.get('protocolo')?.trim().toUpperCase()

  if (!protocolo) {
    return NextResponse.json(
      { erro: 'Informe o número do protocolo' },
      { status: 400, headers: corsHeaders() }
    )
  }

  // Verificar se é pedido e-SIC
  if (protocolo.startsWith('SIC-')) {
    const pedido = await prisma.PedidoAcesso.findFirst({
      where: { protocolo },
      select: {
        protocolo: true,
        situacao: true,
        assunto: true,
        dataProtocolo: true,
        dataLimiteResposta: true,
        dataResposta: true,
        textoResposta: true,
        dentroDoPrazo: true,
        prorrogado: true,
        tramitacoes: {
          orderBy: { criadoEm: 'desc' },
          take: 5,
          select: { despacho: true, criadoEm: true, setorDestino: true },
        },
      },
    })

    if (!pedido) {
      return NextResponse.json(
        { erro: `Protocolo ${protocolo} não encontrado` },
        { status: 404, headers: corsHeaders() }
      )
    }

    return NextResponse.json({
      tipo: 'ESIC',
      protocolo: pedido.protocolo,
      situacao: pedido.situacao,
      assunto: pedido.assunto,
      dataProtocolo: pedido.dataProtocolo,
      dataLimiteResposta: pedido.dataLimiteResposta,
      dataResposta: pedido.dataResposta,
      textoResposta: pedido.textoResposta,
      prorrogado: pedido.prorrogado,
      tramitacoes: pedido.tramitacoes,
    }, { headers: corsHeaders() })
  }

  // Verificar se é manifestação de ouvidoria
  if (protocolo.startsWith('OUV-')) {
    const manifestacao = await prisma.Manifestacao.findFirst({
      where: { protocolo },
      select: {
        protocolo: true,
        situacao: true,
        tipo: true,
        assunto: true,
        criadoEm: true,
        dataLimite: true,
        dataResposta: true,
        resposta: true,
        satisfacao: true,
      },
    })

    if (!manifestacao) {
      return NextResponse.json(
        { erro: `Protocolo ${protocolo} não encontrado` },
        { status: 404, headers: corsHeaders() }
      )
    }

    return NextResponse.json({
      tipo: 'OUVIDORIA',
      protocolo: manifestacao.protocolo,
      situacao: manifestacao.situacao,
      tipoManifestacao: manifestacao.tipo,
      assunto: manifestacao.assunto,
      dataRecebimento: manifestacao.criadoEm,
      dataLimiteResposta: manifestacao.dataLimite,
      dataResposta: manifestacao.dataResposta,
      textoResposta: manifestacao.resposta,
      satisfacao: manifestacao.satisfacao,
    }, { headers: corsHeaders() })
  }

  return NextResponse.json(
    { erro: 'Protocolo inválido. Use SIC-XXXX-XXXX ou OUV-XXXX-XXXXX' },
    { status: 400, headers: corsHeaders() }
  )
}
