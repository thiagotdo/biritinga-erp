import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// LGPD Art. 14 — Dados de menores de idade: tratamento permitido com
// consentimento específico do responsável legal.

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id      = searchParams.get('id')
  const busca   = searchParams.get('busca')
  const pcd     = searchParams.get('pcd')
  const bolsa   = searchParams.get('bolsaFamilia')

  if (id) {
    const aluno = await prisma.aluno.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        matriculas: {
          include: {
            turma: {
              include: { escola: { select: { nome: true } } },
            },
          },
          orderBy: { anoLetivo: 'desc' },
        },
      },
    })
    if (!aluno) return NextResponse.json({ erro: 'Aluno não encontrado' }, { status: 404 })
    return NextResponse.json({ aluno })
  }

  const where: any = { municipioId: usuario.municipioId, ativo: true }
  if (pcd === '1')   where.pcd          = true
  if (bolsa === '1') where.bolsaFamilia = true

  if (busca) {
    // Busca por nome, CPF ou NIS (strips não-dígitos para CPF/NIS)
    const termo = busca.replace(/\D/g, '')
    where.OR = [
      { nome: { contains: busca } },
      ...(termo.length >= 6 ? [{ cpf: { contains: termo } }, { nis: { contains: termo } }] : []),
    ]
  }

  const alunos = await prisma.aluno.findMany({
    where, orderBy: { nome: 'asc' }, take: 200,
    select: {
      id: true, nome: true, cpf: true, nis: true,
      dataNascimento: true, sexo: true,
      pcd: true, bolsaFamilia: true, situacao: true,
      responsavelNome: true, responsavelTelefone: true,
    },
  })

  return NextResponse.json({ alunos, total: alunos.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    nome:                z.string().min(3),
    nomeMae:             z.string().optional(),
    nomePai:             z.string().optional(),
    cpf:                 z.string().optional(),
    nis:                 z.string().optional(),
    dataNascimento:      z.string().optional(),
    sexo:                z.enum(['M','F']).optional(),
    racaCor:             z.string().optional(),
    logradouro:          z.string().optional(),
    numero:              z.string().optional(),
    bairro:              z.string().optional(),
    cep:                 z.string().optional(),
    responsavelNome:     z.string().optional(),
    responsavelTelefone: z.string().optional(),
    responsavelEmail:    z.string().email().optional().or(z.literal('')),
    responsavelCpf:      z.string().optional(),
    bolsaFamilia:        z.boolean().default(false),
    pcd:                 z.boolean().default(false),
    laudoPcd:            z.string().optional(),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  // CPF único por município (se informado)
  if (d.cpf) {
    const cpfLimpo = d.cpf.replace(/\D/g, '')
    const existe = await prisma.aluno.findFirst({
      where: { municipioId: usuario.municipioId, cpf: cpfLimpo },
    })
    if (existe) {
      return NextResponse.json({ erro: 'CPF já cadastrado', alunoId: existe.id }, { status: 409 })
    }
    d.cpf = cpfLimpo
  }

  if (d.nis) d.nis = d.nis.replace(/\D/g, '')

  const aluno = await prisma.aluno.create({
    data: {
      municipioId: usuario.municipioId,
      ...d,
      dataNascimento: d.dataNascimento ? new Date(d.dataNascimento) : undefined,
    },
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'CADASTRAR_ALUNO', entidade: 'Aluno', entidadeId: aluno.id,
    detalhes: { nome: aluno.nome, pcd: aluno.pcd, bolsaFamilia: aluno.bolsaFamilia },
  })

  return NextResponse.json({ aluno }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, ...dados } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const aluno = await prisma.aluno.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!aluno) return NextResponse.json({ erro: 'Aluno não encontrado' }, { status: 404 })

  if (dados.cpf) dados.cpf = dados.cpf.replace(/\D/g, '')
  if (dados.nis) dados.nis = dados.nis.replace(/\D/g, '')
  if (dados.dataNascimento) dados.dataNascimento = new Date(dados.dataNascimento)

  const atualizado = await prisma.aluno.update({ where: { id }, data: dados })
  return NextResponse.json({ aluno: atualizado })
}
