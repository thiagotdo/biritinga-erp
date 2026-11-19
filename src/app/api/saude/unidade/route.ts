import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const unidades = await prisma.unidadeSaude.findMany({
    where: { municipioId: usuario.municipioId, ativo: true },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true, tipo: true, cnes: true, bairro: true, telefone: true },
  })
  return NextResponse.json({ unidades })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    nome: z.string().min(3),
    tipo: z.enum(['UBS','UBSF','UPA','CAPS','CEO','POLICLINICA','FARMACIA_BASICA','OUTRO']),
    cnes: z.string().optional(),
    logradouro: z.string().optional(),
    bairro: z.string().optional(),
    telefone: z.string().optional(),
    responsavel: z.string().optional(),
  })
  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })

  const unidade = await prisma.unidadeSaude.create({
    data: { municipioId: usuario.municipioId, ...val.data },
  })
  return NextResponse.json({ unidade }, { status: 201 })
}
