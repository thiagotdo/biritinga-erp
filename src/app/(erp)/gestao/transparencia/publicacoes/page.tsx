'use client'
import { useState, useEffect, useCallback } from 'react'

// ─── Portal da Transparência — Painel de Publicações ─────────────────────────
// LC 131/2009 — transparência fiscal em tempo real
// Lei 12.527/2011 — acesso à informação

interface Publicacao {
  id: string
  tipo: string
  situacao: string
  titulo: string
  descricao?: string
  periodo?: string
  exercicio?: number
  valorTotal?: number
  urlArquivo?: string
  nomeArquivo?: string
  publicadoEm: string
  tags?: string
}

interface DashboardData {
  kpis: { totalPublic: number; receitaPrevista: number; receitaArrecadada: number; despesaOrcada: number; despesaPaga: number }
  porTipo: Array<{ tipo: string; _count: { _all: number } }>
  recMensal: Array<{ mes: number; competencia: string; arrecadado: number }>
  despMensal: Array<{ mes: number; competencia: string; pago: number }>
}

const TIPO_ICON: Record<string, string> = {
  RECEITA_PREVISTA: '📊', RECEITA_REALIZADA: '💹', DESPESA_ORCADA: '📋',
  DESPESA_EMPENHADA: '📝', DESPESA_LIQUIDADA: '✅', DESPESA_PAGA: '💸',
  LICITACAO: '🏷️', CONTRATO: '📄', CONVENIO: '🤝', FOLHA_PAGAMENTO: '👥',
  BALANCETE: '📒', BALANÇO_ANUAL: '📚', RELATORIO_LRF: '🏛️',
  DIARIO_OFICIAL: '📰', ATA_CAMARA: '🏛️', DECRETO: '📜', PORTARIA: '📋', RESOLUCAO: '⚖️',
}
const TIPO_LABEL: Record<string, string> = {
  RECEITA_PREVISTA: 'Receita Prevista', RECEITA_REALIZADA: 'Receita Realizada',
  DESPESA_ORCADA: 'Despesa Orçada', DESPESA_EMPENHADA: 'Despesa Empenhada',
  DESPESA_LIQUIDADA: 'Despesa Liquidada', DESPESA_PAGA: 'Despesa Paga',
  LICITACAO: 'Licitações', CONTRATO: 'Contratos', CONVENIO: 'Convênios',
  FOLHA_PAGAMENTO: 'Folha de Pagamento', BALANCETE: 'Balancete Mensal',
  BALANÇO_ANUAL: 'Balanço Anual', RELATORIO_LRF: 'Relatório LRF (RREO/RGF)',
  DIARIO_OFICIAL: 'Diário Oficial', ATA_CAMARA: 'Atas da Câmara',
  DECRETO: 'Decretos', PORTARIA: 'Portarias', RESOLUCAO: 'Resoluções',
}
const SIT_COR: Record<string, string> = {
  PUBLICADA: '#22c55e', RASCUNHO: '#f59e0b', RETIFICADA: '#3b82f6', REVOGADA: '#ef4444',
}

const fmtMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default function PublicacoesPage() {
  const anoAtual = new Date().getFullYear()
  const [dash, setDash]         = useState<DashboardData | null>(null)
  const [pubs, setPubs]         = useState<Publicacao[]>([])
  const [sel, setSel]           = useState<Publicacao | null>(null)
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState<Record<string, any>>({ exercicio: anoAtual, situacao: 'PUBLICADA' })
  const [filtTipo, setFiltTipo] = useState('')
  const [busca, setBusca]       = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg]           = useState('')

  const load = useCallback(async () => {
    const [rd, rp] = await Promise.all([
      fetch('/api/transparencia/publicacao?relatorio=DASHBOARD'),
      fetch('/api/transparencia/publicacao'),
    ])
    if (rd.ok) setDash(await rd.json())
    if (rp.ok) { const d = await rp.json(); setPubs(d.publicacoes ?? []) }
  }, [])

  useEffect(() => { load() }, [load])

  const salvar = async () => {
    setSalvando(true)
    const r = await fetch('/api/transparencia/publicacao', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, exercicio: Number(form.exercicio) }),
    })
    setSalvando(false)
    if (r.ok) { setMsg('Publicação registrada!'); setModal(false); setForm({ exercicio: anoAtual, situacao: 'PUBLICADA' }); load() }
    else { const d = await r.json(); setMsg(JSON.stringify(d.erro)) }
  }

  const acao = async (id: string, acaoNome: string) => {
    await fetch('/api/transparencia/publicacao', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, acao: acaoNome }),
    })
    setSel(null); load()
  }

  const pubsFilt = pubs.filter(p =>
    (!filtTipo || p.tipo === filtTipo) &&
    (!busca || p.titulo.toLowerCase().includes(busca.toLowerCase()) || (p.tags ?? '').toLowerCase().includes(busca.toLowerCase()))
  )

  // Gráfico de barras simples
  const maxRec = dash ? Math.max(...(dash.recMensal.map(r => r.arrecadado)), 1) : 1
  const maxDesp = dash ? Math.max(...(dash.despMensal.map(d => d.pago)), 1) : 1

  return (
    <div style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>🏛️ Portal da Transparência</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>LC 131/2009 · Lei 12.527/2011 — Publicações de transparência fiscal</p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          + Nova Publicação
        </button>
      </div>

      {msg && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14, color: '#16a34a' }}>{msg}</div>}

      {/* KPIs orçamentários */}
      {dash && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Publicações Ativas', valor: dash.kpis.totalPublic, fmtNum: true, cor: '#3b82f6', icon: '📋' },
              { label: 'Receita Prevista', valor: dash.kpis.receitaPrevista, moeda: true, cor: '#8b5cf6', icon: '📊' },
              { label: 'Receita Arrecadada', valor: dash.kpis.receitaArrecadada, moeda: true, cor: '#22c55e', icon: '💹' },
              { label: 'Despesa Orçada', valor: dash.kpis.despesaOrcada, moeda: true, cor: '#f59e0b', icon: '📋' },
              { label: 'Despesa Paga', valor: dash.kpis.despesaPaga, moeda: true, cor: '#ef4444', icon: '💸' },
            ].map(k => (
              <div key={k.label} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,.05)', borderLeft: `4px solid ${k.cor}` }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{k.icon}</div>
                <div style={{ fontSize: k.moeda ? 18 : 26, fontWeight: 800, color: k.cor }}>
                  {k.moeda ? fmtMoeda(k.valor) : k.valor}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Gráficos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
            {/* Receita mensal */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.05)', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>💹 Receita Arrecadada {anoAtual}</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100 }}>
                {MESES.map((mes, i) => {
                  const r = dash.recMensal.find(x => x.mes === i + 1)
                  const h = r ? Math.max(4, (r.arrecadado / maxRec) * 90) : 4
                  return (
                    <div key={mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <div title={r ? fmtMoeda(r.arrecadado) : '—'}
                        style={{ width: '100%', height: h, background: '#22c55e', borderRadius: '3px 3px 0 0', opacity: r ? 1 : 0.2 }} />
                      <span style={{ fontSize: 9, color: '#94a3b8' }}>{mes}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Despesa mensal */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.05)', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>💸 Despesa Paga {anoAtual}</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100 }}>
                {MESES.map((mes, i) => {
                  const d = dash.despMensal.find(x => x.mes === i + 1)
                  const h = d ? Math.max(4, (d.pago / maxDesp) * 90) : 4
                  return (
                    <div key={mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <div title={d ? fmtMoeda(d.pago) : '—'}
                        style={{ width: '100%', height: h, background: '#ef4444', borderRadius: '3px 3px 0 0', opacity: d ? 1 : 0.2 }} />
                      <span style={{ fontSize: 9, color: '#94a3b8' }}>{mes}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Lista de publicações */}
      <div style={{ display: 'grid', gridTemplateColumns: sel ? '1fr 420px' : '1fr', gap: 20 }}>
        <div>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar publicação…"
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, minWidth: 200 }} />
            <select value={filtTipo} onChange={e => setFiltTipo(e.target.value)}
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14 }}>
              <option value="">Todos os tipos</option>
              {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {/* Publicações agrupadas por tipo */}
          {Object.entries(TIPO_LABEL).map(([tipo, label]) => {
            const grupo = pubsFilt.filter(p => p.tipo === tipo)
            if (!grupo.length) return null
            return (
              <div key={tipo} style={{ marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {TIPO_ICON[tipo]} {label}
                  <span style={{ background: '#e2e8f0', borderRadius: 20, padding: '1px 8px', fontSize: 12 }}>{grupo.length}</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {grupo.map(p => (
                    <div key={p.id} onClick={() => setSel(sel?.id === p.id ? null : p)}
                      style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
                        border: sel?.id === p.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                        boxShadow: '0 1px 4px rgba(0,0,0,.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>{p.titulo}</div>
                        <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 12 }}>
                          {p.periodo && <span>📅 {p.periodo}</span>}
                          {p.exercicio && <span>🗓️ {p.exercicio}</span>}
                          <span>🕐 {new Date(p.publicadoEm).toLocaleDateString('pt-BR')}</span>
                          {p.valorTotal && <span>💰 {fmtMoeda(Number(p.valorTotal))}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 12 }}>
                        <span style={{ fontSize: 11, background: SIT_COR[p.situacao] + '20', color: SIT_COR[p.situacao], padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                          {p.situacao}
                        </span>
                        {p.urlArquivo && <span title="Possui arquivo">📎</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {pubsFilt.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', fontSize: 14 }}>
              Nenhuma publicação encontrada.
            </div>
          )}
        </div>

        {/* Painel de detalhe */}
        {sel && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,.06)', border: '1px solid #e2e8f0', height: 'fit-content', position: 'sticky', top: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 28 }}>{TIPO_ICON[sel.tipo]}</span>
                <span style={{ marginLeft: 8, fontSize: 11, background: SIT_COR[sel.situacao] + '20', color: SIT_COR[sel.situacao], padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                  {sel.situacao}
                </span>
              </div>
              <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button>
            </div>

            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{sel.titulo}</h3>

            {sel.descricao && <p style={{ fontSize: 13, color: '#374151', marginBottom: 16, lineHeight: 1.6 }}>{sel.descricao}</p>}

            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 16, display: 'grid', gap: 8 }}>
              <PubDetalhe icon="📋" label="Tipo" value={TIPO_LABEL[sel.tipo]} />
              {sel.periodo && <PubDetalhe icon="📅" label="Período" value={sel.periodo} />}
              {sel.exercicio && <PubDetalhe icon="🗓️" label="Exercício" value={String(sel.exercicio)} />}
              {sel.valorTotal && <PubDetalhe icon="💰" label="Valor Total" value={fmtMoeda(Number(sel.valorTotal))} />}
              <PubDetalhe icon="🕐" label="Publicado em" value={new Date(sel.publicadoEm).toLocaleString('pt-BR')} />
            </div>

            {sel.urlArquivo && (
              <a href={sel.urlArquivo} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', background: '#eff6ff', color: '#3b82f6', borderRadius: 10, padding: '12px 16px', textDecoration: 'none', fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
                📎 {sel.nomeArquivo ?? 'Baixar arquivo'}
              </a>
            )}

            {sel.tags && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>TAGS</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {sel.tags.split(',').map(t => (
                    <span key={t} style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 20, fontSize: 12 }}>{t.trim()}</span>
                  ))}
                </div>
              </div>
            )}

            {sel.situacao === 'PUBLICADA' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => acao(sel.id, 'RETIFICAR')} style={{ flex: 1, background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  ✏️ Retificar
                </button>
                <button onClick={() => acao(sel.id, 'REVOGAR')} style={{ flex: 1, background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  🚫 Revogar
                </button>
              </div>
            )}
            {sel.situacao === 'RASCUNHO' && (
              <button onClick={() => acao(sel.id, 'REPUBLICAR')} style={{ width: '100%', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer', fontWeight: 700 }}>
                🌐 Publicar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal nova publicação */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 600, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 800 }}>📋 Nova Publicação</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Tipo *</label>
                <select value={form.tipo ?? 'RECEITA_REALIZADA'} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={inpS}>
                  {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{TIPO_ICON[k]} {v}</option>)}
                </select>
              </div>
              <div>
                <label style={lblS}>Situação</label>
                <select value={form.situacao ?? 'PUBLICADA'} onChange={e => setForm(f => ({ ...f, situacao: e.target.value }))} style={inpS}>
                  <option value="PUBLICADA">Publicada</option>
                  <option value="RASCUNHO">Rascunho</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lblS}>Título *</label>
              <input value={form.titulo ?? ''} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} style={inpS} placeholder="ex: Balancete Financeiro — Outubro/2026" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Período</label>
                <input value={form.periodo ?? ''} onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))} style={inpS} placeholder="ex: Outubro/2026 · 1º Bimestre 2026" />
              </div>
              <div>
                <label style={lblS}>Exercício</label>
                <input type="number" value={form.exercicio ?? anoAtual} onChange={e => setForm(f => ({ ...f, exercicio: e.target.value }))} style={inpS} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lblS}>Descrição</label>
              <textarea value={form.descricao ?? ''} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={3} style={{ ...inpS, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Valor Total (R$)</label>
                <input type="number" step="0.01" value={form.valorTotal ?? ''} onChange={e => setForm(f => ({ ...f, valorTotal: e.target.value }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>URL do Arquivo</label>
                <input value={form.urlArquivo ?? ''} onChange={e => setForm(f => ({ ...f, urlArquivo: e.target.value }))} style={inpS} placeholder="https://…" />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={lblS}>Tags (separadas por vírgula)</label>
              <input value={form.tags ?? ''} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} style={inpS} placeholder="receita, mensal, tributária" />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando}
                style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                {salvando ? 'Salvando…' : '🌐 Publicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PubDetalhe({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
      <span style={{ width: 18 }}>{icon}</span>
      <div>
        <span style={{ color: '#94a3b8', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
        <span style={{ color: '#1e293b', fontWeight: 500 }}>{value}</span>
      </div>
    </div>
  )
}

const lblS: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }
const inpS: React.CSSProperties = { width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }
