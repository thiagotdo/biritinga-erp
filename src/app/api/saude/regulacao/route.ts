// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Regulação em Saúde ───────────────────────────────────────────────────────
// Fila de regulação usando Agendamento como entidade base
// Tipos CONSULTA_ESPECIALIDADE / EXAME / PROCEDIMENTO_CIRURGICO

async function gerarNumero(municipioId: string): Promise<string> {
  const ano = new Date().getFullYear()
  const count = await db.Agendamento.count({
    where: { municipioId, tipoAtendimento: { in: ['CONSULTA', 'EXAME', 'CIRURGIA'] } },
  })
  return `REG-${ano}-${String(count + 1).padStart(5, '0')}`
}

// Mapeamento situação regulação → SituacaoAgendamento
const SIT_MAP: Record<string, string> = {
  SOLICITADO:    'AGENDADO',
  EM_REGULACAO:  'AGENDADO',
  AGENDADO:      'CONFIRMADO',
  REALIZADO:     'REALIZADO',
  CANCELADO:     'CANCELADO',
  DEVOLVIDO:     'AGUARDANDO',
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const relatorio = searchParams.get('relatorio')
  const situacao  = searchParams.get('situacao')
  const prioridade= searchParams.get('prioridade')
  const tipo      = searchParams.get('tipo')
  const busca     = searchParams.get('busca')
  const municipioId = usuario.municipioId

  try {
    if (relatorio === 'DASHBOARD') {
      const [total, urgentes, pendentes, agendados, realizados, cancelados] = await Promise.all([
        db.$queryRaw`SELECT COUNT(*) as c FROM Agendamento WHERE municipioId = ${municipioId} AND tipoAtendimento IN ('CONSULTA','EXAME','CIRURGIA')`,
        db.$queryRaw`SELECT COUNT(*) as c FROM Agendamento WHERE municipioId = ${municipioId} AND tipoAtendimento IN ('CONSULTA','EXAME','CIRURGIA') AND observacao LIKE '%URGENTE%'`,
        db.$queryRaw`SELECT COUNT(*) as c FROM Agendamento WHERE municipioId = ${municipioId} AND tipoAtendimento IN ('CONSULTA','EXAME','CIRURGIA') AND situacao = 'AGENDADO'`,
        db.$queryRaw`SELECT COUNT(*) as c FROM Agendamento WHERE municipioId = ${municipioId} AND tipoAtendimento IN ('CONSULTA','EXAME','CIRURGIA') AND situacao = 'CONFIRMADO'`,
        db.$queryRaw`SELECT COUNT(*) as c FROM Agendamento WHERE municipioId = ${municipioId} AND tipoAtendimento IN ('CONSULTA','EXAME','CIRURGIA') AND situacao = 'REALIZADO'`,
        db.$queryRaw`SELECT COUNT(*) as c FROM Agendamento WHERE municipioId = ${municipioId} AND tipoAtendimento IN ('CONSULTA','EXAME','CIRURGIA') AND situacao = 'CANCELADO'`,
      ])
      return NextResponse.json({
        kpis: {
          total:      Number((total as any[])[0]?.c ?? 0),
          urgentes:   Number((urgentes as any[])[0]?.c ?? 0),
          pendentes:  Number((pendentes as any[])[0]?.c ?? 0),
          agendados:  Number((agendados as any[])[0]?.c ?? 0),
          realizados: Number((realizados as any[])[0]?.c ?? 0),
          cancelados: Number((cancelados as any[])[0]?.c ?? 0),
        },
      })
    }

    if (id) {
      const rows = await db.$queryRaw`
        SELECT ag.id, ag.observacao, ag.situacao, ag.dataAgendamento, ag.tipoAtendimento,
               ag.motivoCancelamento, ag.criadoPor, ag.criadoEm,
               p.nomeCompleto, p.dataNascimento, p.cns, p.telefone,
               u.nome AS unidadeNome, pr.nome AS profissionalNome
        FROM Agendamento ag
        JOIN Paciente p ON p.id = ag.pacienteId
        JOIN UnidadeSaude u ON u.id = ag.unidadeId
        LEFT JOIN ProfissionalSaude pr ON pr.id = ag.profissionalId
        WHERE ag.id = ${id} AND ag.municipioId = ${municipioId} LIMIT 1`
      const reg = (rows as any[])[0]
      if (!reg) return NextResponse.json({ erro: 'Regulação não encontrada' }, { status: 404 })
      return NextResponse.json({ regulacao: { ...reg, paciente: { nomeCompleto: reg.nomeCompleto, dataNascimento: reg.dataNascimento, cns: reg.cns, telefone: reg.telefone } } })
    }

    // Lista regulações
    const regulacoes = await db.$queryRaw`
      SELECT ag.id, ag.observacao, ag.situacao, ag.dataAgendamento, ag.tipoAtendimento,
             ag.criadoEm, ag.motivoCancelamento,
             p.nomeCompleto AS pacienteNome, p.cns,
             u.nome AS unidadeNome
      FROM Agendamento ag
      JOIN Paciente p ON p.id = ag.pacienteId
      JOIN UnidadeSaude u ON u.id = ag.unidadeId
      WHERE ag.municipioId = ${municipioId}
        AND ag.tipoAtendimento IN ('CONSULTA','EXAME','CIRURGIA')
        ${situacao ? db.$queryRaw`AND ag.situacao = ${situacao}` : db.$queryRaw``}
        ${busca ? db.$queryRaw`AND (p.nomeCompleto LIKE ${`%${busca}%`} OR ag.observacao LIKE ${`%${busca}%`})` : db.$queryRaw``}
      ORDER BY ag.criadoEm DESC
      LIMIT 200`

    // Mapear para interface esperada pela página
    const mapped = (regulacoes as any[]).map(r => ({
      id:                   r.id,
      numero:               `REG-${r.id.slice(-8).toUpperCase()}`,
      tipo:                 r.tipoAtendimento === 'CIRURGIA' ? 'PROCEDIMENTO_CIRURGICO'
                          : r.tipoAtendimento === 'EXAME'    ? 'EXAME_IMAGEM'
                          : 'CONSULTA_ESPECIALIDADE',
      situacao:             r.situacao === 'CONFIRMADO' ? 'AGENDADO'
                          : r.situacao === 'AGENDADO'   ? 'SOLICITADO'
                          : r.situacao as string,
      prioridade:           r.observacao?.includes('URGENTE') ? 'URGENTE'
                          : r.observacao?.includes('PRIORITARIO') ? 'PRIORITARIO' : 'ELETIVO',
      procedimentoNome:     r.observacao?.split('|')[0] ?? r.tipoAtendimento,
      procedimentoCod:      null,
      cid10Indicacao:       null,
      justificativaClinica: r.observacao ?? '',
      unidadeSolicitante:   r.unidadeNome,
      profissionalSolicitante: r.criadoPor ?? '',
      unidadeDestino:       null,
      profissionalDestino:  null,
      dataAgendamento:      r.dataAgendamento,
      dataRealizacao:       null,
      dataSolicitacao:      r.criadoEm,
      reguladorNome:        null,
      laudoResultado:       null,
      motivoCancelamento:   r.motivoCancelamento,
      motivoDevolucao:      null,
      paciente: { nomeCompleto: r.pacienteNome, dataNascimento: null, cns: r.cns, telefone: null },
    }))

    return NextResponse.json({ regulacoes: mapped, total: mapped.length })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  try {
    const d = await req.json()
    const municipioId = usuario.municipioId

    // Mapear tipo de regulação → TipoAtendimento do Agendamento
    const tipoMap: Record<string, string> = {
      CONSULTA_ESPECIALIDADE: 'CONSULTA',
      EXAME_IMAGEM:           'EXAME',
      EXAME_LABORATORIAL:     'EXAME',
      PROCEDIMENTO_CIRURGICO: 'CIRURGIA',
      INTERNACAO:             'CONSULTA',
      TERAPIA:                'CONSULTA',
    }
    const tipoAtendimento = tipoMap[d.tipo] ?? 'CONSULTA'
    const prioTag = d.prioridade === 'URGENTE' ? 'URGENTE|' : d.prioridade === 'PRIORITARIO' ? 'PRIORITARIO|' : ''
    const obs = `${prioTag}${d.procedimentoNome ?? ''}|${d.justificativaClinica ?? ''}`

    const ag = await db.Agendamento.create({
      data: {
        municipioId,
        unidadeId:       d.unidadeId,
        pacienteId:      d.pacienteId,
        tipoAtendimento: tipoAtendimento as any,
        dataAgendamento: d.dataAgendamento ? new Date(d.dataAgendamento) : new Date(),
        horaAgendamento: d.hora ?? '00:00',
        situacao:        'AGENDADO' as any,
        observacao:      obs,
        criadoPor:       usuario.usuarioId,
      },
    })

    await auditLog({ municipioId, usuarioId: usuario.usuarioId, acao: 'CREATE',
      modulo: 'saude', recurso: 'Regulacao', registroId: ag.id,
      dadosNovos: { tipo: d.tipo, prioridade: d.prioridade, pacienteId: d.pacienteId } })

    return NextResponse.json({ regulacao: { id: ag.id, numero: `REG-${ag.id.slice(-8).toUpperCase()}` } }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  try {
    const { id, acao, ...dados } = await req.json()
    if (!id || !acao) return NextResponse.json({ erro: 'id e acao obrigatórios' }, { status: 400 })

    const municipioId = usuario.municipioId
    const ag = await db.Agendamento.findFirst({ where: { id, municipioId } })
    if (!ag) return NextResponse.json({ erro: 'Regulação não encontrada' }, { status: 404 })

    const updateData: any = {}

    const TRANSICOES: Record<string, string> = {
      INICIAR_REGULACAO: 'AGENDADO',
      AGENDAR:           'CONFIRMADO',
      REALIZAR:          'REALIZADO',
      CANCELAR:          'CANCELADO',
      DEVOLVER:          'AGUARDANDO',
    }

    if (TRANSICOES[acao]) updateData.situacao = TRANSICOES[acao]
    if (acao === 'CANCELAR' && dados.motivo) updateData.motivoCancelamento = dados.motivo
    if (dados.dataAgendamento) updateData.dataAgendamento = new Date(dados.dataAgendamento)

    await db.Agendamento.update({ where: { id }, data: updateData })

    await auditLog({ municipioId, usuarioId: usuario.usuarioId, acao: 'UPDATE',
      modulo: 'saude', recurso: 'Regulacao', registroId: id,
      dadosNovos: { acao, situacao: updateData.situacao } })

    return NextResponse.json({ sucesso: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
