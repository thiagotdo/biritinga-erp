'use client'
import { useState, useEffect, useCallback } from 'react'

type Evento = {
  id: string; titulo: string; descricao?: string; tipo: string; status: string
  local?: string; endereco?: string; dataInicio: string; dataFim?: string
  horaInicio?: string; horaFim?: string; responsavel?: string; secretaria?: string
  publicoEsperado?: number; linkTransmissao?: string; destaque: boolean; criadoEm: string
}

const TIPO_INFO: Record<string, { label: string; emoji: string; cor: string }> = {
  AUDIENCIA_PUBLICA: { label: 'Audiência Pública', emoji: '🏛️', cor: '#1565C0' },
  REUNIAO:           { label: 'Reunião',           emoji: '🤝', cor: '#6A1B9A' },
  SHOW:              { label: 'Show',              emoji: '🎵', cor: '#AD1457' },
  ESPORTE:           { label: 'Esporte',           emoji: '⚽', cor: '#00695C' },
  CULTURAL:          { label: 'Cultural',          emoji: '🎭', cor: '#E65100' },
  SAUDE:             { label: 'Saúde',             emoji: '🏥', cor: '#2E7D32' },
  EDUCACAO:          { label: 'Educação',          emoji: '📚', cor: '#1B5E20' },
  INAUGURACAO:       { label: 'Inauguração',       emoji: '🎉', cor: '#F9A825' },
  OUTRO:             { label: 'Outro',             emoji: '📅', cor: '#546E7A' },
}

const STATUS_INFO: Record<string, { label: string; cor: string; bg: string }> = {
  PROGRAMADO:   { label: 'Programado',   cor: '#1565C0', bg: '#E3F2FD' },
  EM_ANDAMENTO: { label: 'Em Andamento', cor: '#2E7D32', bg: '#E8F5E9' },
  REALIZADO:    { label: 'Realizado',    cor: '#546E7A', bg: '#ECEFF1' },
  CANCELADO:    { label: 'Cancelado',    cor: '#C62828', bg: '#FFEBEE' },
  ADIADO:       { label: 'Adiado',       cor: '#E65100', bg: '#FBE9E7' },
}

