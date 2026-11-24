import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

// Schema real da tabela Convenio:
// id, municipioId, numero, objeto, concedente, proponente,
// valorTotal, valorRepasse, valorContrapartida, valorDesembolsado,
// dataAssinatura, dataInicio, dataFim,
// status ENUM('CELEBRADO','VIGENTE','EM_EXECUCAO','CONCLUIDO','RESCINDIDO','SUSPENSO'),
// situacao, descricao, programaFederal, orgaoConcedente,
// processoSEI, linkSIAFI, secretariaExecutora, observacoes, ativo, criadoEm, atualizadoEm

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const id     = searchParams.get('id')
  const status = searchParams.get('status')
  const stats  = searchParams.get('stats')
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit  = 20
  const offset = (page - 1) * limit

  try {
    if (id) {
      const rows = await db.$queryRaw`SELECT * FROM Convenio WHERE id = ${id} AND municipioId = ${municipioId} LIMIT 1`
      if (!Array.isArray(rows) || !rows.length) return NextResponse.json({ erro: 'Convênio não encontrado' }, { status: 404 })
      return NextResponse.json({ convenio: rows[0] })
    }

    if (stats) {
      const porStatus = await db.$queryRaw`
        SELECT status, COUNT(*) AS total, SUM(valorTotal) AS totalValor, SUM(valorRepasse) AS totalRepasse
        FROM Convenio WHERE municipioId = ${municipioId} AND ativo = 1 GROUP BY status ORDER BY total DESC`
      const totais = await db.$queryRaw`
        SELECT COUNT(*) AS total, SUM(valorTotal) AS totalValor,
               SUM(valorRepasse) AS totalRepasse, SUM(valorContrapartida) AS totalContrapartida,
               SUM(valorDesembolsado) AS totalDesembolsado
        FROM Convenio WHERE municipioId = ${municipioId} AND ativo = 1`
      const recentes = await db.$queryRaw`
        SELECT * FROM Convenio WHERE municipioId = ${municipioId} AND ativo = 1
        ORDER BY criadoEm DESC LIMIT 5`
      return NextResponse.json({
        porStatus,
        totais: Array.isArray(totais) ? totais[0] : totais,
        recentes
      })
    }

    let rows: any[], countR: any[]

    if (status) {
      countR = await db.$queryRaw`SELECT COUNT(*) AS t FROM Convenio WHERE municipioId=${municipioId} AND ativo=1 AND status=${status}`
      rows   = await db.$queryRaw`SELECT * FROM Convenio WHERE municipioId=${municipioId} AND ativo=1 AND status=${status} ORDER BY dataFim DESC LIMIT ${limit} OFFSET ${offset}`
    } else {
      countR = await db.$queryRaw`SELECT COUNT(*) AS t FROM Convenio WHERE municipioId=${municipioId} AND ativo=1`
      rows   = await db.$queryRaw`SELECT * FROM Convenio WHERE municipioId=${municipioId} AND ativo=1 ORDER BY dataFim DESC LIMIT ${limit} OFFSET ${offset}`
    }

    const total = Number(Array.isArray(countR) ? countR[0]?.t : 0)
    return NextResponse.json({ convenios: rows, total, page, pages: Math.ceil(total / limit) })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const body = await req.json()
  const {
    objeto, concedente, proponente,
    valorTotal, valorRepasse, valorContrapartida,
    dataAssinatura, dataInicio, dataFim,
    status, programaFederal, orgaoConcedente,
    processoSEI, secretariaExecutora, observacoes
  } = body

  if (!objeto || !concedente || !dataInicio || !dataFim)
    return NextResponse.json({ erro: 'Campos obrigatórios: objeto, concedente, dataInicio, dataFim' }, { status: 400 })

  try {
    const ano = new Date(dataInicio).getFullYear()
    const countR = await db.$queryRaw`SELECT COUNT(*) AS t FROM Convenio WHERE municipioId = ${municipioId} AND numero LIKE ${`CONV-${ano}/%`}`
    const seq = Number(Array.isArray(countR) ? countR[0]?.t ?? 0 : 0) + 1
    const numero = `CONV-${ano}/${String(seq).padStart(3,'0')}`

    const id = randomUUID()
    const vTotal   = Number(valorTotal ?? 0)
    const vRepasse = Number(valorRepasse ?? 0)
    const vContra  = Number(valorContrapartida ?? 0)
    const st = status || 'CELEBRADO'

    await db.$queryRaw`
      INSERT INTO Convenio
        (id, municipioId, numero, objeto, concedente, proponente,
         valorTotal, valorRepasse, valorContrapartida, valorDesembolsado,
         dataAssinatura, dataInicio, dataFim,
         status, programaFederal, orgaoConcedente,
         processoSEI, secretariaExecutora, observacoes, ativo, criadoEm, atualizadoEm)
      VALUES (
        ${id}, ${municipioId}, ${numero}, ${objeto},
        ${concedente}, ${proponente || 'Prefeitura Municipal de Biritinga'},
        ${vTotal}, ${vRepasse}, ${vContra}, 0,
        ${dataAssinatura ? new Date(dataAssinatura) : new Date(dataInicio)},
        ${new Date(dataInicio)}, ${new Date(dataFim)},
        ${st}, ${programaFederal || null}, ${orgaoConcedente || null},
        ${processoSEI || null}, ${secretariaExecutora || null},
        ${observacoes || null}, 1, NOW(), NOW())`

    return NextResponse.json({ id, numero }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, status, valorDesembolsado } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

  try {
    if (valorDesembolsado !== undefined) {
      await db.$queryRaw`
        UPDATE Convenio SET valorDesembolsado = ${Number(valorDesembolsado)}, atualizadoEm = NOW()
        WHERE id = ${id} AND municipioId = ${municipioId}`
    } else if (status) {
      await db.$queryRaw`
        UPDATE Convenio SET status = ${status}, atualizadoEm = NOW()
        WHERE id = ${id} AND municipioId = ${municipioId}`
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
