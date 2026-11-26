// @ts-nocheck
/**
 * GET  /api/pncp/sincronizar  — lista envios PNCP com filtros
 * POST /api/pncp/sincronizar  — envia/sincroniza um item ao PNCP
 * PATCH /api/pncp/sincronizar — atualiza status manualmente (admin)
 *
 * Integração com api.pncp.gov.br conforme Lei 14.133/2021
 * CNPJ Biritinga: 14.192.898/0001-42
 * Código IBGE: 2902005
 */
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import { extrairContextoRequest } from '@/lib/rbac'

export const runtime = 'nodejs'

const PNCP_BASE_URL = 'https://treina.pncp.gov.br/api/pncp/v1' // sandbox
const CNPJ_MUNICIPIO = '14192898000142'
const IBGE_MUNICIPIO = '2902005'

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() })
}

export async function GET(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    if (!ctx.municipioId) return NextResponse.json({ erro: 'Sem autenticação' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const tipo   = searchParams.get('tipo')   ?? 'TODOS'
    const status = searchParams.get('status') ?? 'TODOS'
    const pagina = Number(searchParams.get('pagina') ?? 1)
    const porPagina = Number(searchParams.get('porPagina') ?? 30)
    const offset = (pagina - 1) * porPagina

    const rows = await prisma.$queryRaw`
      SELECT
        pe.id, pe.tipo, pe.referenciaId, pe.numeroReferencia, pe.status,
        pe.pncpId, pe.pncpUrl, pe.tentativas, pe.ultimaTentativaEm,
        pe.enviadoEm, pe.erroMensagem, pe.criadoEm, pe.atualizadoEm
      FROM PncpEnvio pe
      WHERE pe.municipioId = ${ctx.municipioId}
        ${tipo !== 'TODOS' ? prisma.$queryRaw`AND pe.tipo = ${tipo}` : prisma.$queryRaw``}
        ${status !== 'TODOS' ? prisma.$queryRaw`AND pe.status = ${status}` : prisma.$queryRaw``}
      ORDER BY pe.criadoEm DESC
      LIMIT ${porPagina} OFFSET ${offset}` as any[]

    const [{ total }] = await prisma.$queryRaw`
      SELECT COUNT(*) AS total FROM PncpEnvio
      WHERE municipioId = ${ctx.municipioId}
        ${tipo !== 'TODOS' ? prisma.$queryRaw`AND tipo = ${tipo}` : prisma.$queryRaw``}
        ${status !== 'TODOS' ? prisma.$queryRaw`AND status = ${status}` : prisma.$queryRaw``}` as any[]

    // Resumo por status
    const resumo = await prisma.$queryRaw`
      SELECT status, tipo, COUNT(*) AS qtd
      FROM PncpEnvio WHERE municipioId = ${ctx.municipioId}
      GROUP BY status, tipo
      ORDER BY status, tipo` as any[]

    return NextResponse.json({
      envios: rows,
      total: Number(total),
      pagina,
      porPagina,
      resumo,
      metadados: {
        cnpj: CNPJ_MUNICIPIO,
        ibge: IBGE_MUNICIPIO,
        ambiente: 'treino/sandbox',
        legislacao: 'Lei 14.133/2021',
      },
    }, { headers: cors() })

  } catch (e: any) {
    console.error('[GET /api/pncp/sincronizar]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    if (!ctx.municipioId) return NextResponse.json({ erro: 'Sem autenticação' }, { status: 401 })

    const body = await req.json()
    const { referenciaId, tipo } = body

    if (!referenciaId || !tipo) {
      return NextResponse.json({ erro: 'referenciaId e tipo são obrigatórios' }, { status: 400 })
    }

    // Buscar envio existente ou criar novo
    const existentes = await prisma.$queryRaw`
      SELECT id, status, tentativas FROM PncpEnvio
      WHERE referenciaId = ${referenciaId} AND municipioId = ${ctx.municipioId}
      LIMIT 1` as any[]

    let envioId = existentes[0]?.id

    if (!envioId) {
      envioId = randomUUID()
      await prisma.$queryRaw`
        INSERT INTO PncpEnvio (id, municipioId, tipo, referenciaId, status, tentativas, criadoEm, atualizadoEm)
        VALUES (${envioId}, ${ctx.municipioId}, ${tipo}, ${referenciaId}, 'PENDENTE', 0, NOW(), NOW())`
    }

    // Buscar dados da licitação ou contrato
    let payload: any = null
    let numeroReferencia = ''

    if (tipo === 'LICITACAO') {
      const lics = await prisma.$queryRaw`
        SELECT id, numero, modalidade, objeto, valorEstimado, dataAbertura, dataPublicacao, status
        FROM Licitacao WHERE id = ${referenciaId} AND municipioId = ${ctx.municipioId}
        LIMIT 1` as any[]

      if (!lics.length) {
        return NextResponse.json({ erro: 'Licitação não encontrada' }, { status: 404 })
      }

      const lic = lics[0]
      numeroReferencia = lic.numero

      // Montar payload PNCP para licitação
      payload = {
        cnpj: CNPJ_MUNICIPIO,
        codigoUnidadeAdministrativa: '01', // Prefeitura Municipal
        anoCompra: new Date(lic.dataAbertura || lic.dataPublicacao || Date.now()).getFullYear(),
        sequencialCompra: lic.numero?.split('/')[0] || '1',
        modalidadeId: mapearModalidade(lic.modalidade),
        modoDisputaId: 1,
        srp: false,
        tipoContratacao: mapearTipoContratacao(lic.modalidade),
        obieto: lic.objeto,
        dataAberturaProposta: formatarDataPNCP(lic.dataAbertura),
        valorTotalEstimado: Number(lic.valorEstimado || 0),
        linkSistemaOrigem: `https://erp.biritinga.ba.gov.br/gestao/licitacoes/${lic.id}`,
      }
    } else if (tipo === 'CONTRATO') {
      const contratos = await prisma.$queryRaw`
        SELECT id, numero, objeto, valor, dataInicio, dataFim, fornecedor, cnpjFornecedor
        FROM ContratoAdm WHERE id = ${referenciaId} AND municipioId = ${ctx.municipioId}
        LIMIT 1` as any[]

      if (!contratos.length) {
        return NextResponse.json({ erro: 'Contrato não encontrado' }, { status: 404 })
      }

      const c = contratos[0]
      numeroReferencia = c.numero

      payload = {
        cnpjOrgao: CNPJ_MUNICIPIO,
        numeroContratoEmpenho: c.numero,
        tipoContrato: 1,
        categoriaProcesso: 1,
        niFornecedor: c.cnpjFornecedor || '',
        tipoPessoa: 'J',
        nomeRazaoSocial: c.fornecedor,
        objeto: c.objeto,
        valorInicial: Number(c.valor || 0),
        dataVigenciaInicio: formatarDataPNCP(c.dataInicio),
        dataVigenciaFim: formatarDataPNCP(c.dataFim),
        linkSistemaOrigem: `https://erp.biritinga.ba.gov.br/gestao/licitacoes/contratos/${c.id}`,
      }
    }

    // Marcar como PENDENTE e incrementar tentativas
    const agora = new Date().toISOString().slice(0, 19).replace('T', ' ')
    await prisma.$queryRaw`
      UPDATE PncpEnvio SET
        status = 'PENDENTE',
        numeroReferencia = ${numeroReferencia},
        tentativas = tentativas + 1,
        ultimaTentativaEm = ${agora},
        payload = ${JSON.stringify(payload)},
        atualizadoEm = NOW()
      WHERE id = ${envioId}`

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // NOTA: Em produção, aqui faria a chamada real ao PNCP:
    //   const pncpRes = await fetch(`${PNCP_BASE_URL}/contratacoes`, {
    //     method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    //     body: JSON.stringify(payload)
    //   })
    // Por ora, simulamos sucesso para ambiente de desenvolvimento
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const pncpIdSimulado = `PNCP-${IBGE_MUNICIPIO}-${tipo.slice(0,3)}-${numeroReferencia.replace('/', '.')}`
    const pncpUrlSimulado = `https://pncp.gov.br/app/editais/${pncpIdSimulado}`

    await prisma.$queryRaw`
      UPDATE PncpEnvio SET
        status = 'ENVIADO',
        pncpId = ${pncpIdSimulado},
        pncpUrl = ${pncpUrlSimulado},
        enviadoEm = NOW(),
        respostaJson = '{"status":"simulado","ambiente":"sandbox"}',
        atualizadoEm = NOW()
      WHERE id = ${envioId}`

    return NextResponse.json({
      envioId,
      pncpId: pncpIdSimulado,
      pncpUrl: pncpUrlSimulado,
      status: 'ENVIADO',
      nota: 'Integração em modo sandbox/simulado. Configure credenciais PNCP em produção.',
    }, { status: 200, headers: cors() })

  } catch (e: any) {
    console.error('[POST /api/pncp/sincronizar]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    if (!ctx.municipioId) return NextResponse.json({ erro: 'Sem autenticação' }, { status: 401 })

    const body = await req.json()
    const { id, status, pncpId, pncpUrl, erroMensagem } = body
    if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

    await prisma.$queryRaw`
      UPDATE PncpEnvio SET
        status = COALESCE(${status ?? null}, status),
        pncpId = COALESCE(${pncpId ?? null}, pncpId),
        pncpUrl = COALESCE(${pncpUrl ?? null}, pncpUrl),
        erroMensagem = COALESCE(${erroMensagem ?? null}, erroMensagem),
        atualizadoEm = NOW()
      WHERE id = ${id} AND municipioId = ${ctx.municipioId}`

    return NextResponse.json({ ok: true }, { headers: cors() })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapearModalidade(modalidade: string): number {
  const map: Record<string, number> = {
    PREGAO_ELETRONICO: 6,
    PREGAO_PRESENCIAL: 6,
    CONCORRENCIA: 1,
    TOMADA_DE_PRECOS: 3,
    CONVITE: 4,
    CONCURSO: 2,
    LEILAO: 5,
    DISPENSA: 8,
    INEXIGIBILIDADE: 9,
  }
  return map[modalidade] ?? 6
}

function mapearTipoContratacao(modalidade: string): number {
  const dispensa = ['DISPENSA', 'INEXIGIBILIDADE']
  return dispensa.includes(modalidade) ? 2 : 1
}

function formatarDataPNCP(data: string | null): string | null {
  if (!data) return null
  try {
    return new Date(data).toISOString().slice(0, 10)
  } catch {
    return null
  }
}
