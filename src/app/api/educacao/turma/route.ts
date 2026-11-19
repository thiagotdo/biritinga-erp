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
  const id        = searchParams.get('id')
  const escolaId  = searchParams.get('escolaId')
  const anoLetivo = searchParams.get('anoLetivo')
  const turno     = searchParams.get('turno')

  if (id) {
    const turma = await prisma.turma.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        escola: { select: { nome: true } },
        matriculas: {
          where: { situacao: 'ATIVA' },
          include: {
            aluno: { select: { nome: true, pcd: true, bolsaFamilia: true } },
          },
          orderBy: { aluno: { nome: 'asc' } },
        },
        _count: {
          select: {
            matriculas: { where: { situacao: 'ATIVA' } },
            aulas: true,
          },
        },
      },
    })
    if (!turma) return NextResponse.json({ erro: 'Turma não encontrada' }, { status: 404 })
    return NextResponse.json({ turma })
  }

  const where: any = { municipioId: usuario.municipioId, ativo: true }
  if (escolaId)   where.escolaId  = escolaId
  if (anoLetivo)  where.anoLetivo = Number(anoLetivo)
  if (turno)      where.turno     = turno

  const turmas = await prisma.turma.findMany({
    where,
    orderBy: [{ serie: 'asc' }, { turma: 'asc' }],
    include: {
      escola: { select: { nome: true } },
      _count: {
        select: { matriculas: { where: { situacao: 'ATIVA' } } },
      },
    },
  })

  // Enriquecer com vagas disponíveis
  const enriched = turmas.map(t => ({
    ...t,
    vagasDisponiveis: t.capacidade - t._count.matriculas,
    lotado: t._count.matriculas >= t.capacidade,
  }))

  return NextResponse.json({ turmas: enriched, total: turmas.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    escolaId:      z.string(),
    serie:         z.string().min(1),  // "1", "2"…"9", "EJA-I"
    segmento:      z.string().default('EF1'),  // "EF1", "EF2", "EI", "EJA"
    turma:         z.string().min(1),  // "A", "B", "C"
    turno:         z.enum(['MATUTINO','VESPERTINO','NOTURNO','INTEGRAL']),
    anoLetivo:     z.number().int().default(new Date().getFullYear()),
    professorNome: z.string().optional(),
    professorEmail: z.string().email().optional().or(z.literal('')),
    capacidade:    z.number().int().min(1).max(60).default(30),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  // Verificar escola pertence ao município
  const escola = await prisma.escola.findFirst({
    where: { id: d.escolaId, municipioId: usuario.municipioId },
  })
  if (!escola) return NextResponse.json({ erro: 'Escola não encontrada' }, { status: 404 })

  // Verificar unicidade
  const existente = await prisma.turma.findFirst({
    where: {
      municipioId: usuario.municipioId,
      escolaId: d.escolaId, serie: d.serie,
      turma: d.turma, turno: d.turno, anoLetivo: d.anoLetivo,
    },
  })
  if (existente) {
    return NextResponse.json({ erro: 'Turma já existe para este período e escola', turmaId: existente.id }, { status: 409 })
  }

  const turmaCreated = await prisma.turma.create({
    data: { municipioId: usuario.municipioId, ...d },
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'CRIAR_TURMA', entidade: 'Turma', entidadeId: turmaCreated.id,
    detalhes: { escola: escola.nome, serie: d.serie, turma: d.turma, anoLetivo: d.anoLetivo },
  })

  return NextResponse.json({ turma: turmaCreated }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, ...dados } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const turma = await prisma.turma.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!turma) return NextResponse.json({ erro: 'Turma não encontrada' }, { status: 404 })

  const atualizada = await prisma.turma.update({ where: { id }, data: dados })
  return NextResponse.json({ turma: atualizada })
}