function formatarData(dt: string) {
  const d = new Date(dt)
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

export default function AgendaPage() {
  const [eventos, setEventos]           = useState<Evento[]>([])
  const [kpiMap, setKpiMap]             = useState<Record<string, number>>({})
  const [proxSemana, setProxSemana]     = useState(0)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroTipo, setFiltroTipo]     = useState('')
  const [busca, setBusca]               = useState('')
  const [selecionado, setSelecionado]   = useState<Evento | null>(null)
  const [showModal, setShowModal]       = useState(false)
  const [form, setForm]                 = useState<any>({})
  const [loading, setLoading]           = useState(false)
  const [salvando, setSalvando]         = useState(false)
  const [viewMes, setViewMes]           = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (filtroStatus) qs.set('status', filtroStatus)
    if (filtroTipo)   qs.set('tipo', filtroTipo)
    if (busca)        qs.set('busca', busca)
    if (!filtroStatus && !filtroTipo && !busca) qs.set('proximos', '90')
    const r = await fetch(`/api/comunicacao/agenda?${qs}`).then(r => r.json())
    const kpis: Record<string, number> = {}
    r.kpiMap?.forEach((k: any) => { kpis[k.status] = k._count._all })
    setKpiMap(kpis)
    setEventos(r.eventos ?? [])
    setProxSemana(r.proxSemana ?? 0)
    setLoading(false)
  }, [filtroStatus, filtroTipo, busca])

  useEffect(() => { carregar() }, [carregar])

  async function salvar() {
    setSalvando(true)
    const metodo = form.id ? 'PATCH' : 'POST'
    const r = await fetch('/api/comunicacao/agenda', {
      method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
    }).then(r => r.json())
    setSalvando(false)
    if (r.evento) { setShowModal(false); carregar() }
    else alert(JSON.stringify(r.erro))
  }

  async function mudarStatus(id: string, status: string) {
    await fetch('/api/comunicacao/agenda', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status })
    })
    carregar()
    if (selecionado?.id === id) setSelecionado(prev => prev ? { ...prev, status } : null)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter,sans-serif', background: '#F4F6F8' }}>
      {/* Lista */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', background: '#fff', borderBottom: '1px solid #E0E0E0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1B5E20' }}>📅 Agenda de Eventos</h1>
              {proxSemana > 0 && <p style={{ margin: '4px 0 0', color: '#E65100', fontSize: 13, fontWeight: 600 }}>⚠️ {proxSemana} evento(s) nos próximos 7 dias</p>}
            </div>
            <button onClick={() => { setForm({ tipo: 'OUTRO', status: 'PROGRAMADO', destaque: false }); setShowModal(true) }}
              style={{ background: '#2E7D32', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}>
              + Novo Evento
            </button>
          </div>

          {/* KPIs */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            {Object.entries(STATUS_INFO).map(([k, v]) => (
              <div key={k} onClick={() => setFiltroStatus(filtroStatus === k ? '' : k)}
                style={{ background: filtroStatus === k ? v.bg : '#F9FBF9', border: `2px solid ${filtroStatus === k ? v.cor : '#E0E0E0'}`, borderRadius: 10, padding: '8px 14px', cursor: 'pointer', flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: v.cor }}>{kpiMap[k] ?? 0}</div>
                <div style={{ fontSize: 10, color: '#666' }}>{v.label}</div>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 10, paddingBottom: 12 }}>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar evento..."
              style={{ flex: 1, border: '1px solid #DDD', borderRadius: 8, padding: '8px 12px', fontSize: 13 }} />
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
              style={{ border: '1px solid #DDD', borderRadius: 8, padding: '8px 10px', fontSize: 13, background: '#fff' }}>
              <option value="">Todos os tipos</option>
              {Object.entries(TIPO_INFO).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
            </select>
          </div>
        </div>

        {/* Eventos */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Carregando...</div> :
            eventos.map(ev => {
              const st = STATUS_INFO[ev.status] ?? STATUS_INFO.PROGRAMADO
              const tp = TIPO_INFO[ev.tipo] ?? TIPO_INFO.OUTRO
              const sel = selecionado?.id === ev.id
              const dataD = new Date(ev.dataInicio)
              return (
                <div key={ev.id} onClick={() => setSelecionado(sel ? null : ev)}
                  style={{ background: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, cursor: 'pointer',
                    border: `2px solid ${sel ? '#2E7D32' : '#E0E0E0'}`,
                    display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  {/* Data Box */}
                  <div style={{ background: st.bg, borderRadius: 10, padding: '8px 12px', textAlign: 'center', minWidth: 56 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: st.cor }}>{dataD.getDate().toString().padStart(2, '0')}</div>
                    <div style={{ fontSize: 10, color: st.cor, fontWeight: 600 }}>{dataD.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ background: st.bg, color: st.cor, borderRadius: 4, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>{st.label}</span>
                      <span style={{ background: '#F5F5F5', color: '#555', borderRadius: 4, padding: '1px 8px', fontSize: 11 }}>{tp.emoji} {tp.label}</span>
                      {ev.destaque && <span style={{ background: '#FFF8E1', color: '#F9A825', borderRadius: 4, padding: '1px 8px', fontSize: 11 }}>⭐</span>}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#1A1A1A', marginBottom: 2 }}>{ev.titulo}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {ev.horaInicio && `🕐 ${ev.horaInicio}${ev.horaFim ? ` - ${ev.horaFim}` : ''} · `}
                      {ev.local && `📍 ${ev.local}`}
                    </div>
                    {ev.secretaria && <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{ev.secretaria}</div>}
                  </div>
                </div>
              )
            })
          }
        </div>
      </div>

      {/* Detalhe */}
      {selecionado && (
        <div style={{ width: 380, background: '#fff', borderLeft: '1px solid #E0E0E0', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '20px 20px 0', borderBottom: '1px solid #E0E0E0', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1A1A1A', flex: 1, paddingRight: 10 }}>{selecionado.titulo}</h2>
              <button onClick={() => setSelecionado(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999' }}>✕</button>
            </div>
          </div>

          <div style={{ padding: '0 20px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ background: '#F9FBF9', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>Data</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{formatarData(selecionado.dataInicio)}</div>
              </div>
              <div style={{ background: '#F9FBF9', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>Horário</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{selecionado.horaInicio || '—'}{selecionado.horaFim ? ` - ${selecionado.horaFim}` : ''}</div>
              </div>
              {selecionado.local && <div style={{ background: '#F9FBF9', borderRadius: 8, padding: 10, gridColumn: '1/-1' }}>
                <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>Local</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>📍 {selecionado.local}</div>
                {selecionado.endereco && <div style={{ fontSize: 11, color: '#666' }}>{selecionado.endereco}</div>}
              </div>}
              {selecionado.publicoEsperado && <div style={{ background: '#F9FBF9', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>Público</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>👥 {selecionado.publicoEsperado.toLocaleString('pt-BR')}</div>
              </div>}
              {selecionado.responsavel && <div style={{ background: '#F9FBF9', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>Responsável</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{selecionado.responsavel}</div>
              </div>}
            </div>

            {selecionado.descricao && <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, margin: '0 0 16px' }}>{selecionado.descricao}</p>}

            {selecionado.linkTransmissao && (
              <a href={selecionado.linkTransmissao} target="_blank" rel="noopener"
                style={{ display: 'block', background: '#E8F5E9', color: '#2E7D32', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginBottom: 16 }}>
                📡 Link de Transmissão
              </a>
            )}

            {/* Ações de status */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 8 }}>ATUALIZAR STATUS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(STATUS_INFO).filter(([k]) => k !== selecionado.status).map(([k, v]) => (
                  <button key={k} onClick={() => mudarStatus(selecionado.id, k)}
                    style={{ background: v.bg, color: v.cor, border: `1px solid ${v.cor}40`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                    → {v.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => { setForm({ ...selecionado }); setShowModal(true) }}
              style={{ width: '100%', background: '#1565C0', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', cursor: 'pointer', fontWeight: 600 }}>
              ✏️ Editar Evento
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{form.id ? 'Editar' : 'Novo'} Evento</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Título *</label>
                <input value={form.titulo ?? ''} onChange={e => setForm((f: any) => ({ ...f, titulo: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Tipo</label>
                  <select value={form.tipo ?? 'OUTRO'} onChange={e => setForm((f: any) => ({ ...f, tipo: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 10px', fontSize: 13 }}>
                    {Object.entries(TIPO_INFO).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Status</label>
                  <select value={form.status ?? 'PROGRAMADO'} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 10px', fontSize: 13 }}>
                    {Object.entries(STATUS_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
                <div style={{ gridColumn: '1/3' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Data Início *</label>
                  <input type="datetime-local" value={form.dataInicio ? form.dataInicio.slice(0, 16) : ''} onChange={e => setForm((f: any) => ({ ...f, dataInicio: e.target.value + ':00.000Z' }))}
                    style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 10px', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Hora Início</label>
                  <input type="time" value={form.horaInicio ?? ''} onChange={e => setForm((f: any) => ({ ...f, horaInicio: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 10px', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Hora Fim</label>
                  <input type="time" value={form.horaFim ?? ''} onChange={e => setForm((f: any) => ({ ...f, horaFim: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 10px', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Local</label>
                <input value={form.local ?? ''} onChange={e => setForm((f: any) => ({ ...f, local: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Descrição</label>
                <textarea value={form.descricao ?? ''} onChange={e => setForm((f: any) => ({ ...f, descricao: e.target.value }))} rows={3}
                  style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Secretaria</label>
                  <input value={form.secretaria ?? ''} onChange={e => setForm((f: any) => ({ ...f, secretaria: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Público Esperado</label>
                  <input type="number" value={form.publicoEsperado ?? ''} onChange={e => setForm((f: any) => ({ ...f, publicoEsperado: parseInt(e.target.value) || null }))}
                    style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Link de Transmissão</label>
                <input value={form.linkTransmissao ?? ''} onChange={e => setForm((f: any) => ({ ...f, linkTransmissao: e.target.value }))}
                  placeholder="https://youtube.com/live/..." style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox" checked={form.destaque ?? false} onChange={e => setForm((f: any) => ({ ...f, destaque: e.target.checked }))} />
                ⭐ Marcar como destaque
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, background: '#F5F5F5', border: 'none', borderRadius: 8, padding: '12px 0', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando}
                style={{ flex: 2, background: '#2E7D32', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', cursor: 'pointer', fontWeight: 700 }}>
                {salvando ? 'Salvando...' : (form.id ? 'Salvar Alterações' : 'Criar Evento')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
