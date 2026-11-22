'use client'
import { useState, useEffect, useCallback } from 'react'

// ─── Rubricas de Folha ────────────────────────────────────────────────────────

const TIPO_INFO: Record<string, { label: string; cor: string; bg: string }> = {
  PROVENTO:    { label: 'Provento',    cor: '#16a34a', bg: '#f0fdf4' },
  DESCONTO:    { label: 'Desconto',    cor: '#dc2626', bg: '#fef2f2' },
  INFORMATIVO: { label: 'Informativo', cor: '#6366f1', bg: '#eef2ff' },
}
const NATUREZA_INFO: Record<string, { label: string; cor: string }> = {
  FIXO:       { label: 'Fixo',       cor: '#374151' },
  VARIAVEL:   { label: 'Variável',   cor: '#d97706' },
  AUTOMATICO: { label: 'Automático', cor: '#7c3aed' },
}

interface Rubrica {
  id: string; codigo: string; nome: string; tipo: string; natureza: string
  percentual?: number; valor?: number
  incideInss: boolean; incideIrpf: boolean; incideFgts: boolean; ativo: boolean
}

export default function RubricasPage() {
  const [rubricas, setRubricas] = useState<Rubrica[]>([])
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState<Record<string, any>>({ tipo: 'PROVENTO', natureza: 'VARIAVEL', incideInss: false, incideIrpf: false, incideFgts: false })
  const [salvando, setSalv]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [filtroTipo, setFiltro] = useState('')

  const load = useCallback(async () => {
    const r = await fetch('/api/folha/rubrica')
    if (r.ok) { const d = await r.json(); setRubricas(d.rubricas ?? []) }
  }, [])
  useEffect(() => { load() }, [load])

  async function salvar() {
    setSalv(true)
    const r = await fetch('/api/folha/rubrica', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSalv(false)
    if (r.ok) { setMsg('✅ Rubrica criada!'); setModal(false); setForm({ tipo: 'PROVENTO', natureza: 'VARIAVEL', incideInss: false, incideIrpf: false, incideFgts: false }); load() }
    else { const d = await r.json(); setMsg('Erro: ' + (d.erro?.formErrors?.[0] ?? JSON.stringify(d.erro))) }
  }

  async function toggleAtivo(r: Rubrica) {
    await fetch('/api/folha/rubrica', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.id, ativo: !r.ativo }),
    })
    load()
  }

  const lista = filtroTipo ? rubricas.filter(r => r.tipo === filtroTipo) : rubricas

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>💼 Rubricas</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Tipos de verba - proventos e descontos</p>
        </div>
        <button onClick={() => { setModal(true); setMsg('') }}
          style={{ background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          + Nova Rubrica
        </button>
      </div>

      {msg && (
        <div style={{ background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.startsWith('✅') ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14, color: msg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>
          {msg}
        </div>
      )}

      {/* Filtro por tipo */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['', 'PROVENTO', 'DESCONTO', 'INFORMATIVO'].map(t => {
          const info = t ? TIPO_INFO[t] : null
          return (
            <button key={t} onClick={() => setFiltro(t)}
              style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${filtroTipo === t ? (info?.cor ?? '#1e293b') : '#e2e8f0'}`, background: filtroTipo === t ? (info?.bg ?? '#f8fafc') : '#fff', color: filtroTipo === t ? (info?.cor ?? '#1e293b') : '#64748b', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              {t ? TIPO_INFO[t].label : 'Todos'} {t ? `(${rubricas.filter(r => r.tipo === t).length})` : `(${rubricas.length})`}
            </button>
          )
        })}
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Código', 'Nome', 'Tipo', 'Natureza', 'Incidências', 'Situação'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map((r, i) => {
              const ti = TIPO_INFO[r.tipo] ?? TIPO_INFO.PROVENTO
              const ni = NATUREZA_INFO[r.natureza] ?? NATUREZA_INFO.VARIAVEL
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', background: !r.ativo ? '#fafafa' : i % 2 === 0 ? '#fff' : '#fafafa', opacity: r.ativo ? 1 : 0.6 }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#475569' }}>{r.codigo}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{r.nome}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: ti.bg, color: ti.cor }}>{ti.label}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: ni.cor, fontWeight: 600 }}>{ni.label}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {r.incideInss && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>INSS</span>}
                      {r.incideIrpf && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: '#fef9c3', color: '#854d0e', fontWeight: 700 }}>IRPF</span>}
                      {r.incideFgts && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: '#f3e8ff', color: '#6b21a8', fontWeight: 700 }}>FGTS</span>}
                      {!r.incideInss && !r.incideIrpf && !r.incideFgts && <span style={{ fontSize: 11, color: '#94a3b8' }}>—</span>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => toggleAtivo(r)}
                      style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, border: 'none', background: r.ativo ? '#f0fdf4' : '#fee2e2', color: r.ativo ? '#16a34a' : '#dc2626', cursor: 'pointer', fontWeight: 700 }}>
                      {r.ativo ? 'Ativa' : 'Inativa'}
                    </button>
                  </td>
                </tr>
              )
            })}
            {lista.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Nenhuma rubrica encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 520, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 800 }}>💼 Nova Rubrica</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 14 }}>
              <div><label style={lblS}>Código *</label><input value={form.codigo ?? ''} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} style={inpS} placeholder="0001" /></div>
              <div><label style={lblS}>Nome *</label><input value={form.nome ?? ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={inpS} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={lblS}>Tipo *</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={inpS}>
                  <option value="PROVENTO">Provento</option>
                  <option value="DESCONTO">Desconto</option>
                  <option value="INFORMATIVO">Informativo</option>
                </select>
              </div>
              <div>
                <label style={lblS}>Natureza *</label>
                <select value={form.natureza} onChange={e => setForm(f => ({ ...f, natureza: e.target.value }))} style={inpS}>
                  <option value="FIXO">Fixo</option>
                  <option value="VARIAVEL">Variável</option>
                  <option value="AUTOMATICO">Automático (calculado)</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Incidências para cálculo automático:</p>
              <div style={{ display: 'flex', gap: 16 }}>
                {[{ key: 'incideInss', label: 'Incide INSS' }, { key: 'incideIrpf', label: 'Incide IRPF' }, { key: 'incideFgts', label: 'Incide FGTS' }].map(({ key, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form[key] ?? false} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {msg && <div style={{ background: '#fef2f2', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>{msg}</div>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando}
                style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: '#1e293b', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                {salvando ? 'Salvando…' : 'Criar Rubrica'}
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
