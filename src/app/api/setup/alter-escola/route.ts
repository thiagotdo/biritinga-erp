/**
 * Adiciona colunas faltantes na tabela Escola (criada com schema antigo).
 * POST /api/setup/alter-escola  -  Authorization: Bearer <SETUP_SECRET>
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
  if (!SETUP_TOKEN || auth !== `Bearer ${SETUP_TOKEN}`) {
    return NextResponse.json({ erro: 'Token inválido' }, { status: 401 })
  }

  const conn = await mysql.createConnection({
    ...parseDbUrl(process.env.DATABASE_URL ?? ''),
    ssl: { rejectUnauthorized: false },
  })

  // Colunas a garantir na tabela Escola
  const columns: Array<{ name: string; definition: string }> = [
    { name: 'salas',          definition: 'INT NULL' },
    { name: 'capacidadeTotal',definition: 'INT NULL' },
    { name: 'zona',           definition: 'VARCHAR(191) NULL' },
    { name: 'inep',           definition: 'VARCHAR(191) NULL' },
    { name: 'telefone',       definition: 'VARCHAR(191) NULL' },
    { name: 'email',          definition: 'VARCHAR(191) NULL' },
    { name: 'diretor',        definition: 'VARCHAR(191) NULL' },
    { name: 'secretario',     definition: 'VARCHAR(191) NULL' },
    { name: 'cep',            definition: 'VARCHAR(191) NULL' },
    { name: 'logradouro',     definition: 'VARCHAR(191) NULL' },
    { name: 'bairro',         definition: 'VARCHAR(191) NULL' },
    { name: 'criadoEm',       definition: 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)' },
    { name: 'atualizadoEm',   definition: 'DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)' },
  ]

  const dbName = parseDbUrl(process.env.DATABASE_URL ?? '').database
  const results: string[] = []

  try {
    for (const col of columns) {
      // Check if column exists via INFORMATION_SCHEMA
      const [rows]: any = await conn.execute(
        `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Escola' AND COLUMN_NAME = ?`,
        [dbName, col.name]
      )
      if (rows[0].cnt > 0) {
        results.push(`SKIP (já existe): ${col.name}`)
        continue
      }
      try {
        await conn.execute(`ALTER TABLE \`Escola\` ADD COLUMN \`${col.name}\` ${col.definition}`)
        results.push(`OK: adicionado ${col.name}`)
      } catch (e: any) {
        results.push(`ERR ${e.code}: ${e.message.slice(0, 100)}`)
      }
    }

    return NextResponse.json({ ok: true, results })
  } catch (e: any) {
    console.error('[alter-escola] erro:', e)
    return NextResponse.json({ erro: e.message }, { status: 500 })
  } finally {
    await conn.end()
  }
}
