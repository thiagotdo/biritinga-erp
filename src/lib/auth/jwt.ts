// ─── JWT - geração e verificação de tokens ───────────────────────────────────
// Usa a biblioteca `jose` (nativa Edge Runtime, sem dependências nativas)

import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import type { JwtPayload, RefreshPayload, PerfilPadrao } from '@/types'

const ACCESS_SECRET  = new TextEncoder().encode(process.env.JWT_SECRET!)
const REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!)

const ACCESS_TTL  = '15m'   // token de acesso: curta duração
const REFRESH_TTL = '7d'    // token de refresh: longa duração

// ─── Gerar access token ───────────────────────────────────────────────────────

export async function gerarAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({
    sub:        payload.sub,
    mid:        payload.mid,
    nome:       payload.nome,
    email:      payload.email,
    perfil:     payload.perfil,
    secretaria: payload.secretaria,
    permissoes: payload.permissoes,
    sid:        payload.sid,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(ACCESS_SECRET)
}

// ─── Verificar access token ───────────────────────────────────────────────────

export async function verificarAccessToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET)
    return payload as unknown as JwtPayload
  } catch {
    return null
  }
}

// ─── Gerar refresh token ──────────────────────────────────────────────────────

export async function gerarRefreshToken(payload: Omit<RefreshPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({
    sub: payload.sub,
    sid: payload.sid,
    mid: payload.mid,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TTL)
    .sign(REFRESH_SECRET)
}

// ─── Verificar refresh token ──────────────────────────────────────────────────

export async function verificarRefreshToken(token: string): Promise<RefreshPayload | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET)
    return payload as unknown as RefreshPayload
  } catch {
    return null
  }
}

// ─── Helpers de cookie ────────────────────────────────────────────────────────

export const COOKIE_ACCESS  = 'erp_at'
export const COOKIE_REFRESH = 'erp_rt'

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path:     '/',
    maxAge,
  }
}

export const ACCESS_MAX_AGE  = 15 * 60          // 15 min em segundos
export const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 // 7 dias em segundos
