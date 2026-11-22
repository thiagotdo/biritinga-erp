/**
 * POST /api/cidadao/ouvidoria
 * Permite ao cidadão registrar manifestação na Ouvidoria sem autenticação.
 * Lei 13.460/2017 — Código de Defesa do Usuário do Serviço Público.
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

const PRAZO_DIAS: Record<string, number> = {
  RECLAMACAO: 15,
  SUGESTAO: 30,
  ELOGIO: 5,
  DENUNCIA: 30,
  SOLICITACAO_INFO: 20,
  SOLICITACAO_SERVICO: 15,
}

async function gerarProtocolo(municipioId: string): Promise<string> {
  const ano = new Date().getFullYear()
  const count = await prisma.manifestacao.count({ where: { municipioId } })
  return `OUV-${ano}-${String(count + 1).padStart(5, '0')}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      tipo = 'RECLAMACAO',
      nomeManifestante, emailManifestante, telefoneManifestante,
      assunto, descricao, secretariaDestinataria,
      anonimo = false,
    } = body

    if (!assunto?.trim() || !descricao?.trim()) {
      return NextResponse.json(
        { erro: 'Assunto e descrição são obrigatórios' },
        { status: 400, headers: corsHeaders() }
      )
    }

    const mun = await prisma.municipio.findFirst({ where: { ativo: true } })
    if (!mun) {
      return NextResponse.json({ erro: 'Município não encontrado' }, { status: 404, headers: corsHeaders() })
    }

    const protocolo = await gerarProtocolo(mun.id)
    const agora = new Date()
    const prazoDias = PRAZO_DIAS[tipo] ?? 20
    const dataLimite = new Date(agora)
    dataLimite.setDate(dataLimite.getDate() + prazoDias)

    const manifestacao = await prisma.manifestacao.create({
      data: {
        municipioId: mun.id,
        protocolo,
        tipo,
        situacao: 'RECEBIDA',
        assunto,
        descricao,
        anonimo,
        cidadaoNome: anonimo ? null : (nomeManifestante || null),
        cidadaoEmail: anonimo ? null : (emailManifestante || null),
        cidadaoTelefone: anonimo ? null : (telefoneManifestante || null),
        orgaoRelacionado: secretariaDestinataria || null,
        dataLimite,
        prazoResposta: dataLimite,
      },
    })

    return NextResponse.json({
      ok: true,
      protocolo,
      dataLimiteResposta: dataLimite.toISOString().split('T')[0],
      mensagem: `Manifestação registrada com sucesso. Protocolo: ${protocolo}. Prazo de resposta: ${dataLimite.toLocaleDateString('pt-BR')}.`,
    }, { headers: corsHeaders() })

  } catch (e: any) {
    console.error('Erro ao registrar manifestação:', e)
    return NextResponse.json(
      { erro: 'Erro interno ao registrar manifestação' },
      { status: 500, headers: corsHeaders() }
    )
  }
}
