'use client'
import { useState, useEffect, useCallback } from 'react'

// ─── Contratos Administrativos ───────────────────────────────────────────────
// Lei 14.133/2021 - Arts. 92–165
// Art. 117 - fiscalização obrigatória

interface Contrato {
  id: string
  numero: string
  situacao: string
  contratadaNome: string
  contratadaCNPJ: string
  objeto: string
  valorOriginal: number
  valorAtual: number
  valorExecutado: number
  dataAssinatura?: string
  dataInicio?: string
  dataFim?: string
  indiceReajuste?: string
  garantiaTipo?: string
  garantiaValor?: number
  fiscalNome?: string
  gestorNome?: string
  urlContrato?: string
  pncpNumero?: string
  dotacaoOrcamentaria?: string
  licitacao?: { numero: string; modalidade: string }
  _count?: { aditivos: number; medicoes: number }
}

interface DashContratos {
  kpis: { total: number; ativos: number; valorAtivo: number; valorExecutado: number; alertas30: number; alertas90: number }
  porSituacao: Array<{ situacao: string; count: number; valorTotal: number }>
  alertas30: Array<{ id: string; numero: string; objeto: string; contratadaNome: string; dataFim: string; valorAtual: number }>
  alertas90: Array<{ id: string; numero: string; objeto: string; contratadaNome: string; dataFim: string; valorAtual: number }>
}

const SIT_COR: Record<string, string> = {
  MINUTA: '#94a3b8', ASSINADO: '#3b82f6', EM_EXECUCAO: '#22c55e', SUSPENSO: '#f59e0b',
  RESCINDIDO_ADMIN: '#ef4444', RESCINDIDO_AMIGAVEL: '#f97316', RESCINDIDO_JUDICIAL: '#dc2626',
  CONCLUIDO: '#10b981', EXPIRADO: '#475569',
}
const fmtMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const diasRestantes = (fim: string) => Math.ceil((new Date(fim).getTime() - Date.now()) / 86400000)

