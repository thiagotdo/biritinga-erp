/**
 * GET /api/portal/eventos?limit=6&proximos=true
 * Retorna eventos da agenda para o portal público.
 * Sem autenticação — somente eventos com status PROGRAMADO ou REALIZADO.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const limit   = Math.min(parseInt(searchParams.get('limit') ?? '6'), 20)
    const proximos = searchParams.get('proximos') !== 'false' // default: próximos
    const page    = Math.max(parseInt(searchParams.get('page') ?? '1'), 1)
    const skip    = (page - 1) * limit

    const mun = await prisma.Municipio.findFirst({ where: { ativo: true }, select: { id: true } })
    if (!mun) return NextResponse.json({ eventos: [], total: 0 }, { headers: corsHeaders() })

    const agora = new Date()

    const where: any = {
      municipioId: mun.id,
      ativo: true,
      status: { in: ['PROGRAMADO', 'EM_ANDAMENTO', 'REALIZADO'] },
      ...(proximos ? { dataInicio: { gte: agora } } : {}),
    }

    const [eventos, total] = await Promise.all([
      prisma.EventoAgenda.findMany({
        where,
        orderBy: [{ destaque: 'desc' }, { dataInicio: proximos ? 'asc' : 'desc' }],
        take: limit,
        skip,
        select: {
          id: true,
          titulo: true,
          descricao: true,
          tipo: true,
          status: true,
          local: true,
          endereco: true,
          dataInicio: true,
          dataFim: true,
          horaInicio: true,
          horaFim: true,
          responsavel: true,
          secretaria: true,
          destaque: true,
          imagemCapa: true,
          linkTransmissao: true,
          publicoEsperado: true,
        },
      }),
      prisma.EventoAgenda.count({ where }),
    ])

    return NextResponse.json({
      eventos: eventos.map(e => ({
        ...e,
        dataInicio: e.dataInicio.toISOString(),
        dataFim: e.dataFim?.toISOString() ?? null,
      })),
      total,
      pagina: page,
      totalPaginas: Math.ceil(total / limit),
    }, { headers: corsHeaders() })

  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500, headers: corsHeaders() })
  }
}
