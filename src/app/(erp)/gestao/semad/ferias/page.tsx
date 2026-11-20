'use client'

import { useState, useEffect } from 'react'
import { Calendar, Plus, Search, CheckCircle, Clock, XCircle, X, Loader2, AlertCircle } from 'lucide-react'

interface Ferias {
  id: string
  servidorNome: string
  matricula?: string
  exercicio: number
  dataInicio: string
  dataFim: string
  diasDireito: number
  diasGozo: number
  status: string
}

const STATUS_COR: Record<string, string> = {
  SOLICITADA:  'bg-yellow-100 text-yellow-700',
  APROVADA:    'bg-green-100 text-green-700',
  EM_GOZO:     'bg-blue-100 text-blue-700',
  CONCLUIDA:   'bg-gray-100 text-gray-600',
  CANCELADA:   'bg-red-100 text-red-700',
}

export default function FeriasPage() {
  const [ferias, setFerias] = useState<Ferias[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFiltro, setStatusFiltro] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ servidorId: '', exercicio: new Date().getFullYear().toString(), dataInicio: '', dataFim: '', diasDireito: '30', diasGozo: '30', observacoes: '' })
  const [servidores, setServidores] = useState<{ id: string; nome: string; matricula: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFiltro) params.set('status', statusFiltro)
    fetch(`/api/semad/ferias?${params}`)
      .then(r => r.json())
      .then(d => { setFerias(d.ferias ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [statusFiltro])

  useEffect(() => {
    fetch('/api/semad/servidores?limit=200')
      .then(r => r.json())
      .then(d => setServidores(d.servidores ?? []))
      .catch(() => {})
  }, [])

  const salvar = async () => {
    if (!form.servidorId || !form.dataInicio || !form.dataFim) return setErro('Dados obrigatórios faltando')
    setSalvando(true); setErro('')
    const r = await fetch('/api/semad/ferias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, exercicio: Number(form.exercicio), diasDireito: Number(form.diasDireito), diasGozo: Number(form.diasGozo) }),
    })
    const d = await r.json()
    setSalvando(false)
    if (!r.ok) return setErro(d.erro ?? 'Erro ao salvar')
    setModal(false)
    carregar()
  }

  const aprovar = async (id: string, status: string) => {
    await fetch('/api/semad/ferias', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    carregar()
  }

  const fmtData = (d: string) => new Date(d).toLocaleDateString('pt-BR')

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Férias</h1>
          <p className="text-gray-500 mt-1">{ferias.length} registros</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> Solicitar Férias
        </button>
      </div>

      <div className="flex gap-3">
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="SOLICITADA">Solicitada</option>
          <option value="APROVADA">Aprovada</option>
          <option value="EM_GOZO">Em Gozo</option>
          <option value="CONCLUIDA">Concluída</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin w-6 h-6 text-blue-600" /></div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Servidor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Exercício</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Período</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Dias</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ferias.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Nenhum registro de férias</td></tr>
              ) : ferias.map(f => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{f.servidorNome}</div>
                    {f.matricula && <div className="text-xs text-gray-400 font-mono">{f.matricula}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{f.exercicio}</td>
                  <td className="px-4 py-3 text-gray-600">{fmtData(f.dataInicio)} – {fmtData(f.dataFim)}</td>
                  <td className="px-4 py-3 text-gray-600">{f.diasGozo} dias</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COR[f.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {f.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {f.status === 'SOLICITADA' && (
                      <div className="flex gap-1">
                        <button onClick={() => aprovar(f.id, 'APROVADA')} title="Aprovar"
                          className="p-1 text-green-600 hover:bg-green-50 rounded">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => aprovar(f.id, 'CANCELADA')} title="Cancelar"
                          className="p-1 text-red-500 hover:bg-red-50 rounded">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {f.status === 'APROVADA' && (
                      <button onClick={() => aprovar(f.id, 'EM_GOZO')} title="Iniciar Gozo"
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded text-xs">
                        Iniciar
                      </button>
                    )}
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
              <h2 className="font-semibold text-gray-900">Solicitar Férias</h2>
              <button onClick={() => setModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              {erro && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{erro}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Servidor *</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={form.servidorId} onChange={e => setForm(f => ({ ...f, servidorId: e.target.value }))}>
                    <option value="">Selecionar...</option>
                    {servidores.map(s => <option key={s.id} value={s.id}>{s.nome} ({s.matricula})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Exercício</label>
                  <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={form.exercicio} onChange={e => setForm(f => ({ ...f, exercicio: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Dias de Gozo</label>
                  <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={form.diasGozo} onChange={e => setForm(f => ({ ...f, diasGozo: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Data Início *</label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Data Fim *</label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={form.dataFim} onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button onClick={salvar} disabled={salvando}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
                  Solicitar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
