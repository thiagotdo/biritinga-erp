// ─── Tipos compartilhados por todos os módulos ────────────────────────────────

export type PerfilPadrao =
  | 'SUPER_ADMIN'
  | 'ADMIN_MUNICIPIO'
  | 'GESTOR'
  | 'OPERADOR'
  | 'VISUALIZADOR'
  | 'PORTAL_CIDADAO'

// Contexto extraído do JWT e passado para handlers de API
export interface ContextoRequest {
  usuarioId:   string
  municipioId: string
  nome:        string
  email:       string
  perfil:      PerfilPadrao
  secretaria?: string
  permissoes:  string[]   // permissões extras do perfil customizado
  ip?:         string
  sessionId?:  string
}

// Payload do JWT de acesso
export interface JwtPayload {
  sub:        string         // usuarioId
  mid:        string         // municipioId
  nome:       string
  email:      string
  perfil:     PerfilPadrao
  secretaria?: string
  permissoes: string[]
  sid:        string         // sessionId
  iat:        number
  exp:        number
}

// Payload do JWT de refresh
export interface RefreshPayload {
  sub: string   // usuarioId
  sid: string   // sessionId
  mid: string   // municipioId
  iat: number
  exp: number
}

// Resposta padrão de sucesso paginado
export interface RespostaPaginada<T> {
  dados:   T[]
  total:   number
  pagina:  number
  porPagina: number
  totalPaginas: number
}

// Resposta de erro padronizada
export interface RespostaErro {
  erro:     string
  detalhes?: Record<string, string[] | string>
  codigo?:  string
}

// Hierarquia de permissões (módulo:recurso:ação)
// Exemplos: "pgm:processo:create", "semob:obra:read", "sefin:empenho:aprovar"
export type Permissao = string

// Mapa de permissões por perfil padrão
export const PERMISSOES_PADRAO: Record<PerfilPadrao, Permissao[]> = {
  SUPER_ADMIN: ['*'],  // acesso total
  ADMIN_MUNICIPIO: [
    'semad:*', 'sefin:*', 'semob:*', 'seagri:*', 'secult:*', 'pgm:*',
    'admin:usuario:*', 'admin:perfil:*',
  ],
  GESTOR: [
    // Gestor tem leitura total e escrita no próprio módulo
    'semad:*', 'sefin:*', 'semob:*', 'seagri:*', 'secult:*', 'pgm:*',
  ],
  OPERADOR: [
    // Operador tem leitura geral + escrita em recursos básicos
    'semad:servidor:read', 'semad:servidor:create', 'semad:servidor:update',
    'semad:licenca:read', 'semad:licenca:create',
    'sefin:empenho:read', 'sefin:empenho:create',
    'semob:obra:read', 'semob:medicao:read', 'semob:medicao:create',
    'seagri:produtor:read', 'seagri:produtor:create',
    'secult:evento:read', 'secult:atleta:read',
    'pgm:parecer:read', 'pgm:processo:read',
  ],
  VISUALIZADOR: [
    'semad:*:read', 'sefin:*:read', 'semob:*:read',
    'seagri:*:read', 'secult:*:read', 'pgm:*:read',
  ],
  PORTAL_CIDADAO: [
    'cidadao:protocolo:create', 'cidadao:protocolo:read',
    'cidadao:servico:read', 'cidadao:transparencia:read',
  ],
}
