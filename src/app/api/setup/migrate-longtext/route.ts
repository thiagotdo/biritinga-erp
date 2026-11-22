/**
 * Migração pontual: altera logoUrl, brasaoUrl e favicon para LONGTEXT
 * para suportar imagens em base64.
 * Executar UMA VEZ: POST /api/setup/migrate-longtext
 * com header Authorization: Bearer <SETUP_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

export const runtime = 'nodejs'

const SETUP_TOKEN = process.env.SETUP_SECRET ?? ''

function parseDbUrl(url: string) {
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
  if (!m) throw new Error('DATABASE_URL inválida')
  return { user: m[1], password: decodeURIComponent(m[2]), host: m[3], port: parseInt(m[4]), database: m[5].split('?')[0] }
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${SETUP_TOKEN}`) {
    return NextResponse.json({ erro: 'Token inválido' }, { status: 401 })
  }

  const conn = await mysql.createConnection({
    ...parseDbUrl(process.env.DATABASE_URL ?? ''),
    ssl: { rejectUnauthorized: false },
  })

  try {
    await conn.execute(`
      ALTER TABLE municipios
        MODIFY COLUMN logoUrl   LONGTEXT,
        MODIFY COLUMN brasaoUrl LONGTEXT,
        MODIFY COLUMN favicon   LONGTEXT
    `)
    return NextResponse.json({ ok: true, msg: 'Colunas alteradas para LONGTEXT com sucesso.' })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  } finally {
    await conn.end()
  }
}
