// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { obterUsuario } from '@/lib/auth'

export const runtime = 'nodejs'

// Tamanhos alvo por tipo de imagem
const DIMENSOES: Record<string, { w: number; h: number; qualidade: number }> = {
  logo:    { w: 400, h: 160, qualidade: 85 },
  brasao:  { w: 300, h: 300, qualidade: 90 },
  favicon: { w: 64,  h: 64,  qualidade: 90 },
}

// Limite: 5 MB
const LIMITE_BYTES = 5 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const ctx = await obterUsuario(req)
    if (!ctx) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const form = await req.formData()
    const file = form.get('file') as File | null
    const tipo = (form.get('tipo') as string) ?? 'logo'

    if (!file) return NextResponse.json({ erro: 'Arquivo não enviado' }, { status: 400 })
    if (file.size > LIMITE_BYTES) return NextResponse.json({ erro: 'Arquivo muito grande (máx. 5 MB)' }, { status: 413 })

    const mime = file.type
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/gif'].includes(mime)) {
      return NextResponse.json({ erro: 'Formato não suportado. Use PNG, JPG, WebP ou SVG.' }, { status: 400 })
    }

    // Para SVG: retornar como-está (já é vetorial)
    if (mime === 'image/svg+xml') {
      const bytes = await file.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      const dataUrl = `data:image/svg+xml;base64,${base64}`
      return NextResponse.json({ url: dataUrl, mime, tamanho: file.size })
    }

    // Para raster: o browser já redimensionou antes de enviar.
    // Aqui apenas convertemos para base64 e retornamos.
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const dataUrl = `data:${mime};base64,${base64}`

    // Verificar que o base64 não ficou absurdamente grande (>2MB)
    if (dataUrl.length > 2 * 1024 * 1024) {
      return NextResponse.json({ erro: 'Imagem processada ainda muito grande. Reduza a resolução.' }, { status: 413 })
    }

    return NextResponse.json({ url: dataUrl, mime, tamanho: file.size, dicas: DIMENSOES[tipo] })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
