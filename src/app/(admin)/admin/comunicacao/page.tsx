'use client'
import { useState, useEffect } from 'react'
import AdminShell from '@/components/AdminShell'

type Stats = {
  totalNoticias: number; publicadas: number; rascunhos: number; emRevisao: number
  totalEventos: number; eventosProximos: number; totalMidias: number; totalAlbums: number
  ultimasNoticias: { id: string; titulo: string; status: string; criadoEm: string }[]
  proximosEventos: { id: string; titulo: string; tipo: string; dataInicio: string; local?: string }[]
}

const STATUS_COR: Record<string, string> = {
  RASCUNHO: '#6B7280', REVISAO: '#D97706', PUBLICADA: '#059669', ARQUIVADA: '#374151',
}

export default function ComunicacaoDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    fetch('/api/comunicacao/dashboard').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setStats(d)
      setCarregando(false)
    })
  }, [])

  const cards = stats ? [
    { label: 'Total de Publicações', valor: stats.totalNoticias, cor: '#1B5E20', emoji: '📰', href: '/gestao/comunicacao/noticias' },
    { label: 'Publicadas', valor: stats.publicadas, cor: '#059669', emoji: '✅', href: '/gestao/comunicacao/noticias?status=PUBLICADA' },
    { label: 'Em Revisão', valor: stats.emRevisao, cor: '#D97706', emoji: '👁️', href: '/gestao/comunicacao/noticias?status=REVISAO' },
    { label: 'Rascunhos', valor: stats.rascunhos, cor: '#6B7280', emoji: '✏️', href: '/gestao/comunicacao/noticias?status=RASCUNHO' },
    { label: 'Eventos na Agenda', valor: stats.totalEventos, cor: '#1565C0', emoji: '📅', href: '/gestao/comunicacao/agenda' },
    { label: 'Próximos Eventos', valor: stats.eventosProximos, cor: '#7C3AED', emoji: '🔜', href: '/gestao/comunicacao/agenda?status=PROGRAMADO' },
    { label: 'Arquivos de Mídia', valor: stats.totalMidias, cor: '#B45309', emoji: '🖼️', href: '/gestao/comunicacao/midia' },
    { label: 'Álbuns', valor: stats.totalAlbums, cor: '#BE185D', emoji: '📁', href: '/gestao/comunicacao/midia' },
  ] : []

  return (
    <AdminShell>
      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {/* Cabeçalho */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1B5E20' }}>📢 SECOM — Comunicação Institucional</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#666' }}>
            Gerenciamento de notícias, agenda de eventos e galeria de mídia da Prefeitura de Biritinga
          </p>
        </div>

        {/* Cards de estatísticas */}
        {carregando ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>Carregando dados...</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
              {cards.map(c => (
                <a key={c.label} href={c.href} style={{ textDecoration: 'none' }}>
                  <div style={{ background: '#fff', borderRadius: 10, padding: '18px 20px', border: '1px solid #E5E7EB', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                    onMouseOver={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
                    onMouseOut={e => (e.currentTarget.style.boxShadow = 'none')}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{c.emoji}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: c.cor, lineHeight: 1 }}>{c.valor}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{c.label}</div>
                  </div>
                </a>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Últimas publicações */}
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111' }}>📰 Últimas Publicações</h2>
                  <a href="/gestao/comunicacao/noticias" style={{ fontSize: 12, color: '#1565C0', textDecoration: 'none' }}>Ver todas →</a>
                </div>
                {stats?.ultimasNoticias?.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#999', fontSize: 13 }}>Nenhuma publicação ainda.</div>
                ) : (
                  <div>
                    {stats?.ultimasNoticias?.map((n, i) => (
                      <div key={n.id} style={{ padding: '12px 20px', borderBottom: i < (stats.ultimasNoticias.length - 1) ? '1px solid #F9FAFB' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.titulo}</div>
                          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{new Date(n.criadoEm).toLocaleDateString('pt-BR')}</div>
                        </div>
                        <span style={{ background: STATUS_COR[n.status] + '20', color: STATUS_COR[n.status], padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                          {n.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Próximos eventos */}
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111' }}>📅 Próximos Eventos</h2>
                  <a href="/gestao/comunicacao/agenda" style={{ fontSize: 12, color: '#1565C0', textDecoration: 'none' }}>Ver agenda →</a>
                </div>
                {stats?.proximosEventos?.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#999', fontSize: 13 }}>Nenhum evento programado.</div>
                ) : (
                  <div>
                    {stats?.proximosEventos?.map((e, i) => (
                      <div key={e.id} style={{ padding: '12px 20px', borderBottom: i < (stats.proximosEventos.length - 1) ? '1px solid #F9FAFB' : 'none' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#111', marginBottom: 2 }}>{e.titulo}</div>
                        <div style={{ fontSize: 11, color: '#888', display: 'flex', gap: 10 }}>
                          <span>📆 {new Date(e.dataInicio).toLocaleDateString('pt-BR')}</span>
                          {e.local && <span>📍 {e.local}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Atalhos de ação */}
            <div style={{ marginTop: 24, background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0', padding: '20px 24px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 14 }}>⚡ Ações Rápidas</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { href: '/gestao/comunicacao/noticias', label: '+ Nova Notícia', bg: '#1B5E20', color: '#fff' },
                  { href: '/gestao/comunicacao/agenda', label: '+ Novo Evento', bg: '#1565C0', color: '#fff' },
                  { href: '/gestao/comunicacao/midia', label: '+ Adicionar Mídia', bg: '#B45309', color: '#fff' },
                  { href: '/gestao/comunicacao/relatorios', label: '📊 Relatórios', bg: '#fff', color: '#1B5E20' },
                ].map(a => (
                  <a key={a.href} href={a.href}
                    style={{ background: a.bg, color: a.color, border: a.bg === '#fff' ? '1px solid #1B5E20' : 'none', borderRadius: 8, padding: '9px 18px', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                    {a.label}
                  </a>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  )
}
