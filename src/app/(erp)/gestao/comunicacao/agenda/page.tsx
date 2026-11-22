'use client'
import { useState, useEffect, useCallback } from 'react'

type Evento = {
  id: string; titulo: string; tipo: string; status: string
  local?: string; dataInicio: string; dataFim?: string
  horaInicio?: string; horaFim?: string; responsavel?: string
  secretaria?: string; destaque: boolean; publicoEsperado?: number
}

const TIPO_EVENTO: Record<string, string> = {
  AUDIENCIA_PUBLICA: 'Audiência Pública', REUNIAO: 'Reunião', SHOW: 'Show/Espetáculo',
  ESPORTE: 'Esporte', CULTURAL: 'Cultural', SAUDE: 'Saúde', EDUCACAO: 'Educação',
  INAUGURACAO: 'Inauguração', OUTRO: 'Outro',
}
const STATUS_EVENTO: Record<string, { bg: string; color: string; label: string }> = {
  PROGRAMADO:   { bg: '#EFF6FF', color: '#1D4ED8', label: 'Programado' },
  EM_ANDAMENTO: { bg: '#FFF3CD', color: '#856404', label: 'Em Andamento' },
  REALIZADO:    { bg: '#D1FAE5', color: '#065F46', label: 'Realizado' },
  CANCELADO:    { bg: '#FEE2E2', color: '#991B1B', label: 'Cancelado' },
  ADIADO:       { bg: '#F3F4F6', color: '#6B7280', label: 'Adiado' },
}

