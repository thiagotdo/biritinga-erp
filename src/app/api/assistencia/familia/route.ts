// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { prisma, getConn } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Família Referenciada - Prontuário SUAS ───────────────────────────────────
// LOAS Art. 2º - proteção à família, maternidade, infância, adolescência e velhice
// NOB-SUAS 2012 - prontuário único por família no SUAS municipal

async function gerarNumeroProntuario(municipioId: string): Promise<string> {
  const ano   = new Date().getFullYear()
  const count = await prisma.FamiliaReferenciada.count({ where: { municipioId } })
  return `${ano}-${String(count + 1).padStart(5, '0')}`
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const busca     = searchParams.get('busca')
  const unidadeId = searchParams.get('unidadeId')
  const relatorio = searchParams.get('relatorio')
  const nivel     = searchParams.get('nivelVulnerabilidade')

  if (relatorio === 'DASHBOARD') {
    const [total, ativas, inativas, bolsaFamilia, bpc, situacaoRua, criancas, idosos, pcd, violencia] = await Promise.all([
      prisma.FamiliaReferenciada.count({ where: { municipioId: usuario.municipioId } }),
      prisma.FamiliaReferenciada.count({ where: { municipioId: usuario.municipioId, situacao: 'ATIVA' } }),
      prisma.FamiliaReferenciada.count({ where: { municipioId: usuario.municipioId, situacao: 'INATIVA' } }),
      prisma.FamiliaReferenciada.count({ where: { municipioId: usuario.municipioId, bolsaFamilia: true } }),
      prisma.FamiliaReferenciada.count({ where: { municipioId: usuario.municipioId, bpc: true } }),
      prisma.FamiliaReferenciada.count({ where: { municipioId: usuario.municipioId, situacaoRua: true } }),
      prisma.FamiliaReferenciada.count({ where: { municipioId: usuario.municipioId, criancas: true } }),
      prisma.FamiliaReferenciada.count({ where: { municipioId: usuario.municipioId, idosos: true } }),
      prisma.FamiliaReferenciada.count({ where: { municipioId: usuario.municipioId, pcd: true } }),
      prisma.FamiliaReferenciada.count({ where: { municipioId: usuario.municipioId, violencia: true } }),
    ])

    // porNivel via SQL direto (groupBy não suportado pelo makeModel)
    const _conn = await getConn()
    let porNivelArr: any[] = []
    try {
      const [nivelRows] = await _conn.execute(
        `SELECT nivelVulnerabilidade, COUNT(*) as total FROM FamiliaReferenciada WHERE municipioId = ? AND situacao = 'ATIVA' GROUP BY nivelVulnerabilidade`,
        [usuario.municipioId]
      ) as any[]
      porNivelArr = (nivelRows as any[]).map((r: any) => ({ nivelVulnerabilidade: r.nivelVulnerabilidade, _count: Number(r.total) }))
    } finally {
      await _conn.end()
    }

    // Atendimentos do mês
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const atendMes  = await prisma.AtendimentoSuas.count({
      where: {
        municipioId: usuario.municipioId,
        situacao: 'REALIZADO',
        dataAtendimento: { gte: inicioMes },
      },
    })

    return NextResponse.json({
      kpis: { total, ativas, inativas, bolsaFamilia, bpc, situacaoRua, criancas, idosos, pcd, violencia, atendMes },
      porNivel: Object.fromEntries(porNivelArr.map(p => [p.nivelVulnerabilidade, p._count])),
    })
  }

  if (id) {
    const familia = await prisma.FamiliaReferenciada.findFirst({
      where: { id, municipioId: usuario.municipioId },
    })
    if (!familia) return NextResponse.json({ erro: 'Família não encontrada' }, { status: 404 })

    // Parse membros JSON
    const familiaEnriquecida = {
      ...familia,
      membros: familia.membrosJson ? JSON.parse(familia.membrosJson) : [],
    }

    return NextResponse.json({ familia: familiaEnriquecida })
  }

  const where: any = { municipioId: usuario.municipioId }
  if (unidadeId) where.unidadeId = unidadeId
  if (nivel)     where.nivelVulnerabilidade = nivel

  if (busca) {
    const termo = busca.replace(/\D/g, '')
    where.OR = [
      { responsavelNome:  { contains: busca } },
      { numeroProntuario: { contains: busca } },
      ...(termo.length >= 6 ? [
        { responsavelCpf: { contains: termo } },
        { responsavelNis: { contains: termo } },
        { numeroCadunico: { contains: termo } },
      ] : []),
    ]
  }

  const familias = await prisma.FamiliaReferenciada.findMany({
    where, orderBy: { responsavelNome: 'asc' }, take: 200,
    select: {
      id: true, numeroProntuario: true,
      responsavelNome: true, responsavelCpf: true,
      bairro: true, telefone: true,
      situacao: true, nivelVulnerabilidade: true,
      quantidadeMembros: true, rendaFamiliar: true, percapita: true,
      bolsaFamilia: true, bpc: true,
      criancas: true, idosos: true, pcd: true, violencia: true, situacaoRua: true,
      dataIngresso: true, unidadeId: true,
    },
  })

  return NextResponse.json({ familias, total: familias.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    responsavelNome:    z.string().min(3),
    responsavelCpf:     z.string().optional(),
    responsavelNis:     z.string().optional(),
    responsavelSexo:    z.enum(['M','F']).optional(),
    responsavelDatNasc: z.string().optional(),

    logradouro:   z.string().optional(),
    numero:       z.string().optional(),
    complemento:  z.string().optional(),
    bairro:       z.string().optional(),
    cep:          z.string().optional(),
    referencia:   z.string().optional(),
    telefone:     z.string().optional(),
    telefone2:    z.string().optional(),

    nivelVulnerabilidade: z.enum(['BAIXO','MEDIO','ALTO','MUITO_ALTO']).default('MEDIO'),
    unidadeId:    z.string().optional(),
    tecnicoRefId: z.string().optional(),

    rendaFamiliar:     z.number().min(0).optional(),
    percapita:         z.number().min(0).optional(),
    quantidadeMembros: z.number().int().min(1).default(1),

    bolsaFamilia: z.boolean().default(false),
    bpc:          z.boolean().default(false),
    cadunico:     z.boolean().default(false),
    numeroCadunico: z.string().optional(),

    tipoMoradia:     z.string().optional(),
    condicaoMoradia: z.string().optional(),

    criancas:    z.boolean().default(false),
    idosos:      z.boolean().default(false),
    pcd:         z.boolean().default(false),
    gestante:    z.boolean().default(false),
    violencia:   z.boolean().default(false),
    substancias: z.boolean().default(false),
    situacaoRua: z.boolean().default(false),

    membros: z.array(z.any()).optional(),
    observacoes: z.string().optional(),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  // CPF único por município
  if (d.responsavelCpf) {
    const cpf = d.responsavelCpf.replace(/\D/g, '')
    const existe = await prisma.FamiliaReferenciada.findFirst({
      where: { municipioId: usuario.municipioId, responsavelCpf: cpf },
    })
    if (existe) {
      return NextResponse.json({ erro: 'CPF já cadastrado', familiaId: existe.id }, { status: 409 })
    }
    d.responsavelCpf = cpf
  }

  if (d.responsavelNis) d.responsavelNis = d.responsavelNis.replace(/\D/g, '')

  const numeroProntuario = await gerarNumeroProntuario(usuario.municipioId)
  const { membros, ...dadosFamilia } = d

  const familia = await prisma.FamiliaReferenciada.create({
    data: {
      id: randomUUID(),
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      municipioId: usuario.municipioId,
      numeroProntuario,
      ...dadosFamilia,
      responsavelDatNasc: d.responsavelDatNasc ? new Date(d.responsavelDatNasc) : undefined,
      membrosJson: membros ? JSON.stringify(membros) : undefined,
      usuarioId: usuario.usuarioId,
    },
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.usuarioId,
    acao: 'CREATE', modulo: 'misc', recurso: 'FamiliaReferenciada', registroId: familia.id,
    dadosNovos: {
      numero: numeroProntuario, responsavel: familia.responsavelNome,
      nivel: familia.nivelVulnerabilidade,
    },
  })

  return NextResponse.json({ familia, numeroProntuario }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, membros, ...dados } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const familia = await prisma.FamiliaReferenciada.findFirst({
    where: { id, municipioId: usuario.municipioId },
  })
  if (!familia) return NextResponse.json({ erro: 'Família não encontrada' }, { status: 404 })

  if (acao === 'DESLIGAR') {
    const { motivo } = dados
    await prisma.FamiliaReferenciada.update({
      where: { id },
      data: {
        situacao: 'DESLIGADA',
        dataDesligamento: new Date(),
        motivoDesligamento: motivo,
      },
    })
    return NextResponse.json({ sucesso: true })
  }

  // Atualização geral
  if (dados.responsavelCpf) dados.responsavelCpf = dados.responsavelCpf.replace(/\D/g, '')
  if (dados.responsavelNis) dados.responsavelNis = dados.responsavelNis.replace(/\D/g, '')
  if (dados.responsavelDatNasc) dados.responsavelDatNasc = new Date(dados.responsavelDatNasc)

  const atualizada = await prisma.FamiliaReferenciada.update({
    where: { id },
    data: {
      ...dados,
      ...(membros !== undefined ? { membrosJson: JSON.stringify(membros) } : {}),
    },
  })

  return NextResponse.json({ familia: atualizada })
}
