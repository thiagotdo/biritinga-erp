import type { NextRequest } from 'next/server'
import { handleLogout } from '@/lib/auth/api-login'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return handleLogout(request)
}
