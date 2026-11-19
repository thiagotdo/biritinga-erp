'use client'
import { useState, useEffect, useCallback } from 'react'

type Noticia = {
  id: string; titulo: string; subtitulo?: string; resumo?: string; tipo: string
  status: string; destaque: boolean; imagemCapa?: string; tags?: string
  secretaria?: string; autor: string; visualizacoes: number
  dataPublicacao?: string; criadoEm: string
}

const TIPO_INFO: Record<string, { label: string; cor: string }> = {
  NOTICIA:      { label: 'Notícia',       cor: '#1565C0' },
  NOTA_OFICIAL: { label: 'Nota Oficial',  cor: '#6A1B9A' },
  COMUNICADO:   { label: 'Comunicado',    cor: '#00695C' },
  DECRETO:      { label: 'Decreto',       cor: '#BF360C' },
  PORTARIA:     { label: 'Portaria',      cor: '#E65100' },
  EDITAL:       { label: 'Edital',        cor: '#1B5E20' },
  RESULTADO:    { label: 'Resultado',     cor: '#4E342E' },
}

const STATUS_INFO: Record<string, { label: string; cor: string; bg: string }> = {
  RASCUNHO:   { label: 'Rascunho',  cor: '#78909C', bg: '#ECEFF1' },
  REVISAO:    { label: 'Em Revisão',cor: '#F57C00', bg: '#FFF3E0' },
  PUBLICADA:  { label: 'Publicada', cor: '#2E7D32', bg: '#E8F5E9' },
  ARQUIVADA:  { label: 'Arquivada', cor: '#757575', bg: '#F5F5F5' },
}

