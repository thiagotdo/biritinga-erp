import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Estabelecimentos de Saúde + Profissionais ────────────────────────────────
// CNES — Cadastro Nacional de Estabelecimentos de Saúde (referência nacional)
// Portaria GM/MS 2.436/2017 — PNAB: estrutura e funcionamento das UBS

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id      = searchParams.get('id')
  const tipo    = searchParams.get('tipo')       // profissional ou estabelecimento
  const recurso = searchParams.get('recurso')    // 'profissionais' ou 'estabelecimentos'

  if (recurso === 'profissionais') {
    const profissionais = await prisma.profissionalSaude.findMany({
      where: { municipioId: usuario.municipioId, ativo: true },
      orderBy: { nomeCompleto: 'asc' },
      include: { estabelecimento: { select: { nome: true } } },
    })
    return NextResponse.json({ profissionais })
  }

  // Estabelecimentos
  const where: any = { municipioId: usuario.municipioId, ativo: true }
  if (tipo) where.tipo = tipo

  const estabelecimentos = await prisma.estabelecimentoSaude.findMany({
    where, orderBy: { nome: 'asc' },
    include: {
      _count: { select: { profissionais: true, atendimentos: true } },
    },
  })

  return NextResponse.json({ estabelecimentos })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const body = await req.json()

  // Despacha por tipo de recurso
  if (body._recurso === 'PROFISSIONAL') {
    const Schema = z.object({
      nomeCompleto:    z.string().min(3),
      cpf:             z.string().optional(),
      cbo:             z.string().optional(),
      conselhoClasse:  z.string().optional(),
      numeroConselho:  z.string().optional(),
      especialidade:   z.string().default('CLINICA_GERAL'),
      estabelecimentoId: z.string().optional(),
      cargaHoraria:    z.number().optional(),
    })
    const val = Schema.safeParse(body)
    if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })

    if (val.data.cpf) {
      const cpfLimpo = val.data.cpf.replace(/\D/g,'')
      const ex = await prisma.profissionalSaude.findFirst({ where: { municipioId: usuario.municipioId, cpf: cpfLimpo } })
      if (ex) return NextResponse.json({ erro: `CPF já cadastrado: ${ex.nomeCompleto}` }, { status: 409 })
      val.data.cpf = cpfLimpo
    }

    const prof = await prisma.profissionalSaude.create({
      data: { municipioId: usuario.municipioId, ...val.data, especialidade: val.data.especialidade as any },
    })
    return NextResponse.json({ profissional: prof }, { status: 201 })
  }

  // Estabelecimento
  const Schema = z.object({
    nome:              z.string().min(2),
    tipo:              z.string(),
    cnes:              z.string().optional(),
    logradouro:        z.string().optional(),
    bairro:            z.string().optional(),
    telefone:          z.string().optional(),
    responsavelTecnico: z.string().optional(),
  })
  const val = Schema.safeParse(body)
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })

  if (val.data.cnes) {
    const ex = await prisma.estabelecimentoSaude.findFirst({ where: { municipioId: usuario.municipioId, cnes: val.data.cnes } })
    if (ex) return NextResponse.json({ erro: `CNES já cadastrado: ${ex.nome}` }, { status: 409 })
  }

  const estab = await prisma.estabelecimentoSaude.create({
    data: { municipioId: usuario.municipioId, ...val.data, tipo: val.data.tipo as any },
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'CRIAR_ESTABELECIMENTO_SAUDE', entidade: 'EstabelecimentoSaude', entidadeId: estab.id,
    detalhes: { nome: val.data.nome, tipo: val.data.tipo },
  })

  return NextResponse.json({ estabelecimento: estab }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, _recurso, ...dados } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  if (_recurso === 'PROFISSIONAL') {
    await prisma.profissionalSaude.update({ where: { id }, data: dados })
  } else {
    await prisma.estabelecimentoSaude.update({ where: { id }, data: { ...dados, situacao: dados.situacao as any } })
  }

  return NextResponse.json({ sucesso: true })
}
