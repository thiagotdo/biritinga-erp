// ─── Handler de login (POST /api/auth/login) ─────────────────────────────────
// Exportado como função para ser usado no route handler do projeto

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verificarSenha } from './senha'
import { criarSessao, registrarTentativaFalha } from './session'
import { auditLog } from '@/lib/audit'
import { COOKIE_ACCESS, COOKIE_REFRESH, cookieOptions, ACCESS_MAX_AGE, REFRESH_MAX_AGE } from './jwt'
import type { PerfilPadrao } from '@/types'

const LoginSchema = z.object({
  email:      z.string().email(),
  senha:      z.string().min(1),
  municipioId:z.string().optional(),   // se multi-tenant via body
})

export async function handleLogin(request: NextRequest) {
  try {
    const body = await request.json()
    const dados = LoginSchema.parse(body)

    const ip        = request.headers.get('x-forwarded-for') ?? request.ip
    const userAgent = request.headers.get('user-agent') ?? undefined

    // Buscar município pelo header Host se não vier no body
    let municipioId = dados.municipioId
    if (!municipioId) {
      const host = request.headers.get('host') ?? ''
      // Tenta slug (primeiro segmento do host)
      const slug = host.split('.')[0]
      // Tenta também pelo domínio completo (sem porta)
      const dominio = host.split(':')[0]
      const mun = await prisma.municipio.findFirst({
        where: {
          OR: [
            { slug, ativo: true },
            { dominio, ativo: true },
          ],
        },
      })
      if (!mun) {
        // Fallback: se só há um município, usa ele
        const total = await prisma.municipio.count()
        if (total === 1) {
          const unico = await prisma.municipio.findFirst({ where: { ativo: true } })
          if (unico) {
            municipioId = unico.id
          } else {
            return NextResponse.json({ erro: 'Município não encontrado' }, { status: 404 })
          }
        } else {
          return NextResponse.json({ erro: 'Município não encontrado' }, { status: 404 })
        }
      } else {
        municipioId = mun.id
      }
    }

    // Buscar usuário
    const usuario = await prisma.usuario.findFirst({
      where: { municipioId, email: dados.email, ativo: true },
      include: { perfilCustom: true },
    })

    if (!usuario) {
      return NextResponse.json(
        { erro: 'Email ou senha incorretos' },
        { status: 401 }
      )
    }

    // Verificar bloqueio
    if (usuario.bloqueadoAte && usuario.bloqueadoAte > new Date()) {
      const minutos = Math.ceil((usuario.bloqueadoAte.getTime() - Date.now()) / 60000)
      return NextResponse.json(
        { erro: `Conta bloqueada por ${minutos} minutos. Tente novamente mais tarde.`, codigo: 'CONTA_BLOQUEADA' },
        { status: 429 }
      )
    }

    // Verificar senha
    const senhaValida = await verificarSenha(dados.senha, usuario.senhaHash)
    if (!senhaValida) {
      await registrarTentativaFalha(usuario.id)
      return NextResponse.json(
        { erro: 'Email ou senha incorretos' },
        { status: 401 }
      )
    }

    // Coletar permissões extras do perfil customizado
    const permissoes: string[] = usuario.perfilCustom
      ? JSON.parse(usuario.perfilCustom.permissoes)
      : []

    // Criar sessão
    const { accessToken, refreshToken } = await criarSessao({
      usuarioId:   usuario.id,
      municipioId: usuario.municipioId,
      nome:        usuario.nome,
      email:       usuario.email,
      perfil:      usuario.perfil as PerfilPadrao,
      secretaria:  usuario.secretaria ?? undefined,
      permissoes,
      ip:          ip ?? undefined,
      userAgent,
    })

    // Audit
    await auditLog({
      municipioId: usuario.municipioId,
      usuarioId:   usuario.id,
      acao: 'LOGIN', modulo: 'auth', recurso: 'sessao',
      dadosNovos: { email: usuario.email, ip },
    })

    // Montar resposta com cookies HttpOnly
    const response = NextResponse.json({
      usuario: {
        id:        usuario.id,
        nome:      usuario.nome,
        email:     usuario.email,
        perfil:    usuario.perfil,
        secretaria:usuario.secretaria,
        avatarUrl: usuario.avatarUrl,
      },
    })

    response.cookies.set(COOKIE_ACCESS,  accessToken,  cookieOptions(ACCESS_MAX_AGE))
    response.cookies.set(COOKIE_REFRESH, refreshToken, cookieOptions(REFRESH_MAX_AGE))

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[LOGIN]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// ─── Handler de logout ────────────────────────────────────────────────────────

export async function handleLogout(request: NextRequest) {
  const sessionId = request.headers.get('x-erp-session-id')

  if (sessionId) {
    const { revogarSessao } = await import('./session')
    await revogarSessao(sessionId)
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.delete(COOKIE_ACCESS)
  response.cookies.delete(COOKIE_REFRESH)
  return response
}

// ─── Handler de refresh ───────────────────────────────────────────────────────

export async function handleRefresh(request: NextRequest) {
  const { COOKIE_REFRESH: RT } = await import('./jwt')
  const refreshToken = request.cookies.get(RT)?.value

  if (!refreshToken) {
    return NextResponse.json({ erro: 'Sem refresh token' }, { status: 401 })
  }

  const { renovarSessao } = await import('./session')
  const resultado = await renovarSessao(
    refreshToken,
    request.headers.get('x-forwarded-for') ?? undefined
  )

  if (!resultado) {
    const res = NextResponse.json({ erro: 'Sessão inválida ou expirada' }, { status: 401 })
    res.cookies.delete(COOKIE_ACCESS)
    res.cookies.delete(COOKIE_REFRESH)
    return res
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_ACCESS,  resultado.accessToken,  cookieOptions(ACCESS_MAX_AGE))
  response.cookies.set(COOKIE_REFRESH, resultado.refreshToken, cookieOptions(REFRESH_MAX_AGE))
  return response
}
