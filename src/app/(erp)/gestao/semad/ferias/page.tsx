'use client'

import { useState } from 'react'
import {
  Calendar, Plus, Search, CheckCircle, Clock, XCircle,
  AlertCircle, ChevronRight, X, User, Briefcase, FileText,
  ThumbsUp, ThumbsDown, PauseCircle,
} from 'lucide-react'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Servidor { id: string; nome: string; matricula: string; cargo: { nome: string } }

interface PeriodoFerias {
  id: string
  servidor: Servidor
  exercicio: number
  dataInicio: string
  dataFim: string
  diasDireito: number
  diasGozo: number
  diasAbono: number
  status: string
  aprovadoPor?: string
  dataAprovacao?: string
  observacoes?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function diffDias(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1
}

// ─── Status info ──────────────────────────────────────────────────────────────

const STATUS_INFO: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  SOLICITADA:   { label: 'Solicitada',    cls: 'bg-amber-100 text-amber-700',    icon: Clock },
  APROVADA:     { label: 'Aprovada',      cls: 'bg-blue-100 text-blue-700',      icon: CheckCircle },
  EM_GOZO:      { label: 'Em Gozo',       cls: 'bg-emerald-100 text-emerald-700',icon: Calendar },
  CONCLUIDA:    { label: 'Concluída',     cls: 'bg-slate-100 text-slate-500',    icon: CheckCircle },
  CANCELADA:    { label: 'Cancelada',     cls: 'bg-red-100 text-red-600',        icon: XCircle },
  INTERROMPIDA: { label: 'Interrompida',  cls: 'bg-orange-100 text-orange-700',  icon: AlertCircle },
}

// ─── Mock ─────────────────────────────────────────────────────────────────────

const MOCK: PeriodoFerias[] = [
  {
    id: '1', servidor: { id: 's1', nome: 'Ana Carla Lima Santos', matricula: '00123', cargo: { nome: 'Professora' } },
    exercicio: 2026, dataInicio: '2026-11-25', dataFim: '2026-12-24', diasDireito: 30, diasGozo: 30, diasAbono: 0,
    status: 'APROVADA', aprovadoPor: 'Secretário', dataAprovacao: '2026-11-01',
  },
  {
    id: '2', servidor: { id: 's2', nome: 'Pedro Vieira Melo', matricula: '00287', cargo: { nome: 'Motorista' } },
    exercicio: 2026, dataInicio: '2026-11-01', dataFim: '2026-11-30', diasDireito: 30, diasGozo: 30, diasAbono: 0,
    status: 'EM_GOZO',
  },
  {
    id: '3', servidor: { id: 's3', nome: 'Carlos Mendes Oliveira', matricula: '00123', cargo: { nome: 'Ag. Administrativo' } },
    exercicio: 2025, dataInicio: '2026-12-01', dataFim: '2026-12-20', diasDireito: 30, diasGozo: 20, diasAbono: 10,
    status: 'SOLICITADA',
  },
  {
    id: '4', servidor: { id: 's4', nome: 'Marta Souza Ferreira', matricula: '00351', cargo: { nome: 'Professora' } },
    exercicio: 2025, dataInicio: '2026-12-15', dataFim: '2027-01-13', diasDireito: 30, diasGozo: 30, diasAbono: 0,
    status: 'SOLICITADA',
  },
]

// ─── Painel detalhe ───────────────────────────────────────────────────────────

function PainelFerias({ ferias, onClose }: { ferias: PeriodoFerias; onClose: () => void }) {
  const sit = STATUS_INFO[ferias.status] ?? { label: ferias.status, cls: 'bg-slate-100 text-slate-500', icon: Clock }
  const SitIcon = sit.icon

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md bg-white h-full shadow-xl flex flex-col">

        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-sky-50">
          <div>
            <h2 className="font-bold text-slate-900">{ferias.servidor.nome}</h2>
            <p className="text-sm text-slate-500">Exercício {ferias.exercicio}</p>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${sit.cls}`}>
              <SitIcon className="w-3 h-3" /> {sit.label}
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Período */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Período de Férias</h3>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Início</span>
              <span className="font-medium text-slate-800">{fmtData(ferias.dataInicio)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Fim</span>
              <span className="font-medium text-slate-800">{fmtData(ferias.dataFim)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total do período</span>
              <span className="font-medium text-slate-800">{diffDias(ferias.dataInicio, ferias.dataFim)} dias</span>
            </div>
          </div>

          {/* Dias */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-indigo-50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-400">Direito</p>
              <p className="text-2xl font-bold text-indigo-700">{ferias.diasDireito}</p>
            </div>
            <div className="bg-sky-50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-400">Gozo</p>
              <p className="text-2xl font-bold text-sky-700">{ferias.diasGozo}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-400">Abono</p>
              <p className="text-2xl font-bold text-amber-700">{ferias.diasAbono}</p>
            </div>
          </div>

          {/* Servidor */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Servidor</h3>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Matrícula</span>
                <span className="font-medium">{ferias.servidor.matricula}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cargo</span>
                <span className="font-medium">{ferias.servidor.cargo.nome}</span>
              </div>
            </div>
          </div>

          {/* Aprovação */}
          {ferias.aprovadoPor && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-emerald-600 uppercase mb-1">Aprovado por</p>
              <p className="text-sm font-medium text-slate-800">{ferias.aprovadoPor}</p>
              {ferias.dataAprovacao && <p className="text-xs text-slate-400 mt-0.5">{fmtData(ferias.dataAprovacao)}</p>}
            </div>
          )}

          {ferias.observacoes && (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Observações</p>
              <p className="text-sm text-slate-700">{ferias.observacoes}</p>
            </div>
          )}
        </div>

        {/* Ações */}
        {ferias.status === 'SOLICITADA' && (
          <div className="p-4 border-t border-slate-200 flex gap-2">
            <button className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-2">
              <ThumbsUp className="w-4 h-4" /> Aprovar
            </button>
            <button className="flex-1 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 flex items-center justify-center gap-2">
              <ThumbsDown className="w-4 h-4" /> Cancelar
            </button>
          </div>
        )}
        {ferias.status === 'EM_GOZO' && (
          <div className="p-4 border-t border-slate-200">
            <button className="w-full py-2.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg text-sm font-medium hover:bg-orange-100 flex items-center justify-center gap-2">
              <PauseCircle className="w-4 h-4" /> Registrar Interrupção
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal novo período ───────────────────────────────────────────────────────

function ModalNovasFerias({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-50 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-600" /> Solicitar Férias
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Servidor *</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-400 outline-none" placeholder="Buscar servidor…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Exercício *</label>
              <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-400 outline-none" defaultValue={2026} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Dias de Direito</label>
              <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-400 outline-none" defaultValue={30} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Data Início *</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-400 outline-none" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Data Fim *</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-400 outline-none" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Dias de Gozo</label>
              <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-400 outline-none" defaultValue={30} max={30} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Dias de Abono</label>
              <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-400 outline-none" defaultValue={0} max={10} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Observações</label>
            <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-400 outline-none resize-none" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button className="flex-1 py-2.5 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700">Solicitar Férias</button>
          <button onClick={onClose} className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function FeriasPage() {
  const [ferias] = useState<PeriodoFerias[]>(MOCK)
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [selecionado, setSelecionado] = useState<PeriodoFerias | null>(null)
  const [novaModal, setNovaModal] = useState(false)

  const filtradas = ferias.filter(f => {
    if (statusFiltro && f.status !== statusFiltro) return false
    if (busca) {
      const q = busca.toLowerCase()
      return f.servidor.nome.toLowerCase().includes(q) || f.servidor.matricula.includes(q)
    }
    return true
  })

  const kpis = {
    solicitadas: ferias.filter(f => f.status === 'SOLICITADA').length,
    aprovadas: ferias.filter(f => f.status === 'APROVADA').length,
    emGozo: ferias.filter(f => f.status === 'EM_GOZO').length,
    concluidas: ferias.filter(f => f.status === 'CONCLUIDA').length,
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-600" /> Gestão de Férias
          </h1>
          <p className="text-sm text-slate-500">{filtradas.length} registros encontrados</p>
        </div>
        <button onClick={() => setNovaModal(true)} className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Solicitar Férias
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Solicitadas', value: kpis.solicitadas, cls: 'bg-amber-50 border-amber-200', txtCls: 'text-amber-700', icon: Clock },
          { label: 'Aprovadas', value: kpis.aprovadas, cls: 'bg-blue-50 border-blue-200', txtCls: 'text-blue-700', icon: CheckCircle },
          { label: 'Em Gozo', value: kpis.emGozo, cls: 'bg-emerald-50 border-emerald-200', txtCls: 'text-emerald-700', icon: Calendar },
          { label: 'Concluídas', value: kpis.concluidas, cls: 'bg-slate-50 border-slate-200', txtCls: 'text-slate-600', icon: CheckCircle },
        ].map(({ label, value, cls, txtCls, icon: Icon }) => (
          <div key={label} className={`${cls} border rounded-xl p-4 flex items-center gap-3`}>
            <Icon className={`w-5 h-5 ${txtCls}`} />
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`text-2xl font-bold ${txtCls}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            placeholder="Buscar por servidor…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          value={statusFiltro}
          onChange={e => setStatusFiltro(e.target.value)}
        >
          <option value="">Todos os Status</option>
          {Object.entries(STATUS_INFO).map(([v, i]) => (
            <option key={v} value={v}>{i.label}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtradas.map(f => {
          const sit = STATUS_INFO[f.status] ?? { label: f.status, cls: 'bg-slate-100 text-slate-500', icon: Clock }
          const SitIcon = sit.icon
          const hoje = new Date()
          const inicio = new Date(f.dataInicio)
          const fim = new Date(f.dataFim)
          const corrente = hoje >= inicio && hoje <= fim

          return (
            <div
              key={f.id}
              className={`bg-white rounded-xl border p-4 flex items-center gap-4 hover:shadow-sm cursor-pointer transition-all ${corrente ? 'border-sky-300' : 'border-slate-200 hover:border-sky-200'}`}
              onClick={() => setSelecionado(f)}
            >
              <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-semibold text-sm shrink-0">
                {f.servidor.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{f.servidor.nome}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {f.servidor.cargo.nome} · Mat. {f.servidor.matricula}
                </p>
              </div>

              <div className="text-center hidden sm:block">
                <p className="text-xs text-slate-400">Exercício</p>
                <p className="font-semibold text-slate-700">{f.exercicio}</p>
              </div>

              <div className="text-center hidden md:block">
                <p className="text-xs text-slate-400">Período</p>
                <p className="text-xs font-medium text-slate-700">{fmtData(f.dataInicio)} – {fmtData(f.dataFim)}</p>
              </div>

              <div className="text-center hidden sm:block">
                <p className="text-xs text-slate-400">Dias</p>
                <p className="font-semibold text-slate-700">{f.diasGozo}+{f.diasAbono}ab</p>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sit.cls}`}>
                  <SitIcon className="w-3 h-3" /> {sit.label}
                </span>
                {corrente && <span className="text-xs font-semibold text-sky-600">Período atual</span>}
              </div>

              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </div>
          )
        })}
      </div>

      {selecionado && <PainelFerias ferias={selecionado} onClose={() => setSelecionado(null)} />}
      {novaModal && <ModalNovasFerias onClose={() => setNovaModal(false)} />}
    </div>
  )
}
