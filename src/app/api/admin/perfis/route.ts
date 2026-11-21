// CRUD de Perfis Customizados de Acesso
// GET    — listar perfis do município
// POST   — criar novo perfil com permissões
// PATCH  — atualizar nome/descrição/permissões
// DELETE — remover perfil (soft: ativo=false)

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { extrairContextoRequest, temPermissao } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

import { PERMISSOES_SISTEMA } from '@/lib/permissoes'

const PermissoesSchema = z.array(z.string().min(1))

const CriarPerfilSchema = z.object({
  nome:       z.string().min(3).max(80),
  descricao:  z.string().max(200).optional(),
  permissoes: PermissoesSchema,
  cor:        z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

const AtualizarPerfilSchema = z.object({
  id:         z.string(),
  nome:       z.string().min(3).max(80).optional(),
  descricao:  z.string().max(200).optional(),
  permissoes: PermissoesSchema.optional(),
  cor:        z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  ativo:      z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'admin:perfil:read')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const perfis = await db.$queryRaw`
      SELECT p.id, p.nome, p.descricao, p.permissoes, p.cor, p.ativo, p.criadoEm,
             COUNT(u.id) AS totalUsuarios
      FROM PerfilCustom p
      LEFT JOIN Usuario u ON u.perfilCustomId = p.id AND u.ativo = true
      WHERE p.municipioId = ${ctx.municipioId} AND p.ativo = true
      GROUP BY p.id
      ORDER BY p.nome ASC
    `

    return NextResponse.json({
      perfis: (perfis as any[]).map(p => ({
        ...p,
        permissoes: typeof p.permissoes === 'string' ? JSON.parse(p.permissoes) : p.permissoes,
        totalUsuarios: Number(p.totalUsuarios),
      })),
      catalogo: PERMISSOES_SISTEMA,
    })
  } catch (error) {
    console.error('[ADMIN/PERFIS/GET]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'admin:perfil:create')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const body  = await request.json()
    const dados = CriarPerfilSchema.parse(body)

    // Verificar unicidade do nome no município
    const [existe] = await db.$queryRaw`
      SELECT id FROM PerfilCustom
      WHERE municipioId = ${ctx.municipioId} AND nome = ${dados.nome} AND ativo = true
      LIMIT 1
    ` as any[]
    if (existe) {
      return NextResponse.json({ erro: 'Já existe um perfil com este nome' }, { status: 409 })
    }

    const id = randomUUID()
    await db.$executeRaw`
      INSERT INTO PerfilCustom (id, municipioId, nome, descricao, permissoes, cor, ativo, criadoEm)
      VALUES (${id}, ${ctx.municipioId}, ${dados.nome}, ${dados.descricao ?? null},
              ${JSON.stringify(dados.permissoes)}, ${dados.cor ?? null}, true, NOW())
    `

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId:   ctx.usuarioId,
      acao: 'CREATE',
      modulo: 'admin', recurso: 'perfil', registroId: id,
      dadosNovos: { nome: dados.nome, totalPermissoes: dados.permissoes.length },
    })

    return NextResponse.json({ perfil: { id, ...dados } }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[ADMIN/PERFIS/POST]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'admin:perfil:update')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const body  = await request.json()
    const dados = AtualizarPerfilSchema.parse(body)

    const [perfil] = await db.$queryRaw`
      SELECT id, nome, permissoes FROM PerfilCustom
      WHERE id = ${dados.id} AND municipioId = ${ctx.municipioId} LIMIT 1
    ` as any[]
    if (!perfil) return NextResponse.json({ erro: 'Perfil não encontrado' }, { status: 404 })

    const sets: string[] = []
    if (dados.nome       !== undefined) sets.push(`nome = ${JSON.stringify(dados.nome)}`)
    if (dados.descricao  !== undefined) sets.push(`descricao = ${JSON.stringify(dados.descricao)}`)
    if (dados.permissoes !== undefined) sets.push(`permissoes = ${JSON.stringify(JSON.stringify(dados.permissoes))}`)
    if (dados.cor        !== undefined) sets.push(`cor = ${JSON.stringify(dados.cor)}`)
    if (dados.ativo      !== undefined) sets.push(`ativo = ${dados.ativo}`)

    if (sets.length > 0) {
      await db.$executeRaw`
        UPDATE PerfilCustom SET atualizadoEm = NOW()
        WHERE id = ${dados.id}
      `
      // Para cada campo atualizado, usamos queries individuais para evitar SQL injection
      if (dados.nome       !== undefined) await db.$executeRaw`UPDATE PerfilCustom SET nome = ${dados.nome} WHERE id = ${dados.id}`
      if (dados.descricao  !== undefined) await db.$executeRaw`UPDATE PerfilCustom SET descricao = ${dados.descricao} WHERE id = ${dados.id}`
      if (dados.permissoes !== undefined) await db.$executeRaw`UPDATE PerfilCustom SET permissoes = ${JSON.stringify(dados.permissoes)} WHERE id = ${dados.id}`
      if (dados.cor        !== undefined) await db.$executeRaw`UPDATE PerfilCustom SET cor = ${dados.cor} WHERE id = ${dados.id}`
      if (dados.ativo      !== undefined) await db.$executeRaw`UPDATE PerfilCustom SET ativo = ${dados.ativo} WHERE id = ${dados.id}`
    }

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId:   ctx.usuarioId,
      acao: 'UPDATE',
      modulo: 'admin', recurso: 'perfil', registroId: dados.id,
      dadosNovos: dados,
    })

    return NextResponse.json({ perfil: { ...dados } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[ADMIN/PERFIS/PATCH]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = extrairContextoRequest(request.headers)
    if (!temPermissao(ctx, 'admin:perfil:delete')) {
      return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
    }

    const { id } = await request.json()
    if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

    const [perfil] = await db.$queryRaw`
      SELECT p.id, p.nome,
             COUNT(u.id) AS totalUsuarios
      FROM PerfilCustom p
      LEFT JOIN Usuario u ON u.perfilCustomId = p.id AND u.ativo = true
      WHERE p.id = ${id} AND p.municipioId = ${ctx.municipioId}
      GROUP BY p.id LIMIT 1
    ` as any[]
    if (!perfil) return NextResponse.json({ erro: 'Perfil não encontrado' }, { status: 404 })

    if (Number(perfil.totalUsuarios) > 0) {
      return NextResponse.json(
        { erro: `Este perfil possui ${perfil.totalUsuarios} usuário(s) vinculado(s). Reatribua-os antes de remover.` },
        { status: 422 }
      )
    }

    await db.$executeRaw`UPDATE PerfilCustom SET ativo = false WHERE id = ${id}`

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId:   ctx.usuarioId,
      acao: 'DELETE',
      modulo: 'admin', recurso: 'perfil', registroId: id,
      dadosNovos: { nome: perfil.nome },
    })

    return NextResponse.json({ mensagem: 'Perfil removido com sucesso' })
  } catch (error) {
    console.error('[ADMIN/PERFIS/DELETE]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
