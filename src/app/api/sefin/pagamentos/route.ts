/**
 * GET  /api/sefin/pagamentos   — lista pagamentos
 * POST /api/sefin/pagamentos   — registra pagamento
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
  const mes       = searchParams.get('mes') ?? undefined

  try {
    // Pagamentos com join empenho + fornecedor
    const rows = await db.$queryRaw`
      SELECT
        p.*,
        l.numero as liquidacaoNumero,
        e.numero as empenhoNumero,
        e.descricao as empenhoDescricao,
        COALESCE(f.nome, f.razaoSocial) as fornecedorNome,
        f.cpfCnpj as fornecedorDoc,
        cb.nome as contaNome
      FROM Pagamento p
      JOIN Liquidacao l ON l.id = p.liquidacaoId
      JOIN Empenho    e ON e.id = l.empenhoId
      LEFT JOIN Fornecedor     f  ON f.id  = e.fornecedorId
      LEFT JOIN ContaBancaria  cb ON cb.id = p.contaBancariaId
      WHERE p.municipioId = ${municipioId}
        ${mes ? `AND DATE_FORMAT(p.dataPagamento, '%Y-%m') = '${mes}'` : ''}
      ORDER BY p.dataPagamento DESC
      LIMIT ${limit} OFFSET ${skip}
    `

    const ct = await db.$queryRaw`
      SELECT COUNT(*) as n FROM Pagamento
      WHERE municipioId = ${municipioId}
      ${mes ? `AND DATE_FORMAT(dataPagamento, '%Y-%m') = '${mes}'` : ''}
    ` as any[]

    const totalMes = await db.$queryRaw`
      SELECT COALESCE(SUM(valor), 0) as total
      FROM Pagamento
      WHERE municipioId = ${municipioId}
      ${mes ? `AND DATE_FORMAT(dataPagamento, '%Y-%m') = '${mes}'` : ''}
    ` as any[]

    return NextResponse.json({
      data: rows,
      meta: {
        total: Number(ct[0]?.n ?? 0),
        page,
        limit,
        pages: Math.ceil(Number(ct[0]?.n ?? 0) / limit),
        totalValor: Number(totalMes[0]?.total ?? 0),
      },
    })
  } catch (e: any) {
    console.error('[GET /api/sefin/pagamentos]', e.message)
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const municipioId = mid(req)
  if (!municipioId) return NextResponse.json({ erro: 'Sem município' }, { status: 401 })

  try {
    const body = await req.json()
    const {
      liquidacaoId, contaBancariaId, numero,
      dataPagamento, valor, formaPagamento, autenticacao, observacao,
    } = body

    if (!liquidacaoId || !dataPagamento || !valor) {
      return NextResponse.json({ erro: 'Obrigatórios: liquidacaoId, dataPagamento, valor' }, { status: 400 })
    }

    // Verificar se liquidação pertence ao município
    const liq = await db.Liquidacao.findFirst({ where: { id: liquidacaoId, municipioId } })
    if (!liq) return NextResponse.json({ erro: 'Liquidação não encontrada' }, { status: 404 })

    const pagamento = await db.$transaction(async (tx) => {
      const p = await tx.Pagamento.create({
        data: {
          id: randomUUID(),
          municipioId,
          liquidacaoId,
          contaBancariaId: contaBancariaId ?? null,
          numero: numero ?? `PG${Date.now()}`,
          dataPagamento,
          valor: parseFloat(valor),
          formaPagamento: formaPagamento ?? 'TRANSFERENCIA',
          autenticacao: autenticacao ?? null,
          observacao: observacao ?? null,
        },
      })
      // Atualizar status do empenho para PAGO
      const liqRow = await tx.Liquidacao.findFirst({ where: { id: liquidacaoId } }) as any
      if (liqRow?.empenhoId) {
        await tx.Empenho.update({
          where: { id: liqRow.empenhoId },
          data: { status: 'PAGO' },
        })
      }
      return p
    })

    return NextResponse.json({ ok: true, pagamento }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
