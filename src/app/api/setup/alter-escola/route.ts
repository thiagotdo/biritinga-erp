/**
 * Adiciona colunas faltantes na tabela Escola (criada com schema antigo).
 * POST /api/setup/alter-escola  —  Authorization: Bearer <SETUP_SECRET>
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
  const alterations = [
    "ALTER TABLE `Escola` ADD COLUMN IF NOT EXISTS `salas` INT NULL",
    "ALTER TABLE `Escola` ADD COLUMN IF NOT EXISTS `capacidadeTotal` INT NULL",
    "ALTER TABLE `Escola` ADD COLUMN IF NOT EXISTS `zona` VARCHAR(191) NULL",
    "ALTER TABLE `Escola` ADD COLUMN IF NOT EXISTS `inep` VARCHAR(191) NULL",
    "ALTER TABLE `Escola` ADD COLUMN IF NOT EXISTS `telefone` VARCHAR(191) NULL",
    "ALTER TABLE `Escola` ADD COLUMN IF NOT EXISTS `email` VARCHAR(191) NULL",
    "ALTER TABLE `Escola` ADD COLUMN IF NOT EXISTS `diretor` VARCHAR(191) NULL",
    "ALTER TABLE `Escola` ADD COLUMN IF NOT EXISTS `secretario` VARCHAR(191) NULL",
    "ALTER TABLE `Escola` ADD COLUMN IF NOT EXISTS `cep` VARCHAR(191) NULL",
    "ALTER TABLE `Escola` ADD COLUMN IF NOT EXISTS `logradouro` VARCHAR(191) NULL",
    "ALTER TABLE `Escola` ADD COLUMN IF NOT EXISTS `bairro` VARCHAR(191) NULL",
  ]

  const results: string[] = []

  try {
    for (const sql of alterations) {
      try {
        await conn.execute(sql)
        results.push(`OK: ${sql.slice(0, 60)}`)
      } catch (e: any) {
        // ER_DUP_FIELDNAME = coluna já existe (normal)
        if (e.code === 'ER_DUP_FIELDNAME') {
          results.push(`SKIP (já existe): ${sql.slice(40, 80)}`)
        } else {
          results.push(`ERR ${e.code}: ${e.message.slice(0, 100)}`)
        }
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
