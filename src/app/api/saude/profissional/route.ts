import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const unidadeId     = searchParams.get('unidadeId')
  const especialidade = searchParams.get('especialidade')

  const where: any = { municipioId: usuario.municipioId, ativo: true }
  if (unidadeId)     where.unidadeId     = unidadeId
  if (especialidade) where.especialidade = especialidade

  const profissionais = await prisma.profissionalSaude.findMany({
    where, orderBy: { nome: 'asc' },
    select: {
      id: true, nome: true, especialidade: true,
      conselho: true, numeroConselho: true,
      duracaoConsulta: true, horarioInicio: true, horarioFim: true,
      unidade: { select: { nome: true } },
    },
  })
  return NextResponse.json({ profissionais })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    nome:           z.string().min(3),
    especialidade:  z.enum(['CLINICO_GERAL','PEDIATRIA','GINECOLOGIA','ODONTOLOGIA','ENFERMAGEM','PSICOLOGIA','FISIOTERAPIA','NUTRICAO','FARMACIA','ASSISTENCIA_SOCIAL','AGENTE_SAUDE','OUTRO']),
    unidadeId:      z.string(),
    conselho:       z.string().optional(),
    numeroConselho: z.string().optional(),
    duracaoConsulta: z.number().int().default(20),
    horarioInicio:  z.string().optional(),
    horarioFim:     z.string().optional(),
  })
  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })

  const profissional = await prisma.profissionalSaude.create({
    data: { municipioId: usuario.municipioId, ...val.data },
  })
  return NextResponse.json({ profissional }, { status: 201 })
}
