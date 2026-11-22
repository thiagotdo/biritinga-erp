/**
 * GET  /api/sefin/empenhos   - lista com filtros e paginação
 * POST /api/sefin/empenhos   - cria novo empenho
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
  const page      = Math.max(1, parseInt(searchParams.get('page')  ?? '1'))
  const limit     = Math.min(100, parseInt(searchParams.get('limit') ?? '20'))
  const skip      = (page - 1) * limit
  const status    = searchParams.get('status')   ?? undefined
  const exercicio = searchParams.get('exercicio') ?? undefined
  const fornecedorId = searchParams.get('fornecedorId') ?? undefined
  const q         = searchParams.get('q')        ?? undefined

  const where: any = { municipioId }
  if (status)      where.status    = status
  if (exercicio)   where.exercicio = exercicio
  if (fornecedorId) where.fornecedorId = fornecedorId

  try {
    // Se há busca textual, usar SQL direto
    let empenhos: any[]
    let total: number

    if (q) {
      const like = `%${q}%`
      empenhos = await db.$queryRaw`
        SELECT e.*, f.nome as fornecedorNome, f.cpfCnpj as fornecedorDoc
        FROM Empenho e
        LEFT JOIN Fornecedor f ON f.id = e.fornecedorId
        WHERE e.municipioId = ${municipioId}
          AND (e.numero LIKE ${like} OR e.descricao LIKE ${like} OR f.nome LIKE ${like})
        ORDER BY e.dataEmissao DESC
        LIMIT ${limit} OFFSET ${skip}
      `
      const ct = await db.$queryRaw`
        SELECT COUNT(*) as n
        FROM Empenho e
        LEFT JOIN Fornecedor f ON f.id = e.fornecedorId
        WHERE e.municipioId = ${municipioId}
          AND (e.numero LIKE ${like} OR e.descricao LIKE ${like} OR f.nome LIKE ${like})
      ` as any[]
      total = Number(ct[0]?.n ?? 0)
    } else {
      empenhos = await db.Empenho.findMany({
        where,
        orderBy: { dataEmissao: 'desc' },
        take: limit,
        skip,
      })
      // Enriquecer com fornecedor
      for (const e of empenhos) {
        if (e.fornecedorId) {
          const f = await db.Fornecedor.findFirst({ where: { id: e.fornecedorId } }) as any
          if (f) { e.fornecedorNome = f.nome; e.fornecedorDoc = f.cpfCnpj }
        }
      }
      total = await db.Empenho.count({ where })
    }

    return NextResponse.json({
      data: empenhos,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    })
  } catch (e: any) {
    console.error('[GET /api/sefin/empenhos]', e.message)
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Sem município' }, { status: 401 })

  try {
    const body = await req.json()
    const {
      dotacaoId, fornecedorId, numero, exercicio,
      dataEmissao, tipo, modalidade, descricao, valor, processo,
    } = body

    if (!numero || !dataEmissao || !descricao || !valor) {
      return NextResponse.json({ erro: 'Campos obrigatórios: numero, dataEmissao, descricao, valor' }, { status: 400 })
    }

    const empenho = await db.Empenho.create({
      data: {
        id: randomUUID(),
        municipioId,
        dotacaoId: dotacaoId ?? null,
        fornecedorId: fornecedorId ?? null,
        numero,
        exercicio: exercicio ?? new Date().getFullYear(),
        dataEmissao,
        tipo: tipo ?? 'ORDINARIO',
        modalidade: modalidade ?? null,
        descricao,
        valor: parseFloat(valor),
        valorAnulado: 0,
        status: 'EMITIDO',
        processo: processo ?? null,
      },
    })

    return NextResponse.json({ ok: true, empenho }, { status: 201 })
  } catch (e: any) {
    if (e.message?.includes('Duplicate entry')) {
      return NextResponse.json({ erro: 'Número de empenho já existe neste exercício' }, { status: 409 })
    }
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
