'use client'
import { useEffect, useState } from 'react'
import { DollarSign, AlertTriangle, CheckCircle, TrendingUp, Plus } from 'lucide-react'

type Repasse = {
  id: string; mes: string; valorRepasse: number; valorFundeb: number; saldo: number
  matriculasApuradas: number; valorPorAluno: number | null
  aplicacaoProfessores: number | null; pctProfessores: number | null; alertaProfessores: boolean
}

type Resumo = { totalRepasse: number; totalFundeb: number; totalAplicProf: number; pctProfGeral: number; alertaProfGeral: boolean; mesesAlerta: number; totalMeses: number }

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function PctBar({ pct, min = 70 }: { pct: number | null; min?: number }) {
  if (pct === null) return <span style={{ color: '#94a3b8', fontSize: 13 }}>Não informado</span>
  const cor = pct >= min ? '#16a34a' : '#dc2626'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 100, height: 8 }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: 8, borderRadius: 100, background: cor }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: cor, minWidth: 48 }}>{pct.toFixed(1)}%</span>
      {pct < min && <AlertTriangle size={14} color="#dc2626" />}
    </div>
  )
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
function labelMes(mes: string) {
  const [ano, m] = mes.split('-')
  return `${MESES[Number(m) - 1]}/${ano}`
}

export default function FundebPage() {
  const [ano, setAno]           = useState(new Date().getFullYear())
  const [dados, setDados]       = useState<{ repasses: Repasse[]; resumo: Resumo } | null>(null)
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState<any>({})
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg]           = useState('')

  async function carregar() {
    setLoading(true)
    const r = await fetch(`/api/educacao/fundeb?ano=${ano}`).then(r => r.json())
    setDados(r)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [ano])

  async function salvar() {
    setSalvando(true)
    const r = await fetch('/api/educacao/fundeb', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSalvando(false)
    if (r.ok) {
      const d = await r.json()
      setMsg(d.alertaProf ? `⚠ Mês ${form.mes}: aplicação em professores abaixo de 70% (${d.pctProf?.toFixed(1)}%)` : 'Repasse registrado com sucesso.')
      setModal(false); setForm({}); carregar()
    } else {
      const d = await r.json(); setMsg(d.erro)
    }
  }

  const res = dados?.resumo

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>💰 FUNDEB</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>EC 108/2020 · Lei 14.113/2020 — Mínimo 70% professores</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={ano} onChange={e => setAno(Number(e.target.value))}
            style={{ fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
            {[ano + 1, ano, ano - 1, ano - 2].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={() => setModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--cor-primaria)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={16} /> Registrar Repasse
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ background: msg.startsWith('⚠') ? '#fef3c7' : '#f0fdf4', border: `1px solid ${msg.startsWith('⚠') ? '#fde68a' : '#bbf7d0'}`, color: msg.startsWith('⚠') ? '#92400e' : '#166534', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 14 }}>
          {msg}
        </div>
      )}

      {/* KPIs anuais */}
      {res && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Repasses', value: fmt(res.totalRepasse) },
            { label: 'Contrib. Município', value: fmt(res.totalFundeb) },
            { label: 'Aplic. Professores', value: fmt(res.totalAplicProf) },
            { label: `% Professores (mín. 70%)`, value: `${res.pctProfGeral.toFixed(1)}%`, cor: res.alertaProfGeral ? '#dc2626' : '#16a34a' },
            { label: 'Meses com Alerta', value: res.mesesAlerta, cor: res.mesesAlerta > 0 ? '#dc2626' : '#16a34a' },
          ].map(({ label, value, cor }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: typeof value === 'number' ? 24 : 18, fontWeight: 800, color: cor ?? '#1e293b' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Alerta EC 108 */}
      {res?.alertaProfGeral && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, fontSize: 13, color: '#dc2626' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <strong>ALERTA EC 108/2020:</strong> A aplicação acumulada em professores ({res.pctProfGeral.toFixed(1)}%) está abaixo do mínimo constitucional de 70%. O município pode estar sujeito a sanções do TCM/TCU.
        </div>
      )}

      {/* Tabela mensal */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
          Repasses Mensais {ano}
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Carregando…</div>
        ) : !dados?.repasses.length ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
            <DollarSign size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div>Nenhum repasse registrado para {ano}</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Clique em "Registrar Repasse" para adicionar</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Mês', 'Repasse FNDE', 'Contrib. Município', 'Saldo', 'Matrículas', 'Valor/Aluno', 'Aplic. Professores', 'Status'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: h.startsWith('Aplic') ? 'left' : 'right', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.repasses.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9', background: r.alertaProfessores ? '#fef2f2' : undefined }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1e293b' }}>{labelMes(r.mes)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>{fmt(r.valorRepasse)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: '#475569' }}>{fmt(r.valorFundeb)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: r.saldo >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(r.saldo)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: '#475569' }}>{r.matriculasApuradas?.toLocaleString('pt-BR') ?? '—'}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: '#475569' }}>{r.valorPorAluno ? fmt(r.valorPorAluno) : '—'}</td>
                  <td style={{ padding: '10px 14px', minWidth: 220 }}>
                    {r.aplicacaoProfessores
                      ? <><div style={{ fontSize: 12, color: '#475569', marginBottom: 2 }}>{fmt(r.aplicacaoProfessores)}</div><PctBar pct={r.pctProfessores} /></>
                      : <span style={{ color: '#94a3b8' }}>Não informado</span>
                    }
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    {r.alertaProfessores
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}><AlertTriangle size={11} /> ABAIXO 70%</span>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}><CheckCircle size={11} /> OK</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 800 }}>Registrar Repasse FUNDEB</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { key: 'mes', label: 'Mês de Referência *', type: 'month', span: 2 },
                { key: 'valorRepasse', label: 'Valor Repasse FNDE (R$) *', placeholder: '150000.00' },
                { key: 'valorFundeb', label: 'Contribuição Município (R$) *', placeholder: '50000.00' },
                { key: 'matriculasApuradas', label: 'Matrículas Apuradas', placeholder: '1200' },
                { key: 'valorPorAluno', label: 'Valor por Aluno (R$)', placeholder: '125.00' },
                { key: 'aplicacaoProfessores', label: 'Aplic. Professores (R$)', placeholder: '105000.00', span: 2 },
              ].map(({ key, label, placeholder, type, span }) => (
                <div key={key} style={{ gridColumn: span === 2 ? '1 / -1' : undefined }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input type={type ?? 'text'} value={form[key] ?? ''} placeholder={placeholder}
                    onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 12px', marginTop: 12, fontSize: 12, color: '#1d4ed8' }}>
              💡 O sistema alertará automaticamente se a aplicação em professores ficar abaixo de 70% (EC 108/2020).
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => { setModal(false); setForm({}) }}
                style={{ padding: '8px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando}
                style={{ padding: '8px 20px', background: 'var(--cor-primaria)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                {salvando ? 'Salvando…' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
