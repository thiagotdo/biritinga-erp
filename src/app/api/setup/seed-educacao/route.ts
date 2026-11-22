/**
 * Seed das escolas municipais de Biritinga — dados do Censo Escolar/INEP 2024.
 * Executar UMA VEZ: POST /api/setup/seed-educacao
 * com header Authorization: Bearer <SETUP_SECRET>
 *
 * Fonte: escol.as / INEP / Censo Escolar 2024
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const SETUP_TOKEN = process.env.SETUP_SECRET ?? ''

// ─── Escolas reais de Biritinga — Fonte: INEP/Censo Escolar 2024 ──────────────
const ESCOLAS_BIRITINGA = [
  {
    nome: 'Colégio Municipal de Biritinga',
    inep: '29136059',
    logradouro: 'Rua Presidente Médice, s/n',
    bairro: 'Centro',
    zona: 'URBANA',
    salas: 10,
    capacidadeTotal: 400,
    etapas: ['FUNDAMENTAL_II'],
  },
  {
    nome: 'Escola Municipal Aristeu Barbosa',
    inep: '29136091',
    logradouro: 'Fazenda Aristeu Barbosa, Prédio Escolar',
    bairro: 'Zona Rural',
    zona: 'RURAL',
    salas: 4,
    capacidadeTotal: 100,
    etapas: ['CRECHE', 'PRE_ESCOLA', 'FUNDAMENTAL_I'],
  },
  {
    nome: 'Escola Municipal Alice Cruz',
    inep: '29136075',
    logradouro: 'Fazenda Taboa, Prédio Escolar',
    bairro: 'Zona Rural',
    zona: 'RURAL',
    salas: 2,
    capacidadeTotal: 60,
    etapas: ['CRECHE', 'PRE_ESCOLA'],
  },
  {
    nome: 'Escola Municipal Ana Neri',
    inep: '29136083',
    logradouro: 'Fazenda Campo da Ema, Prédio Escolar',
    bairro: 'Zona Rural',
    zona: 'RURAL',
    salas: 5,
    capacidadeTotal: 150,
    etapas: ['CRECHE', 'PRE_ESCOLA', 'FUNDAMENTAL_I', 'FUNDAMENTAL_II', 'EJA_FUNDAMENTAL'],
  },
  {
    nome: 'Centro Educacional Dom Bosco',
    inep: '29136040',
    logradouro: 'Rua Dom Bosco, s/n',
    bairro: 'Centro',
    zona: 'URBANA',
    salas: 8,
    capacidadeTotal: 320,
    etapas: ['FUNDAMENTAL_I', 'FUNDAMENTAL_II'],
  },
  {
    nome: 'Escola Municipal Álvaro Pedreira',
    inep: '29136369',
    logradouro: 'Fazenda Bebedouro, Prédio Próprio',
    bairro: 'Zona Rural',
    zona: 'RURAL',
    salas: 3,
    capacidadeTotal: 90,
    etapas: ['FUNDAMENTAL_I'],
  },
  {
    nome: 'Escola Municipal Boa Sorte',
    inep: '29379873',
    logradouro: 'Fazenda Boa Sorte, Prédio Escolar',
    bairro: 'Zona Rural',
    zona: 'RURAL',
    salas: 3,
    capacidadeTotal: 80,
    etapas: ['CRECHE', 'PRE_ESCOLA', 'FUNDAMENTAL_I'],
  },
  {
    nome: 'Escola Municipal Castro Alves',
    inep: '29136113',
    logradouro: 'Fazenda Castro Alves, Prédio Escolar',
    bairro: 'Zona Rural',
    zona: 'RURAL',
    salas: 4,
    capacidadeTotal: 100,
    etapas: ['FUNDAMENTAL_I', 'EJA_FUNDAMENTAL'],
  },
  {
    nome: 'Escola Municipal Eujácio Simões',
    inep: '29136393',
    logradouro: 'Rua Deusdilton Rodrigues Pinho, 95',
    bairro: 'Centro',
    zona: 'URBANA',
    salas: 6,
    capacidadeTotal: 200,
    etapas: ['FUNDAMENTAL_I'],
  },
  {
    nome: 'Escola Municipal Joana Angélica',
    inep: '29136415',
    logradouro: 'Fazenda Montanha, Zona Rural',
    bairro: 'Zona Rural',
    zona: 'RURAL',
    salas: 4,
    capacidadeTotal: 100,
    etapas: ['CRECHE', 'PRE_ESCOLA', 'FUNDAMENTAL_I', 'EJA_FUNDAMENTAL'],
  },
  {
    nome: 'Escola Municipal Manoel Pereira Cardoso',
    inep: '29136121',
    logradouro: 'Fazenda Manoel Pereira, Prédio Escolar',
    bairro: 'Zona Rural',
    zona: 'RURAL',
    salas: 3,
    capacidadeTotal: 80,
    etapas: ['FUNDAMENTAL_I', 'EJA_FUNDAMENTAL'],
  },
  {
    nome: 'Escola Municipal Manoel Souza',
    inep: '29136431',
    logradouro: 'Fazenda Vila Nova, Prédio Escolar',
    bairro: 'Zona Rural',
    zona: 'RURAL',
    salas: 5,
    capacidadeTotal: 140,
    etapas: ['CRECHE', 'PRE_ESCOLA', 'FUNDAMENTAL_I', 'FUNDAMENTAL_II', 'EJA_FUNDAMENTAL'],
  },
  {
    nome: 'Escola Municipal Maria Quitéria',
    inep: '29136130',
    logradouro: 'Fazenda Cardoso, Prédio Escolar',
    bairro: 'Zona Rural',
    zona: 'RURAL',
    salas: 3,
    capacidadeTotal: 90,
    etapas: ['FUNDAMENTAL_I'],
  },
  {
    nome: 'Escola Municipal Marinho Curcino',
    inep: '29136148',
    logradouro: 'Fazenda Marinho Curcino, Prédio Escolar',
    bairro: 'Zona Rural',
    zona: 'RURAL',
    salas: 3,
    capacidadeTotal: 80,
    etapas: ['FUNDAMENTAL_I', 'EJA_FUNDAMENTAL'],
  },
  {
    nome: 'Escola Municipal Nossa Senhora das Graças',
    inep: '29136156',
    logradouro: 'Fazenda Nossa Senhora das Graças, Prédio Escolar',
    bairro: 'Zona Rural',
    zona: 'RURAL',
    salas: 4,
    capacidadeTotal: 100,
    etapas: ['CRECHE', 'PRE_ESCOLA', 'FUNDAMENTAL_I'],
  },
  {
    nome: 'Escola Municipal Osvaldo Cruz',
    inep: '29136199',
    logradouro: 'Fazenda Buraco do Dinheiro, Prédio Escolar',
    bairro: 'Zona Rural',
    zona: 'RURAL',
    salas: 3,
    capacidadeTotal: 60,
    etapas: ['CRECHE', 'PRE_ESCOLA', 'EJA_FUNDAMENTAL'],
  },
  {
    nome: 'Escola Municipal Rubem Braga',
    inep: '29136164',
    logradouro: 'Fazenda Beira do Rio, Prédio Escolar',
    bairro: 'Zona Rural',
    zona: 'RURAL',
    salas: 3,
    capacidadeTotal: 80,
    etapas: ['FUNDAMENTAL_I'],
  },
  {
    nome: 'Escola Municipal Rui Barbosa',
    inep: '29136202',
    logradouro: 'Fazenda Barro Branco, Prédio Escolar',
    bairro: 'Zona Rural',
    zona: 'RURAL',
    salas: 2,
    capacidadeTotal: 60,
    etapas: ['CRECHE', 'PRE_ESCOLA'],
  },
  {
    nome: 'Escola Municipal Santo Antônio',
    inep: '29136334',
    logradouro: 'Fazenda Candeia, Prédio Escolar',
    bairro: 'Zona Rural',
    zona: 'RURAL',
    salas: 4,
    capacidadeTotal: 100,
    etapas: ['CRECHE', 'PRE_ESCOLA', 'FUNDAMENTAL_I'],
  },
  {
    nome: 'Escola Municipal São Felipe',
    inep: '29136210',
    logradouro: 'Fazenda Pai Felipe, Prédio Escolar',
    bairro: 'Zona Rural',
    zona: 'RURAL',
    salas: 3,
    capacidadeTotal: 80,
    etapas: ['FUNDAMENTAL_I', 'EJA_FUNDAMENTAL'],
  },
  {
    nome: 'Escola Municipal São Joaquim',
    inep: '29136229',
    logradouro: 'Fazenda São Joaquim, Prédio Escolar',
    bairro: 'Zona Rural',
    zona: 'RURAL',
    salas: 3,
    capacidadeTotal: 80,
    etapas: ['FUNDAMENTAL_I', 'EJA_FUNDAMENTAL'],
  },
  {
    nome: 'Escola Municipal São Luiz',
    inep: '29136245',
    logradouro: 'Fazenda Coqueiro, Prédio Escolar',
    bairro: 'Zona Rural',
    zona: 'RURAL',
    salas: 4,
    capacidadeTotal: 100,
    etapas: ['CRECHE', 'PRE_ESCOLA', 'FUNDAMENTAL_I', 'EJA_FUNDAMENTAL'],
  },
  {
    nome: 'Escola Municipal São Sebastião',
    inep: '29136253',
    logradouro: 'Fazenda São Sebastião, Prédio Escolar',
    bairro: 'Zona Rural',
    zona: 'RURAL',
    salas: 3,
    capacidadeTotal: 80,
    etapas: ['FUNDAMENTAL_I', 'EJA_FUNDAMENTAL'],
  },
  {
    nome: 'Escola Municipal Senhor do Bonfim',
    inep: '29136270',
    logradouro: 'Fazenda Quipe, Prédio Escolar',
    bairro: 'Zona Rural',
    zona: 'RURAL',
    salas: 4,
    capacidadeTotal: 100,
    etapas: ['CRECHE', 'PRE_ESCOLA', 'FUNDAMENTAL_I'],
  },
  {
    nome: 'Creche Escola Augusta Pedreira',
    inep: '29136032',
    logradouro: 'Rua Augusta Pedreira, s/n',
    bairro: 'Centro',
    zona: 'URBANA',
    salas: 4,
    capacidadeTotal: 120,
    etapas: ['CRECHE', 'PRE_ESCOLA'],
  },
]

// Mapeamento de etapas para turmas típicas
const TURMAS_POR_ETAPA: Record<string, Array<{ serie: string; codigo: string; turno: string; capacidade: number }>> = {
  CRECHE:          [{ serie: 'Berçário I', codigo: 'CRI', turno: 'MATUTINO', capacidade: 15 }, { serie: 'Berçário II', codigo: 'CRII', turno: 'MATUTINO', capacidade: 15 }],
  PRE_ESCOLA:      [{ serie: 'Pré I', codigo: 'P1', turno: 'MATUTINO', capacidade: 20 }, { serie: 'Pré II', codigo: 'P2', turno: 'MATUTINO', capacidade: 20 }],
  FUNDAMENTAL_I:   [
    { serie: '1º Ano', codigo: '1A', turno: 'MATUTINO', capacidade: 25 },
    { serie: '2º Ano', codigo: '2A', turno: 'MATUTINO', capacidade: 25 },
    { serie: '3º Ano', codigo: '3A', turno: 'MATUTINO', capacidade: 25 },
    { serie: '4º Ano', codigo: '4A', turno: 'VESPERTINO', capacidade: 25 },
    { serie: '5º Ano', codigo: '5A', turno: 'VESPERTINO', capacidade: 25 },
  ],
  FUNDAMENTAL_II:  [
    { serie: '6º Ano', codigo: '6A', turno: 'MATUTINO', capacidade: 30 },
    { serie: '7º Ano', codigo: '7A', turno: 'MATUTINO', capacidade: 30 },
    { serie: '8º Ano', codigo: '8A', turno: 'VESPERTINO', capacidade: 30 },
    { serie: '9º Ano', codigo: '9A', turno: 'VESPERTINO', capacidade: 30 },
  ],
  EJA_FUNDAMENTAL: [
    { serie: 'EJA — Fase I', codigo: 'EJA1', turno: 'NOTURNO', capacidade: 25 },
    { serie: 'EJA — Fase II', codigo: 'EJA2', turno: 'NOTURNO', capacidade: 25 },
  ],
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (!SETUP_TOKEN || auth !== `Bearer ${SETUP_TOKEN}`) {
    return NextResponse.json({ erro: 'Token inválido' }, { status: 401 })
  }

  try {
    // Buscar municipio
    const municipio = await prisma.municipio.findFirst({ where: { slug: 'biritinga' } })
    if (!municipio) {
      return NextResponse.json({ erro: 'Município biritinga não encontrado. Execute o setup primeiro.' }, { status: 404 })
    }

    const anoLetivo = new Date().getFullYear()
    let escolasCriadas = 0
    let turmasCriadas = 0
    let escolasIgnoradas = 0

    for (const esc of ESCOLAS_BIRITINGA) {
      // Verificar se já existe
      const existe = await prisma.escola.findFirst({
        where: { municipioId: municipio.id, inep: esc.inep },
      })

      if (existe) {
        escolasIgnoradas++
        continue
      }

      const escola = await prisma.escola.create({
        data: {
          municipioId:     municipio.id,
          nome:            esc.nome,
          inep:            esc.inep,
          cep:             '48780-000',
          logradouro:      esc.logradouro,
          bairro:          esc.bairro,
          zona:            esc.zona,
          salas:           esc.salas,
          capacidadeTotal: esc.capacidadeTotal,
          situacao:        'ATIVA',
        },
      })

      escolasCriadas++

      // Criar turmas para cada etapa da escola
      for (const etapa of esc.etapas) {
        const turmas = TURMAS_POR_ETAPA[etapa] ?? []
        for (const t of turmas) {
          // Código único por escola+etapa+série no ano letivo
          const codigoUnico = `${etapa.slice(0, 2)}-${t.codigo}`
          await prisma.turma.create({
            data: {
              escolaId:    escola.id,
              municipioId: municipio.id,
              codigo:      codigoUnico,
              etapa:       etapa as any,
              ano:         anoLetivo,
              serie:       t.serie,
              turno:       t.turno as any,
              capacidade:  t.capacidade,
            },
          }).catch(() => null) // ignora duplicatas
          turmasCriadas++
        }
      }
    }

    return NextResponse.json({
      ok: true,
      msg: `Seed concluído: ${escolasCriadas} escolas criadas, ${turmasCriadas} turmas criadas, ${escolasIgnoradas} já existiam.`,
      municipio: municipio.nome,
      anoLetivo,
    })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
