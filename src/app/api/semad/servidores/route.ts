import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { extrairContextoRequest, auditLog } from '@/lib/audit'
import { temPermissao } from '@/lib/auth/rbac'

const ServidorSchema = z.object({
  matricula:         z.string().min(1),
  nome:              z.string().min(3),
  cpf:               z.string().min(11),
  rg:                z.string().optional(),
  dataNascimento:    z.string().datetime().optional(),
  sexo:              z.enum(['M', 'F', 'O']).optional(),
  estadoCivil:       z.string().optional(),
  naturalidade:      z.string().optional(),
  pcd:               z.boolean().default(false),
  tipoDeficiencia:   z.string().optional(),

  // Contato
  email:             z.string().email().optional(),
  emailInstitucional:z.string().email().optional(),
  telefone:          z.string().optional(),
  celular:           z.string().optional(),

  // Endereço
  cep:               z.string().optional(),
  logradouro:        z.string().optional(),
  numero:            z.string().optional(),
  complemento:       z.string().optional(),
  bairro:            z.string().optional(),
  cidade:            z.string().optional(),
  estado:            z.string().optional(),

  // Dados funcionais
  cargoId:           z.string().optional(),
  vinculo:           z.enum(['EFETIVO','COMISSIONADO','CONTRATADO_CLT','CONTRATADO_TEMPORARIO','ESTAGIARIO','AGENTE_POLITICO']).default('EFETIVO'),
  regime:            z.enum(['ESTATUTARIO','CLT','AUTONOMO']).default('ESTATUTARIO'),
  dataAdmissao:      z.string().datetime(),
  dataPosse:         z.string().datetime().optional(),
  cargaHoraria:      z.number().int().min(1).max(44).default(40),
  salarioBase:       z.number().positive().optional(),
  nivelProgresso:    z.string().optional(),

  // Bancário
  banco:             z.string().optional(),
  agencia:           z.string().optional(),
  contaCorrente:     z.string().optional(),

  // Documentos
  pis:               z.string().optional(),
  tituloEleitor:     z.string().optional(),
  ctps:              z.string().optional(),

  observacoes:       z.string().optional(),
})

// POST /api/semad/servidores
export async function POST(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'semad:servidor:create')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const dados = ServidorSchema.parse(body)

    // Verificar CPF duplicado
    const cpfExistente = await prisma.servidor.findFirst({
      where: { municipioId: ctx.municipioId, cpf: dados.cpf, ativo: true },
    })
    if (cpfExistente) {
      return NextResponse.json({ erro: 'CPF já cadastrado', servidorId: cpfExistente.id }, { status: 409 })
    }

    // Verificar matrícula duplicada
    const matriculaExistente = await prisma.servidor.findFirst({
      where: { municipioId: ctx.municipioId, matricula: dados.matricula, ativo: true },
    })
    if (matriculaExistente) {
      return NextResponse.json({ erro: 'Matrícula já cadastrada', servidorId: matriculaExistente.id }, { status: 409 })
    }

    const servidor = await prisma.$transaction(async (tx) => {
      const s = await tx.servidor.create({
        data: {
          municipioId: ctx.municipioId,
          ...dados,
          vinculo: dados.vinculo as any,
          regime: dados.regime as any,
          situacao: 'ATIVO',
          dataAdmissao: new Date(dados.dataAdmissao),
          dataPosse: dados.dataPosse ? new Date(dados.dataPosse) : undefined,
          dataNascimento: dados.dataNascimento ? new Date(dados.dataNascimento) : undefined,
        },
      })

      // Registrar movimentação de admissão
      await tx.movimentacaoFuncional.create({
        data: {
          municipioId: ctx.municipioId,
          servidorId: s.id,
          tipo: 'ADMISSAO',
          dataEfetiva: new Date(dados.dataAdmissao),
          descricao: `Admissão como ${dados.vinculo} — ${dados.regime}`,
          salarioNovo: dados.salarioBase,
          registradoPor: ctx.usuarioId,
        },
      })

      return s
    })

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId: ctx.usuarioId,
      acao: 'CREATE',
      modulo: 'semad',
      recurso: 'servidor',
      registroId: servidor.id,
      dadosNovos: { matricula: dados.matricula, nome: dados.nome, vinculo: dados.vinculo },
    })

    return NextResponse.json({ servidor }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[SERVIDOR]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// GET /api/semad/servidores
export async function GET(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'semad:servidor:read')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const busca      = searchParams.get('busca')
  const situacao   = searchParams.get('situacao')
  const vinculo    = searchParams.get('vinculo')
  const cargoId    = searchParams.get('cargoId')
  const unidadeId  = searchParams.get('unidadeId')
  const page       = parseInt(searchParams.get('page') || '1')
  const limit      = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const skip       = (page - 1) * limit

  const where: any = {
    municipioId: ctx.municipioId,
    ativo: true,
    ...(situacao && { situacao: situacao as any }),
    ...(vinculo  && { vinculo: vinculo as any }),
    ...(cargoId  && { cargoId }),
    ...(busca && {
      OR: [
        { nome:      { contains: busca } },
        { matricula: { contains: busca } },
        { cpf:       { contains: busca } },
        { emailInstitucional: { contains: busca } },
      ],
    }),
    // filtro por unidade via lotações
    ...(unidadeId && {
      lotacoes: { some: { unidadeId, ativo: true } },
    }),
  }

  const [servidores, total] = await Promise.all([
    prisma.servidor.findMany({
      where,
      select: {
        id: true, matricula: true, nome: true, cpf: true,
        situacao: true, vinculo: true, regime: true,
        cargoId: true, cargaHoraria: true, salarioBase: true,
        dataAdmissao: true, emailInstitucional: true, celular: true,
        pcd: true, foto: true,
        cargo: { select: { id: true, nome: true, simbolo: true } },
        lotacoes: {
          where: { ativo: true },
          select: { unidade: { select: { id: true, nome: true, sigla: true } }, funcao: true },
          take: 1,
        },
        _count: { select: { ferias: true, afastamentos: true } },
      },
      orderBy: { nome: 'asc' },
      skip,
      take: limit,
    }),
    prisma.servidor.count({ where }),
  ])

  return NextResponse.json({
    dados: servidores,
    paginacao: { total, page, limit, totalPages: Math.ceil(total / limit) },
  })
}
