'use client'
import { useEffect, useState, useCallback } from 'react'
import { BarChart2, ChevronLeft, RefreshCw, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface LOA { id: string; exercicio: number; lei?: string; dataPublicacao?: string; valorTotal: number; status: string }
interface ExecRow { unidade: string; sigla: string; orcado: number; empenhado: number; liquidado: number; pago: number }
interface Totais { totalOrcado: number; totalEmpenhado: number; totalLiquidado: number; totalPago: number }

const brl  = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const brlM = (v: number) => {
  v = Number(v)
  if (v >= 1_000_000) return `R$ ${(v/1_000_000).toFixed(2)} mi`
  if (v >= 1_000)     return `R$ ${(v/1_000).toFixed(1)} mil`
  return brl(v)
}

function ProgressBar({ value, max, color = 'var(--cor-primaria)' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (Number(value) / Number(max)) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 4, height: 8 }}>
        <div style={{ width: `${pct}%`, background: pct > 90 ? '#dc2626' : color, height: '100%', borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 11, color: '#6b7280', minWidth: 36 }}>{pct.toFixed(0)}%</span>
    </div>
  )
}

export default function OrcamentoPage() {
  const [dados, setDados]     = useState<{ loa?: LOA; execucao: ExecRow[]; totais: Totais; exercicio: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [exercicio, setExercicio] = useState(new Date().getFullYear().toString())

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/sefin/orcamento?exercicio=${exercicio}`)
      setDados(await r.json())
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [exercicio])

  useEffect(() => { carregar() }, [carregar])

  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)
  const t = dados?.totais

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/gestao/sefin" style={{ color: 'var(--cor-primaria)', textDecoration: 'none', display: 'flex' }}>
            <ChevronLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#111827' }}>Orçamento</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Execução orçamentária - exercício {exercicio}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={exercicio} onChange={e => setExercicio(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, background: '#fff' }}>
            {anos.map(a => <option key={a}>{a}</option>)}
          </select>
          <button onClick={carregar} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>
            <RefreshCw size={14} style={{ color: '#6b7280', display: 'block', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* LOA info */}
      {dados?.loa ? (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>LOA {dados.loa.exercicio}</span>
            {dados.loa.lei && <span style={{ fontSize: 13, color: '#374151', marginLeft: 8 }}>Lei {dados.loa.lei}</span>}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#16a34a' }}>{brlM(dados.loa.valorTotal)}</div>
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#dcfce7', color: '#166534' }}>
            {dados.loa.status}
          </span>
        </div>
      ) : !loading && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center', color: '#92400e', fontSize: 14 }}>
          <AlertTriangle size={16} /> Nenhuma LOA cadastrada para {exercicio}.
        </div>
      )}

      {/* KPI Totais */}
      {t && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'ORÇADO',     valor: t.totalOrcado,     cor: '#3b82f6' },
            { label: 'EMPENHADO',  valor: t.totalEmpenhado,  cor: '#ca8a04' },
            { label: 'LIQUIDADO',  valor: t.totalLiquidado,  cor: '#7c3aed' },
            { label: 'PAGO',       valor: t.totalPago,       cor: '#16a34a' },
          ].map(({ label, valor, cor }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: '14px 18px' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', margin: 0 }}>{label}</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: cor, margin: '6px 0 0' }}>{brlM(valor ?? 0)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Execução por unidade */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 20px', color: '#111827' }}>Execução por Unidade Orçamentária</h2>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Carregando...</div>
        ) : !dados?.execucao?.length ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <BarChart2 size={36} color="#d1d5db" />
            <p style={{ color: '#9ca3af', marginTop: 10, fontSize: 14 }}>Nenhuma unidade cadastrada</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {dados.execucao.map(u => (
              <div key={u.unidade} style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <span style={{ fontWeight: 600, color: '#111827' }}>{u.sigla || u.unidade}</span>
                    {u.sigla && <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 6 }}>{u.unidade}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                    <span style={{ color: '#3b82f6' }}>Orçado: {brlM(u.orcado)}</span>
                    <span style={{ color: '#ca8a04' }}>Emp: {brlM(u.empenhado)}</span>
                    <span style={{ color: '#16a34a' }}>Pago: {brlM(u.pago)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#9ca3af', width: 70 }}>Empenhado</span>
                    <div style={{ flex: 1 }}><ProgressBar value={u.empenhado} max={u.orcado} color="#ca8a04" /></div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#9ca3af', width: 70 }}>Pago</span>
                    <div style={{ flex: 1 }}><ProgressBar value={u.pago} max={u.orcado} color="#16a34a" /></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
