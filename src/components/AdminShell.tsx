'use client'
import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

// ─── Contexto do usuário logado ───────────────────────────────────────────────

type Usuario = {
  id: string; nome: string; email: string; perfil: string
  secretaria?: string; avatarUrl?: string
}

const CtxUsuario = createContext<{ usuario: Usuario | null; sair: () => void }>({
  usuario: null, sair: () => {},
})

export function useUsuario() { return useContext(CtxUsuario) }

// ─── Mapa de navegação por perfil ────────────────────────────────────────────

const NAV_ADMIN = [
  { grupo: 'Gestão', items: [
    { href: '/admin', label: 'Visão Geral', emoji: '🏠' },
    { href: '/admin/usuarios', label: 'Usuários', emoji: '👥' },
    { href: '/admin/perfis', label: 'Perfis de Acesso', emoji: '🛡️' },
    { href: '/admin/configuracoes', label: 'Configurações', emoji: '⚙️' },
  ]},
  { grupo: 'Módulos', items: [
    { href: '/admin/comunicacao', label: 'Comunicação', emoji: '📢' },
    { href: '/admin/ouvidoria', label: 'Ouvidoria', emoji: '📬' },
    { href: '/admin/transparencia', label: 'Transparência', emoji: '📊' },
  ]},
  { grupo: 'ERP', items: [
    { href: '/gestao/sefin', label: 'Financeiro', emoji: '💰' },
    { href: '/gestao/semad', label: 'Administrativo', emoji: '🗂️' },
    { href: '/gestao/semsa', label: 'Saúde', emoji: '🏥' },
    { href: '/gestao/seduc', label: 'Educação', emoji: '🎓' },
    { href: '/gestao/comunicacao/noticias', label: 'SECOM', emoji: '📰' },
  ]},
]

const NAV_COMUNICACAO = [
  { grupo: 'Comunicação', items: [
    { href: '/admin/comunicacao', label: 'Dashboard', emoji: '🏠' },
    { href: '/gestao/comunicacao/noticias', label: 'Notícias', emoji: '📰' },
    { href: '/gestao/comunicacao/agenda', label: 'Agenda', emoji: '📅' },
    { href: '/gestao/comunicacao/midia', label: 'Galeria de Mídia', emoji: '🗂️' },
    { href: '/gestao/comunicacao/relatorios', label: 'Relatórios', emoji: '📊' },
  ]},
]

const NAV_OUVIDORIA = [
  { grupo: 'Ouvidoria', items: [
    { href: '/admin/ouvidoria', label: 'Dashboard', emoji: '🏠' },
    { href: '/admin/ouvidoria/demandas', label: 'Demandas', emoji: '📬' },
    { href: '/admin/ouvidoria/relatorios', label: 'Relatórios', emoji: '📊' },
  ]},
]

const NAV_SECRETARIA: Record<string, { grupo: string; items: { href: string; label: string; emoji: string }[] }[]> = {
  SEMSA:  [{ grupo: 'Saúde',      items: [{ href: '/gestao/semsa', label: 'Painel SEMSA', emoji: '🏥' }] }],
  SEDUC:  [{ grupo: 'Educação',   items: [{ href: '/gestao/seduc', label: 'Painel SEDUC', emoji: '🎓' }] }],
  SEFIN:  [{ grupo: 'Financeiro', items: [{ href: '/gestao/sefin', label: 'Painel SEFIN', emoji: '💰' }] }],
  SEMAD:  [{ grupo: 'Administrativo', items: [{ href: '/gestao/semad', label: 'Painel SEMAD', emoji: '🗂️' }] }],
  SEMMA:  [{ grupo: 'Meio Ambiente', items: [{ href: '/gestao/semma', label: 'Painel SEMMA', emoji: '🌿' }] }],
  SEMOB:  [{ grupo: 'Obras', items: [{ href: '/gestao/semob', label: 'Painel SEMOB', emoji: '🏗️' }] }],
}

function navPorPerfil(perfil: string, secretaria?: string) {
  if (perfil === 'SUPER_ADMIN' || perfil === 'ADMIN_MUNICIPIO') return NAV_ADMIN
  if (perfil === 'GESTOR' && secretaria?.toUpperCase().includes('COMUNICACAO')) return NAV_COMUNICACAO
  if (perfil === 'VISUALIZADOR') return NAV_OUVIDORIA
  if (secretaria) return NAV_SECRETARIA[secretaria.toUpperCase()] ?? NAV_ADMIN
  return NAV_ADMIN
}

// ─── Shell principal ──────────────────────────────────────────────────────────

