'use client'
import { useState, useEffect, useCallback } from 'react'

type Midia = {
  id: string; titulo: string; tipo: string; categoria: string; url: string
  urlThumb?: string; nomeArquivo: string; tamanhoBytes?: number; mimeType?: string
  tags?: string; autor?: string; destaque: boolean; criadoEm: string
  album?: { id: string; nome: string }
}

type Album = { id: string; nome: string; categoria: string; _count: { midias: number } }

const TIPO_INFO: Record<string, { label: string; emoji: string; cor: string }> = {
  FOTO:      { label: 'Foto',      emoji: '🖼️', cor: '#1565C0' },
  VIDEO:     { label: 'Vídeo',     emoji: '🎬', cor: '#AD1457' },
  DOCUMENTO: { label: 'Documento', emoji: '📄', cor: '#2E7D32' },
  AUDIO:     { label: 'Áudio',     emoji: '🎵', cor: '#6A1B9A' },
}

const CAT_LABELS: Record<string, string> = {
  INFRAESTRUTURA: 'Infraestrutura', SAUDE: 'Saúde', EDUCACAO: 'Educação',
  CULTURA: 'Cultura', ESPORTE: 'Esporte', EVENTO: 'Evento', INSTITUCIONAL: 'Institucional', OUTRO: 'Outro'
}

