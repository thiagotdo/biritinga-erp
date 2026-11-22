import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
function mid(r: NextRequest) { return r.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo') // PROVENTO | DESCONTO

  try {
    // Rubricas fixas do sistema - sem tabela própria, retornar lista estática
    const rubricas = [
      { codigo: '001', descricao: 'Vencimento Base', tipo: 'PROVENTO', percentual: null },
      { codigo: '010', descricao: 'Adicional de Tempo de Serviço', tipo: 'PROVENTO', percentual: 1 },
      { codigo: '020', descricao: 'Gratificação de Função', tipo: 'PROVENTO', percentual: null },
      { codigo: '030', descricao: 'Horas Extras 50%', tipo: 'PROVENTO', percentual: 50 },
      { codigo: '040', descricao: 'Horas Extras 100%', tipo: 'PROVENTO', percentual: 100 },
      { codigo: '100', descricao: 'INSS', tipo: 'DESCONTO', percentual: 14 },
      { codigo: '101', descricao: 'IR (IRRF)', tipo: 'DESCONTO', percentual: null },
      { codigo: '102', descricao: 'Pensão Alimentícia', tipo: 'DESCONTO', percentual: null },
      { codigo: '103', descricao: 'Convênio Farmácia', tipo: 'DESCONTO', percentual: null },
      { codigo: '104', descricao: 'Vale Transporte', tipo: 'DESCONTO', percentual: 6 },
    ]
    const filtered = tipo ? rubricas.filter(r => r.tipo === tipo) : rubricas
    return NextResponse.json({ rubricas: filtered })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