export default function ContratosPage() {
  const [dash, setDash]     = useState<DashContratos | null>(null)
  const [conts, setConts]   = useState<Contrato[]>([])
  const [sel, setSel]       = useState<Contrato | null>(null)
  const [modal, setModal]   = useState<'novo' | 'aditivo' | 'medicao' | null>(null)
  const [form, setForm]     = useState<Record<string, any>>({})
  const [filtSit, setFiltSit] = useState('')
  const [busca, setBusca]   = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg]           = useState('')

  const load = useCallback(async () => {
    const [rd, rc] = await Promise.all([
      fetch('/api/licitacoes/contrato?relatorio=DASHBOARD'),
      fetch('/api/licitacoes/contrato'),
    ])
    if (rd.ok) setDash(await rd.json())
    if (rc.ok) { const d = await rc.json(); setConts(d.contratos ?? []) }
  }, [])

  useEffect(() => { load() }, [load])

  const salvar = async (recurso?: string) => {
    setSalvando(true)
    const payload = recurso ? { _recurso: recurso, ...form } : { ...form, valorOriginal: Number(form.valorOriginal) }
    const r = await fetch('/api/licitacoes/contrato', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSalvando(false)
    if (r.ok) {
      const d = await r.json()
      setMsg(recurso ? 'Registrado com sucesso!' : `Contrato ${d.numero} criado!`)
      setModal(null); setForm({}); load()
    } else { const d = await r.json(); setMsg(JSON.stringify(d.erro)) }
  }

  const acao = async (id: string, acaoNome: string, dados: Record<string, any> = {}) => {
    await fetch('/api/licitacoes/contrato', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, acao: acaoNome, ...dados }),
    })
    setSel(null); load()
  }

  const contsFilt = conts.filter(c =>
    (!filtSit || c.situacao === filtSit) &&
    (!busca || c.numero.includes(busca.toUpperCase()) || c.contratadaNome.toLowerCase().includes(busca.toLowerCase()) || c.objeto.toLowerCase().includes(busca.toLowerCase()))
  )

  return (
    <div style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>📄 Contratos Administrativos</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Lei 14.133/2021 - Fiscalização e gestão de contratos</p>
        </div>
        <button onClick={() => setModal('novo')}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          + Novo Contrato
        </button>
      </div>

      {msg && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14, color: '#16a34a' }}>{msg}</div>}

      {dash && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total', valor: dash.kpis.total, raw: true, cor: '#3b82f6', icon: '📄' },
              { label: 'Ativos', valor: dash.kpis.ativos, raw: true, cor: '#22c55e', icon: '✅' },
              { label: 'Valor Ativo', valor: fmtMoeda(dash.kpis.valorAtivo), cor: '#1d4ed8', icon: '💰' },
              { label: 'Executado', valor: fmtMoeda(dash.kpis.valorExecutado), cor: '#8b5cf6', icon: '⚙️' },
              { label: 'Vencendo em 30d', valor: dash.kpis.alertas30, raw: true, cor: dash.kpis.alertas30 > 0 ? '#ef4444' : '#94a3b8', icon: '🔴' },
              { label: 'Vencendo em 90d', valor: dash.kpis.alertas90, raw: true, cor: dash.kpis.alertas90 > 0 ? '#f59e0b' : '#94a3b8', icon: '⚠️' },
            ].map(k => (
              <div key={k.label} style={{ background: '#fff', borderRadius: 10, padding: 14, boxShadow: '0 2px 8px rgba(0,0,0,.05)', borderLeft: `4px solid ${k.cor}` }}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{k.icon}</div>
                <div style={{ fontSize: k.raw ? 24 : 15, fontWeight: 800, color: k.cor }}>{k.valor}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Alertas de vencimento */}
          {dash.alertas30.length > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#dc2626' }}>🔴 Contratos vencendo em até 30 dias</h3>
              {dash.alertas30.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid #fee2e2' }}>
                  <span style={{ fontFamily: 'monospace', color: '#3b82f6', marginRight: 10 }}>{c.numero}</span>
                  <span style={{ flex: 1, color: '#374151' }}>{c.contratadaNome.slice(0, 30)}</span>
                  <span style={{ color: '#dc2626', fontWeight: 700 }}>vence em {diasRestantes(c.dataFim)} dias</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Lista + detalhe */}
      <div style={{ display: 'grid', gridTemplateColumns: sel ? '1fr 440px' : '1fr', gap: 20 }}>
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Número, contratada ou objeto…"
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, minWidth: 240 }} />
            <select value={filtSit} onChange={e => setFiltSit(e.target.value)}
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14 }}>
              <option value="">Todas as situações</option>
              {Object.keys(SIT_COR).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {contsFilt.map(c => {
              const pctExec = c.valorAtual > 0 ? Math.min(100, (c.valorExecutado / c.valorAtual) * 100) : 0
              const diasFim = c.dataFim ? diasRestantes(c.dataFim) : null
              return (
                <div key={c.id} onClick={() => setSel(sel?.id === c.id ? null : c)}
                  style={{ background: '#fff', borderRadius: 10, padding: 16, cursor: 'pointer',
                    border: sel?.id === c.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    borderLeft: diasFim !== null && diasFim <= 30 && ['ASSINADO','EM_EXECUCAO'].includes(c.situacao) ? '4px solid #ef4444' : undefined,
                    boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 800, color: '#3b82f6' }}>{c.numero}</span>
                      {c.licitacao && <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '1px 7px', borderRadius: 20 }}>↔ {c.licitacao.numero}</span>}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, background: (SIT_COR[c.situacao] ?? '#94a3b8') + '20', color: SIT_COR[c.situacao] ?? '#94a3b8', padding: '2px 10px', borderRadius: 20 }}>
                      {c.situacao.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>{c.contratadaNome}</div>
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: '#64748b' }}>{c.objeto.slice(0, 80)}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: '#374151' }}>💰 {fmtMoeda(c.valorAtual)}</div>
                    {c.dataFim && <div style={{ fontSize: 12, color: diasFim !== null && diasFim <= 30 ? '#ef4444' : '#64748b' }}>
                      📅 Venc. {new Date(c.dataFim).toLocaleDateString('pt-BR')}{diasFim !== null && diasFim <= 90 ? ` (${diasFim}d)` : ''}
                    </div>}
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: 4, height: 5 }}>
                    <div style={{ background: pctExec > 90 ? '#ef4444' : pctExec > 60 ? '#f59e0b' : '#22c55e', height: 5, borderRadius: 4, width: `${pctExec}%`, transition: 'width .4s' }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Execução: {pctExec.toFixed(0)}%</div>
                </div>
              )
            })}
            {contsFilt.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 14 }}>Nenhum contrato encontrado.</div>}
          </div>
        </div>

        {/* Detalhe */}
        {sel && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,.06)', border: '1px solid #e2e8f0', height: 'fit-content', position: 'sticky', top: 20, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 800, color: '#3b82f6' }}>{sel.numero}</div>
                <span style={{ fontSize: 11, fontWeight: 600, background: (SIT_COR[sel.situacao] ?? '#94a3b8') + '20', color: SIT_COR[sel.situacao] ?? '#94a3b8', padding: '2px 8px', borderRadius: 20 }}>
                  {sel.situacao.replace(/_/g, ' ')}
                </span>
              </div>
              <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 14, display: 'grid', gap: 7 }}>
              <ContDetalhe icon="🏢" label="Contratada" value={sel.contratadaNome} />
              <ContDetalhe icon="🪪" label="CNPJ" value={sel.contratadaCNPJ} />
              <ContDetalhe icon="💰" label="Valor Original" value={fmtMoeda(sel.valorOriginal)} />
              {sel.valorAtual !== sel.valorOriginal && <ContDetalhe icon="💰" label="Valor Atual" value={fmtMoeda(sel.valorAtual)} />}
              <ContDetalhe icon="⚙️" label="Executado" value={`${fmtMoeda(sel.valorExecutado)} (${sel.valorAtual > 0 ? ((sel.valorExecutado / sel.valorAtual) * 100).toFixed(0) : 0}%)`} />
              {sel.dataAssinatura && <ContDetalhe icon="✍️" label="Assinado em" value={new Date(sel.dataAssinatura).toLocaleDateString('pt-BR')} />}
              {sel.dataFim && <ContDetalhe icon="📅" label="Vigência até" value={new Date(sel.dataFim).toLocaleDateString('pt-BR')} />}
              {sel.fiscalNome && <ContDetalhe icon="👤" label="Fiscal" value={sel.fiscalNome} />}
              {sel.gestorNome && <ContDetalhe icon="👤" label="Gestor" value={sel.gestorNome} />}
              {sel.garantiaTipo && <ContDetalhe icon="🛡️" label="Garantia" value={`${sel.garantiaTipo} · ${fmtMoeda(sel.garantiaValor ?? 0)}`} />}
              {sel._count && <ContDetalhe icon="📋" label="Aditivos / Medições" value={`${sel._count.aditivos} / ${sel._count.medicoes}`} />}
            </div>

            {sel.urlContrato && (
              <a href={sel.urlContrato} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', background: '#eff6ff', color: '#3b82f6', borderRadius: 8, padding: '10px', textDecoration: 'none', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                📄 Ver Contrato
              </a>
            )}

            {/* Ações de gestão */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {sel.situacao === 'MINUTA' && <BtnC cor="#3b82f6" onClick={() => acao(sel.id, 'ASSINAR')}>✍️ Registrar Assinatura</BtnC>}
              {sel.situacao === 'ASSINADO' && <BtnC cor="#22c55e" onClick={() => acao(sel.id, 'INICIAR')}>▶️ Iniciar Execução</BtnC>}
              {sel.situacao === 'EM_EXECUCAO' && <BtnC cor="#f59e0b" onClick={() => acao(sel.id, 'SUSPENDER')}>⏸️ Suspender</BtnC>}
              {sel.situacao === 'EM_EXECUCAO' && <BtnC cor="#10b981" onClick={() => acao(sel.id, 'CONCLUIR')}>✅ Concluir Contrato</BtnC>}
              {['ASSINADO', 'EM_EXECUCAO'].includes(sel.situacao) && (
                <BtnC cor="#ef4444" onClick={() => acao(sel.id, 'RESCINDIR_ADMIN')}>🚫 Rescindir (Admin.)</BtnC>
              )}
            </div>

            {/* Aditivo / Medição */}
            {['ASSINADO', 'EM_EXECUCAO'].includes(sel.situacao) && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setForm({ contratoId: sel.id }); setModal('aditivo') }}
                  style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
                  📝 Aditivo
                </button>
                <button onClick={() => { setForm({ contratoId: sel.id }); setModal('medicao') }}
                  style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
                  📏 Medição
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal novo contrato */}
      {modal === 'novo' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 660, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 800 }}>📄 Novo Contrato</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Contratada (Nome) *</label>
                <input value={form.contratadaNome ?? ''} onChange={e => setForm(f => ({ ...f, contratadaNome: e.target.value }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>CNPJ *</label>
                <input value={form.contratadaCNPJ ?? ''} onChange={e => setForm(f => ({ ...f, contratadaCNPJ: e.target.value }))} style={inpS} placeholder="00.000.000/0000-00" />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lblS}>Objeto *</label>
              <textarea value={form.objeto ?? ''} onChange={e => setForm(f => ({ ...f, objeto: e.target.value }))} rows={3} style={{ ...inpS, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Valor Original (R$) *</label>
                <input type="number" step="0.01" value={form.valorOriginal ?? ''} onChange={e => setForm(f => ({ ...f, valorOriginal: e.target.value }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>Data de Assinatura</label>
                <input type="date" value={form.dataAssinatura ?? ''} onChange={e => setForm(f => ({ ...f, dataAssinatura: e.target.value }))} style={inpS} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Data de Início</label>
                <input type="date" value={form.dataInicio ?? ''} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>Vigência Até *</label>
                <input type="date" value={form.dataFim ?? ''} onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))} style={inpS} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Fiscal do Contrato (Art. 117)</label>
                <input value={form.fiscalNome ?? ''} onChange={e => setForm(f => ({ ...f, fiscalNome: e.target.value }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>Gestor do Contrato</label>
                <input value={form.gestorNome ?? ''} onChange={e => setForm(f => ({ ...f, gestorNome: e.target.value }))} style={inpS} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={lblS}>Licitação de origem</label>
                <input value={form.licitacaoId ?? ''} onChange={e => setForm(f => ({ ...f, licitacaoId: e.target.value }))} style={inpS} placeholder="ID da licitação (opcional)" />
              </div>
              <div>
                <label style={lblS}>Dotação Orçamentária</label>
                <input value={form.dotacaoOrcamentaria ?? ''} onChange={e => setForm(f => ({ ...f, dotacaoOrcamentaria: e.target.value }))} style={inpS} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
              <button onClick={() => salvar()} disabled={salvando}
                style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                {salvando ? 'Salvando…' : '💾 Criar Contrato'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal aditivo */}
      {modal === 'aditivo' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 540, maxWidth: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 800 }}>📝 Termo Aditivo</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Nº Aditivo</label>
                <input type="number" value={form.numero ?? ''} onChange={e => setForm(f => ({ ...f, numero: Number(e.target.value) }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>Tipo</label>
                <select value={form.tipo ?? 'PRAZO'} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={inpS}>
                  <option value="PRAZO">Prorrogação de Prazo</option>
                  <option value="VALOR">Acréscimo de Valor</option>
                  <option value="PRAZO_VALOR">Prazo e Valor</option>
                  <option value="OBJETO">Alteração do Objeto</option>
                  <option value="REEQUILIBRIO">Reequilíbrio Econômico-Financeiro</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lblS}>Objeto do Aditivo</label>
              <input value={form.objeto ?? ''} onChange={e => setForm(f => ({ ...f, objeto: e.target.value }))} style={inpS} />
            </div>

            {['VALOR', 'PRAZO_VALOR', 'REEQUILIBRIO'].includes(form.tipo ?? '') && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={lblS}>Acréscimo (R$)</label>
                  <input type="number" step="0.01" value={form.valorAcrescimo ?? ''} onChange={e => setForm(f => ({ ...f, valorAcrescimo: Number(e.target.value) }))} style={inpS} />
                </div>
                <div>
                  <label style={lblS}>% Acréscimo (limite 25%)</label>
                  <input type="number" step="0.01" value={form.pctAcrescimo ?? ''} onChange={e => setForm(f => ({ ...f, pctAcrescimo: Number(e.target.value) }))} style={inpS} />
                </div>
              </div>
            )}

            {['PRAZO', 'PRAZO_VALOR'].includes(form.tipo ?? '') && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={lblS}>Dias de Prorrogação</label>
                  <input type="number" value={form.diasPrazo ?? ''} onChange={e => setForm(f => ({ ...f, diasPrazo: Number(e.target.value) }))} style={inpS} />
                </div>
                <div>
                  <label style={lblS}>Nova Data de Fim</label>
                  <input type="date" value={form.novaDataFim ?? ''} onChange={e => setForm(f => ({ ...f, novaDataFim: e.target.value }))} style={inpS} />
                </div>
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <label style={lblS}>Data de Assinatura</label>
              <input type="date" value={form.dataAssinatura ?? ''} onChange={e => setForm(f => ({ ...f, dataAssinatura: e.target.value }))} style={inpS} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
              <button onClick={() => salvar('ADITIVO')} disabled={salvando}
                style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: '#8b5cf6', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                {salvando ? 'Salvando…' : '💾 Registrar Aditivo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal medição */}
      {modal === 'medicao' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 480, maxWidth: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 800 }}>📏 Registrar Medição</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Nº Medição</label>
                <input type="number" value={form.numero ?? ''} onChange={e => setForm(f => ({ ...f, numero: Number(e.target.value) }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>Período (mês/ano)</label>
                <input type="month" value={form.periodo ?? ''} onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))} style={inpS} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Data Início</label>
                <input type="date" value={form.dataInicio ?? ''} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>Data Fim</label>
                <input type="date" value={form.dataFim ?? ''} onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))} style={inpS} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lblS}>Valor Medido (R$)</label>
              <input type="number" step="0.01" value={form.valorMedido ?? ''} onChange={e => setForm(f => ({ ...f, valorMedido: Number(e.target.value) }))} style={inpS} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={lblS}>Nota Fiscal</label>
              <input value={form.notaFiscal ?? ''} onChange={e => setForm(f => ({ ...f, notaFiscal: e.target.value }))} style={inpS} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
              <button onClick={() => salvar('MEDICAO')} disabled={salvando}
                style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: '#22c55e', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                {salvando ? 'Salvando…' : '💾 Registrar Medição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ContDetalhe({ icon, label, value }: { icon: string; label: string; value: string }) {
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

function BtnC({ cor, onClick, children }: { cor: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      style={{ background: cor, color: '#fff', border: 'none', borderRadius: 8, padding: '9px', fontWeight: 600, cursor: 'pointer', fontSize: 13, width: '100%' }}>
      {children}
    </button>
  )
}

const lblS: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }
const inpS: React.CSSProperties = { width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }
