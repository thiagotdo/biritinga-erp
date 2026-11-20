/**
 * Rota de setup inicial — cria o município de Biritinga e o primeiro SUPER_ADMIN.
 * Usa mysql2 diretamente (em vez do Prisma engine) para compatibilidade com
 * MySQL 8.0 no cPanel que usa sha256_password/caching_sha2_password.
 * Só funciona se NÃO existir nenhum usuário no banco ainda.
 */
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import mysql from 'mysql2/promise'

export const runtime = 'nodejs'

const SETUP_TOKEN = process.env.SETUP_SECRET ?? 'biritinga-setup-2024'

function parseDbUrl(url: string) {
  // mysql://user:pass@host:port/db
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
  if (!m) throw new Error('DATABASE_URL inválida')
  return { user: m[1], password: decodeURIComponent(m[2]), host: m[3], port: parseInt(m[4]), database: m[5].split('?')[0] }
}

async function getConnection() {
  const { user, password, host, port, database } = parseDbUrl(process.env.DATABASE_URL ?? '')
  return mysql.createConnection({
    host, port, user, password, database,
    ssl: { rejectUnauthorized: false },
  })
}

export async function POST(req: NextRequest) {
  let conn: mysql.Connection | null = null
  try {
    const { token, nome, email, senha } = await req.json()

    if (token !== SETUP_TOKEN) {
      return NextResponse.json({ erro: 'Token inválido' }, { status: 401 })
    }

    conn = await getConnection()

    // Verifica se já existe algum usuário
    const [rows] = await conn.execute('SELECT COUNT(*) as total FROM Usuario') as any
    const total = rows[0].total
    if (total > 0) {
      return NextResponse.json({ erro: 'Setup já foi realizado. Use o login normal.' }, { status: 409 })
    }

    // Cria ou recupera o município de Biritinga
    const [munRows] = await conn.execute(
      'SELECT id, nome FROM Municipio WHERE slug = ?', ['biritinga']
    ) as any

    let municipioId: string
    let municipioNome: string

    if (munRows.length > 0) {
      municipioId = munRows[0].id
      municipioNome = munRows[0].nome
    } else {
      const id = crypto.randomUUID()
      await conn.execute(
        `INSERT INTO Municipio (id, nome, uf, ibge, slug, dominio, corPrimaria, ativo, plano, createdAt, updatedAt)
         VALUES (?, 'Biritinga', 'BA', '2903953', 'biritinga', 'biritinga.ba.gov.br', '#1B5E20', 1, 'pro', NOW(), NOW())`,
        [id]
      )
      municipioId = id
      municipioNome = 'Biritinga'
    }

    // Cria o SUPER_ADMIN
    const senhaHash = await bcrypt.hash(senha, 12)
    const userId = crypto.randomUUID()
    await conn.execute(
      `INSERT INTO Usuario (id, municipioId, nome, email, senhaHash, perfil, ativo, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 'SUPER_ADMIN', 1, NOW(), NOW())`,
      [userId, municipioId, nome ?? 'Administrador', email, senhaHash]
    )

    return NextResponse.json({
      ok: true,
      mensagem: 'Setup concluído! Acesse o sistema com suas credenciais.',
      municipio: { id: municipioId, nome: municipioNome },
      usuario: { id: userId, nome: nome ?? 'Administrador', email, perfil: 'SUPER_ADMIN' },
    }, { status: 201 })

  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  } finally {
    await conn?.end()
  }
}

// GET — verifica se o setup já foi feito
export async function GET() {
  let conn: mysql.Connection | null = null
  try {
    conn = await getConnection()
    const [rows] = await conn.execute('SELECT COUNT(*) as total FROM Usuario') as any
    return NextResponse.json({ setupFeito: rows[0].total > 0 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  } finally {
    await conn?.end()
  }
}
