/**
 * Rota temporária — cria tabelas Municipio e Usuario se não existirem.
 * REMOVER após o banco estar completo.
 */
import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

export const runtime = 'nodejs'

function parseDbUrl(url: string) {
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
  if (!m) throw new Error('DATABASE_URL inválida')
  return { user: m[1], password: decodeURIComponent(m[2]), host: m[3], port: parseInt(m[4]), database: m[5].split('?')[0] }
}

const CREATE_MUNICIPIO = `
CREATE TABLE IF NOT EXISTS \`Municipio\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`nome\` VARCHAR(191) NOT NULL,
    \`uf\` CHAR(2) NOT NULL,
    \`ibge\` VARCHAR(191) NOT NULL,
    \`cnpj\` VARCHAR(191) NULL,
    \`slug\` VARCHAR(191) NOT NULL,
    \`dominio\` VARCHAR(191) NULL,
    \`logoUrl\` VARCHAR(191) NULL,
    \`corPrimaria\` CHAR(7) NULL,
    \`ativo\` BOOLEAN NOT NULL DEFAULT true,
    \`plano\` VARCHAR(191) NOT NULL DEFAULT 'basico',
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    UNIQUE INDEX \`Municipio_ibge_key\`(\`ibge\`),
    UNIQUE INDEX \`Municipio_cnpj_key\`(\`cnpj\`),
    UNIQUE INDEX \`Municipio_slug_key\`(\`slug\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
`

const CREATE_USUARIO = `
CREATE TABLE IF NOT EXISTS \`Usuario\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`municipioId\` VARCHAR(191) NOT NULL,
    \`nome\` VARCHAR(191) NOT NULL,
    \`email\` VARCHAR(191) NOT NULL,
    \`senhaHash\` VARCHAR(191) NOT NULL,
    \`cpf\` VARCHAR(191) NULL,
    \`telefone\` VARCHAR(191) NULL,
    \`cargo\` VARCHAR(191) NULL,
    \`secretaria\` VARCHAR(191) NULL,
    \`perfil\` ENUM('SUPER_ADMIN','ADMIN_MUNICIPIO','GESTOR','OPERADOR','VISUALIZADOR','PORTAL_CIDADAO') NOT NULL DEFAULT 'OPERADOR',
    \`perfilId\` VARCHAR(191) NULL,
    \`ativo\` BOOLEAN NOT NULL DEFAULT true,
    \`mfaAtivado\` BOOLEAN NOT NULL DEFAULT false,
    \`mfaSegredo\` VARCHAR(191) NULL,
    \`ultimoLogin\` DATETIME(3) NULL,
    \`tentativasFalhas\` INTEGER NOT NULL DEFAULT 0,
    \`bloqueadoAte\` DATETIME(3) NULL,
    \`avatarUrl\` VARCHAR(191) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    INDEX \`Usuario_municipioId_perfil_idx\`(\`municipioId\`, \`perfil\`),
    INDEX \`Usuario_municipioId_secretaria_idx\`(\`municipioId\`, \`secretaria\`),
    UNIQUE INDEX \`Usuario_municipioId_email_key\`(\`municipioId\`, \`email\`),
    UNIQUE INDEX \`Usuario_municipioId_cpf_key\`(\`municipioId\`, \`cpf\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
`

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
    })

    await conn.execute(CREATE_MUNICIPIO)
    await conn.execute(CREATE_USUARIO)

    const [tables] = await conn.execute(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
      [database]
    ) as any

    return NextResponse.json({
      ok: true,
      mensagem: 'Tabelas Municipio e Usuario criadas com sucesso!',
      totalTabelas: tables.length,
      tabelas: tables.map((t: any) => t.TABLE_NAME),
    })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  } finally {
    await conn?.end()
  }
}
