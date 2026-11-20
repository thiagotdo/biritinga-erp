/**
 * Rota de setup inicial — cria o município de Biritinga e o primeiro SUPER_ADMIN.
 * Só funciona se NÃO existir nenhum usuário no banco ainda.
 * Protegida por token secreto para evitar uso indevido.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'

const SETUP_TOKEN = process.env.SETUP_SECRET ?? 'biritinga-setup-2024'

export async function POST(req: NextRequest) {
  try {
    const { token, nome, email, senha } = await req.json()

    // Verifica token de segurança
    if (token !== SETUP_TOKEN) {
      return NextResponse.json({ erro: 'Token inválido' }, { status: 401 })
    }

    // Verifica se já existe algum usuário (setup só pode rodar uma vez)
    const totalUsuarios = await prisma.usuario.count()
    if (totalUsuarios > 0) {
      return NextResponse.json({ erro: 'Setup já foi realizado. Use o login normal.' }, { status: 409 })
    }

    // Cria ou recupera o município de Biritinga
    let municipio = await prisma.municipio.findFirst({ where: { slug: 'biritinga' } })
    if (!municipio) {
      municipio = await prisma.municipio.create({
        data: {
          nome:        'Biritinga',
          uf:          'BA',
          ibge:        '2903953',
          slug:        'biritinga',
          dominio:     'biritinga.ba.gov.br',
          corPrimaria: '#1B5E20',
          ativo:       true,
          plano:       'pro',
        },
      })
    }

    // Cria o usuário SUPER_ADMIN
    const senhaHash = await bcrypt.hash(senha, 12)
    const usuario = await prisma.usuario.create({
      data: {
        municipioId: municipio.id,
        nome:        nome ?? 'Administrador',
        email:       email,
        senhaHash,
        perfil:      'SUPER_ADMIN' as any,
        ativo:       true,
      },
    })

    return NextResponse.json({
      ok: true,
      mensagem: 'Setup concluído! Acesse o sistema com suas credenciais.',
      municipio: { id: municipio.id, nome: municipio.nome },
      usuario:   { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
    }, { status: 201 })

  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

// GET — verifica se o setup já foi feito
export async function GET() {
  try {
    const total = await prisma.usuario.count()
    return NextResponse.json({ setupFeito: total > 0 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
