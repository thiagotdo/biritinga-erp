'use client'
import { useState, useEffect, useCallback } from 'react'

// ─── Receitas Orçamentárias ───────────────────────────────────────────────────
// Lei 4.320/1964 — Normas de Direito Financeiro
// LC 101/2000 — Lei de Responsabilidade Fiscal
// MCASP — Manual de Contabilidade do Setor Público (STN/SOF)

interface Receita {
  id: string
  competencia: string
  mes: number
  exercicio: number
  codigoReceita: string
  natureza: string
  descricao: string
  fonte?: string
  unidadeGestora?: string
  previsto: number
  arrecadado: number
}

interface DashRec {
  kpis: { previsto: number; arrecadado: number; pct: string; superavit: number }
  porNatureza: Array<{ natureza: string; previsto: number; arrecadado: number }>
  evolucaoMensal: Array<{ mes: number; competencia: string; previsto: number; arrecadado: number }>
  topReceitas: Array<{ codigo: string; descricao: string; arrecadado: number }>
}

const NAT_LABEL: Record<string, string> = {
  TRIBUTARIA: 'Tributária', PATRIMONIAL: 'Patrimonial', AGROPECUARIA: 'Agropecuária',
  INDUSTRIAL: 'Industrial', SERVICOS: 'Serviços', TRANSFERENCIAS_CORRENTES: 'Transferências Correntes',
  OUTRAS_CORRENTES: 'Outras Correntes', OPERACOES_CREDITO: 'Operações de Crédito',
  ALIENACAO_BENS: 'Alienação de Bens', AMORTIZACAO_EMPRESTIMOS: 'Amortização de Empréstimos',
  TRANSFERENCIAS_CAPITAL: 'Transferências de Capital', OUTRAS_CAPITAL: 'Outras de Capital',
  INTRAORCAMENTARIAS: 'Intraorçamentárias',
}
const NAT_COR: Record<string, string> = {
  TRIBUTARIA: '#3b82f6', PATRIMONIAL: '#8b5cf6', TRANSFERENCIAS_CORRENTES: '#22c55e',
  OUTRAS_CORRENTES: '#f59e0b', OPERACOES_CREDITO: '#ef4444', ALIENACAO_BENS: '#06b6d4',
  TRANSFERENCIAS_CAPITAL: '#10b981', OUTRAS_CAPITAL: '#f97316', SERVICOS: '#6366f1',
  AGROPECUARIA: '#84cc16', INDUSTRIAL: '#a855f7', AMORTIZACAO_EMPRESTIMOS: '#ec4899',
  INTRAORCAMENTARIAS: '#94a3b8',
}
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const fmtMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtK = (v: number) => v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(0)}K` : fmtMoeda(v)

export default function ReceitasPage() {
  const anoAtual = new Date().getFullYear()
  const [dash, setDash]         = useState<DashRec | null>(null)
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState<Record<string, any>>({ exercicio: anoAtual })
  const [filtNat, setFiltNat]   = useState('')
  const [filtComp, setFiltComp] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg]           = useState('')

  const load = useCallback(async () => {
    const [rd, rr] = await Promise.all([
      fetch('/api/transparencia/receita?relatorio=DASHBOARD'),
      fetch('/api/transparencia/receita'),
    ])
    if (rd.ok) setDash(await rd.json())
    if (rr.ok) { const d = await rr.json(); setReceitas(d.receitas ?? []) }
  }, [])

  useEffect(() => { load() }, [load])

  const salvar = async () => {
    setSalvando(true)
    const [ano, mes] = (form.competencia ?? `${anoAtual}-01`).split('-').map(Number)
    const r = await fetch('/api/transparencia/receita', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, exercicio: ano, mes, previsto: Number(form.previsto ?? 0), arrecadado: Number(form.arrecadado ?? 0) }),
    })
    setSalvando(false)
    if (r.ok) { setMsg('Lançamento registrado!'); setModal(false); setForm({ exercicio: anoAtual }); load() }
    else { const d = await r.json(); setMsg(JSON.stringify(d.erro)) }
  }

  const recFilt = receitas.filter(r =>
    (!filtNat || r.natureza === filtNat) &&
    (!filtComp || r.competencia === filtComp)
  )

  const maxBar = dash ? Math.max(...(dash.evolucaoMensal.map(e => e.arrecadado)), 1) : 1

  return (
    <div style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>💹 Receitas Orçamentárias</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Lei 4.320/1964 · LC 101/2000 — Execução orçamentária de receitas</p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          + Lançar Receita
        </button>
      </div>

      {msg && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14, color: '#16a34a' }}>{msg}</div>}

      {dash && (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Receita Prevista', valor: fmtMoeda(dash.kpis.previsto), cor: '#8b5cf6', icon: '📊' },
              { label: 'Receita Arrecadada', valor: fmtMoeda(dash.kpis.arrecadado), cor: '#22c55e', icon: '💹' },
              { label: '% Execução', valor: `${dash.kpis.pct}%`, cor: '#3b82f6', icon: '🎯' },
              { label: dash.kpis.superavit >= 0 ? 'Superávit' : 'Déficit', valor: fmtMoeda(Math.abs(dash.kpis.superavit)), cor: dash.kpis.superavit >= 0 ? '#22c55e' : '#ef4444', icon: dash.kpis.superavit >= 0 ? '✅' : '⚠️' },
            ].map(k => (
              <div key={k.label} style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,.05)', borderLeft: `4px solid ${k.cor}` }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{k.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: k.cor }}>{k.valor}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{k.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            {/* Evolução mensal */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.05)', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Arrecadação Mensal {anoAtual}</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 110 }}>
                {MESES.map((m, i) => {
                  const r = dash.evolucaoMensal.find(x => x.mes === i + 1)
                  const hArc = r ? Math.max(4, (r.arrecadado / maxBar) * 90) : 4
                  const hPrev = r && r.previsto > 0 ? Math.max(2, (r.previsto / maxBar) * 90) : 0
                  return (
                    <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', gap: 1, alignItems: 'flex-end' }}>
                        {hPrev > 0 && <div style={{ width: 5, height: hPrev, background: '#e2e8f0', borderRadius: '2px 2px 0 0' }} />}
                        <div title={r ? fmtMoeda(r.arrecadado) : '—'} style={{ width: 5, height: hArc, background: '#22c55e', borderRadius: '2px 2px 0 0', opacity: r ? 1 : 0.2 }} />
                      </div>
                      <span style={{ fontSize: 9, color: '#94a3b8' }}>{m}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: '#64748b' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#e2e8f0', borderRadius: 2, display: 'inline-block' }} />Previsto</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#22c55e', borderRadius: 2, display: 'inline-block' }} />Arrecadado</span>
              </div>
            </div>

            {/* Top receitas */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.05)', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Top 10 Receitas</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dash.topReceitas.slice(0, 8).map((r, i) => {
                  const max = dash.topReceitas[0]?.arrecadado ?? 1
                  const pct = (r.arrecadado / max) * 100
                  return (
                    <div key={r.codigo}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#374151', marginBottom: 2 }}>
                        <span>{r.descricao.slice(0, 36)}</span>
                        <span style={{ fontWeight: 700 }}>{fmtK(r.arrecadado)}</span>
                      </div>
                      <div style={{ background: '#f1f5f9', borderRadius: 4, height: 6 }}>
                        <div style={{ background: '#22c55e', height: 6, borderRadius: 4, width: `${pct}%`, transition: 'width .4s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Filtros e tabela */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.05)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <select value={filtNat} onChange={e => setFiltNat(e.target.value)}
            style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14 }}>
            <option value="">Todas as naturezas</option>
            {Object.entries(NAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="month" value={filtComp} onChange={e => setFiltComp(e.target.value)}
            style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14 }} />
          {filtComp && <button onClick={() => setFiltComp('')} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}>Limpar</button>}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Código', 'Natureza', 'Descrição', 'Fonte', 'Competência', 'Previsto', 'Arrecadado', '% Exec'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recFilt.map((r, i) => {
                const pct = r.previsto > 0 ? ((r.arrecadado / r.previsto) * 100).toFixed(0) : '—'
                return (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={tdS}><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.codigoReceita}</span></td>
                    <td style={tdS}>
                      <span style={{ background: (NAT_COR[r.natureza] ?? '#94a3b8') + '20', color: NAT_COR[r.natureza] ?? '#475569', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                        {NAT_LABEL[r.natureza] ?? r.natureza}
                      </span>
                    </td>
                    <td style={tdS}>{r.descricao}</td>
                    <td style={tdS}>{r.fonte ?? '—'}</td>
                    <td style={tdS}>{r.competencia}</td>
                    <td style={{ ...tdS, fontFamily: 'monospace', textAlign: 'right' }}>{fmtMoeda(r.previsto)}</td>
                    <td style={{ ...tdS, fontFamily: 'monospace', textAlign: 'right', fontWeight: 700, color: '#22c55e' }}>{fmtMoeda(r.arrecadado)}</td>
                    <td style={tdS}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ background: '#f1f5f9', borderRadius: 4, height: 6, width: 60, flex: 'none' }}>
                          <div style={{ background: Number(pct) >= 100 ? '#22c55e' : Number(pct) >= 80 ? '#f59e0b' : '#ef4444', height: 6, borderRadius: 4, width: `${Math.min(100, Number(pct) || 0)}%` }} />
                        </div>
                        <span style={{ fontSize: 12 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {recFilt.length > 0 && (
              <tfoot>
                <tr style={{ background: '#f1f5f9', fontWeight: 700 }}>
                  <td colSpan={5} style={{ ...tdS, fontWeight: 700 }}>TOTAL ({recFilt.length} registros)</td>
                  <td style={{ ...tdS, fontFamily: 'monospace', textAlign: 'right' }}>{fmtMoeda(recFilt.reduce((s, r) => s + r.previsto, 0))}</td>
                  <td style={{ ...tdS, fontFamily: 'monospace', textAlign: 'right', color: '#22c55e' }}>{fmtMoeda(recFilt.reduce((s, r) => s + r.arrecadado, 0))}</td>
                  <td style={tdS} />
                </tr>
              </tfoot>
            )}
          </table>
          {recFilt.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 14 }}>Nenhum registro. Lance receitas ou importe do sistema financeiro.</div>}
        </div>
      </div>

      {/* Modal lançamento */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 560, maxWidth: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 800 }}>💹 Lançar Receita</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Competência *</label>
                <input type="month" value={form.competencia ?? ''} onChange={e => setForm(f => ({ ...f, competencia: e.target.value }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>Natureza *</label>
                <select value={form.natureza ?? 'TRIBUTARIA'} onChange={e => setForm(f => ({ ...f, natureza: e.target.value }))} style={inpS}>
                  {Object.entries(NAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Código *</label>
                <input value={form.codigoReceita ?? ''} onChange={e => setForm(f => ({ ...f, codigoReceita: e.target.value }))} style={inpS} placeholder="1.1.1.0.00" />
              </div>
              <div>
                <label style={lblS}>Descrição *</label>
                <input value={form.descricao ?? ''} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} style={inpS} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Fonte de Recursos</label>
                <input value={form.fonte ?? ''} onChange={e => setForm(f => ({ ...f, fonte: e.target.value }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>Unidade Gestora</label>
                <input value={form.unidadeGestora ?? ''} onChange={e => setForm(f => ({ ...f, unidadeGestora: e.target.value }))} style={inpS} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={lblS}>Valor Previsto (R$)</label>
                <input type="number" step="0.01" value={form.previsto ?? ''} onChange={e => setForm(f => ({ ...f, previsto: e.target.value }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>Valor Arrecadado (R$)</label>
                <input type="number" step="0.01" value={form.arrecadado ?? ''} onChange={e => setForm(f => ({ ...f, arrecadado: e.target.value }))} style={inpS} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando}
                style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: '#22c55e', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                {salvando ? 'Salvando…' : '💾 Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const tdS: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#374151', verticalAlign: 'middle' }
const lblS: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }
const inpS: React.CSSProperties = { width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }
