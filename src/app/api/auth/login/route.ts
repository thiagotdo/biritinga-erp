import type { NextRequest } from 'next/server'
import { handleLogin } from '@/lib/auth/api-login'

export const runtime = 'nodejs' // bcryptjs requer nodejs runtime

export async function POST(request: NextRequest) {
  return handleLogin(request)
}
