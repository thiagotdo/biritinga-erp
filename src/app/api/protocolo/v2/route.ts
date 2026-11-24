import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const id      = searchParams.get('id')
  const status  = searchParams.get('status')
  const busca   = searchParams.get('busca')
  const tipo    = searchParams.get('tipo')
  const page    = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit   = 20
  const offset  = (page - 1) * limit

  try {
    if (id) {
      const rows = await db.$queryRaw`
        SELECT * FROM Protocolo WHERE id = ${id} AND municipioId = ${municipioId} LIMIT 1`
      if (!rows.length) return NextResponse.json({ erro: 'Protocolo não encontrado' }, { status: 404 })

      const tramitacoes = await db.$queryRaw`
        SELECT * FROM ProtocoloTramitacao WHERE protocoloId = ${id}
        ORDER BY dataHora ASC`

      return NextResponse.json({ protocolo: rows[0], tramitacoes })
    }

    if (busca && busca.length >= 2) {
      const like = `%${busca}%`
      const rows = await db.$queryRaw`
        SELECT * FROM Protocolo
        WHERE municipioId = ${municipioId}
          AND (numero LIKE ${like} OR assunto LIKE ${like} OR interessado LIKE ${like})
        ORDER BY criadoEm DESC LIMIT 50`
      return NextResponse.json({ protocolos: rows })
    }

    // stats para dashboard
    const stats = searchParams.get('stats')
    if (stats) {
      const totais = await db.$queryRaw`
        SELECT status, COUNT(*) AS total FROM Protocolo
        WHERE municipioId = ${municipioId}
        GROUP BY status`
      const recentes = await db.$queryRaw`
        SELECT * FROM Protocolo WHERE municipioId = ${municipioId}
        ORDER BY criadoEm DESC LIMIT 5`
      return NextResponse.json({ totais, recentes })
    }

    const countR = status
      ? await db.$queryRaw`SELECT COUNT(*) AS t FROM Protocolo WHERE municipioId = ${municipioId} AND status = ${status}`
      : tipo
      ? await db.$queryRaw`SELECT COUNT(*) AS t FROM Protocolo WHERE municipioId = ${municipioId} AND tipo = ${tipo}`
      : await db.$queryRaw`SELECT COUNT(*) AS t FROM Protocolo WHERE municipioId = ${municipioId}`

    const rows = status
      ? await db.$queryRaw`SELECT * FROM Protocolo WHERE municipioId = ${municipioId} AND status = ${status} ORDER BY criadoEm DESC LIMIT ${limit} OFFSET ${offset}`
      : tipo
      ? await db.$queryRaw`SELECT * FROM Protocolo WHERE municipioId = ${municipioId} AND tipo = ${tipo} ORDER BY criadoEm DESC LIMIT ${limit} OFFSET ${offset}`
      : await db.$queryRaw`SELECT * FROM Protocolo WHERE municipioId = ${municipioId} ORDER BY criadoEm DESC LIMIT ${limit} OFFSET ${offset}`

    const total = Number(countR[0]?.t ?? 0)
    return NextResponse.json({ protocolos: rows, total, page, pages: Math.ceil(total / limit) })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const body = await req.json()
  const { assunto, tipo, prioridade, origem, interessado, cpfCnpjInteressado,
    setorOrigemId, setorOrigemNome, observacoes, prazo, categoria } = body

  if (!assunto)
    return NextResponse.json({ erro: 'Assunto é obrigatório' }, { status: 400 })

  // Mapear valores de origem do frontend para ENUMs válidos da tabela antiga
  const origemMap: Record<string,string> = {
    PRESENCIAL: 'BALCAO', ONLINE: 'EMAIL', CORREIO: 'CORREIO',
    EMAIL: 'EMAIL', INTERNO: 'INTERNO', EXTERNO: 'BALCAO',
    BALCAO: 'BALCAO', WEB: 'EMAIL'
  }
  const origemDB = origem ? (origemMap[origem] ?? 'INTERNO') : 'INTERNO'

  // Mapear prioridade (NORMAL/URGENTE/MUITO_URGENTE → NORMAL/URGENTE/MUITO_URGENTE)
  const prioridadeDB = prioridade ?? 'NORMAL'

  try {
    const ano = new Date().getFullYear()
    const countR = await db.$queryRaw`
      SELECT COUNT(*) AS t FROM Protocolo WHERE municipioId = ${municipioId} AND ano = ${ano}`
    const seq = Number(countR[0]?.t ?? 0) + 1
    const numero = `${ano}/${String(seq).padStart(5, '0')}`

    const id = randomUUID()
    // Usa solicitanteId de Thiago como padrão (usuário do sistema)
    const solicitanteId = '4f2ce2b9-2d74-4396-879a-979af51eb5e7'
    const categoriaDB = categoria ?? 'ADMINISTRATIVO'

    await db.$queryRaw`
      INSERT INTO Protocolo (id, municipioId, numero, ano, assunto, tipo, status, prioridade,
                             origem, solicitanteId, categoria, interessado,
                             setorOrigemNome, setorAtualNome, observacoes, prazo, dataAbertura, criadoEm, atualizadoEm)
      VALUES (${id}, ${municipioId}, ${numero}, ${ano}, ${assunto},
              ${tipo ?? 'PROCESSO'}, 'ABERTO', ${prioridadeDB},
              ${origemDB}, ${solicitanteId}, ${categoriaDB},
              ${interessado || null},
              ${setorOrigemNome || 'Protocolo Geral'}, ${setorOrigemNome || 'Protocolo Geral'},
              ${observacoes || null}, ${prazo ? new Date(prazo) : null},
              NOW(), NOW(), NOW())`

    // Registrar tramitação inicial
    const tramId = randomUUID()
    await db.$queryRaw`
      INSERT INTO ProtocoloTramitacao (id, protocoloId, municipioId, despacho,
                                       setorOrigemNome, setorDestinoNome, acao, dataHora, criadoEm, atualizadoEm)
      VALUES (${tramId}, ${id}, ${municipioId}, ${'Protocolo aberto'},
              ${setorOrigemNome || 'Protocolo Geral'}, ${setorOrigemNome || 'Protocolo Geral'},
              'ABERTURA', NOW(), NOW(), NOW())`

    return NextResponse.json({ id, numero }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  const { id, status, prioridade, setorDestinoId, setorDestinoNome,
    despacho, usuarioNome, acao } = await req.json()
  if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

  // Mapear status para valores ENUM válidos da tabela antiga:
  // ABERTO, EM_ANALISE, CANCELADO, DEFERIDO, INDEFERIDO, ARQUIVADO
  const statusMap: Record<string,string> = {
    ABERTO: 'ABERTO', EM_TRAMITACAO: 'EM_ANALISE', AGUARDANDO: 'ABERTO',
    ENCERRADO: 'DEFERIDO', ARQUIVADO: 'ARQUIVADO', EM_ANALISE: 'EM_ANALISE',
    CANCELADO: 'CANCELADO', DEFERIDO: 'DEFERIDO', INDEFERIDO: 'INDEFERIDO'
  }

  try {
    if (status) {
      const statusDB = statusMap[status] ?? status
      const isFinal = ['DEFERIDO','INDEFERIDO','ARQUIVADO','CANCELADO'].includes(statusDB)
      if (isFinal) {
        await db.$queryRaw`UPDATE Protocolo SET status = ${statusDB}, setorAtualId = ${setorDestinoId || null},
          setorAtualNome = ${setorDestinoNome || null}, dataEncerramento = NOW(), atualizadoEm = NOW()
          WHERE id = ${id} AND municipioId = ${municipioId}`
      } else {
        await db.$queryRaw`UPDATE Protocolo SET status = ${statusDB}, setorAtualId = ${setorDestinoId || null},
          setorAtualNome = ${setorDestinoNome || null}, atualizadoEm = NOW()
          WHERE id = ${id} AND municipioId = ${municipioId}`
      }
    }
    if (prioridade)
      await db.$queryRaw`UPDATE Protocolo SET prioridade = ${prioridade}, atualizadoEm = NOW()
        WHERE id = ${id} AND municipioId = ${municipioId}`

    // Registrar tramitação
    const tramId = randomUUID()
    await db.$queryRaw`
      INSERT INTO ProtocoloTramitacao (id, protocoloId, municipioId, despacho,
                                       setorDestinoId, setorDestinoNome, usuarioNome, acao, dataHora, criadoEm, atualizadoEm)
      VALUES (${tramId}, ${id}, ${municipioId}, ${despacho || null},
              ${setorDestinoId || null}, ${setorDestinoNome || null}, ${usuarioNome || null},
              ${acao ?? 'TRAMITACAO'}, NOW(), NOW(), NOW())`

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
