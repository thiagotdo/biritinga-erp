'use client'
import { useEffect, useState } from 'react'

export default function ComunicacaoDashboard() {
  const [dados, setDados] = useState<any>(null)

  useEffect(() => {
    fetch('/api/comunicacao/relatorio?tipo=DASHBOARD').then(r => r.json()).then(setDados)
  }, [])

  const totalNoticias = dados?.noticiasPorStatus?.reduce((s: number, n: any) => s + n._count._all, 0) ?? 0
  const publicadas    = dados?.noticiasPorStatus?.find((n: any) => n.status === 'PUBLICADA')?._count._all ?? 0
  const totalEventos  = dados?.eventosPorStatus?.reduce((s: number, n: any) => s + n._count._all, 0) ?? 0

  return (
    <div style={{ padding: '28px 32px', fontFamily: 'Inter,sans-serif' }}>
      <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#1B5E20' }}>📢 Secretaria de Comunicação — SECOM</h1>
      <p style={{ margin: '0 0 28px', color: '#888', fontSize: 14 }}>Painel central de comunicação e conteúdo institucional</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Notícias', val: totalNoticias, sub: `${publicadas} publicadas`, emoji: '📰', cor: '#1565C0', href: '/gestao/comunicacao/noticias' },
          { label: 'Eventos',        val: totalEventos,  sub: `${dados?.emSemana ?? 0} esta semana`, emoji: '📅', cor: '#F57F17', href: '/gestao/comunicacao/agenda' },
          { label: 'Visualizações',  val: (dados?.totalVisualizacoes ?? 0).toLocaleString('pt-BR'), sub: 'acumulado', emoji: '👁️', cor: '#2E7D32', href: '/gestao/comunicacao/relatorios' },
        ].map(c => (
          <a key={c.label} href={c.href}
            style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', textDecoration: 'none', display: 'block', borderLeft: `4px solid ${c.cor}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{c.emoji}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: c.cor }}>{c.val}</div>
            <div style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>{c.label}</div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{c.sub}</div>
          </a>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Atalhos */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>⚡ Ações Rápidas</h3>
          {[
            { href: '/gestao/comunicacao/noticias', emoji: '📰', label: 'Gerenciar Notícias' },
            { href: '/gestao/comunicacao/agenda',   emoji: '📅', label: 'Agenda de Eventos' },
            { href: '/gestao/comunicacao/midia',    emoji: '🗂️', label: 'Galeria de Mídia' },
            { href: '/gestao/comunicacao/relatorios', emoji: '📊', label: 'Relatórios' },
          ].map(a => (
            <a key={a.href} href={a.href}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, textDecoration: 'none', color: '#333', fontSize: 13, fontWeight: 500, marginBottom: 4, transition: 'background 0.15s' }}
              onMouseOver={e => (e.currentTarget.style.background = '#E8F5E9')}
              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ fontSize: 18 }}>{a.emoji}</span> {a.label}
            </a>
          ))}
        </div>

        {/* Próximos eventos */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>📅 Próximos Eventos</h3>
          {!dados?.proximosEventos?.length
            ? <p style={{ color: '#999', fontSize: 13 }}>Nenhum evento próximo.</p>
            : dados.proximosEventos.slice(0, 4).map((ev: any) => (
              <div key={ev.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F5F5F5' }}>
                <div style={{ background: '#E8F5E9', borderRadius: 6, padding: '4px 8px', textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#2E7D32' }}>{new Date(ev.dataInicio).getDate()}</div>
                  <div style={{ fontSize: 9, color: '#888' }}>{new Date(ev.dataInicio).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{ev.titulo}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{ev.local ?? ''}</div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
