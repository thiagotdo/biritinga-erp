'use client'
import { useState, useEffect, useCallback } from 'react'

// ─── Despesas Orçamentárias ───────────────────────────────────────────────────
// Lei 4.320/1964 - estágios: empenho → liquidação → pagamento
// LC 101/2000 LRF - controle de gastos com pessoal
// Portaria SOF 42/1999 - classificação funcional programática

interface Despesa {
  id: string
  competencia: string
  mes: number
  exercicio: number
  orgao: string
  unidade?: string
  funcao?: string
  natureza: string
  elementoDespesa?: string
  descricao: string
  fonte?: string
  orcado: number
  empenhado: number
  liquidado: number
  pago: number
  credorNome?: string
  credorCPFCNPJ?: string
  numeroEmpenho?: string
}

interface DashDesp {
  kpis: { orcado: number; empenhado: number; liquidado: number; pago: number; pctExec: string }
  porNatureza: Array<{ natureza: string; orcado: number; pago: number }>
  porOrgao: Array<{ orgao: string; pago: number }>
  evolucao: Array<{ mes: number; competencia: string; empenhado: number; pago: number }>
  topCredores: Array<{ nome: string; cpfCnpj?: string; pago: number }>
}

const NAT_LABEL: Record<string, string> = {
  PESSOAL_ENCARGOS: 'Pessoal e Encargos',
  JUROS_ENCARGOS_DIVIDA: 'Juros e Encargos da Dívida',
  OUTRAS_DESPESAS_CORRENTES: 'Outras Despesas Correntes',
  INVESTIMENTOS: 'Investimentos',
  INVERSOES_FINANCEIRAS: 'Inversões Financeiras',
  AMORTIZACAO_DIVIDA: 'Amortização da Dívida',
}
const NAT_COR: Record<string, string> = {
  PESSOAL_ENCARGOS: '#3b82f6', JUROS_ENCARGOS_DIVIDA: '#ef4444',
  OUTRAS_DESPESAS_CORRENTES: '#f59e0b', INVESTIMENTOS: '#22c55e',
  INVERSOES_FINANCEIRAS: '#8b5cf6', AMORTIZACAO_DIVIDA: '#06b6d4',
}
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const fmtMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtK = (v: number) => v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(0)}K` : fmtMoeda(v)

export default function DespesasPage() {
  const anoAtual = new Date().getFullYear()
  const [dash, setDash]         = useState<DashDesp | null>(null)
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState<Record<string, any>>({ exercicio: anoAtual })
  const [filtNat, setFiltNat]   = useState('')
  const [filtOrgao, setFiltOrgao] = useState('')
  const [filtComp, setFiltComp]   = useState('')
  const [salvando, setSalvando]   = useState(false)
  const [msg, setMsg]             = useState('')

  const load = useCallback(async () => {
    const [rd, rr] = await Promise.all([
      fetch('/api/transparencia/despesa?relatorio=DASHBOARD'),
      fetch('/api/transparencia/despesa'),
    ])
    if (rd.ok) setDash(await rd.json())
    if (rr.ok) { const d = await rr.json(); setDespesas(d.despesas ?? []) }
  }, [])

  useEffect(() => { load() }, [load])

  const salvar = async () => {
    setSalvando(true)
    const [ano, mes] = (form.competencia ?? `${anoAtual}-01`).split('-').map(Number)
    const r = await fetch('/api/transparencia/despesa', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form, exercicio: ano, mes,
        orcado: Number(form.orcado ?? 0), empenhado: Number(form.empenhado ?? 0),
        liquidado: Number(form.liquidado ?? 0), pago: Number(form.pago ?? 0),
      }),
    })
    setSalvando(false)
    if (r.ok) { setMsg('Despesa registrada!'); setModal(false); setForm({ exercicio: anoAtual }); load() }
    else { const d = await r.json(); setMsg(JSON.stringify(d.erro)) }
  }

  const despFilt = despesas.filter(d =>
    (!filtNat || d.natureza === filtNat) &&
    (!filtOrgao || d.orgao.toLowerCase().includes(filtOrgao.toLowerCase())) &&
    (!filtComp || d.competencia === filtComp)
  )

  const maxBar = dash ? Math.max(...dash.evolucao.map(e => e.pago), 1) : 1

  return (
    <div style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>💸 Despesas Orçamentárias</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Lei 4.320/1964 - Empenho · Liquidação · Pagamento</p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          + Lançar Despesa
        </button>
      </div>

      {msg && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14, color: '#16a34a' }}>{msg}</div>}

      {dash && (
        <>
          {/* KPIs - estágios */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Orçado', valor: fmtMoeda(dash.kpis.orcado), cor: '#8b5cf6', icon: '📋' },
              { label: 'Empenhado', valor: fmtMoeda(dash.kpis.empenhado), cor: '#f59e0b', icon: '📝' },
              { label: 'Liquidado', valor: fmtMoeda(dash.kpis.liquidado), cor: '#3b82f6', icon: '✅' },
              { label: 'Pago', valor: fmtMoeda(dash.kpis.pago), cor: '#ef4444', icon: '💸' },
              { label: '% Executado', valor: `${dash.kpis.pctExec}%`, cor: '#1d4ed8', icon: '🎯' },
            ].map(k => (
              <div key={k.label} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,.05)', borderLeft: `4px solid ${k.cor}` }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{k.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: k.cor }}>{k.valor}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{k.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 24 }}>
            {/* Evolução paga */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.05)', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Pagamentos Mensais {anoAtual}</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
                {MESES.map((m, i) => {
                  const e = dash.evolucao.find(x => x.mes === i + 1)
                  const h = e ? Math.max(4, (e.pago / maxBar) * 70) : 4
                  return (
                    <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <div title={e ? fmtMoeda(e.pago) : '—'} style={{ width: '100%', height: h, background: '#ef4444', borderRadius: '2px 2px 0 0', opacity: e ? 1 : 0.2 }} />
                      <span style={{ fontSize: 8, color: '#94a3b8' }}>{m}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Por natureza */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.05)', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Por Natureza</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dash.porNatureza.slice(0, 5).map(n => {
                  const pct = n.orcado > 0 ? (n.pago / n.orcado) * 100 : 0
                  return (
                    <div key={n.natureza}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                        <span style={{ color: '#374151' }}>{NAT_LABEL[n.natureza]?.slice(0, 24) ?? n.natureza}</span>
                        <span style={{ fontWeight: 700, color: NAT_COR[n.natureza] ?? '#475569' }}>{fmtK(n.pago)}</span>
                      </div>
                      <div style={{ background: '#f1f5f9', borderRadius: 4, height: 5 }}>
                        <div style={{ background: NAT_COR[n.natureza] ?? '#94a3b8', height: 5, borderRadius: 4, width: `${Math.min(100, pct)}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top credores */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.05)', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Top 5 Credores</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {dash.topCredores.slice(0, 5).map((c, i) => (
                  <div key={c.nome ?? i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{(c.nome ?? 'Sem credor').slice(0, 28)}</div>
                      {c.cpfCnpj && <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{c.cpfCnpj}</div>}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', flex: 'none' }}>{fmtK(c.pago)}</span>
                  </div>
                ))}
                {dash.topCredores.length === 0 && <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Sem dados de credor.</p>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tabela */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.05)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <select value={filtNat} onChange={e => setFiltNat(e.target.value)}
            style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
            <option value="">Todas as naturezas</option>
            {Object.entries(NAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input value={filtOrgao} onChange={e => setFiltOrgao(e.target.value)} placeholder="Filtrar por órgão…"
            style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, minWidth: 160 }} />
          <input type="month" value={filtComp} onChange={e => setFiltComp(e.target.value)}
            style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13 }} />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Órgão', 'Natureza', 'Descrição', 'Credor', 'Comp.', 'Orçado', 'Empenhado', 'Pago', '% Exec'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {despFilt.map((d, i) => {
                const pct = d.orcado > 0 ? ((d.pago / d.orcado) * 100).toFixed(0) : '—'
                return (
                  <tr key={d.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={tdS}><span style={{ fontSize: 12 }}>{d.orgao}</span></td>
                    <td style={tdS}>
                      <span style={{ background: (NAT_COR[d.natureza] ?? '#94a3b8') + '20', color: NAT_COR[d.natureza] ?? '#475569', padding: '2px 7px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                        {NAT_LABEL[d.natureza] ?? d.natureza}
                      </span>
                    </td>
                    <td style={tdS}>{d.descricao}</td>
                    <td style={tdS}><span style={{ fontSize: 12 }}>{d.credorNome ?? '—'}</span></td>
                    <td style={tdS}>{d.competencia}</td>
                    <td style={{ ...tdS, fontFamily: 'monospace', textAlign: 'right', fontSize: 12 }}>{fmtK(d.orcado)}</td>
                    <td style={{ ...tdS, fontFamily: 'monospace', textAlign: 'right', fontSize: 12, color: '#f59e0b' }}>{fmtK(d.empenhado)}</td>
                    <td style={{ ...tdS, fontFamily: 'monospace', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#ef4444' }}>{fmtK(d.pago)}</td>
                    <td style={tdS}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ background: '#f1f5f9', borderRadius: 4, height: 5, width: 50 }}>
                          <div style={{ background: Number(pct) >= 80 ? '#ef4444' : Number(pct) >= 50 ? '#f59e0b' : '#22c55e', height: 5, borderRadius: 4, width: `${Math.min(100, Number(pct) || 0)}%` }} />
                        </div>
                        <span style={{ fontSize: 11 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {despFilt.length > 0 && (
              <tfoot>
                <tr style={{ background: '#f1f5f9', fontWeight: 700 }}>
                  <td colSpan={5} style={{ ...tdS, fontWeight: 700 }}>TOTAL ({despFilt.length} registros)</td>
                  <td style={{ ...tdS, fontFamily: 'monospace', textAlign: 'right' }}>{fmtK(despFilt.reduce((s, d) => s + d.orcado, 0))}</td>
                  <td style={{ ...tdS, fontFamily: 'monospace', textAlign: 'right', color: '#f59e0b' }}>{fmtK(despFilt.reduce((s, d) => s + d.empenhado, 0))}</td>
                  <td style={{ ...tdS, fontFamily: 'monospace', textAlign: 'right', color: '#ef4444', fontWeight: 800 }}>{fmtK(despFilt.reduce((s, d) => s + d.pago, 0))}</td>
                  <td style={tdS} />
                </tr>
              </tfoot>
            )}
          </table>
          {despFilt.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 14 }}>Nenhuma despesa registrada.</div>}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 640, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 800 }}>💸 Lançar Despesa</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Competência *</label>
                <input type="month" value={form.competencia ?? ''} onChange={e => setForm(f => ({ ...f, competencia: e.target.value }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>Natureza *</label>
                <select value={form.natureza ?? 'OUTRAS_DESPESAS_CORRENTES'} onChange={e => setForm(f => ({ ...f, natureza: e.target.value }))} style={inpS}>
                  {Object.entries(NAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Órgão *</label>
                <input value={form.orgao ?? ''} onChange={e => setForm(f => ({ ...f, orgao: e.target.value }))} style={inpS} placeholder="ex: 02 - Sec. de Educação" />
              </div>
              <div>
                <label style={lblS}>Elemento de Despesa</label>
                <input value={form.elementoDespesa ?? ''} onChange={e => setForm(f => ({ ...f, elementoDespesa: e.target.value }))} style={inpS} placeholder="3390.39" />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lblS}>Descrição *</label>
              <input value={form.descricao ?? ''} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} style={inpS} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Credor (Nome)</label>
                <input value={form.credorNome ?? ''} onChange={e => setForm(f => ({ ...f, credorNome: e.target.value }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>CPF/CNPJ do Credor</label>
                <input value={form.credorCPFCNPJ ?? ''} onChange={e => setForm(f => ({ ...f, credorCPFCNPJ: e.target.value }))} style={inpS} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              {['orcado', 'empenhado', 'liquidado', 'pago'].map(campo => (
                <div key={campo}>
                  <label style={lblS}>{campo.charAt(0).toUpperCase() + campo.slice(1)} (R$)</label>
                  <input type="number" step="0.01" value={form[campo] ?? ''} onChange={e => setForm(f => ({ ...f, [campo]: e.target.value }))} style={inpS} placeholder="0.00" />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={lblS}>Nº do Empenho</label>
                <input value={form.numeroEmpenho ?? ''} onChange={e => setForm(f => ({ ...f, numeroEmpenho: e.target.value }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>Documento Fiscal</label>
                <input value={form.documentoFiscal ?? ''} onChange={e => setForm(f => ({ ...f, documentoFiscal: e.target.value }))} style={inpS} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando}
                style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
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
