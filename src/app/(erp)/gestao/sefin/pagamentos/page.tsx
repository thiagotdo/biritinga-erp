'use client'
import { useEffect, useState, useCallback } from 'react'
import { CircleDollarSign, ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react'
import Link from 'next/link'

interface Pagamento {
  id: string; numero: string; dataPagamento: string; valor: number; formaPagamento: string
  empenhoNumero?: string; empenhoDescricao?: string; fornecedorNome?: string
  liquidacaoNumero?: string; contaNome?: string
}

const brl = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const brlM = (v: number) => {
  v = Number(v)
  if (v >= 1_000_000) return `R$ ${(v/1_000_000).toFixed(2)} mi`
  if (v >= 1_000)     return `R$ ${(v/1_000).toFixed(1)} mil`
  return brl(v)
}

const FORMA_COR: Record<string, string> = {
  TRANSFERENCIA: '#dbeafe', PIX: '#dcfce7', CHEQUE: '#fef9c3', BOLETO: '#ede9fe', DINHEIRO: '#fff7ed',
}

export default function PagamentosPage() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [meta, setMeta]     = useState({ total: 0, pages: 1, totalValor: 0 })
  const [page, setPage]     = useState(1)
  const [loading, setLoading] = useState(true)
  const [mes, setMes]       = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', ...(mes ? { mes } : {}) })
      const r = await fetch(`/api/sefin/pagamentos?${params}`)
      const j = await r.json()
      setPagamentos(j.data ?? [])
      setMeta(j.meta ?? { total: 0, pages: 1, totalValor: 0 })
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [page, mes])

  useEffect(() => { carregar() }, [carregar])

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/gestao/sefin" style={{ color: 'var(--cor-primaria)', textDecoration: 'none', display: 'flex' }}>
            <ChevronLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#111827' }}>Pagamentos</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{meta.total} registros · Total: {brlM(meta.totalValor)}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="month" value={mes} onChange={e => { setMes(e.target.value); setPage(1) }}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }} />
          {mes && (
            <button onClick={() => setMes('')} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#6b7280' }}>
              Limpar
            </button>
          )}
          <button onClick={carregar} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>
            <RefreshCw size={14} style={{ color: '#6b7280', display: 'block', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Carregando...</div>
        ) : pagamentos.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <CircleDollarSign size={40} color="#d1d5db" />
            <p style={{ color: '#9ca3af', marginTop: 12, fontSize: 14 }}>Nenhum pagamento encontrado</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f3f4f6', background: '#fafafa' }}>
                    {['Número','Data','Empenho','Fornecedor','Conta','Forma','Valor'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f9fafb', background: i % 2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--cor-primaria)' }}>{p.numero}</td>
                      <td style={{ padding: '10px 14px', color: '#374151', whiteSpace: 'nowrap' }}>
                        {new Date(p.dataPagamento + 'T00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#374151' }}>
                        {p.empenhoNumero && <div style={{ fontWeight: 500 }}>Emp. {p.empenhoNumero}</div>}
                        {p.empenhoDescricao && <div style={{ fontSize: 11, color: '#9ca3af', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.empenhoDescricao}</div>}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#374151' }}>{p.fornecedorNome ?? '—'}</td>
                      <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12 }}>{p.contaNome ?? '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                          background: FORMA_COR[p.formaPagamento] ?? '#f3f4f6',
                        }}>
                          {p.formaPagamento}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>
                        {brl(p.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {meta.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Página {page} de {meta.pages}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? .4 : 1 }}>
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => setPage(p => Math.min(meta.pages, p + 1))} disabled={page === meta.pages}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: page === meta.pages ? 'default' : 'pointer', opacity: page === meta.pages ? .4 : 1 }}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
