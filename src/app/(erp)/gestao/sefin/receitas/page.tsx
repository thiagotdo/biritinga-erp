'use client'

import { useState } from 'react'
import {
  TrendingUp, Plus, Search, ChevronRight, X, CheckCircle,
  Clock, XCircle, DollarSign, Calendar, ArrowUpRight, Landmark,
} from 'lucide-react'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Receita {
  id: string
  exercicio: number
  natureza: string
  tipoTransferencia?: string
  descricao: string
  mes: number
  valorPrevisto: number
  valorArrecadado: number
  status: string
  dataArrecadacao?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtPct(a: number, b: number) {
  return b > 0 ? ((a / b) * 100).toFixed(1) + '%' : '0%'
}

const MESES = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// ─── Status ───────────────────────────────────────────────────────────────────

const STATUS_INFO: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  PREVISTA:    { label: 'Prevista',    cls: 'bg-slate-100 text-slate-500',      icon: Clock },
  LANCADA:     { label: 'Lançada',     cls: 'bg-blue-100 text-blue-700',        icon: Clock },
  ARRECADADA:  { label: 'Arrecadada', cls: 'bg-emerald-100 text-emerald-700',  icon: CheckCircle },
  CANCELADA:   { label: 'Cancelada',  cls: 'bg-red-100 text-red-600',          icon: XCircle },
}

// ─── Natureza ─────────────────────────────────────────────────────────────────

const NATUREZA_INFO: Record<string, { label: string; cls: string }> = {
  TRIBUTARIA:              { label: 'Tributária',          cls: 'bg-indigo-100 text-indigo-700' },
  TRANSFERENCIAS_CORRENTES:{ label: 'Transferências',      cls: 'bg-sky-100 text-sky-700' },
  PATRIMONIAL:             { label: 'Patrimonial',         cls: 'bg-amber-100 text-amber-700' },
  SERVICOS:                { label: 'Serviços',            cls: 'bg-violet-100 text-violet-700' },
  OUTRAS_CORRENTES:        { label: 'Outras Correntes',    cls: 'bg-slate-100 text-slate-600' },
  OPERACOES_CREDITO:       { label: 'Op. de Crédito',      cls: 'bg-orange-100 text-orange-700' },
  ALIENACAO_BENS:          { label: 'Alienação de Bens',   cls: 'bg-pink-100 text-pink-700' },
  TRANSFERENCIAS_CAPITAL:  { label: 'Transf. Capital',     cls: 'bg-teal-100 text-teal-700' },
  OUTRAS_CAPITAL:          { label: 'Outras Capital',      cls: 'bg-slate-100 text-slate-500' },
}

const TRANSFERENCIA_LABEL: Record<string, string> = {
  FPM: 'FPM', ICMS: 'ICMS', IPVA: 'IPVA', ITR: 'ITR',
  FUNDEB: 'FUNDEB', SUS: 'SUS', FNAS: 'FNAS', FNDE: 'FNDE',
  CONVENIO: 'Convênio', EMENDA: 'Emenda Parl.', ROYALTIES: 'Royalties', OUTRAS: 'Outras',
}

// ─── Mock ─────────────────────────────────────────────────────────────────────

const MOCK: Receita[] = [
  { id: '1', exercicio: 2026, natureza: 'TRANSFERENCIAS_CORRENTES', tipoTransferencia: 'FPM', descricao: 'Fundo de Participação dos Municípios — novembro/2026', mes: 11, valorPrevisto: 850_000, valorArrecadado: 870_240, status: 'ARRECADADA', dataArrecadacao: '2026-11-10T10:00:00Z' },
  { id: '2', exercicio: 2026, natureza: 'TRANSFERENCIAS_CORRENTES', tipoTransferencia: 'ICMS', descricao: 'Cota-parte do ICMS — novembro/2026', mes: 11, valorPrevisto: 320_000, valorArrecadado: 0, status: 'PREVISTA' },
  { id: '3', exercicio: 2026, natureza: 'TRIBUTARIA', descricao: 'ISS — Imposto Sobre Serviços — novembro/2026', mes: 11, valorPrevisto: 48_000, valorArrecadado: 51_200, status: 'ARRECADADA', dataArrecadacao: '2026-11-08T09:00:00Z' },
  { id: '4', exercicio: 2026, natureza: 'TRANSFERENCIAS_CORRENTES', tipoTransferencia: 'SUS', descricao: 'Transferências do SUS — Bloco Atenção Básica', mes: 11, valorPrevisto: 180_000, valorArrecadado: 180_000, status: 'ARRECADADA', dataArrecadacao: '2026-11-05T00:00:00Z' },
  { id: '5', exercicio: 2026, natureza: 'TRIBUTARIA', descricao: 'IPTU — Imposto Predial e Territorial Urbano', mes: 11, valorPrevisto: 25_000, valorArrecadado: 18_400, status: 'LANCADA' },
  { id: '6', exercicio: 2026, natureza: 'TRANSFERENCIAS_CORRENTES', tipoTransferencia: 'FUNDEB', descricao: 'FUNDEB — complementação federal — novembro/2026', mes: 11, valorPrevisto: 420_000, valorArrecadado: 0, status: 'PREVISTA' },
]

// ─── Painel detalhe ───────────────────────────────────────────────────────────

