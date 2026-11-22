/**
 * GET /api/portal/config
 * Retorna configurações públicas do município para o portal público.
 * Sem autenticação — dados públicos apenas.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

// Cache de 5 minutos
export const revalidate = 300

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

export async function GET(req: NextRequest) {
  try {
    const mun = await prisma.municipio.findFirst({
      where: { ativo: true },
      select: {
        id: true,
        nome: true,
        uf: true,
        ibge: true,
        cnpj: true,
        slug: true,
        dominio: true,
        logoUrl: true,
        brasaoUrl: true,
        favicon: true,
        corPrimaria: true,
        corSecundaria: true,
        corAcento: true,
      },
    })

    if (!mun) {
      return NextResponse.json({ erro: 'Município não encontrado' }, { status: 404 })
    }

    // Buscar configurações extras salvas no banco (tabela Configuracao se existir)
    let configExtra: Record<string, string> = {}
    try {
      const configs = await (prisma as any).configuracao?.findMany({
        where: { municipioId: mun.id },
        select: { chave: true, valor: true },
      })
      if (configs) {
        configExtra = Object.fromEntries(configs.map((c: any) => [c.chave, c.valor]))
      }
    } catch {}

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erp.biritinga.ba.gov.br'

    return NextResponse.json({
      municipio: {
        id: mun.id,
        nome: mun.nome,
        uf: mun.uf,
        ibge: mun.ibge,
        cnpj: mun.cnpj,
        slug: mun.slug,
        dominio: mun.dominio,
      },
      tema: {
        logoUrl: mun.logoUrl ?? `${appUrl}/brasao.png`,
        brasaoUrl: mun.brasaoUrl ?? `${appUrl}/brasao.png`,
        favicon: mun.favicon,
        corPrimaria: mun.corPrimaria ?? '#1B5E20',
        corSecundaria: mun.corSecundaria ?? '#2E7D32',
        corAcento: mun.corAcento ?? '#F9A825',
      },
      // Configurações extras opcionais (prefeito, gestão, etc.)
      config: configExtra,
      erpUrl: appUrl,
    }, { headers: corsHeaders() })

  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500, headers: corsHeaders() })
  }
}
