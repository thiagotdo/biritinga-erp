// CRUD de Perfis Customizados de Acesso
// GET    — listar perfis do município
// POST   — criar novo perfil com permissões
// PATCH  — atualizar nome/descrição/permissões
// DELETE — remover perfil (soft: ativo=false)

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { extrairContextoRequest, temPermissao } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// Permissões disponíveis no sistema organizadas por módulo
// Usadas tanto na API quanto no front para renderizar o seletor
export const PERMISSOES_SISTEMA = {
  admin: {
    label: 'Administração',
    permissoes: [
      { id: 'admin:usuario:read',   label: 'Visualizar usuários' },
      { id: 'admin:usuario:create', label: 'Criar usuários' },
      { id: 'admin:usuario:update', label: 'Editar usuários' },
      { id: 'admin:perfil:read',    label: 'Visualizar perfis' },
      { id: 'admin:perfil:create',  label: 'Criar perfis' },
      { id: 'admin:perfil:update',  label: 'Editar perfis' },
      { id: 'admin:perfil:delete',  label: 'Remover perfis' },
      { id: 'admin:auditoria:read', label: 'Visualizar auditoria' },
    ],
  },
  cidadao: {
    label: 'Portal do Cidadão',
    permissoes: [
      { id: 'cidadao:protocolo:read',   label: 'Visualizar protocolos' },
      { id: 'cidadao:protocolo:create', label: 'Criar protocolos' },
      { id: 'cidadao:protocolo:update', label: 'Tramitar protocolos' },
      { id: 'cidadao:servico:read',     label: 'Visualizar serviços' },
      { id: 'cidadao:servico:create',   label: 'Criar serviços' },
      { id: 'cidadao:servico:update',   label: 'Editar serviços' },
      { id: 'cidadao:transparencia:read',   label: 'Visualizar documentos' },
      { id: 'cidadao:transparencia:create', label: 'Publicar documentos' },
      { id: 'cidadao:transparencia:update', label: 'Editar documentos' },
    ],
  },
  ouvidoria: {
    label: 'Ouvidoria',
    permissoes: [
      { id: 'ouvidoria:manifestacao:read',   label: 'Visualizar manifestações' },
      { id: 'ouvidoria:manifestacao:update', label: 'Tramitar manifestações' },
      { id: 'ouvidoria:config:read',         label: 'Ver configurações' },
      { id: 'ouvidoria:config:update',       label: 'Alterar configurações' },
      { id: 'ouvidoria:relatorio:read',      label: 'Relatórios de ouvidoria' },
    ],
  },
  semad: {
    label: 'SEMAD — Administração',
    permissoes: [
      { id: 'semad:*',              label: 'Acesso total SEMAD' },
      { id: 'semad:contrato:read',  label: 'Visualizar contratos' },
      { id: 'semad:contrato:create',label: 'Criar contratos' },
      { id: 'semad:contrato:update',label: 'Editar contratos' },
      { id: 'semad:licitacao:read', label: 'Visualizar licitações' },
      { id: 'semad:licitacao:create',label: 'Criar licitações' },
      { id: 'semad:patrimonio:read',label: 'Visualizar patrimônio' },
      { id: 'semad:patrimonio:update',label: 'Gerenciar patrimônio' },
    ],
  },
  sefin: {
    label: 'SEFIN — Finanças',
    permissoes: [
      { id: 'sefin:*',               label: 'Acesso total SEFIN' },
      { id: 'sefin:orcamento:read',  label: 'Visualizar orçamento' },
      { id: 'sefin:orcamento:update',label: 'Editar orçamento' },
      { id: 'sefin:empenho:read',    label: 'Visualizar empenhos' },
      { id: 'sefin:empenho:create',  label: 'Criar empenhos' },
      { id: 'sefin:receita:read',    label: 'Visualizar receitas' },
      { id: 'sefin:balancete:read',  label: 'Relatórios financeiros' },
    ],
  },
  semob: {
    label: 'SEMOB — Obras',
    permissoes: [
      { id: 'semob:*',           label: 'Acesso total SEMOB' },
      { id: 'semob:obra:read',   label: 'Visualizar obras' },
      { id: 'semob:obra:create', label: 'Criar obras' },
      { id: 'semob:obra:update', label: 'Editar obras' },
      { id: 'semob:alvara:read', label: 'Visualizar alvarás' },
      { id: 'semob:alvara:create',label: 'Emitir alvarás' },
    ],
  },
  rh: {
    label: 'Recursos Humanos',
    permissoes: [
      { id: 'rh:*',               label: 'Acesso total RH' },
      { id: 'rh:servidor:read',   label: 'Visualizar servidores' },
      { id: 'rh:servidor:create', label: 'Cadastrar servidores' },
      { id: 'rh:servidor:update', label: 'Editar servidores' },
      { id: 'rh:folha:read',      label: 'Visualizar folha' },
      { id: 'rh:folha:processar', label: 'Processar folha' },
      { id: 'rh:ferias:read',     label: 'Visualizar férias' },
      { id: 'rh:ferias:update',   label: 'Gerenciar férias' },
      { id: 'rh:ponto:read',      label: 'Visualizar ponto' },
      { id: 'rh:ponto:update',    label: 'Gerenciar ponto' },
    ],
  },
} as const

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

    const perfis = await prisma.perfilAcesso.findMany({
      where: { municipioId: ctx.municipioId, ativo: true },
      include: {
        _count: { select: { usuarios: true } },
      },
      orderBy: { nome: 'asc' },
    })

    return NextResponse.json({
      perfis: perfis.map(p => ({
        id:         p.id,
        nome:       p.nome,
        descricao:  p.descricao,
        permissoes: p.permissoes as string[],
        cor:        p.cor,
        ativo:      p.ativo,
        totalUsuarios: p._count.usuarios,
        criadoEm:   p.criadoEm,
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
    const existe = await prisma.perfilAcesso.findFirst({
      where: { municipioId: ctx.municipioId, nome: dados.nome, ativo: true },
    })
    if (existe) {
      return NextResponse.json({ erro: 'Já existe um perfil com este nome' }, { status: 409 })
    }

    const perfil = await prisma.perfilAcesso.create({
      data: {
        municipioId: ctx.municipioId,
        nome:        dados.nome,
        descricao:   dados.descricao,
        permissoes:  dados.permissoes,
        cor:         dados.cor,
      },
    })

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId:   ctx.usuarioId,
      acao: 'CREATE', modulo: 'admin', recurso: 'perfilAcesso',
      registroId: perfil.id,
      dadosNovos: { nome: dados.nome, totalPermissoes: dados.permissoes.length },
    })

    return NextResponse.json({ perfil }, { status: 201 })
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

    const perfil = await prisma.perfilAcesso.findFirst({
      where: { id: dados.id, municipioId: ctx.municipioId },
    })
    if (!perfil) return NextResponse.json({ erro: 'Perfil não encontrado' }, { status: 404 })

    const updateData: any = {}
    if (dados.nome       !== undefined) updateData.nome       = dados.nome
    if (dados.descricao  !== undefined) updateData.descricao  = dados.descricao
    if (dados.permissoes !== undefined) updateData.permissoes = dados.permissoes
    if (dados.cor        !== undefined) updateData.cor        = dados.cor
    if (dados.ativo      !== undefined) updateData.ativo      = dados.ativo

    const atualizado = await prisma.perfilAcesso.update({
      where: { id: dados.id },
      data:  updateData,
    })

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId:   ctx.usuarioId,
      acao: 'UPDATE', modulo: 'admin', recurso: 'perfilAcesso',
      registroId: dados.id,
      dadosAntigos: { nome: perfil.nome, totalPermissoes: (perfil.permissoes as string[]).length },
      dadosNovos:   { nome: atualizado.nome, totalPermissoes: (atualizado.permissoes as string[]).length },
    })

    return NextResponse.json({ perfil: atualizado })
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

    const perfil = await prisma.perfilAcesso.findFirst({
      where: { id, municipioId: ctx.municipioId },
      include: { _count: { select: { usuarios: true } } },
    })
    if (!perfil) return NextResponse.json({ erro: 'Perfil não encontrado' }, { status: 404 })

    if (perfil._count.usuarios > 0) {
      return NextResponse.json(
        { erro: `Este perfil possui ${perfil._count.usuarios} usuário(s) vinculado(s). Reatribua-os antes de remover.` },
        { status: 422 }
      )
    }

    await prisma.perfilAcesso.update({
      where: { id },
      data:  { ativo: false },
    })

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId:   ctx.usuarioId,
      acao: 'DELETE', modulo: 'admin', recurso: 'perfilAcesso',
      registroId: id,
      dadosAntigos: { nome: perfil.nome },
    })

    return NextResponse.json({ mensagem: 'Perfil removido com sucesso' })
  } catch (error) {
    console.error('[ADMIN/PERFIS/DELETE]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
