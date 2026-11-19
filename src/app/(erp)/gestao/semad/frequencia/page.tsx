'use client'

import { useState } from 'react'
import {
  FileText, Plus, Search, ChevronRight, X, Clock, AlertTriangle,
  TrendingUp, Calendar, CheckCircle, Users, Upload, Download,
} from 'lucide-react'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Servidor { id: string; nome: string; matricula: string }

interface OcorrenciaFrequencia {
  id: string
  servidor: Servidor
  data: string
  tipo: string
  horas?: number
  justificativa?: string
  lancadoPor?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ─── Tipo de ocorrência ───────────────────────────────────────────────────────

const TIPO_INFO: Record<string, { label: string; cls: string; iconCls: string }> = {
  FALTA_JUSTIFICADA:      { label: 'Falta Justificada',      cls: 'bg-amber-100 text-amber-700',   iconCls: 'text-amber-500' },
  FALTA_INJUSTIFICADA:    { label: 'Falta Injustificada',    cls: 'bg-red-100 text-red-700',        iconCls: 'text-red-500' },
  ATRASO:                 { label: 'Atraso',                 cls: 'bg-orange-100 text-orange-700',  iconCls: 'text-orange-500' },
  SAIDA_ANTECIPADA:       { label: 'Saída Antecipada',       cls: 'bg-yellow-100 text-yellow-700',  iconCls: 'text-yellow-500' },
  HORA_EXTRA:             { label: 'Hora Extra',             cls: 'bg-emerald-100 text-emerald-700',iconCls: 'text-emerald-500' },
  DISPENSA_MEDICA:        { label: 'Dispensa Médica',        cls: 'bg-sky-100 text-sky-700',        iconCls: 'text-sky-500' },
  DISPENSA_ADMINISTRATIVA:{ label: 'Dispensa Administrativa',cls: 'bg-blue-100 text-blue-700',      iconCls: 'text-blue-500' },
  PLANTAO_EXTRA:          { label: 'Plantão Extra',          cls: 'bg-violet-100 text-violet-700',  iconCls: 'text-violet-500' },
}

// ─── Mock ─────────────────────────────────────────────────────────────────────

const getMockMes = (mes: string): OcorrenciaFrequencia[] => [
  { id: '1', servidor: { id: 's1', nome: 'Ana Carla Lima Santos', matricula: '00123' }, data: `${mes}-05T08:00:00Z`, tipo: 'ATRASO', horas: 1, justificativa: 'Trânsito' },
  { id: '2', servidor: { id: 's2', nome: 'Pedro Vieira Melo', matricula: '00287' }, data: `${mes}-08T00:00:00Z`, tipo: 'FALTA_JUSTIFICADA', justificativa: 'Consulta médica — atestado apresentado' },
  { id: '3', servidor: { id: 's3', nome: 'Carlos Mendes', matricula: '00351' }, data: `${mes}-10T00:00:00Z`, tipo: 'HORA_EXTRA', horas: 3 },
  { id: '4', servidor: { id: 's4', nome: 'Marta Souza', matricula: '00412' }, data: `${mes}-12T00:00:00Z`, tipo: 'FALTA_INJUSTIFICADA' },
  { id: '5', servidor: { id: 's5', nome: 'Rui Ferreira', matricula: '00519' }, data: `${mes}-15T00:00:00Z`, tipo: 'DISPENSA_MEDICA', horas: 4, justificativa: 'Procedimento ambulatorial' },
  { id: '6', servidor: { id: 's3', nome: 'Carlos Mendes', matricula: '00351' }, data: `${mes}-18T00:00:00Z`, tipo: 'PLANTAO_EXTRA', horas: 8 },
]

// ─── Modal nova ocorrência ────────────────────────────────────────────────────

function ModalOcorrencia({ onClose }: { onClose: () => void }) {
  const [lote, setLote] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-50 bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" /> Registrar Ocorrência
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex gap-2 mb-5 p-1 bg-slate-100 rounded-lg">
          <button onClick={() => setLote(false)} className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${!lote ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>
            Individual
          </button>
          <button onClick={() => setLote(true)} className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${lote ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>
            Lote (CSV)
          </button>
        </div>

        {!lote ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Servidor *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" placeholder="Buscar por nome ou matrícula…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Data *</label>
                <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Tipo *</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none">
                  <option value="">Selecionar…</option>
                  {Object.entries(TIPO_INFO).map(([v, i]) => <option key={v} value={v}>{i.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Horas</label>
                <input type="number" step="0.5" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" placeholder="0" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Justificativa / Observação</label>
              <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none resize-none" />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
              <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Arraste um arquivo CSV ou clique para selecionar</p>
              <p className="text-xs text-slate-400 mt-1">Colunas: matricula, data, tipo, horas, justificativa</p>
            </div>
            <button className="w-full py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> Baixar modelo CSV
            </button>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            {lote ? 'Importar Lote' : 'Registrar Ocorrência'}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function FrequenciaPage() {
  const hoje = new Date()
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  const [mesFiltro, setMesFiltro] = useState(mesAtual)
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)

  const ocorrencias = getMockMes(mesFiltro)

  const filtradas = ocorrencias.filter(o => {
    if (tipoFiltro && o.tipo !== tipoFiltro) return false
    if (busca) {
      const q = busca.toLowerCase()
      return o.servidor.nome.toLowerCase().includes(q) || o.servidor.matricula.includes(q)
    }
    return true
  })

  // Resumo do mês
  const resumo = ocorrencias.reduce((acc, o) => { acc[o.tipo] = (acc[o.tipo] || 0) + 1; return acc }, {} as Record<string, number>)
  const horasExtras = ocorrencias.filter(o => o.tipo === 'HORA_EXTRA' || o.tipo === 'PLANTAO_EXTRA').reduce((s, o) => s + (o.horas || 0), 0)
  const faltas = ocorrencias.filter(o => o.tipo.startsWith('FALTA')).length

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" /> Controle de Frequência
          </h1>
          <p className="text-sm text-slate-500">{filtradas.length} ocorrências no período</p>
        </div>
        <button onClick={() => setModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Registrar Ocorrência
        </button>
      </div>

      {/* KPIs do mês */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <FileText className="w-5 h-5 text-indigo-500" />
          <div>
            <p className="text-xs text-slate-400">Ocorrências</p>
            <p className="text-2xl font-bold text-slate-800">{ocorrencias.length}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <div>
            <p className="text-xs text-slate-400">Faltas</p>
            <p className="text-2xl font-bold text-red-700">{faltas}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-slate-400">Horas Extras</p>
            <p className="text-2xl font-bold text-emerald-700">{horasExtras}h</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <Users className="w-5 h-5 text-sky-500" />
          <div>
            <p className="text-xs text-slate-400">Servidores</p>
            <p className="text-2xl font-bold text-slate-800">{new Set(ocorrencias.map(o => o.servidor.id)).size}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="month"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={mesFiltro}
          onChange={e => setMesFiltro(e.target.value)}
        />
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Buscar por servidor…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={tipoFiltro}
          onChange={e => setTipoFiltro(e.target.value)}
        >
          <option value="">Todos os Tipos</option>
          {Object.entries(TIPO_INFO).map(([v, i]) => <option key={v} value={v}>{i.label}</option>)}
        </select>
      </div>

      {/* Resumo por tipo */}
      {Object.keys(resumo).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Resumo por Tipo</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(resumo).map(([tipo, count]) => {
              const info = TIPO_INFO[tipo] ?? { label: tipo, cls: 'bg-slate-100 text-slate-600' }
              return (
                <button
                  key={tipo}
                  onClick={() => setTipoFiltro(tipoFiltro === tipo ? '' : tipo)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${tipoFiltro === tipo ? 'ring-2 ring-offset-1 ring-indigo-400' : ''} ${info.cls} border-transparent`}
                >
                  {info.label}: {count}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-2">
        {filtradas.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhuma ocorrência no período</p>
          </div>
        ) : (
          filtradas.map(o => {
            const info = TIPO_INFO[o.tipo] ?? { label: o.tipo, cls: 'bg-slate-100 text-slate-600' }
            const isNegativa = o.tipo.startsWith('FALTA') || o.tipo === 'ATRASO' || o.tipo === 'SAIDA_ANTECIPADA'
            return (
              <div
                key={o.id}
                className={`bg-white rounded-xl border p-4 flex items-center gap-4 hover:shadow-sm transition-all ${isNegativa ? 'border-l-4 border-l-red-300 border-slate-200' : 'border-slate-200'}`}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm shrink-0">
                  {o.servidor.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{o.servidor.nome}</p>
                  <p className="text-xs text-slate-500">Mat. {o.servidor.matricula}</p>
                  {o.justificativa && <p className="text-xs text-slate-400 mt-0.5 truncate">{o.justificativa}</p>}
                </div>

                {/* Data */}
                <div className="text-right hidden sm:block shrink-0">
                  <p className="text-xs text-slate-400">Data</p>
                  <p className="text-sm font-medium text-slate-700">{fmtData(o.data)}</p>
                </div>

                {/* Horas */}
                {o.horas && (
                  <div className="text-right hidden md:block shrink-0">
                    <p className="text-xs text-slate-400">Horas</p>
                    <p className="text-sm font-bold text-slate-700">{o.horas}h</p>
                  </div>
                )}

                {/* Tipo */}
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${info.cls} shrink-0`}>
                  {info.label}
                </span>
              </div>
            )
          })
        )}
      </div>

      {modal && <ModalOcorrencia onClose={() => setModal(false)} />}
    </div>
  )
}
