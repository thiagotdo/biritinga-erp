/**
 * POST /api/setup/set-brasao
 * Atualiza brasaoUrl e logoUrl do município no banco de dados.
 * Header: Authorization: Bearer <SETUP_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const SETUP_TOKEN = process.env.SETUP_SECRET ?? ''

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (!SETUP_TOKEN || auth !== `Bearer ${SETUP_TOKEN}`) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erp.biritinga.ba.gov.br'
    const brasaoUrl = body.brasaoUrl ?? `${appUrl}/brasao.png`

    // Atualizar município (pega o primeiro ativo)
    const mun = await prisma.Municipio.findFirst({ where: { ativo: true } })
    if (!mun) return NextResponse.json({ erro: 'Município não encontrado' }, { status: 404 })

    await prisma.Municipio.update({
      where: { id: mun.id },
      data: {
        brasaoUrl,
        logoUrl: brasaoUrl, // usar o mesmo brasão como logo
      },
    })

    return NextResponse.json({
      ok: true,
      brasaoUrl,
      municipio: mun.nome,
    })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
