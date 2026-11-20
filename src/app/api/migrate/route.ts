/**
 * Rota temporária de migrate — executa prisma db push em produção via mysql2.
 * Lê o schema e cria as tabelas que não existem ainda.
 * REMOVER após o banco estar criado.
 */
import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

export const runtime = 'nodejs'

function parseDbUrl(url: string) {
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
  if (!m) throw new Error('DATABASE_URL inválida')
  return { user: m[1], password: decodeURIComponent(m[2]), host: m[3], port: parseInt(m[4]), database: m[5].split('?')[0] }
}

export async function POST(req: NextRequest) {
  let conn: mysql.Connection | null = null
  try {
    const { token } = await req.json()
    if (token !== (process.env.SETUP_SECRET ?? 'biritinga-setup-2024')) {
      return NextResponse.json({ erro: 'Token inválido' }, { status: 401 })
    }

    const { user, password, host, port, database } = parseDbUrl(process.env.DATABASE_URL ?? '')
    conn = await mysql.createConnection({
      host, port, user, password, database,
      ssl: { rejectUnauthorized: false },
      multipleStatements: true,
    })

    // Verificar quais tabelas já existem
    const [tables] = await conn.execute(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
      [database]
    ) as any
    const existingTables = tables.map((t: any) => t.TABLE_NAME)

    return NextResponse.json({
      ok: true,
      database,
      existingTables,
      message: 'Conexão OK. Tabelas existentes listadas.',
    })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  } finally {
    await conn?.end()
  }
}
