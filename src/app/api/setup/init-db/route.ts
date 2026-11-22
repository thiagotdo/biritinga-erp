/**
 * Inicializa o banco de dados executando a migration inicial.
 * Executar UMA VEZ: POST /api/setup/init-db
 * com header Authorization: Bearer <SETUP_SECRET>
 *
 * Cria todas as tabelas com IF NOT EXISTS (seguro para re-execução).
 */
import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'
import path from 'path'
import fs from 'fs'

export const runtime = 'nodejs'

const SETUP_TOKEN = process.env.SETUP_SECRET ?? ''

function parseDbUrl(url: string) {
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
  if (!m) throw new Error('DATABASE_URL inválida')
  return { user: m[1], password: decodeURIComponent(m[2]), host: m[3], port: parseInt(m[4]), database: m[5].split('?')[0] }
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (!SETUP_TOKEN || auth !== `Bearer ${SETUP_TOKEN}`) {
    return NextResponse.json({ erro: 'Token inválido' }, { status: 401 })
  }

  const conn = await mysql.createConnection({
    ...parseDbUrl(process.env.DATABASE_URL ?? ''),
    ssl: { rejectUnauthorized: false },
  })

  try {
    // Read the migration SQL file
    const sqlPath = path.join(process.cwd(), 'prisma/migrations/0_init/migration.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')

    // Remove comment lines and split into statements
    const cleaned = sqlContent.replace(/--[^\n]*\n/g, '\n')
    const statements = cleaned.split(';').map(s => s.trim()).filter(s => s.length > 0)

    let created = 0
    let skipped = 0
    let errors: string[] = []

    for (const stmt of statements) {
      try {
        await conn.execute(stmt)
        created++
      } catch (e: any) {
        // ER_TABLE_EXISTS_ERROR, ER_DUP_KEYNAME, ER_DUP_INDEX - safe to skip
        if (['ER_TABLE_EXISTS_ERROR', 'ER_DUP_KEYNAME', 'ER_DUP_INDEX', 'ER_CANT_DROP_FIELD_OR_KEY', 'ER_FK_DUP_NAME', 'ER_TOO_LONG_KEY'].includes(e.code)) {
          skipped++
        } else {
          errors.push(`${e.code}: ${e.message.slice(0, 120)}`)
        }
      }
    }

    return NextResponse.json({
      ok: errors.length === 0,
      msg: `Init DB: ${created} executados, ${skipped} ignorados (já existiam), ${errors.length} erros.`,
      errors: errors.slice(0, 20),
    })
  } catch (e: any) {
    console.error('[init-db] erro:', e)
    return NextResponse.json({ erro: e.message, stack: e.stack?.split('\n').slice(0, 5) }, { status: 500 })
  } finally {
    await conn.end()
  }
}
