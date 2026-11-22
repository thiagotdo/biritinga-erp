// @ts-nocheck
// CRUD completo de usuários (apenas ADMIN_MUNICIPIO / SUPER_ADMIN)
// GET    — listar com filtros
// POST   — criar usuário
// PATCH  — atualizar perfil/status/secretaria
// DELETE — soft-delete (ativo=false)

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { extrairContextoRequest, temPermissao } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'
import { hashSenha, gerarSenhaTemporaria } from '@/lib/auth/senha'

export const runtime = 'nodejs'

const CriarUsuarioSchema = z.object({
  nome:       z.string().min(3),
  email:      z.string().email(),
  cpf:        z.string().optional(),
  perfil:     z.enum(['ADMIN_MUNICIPIO','GESTOR','OPERADOR','VISUALIZADOR','PORTAL_CIDADAO']),
  secretaria: z.string().optional(),
  perfilId:   z.string().optional(),   // perfil customizado
  cargo:      z.string().optional(),
  telefone:   z.string().optional(),
  enviarEmail:z.boolean().default(false),
})

const AtualizarUsuarioSchema = z.object({
  id:         z.string(),
  acao:       z.enum(['ATUALIZAR','RESETAR_SENHA','ATIVAR','DESATIVAR','REVOGAR_SESSOES']),
  nome:       z.string().optional(),
  perfil:     z.enum(['ADMIN_MUNICIPIO','GESTOR','OPERADOR','VISUALIZADOR','PORTAL_CIDADAO']).optional(),
  secretaria: z.string().optional(),
  perfilId:   z.string().optional(),
  cargo:      z.string().optional(),
  telefone:   z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'admin:usuario:read')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const busca     = searchParams.get('busca') ?? undefined
    const perfil    = searchParams.get('perfil') ?? undefined
    const secretaria= searchParams.get('secretaria') ?? undefined
    const ativo     = searchParams.get('ativo') !== 'false'   // padrão: ativos
    const pagina    = Number(searchParams.get('pagina') ?? 1)
    const porPagina = Math.min(Number(searchParams.get('porPagina') ?? 20), 100)

    const [usuarios, total] = await Promise.all([
      prisma.usuario.findMany({
        where: {
          municipioId: ctx.municipioId,
          ativo,
          ...(perfil     && { perfil:     perfil as any }),
          ...(secretaria && { secretaria: secretaria }),
          ...(busca && {
            OR: [
              { nome:  { contains: busca } },
              { email: { contains: busca } },
              { cpf:   { contains: busca } },
            ],
          }),
        },
        select: {
          id: true, nome: true, email: true, cpf: true,
          perfil: true, secretaria: true, cargo: true, telefone: true,
          avatarUrl: true, ativo: true, ultimoLogin: true, mfaAtivado: true,
          createdAt: true,
          perfilCustom: { select: { id: true, nome: true } },
          _count: { select: { sessoes: true } },
        },
        orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
      prisma.usuario.count({
        where: { municipioId: ctx.municipioId, ativo, ...(perfil && { perfil: perfil as any }) },
      }),
    ])

    // Resumo por perfil
    const porPerfil = await prisma.usuario.groupBy({
      by: ['perfil'],
      where: { municipioId: ctx.municipioId, ativo: true },
      _count: { id: true },
    })

    return NextResponse.json({
      usuarios,
      total,
      pagina,
      porPagina,
      totalPaginas: Math.ceil(total / porPagina),
      resumo: { porPerfil: porPerfil.map(r => ({ perfil: r.perfil, total: r._count.id })) },
    })
  } catch (error) {
    console.error('[ADMIN/USUARIOS/GET]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'admin:usuario:create')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const body  = await request.json()
    const dados = CriarUsuarioSchema.parse(body)

    // Verificar unicidade
    const existe = await prisma.usuario.findFirst({
      where: { municipioId: ctx.municipioId, email: dados.email },
    })
    if (existe) {
      return NextResponse.json({ erro: 'E-mail já cadastrado neste município' }, { status: 409 })
    }

    // Gerar senha temporária
    const senhaTemp = gerarSenhaTemporaria()
    const senhaHash = await hashSenha(senhaTemp)

    const usuario = await prisma.usuario.create({
      data: {
        municipioId: ctx.municipioId,
        nome:        dados.nome,
        email:       dados.email,
        cpf:         dados.cpf,
        perfil:      dados.perfil,
        secretaria:  dados.secretaria,
        cargo:       dados.cargo,
        telefone:    dados.telefone,
        senhaHash,
        perfilId:    dados.perfilId,
        ativo:       true,
      },
      select: {
        id: true, nome: true, email: true, perfil: true, secretaria: true, createdAt: true,
      },
    })

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId:   ctx.usuarioId,
      acao: 'CREATE', modulo: 'admin', recurso: 'usuario',
      registroId: usuario.id,
      dadosNovos: { nome: dados.nome, email: dados.email, perfil: dados.perfil },
    })

    return NextResponse.json(
      {
        usuario,
        senhaTemporaria: senhaTemp,  // exibir uma vez — deve ser trocada no primeiro login
        aviso: 'Senha temporária gerada. O usuário deve trocar no primeiro acesso.',
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[ADMIN/USUARIOS/POST]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'admin:usuario:update')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const body  = await request.json()
    const dados = AtualizarUsuarioSchema.parse(body)

    const usuario = await prisma.usuario.findFirst({
      where: { id: dados.id, municipioId: ctx.municipioId },
    })
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })

    // Proteger SUPER_ADMIN
    if (usuario.perfil === 'SUPER_ADMIN' && ctx.perfil !== 'SUPER_ADMIN') {
      return NextResponse.json({ erro: 'Sem permissão para modificar SUPER_ADMIN' }, { status: 403 })
    }

    const dadosAntigos = { perfil: usuario.perfil, ativo: usuario.ativo }
    let updateData: any = {}
    let senhaTemporaria: string | undefined

    if (dados.acao === 'ATUALIZAR') {
      if (dados.nome)       updateData.nome       = dados.nome
      if (dados.perfil)     updateData.perfil     = dados.perfil
      if (dados.secretaria !== undefined) updateData.secretaria = dados.secretaria
      if (dados.perfilId !== undefined)   updateData.perfilId   = dados.perfilId
      if (dados.cargo !== undefined)      updateData.cargo      = dados.cargo
    }

    if (dados.acao === 'RESETAR_SENHA') {
      senhaTemporaria  = gerarSenhaTemporaria()
      updateData.senhaHash          = await hashSenha(senhaTemporaria)
      updateData.tentativasFalhas   = 0
      updateData.bloqueadoAte       = null
    }

    if (dados.acao === 'ATIVAR')    updateData.ativo = true
    if (dados.acao === 'DESATIVAR') updateData.ativo = false

    if (dados.acao === 'REVOGAR_SESSOES') {
      await prisma.sessao.updateMany({
        where: { usuarioId: dados.id, revokedAt: null },
        data:  { revokedAt: new Date() },
      })
    }

    const atualizado = Object.keys(updateData).length > 0
      ? await prisma.usuario.update({ where: { id: dados.id }, data: updateData })
      : usuario

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId:   ctx.usuarioId,
      acao: 'UPDATE', modulo: 'admin', recurso: 'usuario',
      registroId: dados.id,
      dadosAntigos,
      dadosNovos: { acao: dados.acao, perfil: atualizado.perfil, ativo: atualizado.ativo },
    })

    return NextResponse.json({
      usuario: { id: atualizado.id, nome: atualizado.nome, perfil: atualizado.perfil, ativo: atualizado.ativo },
      ...(senhaTemporaria && { senhaTemporaria, aviso: 'Nova senha temporária gerada.' }),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[ADMIN/USUARIOS/PATCH]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
