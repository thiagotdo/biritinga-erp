import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'

export const runtime = 'nodejs'

// ─── Folha — Rubricas ─────────────────────────────────────────────────────────
// Rubricas são os tipos de verba: proventos (vencimento, gratificação, adicional)
// e descontos (INSS, IRPF, consignado, falta).
// Rubricas com natureza AUTOMATICO são calculadas pelo sistema via fórmula.

// Rubricas padrão para seed (semeadas se não houver nenhuma)
const RUBRICAS_PADRAO = [
  // PROVENTOS
  { codigo: '0001', nome: 'Vencimento Base',           tipo: 'PROVENTO',   natureza: 'VARIAVEL',   incideInss: true,  incideIrpf: true,  incideFgts: true  },
  { codigo: '0002', nome: 'Gratificação de Função',    tipo: 'PROVENTO',   natureza: 'VARIAVEL',   incideInss: true,  incideIrpf: true,  incideFgts: true  },
  { codigo: '0003', nome: 'Adicional de Tempo Serviço',tipo: 'PROVENTO',   natureza: 'VARIAVEL',   incideInss: true,  incideIrpf: true,  incideFgts: true  },
  { codigo: '0004', nome: 'Hora Extra (50%)',          tipo: 'PROVENTO',   natureza: 'VARIAVEL',   incideInss: true,  incideIrpf: true,  incideFgts: true  },
  { codigo: '0005', nome: 'Adicional Noturno',         tipo: 'PROVENTO',   natureza: 'VARIAVEL',   incideInss: true,  incideIrpf: true,  incideFgts: true  },
  { codigo: '0006', nome: 'Auxílio Alimentação',       tipo: 'PROVENTO',   natureza: 'FIXO',       incideInss: false, incideIrpf: false, incideFgts: false },
  { codigo: '0007', nome: 'Auxílio Transporte',        tipo: 'PROVENTO',   natureza: 'FIXO',       incideInss: false, incideIrpf: false, incideFgts: false },
  { codigo: '0008', nome: 'Auxílio Saúde',             tipo: 'PROVENTO',   natureza: 'FIXO',       incideInss: false, incideIrpf: false, incideFgts: false },
  { codigo: '0009', nome: '13º Salário (1ª Parcela)',  tipo: 'PROVENTO',   natureza: 'VARIAVEL',   incideInss: false, incideIrpf: false, incideFgts: true  },
  { codigo: '0010', nome: 'Férias + 1/3 Constitucional', tipo: 'PROVENTO', natureza: 'VARIAVEL',  incideInss: true,  incideIrpf: true,  incideFgts: true  },
  // DESCONTOS
  { codigo: '1001', nome: 'INSS',                     tipo: 'DESCONTO',   natureza: 'AUTOMATICO', incideInss: false, incideIrpf: false, incideFgts: false },
  { codigo: '1002', nome: 'IRPF',                     tipo: 'DESCONTO',   natureza: 'AUTOMATICO', incideInss: false, incideIrpf: false, incideFgts: false },
  { codigo: '1003', nome: 'Consignado — Banco',       tipo: 'DESCONTO',   natureza: 'VARIAVEL',   incideInss: false, incideIrpf: false, incideFgts: false },
  { codigo: '1004', nome: 'Faltas/Afastamentos',      tipo: 'DESCONTO',   natureza: 'VARIAVEL',   incideInss: false, incideIrpf: false, incideFgts: false },
  { codigo: '1005', nome: 'Plano de Saúde',           tipo: 'DESCONTO',   natureza: 'FIXO',       incideInss: false, incideIrpf: false, incideFgts: false },
  { codigo: '1006', nome: 'Vale Refeição (desconto)', tipo: 'DESCONTO',   natureza: 'FIXO',       incideInss: false, incideIrpf: false, incideFgts: false },
  { codigo: '1007', nome: 'Previdência Municipal',    tipo: 'DESCONTO',   natureza: 'AUTOMATICO', incideInss: false, incideIrpf: false, incideFgts: false },
  // INFORMATIVO
  { codigo: '2001', nome: 'FGTS (8%)',                tipo: 'INFORMATIVO', natureza: 'AUTOMATICO', incideInss: false, incideIrpf: false, incideFgts: false },
  { codigo: '2002', nome: 'Base Cálculo INSS',        tipo: 'INFORMATIVO', natureza: 'AUTOMATICO', incideInss: false, incideIrpf: false, incideFgts: false },
  { codigo: '2003', nome: 'Base Cálculo IRPF',        tipo: 'INFORMATIVO', natureza: 'AUTOMATICO', incideInss: false, incideIrpf: false, incideFgts: false },
]

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo') // PROVENTO | DESCONTO | INFORMATIVO

  // Auto-seed
  const count = await prisma.folhaRubrica.count({ where: { municipioId: usuario.municipioId } })
  if (count === 0) {
    await prisma.folhaRubrica.createMany({
      data: RUBRICAS_PADRAO.map(r => ({ municipioId: usuario.municipioId, ...r as any })),
      skipDuplicates: true,
    })
  }

  const where: any = { municipioId: usuario.municipioId, ativo: true }
  if (tipo) where.tipo = tipo

  const rubricas = await prisma.folhaRubrica.findMany({
    where, orderBy: { codigo: 'asc' },
  })

  return NextResponse.json({ rubricas })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    codigo:      z.string().min(1).max(10),
    nome:        z.string().min(2),
    tipo:        z.enum(['PROVENTO', 'DESCONTO', 'INFORMATIVO']),
    natureza:    z.enum(['FIXO', 'VARIAVEL', 'AUTOMATICO']).default('VARIAVEL'),
    percentual:  z.number().optional(),
    valor:       z.number().optional(),
    incideInss:  z.boolean().default(false),
    incideIrpf:  z.boolean().default(false),
    incideFgts:  z.boolean().default(false),
    formula:     z.string().optional(),
  })

  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const existente = await prisma.folhaRubrica.findUnique({
    where: { municipioId_codigo: { municipioId: usuario.municipioId, codigo: d.codigo } },
  })
  if (existente) return NextResponse.json({ erro: 'Código de rubrica já cadastrado' }, { status: 409 })

  const rubrica = await prisma.folhaRubrica.create({
    data: { municipioId: usuario.municipioId, ...d },
  })

  return NextResponse.json({ rubrica }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, ...campos } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const rubrica = await prisma.folhaRubrica.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!rubrica) return NextResponse.json({ erro: 'Rubrica não encontrada' }, { status: 404 })

  const atualizada = await prisma.folhaRubrica.update({
    where: { id },
    data: campos,
  })

  return NextResponse.json({ rubrica: atualizada })
}
