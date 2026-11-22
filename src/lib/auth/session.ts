// ─── Gestão de sessões (criar, renovar, revogar) ─────────────────────────────

import { prisma } from '@/lib/db'
import { gerarAccessToken, gerarRefreshToken, verificarRefreshToken } from './jwt'
import { randomBytes, createHash } from 'crypto'
import type { PerfilPadrao } from '@/types'

// Gerar ID aleatório de sessão
function gerarSessionId(): string {
  return randomBytes(32).toString('hex')
}

// Hash do refresh token para armazenar no banco (nunca armazenar raw)
function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

interface CriarSessaoParams {
  usuarioId:   string
  municipioId: string
  nome:        string
  email:       string
  perfil:      PerfilPadrao
  secretaria?: string
  permissoes:  string[]
  ip?:         string
  userAgent?:  string
}

// ─── Criar nova sessão (login) ────────────────────────────────────────────────

export async function criarSessao(params: CriarSessaoParams) {
  const sessionId = gerarSessionId()

  const [accessToken, refreshToken] = await Promise.all([
    gerarAccessToken({
      sub:        params.usuarioId,
      mid:        params.municipioId,
      nome:       params.nome,
      email:      params.email,
      perfil:     params.perfil,
      secretaria: params.secretaria,
      permissoes: params.permissoes,
      sid:        sessionId,
    }),
    gerarRefreshToken({
      sub: params.usuarioId,
      sid: sessionId,
      mid: params.municipioId,
    }),
  ])

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.Sessao.create({
    data: {
      id:           sessionId,
      municipioId:  params.municipioId,
      usuarioId:    params.usuarioId,
      refreshToken: hashRefreshToken(refreshToken),
      userAgent:    params.userAgent,
      ip:           params.ip,
      expiresAt,
    },
  })

  // Atualizar ultimoLogin e zerar tentativas
  await prisma.Usuario.update({
    where: { id: params.usuarioId },
    data:  { ultimoLogin: new Date(), tentativasFalhas: 0, bloqueadoAte: null },
  })

  return { accessToken, refreshToken, sessionId }
}

// ─── Renovar sessão (refresh) ─────────────────────────────────────────────────

export async function renovarSessao(refreshToken: string, ip?: string) {
  const payload = await verificarRefreshToken(refreshToken)
  if (!payload) return null

  const sessao = await prisma.Sessao.findUnique({ where: { id: payload.sid } })
  if (!sessao || sessao.revokedAt || sessao.expiresAt < new Date()) return null

  // Verificar que o hash bate
  if (sessao.refreshToken !== hashRefreshToken(refreshToken)) return null

  const [usuario] = await prisma.$queryRaw`
    SELECT u.*, p.permissoes AS perfilCustomPermissoes
    FROM Usuario u
    LEFT JOIN PerfilCustom p ON p.id = u.perfilId
    WHERE u.id = ${payload.sub} LIMIT 1
  ` as any[]
  if (!usuario || !usuario.ativo) return null

  const permissoes: string[] = usuario.perfilCustomPermissoes
    ? JSON.parse(usuario.perfilCustomPermissoes)
    : []

  // Revogar sessão antiga e criar nova (rotation)
  await prisma.Sessao.update({
    where: { id: payload.sid },
    data:  { revokedAt: new Date() },
  })

  return criarSessao({
    usuarioId:   usuario.id,
    municipioId: usuario.municipioId,
    nome:        usuario.nome,
    email:       usuario.email,
    perfil:      usuario.perfil as PerfilPadrao,
    secretaria:  usuario.secretaria ?? undefined,
    permissoes,
    ip,
    userAgent:   sessao.userAgent ?? undefined,
  })
}

// ─── Revogar sessão (logout) ──────────────────────────────────────────────────

export async function revogarSessao(sessionId: string): Promise<void> {
  await prisma.Sessao.updateMany({
    where: { id: sessionId, revokedAt: null },
    data:  { revokedAt: new Date() },
  })
}

// ─── Revogar todas as sessões do usuário ──────────────────────────────────────

export async function revogarTodasSessoes(usuarioId: string): Promise<void> {
  await prisma.Sessao.updateMany({
    where: { usuarioId, revokedAt: null },
    data:  { revokedAt: new Date() },
  })
}

// ─── Bloquear usuário após tentativas falhas ──────────────────────────────────

const MAX_TENTATIVAS   = 5
const BLOQUEIO_MINUTOS = 30

export async function registrarTentativaFalha(usuarioId: string): Promise<{ bloqueado: boolean; tentativas: number }> {
  const usuario = await prisma.Usuario.update({
    where: { id: usuarioId },
    data:  { tentativasFalhas: { increment: 1 } },
  })

  if (usuario.tentativasFalhas >= MAX_TENTATIVAS) {
    const bloqueadoAte = new Date(Date.now() + BLOQUEIO_MINUTOS * 60 * 1000)
    await prisma.Usuario.update({
      where: { id: usuarioId },
      data:  { bloqueadoAte },
    })
    return { bloqueado: true, tentativas: usuario.tentativasFalhas }
  }

  return { bloqueado: false, tentativas: usuario.tentativasFalhas }
}
