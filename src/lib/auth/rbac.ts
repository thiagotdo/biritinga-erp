/**
 * RBAC - Role-Based Access Control
 * Verifica se o usuário tem permissão para uma ação.
 *
 * Lógica:
 *  - SUPER_ADMIN tem acesso a tudo.
 *  - Outros perfis são verificados por lista de permissões no campo `permissoes`
 *    (JSON armazenado no banco) ou pela lista de permissões extras do token.
 *  - Formato de permissão: "modulo:recurso:acao" (ex: "saude:paciente:read")
 */

export type ContextoUsuario = {
  usuarioId?: string
  municipioId?: string
  perfil?: string
  permissoes?: string | string[]
  permissoesExtras?: string | string[]
}

/**
 * Retorna true se o usuário tem a permissão solicitada.
 */
export function temPermissao(ctx: ContextoUsuario, permissao: string): boolean {
  if (!ctx?.perfil) return false

  // Super admin tem tudo
  if (ctx.perfil === 'SUPER_ADMIN') return true

  // Monta lista completa de permissões
  const lista = new Set<string>()

  const addPermissoes = (src: string | string[] | undefined) => {
    if (!src) return
    if (Array.isArray(src)) {
      src.forEach(p => lista.add(p))
      return
    }
    // Pode ser JSON string
    try {
      const parsed = JSON.parse(src)
      if (Array.isArray(parsed)) {
        parsed.forEach((p: string) => lista.add(p))
        return
      }
    } catch {
      // não é JSON - trata como string única
    }
    lista.add(src)
  }

  addPermissoes(ctx.permissoes)
  addPermissoes(ctx.permissoesExtras)

  // Checa permissão exata ou wildcard (ex: "saude:*" ou "saude:paciente:*")
  if (lista.has(permissao)) return true

  const partes = permissao.split(':')
  for (let i = partes.length - 1; i > 0; i--) {
    const wildcard = [...partes.slice(0, i), '*'].join(':')
    if (lista.has(wildcard)) return true
  }

  return false
}

/**
 * Lança erro 403 se o usuário não tiver a permissão.
 * Utilitário para uso em rotas Next.js.
 */
export function exigirPermissao(ctx: ContextoUsuario, permissao: string): void {
  if (!temPermissao(ctx, permissao)) {
    throw new Error(`Acesso negado: permissão '${permissao}' necessária.`)
  }
}
