'use client'
import { useState, useEffect } from 'react'

type Dashboard = {
  noticiasPorStatus: { status: string; _count: { _all: number } }[]
  noticiasPorTipo:   { tipo: string;   _count: { _all: number } }[]
  eventosPorStatus:  { status: string; _count: { _all: number } }[]
  midiasPorTipo:     { tipo: string;   _count: { _all: number } }[]
  proximosEventos:   { id: string; titulo: string; tipo: string; local?: string; dataInicio: string; horaInicio?: string }[]
  ultimasNoticias:   { id: string; titulo: string; tipo: string; visualizacoes: number; dataPublicacao: string; imagemCapa?: string }[]
  totalVisualizacoes: number
  publicacoesMes:    { mes: string; noticias: number; eventos: number }[]
  emSemana:          number
}

type MaisLidas = { id: string; titulo: string; tipo: string; visualizacoes: number; dataPublicacao: string; secretaria?: string }[]

const STATUS_NOTICIA_COR: Record<string, string> = {
  RASCUNHO: '#9E9E9E', REVISAO: '#1565C0', PUBLICADA: '#2E7D32', ARQUIVADA: '#795548'
}
const STATUS_EVENTO_COR: Record<string, string> = {
  PROGRAMADO: '#1565C0', EM_ANDAMENTO: '#F9A825', REALIZADO: '#2E7D32', CANCELADO: '#C62828', ADIADO: '#6A1B9A'
}
const TIPO_NOTICIA_COR: Record<string, string> = {
  NOTICIA: '#1565C0', NOTA_OFICIAL: '#2E7D32', COMUNICADO: '#F57F17', DECRETO: '#6A1B9A',
  PORTARIA: '#AD1457', EDITAL: '#00695C', RESULTADO: '#E65100'
}
const TIPO_MIDIA_COR: Record<string, string> = {
  FOTO: '#1565C0', VIDEO: '#AD1457', DOCUMENTO: '#2E7D32', AUDIO: '#6A1B9A'
}
const TIPO_EVENTO_EMOJI: Record<string, string> = {
  REUNIAO: '🤝', AUDIENCIA_PUBLICA: '🏛️', EVENTO_CULTURAL: '🎭', INAUGURACAO: '🎉',
  CAPACITACAO: '📚', PALESTRA: '🎤', ESPORTIVO: '⚽', SAUDE: '🏥', OUTRO: '📌'
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function BarChart({ data, corFn, label }: { data: { key: string; val: number }[]; corFn: (k: string) => string; label?: (k: string) => string }) {
  const max = Math.max(...data.map(d => d.val), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map(d => (
        <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 100, fontSize: 11, color: '#555', textAlign: 'right', flexShrink: 0 }}>{label ? label(d.key) : d.key}</div>
          <div style={{ flex: 1, background: '#F5F5F5', borderRadius: 4, overflow: 'hidden', height: 20 }}>
            <div style={{ width: `${(d.val / max) * 100}%`, height: '100%', background: corFn(d.key), borderRadius: 4, minWidth: d.val > 0 ? 4 : 0 }} />
          </div>
          <div style={{ width: 28, fontSize: 12, fontWeight: 700, color: '#333', flexShrink: 0 }}>{d.val}</div>
        </div>
      ))}
    </div>
  )
}

