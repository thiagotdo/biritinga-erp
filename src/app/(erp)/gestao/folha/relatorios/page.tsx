'use client'
import { useState, useEffect } from 'react'

// ─── Relatórios de Folha ──────────────────────────────────────────────────────
// LC 101/2000 Art. 19 - Limite 60% RCL · Art. 55 RGF
// Alerta prudencial: 51,3% · Limite: 54%

const fmtMoeda  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtPct    = (v: number) => v.toFixed(2).replace('.', ',') + '%'
const MESES     = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

interface HistoricoPonto { mes: number; ano: number; totalBruto: number; totalLiquido: number; totalServidores: number; status: string }
interface DashData { historico: HistoricoPonto[]; totalAno: { bruto: number; liquido: number; descontos: number }; ano: number }

export default function RelatoriosFolhaPage() {
  const [aba, setAba]       = useState<'dashboard' | 'lotacao' | 'lrf' | 'rubricas'>('dashboard')
  const [dash, setDash]     = useState<DashData | null>(null)
  const [lotacao, setLot]   = useState<any>(null)
  const [lrf, setLrf]       = useState<any>(null)
  const [rubRel, setRubRel] = useState<any>(null)
  const [rcl, setRcl]       = useState('')
  const [anoSel, setAno]    = useState(new Date().getFullYear())
  const [mesSel, setMes]    = useState(new Date().getMonth() + 1)
  const [carregando, setCar] = useState(false)

  async function carregar() {
    setCar(true)
    if (aba === 'dashboard') {
      const r = await fetch(`/api/folha/relatorio?tipo=DASHBOARD&ano=${anoSel}`)
      if (r.ok) setDash(await r.json())
    } else if (aba === 'lotacao') {
      const r = await fetch(`/api/folha/relatorio?tipo=POR_LOTACAO&ano=${anoSel}&mes=${mesSel}`)
      if (r.ok) setLot(await r.json())
    } else if (aba === 'lrf') {
      const r = await fetch(`/api/folha/relatorio?tipo=LRF&ano=${anoSel}&rcl=${rcl || 0}`)
      if (r.ok) setLrf(await r.json())
    } else if (aba === 'rubricas') {
      const r = await fetch(`/api/folha/relatorio?tipo=RUBRICAS&ano=${anoSel}&mes=${mesSel}`)
      if (r.ok) setRubRel(await r.json())
    }
    setCar(false)
  }

  useEffect(() => { carregar() }, [aba, anoSel, mesSel]) // eslint-disable-line

  const abas = [
    { k: 'dashboard', l: '📊 Painel Anual'   },
    { k: 'lotacao',   l: '🏢 Por Secretaria' },
    { k: 'lrf',       l: '⚖️ LRF - Pessoal'  },
    { k: 'rubricas',  l: '💼 Por Rubrica'    },
  ] as const

  const maxBruto = Math.max(...(dash?.historico?.map(h => h.totalBruto) ?? [1]))

  return (
    <div style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>📈 Relatórios - Folha de Pagamento</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>LC 101/2000 Art. 19 e Art. 55 - RGF Demonstrativo de Pessoal</p>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f8fafc', borderRadius: 12, padding: 4 }}>
        {abas.map(a => (
          <button key={a.k} onClick={() => setAba(a.k)}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', background: aba === a.k ? '#fff' : 'transparent', color: aba === a.k ? '#1e293b' : '#64748b', fontWeight: aba === a.k ? 700 : 400, cursor: 'pointer', fontSize: 13, boxShadow: aba === a.k ? '0 1px 4px rgba(0,0,0,.08)' : 'none', transition: 'all .12s' }}>
            {a.l}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Ano:</label>
          <input type="number" value={anoSel} onChange={e => setAno(+e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 13, width: 90 }} />
        </div>
        {(aba === 'lotacao' || aba === 'rubricas') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Mês:</label>
            <select value={mesSel} onChange={e => setMes(+e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 13, background: '#fff' }}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
        )}
        {aba === 'lrf' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>RCL do exercício (R$):</label>
            <input type="number" value={rcl} onChange={e => setRcl(e.target.value)} placeholder="Ex: 10000000" style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 13, width: 180 }} />
            <button onClick={carregar} style={{ background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>Calcular</button>
          </div>
        )}
      </div>

      {carregando ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 36, height: 36, border: '4px solid #bfdbfe', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <>
          {/* ── Dashboard anual ─────────────────────────────────────────────── */}
          {aba === 'dashboard' && dash && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { l: 'Total Bruto Anual', v: dash.totalAno.bruto, c: '#1e293b' },
                  { l: 'Total Descontos',   v: dash.totalAno.descontos, c: '#dc2626' },
                  { l: 'Total Líquido',     v: dash.totalAno.liquido, c: '#16a34a' },
                ].map(k => (
                  <div key={k.l} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 6px rgba(0,0,0,.04)', borderLeft: `4px solid ${k.c}`, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: k.c }}>{fmtMoeda(k.v)}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{k.l} - {anoSel}</div>
                  </div>
                ))}
              </div>

              {/* Gráfico de barras mensal */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24 }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Folha Bruta por Mês</h3>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 160 }}>
                  {dash.historico.map(h => {
                    const pct = maxBruto > 0 ? (h.totalBruto / maxBruto) * 100 : 0
                    return (
                      <div key={`${h.mes}-${h.ano}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>{fmtMoeda(h.totalBruto).replace('R$ ', '')}</div>
                        <div style={{ width: '100%', height: `${Math.max(pct, 4)}%`, background: h.ano === anoSel ? '#1e293b' : '#94a3b8', borderRadius: '4px 4px 0 0', transition: 'height .3s', minHeight: 4 }} />
                        <div style={{ fontSize: 10, color: '#64748b' }}>{MESES[h.mes - 1]}</div>
                      </div>
                    )
                  })}
                  {dash.historico.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', flex: 1 }}>Sem dados</div>}
                </div>
              </div>
            </div>
          )}

          {/* ── Por lotação ─────────────────────────────────────────────────── */}
          {aba === 'lotacao' && lotacao && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                Folha por Secretaria - {MESES[mesSel - 1]}/{anoSel}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Secretaria / Lotação', 'Servidores', 'Total Bruto', 'Total Líquido', '% do Total'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lotacao.porLotacao.map((l: any, i: number) => {
                    const totalGeral = lotacao.porLotacao.reduce((s: number, x: any) => s + x.totalBruto, 0)
                    const pct = totalGeral > 0 ? (l.totalBruto / totalGeral) * 100 : 0
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{l.lotacao}</td>
                        <td style={{ padding: '12px 16px', fontSize: 14 }}>{l.servidores}</td>
                        <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>{fmtMoeda(l.totalBruto)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 14, color: '#16a34a', fontWeight: 600 }}>{fmtMoeda(l.totalLiquido)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 4, height: 6 }}>
                              <div style={{ width: `${pct}%`, background: '#1e293b', borderRadius: 4, height: '100%' }} />
                            </div>
                            <span style={{ fontSize: 12, color: '#64748b', width: 40, textAlign: 'right' }}>{fmtPct(pct)}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── LRF ─────────────────────────────────────────────────────────── */}
          {aba === 'lrf' && lrf && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Alerta LRF */}
              {lrf.alertaLRF === 'LIMITE_EXCEDIDO' && (
                <div style={{ background: '#fef2f2', border: '2px solid #ef4444', borderRadius: 12, padding: '14px 18px', color: '#dc2626', fontWeight: 700, fontSize: 14 }}>
                  🚨 LIMITE EXCEDIDO - Despesa com pessoal acima de 54% da RCL! LC 101/2000 Art. 23 - redução obrigatória em 2 quadrimestres.
                </div>
              )}
              {lrf.alertaLRF === 'ALERTA_PRUDENCIAL' && (
                <div style={{ background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: 12, padding: '14px 18px', color: '#d97706', fontWeight: 700, fontSize: 14 }}>
                  ⚠️ ALERTA PRUDENCIAL - Acima de 51,3% da RCL. LC 101/2000 Art. 22 - vedação de novas contratações.
                </div>
              )}
              {lrf.alertaLRF === null && lrf.percentualRCL !== null && (
                <div style={{ background: '#f0fdf4', border: '2px solid #22c55e', borderRadius: 12, padding: '14px 18px', color: '#16a34a', fontWeight: 700, fontSize: 14 }}>
                  ✅ Dentro do limite - {fmtPct(lrf.percentualRCL)} da RCL (limite: 54%)
                </div>
              )}

              {/* Medidor */}
              {lrf.percentualRCL !== null && (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Despesa c/ Pessoal - % da RCL</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: lrf.percentualRCL > 54 ? '#dc2626' : lrf.percentualRCL > 51.3 ? '#d97706' : '#16a34a' }}>
                      {fmtPct(lrf.percentualRCL)}
                    </span>
                  </div>
                  <div style={{ position: 'relative', background: '#f1f5f9', borderRadius: 8, height: 20, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(lrf.percentualRCL, 100)}%`, height: '100%', background: lrf.percentualRCL > 54 ? '#ef4444' : lrf.percentualRCL > 51.3 ? '#f59e0b' : '#22c55e', borderRadius: 8, transition: 'width .5s' }} />
                    {/* Marcadores */}
                    {[{ pct: 51.3, label: '51,3%', cor: '#d97706' }, { pct: 54, label: '54%', cor: '#ef4444' }, { pct: 60, label: '60% (limite legal)', cor: '#dc2626' }].map(m => (
                      <div key={m.pct} style={{ position: 'absolute', left: `${m.pct}%`, top: 0, bottom: 0, width: 2, background: m.cor, opacity: .7 }}>
                        <span style={{ position: 'absolute', top: -18, left: 2, fontSize: 10, color: m.cor, fontWeight: 700, whiteSpace: 'nowrap' }}>{m.label}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                    <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Total despesa pessoal {anoSel}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{fmtMoeda(lrf.totalAnual)}</div>
                    </div>
                    <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 12, color: '#64748b' }}>RCL informada</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{fmtMoeda(lrf.rcl)}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 12 }}>Referência: {lrf.referencia}</p>
                </div>
              )}

              {/* Tabela mensal */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#f8fafc' }}>
                    {['Mês', 'Total Bruto', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {lrf.meses.map((m: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 600 }}>{MESES[m.mes - 1]}/{anoSel}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 700 }}>{fmtMoeda(m.totalBruto)}</td>
                        <td style={{ padding: '10px 16px', fontSize: 11, color: m.status === 'FECHADA' ? '#16a34a' : '#3b82f6', fontWeight: 700 }}>{m.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Por rubrica ─────────────────────────────────────────────────── */}
          {aba === 'rubricas' && rubRel && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                Totais por Rubrica - {MESES[mesSel - 1]}/{anoSel}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#f8fafc' }}>
                  {['Código', 'Rubrica', 'Tipo', 'Ocorrências', 'Total'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {rubRel.porRubrica.map((r: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12, color: '#475569' }}>{r.codigo}</td>
                      <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 600 }}>{r.nome}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: r.tipo === 'PROVENTO' ? '#f0fdf4' : r.tipo === 'DESCONTO' ? '#fef2f2' : '#eef2ff', color: r.tipo === 'PROVENTO' ? '#16a34a' : r.tipo === 'DESCONTO' ? '#dc2626' : '#6366f1' }}>
                          {r.tipo}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: '#64748b' }}>{r.ocorrencias}</td>
                      <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 700, color: r.tipo === 'PROVENTO' ? '#16a34a' : r.tipo === 'DESCONTO' ? '#dc2626' : '#6366f1' }}>
                        {fmtMoeda(r.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
