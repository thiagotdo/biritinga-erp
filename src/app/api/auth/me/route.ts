import { NextRequest, NextResponse } from 'next/server'
import { obterUsuario } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const usuario = await obterUsuario(req)
    if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ usuario })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