export default function NoticiasPage() {
  const [noticias, setNoticias]     = useState<Noticia[]>([])
  const [kpiMap, setKpiMap]         = useState<Record<string, number>>({})
  const [total, setTotal]           = useState(0)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [busca, setBusca]           = useState('')
  const [selecionada, setSelecionada] = useState<Noticia | null>(null)
  const [showModal, setShowModal]   = useState(false)
  const [form, setForm]             = useState<any>({})
  const [loading, setLoading]       = useState(false)
  const [salvando, setSalvando]     = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (filtroStatus) qs.set('status', filtroStatus)
    if (filtroTipo)   qs.set('tipo', filtroTipo)
    if (busca)        qs.set('busca', busca)
    const r = await fetch(`/api/comunicacao/noticias?${qs}`).then(r => r.json())
    const kpis: Record<string, number> = {}
    r.kpiMap?.forEach((k: any) => { kpis[k.status] = k._count._all })
    setKpiMap(kpis)
    setNoticias(r.noticias ?? [])
    setTotal(r.total ?? 0)
    setLoading(false)
  }, [filtroStatus, filtroTipo, busca])

  useEffect(() => { carregar() }, [carregar])

  async function salvar() {
    setSalvando(true)
    const metodo = form.id ? 'PATCH' : 'POST'
    const r = await fetch('/api/comunicacao/noticias', {
      method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
    }).then(r => r.json())
    setSalvando(false)
    if (r.noticia) { setShowModal(false); carregar() }
    else alert(JSON.stringify(r.erro))
  }

  async function mudarStatus(id: string, status: string) {
    await fetch('/api/comunicacao/noticias', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status })
    })
    carregar()
    if (selecionada?.id === id) setSelecionada(prev => prev ? { ...prev, status } : null)
  }

  async function excluir(id: string) {
    if (!confirm('Arquivar esta notícia?')) return
    await fetch(`/api/comunicacao/noticias?id=${id}`, { method: 'DELETE' })
    setSelecionada(null); carregar()
  }

  const kpiCards = [
    { label: 'Total', valor: total, cor: '#1B5E20' },
    { label: 'Publicadas', valor: kpiMap['PUBLICADA'] ?? 0, cor: '#2E7D32' },
    { label: 'Em Revisão', valor: kpiMap['REVISAO'] ?? 0, cor: '#F57C00' },
    { label: 'Rascunhos', valor: kpiMap['RASCUNHO'] ?? 0, cor: '#78909C' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter,sans-serif', background: '#F4F6F8' }}>
      {/* Lista */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', background: '#fff', borderBottom: '1px solid #E0E0E0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1B5E20' }}>📰 Notícias e Comunicados</h1>
              <p style={{ margin: '4px 0 0', color: '#666', fontSize: 13 }}>{total} registros</p>
            </div>
            <button onClick={() => { setForm({ tipo: 'NOTICIA', status: 'RASCUNHO', destaque: false }); setShowModal(true) }}
              style={{ background: '#2E7D32', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}>
              + Nova Publicação
            </button>
          </div>

          {/* KPIs */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {kpiCards.map(k => (
              <div key={k.label} onClick={() => setFiltroStatus(k.label === 'Total' ? '' : k.label.toUpperCase().replace(' ', '_'))}
                style={{ background: '#F9FBF9', border: `2px solid ${k.cor}20`, borderRadius: 10, padding: '10px 18px', cursor: 'pointer', flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.cor }}>{k.valor}</div>
                <div style={{ fontSize: 11, color: '#666' }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 10, paddingBottom: 12 }}>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..."
              style={{ flex: 1, border: '1px solid #DDD', borderRadius: 8, padding: '8px 12px', fontSize: 13 }} />
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
              style={{ border: '1px solid #DDD', borderRadius: 8, padding: '8px 10px', fontSize: 13, background: '#fff' }}>
              <option value="">Todos os tipos</option>
              {Object.entries(TIPO_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
              style={{ border: '1px solid #DDD', borderRadius: 8, padding: '8px 10px', fontSize: 13, background: '#fff' }}>
              <option value="">Todos os status</option>
              {Object.entries(STATUS_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Carregando...</div> :
            noticias.map(n => {
              const st  = STATUS_INFO[n.status] ?? STATUS_INFO.RASCUNHO
              const tp  = TIPO_INFO[n.tipo] ?? TIPO_INFO.NOTICIA
              const sel = selecionada?.id === n.id
              return (
                <div key={n.id} onClick={() => setSelecionada(sel ? null : n)}
                  style={{ background: '#fff', borderRadius: 10, padding: 16, marginBottom: 10, cursor: 'pointer',
                    border: `2px solid ${sel ? '#2E7D32' : '#E0E0E0'}`,
                    boxShadow: sel ? '0 2px 8px rgba(46,125,50,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  {n.imagemCapa && <img src={n.imagemCapa} alt="" style={{ width: 72, height: 54, objectFit: 'cover', borderRadius: 6 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ background: tp.cor + '15', color: tp.cor, borderRadius: 4, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>{tp.label}</span>
                      <span style={{ background: st.bg, color: st.cor, borderRadius: 4, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>{st.label}</span>
                      {n.destaque && <span style={{ background: '#FFF8E1', color: '#F9A825', borderRadius: 4, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>⭐ Destaque</span>}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#1A1A1A', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.titulo}</div>
                    {n.resumo && <div style={{ fontSize: 12, color: '#666', marginBottom: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{n.resumo}</div>}
                    <div style={{ fontSize: 11, color: '#999' }}>
                      {n.autor} · {n.secretaria && `${n.secretaria} · `}
                      {n.dataPublicacao ? new Date(n.dataPublicacao).toLocaleDateString('pt-BR') : 'Não publicada'} · 👁 {n.visualizacoes}
                    </div>
                  </div>
                </div>
              )
            })
          }
        </div>
      </div>

      {/* Detalhe slide-in */}
      {selecionada && (
        <div style={{ width: 380, background: '#fff', borderLeft: '1px solid #E0E0E0', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '20px 20px 0', borderBottom: '1px solid #E0E0E0', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, paddingRight: 10 }}>
                <span style={{ background: (TIPO_INFO[selecionada.tipo]?.cor ?? '#333') + '15', color: TIPO_INFO[selecionada.tipo]?.cor ?? '#333', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{TIPO_INFO[selecionada.tipo]?.label}</span>
                <h2 style={{ margin: '8px 0 4px', fontSize: 17, fontWeight: 700, color: '#1A1A1A' }}>{selecionada.titulo}</h2>
                {selecionada.subtitulo && <p style={{ margin: '0 0 8px', fontSize: 13, color: '#555' }}>{selecionada.subtitulo}</p>}
              </div>
              <button onClick={() => setSelecionada(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999' }}>✕</button>
            </div>
          </div>

          <div style={{ padding: '0 20px 20px', flex: 1 }}>
            {selecionada.imagemCapa && <img src={selecionada.imagemCapa} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: 12 }} />}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ background: '#F9FBF9', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>Autor</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{selecionada.autor}</div>
              </div>
              <div style={{ background: '#F9FBF9', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>Visualizações</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>👁 {selecionada.visualizacoes}</div>
              </div>
              {selecionada.secretaria && <div style={{ background: '#F9FBF9', borderRadius: 8, padding: 10, gridColumn: '1/-1' }}>
                <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>Secretaria</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{selecionada.secretaria}</div>
              </div>}
              {selecionada.tags && <div style={{ background: '#F9FBF9', borderRadius: 8, padding: 10, gridColumn: '1/-1' }}>
                <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', marginBottom: 4 }}>Tags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {selecionada.tags.split(',').map(t => <span key={t} style={{ background: '#E8F5E9', color: '#2E7D32', borderRadius: 4, padding: '1px 7px', fontSize: 11 }}>{t.trim()}</span>)}
                </div>
              </div>}
            </div>

            {/* Ações de status */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 8 }}>ALTERAR STATUS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(STATUS_INFO).filter(([k]) => k !== selecionada.status).map(([k, v]) => (
                  <button key={k} onClick={() => mudarStatus(selecionada.id, k)}
                    style={{ background: v.bg, color: v.cor, border: `1px solid ${v.cor}40`, borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    → {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => { setForm({ ...selecionada }); setShowModal(true) }}
                style={{ background: '#1565C0', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', cursor: 'pointer', fontWeight: 600 }}>
                ✏️ Editar
              </button>
              <button onClick={() => excluir(selecionada.id)}
                style={{ background: '#fff', color: '#C62828', border: '1px solid #FFCDD2', borderRadius: 8, padding: '8px 0', cursor: 'pointer', fontSize: 12 }}>
                Arquivar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal criar/editar */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1B5E20' }}>{form.id ? 'Editar' : 'Nova'} Publicação</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#999' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Tipo *</label>
                  <select value={form.tipo ?? 'NOTICIA'} onChange={e => setForm((f: any) => ({ ...f, tipo: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 10px', fontSize: 14 }}>
                    {Object.entries(TIPO_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Status</label>
                  <select value={form.status ?? 'RASCUNHO'} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 10px', fontSize: 14 }}>
                    {Object.entries(STATUS_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Título *</label>
                <input value={form.titulo ?? ''} onChange={e => setForm((f: any) => ({ ...f, titulo: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Subtítulo</label>
                <input value={form.subtitulo ?? ''} onChange={e => setForm((f: any) => ({ ...f, subtitulo: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Resumo (aparece na listagem)</label>
                <textarea value={form.resumo ?? ''} onChange={e => setForm((f: any) => ({ ...f, resumo: e.target.value }))} rows={2}
                  style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 12px', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Corpo / Texto completo *</label>
                <textarea value={form.corpo ?? ''} onChange={e => setForm((f: any) => ({ ...f, corpo: e.target.value }))} rows={8}
                  style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Secretaria</label>
                  <input value={form.secretaria ?? ''} onChange={e => setForm((f: any) => ({ ...f, secretaria: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Tags (separadas por vírgula)</label>
                  <input value={form.tags ?? ''} onChange={e => setForm((f: any) => ({ ...f, tags: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>URL da Imagem de Capa</label>
                <input value={form.imagemCapa ?? ''} onChange={e => setForm((f: any) => ({ ...f, imagemCapa: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox" checked={form.destaque ?? false} onChange={e => setForm((f: any) => ({ ...f, destaque: e.target.checked }))} />
                ⭐ Marcar como destaque
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, background: '#F5F5F5', color: '#333', border: 'none', borderRadius: 8, padding: '12px 0', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                style={{ flex: 2, background: '#2E7D32', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', cursor: salvando ? 'wait' : 'pointer', fontWeight: 700 }}>
                {salvando ? 'Salvando...' : (form.id ? 'Salvar Alterações' : 'Criar Publicação')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
