'use client'
import { useEffect, useState, useCallback } from 'react'
import { TrendingUp, ChevronLeft, RefreshCw, Plus, X } from 'lucide-react'
import Link from 'next/link'

interface Resumo { descricao: string; categoria: string; valorPrevisto: number; valorArrecadado: number }
interface Lancamento { id: string; dataLancamento: string; valor: number; descricao?: string; documento?: string }
interface DadosReceita {
  resumo:      Resumo[]
  lancamentos: Lancamento[]
  totais:      { totalPrevisto: number; totalArrecadado: number }
  meta:        { total: number; pages: number }
}

const brl  = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const brlM = (v: number) => {
  v = Number(v)
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2)} mi`
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(1)} mil`
  return brl(v)
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (Number(value) / Number(max)) * 100) : 0
  const cor  = pct >= 90 ? '#16a34a' : pct >= 60 ? '#ca8a04' : '#dc2626'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 4, height: 6 }}>
        <div style={{ width: `${pct}%`, background: cor, height: '100%', borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 11, color: '#6b7280', minWidth: 36 }}>{pct.toFixed(0)}%</span>
    </div>
  )
}

export default function ReceitasPage() {
  const [dados, setDados]     = useState<DadosReceita | null>(null)
  const [loading, setLoading] = useState(true)
  const [exercicio, setExercicio] = useState(new Date().getFullYear().toString())
  const [modal, setModal]     = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/sefin/receitas?exercicio=${exercicio}&limit=15`)
      setDados(await r.json())
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [exercicio])

  useEffect(() => { carregar() }, [carregar])

  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/gestao/sefin" style={{ color: 'var(--cor-primaria)', textDecoration: 'none', display: 'flex' }}>
            <ChevronLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#111827' }}>Receitas</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Arrecadação e previsão - exercício {exercicio}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={exercicio} onChange={e => setExercicio(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, background: '#fff' }}>
            {anos.map(a => <option key={a}>{a}</option>)}
          </select>
          <button onClick={() => setModal(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8, border: 'none',
            background: 'var(--cor-primaria)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            <Plus size={14} /> Lançamento
          </button>
          <button onClick={carregar} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>
            <RefreshCw size={14} style={{ color: '#6b7280', display: 'block', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* KPI */}
      {dados && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'PREVISTO (LOA)', valor: dados.totais?.totalPrevisto ?? 0, cor: '#3b82f6' },
            { label: 'ARRECADADO', valor: dados.totais?.totalArrecadado ?? 0, cor: '#16a34a' },
            {
              label: 'PERCENTUAL',
              valor: dados.totais?.totalPrevisto > 0
                ? ((Number(dados.totais.totalArrecadado) / Number(dados.totais.totalPrevisto)) * 100).toFixed(1) + '%'
                : '—',
              cor: '#6b7280',
            },
          ].map(({ label, valor, cor }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', margin: 0 }}>{label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: cor, margin: '8px 0 0' }}>
                {typeof valor === 'number' ? brlM(valor) : valor}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Resumo por categoria */}
      {dados && dados.resumo && dados.resumo.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', color: '#111827' }}>Por Categoria</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {dados.resumo.map((r, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <div>
                    <span style={{ fontWeight: 500, color: '#374151' }}>{r.descricao}</span>
                    {r.categoria && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>{r.categoria}</span>}
                  </div>
                  <span style={{ color: '#6b7280' }}>{brlM(Number(r.valorArrecadado))} / {brlM(Number(r.valorPrevisto))}</span>
                </div>
                <ProgressBar value={Number(r.valorArrecadado)} max={Number(r.valorPrevisto)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lançamentos recentes */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', color: '#111827' }}>Últimos Lançamentos</h2>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Carregando...</div>
        ) : !dados?.lancamentos?.length ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <TrendingUp size={36} color="#d1d5db" />
            <p style={{ color: '#9ca3af', marginTop: 10, fontSize: 14 }}>Nenhum lançamento ainda</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6', background: '#fafafa' }}>
                {['Data', 'Descrição', 'Documento', 'Valor'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.lancamentos.map((l, i) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f9fafb', background: i % 2 ? '#fafafa' : '#fff' }}>
                  <td style={{ padding: '10px 12px', color: '#374151' }}>
                    {new Date(l.dataLancamento + 'T00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#374151' }}>{l.descricao ?? '—'}</td>
                  <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 12 }}>{l.documento ?? '—'}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#16a34a' }}>{brl(l.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && <ModalLancamento onClose={() => { setModal(false); carregar() }} />}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ModalLancamento({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ dataLancamento: new Date().toISOString().slice(0, 10), valor: '', descricao: '', documento: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setSalvando(true); setErro(null)
    try {
      const r = await fetch('/api/sefin/receitas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.erro)
      onClose()
    } catch (err: any) { setErro(err.message) } finally { setSalvando(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={salvar} style={{ background: '#fff', borderRadius: 16, padding: 24, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Novo Lançamento</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#6b7280" /></button>
        </div>
        {erro && <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 12px', marginBottom: 14, color: '#dc2626', fontSize: 14 }}>{erro}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Data *', name: 'dataLancamento', type: 'date' },
            { label: 'Valor (R$) *', name: 'valor', type: 'number' },
            { label: 'Descrição', name: 'descricao', type: 'text' },
            { label: 'Documento', name: 'documento', type: 'text' },
          ].map(({ label, name, type }) => (
            <div key={name}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{label}</label>
              <input type={type} value={(form as any)[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
                required={['dataLancamento','valor'].includes(name)}
                style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
          <button type="submit" disabled={salvando} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--cor-primaria)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}
