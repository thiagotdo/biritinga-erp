'use client'
import { useState, useEffect, useCallback } from 'react'

// ─── Holerites ────────────────────────────────────────────────────────────────
// INSS: Portaria MF — faixas progressivas · IRPF: Lei 11.482/2007 atualizada

const fmtMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

interface Comp { id: string; mes: number; ano: number; status: string }
interface Rubrica { id: string; codigo: string; nome: string; tipo: string; natureza: string }
interface Holerite {
  id: string; matricula: string; nomeServidor: string; cargo?: string; lotacao?: string
  regimeJuridico: string; totalProventos: number; totalDescontos: number; totalLiquido: number
  diasTrabalhados: number; diasFaltas: number; status: string
}
interface HoleriteDetalhe extends Holerite {
  baseInss: number; baseIrpf: number; baseFgts: number
  itens: Array<{ id: string; valor: number; tipo: string; referencia?: string; rubrica: { codigo: string; nome: string; tipo: string } }>
  competencia: { mes: number; ano: number; status: string }
}

const REG_COR: Record<string, string> = {
  ESTATUTARIO: '#1d4ed8', CLT: '#16a34a', COMISSIONADO: '#d97706', ESTAGIARIO: '#7c3aed',
}

export default function HoleritesPage() {
  const [comps, setComps]           = useState<Comp[]>([])
  const [compSel, setCompSel]       = useState('')
  const [holerites, setHols]        = useState<Holerite[]>([])
  const [rubricas, setRubricas]     = useState<Rubrica[]>([])
  const [detalhe, setDetalhe]       = useState<HoleriteDetalhe | null>(null)
  const [modal, setModal]           = useState(false)
  const [form, setForm]             = useState<Record<string, any>>({ regimeJuridico: 'ESTATUTARIO', diasTrabalhados: 30, diasFaltas: 0, numDependentes: 0, itens: [] })
  const [salvando, setSalv]         = useState(false)
  const [msg, setMsg]               = useState('')

  useEffect(() => {
    fetch('/api/folha/competencia').then(r => r.ok ? r.json() : { competencias: [] }).then(d => {
      setComps(d.competencias ?? [])
      if (d.competencias?.length > 0) setCompSel(d.competencias[0].id)
    })
    fetch('/api/folha/rubrica').then(r => r.ok ? r.json() : { rubricas: [] }).then(d => setRubricas(d.rubricas ?? []))
  }, [])

  const loadHols = useCallback(async () => {
    if (!compSel) return
    const r = await fetch(`/api/folha/holerite?competenciaId=${compSel}`)
    if (r.ok) { const d = await r.json(); setHols(d.holerites ?? []) }
  }, [compSel])
  useEffect(() => { loadHols() }, [loadHols])

  async function verDetalhe(id: string) {
    const r = await fetch(`/api/folha/holerite?id=${id}`)
    if (r.ok) { const d = await r.json(); setDetalhe(d.holerite) }
  }

  async function salvar() {
    setSalv(true)
    const payload = { ...form, competenciaId: compSel }
    const r = await fetch('/api/folha/holerite', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSalv(false)
    if (r.ok) { setMsg('✅ Holerite calculado!'); setModal(false); loadHols() }
    else { const d = await r.json(); setMsg('Erro: ' + JSON.stringify(d.erro)) }
  }

  async function estornar(id: string) {
    const r = await fetch('/api/folha/holerite', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, acao: 'ESTORNAR' }),
    })
    if (r.ok) { setDetalhe(null); loadHols() }
  }

  const addItem = () => setForm(f => ({ ...f, itens: [...(f.itens ?? []), { rubricaId: '', valor: 0, referencia: '' }] }))
  const updItem = (i: number, k: string, v: any) => setForm(f => {
    const itens = [...f.itens]
    itens[i] = { ...itens[i], [k]: v }
    return { ...f, itens }
  })
  const rmItem = (i: number) => setForm(f => ({ ...f, itens: f.itens.filter((_: any, j: number) => j !== i) }))

  const compAtual = comps.find(c => c.id === compSel)

  return (
    <div style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>💳 Holerites</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>INSS Portaria MF · IRPF Lei 11.482/2007</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={compSel} onChange={e => setCompSel(e.target.value)}
            style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', fontSize: 14, background: '#fff' }}>
            {comps.map(c => <option key={c.id} value={c.id}>{MESES[c.mes - 1]}/{c.ano} — {c.status}</option>)}
          </select>
          <button onClick={() => { setModal(true); setMsg(''); setForm({ regimeJuridico: 'ESTATUTARIO', diasTrabalhados: 30, diasFaltas: 0, numDependentes: 0, itens: [] }) }}
            disabled={!compSel || compAtual?.status === 'FECHADA'}
            style={{ background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14, opacity: compAtual?.status === 'FECHADA' ? 0.5 : 1 }}>
            + Novo Holerite
          </button>
        </div>
      </div>

      {msg && <div style={{ background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.startsWith('✅') ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14, color: msg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{msg}</div>}

      {/* Tabela de holerites */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Matrícula', 'Servidor', 'Regime', 'Dias Trab.', 'Proventos', 'Descontos', 'Líquido', ''].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holerites.map((h, i) => (
              <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9', background: h.status === 'ESTORNADO' ? '#fafafa' : i % 2 === 0 ? '#fff' : '#fafafa', opacity: h.status === 'ESTORNADO' ? 0.5 : 1 }}>
                <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: '#475569' }}>{h.matricula}</td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{h.nomeServidor}</div>
                  {h.cargo && <div style={{ fontSize: 11, color: '#94a3b8' }}>{h.cargo} {h.lotacao ? `· ${h.lotacao}` : ''}</div>}
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: (REG_COR[h.regimeJuridico] ?? '#94a3b8') + '20', color: REG_COR[h.regimeJuridico] ?? '#94a3b8' }}>
                    {h.regimeJuridico}
                  </span>
                </td>
                <td style={{ padding: '12px 14px', fontSize: 13, color: h.diasFaltas > 0 ? '#dc2626' : '#475569' }}>
                  {h.diasTrabalhados}{h.diasFaltas > 0 ? ` (${h.diasFaltas}F)` : ''}
                </td>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{fmtMoeda(h.totalProventos)}</td>
                <td style={{ padding: '12px 14px', fontSize: 13, color: '#dc2626' }}>{fmtMoeda(h.totalDescontos)}</td>
                <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 800, color: '#16a34a' }}>{fmtMoeda(h.totalLiquido)}</td>
                <td style={{ padding: '12px 14px' }}>
                  <button onClick={() => verDetalhe(h.id)}
                    style={{ fontSize: 11, padding: '4px 10px', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                    Ver
                  </button>
                </td>
              </tr>
            ))}
            {holerites.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Nenhum holerite nesta competência.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Painel de detalhe */}
      {detalhe && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}
          onClick={e => e.target === e.currentTarget && setDetalhe(null)}>
          <div style={{ background: '#fff', width: 500, maxWidth: '100%', height: '100%', overflowY: 'auto', boxShadow: '-4px 0 24px rgba(0,0,0,.12)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{detalhe.nomeServidor}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{detalhe.matricula} · {detalhe.cargo}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{MESES[(detalhe.competencia?.mes ?? 1) - 1]}/{detalhe.competencia?.ano}</div>
              </div>
              <button onClick={() => setDetalhe(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}>×</button>
            </div>

            <div style={{ padding: 24 }}>
              {/* Bases de cálculo */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { l: 'Base INSS', v: detalhe.baseInss, c: '#0369a1' },
                  { l: 'Base IRPF', v: detalhe.baseIrpf, c: '#854d0e' },
                  { l: 'Base FGTS', v: detalhe.baseFgts, c: '#6b21a8' },
                ].map(k => (
                  <div key={k.l} style={{ background: '#f8fafc', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: k.c }}>{fmtMoeda(k.v)}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{k.l}</div>
                  </div>
                ))}
              </div>

              {/* Itens */}
              <div>
                {(['PROVENTO', 'DESCONTO', 'INFORMATIVO'] as const).map(tipo => {
                  const itens = detalhe.itens.filter(i => i.tipo === tipo)
                  if (itens.length === 0) return null
                  const corTipo = tipo === 'PROVENTO' ? '#16a34a' : tipo === 'DESCONTO' ? '#dc2626' : '#6366f1'
                  const bgTipo  = tipo === 'PROVENTO' ? '#f0fdf4' : tipo === 'DESCONTO' ? '#fef2f2' : '#eef2ff'
                  return (
                    <div key={tipo} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: corTipo, background: bgTipo, padding: '4px 10px', borderRadius: 6, marginBottom: 8 }}>
                        {tipo === 'PROVENTO' ? '➕ PROVENTOS' : tipo === 'DESCONTO' ? '➖ DESCONTOS' : 'ℹ️ INFORMATIVOS'}
                      </div>
                      {itens.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
                          <div>
                            <span style={{ fontSize: 13, color: '#374151' }}>{item.rubrica.nome}</span>
                            {item.referencia && <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>{item.referencia}</span>}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: corTipo }}>{fmtMoeda(item.valor)}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: `2px solid ${corTipo}20` }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: corTipo }}>TOTAL {tipo}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: corTipo }}>{fmtMoeda(itens.reduce((s, i) => s + i.valor, 0))}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Resumo final */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#374151' }}>Total Bruto</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{fmtMoeda(detalhe.totalProventos)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#dc2626' }}>Total Descontos</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>- {fmtMoeda(detalhe.totalDescontos)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '2px solid #e2e8f0' }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#16a34a' }}>LÍQUIDO</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>{fmtMoeda(detalhe.totalLiquido)}</span>
                </div>
              </div>

              {detalhe.status !== 'ESTORNADO' && detalhe.competencia?.status !== 'FECHADA' && (
                <button onClick={() => estornar(detalhe.id)}
                  style={{ marginTop: 16, width: '100%', padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                  Estornar Holerite
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal novo holerite */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 620, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 800 }}>💳 Novo Holerite</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div><label style={lblS}>Matrícula *</label><input value={form.matricula ?? ''} onChange={e => setForm(f => ({ ...f, matricula: e.target.value }))} style={inpS} /></div>
              <div><label style={lblS}>ID Servidor *</label><input value={form.servidorId ?? ''} onChange={e => setForm(f => ({ ...f, servidorId: e.target.value }))} style={inpS} placeholder="ID do servidor no módulo RH" /></div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lblS}>Nome do Servidor *</label>
              <input value={form.nomeServidor ?? ''} onChange={e => setForm(f => ({ ...f, nomeServidor: e.target.value }))} style={inpS} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div><label style={lblS}>Cargo</label><input value={form.cargo ?? ''} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} style={inpS} /></div>
              <div><label style={lblS}>Lotação (Secretaria)</label><input value={form.lotacao ?? ''} onChange={e => setForm(f => ({ ...f, lotacao: e.target.value }))} style={inpS} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={lblS}>Regime</label>
                <select value={form.regimeJuridico} onChange={e => setForm(f => ({ ...f, regimeJuridico: e.target.value }))} style={inpS}>
                  <option value="ESTATUTARIO">Estatutário</option>
                  <option value="CLT">CLT</option>
                  <option value="COMISSIONADO">Comissionado</option>
                  <option value="ESTAGIARIO">Estagiário</option>
                </select>
              </div>
              <div><label style={lblS}>Dias Trab.</label><input type="number" value={form.diasTrabalhados} onChange={e => setForm(f => ({ ...f, diasTrabalhados: +e.target.value }))} style={inpS} /></div>
              <div><label style={lblS}>Faltas</label><input type="number" value={form.diasFaltas} onChange={e => setForm(f => ({ ...f, diasFaltas: +e.target.value }))} style={inpS} /></div>
              <div><label style={lblS}>Dependentes</label><input type="number" value={form.numDependentes} onChange={e => setForm(f => ({ ...f, numDependentes: +e.target.value }))} style={inpS} /></div>
            </div>

            {/* Itens / rubricas */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Rubricas *</label>
                <button onClick={addItem} style={{ fontSize: 12, padding: '4px 10px', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>+ Adicionar rubrica</button>
              </div>
              {form.itens.map((item: any, i: number) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                  <div>
                    <select value={item.rubricaId} onChange={e => updItem(i, 'rubricaId', e.target.value)} style={inpS}>
                      <option value="">Selecionar rubrica…</option>
                      {rubricas.filter(r => r.natureza !== 'AUTOMATICO').map(r => (
                        <option key={r.id} value={r.id}>[{r.codigo}] {r.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input type="number" step="0.01" value={item.valor} onChange={e => updItem(i, 'valor', +e.target.value)} placeholder="Valor" style={inpS} />
                  </div>
                  <div>
                    <input value={item.referencia ?? ''} onChange={e => updItem(i, 'referencia', e.target.value)} placeholder="Ref." style={inpS} />
                  </div>
                  <button onClick={() => rmItem(i)} style={{ background: '#fef2f2', border: 'none', borderRadius: 6, padding: '8px 10px', cursor: 'pointer', color: '#dc2626', fontWeight: 700 }}>✕</button>
                </div>
              ))}
              {form.itens.length === 0 && <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: 10 }}>Nenhuma rubrica adicionada. INSS e IRPF são calculados automaticamente.</p>}
            </div>

            {msg && <div style={{ background: '#fef2f2', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>{msg}</div>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando}
                style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: '#1e293b', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                {salvando ? 'Calculando…' : '💳 Calcular Holerite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const lblS: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }
const inpS: React.CSSProperties = { width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }
