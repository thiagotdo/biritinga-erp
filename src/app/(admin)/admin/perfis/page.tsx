'use client'
import { useState } from 'react'

type Perfil = {
  value: string; label: string; emoji: string; cor: string; desc: string
  redireciona: string; permissoes: string[]
}

const PERFIS: Perfil[] = [
  {
    value: 'SUPER_ADMIN', label: 'Super Admin', emoji: '👑', cor: '#C62828',
    desc: 'Acesso irrestrito a todo o sistema. Reservado para TI/administrador técnico.',
    redireciona: '/admin',
    permissoes: ['*'],
  },
  {
    value: 'ADMIN_MUNICIPIO', label: 'Administrador Municipal', emoji: '🛡️', cor: '#6A1B9A',
    desc: 'Gestão completa do portal e dos módulos. Pode criar usuários e configurar o sistema.',
    redireciona: '/admin',
    permissoes: ['admin:*', 'comunicacao:*', 'ouvidoria:*', 'transparencia:*'],
  },
  {
    value: 'GESTOR', label: 'Gestor / Comunicação', emoji: '📢', cor: '#1565C0',
    desc: 'Gestão de notícias, agenda, mídia e conteúdo. Redirecionado para módulo SECOM.',
    redireciona: '/admin/comunicacao',
    permissoes: ['comunicacao:*', 'midia:*', 'agenda:*'],
  },
  {
    value: 'OPERADOR', label: 'Servidor de Secretaria', emoji: '🏢', cor: '#00695C',
    desc: 'Acesso ao módulo da sua secretaria. Redirecionado para a área da secretaria cadastrada.',
    redireciona: '/admin/secretaria/{slug}',
    permissoes: ['{secretaria}:read', '{secretaria}:create', '{secretaria}:update'],
  },
  {
    value: 'VISUALIZADOR', label: 'Ouvidoria / Consulta', emoji: '📬', cor: '#AD1457',
    desc: 'Acesso somente leitura. Gestão de demandas da ouvidoria.',
    redireciona: '/admin/ouvidoria',
    permissoes: ['ouvidoria:read', 'ouvidoria:update'],
  },
]

export default function PerfisPage() {
  const [selecionado, setSelecionado] = useState<Perfil | null>(null)

  return (
    <div style={{ padding: '28px 32px', fontFamily: 'Inter,sans-serif', maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#1B5E20' }}>🛡️ Perfis de Acesso</h1>
        <p style={{ margin: 0, color: '#888', fontSize: 14 }}>Controle de acesso por nível hierárquico. Cada usuário é automaticamente redirecionado para a área da sua secretaria após o login.</p>
      </div>

      {/* Fluxo de redirecionamento */}
      <div style={{ background: '#fff', borderRadius: 14, padding: 24, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>🔀 Fluxo de Login por Perfil</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Login', emoji: '🔐', cor: '#555' },
            { label: 'Admin/Super', emoji: '👑', cor: '#C62828', dest: 'Visão Geral' },
            { label: 'Comunicação', emoji: '📢', cor: '#1565C0', dest: 'Módulo SECOM' },
            { label: 'Ouvidoria', emoji: '📬', cor: '#AD1457', dest: 'Módulo Ouvidoria' },
            { label: 'Secretaria', emoji: '🏢', cor: '#00695C', dest: 'Módulo da Área' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {i > 0 && <span style={{ color: '#CCC', fontSize: 20 }}>→</span>}
              <div style={{
                background: item.cor + '10', border: `2px solid ${item.cor}30`,
                borderRadius: 10, padding: '8px 14px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 18 }}>{item.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: item.cor }}>{item.label}</div>
                {(item as any).dest && <div style={{ fontSize: 10, color: '#888' }}>→ {(item as any).dest}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cards de perfis */}
      <div style={{ display: 'grid', gap: 14 }}>
        {PERFIS.map(p => (
          <div key={p.value}
            onClick={() => setSelecionado(selecionado?.value === p.value ? null : p)}
            style={{
              background: '#fff', borderRadius: 14, padding: '20px 24px', cursor: 'pointer',
              borderLeft: `5px solid ${p.cor}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              transition: 'transform 0.15s, box-shadow 0.15s',
              border: selecionado?.value === p.value ? `2px solid ${p.cor}` : `1px solid #E8E8E8`,
              borderLeftWidth: 5,
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)' }}
            onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 28 }}>{p.emoji}</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#1A1A1A' }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{p.desc}</div>
                </div>
              </div>
              <div style={{ background: p.cor + '10', color: p.cor, borderRadius: 7, padding: '4px 12px', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {p.value}
              </div>
            </div>

            {selecionado?.value === p.value && (
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #F0F0F0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>Redirecionamento após login</div>
                  <div style={{ background: '#F9FBF9', borderRadius: 7, padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, color: '#1B5E20', fontWeight: 600 }}>
                    {p.redireciona}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>Permissões padrão</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {p.permissoes.map(perm => (
                      <span key={perm} style={{ background: p.cor + '10', color: p.cor, borderRadius: 5, padding: '3px 8px', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Nota de segurança */}
      <div style={{ background: '#FFF8E1', border: '1px solid #F9A825', borderRadius: 10, padding: '14px 20px', marginTop: 24, fontSize: 13, color: '#555' }}>
        🔒 <strong>LGPD & Segurança:</strong> Todos os acessos são registrados em log de auditoria. Sessões expiram após 8h de inatividade. MFA disponível para todos os perfis. Dados conforme Lei 13.709/2018.
      </div>
    </div>
  )
}
