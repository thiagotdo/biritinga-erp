// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Alvarás de Construção / Obras ───────────────────────────────────────────
// Lei 6.766/79 · NBR 15575 · Código de Obras Municipal

async function gerarNumero(municipioId: string): Promise<string> {
  const ano   = new Date().getFullYear()
  const count = await db.Alvara.count({ where: { municipioId } })
  return `ALV-${ano}-${String(count + 1).padStart(4, '0')}`
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const relatorio = searchParams.get('relatorio')
  const situacao  = searchParams.get('situacao')
  const tipo      = searchParams.get('tipo')
  const busca     = searchParams.get('busca')
  const municipioId = usuario.municipioId

  try {
    if (relatorio === 'DASHBOARD') {
      const hoje = new Date()
      const em7d = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000)
      const [total, solicitados, emAnalise, aprovados, emitidos, vencendo, indeferidos] = await Promise.all([
        db.Alvara.count({ where: { municipioId } }),
        db.Alvara.count({ where: { municipioId, situacao: 'SOLICITADO' } }),
        db.Alvara.count({ where: { municipioId, situacao: 'EM_ANALISE' } }),
        db.Alvara.count({ where: { municipioId, situacao: 'APROVADO' } }),
        db.Alvara.count({ where: { municipioId, situacao: 'EMITIDO' } }),
        db.Alvara.count({ where: { municipioId, situacao: 'EMITIDO', dataVencimento: { gte: hoje, lte: em7d } } }),
        db.Alvara.count({ where: { municipioId, situacao: 'INDEFERIDO' } }),
      ])
      const porTipo = await db.$queryRaw`
        SELECT tipo, COUNT(*) as count FROM Alvara WHERE municipioId = ${municipioId} GROUP BY tipo`
      return NextResponse.json({ kpis: { total, solicitados, emAnalise, aprovados, emitidos, vencendo, indeferidos }, porTipo })
    }

    if (id) {
      const alvara = await db.Alvara.findFirst({ where: { id, municipioId } })
      if (!alvara) return NextResponse.json({ erro: 'Alvará não encontrado' }, { status: 404 })
      return NextResponse.json({ alvara })
    }

    const where: any = { municipioId }
    if (situacao) where.situacao = situacao
    if (tipo)     where.tipo     = tipo
    if (busca) {
      where.OR = [
        { numero:          { contains: busca } },
        { requerenteNome:  { contains: busca } },
        { logradouro:      { contains: busca } },
      ]
    }

    const alvaras = await db.Alvara.findMany({
      where, orderBy: { dataProtocolo: 'desc' }, take: 200,
    })
    const hoje = new Date()
    const enriched = alvaras.map((a: any) => ({
      ...a,
      vencendo: a.dataVencimento && a.situacao === 'EMITIDO'
        ? (new Date(a.dataVencimento).getTime() - hoje.getTime()) / 86400000 <= 7
        : false,
    }))
    return NextResponse.json({ alvaras: enriched, total: enriched.length })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  try {
    const d = await req.json()
    const municipioId = usuario.municipioId
    const numero = await gerarNumero(municipioId)
    const dataVenc = new Date()
    dataVenc.setDate(dataVenc.getDate() + (d.dataValidade ?? 365))

    const alvara = await db.Alvara.create({
      data: {
        municipioId,
        numero,
        tipo:               d.tipo,
        situacao:           'SOLICITADO',
        requerenteNome:     d.requerentNome    ?? d.requerenteNome,
        requerenteCpfCnpj: d.requerentCpfCnpj ?? d.requerenteCpfCnpj,
        requerenteEmail:   d.requerentEmail    ?? d.requerenteEmail,
        requerenteTelefone:d.requerenteTelefone,
        logradouro:        d.logradouro,
        numero_imovel:     d.numero_imovel,
        bairro:            d.bairro,
        inscricaoImobiliaria: d.inscricaoImobiliaria,
        descricaoObra:     d.descricaoObra,
        areaTotal:         d.areaTotal         ? Number(d.areaTotal)         : undefined,
        areaConstruida:    d.areaConstruida     ? Number(d.areaConstruida)    : undefined,
        numeroPavimentos:  d.numeroPavimentos   ? Number(d.numeroPavimentos)  : undefined,
        usoEdificacao:     d.usoImovel,
        responsavelNome:   d.responsavelTecnico ?? d.responsavelNome,
        responsavelCrea:   d.crea               ?? d.responsavelCrea,
        taxaAlvara:        d.taxaAlvara          ? Number(d.taxaAlvara)       : undefined,
        dataValidade:      d.dataValidade        ? Number(d.dataValidade)     : 365,
        dataVencimento:    dataVenc,
        usuarioId:         usuario.usuarioId,
      },
    })

    await auditLog({
      municipioId, usuarioId: usuario.usuarioId,
      acao: 'CREATE', modulo: 'obras', recurso: 'Alvara', registroId: alvara.id,
      dadosNovos: { numero, tipo: d.tipo, requerente: alvara.requerenteNome },
    })

    return NextResponse.json({ alvara, numero }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  try {
    const { id, acao, ...dados } = await req.json()
    if (!id || !acao) return NextResponse.json({ erro: 'id e acao obrigatórios' }, { status: 400 })

    const municipioId = usuario.municipioId
    const alvara = await db.Alvara.findFirst({ where: { id, municipioId } })
    if (!alvara) return NextResponse.json({ erro: 'Alvará não encontrado' }, { status: 404 })

    const updateData: any = {}

    // Mapeamento de ações → situações
    const TRANSICOES: Record<string, string> = {
      ANALISAR:           'EM_ANALISE',
      PEDIR_DOCUMENTOS:   'PENDENTE_DOCUMENTOS',
      APROVAR:            'APROVADO',
      EMITIR:             'EMITIDO',
      INDEFERIR:          'INDEFERIDO',
      SUSPENDER:          'SUSPENSO',
      CASSAR:             'CASSADO',
    }

    if (TRANSICOES[acao]) {
      updateData.situacao = TRANSICOES[acao]
      if (acao === 'ANALISAR')   updateData.dataAnalise   = new Date()
      if (acao === 'APROVAR')    updateData.dataAprovacao = new Date()
      if (acao === 'EMITIR') {
        updateData.dataEmissao = new Date()
        const validade = Number(alvara.dataValidade ?? 365)
        const venc = new Date()
        venc.setDate(venc.getDate() + validade)
        updateData.dataVencimento = venc
        // gerar número definitivo se necessário
      }
    }

    if (dados.observacao)       updateData.observacoes     = dados.observacao
    if (dados.responsavelNome)  updateData.responsavelNome = dados.responsavelNome

    const updated = await db.Alvara.update({ where: { id }, data: updateData })

    await auditLog({
      municipioId, usuarioId: usuario.usuarioId,
      acao: 'UPDATE', modulo: 'obras', recurso: 'Alvara', registroId: id,
      dadosNovos: { acao, situacao: updateData.situacao },
    })

    return NextResponse.json({ sucesso: true, numero: updated.numero, situacao: updated.situacao })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
