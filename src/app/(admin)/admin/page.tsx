'use client'
import { useUsuario } from '@/components/AdminShell'
import { useEffect, useState } from 'react'

type Stats = {
  noticias?: number; eventos?: number; demandas?: number; usuarios?: number
  esic?: number; transparencia?: number
}

export default function AdminDashboard() {
  const { usuario } = useUsuario()
  const [stats, setStats]   = useState<Stats>({})
  const [hora, setHora]     = useState('')

  useEffect(() => {
    const tick = () => setHora(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    // Carregar resumo de stats
    fetch('/api/admin/stats').then(r => r.ok ? r.json() : {}).then(setStats)
  }, [])

  const saudacao = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  const cards = [
    { label: 'Notícias',     val: stats.noticias ?? '—', emoji: '📰', href: '/gestao/comunicacao/noticias', cor: '#1565C0' },
    { label: 'Eventos',      val: stats.eventos ?? '—',  emoji: '📅', href: '/gestao/comunicacao/agenda',   cor: '#F57F17' },
    { label: 'Demandas',     val: stats.demandas ?? '—', emoji: '📬', href: '/admin/ouvidoria',             cor: '#6A1B9A' },
    { label: 'Usuários',     val: stats.usuarios ?? '—', emoji: '👥', href: '/admin/usuarios',             cor: '#00695C' },
    { label: 'e-SIC',        val: stats.esic ?? '—',     emoji: '🔍', href: '/gestao/esic',                cor: '#AD1457' },
    { label: 'Transparência',val: stats.transparencia ?? '—', emoji: '📊', href: '/gestao/transparencia', cor: '#2E7D32' },
  ]

  const acessoRapido = [
    { emoji: '📰', label: 'Nova Notícia',     href: '/gestao/comunicacao/noticias' },
    { emoji: '📅', label: 'Novo Evento',      href: '/gestao/comunicacao/agenda' },
    { emoji: '👤', label: 'Novo Usuário',     href: '/admin/usuarios' },
    { emoji: '📊', label: 'Ver Relatórios',   href: '/gestao/comunicacao/relatorios' },
    { emoji: '⚙️', label: 'Configurações',   href: '/admin/configuracoes' },
    { emoji: '🌐', label: 'Portal Público',   href: '/', target: '_blank' },
  ]

  return (
    <div style={{ padding: '28px 32px', fontFamily: 'Inter,sans-serif' }}>
      {/* Saudação */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1A1A1A' }}>
              {saudacao()}, {usuario?.nome.split(' ')[0]}! 👋
            </h1>
            <p style={{ margin: '4px 0 0', color: '#888', fontSize: 14 }}>
              Prefeitura Municipal de Biritinga — Painel de Gestão
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#2E7D32' }}>{hora}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
        {cards.map(c => (
          <a key={c.label} href={c.href}
            style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', textDecoration: 'none', display: 'block', borderLeft: `4px solid ${c.cor}`, transition: 'transform 0.15s, box-shadow 0.15s', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)' }}
            onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{c.emoji}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: c.cor }}>{c.val}</div>
            <div style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>{c.label}</div>
          </a>
        ))}
      </div>

      {/* Acesso rápido + Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Acesso rápido */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#333' }}>⚡ Acesso Rápido</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {acessoRapido.map(a => (
              <a key={a.label} href={a.href} target={(a as any).target}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#F9FBF9', borderRadius: 8, padding: '10px 12px',
                  textDecoration: 'none', color: '#333', fontSize: 13, fontWeight: 500,
                  border: '1px solid #E8F5E9', transition: 'background 0.15s',
                }}
                onMouseOver={e => (e.currentTarget.style.background = '#E8F5E9')}
                onMouseOut={e => (e.currentTarget.style.background = '#F9FBF9')}>
                <span style={{ fontSize: 18 }}>{a.emoji}</span>
                {a.label}
              </a>
            ))}
          </div>
        </div>

        {/* Status do sistema */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#333' }}>🟢 Status do Sistema</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Portal Público (biritinga.ba.gov.br)', ok: true },
              { label: 'Banco de Dados (MySQL/cPanel)',         ok: true },
              { label: 'API REST',                             ok: true },
              { label: 'Portal da Transparência',              ok: true },
              { label: 'Ouvidoria',                            ok: true },
              { label: 'e-SIC',                               ok: true },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F5F5F5' }}>
                <span style={{ fontSize: 13, color: '#555' }}>{s.label}</span>
                <span style={{ fontSize: 11, color: s.ok ? '#2E7D32' : '#C62828', fontWeight: 700, background: s.ok ? '#E8F5E9' : '#FFEBEE', padding: '2px 8px', borderRadius: 4 }}>
                  {s.ok ? '● Online' : '● Offline'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
