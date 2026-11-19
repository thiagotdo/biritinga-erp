// Helper de autenticação — compatibilidade com todos os módulos
// Todos os route handlers usam: import { obterUsuario } from '@/lib/auth'
import { NextRequest } from 'next/server'
import { autenticarRequest } from './rbac'

export async function obterUsuario(req: NextRequest) {
  return autenticarRequest(req)
}

export { autenticarRequest }
