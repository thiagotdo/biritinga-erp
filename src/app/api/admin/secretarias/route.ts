// @ts-nocheck
/**
 * GET  /api/admin/secretarias  - lista secretarias com estatísticas
 * POST /api/admin/secretarias  - cria nova secretaria
 * PATCH /api/admin/secretarias - atualiza secretaria existente
 */
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import { extrairContextoRequest, temPermissao } from '@/lib/rbac'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    const municipioId = ctx.municipioId
    if (!municipioId) return NextResponse.json({ erro: 'Sem município' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const ativo = searchParams.get('ativo') !== 'false'

    // Busca secretarias via queryRaw (tabela lowercase)
    const secretarias = await prisma.$queryRaw`
      SELECT s.id, s.nome, s.sigla, s.descricao, s.cor, s.icone, s.ativo, s.ordem,
             s.criadoEm, s.atualizadoEm,
             COUNT(DISTINCT l.servidorId) AS totalServidores
      FROM secretarias s
      LEFT JOIN Lotacao l ON l.secretaria = s.sigla
        AND l.municipioId = s.municipioId AND l.ativo = 1
      WHERE s.municipioId = ${municipioId}
        AND s.ativo = ${ativo ? 1 : 0}
      GROUP BY s.id
      ORDER BY s.ordem, s.nome`

    // Estatísticas gerais
    const [stats] = await prisma.$queryRaw`
      SELECT
        COUNT(*) AS totalSecretarias,
        SUM(CASE WHEN ativo = 1 THEN 1 ELSE 0 END) AS ativas,
        SUM(CASE WHEN ativo = 0 THEN 1 ELSE 0 END) AS inativas
      FROM secretarias
      WHERE municipioId = ${municipioId}` as any[]

    // Servidores por secretaria (via Lotacao)
    const servidoresPorSec = await prisma.$queryRaw`
      SELECT l.secretaria, COUNT(DISTINCT l.servidorId) AS total
      FROM Lotacao l
      WHERE l.municipioId = ${municipioId} AND l.ativo = 1
      GROUP BY l.secretaria
      ORDER BY total DESC` as any[]

    return NextResponse.json({
      secretarias,
      stats: {
        totalSecretarias: Number(stats?.totalSecretarias ?? 0),
        ativas: Number(stats?.ativas ?? 0),
        inativas: Number(stats?.inativas ?? 0),
      },
      servidoresPorSecretaria: servidoresPorSec,
    })
  } catch (error: any) {
    console.error('[GET /api/admin/secretarias]', error)
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    if (!temPermissao(ctx, 'admin:secretaria:create')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }
    const municipioId = ctx.municipioId

    const body = await req.json()
    const { nome, sigla, descricao, cor, icone, ordem } = body

    if (!nome || !sigla) {
      return NextResponse.json({ erro: 'Nome e sigla são obrigatórios' }, { status: 400 })
    }

    // Verificar duplicidade
    const existe = await prisma.$queryRaw`
      SELECT id FROM secretarias WHERE municipioId = ${municipioId} AND sigla = ${sigla.toUpperCase()}
    ` as any[]
    if (existe.length > 0) {
      return NextResponse.json({ erro: 'Sigla já cadastrada' }, { status: 409 })
    }

    const id = randomUUID()
    await prisma.$queryRaw`
      INSERT INTO secretarias (id, municipioId, nome, sigla, descricao, cor, icone, ativo, ordem, criadoEm, atualizadoEm)
      VALUES (${id}, ${municipioId}, ${nome}, ${sigla.toUpperCase()},
              ${descricao ?? null}, ${cor ?? '#4f46e5'}, ${icone ?? 'Building2'},
              1, ${ordem ?? 99}, NOW(), NOW())`

    return NextResponse.json({ id, sigla: sigla.toUpperCase(), nome }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/admin/secretarias]', error)
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    if (!temPermissao(ctx, 'admin:secretaria:update')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }
    const municipioId = ctx.municipioId

    const body = await req.json()
    const { id, nome, sigla, descricao, cor, icone, ativo, ordem } = body
    if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

    await prisma.$queryRaw`
      UPDATE secretarias SET
        nome = COALESCE(${nome ?? null}, nome),
        sigla = COALESCE(${sigla ? sigla.toUpperCase() : null}, sigla),
        descricao = COALESCE(${descricao ?? null}, descricao),
        cor = COALESCE(${cor ?? null}, cor),
        icone = COALESCE(${icone ?? null}, icone),
        ativo = COALESCE(${ativo !== undefined ? (ativo ? 1 : 0) : null}, ativo),
        ordem = COALESCE(${ordem ?? null}, ordem),
        atualizadoEm = NOW()
      WHERE id = ${id} AND municipioId = ${municipioId}`

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[PATCH /api/admin/secretarias]', error)
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }
}
