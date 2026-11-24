import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const id     = searchParams.get('id')
  const status = searchParams.get('status')
  const tipo   = searchParams.get('tipo')
  const busca  = searchParams.get('busca')
  const stats  = searchParams.get('stats')
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit  = 20
  const offset = (page - 1) * limit

  try {
    if (id) {
      const rows = await db.$queryRaw`
        SELECT * FROM Manifestacao WHERE id = ${id} AND municipioId = ${municipioId} LIMIT 1`
      if (!rows.length) return NextResponse.json({ erro: 'Manifestação não encontrada' }, { status: 404 })
      return NextResponse.json({ manifestacao: rows[0] })
    }

    if (stats) {
      const porStatus = await db.$queryRaw`
        SELECT status, COUNT(*) AS total FROM Manifestacao
        WHERE municipioId = ${municipioId} GROUP BY status`
      const porTipo = await db.$queryRaw`
        SELECT tipo, COUNT(*) AS total FROM Manifestacao
        WHERE municipioId = ${municipioId} GROUP BY tipo`
      const vencendo = await db.$queryRaw`
        SELECT COUNT(*) AS t FROM Manifestacao
        WHERE municipioId = ${municipioId} AND status NOT IN ('RESPONDIDA','ENCERRADA','CANCELADA')
          AND prazo IS NOT NULL AND prazo <= DATE_ADD(NOW(), INTERVAL 3 DAY)`
      const recentes = await db.$queryRaw`
        SELECT * FROM Manifestacao WHERE municipioId = ${municipioId}
        ORDER BY criadoEm DESC LIMIT 5`
      return NextResponse.json({ porStatus, porTipo, vencendo: Number(vencendo[0]?.t ?? 0), recentes })
    }

    if (busca && busca.length >= 2) {
      const like = `%${busca}%`
      const rows = await db.$queryRaw`
        SELECT * FROM Manifestacao
        WHERE municipioId = ${municipioId}
          AND (numero LIKE ${like} OR assunto LIKE ${like} OR nomeRequerente LIKE ${like})
        ORDER BY criadoEm DESC LIMIT 50`
      return NextResponse.json({ manifestacoes: rows })
    }

    const countR = status
      ? await db.$queryRaw`SELECT COUNT(*) AS t FROM Manifestacao WHERE municipioId = ${municipioId} AND status = ${status}`
      : tipo
      ? await db.$queryRaw`SELECT COUNT(*) AS t FROM Manifestacao WHERE municipioId = ${municipioId} AND tipo = ${tipo}`
      : await db.$queryRaw`SELECT COUNT(*) AS t FROM Manifestacao WHERE municipioId = ${municipioId}`

    const rows = status
      ? await db.$queryRaw`SELECT * FROM Manifestacao WHERE municipioId = ${municipioId} AND status = ${status} ORDER BY criadoEm DESC LIMIT ${limit} OFFSET ${offset}`
      : tipo
      ? await db.$queryRaw`SELECT * FROM Manifestacao WHERE municipioId = ${municipioId} AND tipo = ${tipo} ORDER BY criadoEm DESC LIMIT ${limit} OFFSET ${offset}`
      : await db.$queryRaw`SELECT * FROM Manifestacao WHERE municipioId = ${municipioId} ORDER BY criadoEm DESC LIMIT ${limit} OFFSET ${offset}`

    const total = Number(countR[0]?.t ?? 0)
    return NextResponse.json({ manifestacoes: rows, total, page, pages: Math.ceil(total / limit) })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const body = await req.json()
  const { tipo, assunto, descricao, nomeRequerente, cpfRequerente,
    emailRequerente, telefoneRequerente, anonimo, sigiloso,
    categoria, setorResponsavel, prazo } = body

  if (!assunto) return NextResponse.json({ erro: 'Assunto obrigatório' }, { status: 400 })

  try {
    const ano = new Date().getFullYear()
    const countR = await db.$queryRaw`
      SELECT COUNT(*) AS t FROM Manifestacao WHERE municipioId = ${municipioId} AND ano = ${ano}`
    const seq = Number(countR[0]?.t ?? 0) + 1
    const numero = `OUV-${ano}/${String(seq).padStart(5,'0')}`

    const id = randomUUID()
    // Prazo padrão: 15 dias úteis (~21 dias corridos)
    const prazoDate = prazo ? new Date(prazo) : new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)

    await db.$queryRaw`
      INSERT INTO Manifestacao
        (id, municipioId, numero, ano, tipo, status, categoria, assunto, descricao,
         nomeRequerente, cpfRequerente, emailRequerente, telefoneRequerente,
         anonimo, sigiloso, setorResponsavel, prazo, criadoEm, atualizadoEm)
      VALUES (${id}, ${municipioId}, ${numero}, ${ano},
              ${tipo || 'RECLAMACAO'}, 'RECEBIDA',
              ${categoria || null}, ${assunto}, ${descricao || null},
              ${anonimo ? null : (nomeRequerente || null)},
              ${anonimo ? null : (cpfRequerente || null)},
              ${emailRequerente || null}, ${telefoneRequerente || null},
              ${anonimo ? 1 : 0}, ${sigiloso ? 1 : 0},
              ${setorResponsavel || 'Ouvidoria'}, ${prazoDate},
              NOW(), NOW())`

    return NextResponse.json({ id, numero }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, status, resposta, setorResponsavel, observacoes } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

  try {
    if (resposta && status === 'RESPONDIDA') {
      await db.$queryRaw`
        UPDATE Manifestacao SET status = 'RESPONDIDA', resposta = ${resposta},
          dataResposta = NOW(), atualizadoEm = NOW()
        WHERE id = ${id} AND municipioId = ${municipioId}`
    } else if (status) {
      await db.$queryRaw`
        UPDATE Manifestacao SET status = ${status}, atualizadoEm = NOW()
        WHERE id = ${id} AND municipioId = ${municipioId}`
    }
    if (setorResponsavel) {
      await db.$queryRaw`
        UPDATE Manifestacao SET setorResponsavel = ${setorResponsavel}, atualizadoEm = NOW()
        WHERE id = ${id} AND municipioId = ${municipioId}`
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
