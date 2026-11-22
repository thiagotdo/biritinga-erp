// ─── Middleware de autenticação (Next.js Edge Runtime) ────────────────────────
// Arquivo: src/middleware.ts (na raiz do projeto Next.js)
//
// Fluxo:
//  1. Rotas públicas → passam sem verificação
//  2. Access token válido → injeta payload como headers X-ERP-*
//  3. Access token expirado + refresh válido → renova tokens e continua
//  4. Sem token / inválido → redireciona para /login

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verificarAccessToken, COOKIE_ACCESS, COOKIE_REFRESH, cookieOptions, ACCESS_MAX_AGE } from '@/lib/auth/jwt'
import { verificarRefreshToken } from '@/lib/auth/jwt'

// Rotas que não precisam de autenticação
const ROTAS_PUBLICAS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/setup',         // Setup inicial (cria primeiro SUPER_ADMIN)
  '/api/migrate',       // Migrate temporário (criar tabelas)
  '/api/admin/tema',    // Tema público (CSS vars, sem auth)
  '/api/cidadao',       // Portal do Cidadão
  '/cidadao',
  '/_next',
  '/favicon',
  '/logo',
]

// Verificar se a rota é pública
function isPublica(pathname: string): boolean {
  return ROTAS_PUBLICAS.some(rota => pathname.startsWith(rota))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublica(pathname)) {
    return NextResponse.next()
  }

  const accessToken  = request.cookies.get(COOKIE_ACCESS)?.value
  const refreshToken = request.cookies.get(COOKIE_REFRESH)?.value

  // ── 1. Verificar access token ──────────────────────────────────────────────
  if (accessToken) {
    const payload = await verificarAccessToken(accessToken)

    if (payload) {
      // Token válido - injetar payload nos headers para os handlers de API
      const headers = new Headers(request.headers)
      headers.set('x-erp-usuario-id',   payload.sub)
      headers.set('x-erp-municipio-id', payload.mid)
      headers.set('x-erp-nome',         payload.nome)
      headers.set('x-erp-email',        payload.email)
      headers.set('x-erp-perfil',       payload.perfil)
      headers.set('x-erp-session-id',   payload.sid)

      if (payload.secretaria) {
        headers.set('x-erp-secretaria', payload.secretaria)
      }
      if (payload.permissoes?.length) {
        headers.set('x-erp-permissoes', encodeURIComponent(JSON.stringify(payload.permissoes)))
      }

      return NextResponse.next({ request: { headers } })
    }
  }

  // ── 2. Access expirado - tentar renovar via refresh ────────────────────────
  if (refreshToken) {
    const refreshPayload = await verificarRefreshToken(refreshToken)

    if (refreshPayload) {
      // Refresh válido: o handler /api/auth/refresh faz a renovação completa.
      // Aqui apenas redirecionamos para que o cliente renove e tente novamente.
      // Para SSR/API routes, retornamos 401 para o cliente tratar.

      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { erro: 'Token expirado', codigo: 'TOKEN_EXPIRED' },
          { status: 401 }
        )
      }

      // Para páginas, redirecionar para refresh silencioso
      const url = request.nextUrl.clone()
      url.pathname = '/api/auth/refresh'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
  }

  // ── 3. Sem token válido - redirecionar para login ──────────────────────────
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { erro: 'Não autenticado', codigo: 'UNAUTHENTICATED' },
      { status: 401 }
    )
  }

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    // Aplicar em todas as rotas exceto assets estáticos
    '/((?!_next/static|_next/image|favicon.ico|logo|icons|images).*)',
  ],
}
