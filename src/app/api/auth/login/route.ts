/**
 * Login — usa mysql2 diretamente (sem Prisma) para compatibilidade com
 * MySQL 8.0 no cPanel (sha256_password/caching_sha2_password).
 */
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import mysql from 'mysql2/promise'
import { randomBytes, createHash } from 'crypto'
import {
  gerarAccessToken,
  gerarRefreshToken,
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  cookieOptions,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
} from '@/lib/auth/jwt'
import type { PerfilPadrao } from '@/types'

export const runtime = 'nodejs'

// ─── Conexão MySQL ──────────────────────────────────────────────────────────

function parseDbUrl(url: string) {
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
  if (!m) throw new Error('DATABASE_URL inválida')
  return {
    user:     m[1],
    password: decodeURIComponent(m[2]),
    host:     m[3],
    port:     parseInt(m[4]),
    database: m[5].split('?')[0],
  }
}

function getConn() {
  const { user, password, host, port, database } = parseDbUrl(process.env.DATABASE_URL ?? '')
  return mysql.createConnection({ host, port, user, password, database, ssl: { rejectUnauthorized: false } })
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

// ─── POST /api/auth/login ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let conn: mysql.Connection | null = null
  try {
    const body = await request.json()
    const { email, senha, municipioId: municipioIdBody } = body

    if (!email || !senha) {
      return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })
    }

    const ip        = request.headers.get('x-forwarded-for') ?? undefined
    const userAgent = request.headers.get('user-agent') ?? undefined

    conn = await getConn()

    // ── 1. Buscar município ─────────────────────────────────────────────────
    let municipioId: string = municipioIdBody ?? ''

    if (!municipioId) {
      const host    = request.headers.get('host') ?? ''
      const slug    = host.split('.')[0]           // ex: "erp" de erp.biritinga.ba.gov.br
      const dominio = host.split(':')[0]           // ex: "erp.biritinga.ba.gov.br"

      // Tenta por slug ou domínio
      const [munRows] = await conn.execute(
        'SELECT id FROM Municipio WHERE (slug = ? OR dominio = ?) AND ativo = 1 LIMIT 1',
        [slug, dominio]
      ) as any

      if (munRows.length > 0) {
        municipioId = munRows[0].id
      } else {
        // Fallback: se só há um município ativo, usa ele
        const [countRows] = await conn.execute(
          'SELECT id FROM Municipio WHERE ativo = 1 LIMIT 2'
        ) as any
        if (countRows.length === 1) {
          municipioId = countRows[0].id
        } else {
          return NextResponse.json({ erro: 'Município não encontrado' }, { status: 404 })
        }
      }
    }

    // ── 2. Buscar usuário ───────────────────────────────────────────────────
    const [userRows] = await conn.execute(
      `SELECT id, nome, email, senhaHash, perfil, secretaria, avatarUrl,
              bloqueadoAte, tentativasFalhas, perfilId, municipioId
       FROM Usuario
       WHERE municipioId = ? AND email = ? AND ativo = 1
       LIMIT 1`,
      [municipioId, email]
    ) as any

    if (userRows.length === 0) {
      return NextResponse.json({ erro: 'Email ou senha incorretos' }, { status: 401 })
    }

    const usuario = userRows[0]

    // ── 3. Verificar bloqueio ───────────────────────────────────────────────
    if (usuario.bloqueadoAte && new Date(usuario.bloqueadoAte) > new Date()) {
      const minutos = Math.ceil((new Date(usuario.bloqueadoAte).getTime() - Date.now()) / 60000)
      return NextResponse.json(
        { erro: `Conta bloqueada por ${minutos} minutos. Tente novamente mais tarde.`, codigo: 'CONTA_BLOQUEADA' },
        { status: 429 }
      )
    }

    // ── 4. Verificar senha ──────────────────────────────────────────────────
    const senhaOk = await bcrypt.compare(senha, usuario.senhaHash)
    if (!senhaOk) {
      // Registrar tentativa falha
      const novasTentativas = (usuario.tentativasFalhas ?? 0) + 1
      if (novasTentativas >= 5) {
        const bloqueadoAte = new Date(Date.now() + 30 * 60 * 1000)
        await conn.execute(
          'UPDATE Usuario SET tentativasFalhas = ?, bloqueadoAte = ? WHERE id = ?',
          [novasTentativas, bloqueadoAte, usuario.id]
        )
      } else {
        await conn.execute(
          'UPDATE Usuario SET tentativasFalhas = ? WHERE id = ?',
          [novasTentativas, usuario.id]
        )
      }
      return NextResponse.json({ erro: 'Email ou senha incorretos' }, { status: 401 })
    }

    // ── 5. Buscar permissões do perfil customizado ──────────────────────────
    let permissoes: string[] = []
    if (usuario.perfilId) {
      const [perfRows] = await conn.execute(
        'SELECT permissoes FROM PerfilCustom WHERE id = ? LIMIT 1',
        [usuario.perfilId]
      ) as any
      if (perfRows.length > 0) {
        try { permissoes = JSON.parse(perfRows[0].permissoes) } catch {}
      }
    }

    // ── 6. Criar sessão ─────────────────────────────────────────────────────
    const sessionId    = randomBytes(32).toString('hex')
    const accessToken  = await gerarAccessToken({
      sub:        usuario.id,
      mid:        usuario.municipioId,
      nome:       usuario.nome,
      email:      usuario.email,
      perfil:     usuario.perfil as PerfilPadrao,
      secretaria: usuario.secretaria ?? undefined,
      permissoes,
      sid:        sessionId,
    })
    const refreshToken = await gerarRefreshToken({
      sub: usuario.id,
      sid: sessionId,
      mid: usuario.municipioId,
    })

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Verificar se tabela Sessao existe antes de tentar inserir
    try {
      await conn.execute(
        `INSERT INTO Sessao (id, municipioId, usuarioId, refreshToken, userAgent, ip, expiresAt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [sessionId, usuario.municipioId, usuario.id, hashToken(refreshToken), userAgent ?? null, ip ?? null, expiresAt]
      )
    } catch {
      // Tabela Sessao ainda não existe — login ainda funciona, apenas sem persistência de sessão
    }

    // Atualizar ultimoLogin
    await conn.execute(
      'UPDATE Usuario SET ultimoLogin = NOW(), tentativasFalhas = 0, bloqueadoAte = NULL WHERE id = ?',
      [usuario.id]
    )

    // ── 7. Retornar tokens como cookies ─────────────────────────────────────
    const response = NextResponse.json({
      usuario: {
        id:         usuario.id,
        nome:       usuario.nome,
        email:      usuario.email,
        perfil:     usuario.perfil,
        secretaria: usuario.secretaria,
        avatarUrl:  usuario.avatarUrl,
      },
    })

    response.cookies.set(COOKIE_ACCESS,  accessToken,  cookieOptions(ACCESS_MAX_AGE))
    response.cookies.set(COOKIE_REFRESH, refreshToken, cookieOptions(REFRESH_MAX_AGE))

    return response

  } catch (error: any) {
    console.error('[LOGIN]', error)
    return NextResponse.json({ erro: 'Erro interno', detalhe: error.message }, { status: 500 })
  } finally {
    await conn?.end()
  }
}
