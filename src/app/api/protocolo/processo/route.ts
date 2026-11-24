import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const status = searchParams.get('status')
  const busca = searchParams.get('busca')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 20
  const offset = (page - 1) * limit

  try {
    if (id) {
      const rows = await db.$queryRaw`
        SELECT p.*, u.nome AS solicitanteNome
        FROM protocolos p
        LEFT JOIN Usuario u ON u.id = p.solicitanteId
        WHERE p.id = ${id} AND p.municipioId = ${municipioId} LIMIT 1`
      if (!rows.length) return NextResponse.json({ erro: 'Protocolo não encontrado' }, { status: 404 })

      const tramitacoes = await db.$queryRaw`
        SELECT t.*, u.nome AS usuarioNome
        FROM tramitacoes t
        LEFT JOIN Usuario u ON u.id = t.usuarioId
        WHERE t.protocoloId = ${id}
        ORDER BY t.criadoEm ASC`

      return NextResponse.json({ protocolo: rows[0], tramitacoes })
    }

    if (busca && busca.length >= 2) {
      const like = `%${busca}%`
      const rows = await db.$queryRaw`
        SELECT p.id, p.numero, p.assunto, p.categoria, p.status, p.prioridade,
               p.criadoEm, p.prazo, u.nome AS solicitanteNome
        FROM protocolos p LEFT JOIN Usuario u ON u.id = p.solicitanteId
        WHERE p.municipioId = ${municipioId}
          AND (p.numero LIKE ${like} OR p.assunto LIKE ${like} OR p.nomeSolicitante LIKE ${like})
        ORDER BY p.criadoEm DESC LIMIT 50`
      return NextResponse.json({ protocolos: rows })
    }

    const countR = status
      ? await db.$queryRaw`SELECT COUNT(*) AS t FROM protocolos WHERE municipioId = ${municipioId} AND status = ${status}`
      : await db.$queryRaw`SELECT COUNT(*) AS t FROM protocolos WHERE municipioId = ${municipioId}`

    const rows = status
      ? await db.$queryRaw`
          SELECT p.id, p.numero, p.assunto, p.categoria, p.status, p.prioridade,
                 p.criadoEm, p.prazo, p.origem, u.nome AS solicitanteNome
          FROM protocolos p
          LEFT JOIN Usuario u ON u.id = p.solicitanteId
          WHERE p.municipioId = ${municipioId} AND p.status = ${status}
          ORDER BY p.criadoEm DESC LIMIT ${limit} OFFSET ${offset}`
      : await db.$queryRaw`
          SELECT p.id, p.numero, p.assunto, p.categoria, p.status, p.prioridade,
                 p.criadoEm, p.prazo, p.origem, u.nome AS solicitanteNome
          FROM protocolos p
          LEFT JOIN Usuario u ON u.id = p.solicitanteId
          WHERE p.municipioId = ${municipioId}
          ORDER BY p.criadoEm DESC LIMIT ${limit} OFFSET ${offset}`

    const total = Number(countR[0]?.t ?? 0)
    return NextResponse.json({ protocolos: rows, total, page, pages: Math.ceil(total / limit) })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const body = await req.json()
  const { assunto, descricao, categoria, prioridade, prazo, origem,
    secretariaId, responsavelId, solicitanteId,
    cpfSolicitante, nomeSolicitante } = body

  if (!assunto || !categoria)
    return NextResponse.json({ erro: 'Assunto e categoria são obrigatórios' }, { status: 400 })

  try {
    // Gerar número sequencial: MUN-2026-NNNNNN
    const ano = new Date().getFullYear()
    const countR = await db.$queryRaw`
      SELECT COUNT(*) AS t FROM protocolos
      WHERE municipioId = ${municipioId} AND YEAR(criadoEm) = ${ano}`
    const seq = Number(countR[0]?.t ?? 0) + 1
    const numero = `MUN-${ano}-${String(seq).padStart(6, '0')}`

    // Obter usuário da sessão ou usar solicitanteId
    const sessaoR = await db.$queryRaw`
      SELECT s.usuarioId FROM Sessao s
      INNER JOIN Usuario u ON u.id = s.usuarioId
      WHERE u.municipioId = ${municipioId} AND s.ativo = 1
      LIMIT 1`
    const usuarioId = solicitanteId || sessaoR[0]?.usuarioId

    if (!usuarioId)
      return NextResponse.json({ erro: 'Usuário não identificado' }, { status: 400 })

    const id = randomUUID()
    await db.$queryRaw`
      INSERT INTO protocolos (id, municipioId, numero, solicitanteId, secretariaId,
                             responsavelId, assunto, descricao, categoria,
                             prioridade, status, prazo, origem,
                             cpfSolicitante, nomeSolicitante, criadoEm, atualizadoEm)
      VALUES (${id}, ${municipioId}, ${numero}, ${usuarioId},
              ${secretariaId || null}, ${responsavelId || null},
              ${assunto}, ${descricao || null}, ${categoria},
              ${prioridade ?? 'NORMAL'}, 'ABERTO',
              ${prazo ? new Date(prazo) : null},
              ${origem ?? 'INTERNO'},
              ${cpfSolicitante || null}, ${nomeSolicitante || null},
              NOW(), NOW())`

    // Registrar tramitação inicial
    const tramId = randomUUID()
    await db.$queryRaw`
      INSERT INTO tramitacoes (id, protocoloId, usuarioId, acao, descricao, status, criadoEm)
      VALUES (${tramId}, ${id}, ${usuarioId}, 'ABERTURA',
              ${`Protocolo aberto: ${assunto}`}, 'ABERTO', NOW())`

    return NextResponse.json({ id, numero }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, status, responsavelId, prazo, despacho, usuarioId } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

  try {
    if (status) {
      await db.$queryRaw`UPDATE protocolos SET status = ${status}, atualizadoEm = NOW()
        WHERE id = ${id} AND municipioId = ${municipioId}`

      if (despacho && usuarioId) {
        const tramId = randomUUID()
        await db.$queryRaw`
          INSERT INTO tramitacoes (id, protocoloId, usuarioId, acao, descricao, despacho, status, criadoEm)
          VALUES (${tramId}, ${id}, ${usuarioId}, 'DESPACHO', ${despacho}, ${despacho}, ${status}, NOW())`
      }
    }
    if (responsavelId !== undefined)
      await db.$queryRaw`UPDATE protocolos SET responsavelId = ${responsavelId} WHERE id = ${id} AND municipioId = ${municipioId}`
    if (prazo !== undefined)
      await db.$queryRaw`UPDATE protocolos SET prazo = ${prazo ? new Date(prazo) : null} WHERE id = ${id} AND municipioId = ${municipioId}`

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
