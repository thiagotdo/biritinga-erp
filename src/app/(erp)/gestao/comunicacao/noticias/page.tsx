'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminShell from '@/components/AdminShell'

type Noticia = {
  id: string; titulo: string; tipo: string; status: string
  autor: string; secretaria?: string; destaque: boolean
  visualizacoes: number; dataPublicacao?: string; criadoEm: string
  slug: string
}

const TIPO_LABEL: Record<string, string> = {
  NOTICIA: 'Notícia', NOTA_OFICIAL: 'Nota Oficial', COMUNICADO: 'Comunicado',
  DECRETO: 'Decreto', PORTARIA: 'Portaria', EDITAL: 'Edital', RESULTADO: 'Resultado',
}
const STATUS_COR: Record<string, { bg: string; color: string; label: string }> = {
  RASCUNHO:  { bg: '#F3F4F6', color: '#6B7280', label: 'Rascunho' },
  REVISAO:   { bg: '#FFF3CD', color: '#856404', label: 'Em Revisão' },
  PUBLICADA: { bg: '#D1FAE5', color: '#065F46', label: 'Publicada' },
  ARQUIVADA: { bg: '#E5E7EB', color: '#374151', label: 'Arquivada' },
}

export default function NoticiasPage() {
  const [noticias, setNoticias] = useState<Noticia[]>([])
  const [total, setTotal]       = useState(0)
  const [pagina, setPagina]     = useState(1)
  const [busca, setBusca]       = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroTipo, setFiltroTipo]     = useState('')
  const [carregando, setCarregando]     = useState(true)
  const [modal, setModal]       = useState<'novo' | 'editar' | null>(null)
  const [noticiaAtual, setNoticiaAtual] = useState<Partial<Noticia & { corpo: string; resumo: string; tags: string }>>({})
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg]           = useState('')

  const perPagina = 15

  const carregar = useCallback(async () => {
    setCarregando(true)
    const p = new URLSearchParams({ pagina: String(pagina), limite: String(perPagina) })
    if (busca) p.set('busca', busca)
    if (filtroStatus) p.set('status', filtroStatus)
    if (filtroTipo) p.set('tipo', filtroTipo)
    const r = await fetch(`/api/comunicacao/noticias?${p}`)
    if (r.ok) { const d = await r.json(); setNoticias(d.noticias); setTotal(d.total) }
    setCarregando(false)
  }, [pagina, busca, filtroStatus, filtroTipo])

  useEffect(() => { carregar() }, [carregar])

  async function salvar() {
    setSalvando(true)
    const metodo = noticiaAtual.id ? 'PUT' : 'POST'
    const r = await fetch('/api/comunicacao/noticias', {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noticiaAtual),
    })
    const d = await r.json()
    setSalvando(false)
    if (r.ok) { setMsg(noticiaAtual.id ? 'Notícia atualizada!' : 'Notícia criada!'); setModal(null); carregar() }
    else setMsg(d.erro ?? 'Erro ao salvar')
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esta notícia?')) return
    const r = await fetch(`/api/comunicacao/noticias?id=${id}`, { method: 'DELETE' })
    if (r.ok) { setMsg('Notícia excluída'); carregar() }
  }

  async function publicar(id: string, status: string) {
    const novoStatus = status === 'PUBLICADA' ? 'RASCUNHO' : 'PUBLICADA'
    await fetch('/api/comunicacao/noticias', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: novoStatus }),
    })
    carregar()
  }

  const totalPaginas = Math.ceil(total / perPagina)

  return (
    <AdminShell>
      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1B5E20' }}>📰 Notícias e Comunicados</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>Gestão de publicações da Prefeitura de Biritinga</p>
          </div>
          <button onClick={() => { setNoticiaAtual({ tipo: 'NOTICIA', status: 'RASCUNHO', destaque: false }); setModal('novo') }}
            style={{ background: '#1B5E20', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            + Nova Publicação
          </button>
        </div>

        {msg && (
          <div style={{ background: msg.includes('rro') ? '#FFEBEE' : '#E8F5E9', color: msg.includes('rro') ? '#B71C1C' : '#1B5E20', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {msg} <button onClick={() => setMsg('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
        )}

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1) }}
            placeholder="Buscar por título ou autor..."
            style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13 }} />
          <select value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPagina(1) }}
            style={{ padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, background: '#fff' }}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_COR).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPagina(1) }}
            style={{ padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, background: '#fff' }}>
            <option value="">Todos os tipos</option>
            {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Tabela */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                {['Título / Tipo', 'Status', 'Autor', 'Publicação', 'Views', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 13 }}>Carregando...</td></tr>
              ) : noticias.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 13 }}>Nenhuma publicação encontrada.</td></tr>
              ) : noticias.map((n, i) => {
                const sc = STATUS_COR[n.status] ?? STATUS_COR.RASCUNHO
                return (
                  <tr key={n.id} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ padding: '12px 16px', maxWidth: 320 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {n.destaque && <span title="Destaque" style={{ fontSize: 14 }}>⭐</span>}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }}>{n.titulo}</div>
                          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{TIPO_LABEL[n.tipo] ?? n.tipo}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{sc.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#555' }}>{n.autor}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#555' }}>
                      {n.dataPublicacao ? new Date(n.dataPublicacao).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#555', textAlign: 'center' }}>{n.visualizacoes}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => publicar(n.id, n.status)}
                          title={n.status === 'PUBLICADA' ? 'Despublicar' : 'Publicar'}
                          style={{ background: n.status === 'PUBLICADA' ? '#FFF3CD' : '#D1FAE5', border: 'none', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>
                          {n.status === 'PUBLICADA' ? '📤' : '📢'}
                        </button>
                        <button onClick={() => { setNoticiaAtual(n); setModal('editar') }}
                          style={{ background: '#EFF6FF', border: 'none', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>✏️</button>
                        <button onClick={() => excluir(n.id)}
                          style={{ background: '#FEF2F2', border: 'none', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F3F4F6' }}>
              <span style={{ fontSize: 12, color: '#666' }}>{total} publicações · página {pagina}/{totalPaginas}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}
                  style={{ padding: '5px 12px', border: '1px solid #DDD', borderRadius: 6, cursor: pagina === 1 ? 'default' : 'pointer', fontSize: 12, background: pagina === 1 ? '#F9FAFB' : '#fff' }}>
                  ← Anterior
                </button>
                <button disabled={pagina === totalPaginas} onClick={() => setPagina(p => p + 1)}
                  style={{ padding: '5px 12px', border: '1px solid #DDD', borderRadius: 6, cursor: pagina === totalPaginas ? 'default' : 'pointer', fontSize: 12, background: pagina === totalPaginas ? '#F9FAFB' : '#fff' }}>
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Novo/Editar */}
        {modal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#1B5E20' }}>
                {modal === 'novo' ? '+ Nova Publicação' : '✏️ Editar Publicação'}
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Título *</label>
                  <input value={noticiaAtual.titulo ?? ''} onChange={e => setNoticiaAtual(p => ({ ...p, titulo: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Tipo</label>
                  <select value={noticiaAtual.tipo ?? 'NOTICIA'} onChange={e => setNoticiaAtual(p => ({ ...p, tipo: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, background: '#fff' }}>
                    {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Status</label>
                  <select value={noticiaAtual.status ?? 'RASCUNHO'} onChange={e => setNoticiaAtual(p => ({ ...p, status: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, background: '#fff' }}>
                    {Object.entries(STATUS_COR).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Secretaria</label>
                  <input value={noticiaAtual.secretaria ?? ''} onChange={e => setNoticiaAtual(p => ({ ...p, secretaria: e.target.value }))}
                    placeholder="Ex: SECOM, SEMSA..."
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Autor</label>
                  <input value={noticiaAtual.autor ?? ''} onChange={e => setNoticiaAtual(p => ({ ...p, autor: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                </div>

                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Resumo</label>
                  <textarea value={(noticiaAtual as any).resumo ?? ''} onChange={e => setNoticiaAtual(p => ({ ...p, resumo: e.target.value }))}
                    rows={2} style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                </div>

                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Conteúdo *</label>
                  <textarea value={(noticiaAtual as any).corpo ?? ''} onChange={e => setNoticiaAtual(p => ({ ...p, corpo: e.target.value }))}
                    rows={8} placeholder="Texto completo da publicação..."
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                </div>

                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Tags (separadas por vírgula)</label>
                  <input value={(noticiaAtual as any).tags ?? ''} onChange={e => setNoticiaAtual(p => ({ ...p, tags: e.target.value }))}
                    placeholder="saude, vacina, campanha..."
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #DDD', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                </div>

                <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="destaque" checked={noticiaAtual.destaque ?? false}
                    onChange={e => setNoticiaAtual(p => ({ ...p, destaque: e.target.checked }))} />
                  <label htmlFor="destaque" style={{ fontSize: 13, color: '#555' }}>⭐ Marcar como destaque</label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button onClick={() => setModal(null)}
                  style={{ padding: '9px 20px', border: '1px solid #DDD', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                  Cancelar
                </button>
                <button onClick={salvar} disabled={salvando}
                  style={{ padding: '9px 20px', background: '#1B5E20', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: salvando ? 0.7 : 1 }}>
                  {salvando ? 'Salvando...' : (modal === 'novo' ? 'Criar Publicação' : 'Salvar Alterações')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
