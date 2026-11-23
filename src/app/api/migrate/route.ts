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

type Migration = { name: string; sql: string; checkColumn?: { table: string; column: string } }

// Lista de migrações idempotentes
const MIGRATIONS: Migration[] = [
  // ── Licitacao ──────────────────────────────────────────────────────────────
  {
    name: 'licitacao_forma',
    sql: `ALTER TABLE Licitacao ADD COLUMN forma VARCHAR(50) NOT NULL DEFAULT 'MENOR_PRECO' AFTER modalidade`,
    checkColumn: { table: 'Licitacao', column: 'forma' },
  },
  {
    name: 'licitacao_dataPublicacao',
    sql: `ALTER TABLE Licitacao ADD COLUMN dataPublicacao DATETIME NULL AFTER dataAbertura`,
    checkColumn: { table: 'Licitacao', column: 'dataPublicacao' },
  },
  {
    name: 'licitacao_exercicio',
    sql: `ALTER TABLE Licitacao ADD COLUMN exercicio INT NOT NULL DEFAULT 2024`,
    checkColumn: { table: 'Licitacao', column: 'exercicio' },
  },
  {
    name: 'licitacao_unidadeGestora',
    sql: `ALTER TABLE Licitacao ADD COLUMN unidadeGestora VARCHAR(255) NULL`,
    checkColumn: { table: 'Licitacao', column: 'unidadeGestora' },
  },
  {
    name: 'licitacao_dotacaoOrcamentaria',
    sql: `ALTER TABLE Licitacao ADD COLUMN dotacaoOrcamentaria VARCHAR(255) NULL`,
    checkColumn: { table: 'Licitacao', column: 'dotacaoOrcamentaria' },
  },
  {
    name: 'licitacao_justificativa',
    sql: `ALTER TABLE Licitacao ADD COLUMN justificativa TEXT NULL`,
    checkColumn: { table: 'Licitacao', column: 'justificativa' },
  },
  {
    name: 'licitacao_fundamentacao',
    sql: `ALTER TABLE Licitacao ADD COLUMN fundamentacao VARCHAR(255) NULL`,
    checkColumn: { table: 'Licitacao', column: 'fundamentacao' },
  },
  {
    name: 'licitacao_urlEdital',
    sql: `ALTER TABLE Licitacao ADD COLUMN urlEdital VARCHAR(500) NULL`,
    checkColumn: { table: 'Licitacao', column: 'urlEdital' },
  },
  {
    name: 'licitacao_pregoeiro',
    sql: `ALTER TABLE Licitacao ADD COLUMN pregoeiro VARCHAR(255) NULL`,
    checkColumn: { table: 'Licitacao', column: 'pregoeiro' },
  },
  {
    name: 'licitacao_comissao',
    sql: `ALTER TABLE Licitacao ADD COLUMN comissao TEXT NULL`,
    checkColumn: { table: 'Licitacao', column: 'comissao' },
  },
  {
    name: 'licitacao_atualizadoEm',
    sql: `ALTER TABLE Licitacao ADD COLUMN atualizadoEm DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    checkColumn: { table: 'Licitacao', column: 'atualizadoEm' },
  },
  // ── Servidor ───────────────────────────────────────────────────────────────
  {
    name: 'servidor_observacoes',
    sql: `ALTER TABLE Servidor ADD COLUMN observacoes TEXT NULL`,
    checkColumn: { table: 'Servidor', column: 'observacoes' },
  },
  // ── FK: Servidor.cargoId deve apontar para Cargo (não cargos) ─────────────
  // O Prisma criou a FK para a tabela 'cargos' mas a tabela real é 'Cargo'
  // Dropar a FK antiga e recriar apontando para a tabela correta
  {
    name: 'servidor_cargo_fk_fix',
    sql: `ALTER TABLE Servidor DROP FOREIGN KEY Servidor_cargoId_fkey`,
    checkColumn: undefined, // sempre tenta; ignora erro se já não existe
  },
  {
    name: 'servidor_cargo_fk_new',
    sql: `ALTER TABLE Servidor ADD CONSTRAINT Servidor_cargoId_fkey FOREIGN KEY (cargoId) REFERENCES Cargo(id) ON DELETE RESTRICT ON UPDATE CASCADE`,
    checkColumn: undefined,
  },
]

async function columnExists(conn: mysql.Connection, table: string, column: string, database: string): Promise<boolean> {
  const [rows]: any = await conn.execute(
    `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [database, table, column]
  )
  return rows[0].n > 0
}

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
      // Verificar se a coluna já existe (compatível com MySQL antigo)
      if (mig.checkColumn) {
        const exists = await columnExists(conn, mig.checkColumn.table, mig.checkColumn.column, cfg.database)
        if (exists) {
          results.push({ name: mig.name, status: 'já existe' })
          continue
        }
      }
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
