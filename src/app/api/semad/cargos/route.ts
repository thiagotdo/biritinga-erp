import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { extrairContextoRequest, auditLog } from '@/lib/audit'
import { temPermissao } from '@/lib/auth/rbac'

const CargoSchema = z.object({
  nome:          z.string().min(2),
  simbolo:       z.string().optional(),
  descricao:     z.string().optional(),
  nivelSalarial: z.string().optional(),
  salarioBase:   z.number().positive().optional(),
  cargaHoraria:  z.number().int().min(1).max(44).default(40),
  requerConcurso:z.boolean().default(true),
  comissionado:  z.boolean().default(false),
})

// POST /api/semad/cargos
export async function POST(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'semad:cargo:create')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const dados = CargoSchema.parse(body)

    const existente = await prisma.cargo.findFirst({
      where: { municipioId: ctx.municipioId, nome: dados.nome, ativo: true },
    })
    if (existente) {
      return NextResponse.json({ erro: 'Cargo já cadastrado com este nome' }, { status: 409 })
    }

    const cargo = await prisma.cargo.create({
      data: { municipioId: ctx.municipioId, ...dados },
    })

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId: ctx.usuarioId,
      acao: 'CREATE',
      modulo: 'semad',
      recurso: 'cargo',
      registroId: cargo.id,
      dadosNovos: { nome: dados.nome, simbolo: dados.simbolo },
    })

    return NextResponse.json({ cargo }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[CARGO]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// GET /api/semad/cargos
export async function GET(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'semad:cargo:read')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const cargos = await prisma.cargo.findMany({
    where: { municipioId: ctx.municipioId, ativo: true },
    include: { _count: { select: { servidores: true } } },
    orderBy: { nome: 'asc' },
  })

  return NextResponse.json({ dados: cargos, total: cargos.length })
}
