import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id    = searchParams.get('id')
  const busca = searchParams.get('busca')

  if (id) {
    const f = await prisma.fornecedor.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        propostas: {
          select: { id: true, valorTotal: true, situacao: true, processo: { select: { numero: true, objeto: true } } },
          orderBy: { criadoEm: 'desc' }, take: 10,
        },
        contratos: {
          select: { id: true, numero: true, valorAtual: true, situacao: true },
          orderBy: { criadoEm: 'desc' }, take: 5,
        },
      },
    })
    if (!f) return NextResponse.json({ erro: 'Fornecedor não encontrado' }, { status: 404 })
    return NextResponse.json({ fornecedor: f })
  }

  const where: any = { municipioId: usuario.municipioId, ativo: true }
  if (busca) {
    where.OR = [
      { razaoSocial:  { contains: busca } },
      { nomeFantasia: { contains: busca } },
      { cnpjCpf:      { contains: busca } },
    ]
  }

  const fornecedores = await prisma.fornecedor.findMany({
    where, orderBy: { razaoSocial: 'asc' }, take: 200,
    include: { _count: { select: { propostas: true, contratos: true } } },
  })

  // Certidões vencidas
  const hoje = new Date()
  const comAlerta = fornecedores.map(f => ({
    ...f,
    certidaoVencida: (f.dataValidadeCnd && new Date(f.dataValidadeCnd) < hoje) ||
      (f.dataValidadeFGTS && new Date(f.dataValidadeFGTS) < hoje) ||
      (f.dataValidadeTrabalhista && new Date(f.dataValidadeTrabalhista) < hoje),
  }))

  return NextResponse.json({ fornecedores: comAlerta, total: comAlerta.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    razaoSocial:  z.string().min(3),
    nomeFantasia: z.string().optional(),
    cnpjCpf:      z.string().min(11).max(14),
    tipoPessoa:   z.enum(['PJ','PF']).default('PJ'),
    email:        z.string().email().optional(),
    telefone:     z.string().optional(),
    cep:          z.string().optional(),
    logradouro:   z.string().optional(),
    numero:       z.string().optional(),
    bairro:       z.string().optional(),
    cidade:       z.string().optional(),
    uf:           z.string().length(2).optional(),
    dataValidadeCnd: z.string().optional(),
    dataValidadeFGTS: z.string().optional(),
    dataValidadeTrabalhista: z.string().optional(),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const existente = await prisma.fornecedor.findFirst({
    where: { municipioId: usuario.municipioId, cnpjCpf: d.cnpjCpf },
  })
  if (existente) return NextResponse.json({ erro: `${d.tipoPessoa === 'PJ' ? 'CNPJ' : 'CPF'} já cadastrado` }, { status: 409 })

  const fornecedor = await prisma.fornecedor.create({
    data: {
      municipioId:  usuario.municipioId,
      razaoSocial:  d.razaoSocial,
      nomeFantasia: d.nomeFantasia,
      cnpjCpf:      d.cnpjCpf.replace(/\D/g, ''),
      tipoPessoa:   d.tipoPessoa,
      email:        d.email,
      telefone:     d.telefone,
      cep:          d.cep,
      logradouro:   d.logradouro,
      numero:       d.numero,
      bairro:       d.bairro,
      cidade:       d.cidade,
      uf:           d.uf,
      dataValidadeCnd: d.dataValidadeCnd ? new Date(d.dataValidadeCnd) : undefined,
      dataValidadeFGTS: d.dataValidadeFGTS ? new Date(d.dataValidadeFGTS) : undefined,
      dataValidadeTrabalhista: d.dataValidadeTrabalhista ? new Date(d.dataValidadeTrabalhista) : undefined,
    },
  })

  return NextResponse.json({ fornecedor }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, ...campos } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const atualizaveis = ['razaoSocial','nomeFantasia','email','telefone','cep','logradouro',
    'numero','bairro','cidade','uf','regularFiscal',
    'dataValidadeCnd','dataValidadeFGTS','dataValidadeTrabalhista','ativo']

  const data: any = {}
  for (const c of atualizaveis) {
    if (campos[c] !== undefined) {
      data[c] = c.startsWith('dataValidade') && campos[c] ? new Date(campos[c]) : campos[c]
    }
  }

  const atualizado = await prisma.fornecedor.update({ where: { id }, data })
  return NextResponse.json({ fornecedor: atualizado })
}
