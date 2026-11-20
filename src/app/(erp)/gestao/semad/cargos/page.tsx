'use client'

import { useState, useEffect } from 'react'
import { Briefcase, Plus, Search, Users, X, Loader2, CheckCircle } from 'lucide-react'

interface Cargo {
  id: string
  nome: string
  simbolo?: string
  nivelSalarial?: string
  salarioBase?: number
  cargaHoraria: number
  requerConcurso: boolean
  comissionado: boolean
  totalServidores?: number
}

export default function CargosPage() {
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nome: '', simbolo: '', nivelSalarial: '', salarioBase: '', cargaHoraria: '40', requerConcurso: true, comissionado: false })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = () => {
    setLoading(true)
    fetch('/api/semad/cargos')
      .then(r => r.json())
      .then(d => { setCargos(d.cargos ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  const salvar = async () => {
    if (!form.nome.trim()) return setErro('Nome é obrigatório')
    setSalvando(true); setErro('')
    const r = await fetch('/api/semad/cargos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        salarioBase: form.salarioBase ? Number(form.salarioBase) : undefined,
        cargaHoraria: Number(form.cargaHoraria),
      }),
    })
    const d = await r.json()
    setSalvando(false)
    if (!r.ok) return setErro(d.erro ?? 'Erro ao salvar')
    setModal(false)
    setForm({ nome: '', simbolo: '', nivelSalarial: '', salarioBase: '', cargaHoraria: '40', requerConcurso: true, comissionado: false })
    carregar()
  }

  const fmtMoeda = (v?: number) => v ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'
  const filtrados = cargos.filter(c => !q || c.nome.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cargos</h1>
          <p className="text-gray-500 mt-1">{cargos.length} cargos cadastrados</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> Novo Cargo
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Filtrar cargos..." value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin w-6 h-6 text-blue-600" /></div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cargo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Símbolo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Salário Base</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">CH</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Servidores</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Nenhum cargo encontrado</td></tr>
              ) : filtrados.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.nome}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.simbolo ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{fmtMoeda(c.salarioBase)}</td>
                  <td className="px-4 py-3 text-gray-500">{c.cargaHoraria}h</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.comissionado ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {c.comissionado ? 'Comissionado' : c.requerConcurso ? 'Efetivo' : 'Contratado'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-gray-600">
                      <Users className="w-3.5 h-3.5" />
                      {Number(c.totalServidores ?? 0)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Novo Cargo</h2>
              <button onClick={() => setModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              {erro && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{erro}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Nome do Cargo *</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Símbolo</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="ex: CC-1" value={form.simbolo} onChange={e => setForm(f => ({ ...f, simbolo: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Nível Salarial</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={form.nivelSalarial} onChange={e => setForm(f => ({ ...f, nivelSalarial: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Salário Base (R$)</label>
                  <input type="number" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={form.salarioBase} onChange={e => setForm(f => ({ ...f, salarioBase: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Carga Horária (h/sem)</label>
                  <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={form.cargaHoraria} onChange={e => setForm(f => ({ ...f, cargaHoraria: e.target.value }))} />
                </div>
                <div className="col-span-2 flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.requerConcurso} onChange={e => setForm(f => ({ ...f, requerConcurso: e.target.checked }))} />
                    Requer Concurso
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.comissionado} onChange={e => setForm(f => ({ ...f, comissionado: e.target.checked }))} />
                    Comissionado
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button onClick={salvar} disabled={salvando}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
                  Cadastrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
