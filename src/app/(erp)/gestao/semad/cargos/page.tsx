'use client'

import { useState } from 'react'
import { Award, Plus, Search, Users, ChevronRight, X, Clock, DollarSign, CheckCircle, Shield } from 'lucide-react'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Cargo {
  id: string
  nome: string
  simbolo?: string
  descricao?: string
  nivelSalarial?: string
  salarioBase?: number
  cargaHoraria: number
  requerConcurso: boolean
  comissionado: boolean
  _count: { servidores: number }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtMoeda(v?: number) {
  if (!v) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── Mock ─────────────────────────────────────────────────────────────────────

const MOCK: Cargo[] = [
  { id: '1', nome: 'Professor', simbolo: 'P-III', descricao: 'Docência ensino fundamental e médio', nivelSalarial: 'N-III', salarioBase: 3200, cargaHoraria: 40, requerConcurso: true,  comissionado: false, _count: { servidores: 108 } },
  { id: '2', nome: 'Agente Comunitário de Saúde', simbolo: 'ACS', descricao: 'Visitas domiciliares e acompanhamento de saúde', nivelSalarial: 'N-II', salarioBase: 2824, cargaHoraria: 40, requerConcurso: true,  comissionado: false, _count: { servidores: 54 } },
  { id: '3', nome: 'Assistente Administrativo', simbolo: 'AA-II', descricao: 'Apoio administrativo geral', nivelSalarial: 'N-II', salarioBase: 1800, cargaHoraria: 30, requerConcurso: true,  comissionado: false, _count: { servidores: 47 } },
  { id: '4', nome: 'Motorista', simbolo: 'M-I', descricao: 'Condução de veículos oficiais', nivelSalarial: 'N-I', salarioBase: 2200, cargaHoraria: 40, requerConcurso: true,  comissionado: false, _count: { servidores: 31 } },
  { id: '5', nome: 'Secretário Municipal', simbolo: 'SM', descricao: 'Chefia de secretaria municipal', nivelSalarial: 'CC-1', salarioBase: 6500, cargaHoraria: 40, requerConcurso: false, comissionado: true,  _count: { servidores: 9 } },
  { id: '6', nome: 'Vigia', simbolo: 'V-I', descricao: 'Vigilância patrimonial', nivelSalarial: 'N-I', salarioBase: 1500, cargaHoraria: 44, requerConcurso: true,  comissionado: false, _count: { servidores: 18 } },
]

// ─── Modal cadastro ───────────────────────────────────────────────────────────

function ModalCargo({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    nome: '', simbolo: '', descricao: '', nivelSalarial: '',
    salarioBase: '', cargaHoraria: '40',
    requerConcurso: true, comissionado: false,
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-50 bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-violet-600" /> Novo Cargo
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm text-slate-600 mb-1">Nome do Cargo *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 outline-none" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Ex: Professor Fundamental" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Símbolo</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 outline-none" value={form.simbolo} onChange={e => setForm({...form, simbolo: e.target.value})} placeholder="P-III" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Nível Salarial</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 outline-none" value={form.nivelSalarial} onChange={e => setForm({...form, nivelSalarial: e.target.value})} placeholder="N-II" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Salário Base (R$)</label>
              <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 outline-none" value={form.salarioBase} onChange={e => setForm({...form, salarioBase: e.target.value})} placeholder="2000.00" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Carga Horária (h/sem)</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 outline-none" value={form.cargaHoraria} onChange={e => setForm({...form, cargaHoraria: e.target.value})}>
                {[20, 30, 40, 44].map(h => <option key={h} value={h}>{h}h</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-slate-600 mb-1">Descrição</label>
              <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 outline-none resize-none" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.requerConcurso} onChange={e => setForm({...form, requerConcurso: e.target.checked})} className="rounded accent-violet-600" />
              <span className="text-sm text-slate-700">Requer Concurso</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.comissionado} onChange={e => setForm({...form, comissionado: e.target.checked})} className="rounded accent-violet-600" />
              <span className="text-sm text-slate-700">Cargo Comissionado</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button className="flex-1 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">Salvar Cargo</button>
          <button onClick={onClose} className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CargosPage() {
  const [cargos] = useState<Cargo[]>(MOCK)
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)

  const filtrados = cargos.filter(c =>
    !busca || c.nome.toLowerCase().includes(busca.toLowerCase()) || (c.simbolo ?? '').toLowerCase().includes(busca.toLowerCase())
  )

  const totalServidores = cargos.reduce((s, c) => s + c._count.servidores, 0)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-violet-600" /> Cargos do Quadro
          </h1>
          <p className="text-sm text-slate-500">{filtrados.length} cargos · {totalServidores} servidores no quadro</p>
        </div>
        <button onClick={() => setModal(true)} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Cargo
        </button>
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          placeholder="Buscar cargo…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtrados.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-violet-300 hover:shadow-sm transition-all">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{c.nome}</h3>
                  {c.simbolo && (
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-violet-100 text-violet-700">{c.simbolo}</span>
                  )}
                </div>
                {c.descricao && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{c.descricao}</p>}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {c.comissionado && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 font-medium flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Comissionado
                  </span>
                )}
                {c.requerConcurso && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Concurso
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-xs text-slate-400 mb-0.5">Servidores</p>
                <div className="flex items-center justify-center gap-1">
                  <Users className="w-3.5 h-3.5 text-violet-500" />
                  <span className="font-bold text-slate-800">{c._count.servidores}</span>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-xs text-slate-400 mb-0.5">Carga Horária</p>
                <div className="flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                  <span className="font-bold text-slate-800">{c.cargaHoraria}h</span>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-xs text-slate-400 mb-0.5">Salário Base</p>
                <div className="flex items-center justify-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-bold text-slate-800 text-xs">{fmtMoeda(c.salarioBase)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && <ModalCargo onClose={() => setModal(false)} />}
    </div>
  )
}
