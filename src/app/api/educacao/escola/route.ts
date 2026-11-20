/**
 * GET  /api/educacao/escola        — lista escolas
 * GET  /api/educacao/escola?id=X   — detalhe com turmas
 * POST /api/educacao/escola        — cria escola
 * PATCH /api/educacao/escola       — atualiza escola
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

function mid(req: NextRequest) {
  return req.headers.get('x-erp-municipio-id') ?? ''
}

export async function GET(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Sem município' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id   = searchParams.get('id')
  const tipo = searchParams.get('tipo')

  try {
    if (id) {
      const escolas = await db.$queryRaw`
        SELECT e.*,
          COUNT(t.id) as totalTurmas,
          SUM(CASE WHEN t.ativo = 1 THEN 1 ELSE 0 END) as turmasAtivas
        FROM Escola e
        LEFT JOIN Turma t ON t.escolaId = e.id AND t.ativo = 1
        WHERE e.id = ${id} AND e.municipioId = ${municipioId}
        GROUP BY e.id
      ` as any[]

      if (!escolas.length) return NextResponse.json({ erro: 'Escola não encontrada' }, { status: 404 })

      const turmas = await db.$queryRaw`
        SELECT t.*,
          COUNT(m.id) as totalMatriculas
        FROM Turma t
        LEFT JOIN Matricula m ON m.turmaId = t.id AND m.situacao = 'ATIVA'
        WHERE t.escolaId = ${id} AND t.ativo = 1
        GROUP BY t.id
        ORDER BY t.serie ASC, t.turma ASC
      ` as any[]

      return NextResponse.json({ escola: { ...escolas[0], turmas } })
    }

    let escolas: any[]
    if (tipo) {
      escolas = await db.$queryRaw`
        SELECT e.*, COUNT(t.id) as totalTurmas
        FROM Escola e
        LEFT JOIN Turma t ON t.escolaId = e.id AND t.ativo = 1
        WHERE e.municipioId = ${municipioId} AND e.ativo = 1 AND e.tipo = ${tipo}
        GROUP BY e.id ORDER BY e.nome ASC
      ` as any[]
    } else {
      escolas = await db.$queryRaw`
        SELECT e.*, COUNT(t.id) as totalTurmas
        FROM Escola e
        LEFT JOIN Turma t ON t.escolaId = e.id AND t.ativo = 1
        WHERE e.municipioId = ${municipioId} AND e.ativo = 1
        GROUP BY e.id ORDER BY e.nome ASC
      ` as any[]
    }

    return NextResponse.json({ escolas, total: escolas.length })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Sem município' }, { status: 401 })

  try {
    const { nome, inep, tipo, cnpj, diretor, logradouro, numero, bairro, cep,
            telefone, email, totalSalas, capacidade } = await req.json()

    if (!nome) return NextResponse.json({ erro: 'Nome é obrigatório' }, { status: 400 })

    if (inep) {
      const existe = await db.Escola.findFirst({ where: { municipioId, inep } })
      if (existe) return NextResponse.json({ erro: 'Código INEP já cadastrado' }, { status: 409 })
    }

    const escola = await db.Escola.create({
      data: {
        id: randomUUID(), municipioId, nome,
        inep: inep || null, tipo: tipo || null, cnpj: cnpj || null,
        diretor: diretor || null, logradouro: logradouro || null,
        numero: numero || null, bairro: bairro || null, cep: cep || null,
        telefone: telefone || null, email: email || null,
        totalSalas: totalSalas ?? 0, capacidade: capacidade ?? 0,
      },
    })

    return NextResponse.json({ escola }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Sem município' }, { status: 401 })

  try {
    const { id, ...dados } = await req.json()
    if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

    const escola = await db.Escola.findFirst({ where: { id, municipioId } })
    if (!escola) return NextResponse.json({ erro: 'Escola não encontrada' }, { status: 404 })

    await db.Escola.update({ where: { id }, data: dados })
    return NextResponse.json({ sucesso: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