function formatBytes(b?: number) {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

export default function MidiaPage() {
  const [midias, setMidias]       = useState<Midia[]>([])
  const [albuns, setAlbuns]       = useState<Album[]>([])
  const [kpiMap, setKpiMap]       = useState<Record<string, number>>({})
  const [total, setTotal]         = useState(0)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroAlbum, setFiltroAlbum] = useState('')
  const [busca, setBusca]         = useState('')
  const [aba, setAba]             = useState<'galeria'|'albuns'>('galeria')
  const [selecionada, setSelecionada] = useState<Midia | null>(null)
  const [showModalMidia, setShowModalMidia] = useState(false)
  const [showModalAlbum, setShowModalAlbum] = useState(false)
  const [form, setForm]           = useState<any>({})
  const [loading, setLoading]     = useState(false)
  const [salvando, setSalvando]   = useState(false)

  const carregarMidias = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (filtroTipo)  qs.set('tipo', filtroTipo)
    if (filtroAlbum) qs.set('albumId', filtroAlbum)
    if (busca)       qs.set('busca', busca)
    const r = await fetch(`/api/comunicacao/midia?${qs}`).then(r => r.json())
    const kpis: Record<string, number> = {}
    r.kpiMap?.forEach((k: any) => { kpis[k.tipo] = k._count._all })
    setKpiMap(kpis)
    setMidias(r.midias ?? [])
    setTotal(r.total ?? 0)
    setLoading(false)
  }, [filtroTipo, filtroAlbum, busca])

  const carregarAlbuns = useCallback(async () => {
    const r = await fetch('/api/comunicacao/midia?albuns=true').then(r => r.json())
    setAlbuns(r.albuns ?? [])
  }, [])

  useEffect(() => { carregarMidias(); carregarAlbuns() }, [carregarMidias, carregarAlbuns])

  async function salvarMidia() {
    setSalvando(true)
    const metodo = form.id ? 'PATCH' : 'POST'
    const r = await fetch('/api/comunicacao/midia', {
      method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
    }).then(r => r.json())
    setSalvando(false)
    if (r.resultados || r.midia) { setShowModalMidia(false); carregarMidias() }
    else alert(JSON.stringify(r.erro))
  }

  async function salvarAlbum() {
    setSalvando(true)
    const r = await fetch('/api/comunicacao/midia', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'CRIAR_ALBUM', ...form })
    }).then(r => r.json())
    setSalvando(false)
    if (r.album) { setShowModalAlbum(false); carregarAlbuns() }
    else alert(JSON.stringify(r.erro))
  }

  async function excluir(id: string) {
    if (!confirm('Remover esta mídia?')) return
    await fetch(`/api/comunicacao/midia?id=${id}`, { method: 'DELETE' })
    setSelecionada(null); carregarMidias()
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter,sans-serif', background: '#F4F6F8' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', background: '#fff', borderBottom: '1px solid #E0E0E0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1B5E20' }}>🗂️ Galeria de Mídia</h1>
              <p style={{ margin: '4px 0 0', color: '#666', fontSize: 13 }}>{total} arquivos</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setForm({ tipo: 'FOTO', categoria: 'OUTRO', destaque: false }); setShowModalAlbum(true) }}
                style={{ background: '#fff', color: '#2E7D32', border: '2px solid #2E7D32', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                + Álbum
              </button>
              <button onClick={() => { setForm({ tipo: 'FOTO', categoria: 'OUTRO', destaque: false }); setShowModalMidia(true) }}
                style={{ background: '#2E7D32', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontWeight: 600 }}>
                + Adicionar Mídia
              </button>
            </div>
          </div>

          {/* KPIs tipo */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            {Object.entries(TIPO_INFO).map(([k, v]) => (
              <div key={k} onClick={() => setFiltroTipo(filtroTipo === k ? '' : k)}
                style={{ background: filtroTipo === k ? v.cor + '15' : '#F9FBF9', border: `2px solid ${filtroTipo === k ? v.cor : '#E0E0E0'}`, borderRadius: 10, padding: '8px 14px', cursor: 'pointer', flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 18 }}>{v.emoji}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: v.cor }}>{kpiMap[k] ?? 0}</div>
                <div style={{ fontSize: 10, color: '#666' }}>{v.label}</div>
              </div>
            ))}
          </div>

          {/* Abas + Filtros */}
          <div style={{ display: 'flex', gap: 10, paddingBottom: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', border: '1px solid #DDD', borderRadius: 8, overflow: 'hidden' }}>
              {(['galeria', 'albuns'] as const).map(a => (
                <button key={a} onClick={() => setAba(a)}
                  style={{ padding: '7px 16px', border: 'none', background: aba === a ? '#2E7D32' : '#fff', color: aba === a ? '#fff' : '#555', cursor: 'pointer', fontSize: 13, fontWeight: aba === a ? 600 : 400 }}>
                  {a === 'galeria' ? '🖼️ Galeria' : '📁 Álbuns'}
                </button>
              ))}
            </div>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..."
              style={{ flex: 1, border: '1px solid #DDD', borderRadius: 8, padding: '7px 12px', fontSize: 13 }} />
            {aba === 'galeria' && (
              <select value={filtroAlbum} onChange={e => setFiltroAlbum(e.target.value)}
                style={{ border: '1px solid #DDD', borderRadius: 8, padding: '7px 10px', fontSize: 13, background: '#fff' }}>
                <option value="">Todos os álbuns</option>
                {albuns.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* Conteúdo */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {aba === 'albuns' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
              {albuns.map(a => (
                <div key={a.id} onClick={() => { setAba('galeria'); setFiltroAlbum(a.id) }}
                  style={{ background: '#fff', borderRadius: 12, padding: 16, cursor: 'pointer', border: '2px solid #E0E0E0', textAlign: 'center',
                    transition: 'border-color 0.2s' }} onMouseOver={e => (e.currentTarget.style.borderColor = '#2E7D32')} onMouseOut={e => (e.currentTarget.style.borderColor = '#E0E0E0')}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1A1A1A', marginBottom: 4 }}>{a.nome}</div>
                  <div style={{ fontSize: 12, color: '#999' }}>{CAT_LABELS[a.categoria]}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#2E7D32', marginTop: 8 }}>{a._count.midias}</div>
                  <div style={{ fontSize: 11, color: '#666' }}>arquivos</div>
                </div>
              ))}
            </div>
          ) : (
            loading ? <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Carregando...</div> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                {midias.map(m => {
                  const tp = TIPO_INFO[m.tipo] ?? TIPO_INFO.FOTO
                  const sel = selecionada?.id === m.id
                  return (
                    <div key={m.id} onClick={() => setSelecionada(sel ? null : m)}
                      style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                        border: `2px solid ${sel ? '#2E7D32' : '#E0E0E0'}` }}>
                      {m.tipo === 'FOTO' ? (
                        <img src={m.urlThumb || m.url} alt={m.titulo}
                          style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                          onError={(e: any) => { e.target.style.display = 'none' }} />
                      ) : (
                        <div style={{ width: '100%', height: 120, background: tp.cor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42 }}>
                          {tp.emoji}
                        </div>
                      )}
                      <div style={{ padding: '8px 10px' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.titulo}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ background: tp.cor + '15', color: tp.cor, borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 600 }}>{tp.label}</span>
                          {m.destaque && <span style={{ color: '#F9A825', fontSize: 12 }}>⭐</span>}
                        </div>
                        {m.tamanhoBytes && <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{formatBytes(m.tamanhoBytes)}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      </div>

      {/* Detalhe */}
      {selecionada && (
        <div style={{ width: 340, background: '#fff', borderLeft: '1px solid #E0E0E0', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '20px 20px 0', borderBottom: '1px solid #E0E0E0', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, flex: 1, paddingRight: 10 }}>{selecionada.titulo}</h3>
              <button onClick={() => setSelecionada(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999' }}>✕</button>
            </div>
          </div>
          <div style={{ padding: '0 20px 20px' }}>
            {selecionada.tipo === 'FOTO' ? (
              <img src={selecionada.url} alt={selecionada.titulo} style={{ width: '100%', borderRadius: 8, marginBottom: 12 }} />
            ) : (
              <a href={selecionada.url} target="_blank" rel="noopener"
                style={{ display: 'block', background: '#F9FBF9', borderRadius: 8, padding: 16, textAlign: 'center', color: '#1565C0', fontWeight: 600, textDecoration: 'none', marginBottom: 12 }}>
                {TIPO_INFO[selecionada.tipo]?.emoji} Abrir arquivo
              </a>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              <div style={{ background: '#F9FBF9', borderRadius: 8, padding: 8 }}>
                <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>Tipo</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{TIPO_INFO[selecionada.tipo]?.emoji} {TIPO_INFO[selecionada.tipo]?.label}</div>
              </div>
              <div style={{ background: '#F9FBF9', borderRadius: 8, padding: 8 }}>
                <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>Tamanho</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{formatBytes(selecionada.tamanhoBytes) || '—'}</div>
              </div>
              {selecionada.album && <div style={{ background: '#F9FBF9', borderRadius: 8, padding: 8, gridColumn: '1/-1' }}>
                <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>Álbum</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>📁 {selecionada.album.nome}</div>
              </div>}
              {selecionada.autor && <div style={{ background: '#F9FBF9', borderRadius: 8, padding: 8, gridColumn: '1/-1' }}>
                <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>Autor</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{selecionada.autor}</div>
              </div>}
            </div>
            {selecionada.tags && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>Tags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {selecionada.tags.split(',').map(t => <span key={t} style={{ background: '#E8F5E9', color: '#2E7D32', borderRadius: 4, padding: '1px 7px', fontSize: 11 }}>{t.trim()}</span>)}
                </div>
              </div>
            )}
            <button onClick={() => excluir(selecionada.id)}
              style={{ width: '100%', background: '#fff', color: '#C62828', border: '1px solid #FFCDD2', borderRadius: 8, padding: '8px 0', cursor: 'pointer', fontSize: 12 }}>
              Remover
            </button>
          </div>
        </div>
      )}

      {/* Modal Mídia */}
      {showModalMidia && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Adicionar Mídia</h2>
              <button onClick={() => setShowModalMidia(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Título *</label>
                <input value={form.titulo ?? ''} onChange={e => setForm((f: any) => ({ ...f, titulo: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>URL do Arquivo *</label>
                <input value={form.url ?? ''} onChange={e => setForm((f: any) => ({ ...f, url: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Tipo</label>
                  <select value={form.tipo ?? 'FOTO'} onChange={e => setForm((f: any) => ({ ...f, tipo: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 10px', fontSize: 13 }}>
                    {Object.entries(TIPO_INFO).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Categoria</label>
                  <select value={form.categoria ?? 'OUTRO'} onChange={e => setForm((f: any) => ({ ...f, categoria: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 10px', fontSize: 13 }}>
                    {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Álbum</label>
                <select value={form.albumId ?? ''} onChange={e => setForm((f: any) => ({ ...f, albumId: e.target.value || null }))}
                  style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 10px', fontSize: 13 }}>
                  <option value="">Sem álbum</option>
                  {albuns.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Nome do Arquivo *</label>
                <input value={form.nomeArquivo ?? ''} onChange={e => setForm((f: any) => ({ ...f, nomeArquivo: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Tags</label>
                <input value={form.tags ?? ''} onChange={e => setForm((f: any) => ({ ...f, tags: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModalMidia(false)} style={{ flex: 1, background: '#F5F5F5', border: 'none', borderRadius: 8, padding: '12px 0', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvarMidia} disabled={salvando}
                style={{ flex: 2, background: '#2E7D32', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', cursor: 'pointer', fontWeight: 700 }}>
                {salvando ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Álbum */}
      {showModalAlbum && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Novo Álbum</h2>
              <button onClick={() => setShowModalAlbum(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Nome *</label>
                <input value={form.nome ?? ''} onChange={e => setForm((f: any) => ({ ...f, nome: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Categoria</label>
                <select value={form.categoria ?? 'OUTRO'} onChange={e => setForm((f: any) => ({ ...f, categoria: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 10px', fontSize: 13 }}>
                  {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Descrição</label>
                <textarea value={form.descricao ?? ''} onChange={e => setForm((f: any) => ({ ...f, descricao: e.target.value }))} rows={3}
                  style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '9px 12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModalAlbum(false)} style={{ flex: 1, background: '#F5F5F5', border: 'none', borderRadius: 8, padding: '12px 0', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvarAlbum} disabled={salvando}
                style={{ flex: 2, background: '#2E7D32', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', cursor: 'pointer', fontWeight: 700 }}>
                {salvando ? 'Criando...' : 'Criar Álbum'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
