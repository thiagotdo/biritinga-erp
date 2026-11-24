// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const usuario = await obterUsuario(req)
    if (!usuario) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    const mId = usuario.municipioId

    const [noticias, eventos, usuarios, demandas] = await Promise.all([
      prisma.Noticia.count({ where: { municipioId: mId, ativo: true } }).catch(() => 0),
      prisma.EventoAgenda.count({ where: { municipioId: mId, ativo: true } }).catch(() => 0),
      prisma.Usuario.count({ where: { municipioId: mId, ativo: true } }).catch(() => 0),
      // Ouvidoria - tabela pode ou não existir
      prisma.$queryRaw`SELECT COUNT(*) as c FROM OuvidoriaDemanda WHERE municipioId = ${mId}`.then((r: any) => Number(r[0]?.c ?? 0)).catch(() => 0),
    ])

    return NextResponse.json({ noticias, eventos, usuarios, demandas })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
