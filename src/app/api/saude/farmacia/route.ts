import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function municipioId(req: NextRequest) {
  return req.headers.get('x-erp-municipio-id') ?? ''
}

export async function GET(req: NextRequest) {
  const mid = municipioId(req)
  const { searchParams } = new URL(req.url)
  const pacienteId = searchParams.get('pacienteId')
  const page  = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 20
  const offset = (page - 1) * limit

  try {
    let dispensacoes: any[]
    if (pacienteId) {
      dispensacoes = await db.$queryRaw<any[]>`
        SELECT d.*, m.nome AS medicamentoNome, m.apresentacao,
               p.nome AS pacienteNome, ps.nome AS profissionalNome
        FROM MedicamentoDispensacao d
        JOIN MedicamentoEstoque m ON m.id = d.estoqueId
        JOIN Paciente p ON p.id = d.pacienteId
        LEFT JOIN ProfissionalSaude ps ON ps.id = d.profissionalId
        WHERE d.municipioId = ${mid} AND d.pacienteId = ${pacienteId}
        ORDER BY d.dataDispensacao DESC
        LIMIT ${limit} OFFSET ${offset}`
    } else {
      dispensacoes = await db.$queryRaw<any[]>`
        SELECT d.id, d.dataDispensacao, d.quantidade, d.receita,
               m.nome AS medicamentoNome, m.apresentacao,
               p.nome AS pacienteNome
        FROM MedicamentoDispensacao d
        JOIN MedicamentoEstoque m ON m.id = d.estoqueId
        JOIN Paciente p ON p.id = d.pacienteId
        WHERE d.municipioId = ${mid}
        ORDER BY d.dataDispensacao DESC
        LIMIT ${limit} OFFSET ${offset}`
    }
    return NextResponse.json({ dispensacoes })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const mid = municipioId(req)
  const { estoqueId, pacienteId, profissionalId, quantidade, receita, observacoes } = await req.json()

  if (!estoqueId || !pacienteId || !quantidade)
    return NextResponse.json({ erro: 'Estoque, paciente e quantidade obrigatórios' }, { status: 400 })

  try {
    // Verificar saldo
    const saldo = await db.$queryRaw<any[]>`
      SELECT quantidadeTotal FROM MedicamentoEstoque
      WHERE id = ${estoqueId} AND municipioId = ${mid} LIMIT 1`
    if (!saldo.length) return NextResponse.json({ erro: 'Medicamento não encontrado' }, { status: 404 })
    if (saldo[0].quantidadeTotal < quantidade)
      return NextResponse.json({ erro: 'Saldo insuficiente em estoque' }, { status: 409 })

    // Dispensar e baixar estoque
    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO MedicamentoDispensacao (id, municipioId, estoqueId, pacienteId,
                                          profissionalId, quantidade, receita, observacoes)
      VALUES (${id}, ${mid}, ${estoqueId}, ${pacienteId}, ${profissionalId || null},
              ${quantidade}, ${receita || null}, ${observacoes || null})`

    await db.$queryRaw`
      UPDATE MedicamentoEstoque
      SET quantidadeTotal = quantidadeTotal - ${quantidade}
      WHERE id = ${estoqueId} AND municipioId = ${mid}`

    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
