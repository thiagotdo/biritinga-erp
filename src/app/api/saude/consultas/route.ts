import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { extrairContextoRequest, auditLog } from '@/lib/audit'
import { temPermissao } from '@/lib/auth/rbac'

const SinaisVitaisSchema = z.object({
  peso: z.number().optional(),
  altura: z.number().optional(),
  pressaoArterial: z.string().optional(),
  frequenciaCardiaca: z.number().int().optional(),
  frequenciaResp: z.number().int().optional(),
  temperatura: z.number().optional(),
  saturacaoO2: z.number().int().min(0).max(100).optional(),
  glicemia: z.number().optional(),
})

const ConsultaSchema = z.object({
  pacienteId: z.string(),
  unidadeId: z.string(),
  profissionalId: z.string(),
  agendamentoId: z.string().optional(),
  dataHora: z.string().datetime().optional(),
  tipoConsulta: z.string(),

  // Sinais vitais
  sinaisVitais: SinaisVitaisSchema.optional(),

  // SOAP / clínico
  queixaPrincipal: z.string().optional(),
  historicoDoenca: z.string().optional(),
  exameFisico: z.string().optional(),
  hipoteseDiagnostica: z.string().optional(),
  cid10Principal: z.string().optional(),
  cid10Secundario: z.string().optional(),
  condutaTratamento: z.string().optional(),
  encaminhamento: z.string().optional(),
  retornoEm: z.string().datetime().optional(),

  subjetivo: z.string().optional(),
  objetivo: z.string().optional(),
  avaliacao: z.string().optional(),
  plano: z.string().optional(),

  // Prescrições
  prescricoes: z.array(z.object({
    medicamento: z.string(),
    concentracao: z.string().optional(),
    forma: z.string().optional(),
    dose: z.string(),
    frequencia: z.string(),
    duracao: z.string().optional(),
    via: z.string().optional(),
    orientacoes: z.string().optional(),
    continuo: z.boolean().default(false),
  })).optional(),

  // Exames
  exames: z.array(z.object({
    exame: z.string(),
    indicacao: z.string().optional(),
    urgente: z.boolean().default(false),
  })).optional(),

  // Ação
  acao: z.enum(['salvar_rascunho', 'finalizar', 'assinar']).default('salvar_rascunho'),
})

// POST /api/saude/consultas
export async function POST(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'saude:consulta:create')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const dados = ConsultaSchema.parse(body)

    const { sinaisVitais, prescricoes, exames, acao, ...dadosConsulta } = dados

    // Calcular IMC se peso e altura presentes
    let imc: number | undefined
    if (sinaisVitais?.peso && sinaisVitais?.altura) {
      const alturaM = sinaisVitais.altura / 100
      imc = parseFloat((sinaisVitais.peso / (alturaM * alturaM)).toFixed(1))
    }

    const status = acao === 'assinar' ? 'ASSINADA' : acao === 'finalizar' ? 'FINALIZADA' : 'RASCUNHO'

    const consulta = await prisma.$transaction(async (tx) => {
      const c = await tx.consulta.create({
        data: {
          municipioId: ctx.municipioId,
          pacienteId: dadosConsulta.pacienteId,
          unidadeId: dadosConsulta.unidadeId,
          profissionalId: dadosConsulta.profissionalId,
          agendamentoId: dadosConsulta.agendamentoId,
          dataHora: dadosConsulta.dataHora ? new Date(dadosConsulta.dataHora) : new Date(),
          tipoConsulta: dadosConsulta.tipoConsulta as any,
          status: status as any,
          ...sinaisVitais,
          imc,
          queixaPrincipal: dadosConsulta.queixaPrincipal,
          historicoDoenca: dadosConsulta.historicoDoenca,
          exameFisico: dadosConsulta.exameFisico,
          hipoteseDiagnostica: dadosConsulta.hipoteseDiagnostica,
          cid10Principal: dadosConsulta.cid10Principal,
          cid10Secundario: dadosConsulta.cid10Secundario,
          condutaTratamento: dadosConsulta.condutaTratamento,
          encaminhamento: dadosConsulta.encaminhamento,
          retornoEm: dadosConsulta.retornoEm ? new Date(dadosConsulta.retornoEm) : undefined,
          subjetivo: dadosConsulta.subjetivo,
          objetivo: dadosConsulta.objetivo,
          avaliacao: dadosConsulta.avaliacao,
          plano: dadosConsulta.plano,
          assinadoEm: acao === 'assinar' ? new Date() : undefined,
          assinadoPor: acao === 'assinar' ? ctx.usuarioId : undefined,
        },
      })

      // Prescrições
      if (prescricoes && prescricoes.length > 0) {
        await tx.prescricaoMedicamento.createMany({
          data: prescricoes.map(p => ({ ...p, consultaId: c.id })),
        })
      }

      // Exames
      if (exames && exames.length > 0) {
        await tx.exameSolicitacao.createMany({
          data: exames.map(e => ({ ...e, consultaId: c.id })),
        })
      }

      // Atualizar status do agendamento
      if (dadosConsulta.agendamentoId) {
        await tx.agendamento.update({
          where: { id: dadosConsulta.agendamentoId },
          data: {
            status: status === 'RASCUNHO' ? 'EM_ATENDIMENTO' : 'REALIZADO',
            atendidoEm: new Date(),
            consulta: { connect: { id: c.id } },
          },
        })
      }

      return c
    })

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId: ctx.usuarioId,
      acao: 'CREATE',
      modulo: 'saude',
      recurso: 'consulta',
      registroId: consulta.id,
      dadosNovos: {
        pacienteId: dadosConsulta.pacienteId,
        tipo: dadosConsulta.tipoConsulta,
        status,
        prescricoes: prescricoes?.length || 0,
        exames: exames?.length || 0,
      },
    })

    return NextResponse.json({ consulta }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[CONSULTA]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// GET /api/saude/consultas?pacienteId=&data=&unidadeId=
export async function GET(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'saude:consulta:read')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const pacienteId = searchParams.get('pacienteId')
  const unidadeId = searchParams.get('unidadeId')
  const profissionalId = searchParams.get('profissionalId')
  const data = searchParams.get('data')

  const consultas = await prisma.consulta.findMany({
    where: {
      municipioId: ctx.municipioId,
      ...(pacienteId && { pacienteId }),
      ...(unidadeId && { unidadeId }),
      ...(profissionalId && { profissionalId }),
      ...(data && {
        dataHora: {
          gte: new Date(`${data}T00:00:00`),
          lte: new Date(`${data}T23:59:59`),
        },
      }),
    },
    include: {
      paciente: { select: { nome: true, dataNascimento: true, cns: true } },
      profissional: { select: { nome: true, especialidade: true } },
      unidade: { select: { nome: true } },
      prescricoes: true,
      examesSolicitados: true,
    },
    orderBy: { dataHora: 'desc' },
    take: 50,
  })

  return NextResponse.json({ dados: consultas, total: consultas.length })
}
