/**
 * GET /api/portal/data?action=data
 * Endpoint compatível com o formato esperado pelo index.php do portal público.
 * Retorna { ok: true, data: { site, news, events, ... } }
 * Sem autenticação — dados públicos apenas.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const action = searchParams.get('action') ?? 'data'

  if (action !== 'data') {
    return NextResponse.json({ ok: false, error: 'Ação não suportada' }, { status: 400 })
  }

  try {
    const mun = await prisma.municipio.findFirst({
      where: { ativo: true },
    })

    if (!mun) {
      return NextResponse.json({ ok: false, error: 'Município não encontrado' }, { status: 404 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erp.biritinga.ba.gov.br'
    const brasaoUrl = mun.brasaoUrl ?? `${appUrl}/brasao.png`

    // Buscar notícias publicadas
    const noticias = await prisma.noticia.findMany({
      where: { municipioId: mun.id, status: 'PUBLICADA', ativo: true },
      orderBy: [{ destaque: 'desc' }, { dataPublicacao: 'desc' }],
      take: 6,
      select: {
        id: true,
        titulo: true,
        slug: true,
        resumo: true,
        imagemCapa: true,
        secretaria: true,
        dataPublicacao: true,
        destaque: true,
        tags: true,
      },
    })

    // Buscar próximos eventos
    const agora = new Date()
    const eventos = await prisma.eventoAgenda.findMany({
      where: {
        municipioId: mun.id,
        ativo: true,
        status: { in: ['PROGRAMADO', 'EM_ANDAMENTO'] },
        dataInicio: { gte: agora },
      },
      orderBy: [{ destaque: 'desc' }, { dataInicio: 'asc' }],
      take: 6,
      select: {
        id: true,
        titulo: true,
        local: true,
        dataInicio: true,
        horaInicio: true,
        secretaria: true,
      },
    })

    // Formatar notícias no formato esperado pelo portal
    const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

    const news = noticias.map((n, i) => ({
      id: i + 1,
      tag: n.secretaria ?? (n.tags ? n.tags.split(',')[0]?.trim() : 'Notícia') ?? 'Notícia',
      date: n.dataPublicacao
        ? `${n.dataPublicacao.getDate()} ${MESES[n.dataPublicacao.getMonth()]} ${n.dataPublicacao.getFullYear()}`
        : '',
      title: n.titulo,
      url: `${appUrl}/gestao/comunicacao/noticias`, // link para o ERP (futuro: portal próprio)
      img: n.imagemCapa ?? '',
    }))

    // Formatar eventos no formato esperado pelo portal
    const events = eventos.map((e, i) => {
      const d = e.dataInicio
      const dia = String(d.getDate()).padStart(2, '0')
      const mes = MESES[d.getMonth()]
      const hora = e.horaInicio ?? `${String(d.getHours()).padStart(2,'0')}h`
      return {
        id: i + 1,
        day: dia,
        month: mes,
        title: e.titulo,
        location: `${e.local ?? 'A definir'} · ${hora}`,
      }
    })

    // Montar objeto site com dados do município
    const site = {
      name: `Prefeitura Municipal de ${mun.nome}`,
      municipality: mun.nome,
      state: mun.uf === 'BA' ? 'Bahia' : mun.uf,
      brasaoUrl,
      logoUrl: brasaoUrl,
      corPrimaria: mun.corPrimaria ?? '#1B5E20',
      corSecundaria: mun.corSecundaria ?? '#2E7D32',
      corAcento: mun.corAcento ?? '#F9A825',
    }

    const data = {
      site,
      news: news.length > 0 ? news : null,
      events: events.length > 0 ? events : null,
    }

    return NextResponse.json({ ok: true, data }, { headers: corsHeaders() })

  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500, headers: corsHeaders() }
    )
  }
}

// POST /api/portal/data?action=save — não permitido via portal público
export async function POST(req: NextRequest) {
  return NextResponse.json(
    { ok: false, error: 'Salvamento direto não permitido. Use o painel ERP.' },
    { status: 403, headers: corsHeaders() }
  )
}
