// ─── RBAC - Role-Based Access Control ────────────────────────────────────────
// Hierarquia: SUPER_ADMIN > ADMIN_MUNICIPIO > GESTOR > OPERADOR > VISUALIZADOR
//
// Formato de permissão: "módulo:recurso:ação"
// Wildcards suportados: "semad:*" (todo o módulo), "*" (tudo)
// Exemplo: "semob:obra:create", "pgm:processo:read", "sefin:empenho:aprovar"

import type { ContextoRequest, PerfilPadrao, Permissao } from '@/types'
import { PERMISSOES_PADRAO } from '@/types'
import { NextRequest } from 'next/server'
import { verificarAccessToken } from './auth/jwt'
import { COOKIE_ACCESS } from './auth/jwt'

// ─── Verificar se um contexto tem uma permissão ───────────────────────────────

export function temPermissao(ctx: ContextoRequest, permissao: Permissao): boolean {
  // SUPER_ADMIN sempre passa
  if (ctx.perfil === 'SUPER_ADMIN') return true

  // Checar permissões do perfil padrão
  const permissoesPadrao = PERMISSOES_PADRAO[ctx.perfil] ?? []
  if (matchPermissao(permissoesPadrao, permissao)) return true

  // Checar permissões extras do perfil customizado
  if (ctx.permissoes && matchPermissao(ctx.permissoes, permissao)) return true

  return false
}

// ─── Matching com wildcards ───────────────────────────────────────────────────

function matchPermissao(lista: string[], alvo: string): boolean {
  for (const perm of lista) {
    if (perm === '*') return true                // acesso total
    if (perm === alvo) return true               // match exato
    if (matchWildcard(perm, alvo)) return true   // wildcard
  }
  return false
}

function matchWildcard(pattern: string, alvo: string): boolean {
  // "semad:*"       → qualquer recurso/ação do semad
  // "semad:obra:*"  → qualquer ação sobre obra no semad
  const partePattern = pattern.split(':')
  const parteAlvo    = alvo.split(':')

  for (let i = 0; i < partePattern.length; i++) {
    if (partePattern[i] === '*') return true     // wildcard no meio/fim
    if (partePattern[i] !== parteAlvo[i]) return false
  }
  return partePattern.length === parteAlvo.length
}

// ─── Extrair contexto dos headers (vindo do middleware) ───────────────────────
// O middleware injeta o payload do JWT como headers X-ERP-*

export function extrairContextoRequest(headers: Headers): ContextoRequest {
  const permissoesRaw = headers.get('x-erp-permissoes')

  return {
    usuarioId:   headers.get('x-erp-usuario-id')   ?? '',
    municipioId: headers.get('x-erp-municipio-id') ?? '',
    nome:        headers.get('x-erp-nome')          ?? '',
    email:       headers.get('x-erp-email')         ?? '',
    perfil:      (headers.get('x-erp-perfil') ?? 'OPERADOR') as PerfilPadrao,
    secretaria:  headers.get('x-erp-secretaria')    ?? undefined,
    permissoes:  permissoesRaw ? JSON.parse(decodeURIComponent(permissoesRaw)) : [],
    ip:          headers.get('x-forwarded-for')     ?? undefined,
    sessionId:   headers.get('x-erp-session-id')   ?? undefined,
  }
}

// ─── Verificar token direto no handler (fallback sem middleware) ───────────────
// Use em rotas que não passam pelo middleware (ex: API pública)

export async function autenticarRequest(request: NextRequest): Promise<ContextoRequest | null> {
  // Tentar cookie primeiro, depois Authorization header
  const tokenCookie = request.cookies.get(COOKIE_ACCESS)?.value
  const tokenHeader = request.headers.get('authorization')?.replace('Bearer ', '')
  const token = tokenCookie ?? tokenHeader

  if (!token) return null

  const payload = await verificarAccessToken(token)
  if (!payload) return null

  return {
    usuarioId:   payload.sub,
    municipioId: payload.mid,
    nome:        payload.nome,
    email:       payload.email,
    perfil:      payload.perfil,
    secretaria:  payload.secretaria,
    permissoes:  payload.permissoes ?? [],
    sessionId:   payload.sid,
  }
}

// ─── Helper para verificar múltiplas permissões de uma vez ────────────────────

export function temTodasPermissoes(ctx: ContextoRequest, permissoes: Permissao[]): boolean {
  return permissoes.every(p => temPermissao(ctx, p))
}

export function temAlgumaPermissao(ctx: ContextoRequest, permissoes: Permissao[]): boolean {
  return permissoes.some(p => temPermissao(ctx, p))
}
