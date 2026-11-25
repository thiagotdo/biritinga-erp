// @ts-nocheck
// CRUD completo de usuários (apenas ADMIN_MUNICIPIO / SUPER_ADMIN)
// GET    - listar com filtros
// POST   - criar usuário
// PATCH  - atualizar perfil/status/secretaria
// DELETE - soft-delete (ativo=false)

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { prisma, getConn } from '@/lib/db'
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

    const whereUsuario: any = {
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
    }

    // Monta condições WHERE dinâmicas via queryRaw para evitar problemas com makeModel
    const offset = (pagina - 1) * porPagina
    const ativoInt = ativo ? 1 : 0
    const buscaLike = busca ? `%${busca}%` : null
    const [usuariosRaw, totalRaw] = await Promise.all([
      prisma.$queryRaw`
        SELECT id, nome, email, cpf, perfil, secretaria, cargo, telefone,
               avatarUrl, ativo, ultimoLogin, mfaAtivado, createdAt
        FROM Usuario
        WHERE municipioId = ${ctx.municipioId}
          AND ativo = ${ativoInt}
          ${perfil     ? prisma.$queryRaw`AND perfil = ${perfil}`     : prisma.$queryRaw``}
          ${secretaria ? prisma.$queryRaw`AND secretaria = ${secretaria}` : prisma.$queryRaw``}
          ${buscaLike  ? prisma.$queryRaw`AND (nome LIKE ${buscaLike} OR email LIKE ${buscaLike} OR cpf LIKE ${buscaLike})` : prisma.$queryRaw``}
        ORDER BY ativo DESC, nome ASC
        LIMIT ${porPagina} OFFSET ${offset}`,
      prisma.$queryRaw`
        SELECT COUNT(*) AS n FROM Usuario
        WHERE municipioId = ${ctx.municipioId} AND ativo = ${ativoInt}
          ${perfil ? prisma.$queryRaw`AND perfil = ${perfil}` : prisma.$queryRaw``}`,
    ])
    const usuarios = usuariosRaw as any[]
    const total = Number((totalRaw as any[])[0]?.n ?? 0)

    // Resumo por perfil via SQL direto (groupBy não suportado pelo makeModel)
    const _conn = await getConn()
    let porPerfil: any[] = []
    try {
      const [pfRows] = await _conn.execute(
        `SELECT perfil, COUNT(*) as total FROM Usuario WHERE municipioId = ? AND ativo = 1 GROUP BY perfil ORDER BY perfil`,
        [ctx.municipioId]
      ) as any[]
      porPerfil = (pfRows as any[]).map((r: any) => ({ perfil: r.perfil, total: Number(r.total) }))
    } finally {
      await _conn.end()
    }

    return NextResponse.json({
      usuarios,
      total,
      pagina,
      porPagina,
      totalPaginas: Math.ceil(total / porPagina),
      resumo: { porPerfil },
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
    const existe = await prisma.Usuario.findFirst({
      where: { municipioId: ctx.municipioId, email: dados.email },
    })
    if (existe) {
      return NextResponse.json({ erro: 'E-mail já cadastrado neste município' }, { status: 409 })
    }

    // Gerar senha temporária
    const senhaTemp = gerarSenhaTemporaria()
    const senhaHash = await hashSenha(senhaTemp)

    const novoId = randomUUID()
    // Tabela Usuario usa createdAt/updatedAt (não criadoEm/atualizadoEm)
    await prisma.$queryRaw`
      INSERT INTO Usuario
        (id, municipioId, nome, email, cpf, perfil, secretaria, cargo, telefone,
         senhaHash, perfilId, ativo, mfaAtivado, tentativasFalhas)
      VALUES
        (${novoId}, ${ctx.municipioId}, ${dados.nome}, ${dados.email},
         ${dados.cpf ?? null}, ${dados.perfil}, ${dados.secretaria ?? null},
         ${dados.cargo ?? null}, ${dados.telefone ?? null},
         ${senhaHash}, ${dados.perfilId ?? null}, 1, 0, 0)`

    const usuario = { id: novoId, nome: dados.nome, email: dados.email,
                      perfil: dados.perfil, secretaria: dados.secretaria ?? null }

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
        senhaTemporaria: senhaTemp,  // exibir uma vez - deve ser trocada no primeiro login
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

    const usuario = await prisma.Usuario.findFirst({
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
      await prisma.Sessao.updateMany({
        where: { usuarioId: dados.id, revokedAt: null },
        data:  { revokedAt: new Date() },
      })
    }

    const atualizado = Object.keys(updateData).length > 0
      ? await prisma.Usuario.update({ where: { id: dados.id }, data: updateData })
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