function LineChart({ data }: { data: { mes: string; noticias: number; eventos: number }[] }) {
  const maxVal = Math.max(...data.flatMap(d => [d.noticias, d.eventos]), 1)
  const W = 100 / (data.length - 1)

  function points(vals: number[]) {
    return vals.map((v, i) => `${i * W},${100 - (v / maxVal) * 90}`).join(' ')
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#1565C0' }}>● Notícias</span>
        <span style={{ fontSize: 11, color: '#F9A825' }}>● Eventos</span>
      </div>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: 160 }} preserveAspectRatio="none">
        <polyline points={points(data.map(d => d.noticias))} fill="none" stroke="#1565C0" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <polyline points={points(data.map(d => d.eventos))} fill="none" stroke="#F9A825" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {data.map((d, i) => (
          <circle key={i} cx={i * W} cy={100 - (d.noticias / maxVal) * 90} r="1.5" fill="#1565C0" vectorEffect="non-scaling-stroke" />
        ))}
        {data.map((d, i) => (
          <circle key={i + 'e'} cx={i * W} cy={100 - (d.eventos / maxVal) * 90} r="1.5" fill="#F9A825" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {data.filter((_, i) => i % 3 === 0 || i === data.length - 1).map((d, i) => (
          <span key={i} style={{ fontSize: 9, color: '#999' }}>{d.mes}</span>
        ))}
      </div>
    </div>
  )
}

export default function RelatoriosPage() {
  const [dash, setDash]         = useState<Dashboard | null>(null)
  const [maisLidas, setMaisLidas] = useState<MaisLidas>([])
  const [aba, setAba]           = useState<'dashboard'|'mais_lidas'>('dashboard')
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/comunicacao/relatorio?tipo=DASHBOARD').then(r => r.json()),
      fetch('/api/comunicacao/relatorio?tipo=MAIS_LIDAS').then(r => r.json()),
    ]).then(([d, m]) => {
      setDash(d)
      setMaisLidas(m.noticias ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter,sans-serif', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #E0E0E0', borderTopColor: '#2E7D32', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{ color: '#666', fontSize: 14 }}>Carregando relatórios...</span>
    </div>
  )

  const totalNoticias = dash?.noticiasPorStatus.reduce((s, n) => s + n._count._all, 0) ?? 0
  const totalEventos  = dash?.eventosPorStatus.reduce((s, n) => s + n._count._all, 0) ?? 0
  const totalMidias   = dash?.midiasPorTipo.reduce((s, n) => s + n._count._all, 0) ?? 0
  const publicadas    = dash?.noticiasPorStatus.find(n => n.status === 'PUBLICADA')?._count._all ?? 0

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Inter,sans-serif', background: '#F4F6F8' }}>
      {/* Header */}
      <div style={{ background: '#fff', padding: '20px 24px', borderBottom: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1B5E20' }}>📊 Relatórios — SECOM</h1>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: 13 }}>Secretaria de Comunicação · Visão Gerencial</p>
        </div>
        <div style={{ display: 'flex', border: '1px solid #DDD', borderRadius: 8, overflow: 'hidden' }}>
          {(['dashboard', 'mais_lidas'] as const).map(a => (
            <button key={a} onClick={() => setAba(a)}
              style={{ padding: '8px 18px', border: 'none', background: aba === a ? '#2E7D32' : '#fff', color: aba === a ? '#fff' : '#555', cursor: 'pointer', fontSize: 13, fontWeight: aba === a ? 600 : 400 }}>
              {a === 'dashboard' ? '📊 Dashboard' : '👁️ Mais Lidas'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {aba === 'dashboard' && dash && (
          <>
            {/* KPIs principais */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
              {[
                { label: 'Total Notícias', val: totalNoticias, sub: `${publicadas} publicadas`, cor: '#1565C0', emoji: '📰' },
                { label: 'Total Eventos', val: totalEventos, sub: `${dash.emSemana} esta semana`, cor: '#F9A825', emoji: '📅' },
                { label: 'Total Mídias', val: totalMidias, sub: 'fotos, vídeos, docs', cor: '#AD1457', emoji: '🗂️' },
                { label: 'Visualizações', val: dash.totalVisualizacoes.toLocaleString('pt-BR'), sub: 'total acumulado', cor: '#2E7D32', emoji: '👁️' },
              ].map((k, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', borderLeft: `4px solid ${k.cor}` }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{k.emoji}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: k.cor }}>{k.val}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{k.label}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Linha: gráfico publicações + próximos eventos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              {/* Publicações 12 meses */}
              <div style={{ background: '#fff', borderRadius: 12, padding: 20 }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#333' }}>📈 Publicações — Últimos 12 Meses</h3>
                <LineChart data={dash.publicacoesMes} />
              </div>

              {/* Próximos eventos */}
              <div style={{ background: '#fff', borderRadius: 12, padding: 20 }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#333' }}>📅 Próximos Eventos (30 dias)</h3>
                {dash.proximosEventos.length === 0
                  ? <p style={{ color: '#999', fontSize: 13 }}>Nenhum evento nos próximos 30 dias.</p>
                  : dash.proximosEventos.map(ev => (
                    <div key={ev.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F5F5F5' }}>
                      <div style={{ background: '#E8F5E9', borderRadius: 6, padding: '4px 8px', textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#2E7D32', lineHeight: 1 }}>{new Date(ev.dataInicio).getDate()}</div>
                        <div style={{ fontSize: 9, color: '#888' }}>{new Date(ev.dataInicio).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.titulo}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>{TIPO_EVENTO_EMOJI[ev.tipo] ?? '📌'} {ev.local ?? ''} {ev.horaInicio ? `· ${ev.horaInicio}` : ''}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Linha: notícias por status + por tipo + eventos + mídias */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20 }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: '#333' }}>📰 Notícias por Status</h3>
                <BarChart
                  data={dash.noticiasPorStatus.map(n => ({ key: n.status, val: n._count._all }))}
                  corFn={k => STATUS_NOTICIA_COR[k] ?? '#9E9E9E'}
                  label={k => ({ RASCUNHO: 'Rascunho', REVISAO: 'Revisão', PUBLICADA: 'Publicada', ARQUIVADA: 'Arquivada' }[k] ?? k)}
                />
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20 }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: '#333' }}>📰 Notícias por Tipo</h3>
                <BarChart
                  data={dash.noticiasPorTipo.map(n => ({ key: n.tipo, val: n._count._all }))}
                  corFn={k => TIPO_NOTICIA_COR[k] ?? '#9E9E9E'}
                  label={k => ({ NOTICIA: 'Notícia', NOTA_OFICIAL: 'Nota Oficial', COMUNICADO: 'Comunicado', DECRETO: 'Decreto', PORTARIA: 'Portaria', EDITAL: 'Edital', RESULTADO: 'Resultado' }[k] ?? k)}
                />
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20 }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: '#333' }}>📅 Eventos por Status</h3>
                <BarChart
                  data={dash.eventosPorStatus.map(n => ({ key: n.status, val: n._count._all }))}
                  corFn={k => STATUS_EVENTO_COR[k] ?? '#9E9E9E'}
                  label={k => ({ PROGRAMADO: 'Programado', EM_ANDAMENTO: 'Em andamento', REALIZADO: 'Realizado', CANCELADO: 'Cancelado', ADIADO: 'Adiado' }[k] ?? k)}
                />
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20 }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: '#333' }}>🗂️ Mídias por Tipo</h3>
                <BarChart
                  data={dash.midiasPorTipo.map(n => ({ key: n.tipo, val: n._count._all }))}
                  corFn={k => TIPO_MIDIA_COR[k] ?? '#9E9E9E'}
                  label={k => ({ FOTO: 'Foto', VIDEO: 'Vídeo', DOCUMENTO: 'Documento', AUDIO: 'Áudio' }[k] ?? k)}
                />
              </div>
            </div>

            {/* Últimas notícias publicadas */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#333' }}>📢 Últimas Notícias Publicadas</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 10 }}>
                {dash.ultimasNoticias.map(n => (
                  <div key={n.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 10, background: '#F9FBF9', borderRadius: 8 }}>
                    {n.imagemCapa
                      ? <img src={n.imagemCapa} alt="" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                      : <div style={{ width: 48, height: 36, background: (TIPO_NOTICIA_COR[n.tipo] ?? '#9E9E9E') + '20', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📰</div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.titulo}</div>
                      <div style={{ fontSize: 10, color: '#888', display: 'flex', gap: 6 }}>
                        <span>{formatDate(n.dataPublicacao)}</span>
                        <span>👁️ {n.visualizacoes.toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {aba === 'mais_lidas' && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 24 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>👁️ 20 Notícias Mais Lidas</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F9FBF9' }}>
                  {['#', 'Título', 'Tipo', 'Secretaria', 'Publicado', 'Visualizações'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #E0E0E0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {maisLidas.map((n, i) => (
                  <tr key={n.id} style={{ borderBottom: '1px solid #F5F5F5' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: i < 3 ? '#F9A825' : '#999' }}>
                      {i < 3 ? ['🥇','🥈','🥉'][i] : `${i + 1}º`}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 500, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.titulo}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: (TIPO_NOTICIA_COR[n.tipo] ?? '#9E9E9E') + '15', color: TIPO_NOTICIA_COR[n.tipo] ?? '#9E9E9E', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>
                        {{ NOTICIA: 'Notícia', NOTA_OFICIAL: 'Nota', COMUNICADO: 'Comunicado', DECRETO: 'Decreto', PORTARIA: 'Portaria', EDITAL: 'Edital', RESULTADO: 'Resultado' }[n.tipo] ?? n.tipo}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#666' }}>{n.secretaria ?? '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#888' }}>{formatDate(n.dataPublicacao)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, background: '#F5F5F5', borderRadius: 4, height: 6, overflow: 'hidden', minWidth: 60 }}>
                          <div style={{ width: `${(n.visualizacoes / (maisLidas[0]?.visualizacoes || 1)) * 100}%`, height: '100%', background: '#2E7D32', borderRadius: 4 }} />
                        </div>
                        <span style={{ fontWeight: 700, color: '#2E7D32' }}>{n.visualizacoes.toLocaleString('pt-BR')}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