function PainelReceita({ rec, onClose }: { rec: Receita; onClose: () => void }) {
  const sit = STATUS_INFO[rec.status] ?? { label: rec.status, cls: 'bg-slate-100 text-slate-500', icon: Clock }
  const SitIcon = sit.icon
  const nat = NATUREZA_INFO[rec.natureza] ?? { label: rec.natureza, cls: 'bg-slate-100 text-slate-600' }
  const pct = rec.valorPrevisto > 0 ? (rec.valorArrecadado / rec.valorPrevisto * 100) : 0

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md bg-white h-full shadow-xl flex flex-col">

        <div className="p-5 border-b border-slate-200 bg-emerald-50 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900">{rec.descricao}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${nat.cls}`}>{nat.label}</span>
              {rec.tipoTransferencia && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700">
                  {TRANSFERENCIA_LABEL[rec.tipoTransferencia] ?? rec.tipoTransferencia}
                </span>
              )}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sit.cls}`}>
                <SitIcon className="w-3 h-3" /> {sit.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg shrink-0"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-400">Previsto</p>
              <p className="font-bold text-slate-800 text-lg">{fmtMoeda(rec.valorPrevisto)}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-400">Arrecadado</p>
              <p className="font-bold text-emerald-700 text-lg">{fmtMoeda(rec.valorArrecadado)}</p>
            </div>
          </div>

          {/* Barra de realização */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-500">Realização</span>
              <span className="font-semibold text-slate-700">{fmtPct(rec.valorArrecadado, rec.valorPrevisto)}</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-sky-500' : 'bg-amber-400'}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <Row label="Exercício"  value={String(rec.exercicio)} />
            <Row label="Mês"        value={MESES[rec.mes]} />
            {rec.dataArrecadacao && <Row label="Data Arrec." value={new Date(rec.dataArrecadacao).toLocaleDateString('pt-BR')} />}
          </div>

          {rec.valorArrecadado > rec.valorPrevisto && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">
              Excedente: {fmtMoeda(rec.valorArrecadado - rec.valorPrevisto)} acima do previsto
            </div>
          )}
        </div>

        {rec.status !== 'ARRECADADA' && rec.status !== 'CANCELADA' && (
          <div className="p-4 border-t border-slate-200">
            <button className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-2">
              <DollarSign className="w-4 h-4" /> Registrar Arrecadação
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ReceitasPage() {
  const [receitas] = useState<Receita[]>(MOCK)
  const [busca, setBusca] = useState('')
  const [naturezaFiltro, setNaturezaFiltro] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [selecionado, setSelecionado] = useState<Receita | null>(null)
  const [modal, setModal] = useState(false)

  const filtradas = receitas.filter(r => {
    if (statusFiltro  && r.status  !== statusFiltro)  return false
    if (naturezaFiltro && r.natureza !== naturezaFiltro) return false
    if (busca) return r.descricao.toLowerCase().includes(busca.toLowerCase())
    return true
  })

  const totalPrevisto   = receitas.reduce((s, r) => s + r.valorPrevisto, 0)
  const totalArrecadado = receitas.reduce((s, r) => s + r.valorArrecadado, 0)
  const pctGeral = totalPrevisto > 0 ? (totalArrecadado / totalPrevisto * 100) : 0

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" /> Receitas
          </h1>
          <p className="text-sm text-slate-500">{filtradas.length} registros · {fmtPct(totalArrecadado, totalPrevisto)} realizado</p>
        </div>
        <button onClick={() => setModal(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Lançar Receita
        </button>
      </div>

      {/* Resumo */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-slate-500">Realização geral</p>
            <p className="text-xs text-slate-400">{fmtMoeda(totalArrecadado)} de {fmtMoeda(totalPrevisto)}</p>
          </div>
          <span className={`text-2xl font-bold ${pctGeral >= 90 ? 'text-emerald-600' : pctGeral >= 70 ? 'text-sky-600' : 'text-amber-600'}`}>
            {pctGeral.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(pctGeral, 100)}%` }} />
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="Buscar receita…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
        <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" value={naturezaFiltro} onChange={e => setNaturezaFiltro(e.target.value)}>
          <option value="">Todas Naturezas</option>
          {Object.entries(NATUREZA_INFO).map(([v, i]) => <option key={v} value={v}>{i.label}</option>)}
        </select>
        <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}>
          <option value="">Todos Status</option>
          {Object.entries(STATUS_INFO).map(([v, i]) => <option key={v} value={v}>{i.label}</option>)}
        </select>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtradas.map(r => {
          const sit = STATUS_INFO[r.status] ?? { label: r.status, cls: 'bg-slate-100 text-slate-500', icon: Clock }
          const SitIcon = sit.icon
          const nat = NATUREZA_INFO[r.natureza] ?? { label: r.natureza, cls: 'bg-slate-100 text-slate-600' }
          const pct = r.valorPrevisto > 0 ? (r.valorArrecadado / r.valorPrevisto * 100) : 0

          return (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:border-emerald-200 hover:shadow-sm cursor-pointer transition-all"
              onClick={() => setSelecionado(r)}
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <Landmark className="w-5 h-5 text-emerald-600" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{r.descricao}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${nat.cls}`}>{nat.label}</span>
                  {r.tipoTransferencia && (
                    <span className="text-xs text-slate-400">{TRANSFERENCIA_LABEL[r.tipoTransferencia]}</span>
                  )}
                  <span className="text-xs text-slate-400">{MESES[r.mes]}/{r.exercicio}</span>
                </div>
              </div>

              <div className="text-right hidden sm:block shrink-0 min-w-[120px]">
                <p className="font-bold text-slate-800">{fmtMoeda(r.valorArrecadado)}</p>
                <p className="text-xs text-slate-400">de {fmtMoeda(r.valorPrevisto)}</p>
                <div className="h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                  <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-sky-400'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>

              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sit.cls} shrink-0`}>
                <SitIcon className="w-3 h-3" /> {sit.label}
              </span>

              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </div>
          )
        })}
      </div>

      {selecionado && <PainelReceita rec={selecionado} onClose={() => setSelecionado(null)} />}
    </div>
  )
}
