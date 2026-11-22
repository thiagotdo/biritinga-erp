import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { handleRefresh } from '@/lib/auth/api-login'

export const runtime = 'nodejs'

// GET - chamado pelo middleware para renovação silenciosa em redirecionamento
export async function GET(request: NextRequest) {
  const result = await handleRefresh(request)

  // Se renovou com sucesso e há parâmetro redirect, redirecionar de volta
  if (result.status === 200) {
    const redirect = request.nextUrl.searchParams.get('redirect') ?? '/'
    // Copiar os cookies de volta para o redirect
    const redirectResponse = NextResponse.redirect(new URL(redirect, request.url))
    result.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  return result
}

// POST - chamado pelo cliente JS para renovação silenciosa sem redirect
export async function POST(request: NextRequest) {
  return handleRefresh(request)
}
