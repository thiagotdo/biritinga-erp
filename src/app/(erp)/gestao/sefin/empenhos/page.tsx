'use client'
import { useEffect, useState, useCallback } from 'react'
import { Search, Plus, ChevronLeft, ChevronRight, FileText, RefreshCw, X } from 'lucide-react'
import Link from 'next/link'

interface Empenho {
  id: string
  numero: string
  dataEmissao: string
  tipo: string
  descricao: string
  valor: number
  valorAnulado: number
  status: string
  fornecedorNome?: string
  fornecedorDoc?: string
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const STATUS_COR: Record<string, { bg: string; text: string }> = {
  EMITIDO:   { bg: '#dbeafe', text: '#1d4ed8' },
  LIQUIDADO: { bg: '#fef9c3', text: '#854d0e' },
  PAGO:      { bg: '#dcfce7', text: '#166534' },
  ANULADO:   { bg: '#fee2e2', text: '#dc2626' },
  CANCELADO: { bg: '#f3f4f6', text: '#6b7280' },
}

export default function EmpenhosList() {
  const [empenhos, setEmpenhos] = useState<Empenho[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [q, setQ]               = useState('')
  const [status, setStatus]     = useState('')
  const [exercicio, setExercicio] = useState(new Date().getFullYear().toString())
  const [modalAberto, setModalAberto] = useState(false)

  const limit = 20

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page), limit: String(limit), exercicio,
        ...(q      ? { q }      : {}),
        ...(status ? { status } : {}),
      })
      const r = await fetch(`/api/sefin/empenhos?${params}`)
      const j = await r.json()
      setEmpenhos(j.data ?? [])
      setTotal(j.meta?.total ?? 0)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [page, q, status, exercicio])

  useEffect(() => { carregar() }, [carregar])

  const pages = Math.ceil(total / limit)
  const anos  = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/gestao/sefin" style={{ color: 'var(--cor-primaria)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#111827' }}>Empenhos</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{total} registro(s)</p>
          </div>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: 'var(--cor-primaria)', color: '#fff', fontSize: 14,
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Novo Empenho
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }}
            placeholder="Buscar por número, fornecedor ou descrição..."
            style={{
              width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8,
              border: '1px solid #d1d5db', fontSize: 14, outline: 'none',
            }}
          />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, background: '#fff' }}>
          <option value="">Todos os status</option>
          {['EMITIDO','LIQUIDADO','PAGO','ANULADO','CANCELADO'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={exercicio} onChange={e => { setExercicio(e.target.value); setPage(1) }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, background: '#fff' }}>
          {anos.map(a => <option key={a}>{a}</option>)}
        </select>
        <button onClick={carregar} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>
          <RefreshCw size={14} style={{ color: '#6b7280', display: 'block', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Tabela */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Carregando...</div>
        ) : empenhos.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <FileText size={40} color="#d1d5db" />
            <p style={{ color: '#9ca3af', marginTop: 12, fontSize: 14 }}>Nenhum empenho encontrado</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f3f4f6', background: '#fafafa' }}>
                    {['Número', 'Data', 'Tipo', 'Fornecedor', 'Descrição', 'Valor', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {empenhos.map((e, i) => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #f9fafb', background: i % 2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--cor-primaria)' }}>{e.numero}</td>
                      <td style={{ padding: '10px 14px', color: '#374151', whiteSpace: 'nowrap' }}>
                        {new Date(e.dataEmissao + 'T00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12 }}>{e.tipo}</td>
                      <td style={{ padding: '10px 14px', color: '#374151' }}>
                        {e.fornecedorNome
                          ? <><div style={{ fontWeight: 500 }}>{e.fornecedorNome}</div><div style={{ fontSize: 11, color: '#9ca3af' }}>{e.fornecedorDoc}</div></>
                          : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#374151', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.descricao}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
                        {brl(e.valor)}
                        {e.valorAnulado > 0 && (
                          <div style={{ fontSize: 11, color: '#dc2626' }}>−{brl(e.valorAnulado)}</div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: STATUS_COR[e.status]?.bg ?? '#f3f4f6',
                          color:      STATUS_COR[e.status]?.text ?? '#6b7280',
                        }}>
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>
                  Página {page} de {pages} · {total} registros
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? .4 : 1 }}>
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: page === pages ? 'default' : 'pointer', opacity: page === pages ? .4 : 1 }}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal novo empenho */}
      {modalAberto && <ModalNovoEmpenho onClose={() => { setModalAberto(false); carregar() }} />}

      <style>{`@keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }`}</style>
    </div>
  )
}

// ─── Modal criar empenho ──────────────────────────────────────────────────────
function ModalNovoEmpenho({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    numero: '', dataEmissao: new Date().toISOString().slice(0, 10),
    tipo: 'ORDINARIO', descricao: '', valor: '', processo: '',
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState<string | null>(null)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true); setErro(null)
    try {
      const r = await fetch('/api/sefin/empenhos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, exercicio: new Date(form.dataEmissao).getFullYear() }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.erro ?? 'Erro ao salvar')
      onClose()
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  const F = (label: string, name: string, type = 'text', options?: string[]) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{label}</label>
      {options ? (
        <select value={(form as any)[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={(form as any)[name]}
          onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
          required={['numero','dataEmissao','descricao','valor'].includes(name)}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }} />
      )}
    </div>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <form onSubmit={salvar} style={{
        background: '#fff', borderRadius: 16, padding: 24, width: 480, maxHeight: '90vh',
        overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Novo Empenho</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="#6b7280" />
          </button>
        </div>
        {erro && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 12px', marginBottom: 16, color: '#dc2626', fontSize: 14 }}>{erro}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {F('Número *', 'numero')}
            {F('Data de Emissão *', 'dataEmissao', 'date')}
          </div>
          {F('Tipo', 'tipo', 'text', ['ORDINARIO', 'ESTIMATIVO', 'GLOBAL'])}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Descrição *</label>
            <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} required rows={3}
              style={{ width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {F('Valor (R$) *', 'valor', 'number')}
            {F('Processo', 'processo')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 14, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="submit" disabled={salvando} style={{
            padding: '9px 18px', borderRadius: 8, border: 'none',
            background: 'var(--cor-primaria)', color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: salvando ? 'default' : 'pointer', opacity: salvando ? .7 : 1,
          }}>
            {salvando ? 'Salvando...' : 'Salvar Empenho'}
          </button>
        </div>
      </form>
    </div>
  )
}
