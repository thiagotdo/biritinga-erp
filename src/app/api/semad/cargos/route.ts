import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function mid(req: NextRequest) { return req.headers.get('x-erp-municipio-id') ?? '' }

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  try {
    const cargos = await db.$queryRaw`
      SELECT c.*,
        (SELECT COUNT(*) FROM Servidor s WHERE s.cargoId = c.id AND s.ativo = 1) AS totalServidores
      FROM Cargo c
      WHERE c.municipioId = ${municipioId} AND c.ativo = 1
      ORDER BY c.nome`
    return NextResponse.json({ cargos })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  const { nome, simbolo, descricao, nivelSalarial, salarioBase,
    cargaHoraria, requerConcurso, comissionado } = await req.json()

  if (!nome?.trim()) return NextResponse.json({ erro: 'Nome obrigatório' }, { status: 400 })

  try {
    const dup = await db.$queryRaw`
      SELECT id FROM Cargo WHERE municipioId = ${municipioId} AND nome = ${nome.trim()} AND ativo = 1 LIMIT 1`
    if (dup.length) return NextResponse.json({ erro: 'Cargo já cadastrado' }, { status: 409 })

    const id = crypto.randomUUID()
    await db.$queryRaw`
      INSERT INTO Cargo (id, municipioId, nome, simbolo, descricao, nivelSalarial,
                         salarioBase, cargaHoraria, requerConcurso, comissionado)
      VALUES (${id}, ${municipioId}, ${nome.trim()}, ${simbolo || null}, ${descricao || null},
              ${nivelSalarial || null}, ${salarioBase || null}, ${cargaHoraria ?? 40},
              ${requerConcurso !== false ? 1 : 0}, ${comissionado ? 1 : 0})`
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
