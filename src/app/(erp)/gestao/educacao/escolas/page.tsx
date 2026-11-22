'use client'
import { useState, useEffect, useCallback } from 'react'
import { School, Plus, Search, ChevronLeft, ChevronRight, X, MapPin } from 'lucide-react'

type Escola = {
  id: string; nome: string; zona: string; inep: string; situacao: string
  diretor: string; telefone: string; email: string; bairro: string
  salas: number; capacidadeTotal: number; totalTurmas: number
}

const ZONA_LABEL: Record<string, string> = {
  URBANA: 'Urbana', RURAL: 'Rural',
}

const ZONA_COR: Record<string, string> = {
  URBANA: 'bg-blue-50 text-blue-700',
  RURAL:  'bg-amber-50 text-amber-700',
}

function ModalEscola({ onSalvar, onClose }: { onSalvar: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    nome: '', zona: 'URBANA', inep: '', diretor: '', secretario: '',
    logradouro: '', bairro: '', cep: '', telefone: '', email: '',
    salas: 0, capacidadeTotal: 0,
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Nova Escola</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs font-medium text-gray-600">Nome *</label>
            <input value={form.nome} onChange={e => set('nome', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': 'var(--cor-primaria)' } as any} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Zona</label>
              <select value={form.zona} onChange={e => set('zona', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none">
                <option value="URBANA">Urbana</option>
                <option value="RURAL">Rural</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Código INEP</label>
              <input value={form.inep} onChange={e => set('inep', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Diretor(a)</label>
              <input value={form.diretor} onChange={e => set('diretor', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Secretário(a)</label>
              <input value={form.secretario} onChange={e => set('secretario', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Telefone</label>
              <input value={form.telefone} onChange={e => set('telefone', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">E-mail</label>
              <input value={form.email} onChange={e => set('email', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Salas</label>
              <input type="number" min={0} value={form.salas} onChange={e => set('salas', +e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Capacidade (alunos)</label>
              <input type="number" min={0} value={form.capacidadeTotal} onChange={e => set('capacidadeTotal', +e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Logradouro</label>
            <input value={form.logradouro} onChange={e => set('logradouro', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Bairro / Localidade</label>
              <input value={form.bairro} onChange={e => set('bairro', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">CEP</label>
              <input value={form.cep} onChange={e => set('cep', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancelar</button>
          <button
            onClick={() => { if (form.nome) onSalvar(form) }}
            disabled={!form.nome}
            className="px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ background: 'var(--cor-primaria)' }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EscolasPage() {
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(false)
  const [filtroZona, setFiltroZona] = useState('')
  const [page, setPage] = useState(1)
  const PER = 20

  const carregar = useCallback(async () => {
    setLoading(true); setErro('')
    try {
      const r = await fetch('/api/educacao/escola')
      const d = await r.json()
      if (d.erro) throw new Error(d.erro)
      setEscolas(d.escolas ?? [])
    } catch (e: any) { setErro(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const filtradas = escolas.filter(e => {
    const matchQ = !q || e.nome.toLowerCase().includes(q.toLowerCase()) ||
      (e.bairro ?? '').toLowerCase().includes(q.toLowerCase()) ||
      (e.inep ?? '').includes(q)
    const matchZona = !filtroZona || e.zona === filtroZona
    return matchQ && matchZona
  })
  const paged = filtradas.slice((page - 1) * PER, page * PER)
  const pages = Math.ceil(filtradas.length / PER)

  const urbanas = escolas.filter(e => e.zona === 'URBANA').length
  const rurais  = escolas.filter(e => e.zona === 'RURAL').length

  async function salvar(dados: any) {
    try {
      const r = await fetch('/api/educacao/escola', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      })
      const d = await r.json()
      if (d.erro) throw new Error(d.erro)
      setModal(false); carregar()
    } catch (e: any) { alert(e.message) }
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      {modal && <ModalEscola onSalvar={salvar} onClose={() => setModal(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <a href="/gestao/educacao" className="hover:underline">Educação</a>
            <span>›</span><span>Escolas</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Unidades Escolares</h1>
          <p className="text-sm text-gray-500">{escolas.length} cadastradas · {urbanas} urbanas · {rurais} rurais</p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm"
          style={{ background: 'var(--cor-primaria)' }}
        >
          <Plus size={16} /> Nova Escola
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q} onChange={e => { setQ(e.target.value); setPage(1) }}
            placeholder="Buscar por nome, bairro ou INEP..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': 'var(--cor-primaria)' } as any}
          />
        </div>
        <select value={filtroZona} onChange={e => { setFiltroZona(e.target.value); setPage(1) }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none">
          <option value="">Todas as zonas</option>
          <option value="URBANA">Urbana</option>
          <option value="RURAL">Rural</option>
        </select>
      </div>

      {erro && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{erro}</div>}

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Carregando...</div>
        ) : !paged.length ? (
          <div className="py-16 text-center">
            <School size={32} className="mx-auto mb-2" style={{ color: 'var(--cor-primaria)' }} strokeWidth={1.5} />
            <p className="text-gray-400 text-sm">Nenhuma escola encontrada</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Zona</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Diretor(a)</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Turmas</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">INEP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.map(e => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{e.nome}</p>
                    {e.bairro && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> {e.bairro}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${ZONA_COR[e.zona] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ZONA_LABEL[e.zona] ?? e.zona ?? '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{e.diretor ?? '-'}</td>
                  <td className="px-4 py-3 text-center font-medium text-gray-700">{e.totalTurmas ?? 0}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell font-mono">{e.inep ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{filtradas.length} resultados</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              <ChevronLeft size={14} />
            </button>
            <span className="px-2">{page} / {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
