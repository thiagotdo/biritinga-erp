'use client'
import { useState, useEffect } from 'react'
import { Landmark, Map, Accessibility, Search } from 'lucide-react'

/**
 * Header do Portal Público com link "Acesso Restrito" para o painel admin.
 * Adicione ao layout principal do portal: <PortalHeader />
 */
export default function PortalHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <>
      {/* Barra superior de acessibilidade / utilidades */}
      <div style={{
        background: '#1B5E20', color: '#fff', fontSize: 11,
        padding: '4px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Landmark size={12} color="#fff" strokeWidth={1.5} /> Prefeitura Municipal de Biritinga — Estado da Bahia — CNPJ: 13.831.566/0001-10</span>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <a href="/acessibilidade" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Accessibility size={11} /> Acessibilidade</a>
          <a href="/mapa-do-site" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Map size={11} /> Mapa do Site</a>
          {/* ════ LINK ACESSO RESTRITO ════ */}
          <a href="/login"
            style={{
              background: '#F9A825', color: '#1B5E20', textDecoration: 'none',
              padding: '3px 10px', borderRadius: 4, fontWeight: 700, fontSize: 11,
              display: 'flex', alignItems: 'center', gap: 4,
              transition: 'background 0.15s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#FFD600')}
            onMouseOut={e => (e.currentTarget.style.background = '#F9A825')}>
            🔐 Acesso Restrito
          </a>
        </div>
      </div>

      {/* Header principal */}
      <header style={{
        background: '#fff',
        boxShadow: scrolled ? '0 2px 12px rgba(0,0,0,0.1)' : '0 1px 0 #E0E0E0',
        position: 'sticky', top: 0, zIndex: 100,
        transition: 'box-shadow 0.2s',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', height: 64, gap: 24,
        }}>
          {/* Logo */}
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <div style={{
              width: 44, height: 44, background: '#1B5E20', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Landmark size={22} color="#fff" strokeWidth={1.5} /></div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#1B5E20', lineHeight: 1.2 }}>Prefeitura Municipal</div>
              <div style={{ fontSize: 12, color: '#888' }}>de Biritinga — Bahia</div>
            </div>
          </a>

          {/* Nav */}
          <nav style={{ display: 'flex', gap: 4, flex: 1, justifyContent: 'center' }}>
            {[
              { href: '/',                label: 'Início' },
              { href: '/noticias',        label: 'Notícias' },
              { href: '/servicos',        label: 'Serviços' },
              { href: '/transparencia',   label: 'Transparência' },
              { href: '/ouvidoria',       label: 'Ouvidoria' },
              { href: '/esic',            label: 'e-SIC' },
            ].map(item => (
              <a key={item.href} href={item.href}
                style={{
                  padding: '8px 14px', borderRadius: 7, textDecoration: 'none',
                  fontSize: 13, fontWeight: 500, color: '#333',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseOver={e => { e.currentTarget.style.background = '#E8F5E9'; e.currentTarget.style.color = '#1B5E20' }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#333' }}>
                {item.label}
              </a>
            ))}
          </nav>

          {/* Busca + Acesso Restrito (repetido como botão no header) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <input placeholder="Buscar no portal..."
                style={{
                  border: '1px solid #E0E0E0', borderRadius: 20, padding: '7px 14px 7px 36px',
                  fontSize: 13, outline: 'none', width: 200,
                }}
                onFocus={e => (e.target.style.borderColor = '#2E7D32')}
                onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
              />
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
            </div>
            <a href="/login"
              style={{
                background: '#1B5E20', color: '#fff', textDecoration: 'none',
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'background 0.15s',
              }}
              onMouseOver={e => (e.currentTarget.style.background = '#2E7D32')}
              onMouseOut={e => (e.currentTarget.style.background = '#1B5E20')}>
              🔐 Área Restrita
            </a>
          </div>
        </div>
      </header>
    </>
  )
}
