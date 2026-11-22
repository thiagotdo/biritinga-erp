// Permissões disponíveis no sistema, organizadas por módulo
// Usado na API e no front para renderizar o seletor de permissões

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
    label: 'SEMAD - Administração',
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
    label: 'SEFIN - Finanças',
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
    label: 'SEMOB - Obras',
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

