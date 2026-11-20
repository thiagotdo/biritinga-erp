'use client'
import { useEffect, useState, useCallback } from 'react'
import { Users, Search, ChevronLeft, ChevronRight, RefreshCw, Plus, X, Building2, User } from 'lucide-react'
import Link from 'next/link'

interface Fornecedor {
  id: string; cpfCnpj: string; nome: string; tipo: 'PJ' | 'PF'
  email?: string; telefone?: string; ativo: number
}

export default function FornecedoresPage() {
  const [lista, setLista]     = useState<Fornecedor[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [q, setQ]             = useState('')
  const [modal, setModal]     = useState(false)

  const limit = 20

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      // Usar db diretamente via API genérica
      const params = new URLSearchParams({ page: String(page), limit: String(limit), ...(q ? { q } : {}) })
      const r = await fetch(`/api/sefin/fornecedores?${params}`)
      const j = await r.json()
      setLista(j.data ?? [])
      setTotal(j.meta?.total ?? 0)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [page, q])

  useEffect(() => { carregar() }, [carregar])

  const pages = Math.ceil(total / limit)

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/gestao/sefin" style={{ color: 'var(--cor-primaria)', textDecoration: 'none', display: 'flex' }}>
            <ChevronLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#111827' }}>Fornecedores</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{total} cadastrados</p>
          </div>
        </div>
        <button onClick={() => setModal(true)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 8, border: 'none',
          background: 'var(--cor-primaria)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          <Plus size={16} /> Novo Fornecedor
        </button>
      </div>

      {/* Busca */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input value={q} onChange={e => { setQ(e.target.value); setPage(1) }}
          placeholder="Buscar por nome ou CPF/CNPJ..."
          style={{ width: '100%', padding: '9px 10px 9px 32px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Carregando...</div>
        ) : lista.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <Users size={40} color="#d1d5db" />
            <p style={{ color: '#9ca3af', marginTop: 12, fontSize: 14 }}>Nenhum fornecedor encontrado</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f3f4f6', background: '#fafafa' }}>
                    {['Tipo','CPF/CNPJ','Nome','Telefone','Email','Status'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lista.map((f, i) => (
                    <tr key={f.id} style={{ borderBottom: '1px solid #f9fafb', background: i % 2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7280' }}>
                          {f.tipo === 'PJ' ? <Building2 size={14} /> : <User size={14} />}
                          {f.tipo}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#374151', fontSize: 13 }}>{f.cpfCnpj}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 500, color: '#111827' }}>{f.nome}</td>
                      <td style={{ padding: '10px 14px', color: '#6b7280' }}>{f.telefone ?? '—'}</td>
                      <td style={{ padding: '10px 14px', color: '#6b7280' }}>{f.email ?? '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: f.ativo ? '#dcfce7' : '#f3f4f6',
                          color: f.ativo ? '#166534' : '#6b7280',
                        }}>
                          {f.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Página {page} de {pages}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', opacity: page === 1 ? .4 : 1 }}>
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', opacity: page === pages ? .4 : 1 }}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {modal && <ModalFornecedor onClose={() => { setModal(false); carregar() }} />}
    </div>
  )
}

function ModalFornecedor({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ cpfCnpj: '', nome: '', tipo: 'PJ', email: '', telefone: '', endereco: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setSalvando(true); setErro(null)
    try {
      const r = await fetch('/api/sefin/fornecedores', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.erro)
      onClose()
    } catch (err: any) { setErro(err.message) } finally { setSalvando(false) }
  }

  const F = (label: string, name: string, type = 'text', options?: string[]) => (
    <div>
      <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{label}</label>
      {options ? (
        <select value={(form as any)[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
          style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={(form as any)[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
          required={['cpfCnpj','nome'].includes(name)}
          style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }} />
      )}
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={salvar} style={{ background: '#fff', borderRadius: 16, padding: 24, width: 460, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Novo Fornecedor</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#6b7280" /></button>
        </div>
        {erro && <div style={{ background: '#fef2f2', borderRadius: 8, padding: '10px 12px', marginBottom: 14, color: '#dc2626', fontSize: 14 }}>{erro}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {F('Tipo', 'tipo', 'text', ['PJ', 'PF'])}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {F('CPF/CNPJ *', 'cpfCnpj')}
            {F('Nome *', 'nome')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {F('E-mail', 'email', 'email')}
            {F('Telefone', 'telefone')}
          </div>
          {F('Endereço', 'endereco')}
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
