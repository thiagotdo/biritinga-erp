import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Pacientes ────────────────────────────────────────────────────────────────
// Lei 8.080/1990 — acesso universal e igualitário ao SUS
// Resolução CFM 1.638/2002 — prontuário: identificação, anamnese, evolução
// Lei 13.709/2018 (LGPD) Art.11 — dados de saúde como dados sensíveis

function calcularIdade(dataNascimento: Date): number {
  const hoje = new Date()
  let idade = hoje.getFullYear() - dataNascimento.getFullYear()
  const m = hoje.getMonth() - dataNascimento.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < dataNascimento.getDate())) idade--
  return idade
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const relatorio = searchParams.get('relatorio')
  const busca     = searchParams.get('busca')
  const equipe    = searchParams.get('equipe')
  const situacao  = searchParams.get('situacao')

  if (relatorio === 'DASHBOARD') {
    const [total, ativos, obitos, transferidos] = await Promise.all([
      prisma.paciente.count({ where: { municipioId: usuario.municipioId } }),
      prisma.paciente.count({ where: { municipioId: usuario.municipioId, situacao: 'ATIVO' } }),
      prisma.paciente.count({ where: { municipioId: usuario.municipioId, situacao: 'OBITO' } }),
      prisma.paciente.count({ where: { municipioId: usuario.municipioId, situacao: 'TRANSFERIDO' } }),
    ])

    // Atendimentos do mês
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const [atendMes, agendados, vacMes] = await Promise.all([
      prisma.atendimento.count({ where: { municipioId: usuario.municipioId, situacao: 'CONCLUIDO', dataHora: { gte: inicioMes } } }),
      prisma.atendimento.count({ where: { municipioId: usuario.municipioId, situacao: { in: ['AGENDADO','EM_ESPERA'] }, dataHora: { gte: new Date() } } }),
      prisma.registroVacinacao.count({ where: { municipioId: usuario.municipioId, dataAplicacao: { gte: inicioMes } } }),
    ])

    // Atendimentos por tipo (últimos 30 dias)
    const em30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const porTipo = await prisma.atendimento.groupBy({
      by: ['tipo'],
      where: { municipioId: usuario.municipioId, situacao: 'CONCLUIDO', dataHora: { gte: em30d } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    })

    // Gestantes ativas
    const gestantes = await prisma.paciente.count({
      where: { municipioId: usuario.municipioId, situacao: 'ATIVO', grupoRisco: { contains: 'Gestante' } },
    })

    return NextResponse.json({
      kpis: { total, ativos, obitos, transferidos, atendMes, agendados, vacMes, gestantes },
      porTipo,
    })
  }

  if (id) {
    const paciente = await prisma.paciente.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        atendimentos: {
          orderBy: { dataHora: 'desc' }, take: 20,
          include: { profissional: { select: { nomeCompleto: true, especialidade: true } } },
        },
      },
    })
    if (!paciente) return NextResponse.json({ erro: 'Paciente não encontrado' }, { status: 404 })

    const vacinacoes = await prisma.registroVacinacao.findMany({
      where: { pacienteId: id, municipioId: usuario.municipioId },
      orderBy: { dataAplicacao: 'desc' },
    })

    return NextResponse.json({
      paciente: {
        ...paciente,
        idade: calcularIdade(paciente.dataNascimento),
      },
      vacinacoes,
    })
  }

  const where: any = { municipioId: usuario.municipioId, ativo: true }
  if (situacao) where.situacao = situacao
  if (equipe) where.equipeESF = equipe
  if (busca) {
    where.OR = [
      { nomeCompleto: { contains: busca } },
      { nomeSocial:   { contains: busca } },
      { cpf:          { contains: busca.replace(/\D/g,'') } },
      { cns:          { contains: busca } },
    ]
  }

  const pacientes = await prisma.paciente.findMany({
    where, orderBy: { nomeCompleto: 'asc' }, take: 500,
    select: {
      id: true, nomeCompleto: true, nomeSocial: true, dataNascimento: true, sexo: true,
      cpf: true, cns: true, telefoneCelular: true, bairro: true, equipeESF: true,
      grupoRisco: true, situacao: true, microareaAgente: true,
    },
  })

  const enriched = pacientes.map(p => ({
    ...p,
    idade: calcularIdade(p.dataNascimento),
  }))

  return NextResponse.json({ pacientes: enriched, total: enriched.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    nomeCompleto:    z.string().min(3),
    nomeSocial:      z.string().optional(),
    dataNascimento:  z.string(),
    sexo:            z.enum(['MASCULINO','FEMININO','INDETERMINADO']),
    racaCor:         z.string().optional(),
    nomeMae:         z.string().optional(),
    cpf:             z.string().optional(),
    cns:             z.string().optional(),
    rg:              z.string().optional(),
    logradouro:      z.string().optional(),
    numero:          z.string().optional(),
    bairro:          z.string().optional(),
    cep:             z.string().optional(),
    zona:            z.string().optional(),
    telefoneCelular: z.string().optional(),
    telefoneFixo:    z.string().optional(),
    email:           z.string().optional(),
    microareaAgente: z.string().optional(),
    equipeESF:       z.string().optional(),
    grupoRisco:      z.string().optional(),
    alergias:        z.string().optional(),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  // Dedup CPF
  if (d.cpf) {
    const cpfLimpo = d.cpf.replace(/\D/g,'')
    const ex = await prisma.paciente.findFirst({ where: { municipioId: usuario.municipioId, cpf: cpfLimpo } })
    if (ex) return NextResponse.json({ erro: `CPF já cadastrado para paciente: ${ex.nomeCompleto}` }, { status: 409 })
    d.cpf = cpfLimpo
  }

  const paciente = await prisma.paciente.create({
    data: {
      municipioId: usuario.municipioId,
      ...d,
      dataNascimento: new Date(d.dataNascimento),
      usuarioId: usuario.id,
    },
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'CADASTRAR_PACIENTE', entidade: 'Paciente', entidadeId: paciente.id,
    detalhes: { nome: d.nomeCompleto, cpf: d.cpf },
  })

  return NextResponse.json({ paciente }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, ...dados } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const Schema = z.object({
    nomeSocial:      z.string().optional(),
    telefoneCelular: z.string().optional(),
    telefoneFixo:    z.string().optional(),
    email:           z.string().optional(),
    logradouro:      z.string().optional(),
    numero:          z.string().optional(),
    bairro:          z.string().optional(),
    cep:             z.string().optional(),
    zona:            z.string().optional(),
    equipeESF:       z.string().optional(),
    microareaAgente: z.string().optional(),
    grupoRisco:      z.string().optional(),
    alergias:        z.string().optional(),
    observacoesClin: z.string().optional(),
    situacao:        z.string().optional(),
    dataObito:       z.string().optional(),
    ativo:           z.boolean().optional(),
  })

  const val = Schema.safeParse(dados)
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })

  const data: any = { ...val.data }
  if (val.data.dataObito) data.dataObito = new Date(val.data.dataObito)

  await prisma.paciente.update({ where: { id }, data })
  return NextResponse.json({ sucesso: true })
}
