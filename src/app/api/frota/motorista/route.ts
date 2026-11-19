import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'

export const runtime = 'nodejs'

// ─── Motoristas ───────────────────────────────────────────────────────────────
// CTB Lei 9.503/1997 Art. 143 — categorias CNH
// CNH vencida → motorista não pode ser escalado

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id      = searchParams.get('id')
  const busca   = searchParams.get('busca')
  const situacao = searchParams.get('situacao')

  if (id) {
    const motorista = await prisma.motorista.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        agendamentos: {
          orderBy: { dataSaida: 'desc' }, take: 10,
          select: { id: true, dataSaida: true, destino: true, situacao: true, veiculo: { select: { placa: true, modelo: true } } },
        },
      },
    })
    if (!motorista) return NextResponse.json({ erro: 'Motorista não encontrado' }, { status: 404 })
    return NextResponse.json({ motorista })
  }

  const where: any = { municipioId: usuario.municipioId, ativo: true }
  if (situacao) where.situacao = situacao
  if (busca) {
    where.OR = [
      { nome:      { contains: busca } },
      { cpf:       { contains: busca.replace(/\D/g, '') } },
      { cnh:       { contains: busca } },
      { matricula: { contains: busca } },
    ]
  }

  const motoristas = await prisma.motorista.findMany({
    where, orderBy: { nome: 'asc' }, take: 200,
    select: {
      id: true, nome: true, cpf: true, matricula: true, telefone: true,
      cnh: true, categoriaCnh: true, vencimentoCnh: true,
      situacao: true, secretaria: true,
    },
  })

  // Adiciona flag cnhVencida
  const hoje = new Date()
  const lista = motoristas.map(m => ({
    ...m,
    cnhVencida:  new Date(m.vencimentoCnh) < hoje,
    cnhVencendo: new Date(m.vencimentoCnh) <= new Date(Date.now() + 30 * 86400000),
  }))

  return NextResponse.json({ motoristas: lista, total: lista.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    nome:           z.string().min(3),
    cpf:            z.string().min(11),
    matricula:      z.string().optional(),
    telefone:       z.string().optional(),
    email:          z.string().email().optional().or(z.literal('')),
    cnh:            z.string().min(9),
    categoriaCnh:   z.enum(['A','B','C','D','E','AB','AC','AD','AE']),
    vencimentoCnh:  z.string(),
    dataAdmissao:   z.string().optional(),
    secretaria:     z.string().optional(),
    observacoes:    z.string().optional(),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const cpfNorm = d.cpf.replace(/\D/g, '')

  const existeCpf = await prisma.motorista.findFirst({ where: { municipioId: usuario.municipioId, cpf: cpfNorm, ativo: true } })
  if (existeCpf) return NextResponse.json({ erro: 'CPF já cadastrado' }, { status: 409 })

  const existeCnh = await prisma.motorista.findFirst({ where: { municipioId: usuario.municipioId, cnh: d.cnh, ativo: true } })
  if (existeCnh) return NextResponse.json({ erro: 'CNH já cadastrada' }, { status: 409 })

  const motorista = await prisma.motorista.create({
    data: {
      municipioId: usuario.municipioId,
      ...d,
      cpf:          cpfNorm,
      vencimentoCnh: new Date(d.vencimentoCnh),
      dataAdmissao:  d.dataAdmissao ? new Date(d.dataAdmissao) : undefined,
    },
  })

  return NextResponse.json({ motorista }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, ...dados } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const motorista = await prisma.motorista.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!motorista) return NextResponse.json({ erro: 'Motorista não encontrado' }, { status: 404 })

  const atualizacoes: any = { ...dados }
  if (dados.vencimentoCnh) atualizacoes.vencimentoCnh = new Date(dados.vencimentoCnh)
  if (dados.dataAdmissao)  atualizacoes.dataAdmissao  = new Date(dados.dataAdmissao)
  if (dados.cpf)           atualizacoes.cpf           = dados.cpf.replace(/\D/g, '')

  const atualizado = await prisma.motorista.update({ where: { id }, data: atualizacoes })
  return NextResponse.json({ motorista: atualizado })
}
