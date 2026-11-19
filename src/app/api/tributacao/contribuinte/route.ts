import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Contribuintes Municipais ─────────────────────────────────────────────────
// CTN Art.121 — sujeito passivo da obrigação tributária principal
// LC 116/2003 Art.3-6 — contribuinte ISS (prestador / tomador responsável)
// CGSN 140/2018 — tratamento diferenciado Simples Nacional / MEI

// Alíquotas ISS por CNAE (referência LC 116/2003 — municípios fixam dentro de 2%-5%)
// LC 157/2016 define o piso de 2% para evitar guerra fiscal entre municípios
const ALIQUOTAS_PADRAO: Record<string, number> = {
  '1.01': 2.0, '1.02': 2.0, '1.03': 2.0, '1.04': 2.0, '1.05': 2.0, // construção
  '7.01': 3.0, '7.02': 3.0, '7.03': 3.0, '7.04': 3.0, '7.05': 3.0, // serv. infra
  '17.01': 5.0, '17.02': 5.0, '17.06': 5.0,                          // serv. apoio
  'default': 3.0,
}

function aliquotaPadrao(lista: string): number {
  const prefix = lista.slice(0, lista.lastIndexOf('.') > 0 ? lista.indexOf('.') + 2 : 4)
  return ALIQUOTAS_PADRAO[lista] ?? ALIQUOTAS_PADRAO[prefix] ?? ALIQUOTAS_PADRAO['default']!
}

