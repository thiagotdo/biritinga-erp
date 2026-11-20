'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Plus, Search, X, AlertTriangle, TrendingUp, Users, Upload, Download, Loader2 } from 'lucide-react'

interface OcorrenciaFrequencia {
  id: string
  servidorNome: string
  matricula?: string
  data: string
  tipo: string
  horas?: number
  justificativa?: string
}

const TIPO_INFO: Record<string, { label: string; cls: string }> = {
  FALTA_JUSTIFICADA:       { label: 'Falta Justificada',       cls: 'bg-amber-100 text-amber-700' },
  FALTA_INJUSTIFICADA:     { label: 'Falta Injustificada',     cls: 'bg-red-100 text-red-700' },
  ATRASO:                  { label: 'Atraso',                  cls: 'bg-orange-100 text-orange-700' },
  SAIDA_ANTECIPADA:        { label: 'Saída Antecipada',        cls: 'bg-yellow-100 text-yellow-700' },
  HORA_EXTRA:              { label: 'Hora Extra',              cls: 'bg-emerald-100 text-emerald-700' },
  DISPENSA_MEDICA:         { label: 'Dispensa Médica',         cls: 'bg-sky-100 text-sky-700' },
  DISPENSA_ADMINISTRATIVA: { label: 'Dispensa Administrativa', cls: 'bg-blue-100 text-blue-700' },
  PLANTAO_EXTRA:           { label: 'Plantão Extra',           cls: 'bg-violet-100 text-violet-700' },
}

export default function FrequenciaPage() {
  const hoje = new Date()
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

  const [ocorrencias, setOcorrencias] = useState<OcorrenciaFrequencia[]>([])
  const [loading, setLoading] = useState(true)
  const [mesFiltro, setMesFiltro] = useState(mesAtual)
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ servidorId: '', data: '', tipo: '', horas: '', justificativa: '' })
  const [servidores, setServidores] = useState<{ id: string; nome: string; matricula: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(() => {
    setLoading(true)
    const [ano, mes] = mesFiltro.split('-')
    const params = new URLSearchParams({ mes, ano })
    if (tipoFiltro) params.set('tipo', tipoFiltro)
    fetch(`/api/semad/frequencias?${params}`)
      .then(r => r.json())
      .then(d => { setOcorrencias(d.frequencias ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [mesFiltro, tipoFiltro])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    fetch('/api/semad/servidores?limit=200')
      .then(r => r.json())
      .then(d => setServidores(d.servidores ?? []))
      .catch(() => {})
  }, [])

  const salvar = async () => {
    if (!form.servidorId || !form.data || !form.tipo) return setErro('Dados obrigatórios faltando')
    setSalvando(true); setErro('')
    const r = await fetch('/api/semad/frequencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, horas: form.horas ? Number(form.horas) : undefined }),
    })
    const d = await r.json()
    setSalvando(false)
    if (!r.ok) return setErro(d.erro ?? 'Erro ao salvar')
    setModal(false)
    setForm({ servidorId: '', data: '', tipo: '', horas: '', justificativa: '' })
    carregar()
  }

  const filtradas = ocorrencias.filter(o => {
    if (busca) {
      const q = busca.toLowerCase()
      return o.servidorNome.toLowerCase().includes(q) || (o.matricula ?? '').includes(q)
    }
    return true
  })

  const fmtData = (d: string) => new Date(d).toLocaleDateString('pt-BR')
  const horasExtras = ocorrencias.filter(o => o.tipo === 'HORA_EXTRA' || o.tipo === 'PLANTAO_EXTRA').reduce((s, o) => s + (o.horas ?? 0), 0)
  const faltas = ocorrencias.filter(o => o.tipo.startsWith('FALTA')).length
  const servidoresUnicos = new Set(ocorrencias.map(o => o.servidorNome)).size

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" /> Controle de Frequência
          </h1>
          <p className="text-sm text-gray-500">{filtradas.length} ocorrências no período</p>
        </div>
        <button onClick={() => setModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Registrar Ocorrência
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <FileText className="w-5 h-5 text-indigo-500" />
          <div>
            <p className="text-xs text-gray-400">Ocorrências</p>
            <p className="text-2xl font-bold text-gray-800">{ocorrencias.length}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <div>
            <p className="text-xs text-gray-400">Faltas</p>
            <p className="text-2xl font-bold text-red-700">{faltas}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-gray-400">Horas Extras</p>
            <p className="text-2xl font-bold text-emerald-700">{horasExtras}h</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <Users className="w-5 h-5 text-sky-500" />
          <div>
            <p className="text-xs text-gray-400">Servidores</p>
            <p className="text-2xl font-bold text-gray-800">{servidoresUnicos}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input type="month" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={mesFiltro} onChange={e => setMesFiltro(e.target.value)} />
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Buscar por servidor…" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)}>
          <option value="">Todos os Tipos</option>
          {Object.entries(TIPO_INFO).map(([v, i]) => <option key={v} value={v}>{i.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin w-6 h-6 text-indigo-600" /></div>
      ) : (
        <div className="space-y-2">
          {filtradas.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhuma ocorrência no período</p>
            </div>
          ) : filtradas.map(o => {
            const info = TIPO_INFO[o.tipo] ?? { label: o.tipo, cls: 'bg-gray-100 text-gray-600' }
            const isNeg = o.tipo.startsWith('FALTA') || o.tipo === 'ATRASO' || o.tipo === 'SAIDA_ANTECIPADA'
            return (
              <div key={o.id} className={`bg-white rounded-xl border p-4 flex items-center gap-4 hover:shadow-sm transition-all ${isNeg ? 'border-l-4 border-l-red-300 border-gray-200' : 'border-gray-200'}`}>
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm shrink-0">
                  {o.servidorNome.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{o.servidorNome}</p>
                  {o.matricula && <p className="text-xs text-gray-500">Mat. {o.matricula}</p>}
                  {o.justificativa && <p className="text-xs text-gray-400 mt-0.5 truncate">{o.justificativa}</p>}
                </div>
                <div className="text-right hidden sm:block shrink-0">
                  <p className="text-xs text-gray-400">Data</p>
                  <p className="text-sm font-medium text-gray-700">{fmtData(o.data)}</p>
                </div>
                {o.horas != null && (
                  <div className="text-right hidden md:block shrink-0">
                    <p className="text-xs text-gray-400">Horas</p>
                    <p className="text-sm font-bold text-gray-700">{o.horas}h</p>
                  </div>
                )}
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${info.cls} shrink-0`}>{info.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Registrar Ocorrência</h2>
              <button onClick={() => setModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              {erro && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{erro}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Servidor *</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={form.servidorId} onChange={e => setForm(f => ({ ...f, servidorId: e.target.value }))}>
                    <option value="">Selecionar...</option>
                    {servidores.map(s => <option key={s.id} value={s.id}>{s.nome} ({s.matricula})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Data *</label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo *</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                    <option value="">Selecionar...</option>
                    {Object.entries(TIPO_INFO).map(([v, i]) => <option key={v} value={v}>{i.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Horas</label>
                  <input type="number" step="0.5" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="0" value={form.horas} onChange={e => setForm(f => ({ ...f, horas: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Justificativa</label>
                  <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                    value={form.justificativa} onChange={e => setForm(f => ({ ...f, justificativa: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button onClick={salvar} disabled={salvando}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
                  Registrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
