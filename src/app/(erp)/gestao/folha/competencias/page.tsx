'use client'
import { useState, useEffect, useCallback } from 'react'

// ─── Competências de Folha ────────────────────────────────────────────────────
// LC 101/2000 Art. 19 — Limite gasto pessoal 60% RCL · municípios

const fmtMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const STATUS_INFO: Record<string, { label: string; cor: string; bg: string }> = {
  ABERTA:      { label: 'Aberta',      cor: '#3b82f6', bg: '#eff6ff' },
  EM_CALCULO:  { label: 'Em Cálculo',  cor: '#f59e0b', bg: '#fffbeb' },
  CALCULADA:   { label: 'Calculada',   cor: '#8b5cf6', bg: '#f5f3ff' },
  FECHADA:     { label: 'Fechada',     cor: '#16a34a', bg: '#f0fdf4' },
  CANCELADA:   { label: 'Cancelada',   cor: '#dc2626', bg: '#fef2f2' },
}

interface Comp {
  id: string; mes: number; ano: number; status: string
  totalBruto: number; totalLiquido: number; totalDescontos: number
  totalServidores: number; criadoEm: string; fechadaEm?: string
}

export default function CompetenciasPage() {
  const [competencias, setComps] = useState<Comp[]>([])
  const [modal, setModal]        = useState(false)
  const [form, setForm]          = useState({ mes: new Date().getMonth() + 1, ano: new Date().getFullYear(), observacao: '' })
  const [salvando, setSalv]      = useState(false)
  const [msg, setMsg]            = useState('')
  const [acao, setAcao]          = useState<{ id: string; acao: string } | null>(null)

  const load = useCallback(async () => {
    const r = await fetch('/api/folha/competencia')
    if (r.ok) { const d = await r.json(); setComps(d.competencias ?? []) }
  }, [])
  useEffect(() => { load() }, [load])

  async function criar() {
    setSalv(true)
    const r = await fetch('/api/folha/competencia', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, acao: 'CRIAR' }),
    })
    setSalv(false)
    if (r.ok) { setMsg('✅ Competência criada!'); setModal(false); load() }
    else { const d = await r.json(); setMsg('Erro: ' + (d.erro?.message ?? JSON.stringify(d.erro))) }
  }

  async function executarAcao(id: string, a: string) {
    setSalv(true)
    const r = await fetch('/api/folha/competencia', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, acao: a, mes: 0, ano: 0 }),
    })
    setSalv(false)
    setAcao(null)
    if (r.ok) { setMsg(`✅ Ação ${a} executada!`); load() }
    else { const d = await r.json(); setMsg('Erro: ' + (d.erro?.message ?? JSON.stringify(d.erro))) }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>📅 Competências de Folha</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>LC 101/2000 Art. 19 — Limite 60% RCL</p>
        </div>
        <button onClick={() => { setModal(true); setMsg('') }}
          style={{ background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          + Nova Competência
        </button>
      </div>

      {msg && (
        <div style={{ background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.startsWith('✅') ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14, color: msg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>
          {msg}
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Competência', 'Status', 'Servidores', 'Total Bruto', 'Descontos', 'Líquido', 'Ações'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {competencias.map((c, i) => {
              const si = STATUS_INFO[c.status] ?? STATUS_INFO.ABERTA
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>{MESES[c.mes - 1]}/{c.ano}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: si.bg, color: si.cor }}>
                      {si.label}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 14, color: '#1e293b', fontWeight: 700 }}>{c.totalServidores}</td>
                  <td style={{ padding: '14px 16px', fontSize: 14, color: '#1e293b', fontWeight: 700 }}>{fmtMoeda(c.totalBruto)}</td>
                  <td style={{ padding: '14px 16px', fontSize: 14, color: '#dc2626' }}>{fmtMoeda(c.totalDescontos)}</td>
                  <td style={{ padding: '14px 16px', fontSize: 14, color: '#16a34a', fontWeight: 700 }}>{fmtMoeda(c.totalLiquido)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {c.status === 'CALCULADA' && (
                        <button onClick={() => setAcao({ id: c.id, acao: 'FECHAR' })}
                          style={{ fontSize: 11, padding: '4px 10px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                          Fechar
                        </button>
                      )}
                      {c.status === 'ABERTA' && (
                        <button onClick={() => executarAcao(c.id, 'CALCULAR')}
                          style={{ fontSize: 11, padding: '4px 10px', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                          Calcular Totais
                        </button>
                      )}
                      {c.status === 'FECHADA' && (
                        <button onClick={() => setAcao({ id: c.id, acao: 'REABRIR' })}
                          style={{ fontSize: 11, padding: '4px 10px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                          Reabrir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {competencias.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Nenhuma competência cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal nova competência */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 800 }}>📅 Nova Competência</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={lblS}>Mês *</label>
                <select value={form.mes} onChange={e => setForm(f => ({ ...f, mes: +e.target.value }))} style={inpS}>
                  {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={lblS}>Ano *</label>
                <input type="number" value={form.ano} onChange={e => setForm(f => ({ ...f, ano: +e.target.value }))} style={inpS} />
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={lblS}>Observação</label>
              <input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} style={inpS} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={criar} disabled={salvando}
                style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: '#1e293b', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                {salvando ? 'Criando…' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmação de ação */}
      {acao && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 380 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 800 }}>Confirmar ação</h2>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
              Deseja <strong>{acao.acao.toLowerCase()}</strong> esta competência?
              {acao.acao === 'FECHAR' && <span style={{ display: 'block', color: '#dc2626', marginTop: 8, fontSize: 13 }}>⚠️ Folha fechada não aceita novos holerites.</span>}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setAcao(null)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => executarAcao(acao.id, acao.acao)} disabled={salvando}
                style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: acao.acao === 'FECHAR' ? '#16a34a' : '#f59e0b', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                {salvando ? 'Aguarde…' : 'Confirmar'}
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
