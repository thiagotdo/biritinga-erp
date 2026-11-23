/**
 * Endpoint de migração de banco de dados.
 * Executa ALTER TABLE para adicionar colunas faltantes sem precisar do phpMyAdmin.
 * Protegido pelo SETUP_SECRET token.
 */
import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

export const runtime = 'nodejs'

const SETUP_TOKEN = process.env.SETUP_SECRET ?? 'biritinga-setup-2024'

function parseDbUrl(url: string) {
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
  if (!m) throw new Error('DATABASE_URL inválida')
  return { user: m[1], password: decodeURIComponent(m[2]), host: m[3], port: parseInt(m[4]), database: m[5].split('?')[0] }
}

// Lista de migrações idempotentes (podem ser rodadas várias vezes sem erro)
const MIGRATIONS: { name: string; sql: string }[] = [
  // ── Licitacao ──────────────────────────────────────────────────────────────
  {
    name: 'licitacao_forma',
    sql: `ALTER TABLE Licitacao ADD COLUMN IF NOT EXISTS forma VARCHAR(50) NOT NULL DEFAULT 'MENOR_PRECO' AFTER modalidade`,
  },
  {
    name: 'licitacao_exercicio',
    sql: `ALTER TABLE Licitacao ADD COLUMN IF NOT EXISTS exercicio INT NOT NULL DEFAULT 2024 AFTER dataPublicacao`,
  },
  {
    name: 'licitacao_unidadeGestora',
    sql: `ALTER TABLE Licitacao ADD COLUMN IF NOT EXISTS unidadeGestora VARCHAR(255) NULL AFTER exercicio`,
  },
  {
    name: 'licitacao_dotacaoOrcamentaria',
    sql: `ALTER TABLE Licitacao ADD COLUMN IF NOT EXISTS dotacaoOrcamentaria VARCHAR(255) NULL AFTER unidadeGestora`,
  },
  {
    name: 'licitacao_justificativa',
    sql: `ALTER TABLE Licitacao ADD COLUMN IF NOT EXISTS justificativa TEXT NULL AFTER dotacaoOrcamentaria`,
  },
  {
    name: 'licitacao_fundamentacao',
    sql: `ALTER TABLE Licitacao ADD COLUMN IF NOT EXISTS fundamentacao VARCHAR(255) NULL AFTER justificativa`,
  },
  {
    name: 'licitacao_urlEdital',
    sql: `ALTER TABLE Licitacao ADD COLUMN IF NOT EXISTS urlEdital VARCHAR(500) NULL AFTER fundamentacao`,
  },
  {
    name: 'licitacao_pregoeiro',
    sql: `ALTER TABLE Licitacao ADD COLUMN IF NOT EXISTS pregoeiro VARCHAR(255) NULL AFTER urlEdital`,
  },
  {
    name: 'licitacao_comissao',
    sql: `ALTER TABLE Licitacao ADD COLUMN IF NOT EXISTS comissao TEXT NULL AFTER pregoeiro`,
  },
  {
    name: 'licitacao_atualizadoEm',
    sql: `ALTER TABLE Licitacao ADD COLUMN IF NOT EXISTS atualizadoEm DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER comissao`,
  },
  {
    name: 'licitacao_dataPublicacao',
    sql: `ALTER TABLE Licitacao ADD COLUMN IF NOT EXISTS dataPublicacao DATETIME NULL AFTER dataAbertura`,
  },
  // ── Servidor ───────────────────────────────────────────────────────────────
  {
    name: 'servidor_observacoes',
    sql: `ALTER TABLE Servidor ADD COLUMN IF NOT EXISTS observacoes TEXT NULL`,
  },
  // ── Escola ─────────────────────────────────────────────────────────────────
  {
    name: 'escola_turmas_fix',
    sql: `ALTER TABLE Turma MODIFY COLUMN IF EXISTS ativo TINYINT(1) NOT NULL DEFAULT 1`,
  },
]

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (token !== SETUP_TOKEN) {
    return NextResponse.json({ erro: 'Token inválido' }, { status: 401 })
  }

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) return NextResponse.json({ erro: 'DATABASE_URL não configurada' }, { status: 500 })

  const cfg = parseDbUrl(dbUrl)
  const conn = await mysql.createConnection({
    ...cfg,
    ssl: { rejectUnauthorized: false },
  })

  const results: { name: string; status: string; error?: string }[] = []

  for (const mig of MIGRATIONS) {
    try {
      await conn.execute(mig.sql)
      results.push({ name: mig.name, status: 'ok' })
    } catch (e: any) {
      // Coluna já existe = erro 1060, ignoramos
      if (e.errno === 1060 || e.message?.includes('Duplicate column')) {
        results.push({ name: mig.name, status: 'já existe' })
      } else {
        results.push({ name: mig.name, status: 'erro', error: e.message })
      }
    }
  }

  await conn.end()

  const errors = results.filter(r => r.status === 'erro')
  return NextResponse.json({
    ok: errors.length === 0,
    total: results.length,
    results,
  }, { status: errors.length === 0 ? 200 : 207 })
}
