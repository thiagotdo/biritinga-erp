import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { extrairContextoRequest, auditLog } from '@/lib/audit'
import { temPermissao } from '@/lib/auth/rbac'

const CriarPacienteSchema = z.object({
  nome: z.string().min(3),
  nomeSocial: z.string().optional(),
  dataNascimento: z.string().datetime(),
  sexo: z.enum(['M', 'F']),
  racaCor: z.string().optional(),
  tipoSanguineo: z.string().optional(),
  cpf: z.string().length(11).optional(),
  cns: z.string().optional(),
  nis: z.string().optional(),

  // Endereço
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  zona: z.enum(['urbana', 'rural']).optional(),

  // Contato
  telefone: z.string().optional(),
  celular: z.string().optional(),
  email: z.string().email().optional(),

  // Responsável
  nomeResponsavel: z.string().optional(),
  cpfResponsavel: z.string().optional(),
  telefoneResponsavel: z.string().optional(),

  // Clínico
  alergias: z.string().optional(),
  medicamentosCronicos: z.string().optional(),
  condicoesCronicas: z.string().optional(),
  gruposAtendimento: z.array(z.string()).optional(),

  // ESF
  acompFamiliar: z.boolean().default(false),
  microarea: z.string().optional(),
})

// GET /api/saude/pacientes
export async function GET(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'saude:paciente:read')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const pagina = parseInt(searchParams.get('pagina') || '1')
  const limite = parseInt(searchParams.get('limite') || '20')
  const busca = searchParams.get('busca') || ''
  const grupo = searchParams.get('grupo')
  const situacao = searchParams.get('situacao') || 'ATIVO'

  const where: any = {
    municipioId: ctx.municipioId,
    situacao,
    ...(busca && {
      OR: [
        { nome: { contains: busca } },
        { cpf: { contains: busca } },
        { cns: { contains: busca } },
      ],
    }),
    ...(grupo && {
      gruposAtendimento: { has: grupo },
    }),
  }

  const [pacientes, total] = await Promise.all([
    prisma.paciente.findMany({
      where,
      select: {
        id: true,
        nome: true,
        nomeSocial: true,
        dataNascimento: true,
        sexo: true,
        cpf: true,
        cns: true,
        situacao: true,
        gruposAtendimento: true,
        acompFamiliar: true,
        microarea: true,
        celular: true,
        bairro: true,
        zona: true,
      },
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { nome: 'asc' },
    }),
    prisma.paciente.count({ where }),
  ])

  return NextResponse.json({
    dados: pacientes,
    paginacao: { total, pagina, limite, totalPaginas: Math.ceil(total / limite) },
  })
}

// POST /api/saude/pacientes
export async function POST(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'saude:paciente:create')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const dados = CriarPacienteSchema.parse(body)

    // Verificar CPF duplicado
    if (dados.cpf) {
      const existe = await prisma.paciente.findUnique({ where: { cpf: dados.cpf } })
      if (existe) {
        return NextResponse.json({ erro: 'CPF já cadastrado para outro paciente', pacienteId: existe.id }, { status: 409 })
      }
    }

    // Verificar CNS duplicado
    if (dados.cns) {
      const existe = await prisma.paciente.findUnique({ where: { cns: dados.cns } })
      if (existe) {
        return NextResponse.json({ erro: 'CNS já cadastrado para outro paciente', pacienteId: existe.id }, { status: 409 })
      }
    }

    const paciente = await prisma.paciente.create({
      data: {
        ...dados,
        municipioId: ctx.municipioId,
        dataNascimento: new Date(dados.dataNascimento),
        gruposAtendimento: dados.gruposAtendimento as any || [],
      },
    })

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId: ctx.usuarioId,
      acao: 'CREATE',
      modulo: 'saude',
      recurso: 'paciente',
      registroId: paciente.id,
      dadosNovos: { nome: paciente.nome, cpf: paciente.cpf, cns: paciente.cns },
    })

    return NextResponse.json({ paciente }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[PACIENTE]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
