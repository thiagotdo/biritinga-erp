// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo')

  const where: any = { municipioId: usuario.municipioId, ativo: true }
  if (tipo) where.tipo = tipo

  const unidades = await prisma.UnidadeSuas.findMany({
    where, orderBy: { nome: 'asc' },
  })

  return NextResponse.json({ unidades })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    nome:        z.string().min(3),
    tipo:        z.enum(['CRAS','CREAS','CENTRO_POP','CRAM','ABRIGO','OUTRO']),
    codigo:      z.string().optional(),
    logradouro:  z.string().optional(),
    bairro:      z.string().optional(),
    cep:         z.string().optional(),
    telefone:    z.string().optional(),
    responsavel: z.string().optional(),
    territorioCoberto: z.string().optional(),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })

  const unidade = await prisma.UnidadeSuas.create({
    data: { id: randomUUID(), municipioId: usuario.municipioId, criadoEm: new Date(), atualizadoEm: new Date(), ...val.data },
  })

  return NextResponse.json({ unidade }, { status: 201 })
}
