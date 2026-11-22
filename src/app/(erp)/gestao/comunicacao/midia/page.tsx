'use client'
import { useState, useEffect, useCallback } from 'react'

type Album = { id: string; nome: string; descricao?: string; categoria: string; _count?: { midias: number }; criadoEm: string }
type Midia = { id: string; titulo: string; tipo: string; categoria: string; url: string; urlThumb?: string; nomeArquivo: string; tamanhoBytes?: number; autor?: string; destaque: boolean; albumId?: string; criadoEm: string }

const TIPO_MIDIA: Record<string, { label: string; emoji: string }> = {
  FOTO: { label: 'Foto', emoji: '🖼️' }, VIDEO: { label: 'Vídeo', emoji: '🎥' },
  DOCUMENTO: { label: 'Documento', emoji: '📄' }, AUDIO: { label: 'Áudio', emoji: '🎵' },
}
const CATEGORIA_MIDIA: Record<string, string> = {
  INFRAESTRUTURA: 'Infraestrutura', SAUDE: 'Saúde', EDUCACAO: 'Educação',
  CULTURA: 'Cultura', ESPORTE: 'Esporte', EVENTO: 'Evento', INSTITUCIONAL: 'Institucional', OUTRO: 'Outro',
}

function formatarBytes(bytes?: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(1)} KB`
  return `${(bytes/1024/1024).toFixed(1)} MB`
}

export default function MidiaPage() {
  const [aba, setAba]           = useState<'galeria' | 'albums'>('galeria')
  const [midias, setMidias]     = useState<Midia[]>([])
  const [albums, setAlbums]     = useState<Album[]>([])
  const [total, setTotal]       = useState(0)
  const [pagina, setPagina]     = useState(1)
  const [filtroTipo, setFiltroTipo]           = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [carregando, setCarregando]           = useState(true)
  const [modal, setModal]       = useState<'nova-midia' | 'novo-album' | null>(null)
  const [midiaAtual, setMidiaAtual]   = useState<Partial<Midia>>({})
  const [albumAtual, setAlbumAtual]   = useState<Partial<Album>>({})
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg]           = useState('')

  const perPagina = 20

  const carregarMidias = useCallback(async () => {
    setCarregando(true)
    const p = new URLSearchParams({ pagina: String(pagina), limite: String(perPagina) })
    if (filtroTipo)      p.set('tipo', filtroTipo)
    if (filtroCategoria) p.set('categoria', filtroCategoria)
    const r = await fetch(`/api/comunicacao/midia?${p}`)
    if (r.ok) { const d = await r.json(); setMidias(d.midias); setTotal(d.total) }
    setCarregando(false)
  }, [pagina, filtroTipo, filtroCategoria])

  const carregarAlbums = useCallback(async () => {
    setCarregando(true)
    const r = await fetch('/api/comunicacao/midia?tipo=albums')
    if (r.ok) { const d = await r.json(); setAlbums(d.albums ?? []) }
    setCarregando(false)
  }, [])

  useEffect(() => {
    if (aba === 'galeria') carregarMidias()
    else carregarAlbums()
  }, [aba, carregarMidias, carregarAlbums])

  async function salvarMidia() {
    setSalvando(true)
    const r = await fetch('/api/comunicacao/midia', {
      method: midiaAtual.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...midiaAtual, recurso: 'midia' }),
    })
    const d = await r.json()
    setSalvando(false)
    if (r.ok) { setMsg('Mídia salva!'); setModal(null); carregarMidias() }
    else setMsg(d.erro ?? 'Erro')
  }

  async function salvarAlbum() {
    setSalvando(true)
    const r = await fetch('/api/comunicacao/midia', {
      method: albumAtual.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...albumAtual, recurso: 'album' }),
    })
    const d = await r.json()
    setSalvando(false)
    if (r.ok) { setMsg('Álbum salvo!'); setModal(null); carregarAlbums() }
    else setMsg(d.erro ?? 'Erro')
  }

  async function excluirMidia(id: string) {
    if (!confirm('Excluir esta mídia?')) return
    const r = await fetch(`/api/comunicacao/midia?id=${id}&recurso=midia`, { method: 'DELETE' })
    if (r.ok) { setMsg('Mídia excluída'); carregarMidias() }
  }

  const totalPaginas = Math.ceil(total / perPagina)

  return (
<>
      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1B5E20' }}>🗂️ Galeria de Mídia</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>Fotos, vídeos e documentos da Prefeitura</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setAlbumAtual({ categoria: 'OUTRO' }); setModal('novo-album') }}
              style={{ background: '#fff', color: '#1B5E20', border: '1px solid #1B5E20', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              + Novo Álbum
            </button>
            <button onClick={() => { setMidiaAtual({ tipo: 'FOTO', categoria: 'OUTRO', destaque: false }); setModal('nova-midia') }}
              style={{ background: '#1B5E20', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              + Adicionar Mídia
            </button>
          </div>
        </div>

        {msg && (
          <div style={{ background: msg.includes('rro') ? '#FFEBEE' : '#E8F5E9', color: msg.includes('rro') ? '#B71C1C' : '#1B5E20', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {msg} <button onClick={() => setMsg('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* Abas */}
        <div style={{ display: 'flex', borderBottom: '2px solid #E5E7EB', marginBottom: 20, gap: 0 }}>
          {(['galeria', 'albums'] as const).map(a => (
            <button key={a} onClick={() => { setAba(a); setPagina(1) }}
              style={{ padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: aba === a ? 700 : 400, color: aba === a ? '#1B5E20' : '#666', borderBottom: aba === a ? '2px solid #1B5E20' : '2px solid transparent', marginBottom: -2 }}>
              {a === 'galeria' ? '🖼️ Galeria' : '📁 Álbuns'}
            </button>
          ))}
        </div>

        {aba === 'galeria' && (
          <>
            {/* Filtros */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPagina(1) }}
                style={{ padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, background: '#fff' }}>
                <option value="">Todos os tipos</option>
                {Object.entries(TIPO_MIDIA).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
              </select>
              <select value={filtroCategoria} onChange={e => { setFiltroCategoria(e.target.value); setPagina(1) }}
                style={{ padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, background: '#fff' }}>
                <option value="">Todas as categorias</option>
                {Object.entries(CATEGORIA_MIDIA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            {/* Grade de mídia */}
            {carregando ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Carregando...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {midias.length === 0 ? (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#999' }}>Nenhuma mídia encontrada.</div>
                ) : midias.map(m => {
                  const t = TIPO_MIDIA[m.tipo] ?? { label: m.tipo, emoji: '📎' }
                  return (
                    <div key={m.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', overflow: 'hidden', position: 'relative' }}>
                      {/* Thumbnail ou ícone */}
                      <div style={{ height: 140, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, position: 'relative', overflow: 'hidden' }}>
                        {m.urlThumb || m.tipo === 'FOTO' ? (
                          m.urlThumb ? <img src={m.urlThumb} alt={m.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} /> : <span>{t.emoji}</span>
                        ) : <span>{t.emoji}</span>}
                        {m.destaque && <span style={{ position: 'absolute', top: 6, left: 6, fontSize: 14 }}>⭐</span>}
                        <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 10 }}>
                          {t.label}
                        </div>
                      </div>
                      <div style={{ padding: '10px 12px' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#111', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.titulo}</div>
                        <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
                          {CATEGORIA_MIDIA[m.categoria] ?? m.categoria} · {formatarBytes(m.tamanhoBytes)}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <a href={m.url} target="_blank" rel="noreferrer"
                            style={{ flex: 1, background: '#EFF6FF', border: 'none', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontSize: 11, textDecoration: 'none', color: '#1D4ED8', textAlign: 'center' }}>
                            🔗 Ver
                          </a>
                          <button onClick={() => excluirMidia(m.id)}
                            style={{ background: '#FEF2F2', border: 'none', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>🗑️</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {totalPaginas > 1 && (
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 8 }}>
                <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}
                  style={{ padding: '7px 16px', border: '1px solid #DDD', borderRadius: 7, cursor: pagina === 1 ? 'default' : 'pointer', fontSize: 13, background: pagina === 1 ? '#F9FAFB' : '#fff' }}>← Anterior</button>
                <span style={{ padding: '7px 12px', fontSize: 13, color: '#666' }}>{pagina} / {totalPaginas}</span>
                <button disabled={pagina === totalPaginas} onClick={() => setPagina(p => p + 1)}
                  style={{ padding: '7px 16px', border: '1px solid #DDD', borderRadius: 7, cursor: pagina === totalPaginas ? 'default' : 'pointer', fontSize: 13, background: pagina === totalPaginas ? '#F9FAFB' : '#fff' }}>Próxima →</button>
              </div>
            )}
          </>
        )}

        {aba === 'albums' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {carregando ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999', gridColumn: '1/-1' }}>Carregando...</div>
            ) : albums.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999', gridColumn: '1/-1' }}>Nenhum álbum criado ainda.</div>
            ) : albums.map(a => (
              <div key={a.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', padding: 16 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 4 }}>{a.nome}</div>
                {a.descricao && <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{a.descricao}</div>}
                <div style={{ fontSize: 11, color: '#888' }}>
                  {CATEGORIA_MIDIA[a.categoria] ?? a.categoria} · {a._count?.midias ?? 0} mídias
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Nova Mídia */}
        {modal === 'nova-midia' && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#1B5E20' }}>+ Adicionar Mídia</h2>
              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Título *</label>
                  <input value={midiaAtual.titulo ?? ''} onChange={e => setMidiaAtual(p => ({ ...p, titulo: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Tipo</label>
                    <select value={midiaAtual.tipo ?? 'FOTO'} onChange={e => setMidiaAtual(p => ({ ...p, tipo: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, background: '#fff' }}>
                      {Object.entries(TIPO_MIDIA).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Categoria</label>
                    <select value={midiaAtual.categoria ?? 'OUTRO'} onChange={e => setMidiaAtual(p => ({ ...p, categoria: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, background: '#fff' }}>
                      {Object.entries(CATEGORIA_MIDIA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>URL do arquivo *</label>
                  <input value={midiaAtual.url ?? ''} onChange={e => setMidiaAtual(p => ({ ...p, url: e.target.value }))}
                    placeholder="https://..."
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Nome do arquivo *</label>
                  <input value={midiaAtual.nomeArquivo ?? ''} onChange={e => setMidiaAtual(p => ({ ...p, nomeArquivo: e.target.value }))}
                    placeholder="foto-inauguracao.jpg"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Autor/Fotógrafo</label>
                  <input value={midiaAtual.autor ?? ''} onChange={e => setMidiaAtual(p => ({ ...p, autor: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="mDestaque" checked={midiaAtual.destaque ?? false}
                    onChange={e => setMidiaAtual(p => ({ ...p, destaque: e.target.checked }))} />
                  <label htmlFor="mDestaque" style={{ fontSize: 13, color: '#555' }}>⭐ Destaque</label>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button onClick={() => setModal(null)}
                  style={{ padding: '9px 20px', border: '1px solid #DDD', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
                <button onClick={salvarMidia} disabled={salvando}
                  style={{ padding: '9px 20px', background: '#1B5E20', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: salvando ? 0.7 : 1 }}>
                  {salvando ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Novo Álbum */}
        {modal === 'novo-album' && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#1B5E20' }}>📁 Novo Álbum</h2>
              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Nome *</label>
                  <input value={albumAtual.nome ?? ''} onChange={e => setAlbumAtual(p => ({ ...p, nome: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Categoria</label>
                  <select value={albumAtual.categoria ?? 'OUTRO'} onChange={e => setAlbumAtual(p => ({ ...p, categoria: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, background: '#fff' }}>
                    {Object.entries(CATEGORIA_MIDIA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Descrição</label>
                  <textarea value={albumAtual.descricao ?? ''} onChange={e => setAlbumAtual(p => ({ ...p, descricao: e.target.value }))}
                    rows={3} style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button onClick={() => setModal(null)}
                  style={{ padding: '9px 20px', border: '1px solid #DDD', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
                <button onClick={salvarAlbum} disabled={salvando}
                  style={{ padding: '9px 20px', background: '#1B5E20', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: salvando ? 0.7 : 1 }}>
                  {salvando ? 'Salvando...' : 'Criar Álbum'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
</>
  )
}
