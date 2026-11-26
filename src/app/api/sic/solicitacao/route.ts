// @ts-nocheck
/**
 * GET   /api/sic/solicitacao            — lista pedidos SIC (admin) ou busca por protocolo (público)
 * POST  /api/sic/solicitacao            — abre novo pedido (público, sem autenticação)
 * PATCH /api/sic/solicitacao            — responde / atualiza status (admin autenticado)
 *
 * Lei de Acesso à Informação — Lei nº 12.527/2011
 * Prazos: 20 dias para resposta + 10 dias de prorrogação (art. 11)
 */
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import { extrairContextoRequest } from '@/lib/rbac'

export const runtime = 'nodejs'

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function adicionarDiasUteis(data: Date, dias: number): Date {
  let d = new Date(data)
  let adicionados = 0
  while (adicionados < dias) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) adicionados++
  }
  return d
}

function gerarProtocolo(seq: number, ano: number): string {
  return `SIC-${ano}/${String(seq).padStart(5, '0')}`
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const mun = await prisma.Municipio.findFirst({ where: { ativo: true } })
    if (!mun) return NextResponse.json({ erro: 'Município não encontrado' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const protocolo  = searchParams.get('protocolo')
    const status     = searchParams.get('status')    ?? 'TODOS'
    const tipo       = searchParams.get('tipo')       ?? 'TODOS'
    const busca      = searchParams.get('busca')      ?? ''
    const pagina     = Number(searchParams.get('pagina')    ?? 1)
    const porPagina  = Number(searchParams.get('porPagina') ?? 20)
    const offset     = (pagina - 1) * porPagina
    const ctx        = extrairContextoRequest(req.headers)
    const isPublico  = !ctx.municipioId

    // Consulta por protocolo (público — para acompanhamento)
    if (protocolo) {
      const rows = await prisma.$queryRaw`
        SELECT id, protocolo, nome, assunto, tipo, status, canal,
               dataAbertura, prazoResposta, prorrogadoAte, dataResposta,
               resposta, respondidoPor, fundamentoLegal, recursoPrazo,
               orgao, criadoEm, atualizadoEm
        FROM SolicitacaoSIC
        WHERE protocolo = ${protocolo} AND municipioId = ${mun.id}
        LIMIT 1` as any[]

      if (!rows.length) return NextResponse.json({ erro: 'Protocolo não encontrado' }, { status: 404 })

      // Não expõe dados pessoais na consulta pública
      const row = rows[0]
      if (isPublico) {
        delete row.cpf
        delete row.email
        delete row.telefone
        row.nome = row.nome?.split(' ')[0] + ' ' + (row.nome?.split(' ')[1]?.[0] ?? '') + '.'
      }

      return NextResponse.json({ solicitacao: row }, { headers: cors() })
    }

    // Listagem admin (requer auth)
    if (isPublico) return NextResponse.json({ erro: 'Sem autenticação' }, { status: 401 })

    const buscaLike = busca ? `%${busca}%` : null

    const rows = await prisma.$queryRaw`
      SELECT id, protocolo, nome, email, orgao, assunto, tipo, status, prioridade, canal,
             dataAbertura, prazoResposta, prorrogadoAte, dataResposta,
             respondidoPor, criadoEm, atualizadoEm
      FROM SolicitacaoSIC
      WHERE municipioId = ${mun.id}
        ${status !== 'TODOS' ? prisma.$queryRaw`AND status = ${status}` : prisma.$queryRaw``}
        ${tipo !== 'TODOS' ? prisma.$queryRaw`AND tipo = ${tipo}` : prisma.$queryRaw``}
        ${buscaLike ? prisma.$queryRaw`AND (nome LIKE ${buscaLike} OR assunto LIKE ${buscaLike} OR protocolo LIKE ${buscaLike})` : prisma.$queryRaw``}
      ORDER BY
        CASE status
          WHEN 'RECEBIDO' THEN 1
          WHEN 'EM_ANALISE' THEN 2
          WHEN 'PRORROGADO' THEN 3
          ELSE 4
        END,
        prazoResposta ASC
      LIMIT ${porPagina} OFFSET ${offset}` as any[]

    const [{ total }] = await prisma.$queryRaw`
      SELECT COUNT(*) AS total FROM SolicitacaoSIC
      WHERE municipioId = ${mun.id}
        ${status !== 'TODOS' ? prisma.$queryRaw`AND status = ${status}` : prisma.$queryRaw``}
        ${tipo !== 'TODOS' ? prisma.$queryRaw`AND tipo = ${tipo}` : prisma.$queryRaw``}` as any[]

    // Resumo por status
    const resumo = await prisma.$queryRaw`
      SELECT status, COUNT(*) AS qtd,
             SUM(CASE WHEN prazoResposta < CURDATE() AND status NOT IN ('RESPONDIDO','ARQUIVADO','NEGADO') THEN 1 ELSE 0 END) AS atrasados
      FROM SolicitacaoSIC WHERE municipioId = ${mun.id}
      GROUP BY status` as any[]

    // Prazo médio de resposta
    const [{ prazoMedio }] = await prisma.$queryRaw`
      SELECT ROUND(AVG(DATEDIFF(dataResposta, dataAbertura)), 1) AS prazoMedio
      FROM SolicitacaoSIC
      WHERE municipioId = ${mun.id} AND status = 'RESPONDIDO' AND dataResposta IS NOT NULL` as any[]

    return NextResponse.json({
      solicitacoes: rows,
      total: Number(total),
      pagina,
      porPagina,
      resumo,
      estatisticas: {
        prazoMedioResposta: prazoMedio,
        legislacao: 'Lei nº 12.527/2011 — Art. 11: prazo de 20 dias úteis + 10 prorrogáveis',
      },
    }, { headers: cors() })

  } catch (e: any) {
    console.error('[GET /api/sic/solicitacao]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}

// ─── POST — Novo pedido (público) ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const mun = await prisma.Municipio.findFirst({ where: { ativo: true } })
    if (!mun) return NextResponse.json({ erro: 'Município não encontrado' }, { status: 404 })

    const body = await req.json()
    const { nome, cpf, email, telefone, orgao, assunto, descricao, tipo, canal } = body

    if (!nome || !assunto || !descricao) {
      return NextResponse.json({ erro: 'Nome, assunto e descrição são obrigatórios' }, { status: 400 })
    }

    // Gerar protocolo sequencial
    const [{ seq }] = await prisma.$queryRaw`
      SELECT COUNT(*) + 1 AS seq FROM SolicitacaoSIC
      WHERE municipioId = ${mun.id} AND YEAR(criadoEm) = YEAR(CURDATE())` as any[]

    const ano = new Date().getFullYear()
    const protocolo = gerarProtocolo(Number(seq), ano)
    const id = randomUUID()

    // Prazo: 20 dias úteis
    const prazo = adicionarDiasUteis(new Date(), 20)
    const prazoStr = prazo.toISOString().slice(0, 10)

    await prisma.$queryRaw`
      INSERT INTO SolicitacaoSIC
        (id, municipioId, protocolo, nome, cpf, email, telefone, orgao, assunto, descricao, tipo, status, prioridade, canal, dataAbertura, prazoResposta, criadoEm, atualizadoEm)
      VALUES
        (${id}, ${mun.id}, ${protocolo}, ${nome}, ${cpf ?? null}, ${email ?? null},
         ${telefone ?? null}, ${orgao ?? null}, ${assunto}, ${descricao},
         ${tipo ?? 'PEDIDO_INFORMACAO'}, 'RECEBIDO', 'NORMAL', ${canal ?? 'PORTAL'},
         NOW(), ${prazoStr}, NOW(), NOW())`

    return NextResponse.json({
      id,
      protocolo,
      prazoResposta: prazoStr,
      mensagem: `Pedido registrado com sucesso. Anote seu protocolo: ${protocolo}. Prazo de resposta: até ${prazo.toLocaleDateString('pt-BR')}.`,
    }, { status: 201, headers: cors() })

  } catch (e: any) {
    console.error('[POST /api/sic/solicitacao]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}

// ─── PATCH — Responder / atualizar (admin) ────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    if (!ctx.municipioId) return NextResponse.json({ erro: 'Sem autenticação' }, { status: 401 })

    const body = await req.json()
    const { id, status, resposta, motivoNegativa, fundamentoLegal, prorrogar, observacoesInternas } = body
    if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

    const mun = await prisma.Municipio.findFirst({ where: { ativo: true } })

    if (prorrogar) {
      // Prorrogar por 10 dias úteis a partir de hoje
      const novoPrazo = adicionarDiasUteis(new Date(), 10)
      const novoPrazoStr = novoPrazo.toISOString().slice(0, 10)
      await prisma.$queryRaw`
        UPDATE SolicitacaoSIC SET
          status = 'PRORROGADO',
          prorrogadoAte = ${novoPrazoStr},
          atualizadoEm = NOW()
        WHERE id = ${id} AND municipioId = ${mun?.id ?? ctx.municipioId}`

      return NextResponse.json({ ok: true, prorrogadoAte: novoPrazoStr }, { headers: cors() })
    }

    // Responder
    if (status === 'RESPONDIDO' && !resposta) {
      return NextResponse.json({ erro: 'Texto de resposta obrigatório' }, { status: 400 })
    }

    const nomeResponsavel = ctx.usuarioNome ?? 'Administrador'

    await prisma.$queryRaw`
      UPDATE SolicitacaoSIC SET
        status = COALESCE(${status ?? null}, status),
        resposta = COALESCE(${resposta ?? null}, resposta),
        respondidoPor = ${status === 'RESPONDIDO' ? nomeResponsavel : null},
        dataResposta = ${status === 'RESPONDIDO' ? prisma.$queryRaw`NOW()` : prisma.$queryRaw`dataResposta`},
        motivoNegativa = COALESCE(${motivoNegativa ?? null}, motivoNegativa),
        fundamentoLegal = COALESCE(${fundamentoLegal ?? null}, fundamentoLegal),
        observacoesInternas = COALESCE(${observacoesInternas ?? null}, observacoesInternas),
        atualizadoEm = NOW()
      WHERE id = ${id} AND municipioId = ${mun?.id ?? ctx.municipioId}`

    return NextResponse.json({ ok: true }, { headers: cors() })
  } catch (e: any) {
    console.error('[PATCH /api/sic/solicitacao]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}
