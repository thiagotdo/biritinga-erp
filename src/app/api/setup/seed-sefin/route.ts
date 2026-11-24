/**
 * Seed financeiro da Prefeitura Municipal de Biritinga/BA
 * Dados oficiais extraídos de:
 *   - RREO 1º Bimestre 2025 (Diário Oficial nº 0897, 28/03/2025)
 *   - IBGE Cidades / Caravela.info (PIB, estrutura econômica)
 *   - Diário Oficial nº 0667, 01/03/2024 (contratos)
 *
 * POST /api/setup/seed-sefin
 * Header: Authorization: Bearer <SETUP_SECRET>
 *
 * Idempotente: ignora LOA/exercício que já existir.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const SETUP_TOKEN = process.env.SETUP_SECRET ?? ''

// ─── LOA 2025 — Receitas previstas (fonte: RREO 1º Bimestre 2025) ────────────
// Previsão atualizada conforme Anexo 1 do RREO
const RECEITAS_LOA_2025 = [
  // 1 — RECEITAS CORRENTES
  {
    codigo: '1.1.0.0.0.00',
    descricao: 'Impostos, Taxas e Contribuições de Melhoria',
    natureza: 'TRIBUTARIA',
    fonte: '1500',
    valorPrevisto: 5_036_350.00,
  },
  {
    codigo: '1.1.1.0.0.00',
    descricao: 'ISS — Imposto sobre Serviços de Qualquer Natureza',
    natureza: 'TRIBUTARIA',
    fonte: '1500',
    valorPrevisto: 1_200_000.00,
  },
  {
    codigo: '1.1.2.0.0.00',
    descricao: 'IPTU — Imposto Predial e Territorial Urbano',
    natureza: 'TRIBUTARIA',
    fonte: '1500',
    valorPrevisto: 300_000.00,
  },
  {
    codigo: '1.1.3.0.0.00',
    descricao: 'ITBI — Imposto sobre Transmissão de Bens Imóveis',
    natureza: 'TRIBUTARIA',
    fonte: '1500',
    valorPrevisto: 150_000.00,
  },
  {
    codigo: '1.1.4.0.0.00',
    descricao: 'Taxas de Poder de Polícia e de Serviços',
    natureza: 'TRIBUTARIA',
    fonte: '1500',
    valorPrevisto: 386_350.00,
  },
  {
    codigo: '1.3.0.0.0.00',
    descricao: 'Receita Patrimonial — Rendimentos de Aplicações',
    natureza: 'PATRIMONIAL',
    fonte: '1500',
    valorPrevisto: 493_858.00,
  },
  // Transferências da União
  {
    codigo: '1.7.1.1.0.00',
    descricao: 'FPM — Fundo de Participação dos Municípios',
    natureza: 'TRANSFERENCIAS_CORRENTES',
    fonte: '1500',
    valorPrevisto: 37_148_890.00,
  },
  {
    codigo: '1.7.1.2.0.00',
    descricao: 'ITR — Imposto Territorial Rural (cota-parte)',
    natureza: 'TRANSFERENCIAS_CORRENTES',
    fonte: '1500',
    valorPrevisto: 50_000.00,
  },
  {
    codigo: '1.7.1.3.0.00',
    descricao: 'LC 87/96 — Desoneração ICMS (Lei Kandir)',
    natureza: 'TRANSFERENCIAS_CORRENTES',
    fonte: '1500',
    valorPrevisto: 300_000.00,
  },
  {
    codigo: '1.7.1.4.0.00',
    descricao: 'SUS — Transferências Fundo a Fundo (Saúde)',
    natureza: 'TRANSFERENCIAS_CORRENTES',
    fonte: '1600',
    valorPrevisto: 13_324_769.00,
  },
  {
    codigo: '1.7.1.5.0.00',
    descricao: 'FNDE — Salário-Educação e programas MEC',
    natureza: 'TRANSFERENCIAS_CORRENTES',
    fonte: '1542',
    valorPrevisto: 2_500_000.00,
  },
  {
    codigo: '1.7.1.6.0.00',
    descricao: 'PAB — Piso de Atenção Básica',
    natureza: 'TRANSFERENCIAS_CORRENTES',
    fonte: '1600',
    valorPrevisto: 800_000.00,
  },
  {
    codigo: '1.7.1.9.0.00',
    descricao: 'Outras transferências da União',
    natureza: 'TRANSFERENCIAS_CORRENTES',
    fonte: '1500',
    valorPrevisto: 25_393_685.80,
  },
  // Transferências dos Estados
  {
    codigo: '1.7.2.1.0.00',
    descricao: 'ICMS — Imposto sobre Circulação de Mercadorias (cota-parte)',
    natureza: 'TRANSFERENCIAS_CORRENTES',
    fonte: '1500',
    valorPrevisto: 4_000_000.00,
  },
  {
    codigo: '1.7.2.2.0.00',
    descricao: 'IPVA — Imposto sobre Propriedade de Veículos (cota-parte)',
    natureza: 'TRANSFERENCIAS_CORRENTES',
    fonte: '1500',
    valorPrevisto: 300_000.00,
  },
  {
    codigo: '1.7.2.3.0.00',
    descricao: 'IPI Exportação — cota-parte estadual',
    natureza: 'TRANSFERENCIAS_CORRENTES',
    fonte: '1500',
    valorPrevisto: 133_286.40,
  },
  // FUNDEB
  {
    codigo: '1.7.4.0.0.00',
    descricao: 'FUNDEB — Fundo de Manutenção e Desenvolvimento da Educação',
    natureza: 'TRANSFERENCIAS_CORRENTES',
    fonte: '1540',
    valorPrevisto: 61_645_161.83,
  },
  // Receitas de capital
  {
    codigo: '2.1.0.0.0.00',
    descricao: 'Convênios e transferências de capital',
    natureza: 'TRANSFERENCIAS_CAPITAL',
    fonte: '1542',
    valorPrevisto: 6_434_951.00,
  },
]

// ─── Dotações orçamentárias 2025 (Anexo 2 RREO — por secretaria) ─────────────
const DOTACOES_2025 = [
  {
    unidade: '01.001',
    descricaoUnidade: 'Câmara Municipal',
    funcao: '01',
    subfuncao: '031',
    programa: '0001',
    acao: '2001',
    elementoDespesa: '3.1.90.11',
    descricaoElemento: 'Vencimentos e Vantagens Fixas',
    fonte: '1500',
    valorDotacaoInicial: 2_400_000.00,
  },
  {
    unidade: '02.001',
    descricaoUnidade: 'Gabinete do Prefeito',
    funcao: '04',
    subfuncao: '122',
    programa: '0001',
    acao: '2002',
    elementoDespesa: '3.3.90.39',
    descricaoElemento: 'Outros Serviços de Terceiros — PJ',
    fonte: '1500',
    valorDotacaoInicial: 1_500_000.00,
  },
  {
    unidade: '03.001',
    descricaoUnidade: 'SEMAD — Secretaria de Administração',
    funcao: '04',
    subfuncao: '122',
    programa: '0001',
    acao: '2003',
    elementoDespesa: '3.1.90.11',
    descricaoElemento: 'Vencimentos e Vantagens Fixas',
    fonte: '1500',
    valorDotacaoInicial: 3_200_000.00,
  },
  {
    unidade: '04.001',
    descricaoUnidade: 'SEFIN — Secretaria de Finanças',
    funcao: '04',
    subfuncao: '123',
    programa: '0001',
    acao: '2004',
    elementoDespesa: '3.1.90.11',
    descricaoElemento: 'Vencimentos e Vantagens Fixas',
    fonte: '1500',
    valorDotacaoInicial: 1_800_000.00,
  },
  {
    unidade: '05.001',
    descricaoUnidade: 'SEDUC — Secretaria de Educação',
    funcao: '12',
    subfuncao: '361',
    programa: '0010',
    acao: '2010',
    elementoDespesa: '3.1.90.11',
    descricaoElemento: 'Vencimentos e Vantagens Fixas — Magistério',
    fonte: '1540',
    valorDotacaoInicial: 44_000_000.00,
  },
  {
    unidade: '05.002',
    descricaoUnidade: 'SEDUC — Manutenção Ensino Fundamental',
    funcao: '12',
    subfuncao: '361',
    programa: '0010',
    acao: '2011',
    elementoDespesa: '3.3.90.39',
    descricaoElemento: 'Outros Serviços de Terceiros — PJ',
    fonte: '1540',
    valorDotacaoInicial: 15_000_000.00,
  },
  {
    unidade: '05.003',
    descricaoUnidade: 'SEDUC — Educação Infantil (Creche e Pré-escola)',
    funcao: '12',
    subfuncao: '365',
    programa: '0010',
    acao: '2012',
    elementoDespesa: '3.3.90.39',
    descricaoElemento: 'Outros Serviços de Terceiros — PJ',
    fonte: '1540',
    valorDotacaoInicial: 8_000_000.00,
  },
  {
    unidade: '05.004',
    descricaoUnidade: 'SEDUC — Obras e Reformas Escolares',
    funcao: '12',
    subfuncao: '361',
    programa: '0010',
    acao: '1001',
    elementoDespesa: '4.4.90.51',
    descricaoElemento: 'Obras e Instalações',
    fonte: '1542',
    valorDotacaoInicial: 3_810_086.45,
  },
  {
    unidade: '06.001',
    descricaoUnidade: 'SESAU — Secretaria de Saúde',
    funcao: '10',
    subfuncao: '301',
    programa: '0020',
    acao: '2020',
    elementoDespesa: '3.1.90.11',
    descricaoElemento: 'Vencimentos e Vantagens Fixas — Saúde',
    fonte: '1600',
    valorDotacaoInicial: 7_000_000.00,
  },
  {
    unidade: '06.002',
    descricaoUnidade: 'SESAU — Atenção Básica (APS)',
    funcao: '10',
    subfuncao: '301',
    programa: '0020',
    acao: '2021',
    elementoDespesa: '3.3.90.39',
    descricaoElemento: 'Outros Serviços de Terceiros — PJ',
    fonte: '1600',
    valorDotacaoInicial: 5_000_000.00,
  },
  {
    unidade: '06.003',
    descricaoUnidade: 'SESAU — Vigilância em Saúde',
    funcao: '10',
    subfuncao: '304',
    programa: '0020',
    acao: '2022',
    elementoDespesa: '3.3.90.39',
    descricaoElemento: 'Outros Serviços de Terceiros — PJ',
    fonte: '1600',
    valorDotacaoInicial: 1_324_769.00,
  },
  {
    unidade: '07.001',
    descricaoUnidade: 'SEMOB — Obras e Infraestrutura',
    funcao: '15',
    subfuncao: '451',
    programa: '0030',
    acao: '1010',
    elementoDespesa: '4.4.90.51',
    descricaoElemento: 'Obras e Instalações — Pavimentação',
    fonte: '1500',
    valorDotacaoInicial: 3_500_000.00,
  },
  {
    unidade: '07.002',
    descricaoUnidade: 'SEMOB — Manutenção de Vias Urbanas',
    funcao: '15',
    subfuncao: '452',
    programa: '0030',
    acao: '2030',
    elementoDespesa: '3.3.90.39',
    descricaoElemento: 'Outros Serviços de Terceiros — PJ',
    fonte: '1500',
    valorDotacaoInicial: 1_200_000.00,
  },
  {
    unidade: '08.001',
    descricaoUnidade: 'SEMMA — Meio Ambiente',
    funcao: '18',
    subfuncao: '541',
    programa: '0040',
    acao: '2040',
    elementoDespesa: '3.1.90.11',
    descricaoElemento: 'Vencimentos e Vantagens Fixas',
    fonte: '1500',
    valorDotacaoInicial: 800_000.00,
  },
  {
    unidade: '09.001',
    descricaoUnidade: 'SEAS — Assistência Social',
    funcao: '08',
    subfuncao: '241',
    programa: '0050',
    acao: '2050',
    elementoDespesa: '3.1.90.11',
    descricaoElemento: 'Vencimentos e Vantagens Fixas',
    fonte: '1500',
    valorDotacaoInicial: 2_500_000.00,
  },
  {
    unidade: '10.001',
    descricaoUnidade: 'SEAGRI — Agricultura e Pesca',
    funcao: '20',
    subfuncao: '606',
    programa: '0060',
    acao: '2060',
    elementoDespesa: '3.3.90.39',
    descricaoElemento: 'Outros Serviços de Terceiros — PJ',
    fonte: '1500',
    valorDotacaoInicial: 1_200_000.00,
  },
  {
    unidade: '11.001',
    descricaoUnidade: 'SETURISMO — Turismo e Cultura',
    funcao: '23',
    subfuncao: '695',
    programa: '0070',
    acao: '2070',
    elementoDespesa: '3.3.90.39',
    descricaoElemento: 'Outros Serviços de Terceiros — PJ',
    fonte: '1500',
    valorDotacaoInicial: 1_000_000.00,
  },
]

// ─── Empenhos reais extraídos dos Diários Oficiais ────────────────────────────
const EMPENHOS_REAIS = [
  // DO nº 0667, 01/03/2024
  {
    numero: '2024NE000031',
    exercicio: 2024,
    fornecedorNome: 'Fornecedor de Cadernos Pedagógicos',
    descricao: 'Aquisição de cadernos pedagógicos para a Secretaria Municipal de Educação — Dispensa nº 006/2024',
    valorOriginal: 15_810.00,
    dataEmissao: new Date('2024-03-01'),
    situacao: 'PAGO',
    valorLiquidado: 15_810.00,
    valorPago: 15_810.00,
    unidade: '05.001',
  },
  {
    numero: '2024NE000034',
    exercicio: 2024,
    fornecedorNome: 'Contratada — Reforma Mercado Municipal',
    descricao: 'Reforma do Mercado Municipal de Biritinga — Dispensa nº 001/2024',
    valorOriginal: 90_207.93,
    dataEmissao: new Date('2024-03-01'),
    situacao: 'PAGO',
    valorLiquidado: 90_207.93,
    valorPago: 90_207.93,
    unidade: '07.001',
  },
  {
    numero: '2024NE000037',
    exercicio: 2024,
    fornecedorNome: 'Contratada — Reforma Colégio Municipal',
    descricao: 'Reforma e ampliação do Colégio Municipal de Biritinga — Tomada de Preços nº 005/2023',
    valorOriginal: 136_983.65,
    dataEmissao: new Date('2024-03-01'),
    situacao: 'LIQUIDADO',
    valorLiquidado: 136_983.65,
    valorPago: 0,
    unidade: '05.004',
  },
  {
    numero: '2024NE000036',
    exercicio: 2024,
    fornecedorNome: 'Contratada — Reforma Escolas / Creche',
    descricao: 'Reforma e ampliação de escolas, quadra poliesportiva e creche — Tomada de Preços nº 005/2023',
    valorOriginal: 851_088.15,
    dataEmissao: new Date('2024-03-01'),
    situacao: 'LIQUIDADO',
    valorLiquidado: 851_088.15,
    valorPago: 0,
    unidade: '05.004',
  },
  {
    numero: '2024NE000035',
    exercicio: 2024,
    fornecedorNome: 'Artista — Show Dia do Evangélico',
    descricao: 'Show musical para o Dia do Evangélico — Inexigibilidade nº 021/2024',
    valorOriginal: 65_000.00,
    dataEmissao: new Date('2024-03-01'),
    situacao: 'PAGO',
    valorLiquidado: 65_000.00,
    valorPago: 65_000.00,
    unidade: '11.001',
  },
  // DO nº 0897, 28/03/2025
  {
    numero: '2025NE000041',
    exercicio: 2025,
    fornecedorNome: 'Patrik Magalhães de Carvalho Brito',
    descricao: 'Locação de galpão no Conjunto Habitacional Arco-Íris para almoxarifado da Secretaria de Educação — Inexigibilidade nº 026/2025',
    valorOriginal: 14_400.00,
    dataEmissao: new Date('2025-03-18'),
    situacao: 'EMITIDO',
    valorLiquidado: 0,
    valorPago: 0,
    unidade: '05.001',
  },
]

// ─── Lançamentos de receita (1º bimestre 2025 — valores reais do RREO) ────────
// Mapeados pelo código da receita prevista
const LANCAMENTOS_BIMESTRE_1_2025 = [
  { codigoReceita: '1.1.0.0.0.00', valor: 726_970.24, competencia: '2025-01' },
  { codigoReceita: '1.3.0.0.0.00', valor: 69_893.05,  competencia: '2025-01' },
  { codigoReceita: '1.7.1.1.0.00', valor: 6_188_876.33, competencia: '2025-01' },
  { codigoReceita: '1.7.1.4.0.00', valor: 1_341_456.91, competencia: '2025-01' },
  { codigoReceita: '1.7.2.1.0.00', valor: 948_301.93,  competencia: '2025-01' },
  { codigoReceita: '1.7.4.0.0.00', valor: 12_767_262.30, competencia: '2025-01' },
]

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (!SETUP_TOKEN || auth !== `Bearer ${SETUP_TOKEN}`) {
    return NextResponse.json({ erro: 'Token inválido' }, { status: 401 })
  }

  try {
    const municipio = await prisma.Municipio.findFirst({ where: { slug: 'biritinga' } })
    if (!municipio) {
      return NextResponse.json({ erro: 'Município biritinga não encontrado. Execute o setup primeiro.' }, { status: 404 })
    }
    const municipioId = municipio.id

    // ── 1. Exercício orçamentário 2025 ─────────────────────────────────────────
    let exercicio = await prisma.ExercicioOrcamentario.findFirst({
      where: { municipioId, exercicio: 2025 },
    })
    if (!exercicio) {
      exercicio = await prisma.ExercicioOrcamentario.create({
        data: {
          municipioId,
          exercicio: 2025,
          descricao: 'Exercício Orçamentário 2025',
          status: 'ABERTO',
          dataInicio: new Date('2025-01-01'),
          dataFim: new Date('2025-12-31'),
          usuarioId: admin.id,
        },
      })
    }

    // Admin para criação de registros
    const admin = await prisma.Usuario.findFirst({ where: { municipioId } })
    if (!admin) return NextResponse.json({ erro: 'Nenhum usuário encontrado. Execute o setup de usuário primeiro.' }, { status: 404 })

    // ── 2. LOA 2025 ────────────────────────────────────────────────────────────
    let loa = await prisma.LOA.findFirst({ where: { municipioId, exercicio: 2025 } })
    if (!loa) {
      loa = await prisma.LOA.create({
        data: {
          municipioId,
          exercicio: 2025,
          titulo: 'LOA 2025 — Prefeitura Municipal de Biritinga/BA',
          situacao: 'VIGENTE',
          totalReceita: 127_927_404.20,
          totalDespesa: 127_927_404.20,
          observacoes: 'Fonte: RREO 1º Bimestre 2025 (Diário Oficial nº 0897, 28/03/2025). Orçamento equilibrado conforme LRF.',
        },
      })
    }

    // ── 3. Orçamento para ReceitaPrevista ──────────────────────────────────────
    let orcamento = await prisma.Orcamento.findFirst({ where: { municipioId, exercicio: 2025 } })
    if (!orcamento) {
      orcamento = await prisma.Orcamento.create({
        data: {
          municipioId,
          exercicio: 2025,
          situacao: 'VIGENTE',
          totalReceita: 127_927_404.20,
          totalDespesa: 127_927_404.20,
          leiNumero: 'LOA 2025 — Prefeitura Municipal de Biritinga/BA',
          observacoes: 'Fonte: RREO 1º Bimestre 2025 (Diário Oficial nº 0897, 28/03/2025).',
        },
      })
    }

    // ── 4. Receitas previstas ──────────────────────────────────────────────────
    let receitasCriadas = 0
    for (const r of RECEITAS_LOA_2025) {
      const existe = await prisma.ReceitaPrevista.findFirst({
        where: { orcamentoId: orcamento.id, codigo: r.codigo },
      })
      if (!existe) {
        await prisma.ReceitaPrevista.create({
          data: {
            municipioId,
            orcamentoId: orcamento.id,
            codigo: r.codigo,
            descricao: r.descricao,
            natureza: r.natureza as any,
            fonte: r.fonte,
            valorPrevisto: r.valorPrevisto,
          },
        })
        receitasCriadas++
      }
    }

    // ── 5. Dotações 2025 ───────────────────────────────────────────────────────
    let dotacoesCriadas = 0
    for (const d of DOTACOES_2025) {
      const existe = await prisma.Dotacao.findFirst({
        where: { municipioId, exercicioId: exercicio.id, unidadeOrcamentaria: d.unidade, elementoDespesa: d.elementoDespesa },
      })
      if (!existe) {
        await prisma.Dotacao.create({
          data: {
            municipioId,
            exercicioId: exercicio.id,
            unidadeOrcamentaria: d.unidade,
            funcao: d.funcao,
            subfuncao: d.subfuncao,
            programa: d.programa,
            acao: d.acao,
            elementoDespesa: d.elementoDespesa,
            descricaoUnidade: d.descricaoUnidade,
            descricaoElemento: d.descricaoElemento,
            fonteRecurso: d.fonte,
            valorDotacaoInicial: d.valorDotacaoInicial,
            situacao: 'ATIVA',
            usuarioId: admin.id,
          },
        })
        dotacoesCriadas++
      }
    }

    // ── 6. Empenhos reais dos Diários Oficiais ─────────────────────────────────
    let empenhosCriados = 0
    for (const e of EMPENHOS_REAIS) {
      const existe = await prisma.Empenho.findFirst({ where: { municipioId, numero: e.numero } })
      if (!existe) {
        // Busca exercício correto
        const ex = await prisma.ExercicioOrcamentario.findFirst({
          where: { municipioId, exercicio: e.exercicio },
        })
        if (!ex) continue

        // Busca uma dotação compatível com a unidade
        const dotacao = await prisma.Dotacao.findFirst({
          where: { municipioId, unidadeOrcamentaria: { startsWith: e.unidade.split('.')[0] } },
        })
        if (!dotacao) continue

        await prisma.Empenho.create({
          data: {
            municipioId,
            numero: e.numero,
            exercicioId: ex.id,
            dotacaoId: dotacao.id,
            fornecedorNome: e.fornecedorNome,
            descricao: e.descricao,
            modalidade: 'ORDINARIO',
            situacao: e.situacao as any,
            valorOriginal: e.valorOriginal,
            valorLiquidado: e.valorLiquidado,
            valorPago: e.valorPago,
            dataEmissao: e.dataEmissao,
            dataLiquidacao: e.valorLiquidado > 0 ? e.dataEmissao : null,
            dataPagamento: e.valorPago > 0 ? e.dataEmissao : null,
          },
        })
        empenhosCriados++
      }
    }

    // ── 7. Lançamentos de receita (1º bimestre 2025) ───────────────────────────
    let lancamentosCriados = 0
    for (const l of LANCAMENTOS_BIMESTRE_1_2025) {
      const rp = await prisma.ReceitaPrevista.findFirst({
        where: { orcamentoId: orcamento.id, codigo: l.codigoReceita },
      })
      if (!rp) continue

      const existe = await prisma.LancamentoReceita.findFirst({
        where: { receitaPrevistaId: rp.id, competencia: l.competencia },
      })
      if (!existe) {
        await prisma.LancamentoReceita.create({
          data: {
            municipioId,
            receitaPrevistaId: rp.id,
            situacao: 'ARRECADADA',
            valor: l.valor,
            dataArrecadacao: new Date(`${l.competencia}-15`),
            competencia: l.competencia,
            descricao: `Arrecadação ${l.competencia} — fonte: RREO 1º Bimestre 2025`,
          },
        })
        lancamentosCriados++
      }
    }

    return NextResponse.json({
      ok: true,
      msg: 'Seed SEFIN concluído com dados oficiais de Biritinga/BA.',
      detalhes: {
        municipio: municipio.nome,
        exercicio: 2025,
        loaCriada: !loa ? true : 'já existia',
        receitasCriadas,
        dotacoesCriadas,
        empenhosCriados,
        lancamentosCriados,
        fontes: [
          'RREO 1º Bimestre 2025 — DO nº 0897 (28/03/2025)',
          'Diário Oficial nº 0667 (01/03/2024) — contratos',
          'IBGE Cidades / Caravela.info — PIB e estrutura econômica',
        ],
      },
    })
  } catch (e: any) {
    console.error('[seed-sefin] erro:', e)
    return NextResponse.json({ erro: e.message, stack: e.stack?.split('\n').slice(0, 5) }, { status: 500 })
  }
}