async function gerarInscricao(municipioId: string, tipo: string): Promise<string> {
  const ano = new Date().getFullYear()
  const prefixo = tipo === 'FISICA' ? 'AUT' : 'ISS'
  const count = await prisma.contribuinte.count({ where: { municipioId } })
  return `${prefixo}-${ano}-${String(count + 1).padStart(5, '0')}`
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const relatorio = searchParams.get('relatorio')
  const busca     = searchParams.get('busca')
  const situacao  = searchParams.get('situacao')
  const tipo      = searchParams.get('tipo') // FISICA | JURIDICA
  const cnae      = searchParams.get('cnae')

  if (relatorio === 'DASHBOARD') {
    const anoAtual = new Date().getFullYear()

    const [total, ativos, suspensos, baixados, fisicos, juridicos] = await Promise.all([
      prisma.contribuinte.count({ where: { municipioId: usuario.municipioId } }),
      prisma.contribuinte.count({ where: { municipioId: usuario.municipioId, situacao: 'ATIVO' } }),
      prisma.contribuinte.count({ where: { municipioId: usuario.municipioId, situacao: 'SUSPENSO' } }),
      prisma.contribuinte.count({ where: { municipioId: usuario.municipioId, situacao: 'BAIXADO' } }),
      prisma.contribuinte.count({ where: { municipioId: usuario.municipioId, tipoPessoa: 'FISICA' } }),
      prisma.contribuinte.count({ where: { municipioId: usuario.municipioId, tipoPessoa: 'JURIDICA' } }),
    ])

    // Arrecadação ISS do ano por mês
    const arrISS = await prisma.pagamentoTributario.findMany({
      where: {
        municipioId: usuario.municipioId,
        dataPagamento: {
          gte: new Date(`${anoAtual}-01-01`),
          lt:  new Date(`${anoAtual + 1}-01-01`),
        },
        lancamento: { tipoLancamento: { in: ['ISS_FIXO', 'ISS_VARIAVEL', 'ISS_RETIDO'] } },
      },
      select: { dataPagamento: true, valorPago: true },
    })

    // Agrupa por mês
    const porMes: Record<string, number> = {}
    for (const p of arrISS) {
      const mes = p.dataPagamento.toISOString().slice(0, 7)
      porMes[mes] = (porMes[mes] ?? 0) + Number(p.valorPago)
    }

    // Totais de lançamentos ISS abertos (a cobrar)
    const issAberto = await prisma.lancamentoTributario.aggregate({
      where: {
        municipioId: usuario.municipioId,
        situacao: 'ABERTO',
        tipoLancamento: { in: ['ISS_FIXO', 'ISS_VARIAVEL', 'ISS_RETIDO'] },
      },
      _sum: { valorTotal: true },
      _count: { id: true },
    })

    // Dívida ativa ISS
    const divida = await prisma.lancamentoTributario.aggregate({
      where: {
        municipioId: usuario.municipioId,
        situacao: { in: ['PROTESTADO', 'AJUIZADO'] },
      },
      _sum: { valorTotal: true },
      _count: { id: true },
    })

    // Por regime
    const porRegime = await prisma.contribuinte.groupBy({
      by: ['regimeTributario'],
      where: { municipioId: usuario.municipioId, situacao: 'ATIVO' },
      _count: { id: true },
    })

    return NextResponse.json({
      kpis: { total, ativos, suspensos, baixados, fisicos, juridicos,
               issAberto: Number(issAberto._sum.valorTotal ?? 0),
               issAbertoCount: issAberto._count.id,
               dividaAtiva: Number(divida._sum.valorTotal ?? 0),
               dividaAtivaCont: divida._count.id },
      arrecadacaoMensal: porMes,
      porRegime,
    })
  }

  if (id) {
    const contribuinte = await prisma.contribuinte.findFirst({
      where: { id, municipioId: usuario.municipioId },
      include: {
        imoveis: true,
        lancamentos: {
          where: { situacao: { notIn: ['PRESCRITO', 'CANCELADO'] } },
          orderBy: { vencimento: 'desc' },
          take: 50,
        },
        desss: { orderBy: { competencia: 'desc' }, take: 24 },
      },
    })
    if (!contribuinte) return NextResponse.json({ erro: 'Contribuinte não encontrado' }, { status: 404 })
    return NextResponse.json({ contribuinte })
  }

  const where: any = { municipioId: usuario.municipioId, ativo: true }
  if (situacao) where.situacao   = situacao
  if (tipo)     where.tipoPessoa = tipo
  if (cnae)     where.cnae       = { contains: cnae }
  if (busca) {
    where.OR = [
      { cpf:              { contains: busca.replace(/\D/g, '') } },
      { cnpj:             { contains: busca.replace(/\D/g, '') } },
      { nomeCompleto:     { contains: busca } },
      { razaoSocial:      { contains: busca } },
      { nomeFantasia:     { contains: busca } },
      { inscricaoMunicipal: { contains: busca } },
    ]
  }

  const contribuintes = await prisma.contribuinte.findMany({
    where, orderBy: { criadoEm: 'desc' }, take: 200,
    select: {
      id: true, inscricaoMunicipal: true, tipoPessoa: true, situacao: true,
      cpf: true, nomeCompleto: true,
      cnpj: true, razaoSocial: true, nomeFantasia: true,
      cnae: true, listaServicoLC116: true, regimeTributario: true,
      aliquotaISS: true, issFixoAnual: true,
      logradouro: true, bairro: true,
      email: true, telefone: true,
      _count: { select: { lancamentos: true, imoveis: true } },
    },
  })

  return NextResponse.json({ contribuintes, total: contribuintes.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    tipoPessoa:       z.enum(['FISICA', 'JURIDICA']),
    cpf:              z.string().optional(),
    nomeCompleto:     z.string().optional(),
    cnpj:             z.string().optional(),
    razaoSocial:      z.string().optional(),
    nomeFantasia:     z.string().optional(),
    inscricaoEstadual: z.string().optional(),
    dataAbertura:     z.string().optional(),
    naturezaJuridica: z.string().optional(),
    logradouro:       z.string().optional(),
    numero:           z.string().optional(),
    complemento:      z.string().optional(),
    bairro:           z.string().optional(),
    cidade:           z.string().optional(),
    uf:               z.string().optional(),
    cep:              z.string().optional(),
    email:            z.string().email().optional().or(z.literal('')),
    telefone:         z.string().optional(),
    responsavelNome:  z.string().optional(),
    responsavelCpf:   z.string().optional(),
    cnae:             z.string().optional(),
    listaServicoLC116: z.string().optional(),
    regimeTributario: z.string().optional(),
    aliquotaISS:      z.number().min(2).max(5).optional(),
    issFixoAnual:     z.number().optional(),
    responsavelRetencao: z.boolean().default(false),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  // Validações
  if (d.tipoPessoa === 'FISICA' && !d.cpf) {
    return NextResponse.json({ erro: 'CPF obrigatório para Pessoa Física' }, { status: 400 })
  }
  if (d.tipoPessoa === 'JURIDICA' && !d.cnpj) {
    return NextResponse.json({ erro: 'CNPJ obrigatório para Pessoa Jurídica' }, { status: 400 })
  }

  const cpf  = d.cpf  ? d.cpf.replace(/\D/g, '')  : undefined
  const cnpj = d.cnpj ? d.cnpj.replace(/\D/g, '') : undefined

  // Checa duplicidade
  if (cpf) {
    const ex = await prisma.contribuinte.findFirst({ where: { municipioId: usuario.municipioId, cpf } })
    if (ex) return NextResponse.json({ erro: `CPF já cadastrado — Inscrição: ${ex.inscricaoMunicipal}` }, { status: 409 })
  }
  if (cnpj) {
    const ex = await prisma.contribuinte.findFirst({ where: { municipioId: usuario.municipioId, cnpj } })
    if (ex) return NextResponse.json({ erro: `CNPJ já cadastrado — Inscrição: ${ex.inscricaoMunicipal}` }, { status: 409 })
  }

  // Alíquota padrão se não informada
  const aliquota = d.aliquotaISS
    ?? (d.listaServicoLC116 ? aliquotaPadrao(d.listaServicoLC116) : 3.0)

  const inscricaoMunicipal = await gerarInscricao(usuario.municipioId, d.tipoPessoa)

  const contribuinte = await prisma.contribuinte.create({
    data: {
      municipioId: usuario.municipioId,
      inscricaoMunicipal,
      tipoPessoa: d.tipoPessoa,
      cpf, nomeCompleto: d.nomeCompleto,
      cnpj, razaoSocial: d.razaoSocial, nomeFantasia: d.nomeFantasia,
      inscricaoEstadual: d.inscricaoEstadual,
      dataAbertura: d.dataAbertura ? new Date(d.dataAbertura) : null,
      naturezaJuridica: d.naturezaJuridica,
      logradouro: d.logradouro, numero: d.numero, complemento: d.complemento,
      bairro: d.bairro, cidade: d.cidade ?? 'Biritinga', uf: d.uf ?? 'BA', cep: d.cep,
      email: d.email || null, telefone: d.telefone,
      responsavelNome: d.responsavelNome, responsavelCpf: d.responsavelCpf,
      cnae: d.cnae, listaServicoLC116: d.listaServicoLC116,
      regimeTributario: d.regimeTributario,
      aliquotaISS: aliquota,
      issFixoAnual: d.issFixoAnual,
      responsavelRetencao: d.responsavelRetencao,
      usuarioId: usuario.id,
    },
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'CADASTRAR_CONTRIBUINTE', entidade: 'Contribuinte', entidadeId: contribuinte.id,
    detalhes: { inscricaoMunicipal, tipoPessoa: d.tipoPessoa, cnpj, cpf },
  })

  return NextResponse.json({ contribuinte, inscricaoMunicipal }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, ...dados } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const contribuinte = await prisma.contribuinte.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!contribuinte) return NextResponse.json({ erro: 'Contribuinte não encontrado' }, { status: 404 })

  if (acao === 'ALTERAR_SITUACAO') {
    const sit = z.enum(['ATIVO','SUSPENSO','BAIXADO','CANCELADO','INAPTO']).safeParse(dados.situacao)
    if (!sit.success) return NextResponse.json({ erro: 'Situação inválida' }, { status: 400 })
    await prisma.contribuinte.update({ where: { id }, data: { situacao: sit.data, dataEncerramento: sit.data === 'BAIXADO' ? new Date() : undefined } })
    await auditLog({
      municipioId: usuario.municipioId, usuarioId: usuario.id,
      acao: 'ALTERAR_SITUACAO_CONTRIBUINTE', entidade: 'Contribuinte', entidadeId: id,
      detalhes: { inscricaoMunicipal: contribuinte.inscricaoMunicipal, de: contribuinte.situacao, para: sit.data },
    })
    return NextResponse.json({ sucesso: true })
  }

  // Atualização geral de dados cadastrais
  const UpdateSchema = z.object({
    email:            z.string().email().optional().or(z.literal('')),
    telefone:         z.string().optional(),
    logradouro:       z.string().optional(),
    numero:           z.string().optional(),
    bairro:           z.string().optional(),
    cep:              z.string().optional(),
    responsavelNome:  z.string().optional(),
    responsavelCpf:   z.string().optional(),
    cnae:             z.string().optional(),
    listaServicoLC116: z.string().optional(),
    regimeTributario: z.string().optional(),
    aliquotaISS:      z.number().min(2).max(5).optional(),
    issFixoAnual:     z.number().optional(),
    responsavelRetencao: z.boolean().optional(),
  })
  const val = UpdateSchema.safeParse(dados)
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })

  await prisma.contribuinte.update({ where: { id }, data: { ...val.data, email: val.data.email || null } })
  return NextResponse.json({ sucesso: true })
}
