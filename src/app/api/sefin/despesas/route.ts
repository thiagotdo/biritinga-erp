// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { extrairContextoRequest, auditLog } from '@/lib/audit'
import { temPermissao } from '@/lib/auth/rbac'

const FornecedorSchema = z.object({
  nome:      z.string().min(3),
  cnpjCpf:   z.string().min(11).max(18),
  tipo:      z.enum(['FISICA', 'JURIDICA']).default('JURIDICA'),
  email:     z.string().email().optional(),
  telefone:  z.string().optional(),
  endereco:  z.string().optional(),
  banco:     z.string().optional(),
  agencia:   z.string().optional(),
  conta:     z.string().optional(),
})

// POST /api/sefin/despesas - cadastro de fornecedores
export async function POST(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'sefin:fornecedor:create')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const dados = FornecedorSchema.parse(body)

    const existente = await prisma.fornecedor.findFirst({
      where: { municipioId: ctx.municipioId, cnpjCpf: dados.cnpjCpf, ativo: true },
    })
    if (existente) {
      return NextResponse.json({ erro: 'Fornecedor com este CNPJ/CPF já cadastrado', fornecedorId: existente.id }, { status: 409 })
    }

    const fornecedor = await prisma.fornecedor.create({
      data: { municipioId: ctx.municipioId, ...dados, tipo: dados.tipo },
    })

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId: ctx.usuarioId,
      acao: 'CREATE',
      modulo: 'sefin',
      recurso: 'fornecedor',
      registroId: fornecedor.id,
      dadosNovos: { nome: dados.nome, cnpjCpf: dados.cnpjCpf },
    })

    return NextResponse.json({ fornecedor }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[FORNECEDOR]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// GET /api/sefin/despesas - lista fornecedores com totais de empenho
export async function GET(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'sefin:fornecedor:read')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const busca    = searchParams.get('busca')
  const tipo     = searchParams.get('tipo')

  const fornecedores = await prisma.fornecedor.findMany({
    where: {
      municipioId: ctx.municipioId,
      ativo: true,
      ...(tipo && { tipo }),
      ...(busca && {
        OR: [
          { nome:    { contains: busca } },
          { cnpjCpf: { contains: busca.replace(/\D/g, '') } },
        ],
      }),
    },
    include: {
      _count: { select: { empenhos: true } },
      empenhos: {
        select: { valorOriginal: true, valorPago: true, status: true },
        where: { status: { not: 'ANULADO' } },
        take: 1000, // agregação in-memory por cPanel (sem groupBy complexo)
      },
    },
    orderBy: { nome: 'asc' },
    take: 200,
  })

  // Calcular total pago por fornecedor
  const dados = fornecedores.map(f => ({
    id: f.id,
    nome: f.nome,
    cnpjCpf: f.cnpjCpf,
    tipo: f.tipo,
    email: f.email,
    telefone: f.telefone,
    totalEmpenhos: f._count.empenhos,
    totalPago: f.empenhos.reduce((s, e) => s + Number(e.valorPago), 0),
    totalEmpenhadoNaoPago: f.empenhos.filter(e => e.status !== 'PAGO').reduce((s, e) => s + Number(e.valorOriginal), 0),
  }))

  return NextResponse.json({ dados, total: dados.length })
}