export default function AdminShell({ children }: { children: ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [usuario, setUsuario]       = useState<Usuario | null>(null)
  const [sidebarOpen, setSidebar]   = useState(true)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    // Verificar sessão atual
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(data => {
      if (!data?.usuario) { router.push('/login'); return }
      setUsuario(data.usuario)
      setCarregando(false)
    })
  }, [router])

  async function sair() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (carregando) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter,sans-serif', background: '#F4F6F8' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '4px solid #E0E0E0', borderTopColor: '#2E7D32', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: '#666', fontSize: 14 }}>Verificando acesso...</p>
      </div>
    </div>
  )

  if (!usuario) return null

  const nav = navPorPerfil(usuario.perfil, usuario.secretaria)

  return (
    <CtxUsuario.Provider value={{ usuario, sair }}>
      <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter,sans-serif', overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside style={{
          width: sidebarOpen ? 260 : 64, background: '#1B5E20',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
          transition: 'width 0.25s ease', overflow: 'hidden',
        }}>
          {/* Logo / cabeçalho */}
          <div style={{
            padding: sidebarOpen ? '20px 20px 16px' : '20px 12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', gap: 10, minHeight: 72,
          }}>
            <span style={{ fontSize: 28, flexShrink: 0 }}>🏛️</span>
            {sidebarOpen && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 13, lineHeight: 1.2 }}>Prefeitura de</div>
                <div style={{ color: '#F9A825', fontWeight: 800, fontSize: 14 }}>Biritinga/BA</div>
              </div>
            )}
            <button onClick={() => setSidebar(v => !v)}
              style={{
                marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none',
                borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '4px 7px', fontSize: 14, flexShrink: 0,
              }}>
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>

          {/* Nav links */}
          <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
            {nav.map(grupo => (
              <div key={grupo.grupo}>
                {sidebarOpen && (
                  <div style={{ padding: '8px 20px 4px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    {grupo.grupo}
                  </div>
                )}
                {grupo.items.map(item => {
                  const ativo = pathname === item.href
                  return (
                    <a key={item.href} href={item.href}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: sidebarOpen ? '10px 20px' : '10px 20px',
                        color: ativo ? '#F9A825' : 'rgba(255,255,255,0.75)',
                        background: ativo ? 'rgba(249,168,37,0.12)' : 'transparent',
                        textDecoration: 'none', fontSize: 13, fontWeight: ativo ? 700 : 400,
                        borderLeft: ativo ? '3px solid #F9A825' : '3px solid transparent',
                        transition: 'all 0.15s', borderRadius: sidebarOpen ? '0 6px 6px 0' : 0,
                        whiteSpace: 'nowrap', overflow: 'hidden',
                      }}
                      onMouseOver={e => { if (!ativo) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                      onMouseOut={e => { if (!ativo) e.currentTarget.style.background = 'transparent' }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{item.emoji}</span>
                      {sidebarOpen && item.label}
                    </a>
                  )
                })}
              </div>
            ))}
          </nav>

          {/* Usuário */}
          <div style={{
            padding: sidebarOpen ? '16px 20px' : '16px 10px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: '#F9A825',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700, color: '#1B5E20', flexShrink: 0,
              }}>
                {usuario.nome.charAt(0).toUpperCase()}
              </div>
              {sidebarOpen && (
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{usuario.nome}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{PERFIL_LABEL[usuario.perfil] ?? usuario.perfil}</div>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <button onClick={sair}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 7, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: '7px 0',
                  fontSize: 12, fontWeight: 500,
                }}>
                🚪 Sair
              </button>
            )}
          </div>
        </aside>

        {/* Conteúdo principal */}
        <main style={{ flex: 1, overflowY: 'auto', background: '#F4F6F8' }}>
          {/* Topbar */}
          <div style={{
            background: '#fff', borderBottom: '1px solid #E0E0E0',
            padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'sticky', top: 0, zIndex: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: '#999' }}>Portal ›</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>
                {pathname.split('/').filter(Boolean).slice(1).join(' › ').replace(/-/g, ' ') || 'Início'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <a href="/" target="_blank"
                style={{ fontSize: 12, color: '#1565C0', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                🌐 Ver Portal
              </a>
              <div style={{
                background: '#E8F5E9', color: '#2E7D32', borderRadius: 6,
                padding: '3px 10px', fontSize: 11, fontWeight: 600,
              }}>
                {PERFIL_LABEL[usuario.perfil] ?? usuario.perfil}
              </div>
            </div>
          </div>

          {/* Conteúdo da página */}
          <div style={{ minHeight: 'calc(100vh - 56px)' }}>
            {children}
          </div>
        </main>
      </div>
    </CtxUsuario.Provider>
  )
}

const PERFIL_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_MUNICIPIO: 'Administrador',
  GESTOR: 'Gestor',
  OPERADOR: 'Operador',
  VISUALIZADOR: 'Visualizador',
}
