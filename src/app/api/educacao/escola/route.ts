import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id   = searchParams.get('id')
  const tipo = searchParams.get('tipo')

  if (id) {
    const escola = await prisma.escola.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        turmas: {
          where: { ativo: true },
          include: {
            _count: { select: { matriculas: { where: { situacao: 'ATIVA' } } } },
          },
          orderBy: [{ anoLetivo: 'desc' }, { serie: 'asc' }, { turma: 'asc' }],
        },
      },
    })
    if (!escola) return NextResponse.json({ erro: 'Escola não encontrada' }, { status: 404 })
    return NextResponse.json({ escola })
  }

  const where: any = { municipioId: usuario.municipioId, ativo: true }
  if (tipo) where.tipo = tipo

  const escolas = await prisma.escola.findMany({
    where, orderBy: { nome: 'asc' },
    include: {
      _count: {
        select: {
          turmas: { where: { ativo: true } },
        },
      },
    },
  })

  return NextResponse.json({ escolas, total: escolas.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    nome:        z.string().min(3),
    tipo:        z.enum(['CRECHE','PRE_ESCOLA','ENSINO_FUNDAMENTAL_I','ENSINO_FUNDAMENTAL_II','EJA','INTEGRAL']),
    inep:        z.string().optional(),
    cnpj:        z.string().optional(),
    diretor:     z.string().optional(),
    logradouro:  z.string().optional(),
    numero:      z.string().optional(),
    bairro:      z.string().optional(),
    cep:         z.string().optional(),
    telefone:    z.string().optional(),
    email:       z.string().email().optional().or(z.literal('')),
    totalSalas:  z.number().int().min(0).default(0),
    capacidade:  z.number().int().min(0).default(0),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  // Código INEP deve ser único por município
  if (d.inep) {
    const existe = await prisma.escola.findFirst({
      where: { municipioId: usuario.municipioId, inep: d.inep },
    })
    if (existe) return NextResponse.json({ erro: 'Código INEP já cadastrado' }, { status: 409 })
  }

  const escola = await prisma.escola.create({
    data: { municipioId: usuario.municipioId, ...d },
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'CADASTRAR_ESCOLA', entidade: 'Escola', entidadeId: escola.id,
    detalhes: { nome: escola.nome, tipo: escola.tipo, inep: escola.inep },
  })

  return NextResponse.json({ escola }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, ...dados } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const escola = await prisma.escola.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!escola) return NextResponse.json({ erro: 'Escola não encontrada' }, { status: 404 })

  const atualizada = await prisma.escola.update({
    where: { id },
    data: dados,
  })

  return NextResponse.json({ escola: atualizada })
}