export default function AgendaPage() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [total, setTotal]     = useState(0)
  const [pagina, setPagina]   = useState(1)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroTipo, setFiltroTipo]     = useState('')
  const [carregando, setCarregando]     = useState(true)
  const [modal, setModal]     = useState<'novo' | 'editar' | null>(null)
  const [eventoAtual, setEventoAtual] = useState<Partial<Evento>>({})
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg]         = useState('')

  const perPagina = 15

  const carregar = useCallback(async () => {
    setCarregando(true)
    const p = new URLSearchParams({ pagina: String(pagina), limite: String(perPagina) })
    if (filtroStatus) p.set('status', filtroStatus)
    if (filtroTipo)   p.set('tipo', filtroTipo)
    const r = await fetch(`/api/comunicacao/agenda?${p}`)
    if (r.ok) { const d = await r.json(); setEventos(d.eventos); setTotal(d.total) }
    setCarregando(false)
  }, [pagina, filtroStatus, filtroTipo])

  useEffect(() => { carregar() }, [carregar])

  async function salvar() {
    setSalvando(true)
    const metodo = eventoAtual.id ? 'PUT' : 'POST'
    const r = await fetch('/api/comunicacao/agenda', {
      method: metodo, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventoAtual),
    })
    const d = await r.json()
    setSalvando(false)
    if (r.ok) { setMsg('Evento salvo!'); setModal(null); carregar() }
    else setMsg(d.erro ?? 'Erro ao salvar')
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este evento?')) return
    const r = await fetch(`/api/comunicacao/agenda?id=${id}`, { method: 'DELETE' })
    if (r.ok) { setMsg('Evento excluído'); carregar() }
  }

  const totalPaginas = Math.ceil(total / perPagina)

  return (
<>
      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1B5E20' }}>📅 Agenda de Eventos</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>Eventos e atividades da Prefeitura de Biritinga</p>
          </div>
          <button onClick={() => { setEventoAtual({ tipo: 'OUTRO', status: 'PROGRAMADO', destaque: false }); setModal('novo') }}
            style={{ background: '#1B5E20', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            + Novo Evento
          </button>
        </div>

        {msg && (
          <div style={{ background: msg.includes('rro') ? '#FFEBEE' : '#E8F5E9', color: msg.includes('rro') ? '#B71C1C' : '#1B5E20', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {msg} <button onClick={() => setMsg('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <select value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPagina(1) }}
            style={{ padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, background: '#fff' }}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_EVENTO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPagina(1) }}
            style={{ padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, background: '#fff' }}>
            <option value="">Todos os tipos</option>
            {Object.entries(TIPO_EVENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Tabela */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                {['Evento / Tipo', 'Data / Horário', 'Local', 'Status', 'Responsável', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#999' }}>Carregando...</td></tr>
              ) : eventos.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#999' }}>Nenhum evento encontrado.</td></tr>
              ) : eventos.map((e, i) => {
                const sc = STATUS_EVENTO[e.status] ?? STATUS_EVENTO.PROGRAMADO
                return (
                  <tr key={e.id} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {e.destaque && <span>⭐</span>}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{e.titulo}</div>
                          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{TIPO_EVENTO[e.tipo] ?? e.tipo}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#555' }}>
                      <div>{new Date(e.dataInicio).toLocaleDateString('pt-BR')}</div>
                      {e.horaInicio && <div style={{ color: '#888', fontSize: 11 }}>{e.horaInicio}{e.horaFim ? ` - ${e.horaFim}` : ''}</div>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#555' }}>{e.local ?? '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{sc.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#555' }}>{e.responsavel ?? '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setEventoAtual(e); setModal('editar') }}
                          style={{ background: '#EFF6FF', border: 'none', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>✏️</button>
                        <button onClick={() => excluir(e.id)}
                          style={{ background: '#FEF2F2', border: 'none', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {totalPaginas > 1 && (
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F3F4F6' }}>
              <span style={{ fontSize: 12, color: '#666' }}>{total} eventos · página {pagina}/{totalPaginas}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}
                  style={{ padding: '5px 12px', border: '1px solid #DDD', borderRadius: 6, cursor: pagina === 1 ? 'default' : 'pointer', fontSize: 12, background: pagina === 1 ? '#F9FAFB' : '#fff' }}>← Anterior</button>
                <button disabled={pagina === totalPaginas} onClick={() => setPagina(p => p + 1)}
                  style={{ padding: '5px 12px', border: '1px solid #DDD', borderRadius: 6, cursor: pagina === totalPaginas ? 'default' : 'pointer', fontSize: 12, background: pagina === totalPaginas ? '#F9FAFB' : '#fff' }}>Próxima →</button>
              </div>
            </div>
          )}
        </div>

        {/* Modal */}
        {modal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#1B5E20' }}>
                {modal === 'novo' ? '+ Novo Evento' : '✏️ Editar Evento'}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Título *</label>
                  <input value={eventoAtual.titulo ?? ''} onChange={e => setEventoAtual(p => ({ ...p, titulo: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Tipo</label>
                  <select value={eventoAtual.tipo ?? 'OUTRO'} onChange={e => setEventoAtual(p => ({ ...p, tipo: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, background: '#fff' }}>
                    {Object.entries(TIPO_EVENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Status</label>
                  <select value={eventoAtual.status ?? 'PROGRAMADO'} onChange={e => setEventoAtual(p => ({ ...p, status: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, background: '#fff' }}>
                    {Object.entries(STATUS_EVENTO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Data de Início *</label>
                  <input type="date" value={eventoAtual.dataInicio ? eventoAtual.dataInicio.slice(0,10) : ''} onChange={e => setEventoAtual(p => ({ ...p, dataInicio: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Data de Término</label>
                  <input type="date" value={eventoAtual.dataFim ? eventoAtual.dataFim.slice(0,10) : ''} onChange={e => setEventoAtual(p => ({ ...p, dataFim: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Hora Início</label>
                  <input type="time" value={eventoAtual.horaInicio ?? ''} onChange={e => setEventoAtual(p => ({ ...p, horaInicio: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Hora Fim</label>
                  <input type="time" value={eventoAtual.horaFim ?? ''} onChange={e => setEventoAtual(p => ({ ...p, horaFim: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Local</label>
                  <input value={eventoAtual.local ?? ''} onChange={e => setEventoAtual(p => ({ ...p, local: e.target.value }))}
                    placeholder="Ex: Praça Principal, Ginásio Municipal..."
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Responsável</label>
                  <input value={eventoAtual.responsavel ?? ''} onChange={e => setEventoAtual(p => ({ ...p, responsavel: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Secretaria</label>
                  <input value={eventoAtual.secretaria ?? ''} onChange={e => setEventoAtual(p => ({ ...p, secretaria: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="eDestaque" checked={eventoAtual.destaque ?? false}
                    onChange={e => setEventoAtual(p => ({ ...p, destaque: e.target.checked }))} />
                  <label htmlFor="eDestaque" style={{ fontSize: 13, color: '#555' }}>⭐ Evento em destaque</label>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button onClick={() => setModal(null)}
                  style={{ padding: '9px 20px', border: '1px solid #DDD', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
                <button onClick={salvar} disabled={salvando}
                  style={{ padding: '9px 20px', background: '#1B5E20', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: salvando ? 0.7 : 1 }}>
                  {salvando ? 'Salvando...' : (modal === 'novo' ? 'Criar Evento' : 'Salvar')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
</>
  )
}
