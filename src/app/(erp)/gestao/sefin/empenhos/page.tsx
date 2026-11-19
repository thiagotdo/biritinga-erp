'use client'

import { useState } from 'react'
import {
  FileText, Plus, Search, ChevronRight, X, CheckCircle,
  Clock, XCircle, AlertCircle, DollarSign, Building2,
  User, Hash, ArrowUpCircle, Banknote, RotateCcw,
} from 'lucide-react'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Fornecedor { id: string; nome: string; cnpjCpf: string }
interface Unidade    { id: string; nomeUnidade: string }

interface Empenho {
  id: string
  numero: string
  exercicio: number
  dataEmissao: string
  tipoDespesa: string
  modalidadeLicitacao?: string
  descricao: string
  valorOriginal: number
  valorReforco: number
  valorAnulado: number
  valorLiquidado: number
  valorPago: number
  status: string
  fornecedor?: Fornecedor
  unidade?: Unidade
  _count: { pagamentos: number }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtCNPJ(doc: string) {
  const d = doc.replace(/\D/g, '')
  if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
  if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
  return doc
}

// ─── Info de status ───────────────────────────────────────────────────────────

const STATUS_INFO: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  EMITIDO:   { label: 'Emitido',   cls: 'bg-blue-100 text-blue-700',    icon: FileText },
  LIQUIDADO: { label: 'Liquidado', cls: 'bg-amber-100 text-amber-700',  icon: Clock },
  PAGO:      { label: 'Pago',      cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  ANULADO:   { label: 'Anulado',   cls: 'bg-red-100 text-red-600',      icon: XCircle },
  REFORCO:   { label: 'Reforçado', cls: 'bg-violet-100 text-violet-700',icon: ArrowUpCircle },
}

const TIPO_DESPESA_LABEL: Record<string, string> = {
  PESSOAL:              'Pessoal',
  ENCARGOS_SOCIAIS:     'Encargos Sociais',
  JUROS_ENCARGOS:       'Juros e Encargos',
  OUTRAS_CORRENTES:     'Outras Correntes',
  INVESTIMENTOS:        'Investimentos',
  INVERSOES_FINANCEIRAS:'Inversões Financeiras',
  AMORTIZACAO_DIVIDA:   'Amortização da Dívida',
}

const MODALIDADE_LABEL: Record<string, string> = {
  DISPENSA:          'Dispensa',
  INEXIGIBILIDADE:   'Inexigibilidade',
  PREGAO_ELETRONICO: 'Pregão Eletrônico',
  PREGAO_PRESENCIAL: 'Pregão Presencial',
  CONCORRENCIA:      'Concorrência',
  TOMADA_PRECOS:     'Tomada de Preços',
  CONVITE:           'Convite',
  CONCURSO:          'Concurso',
  LEILAO:            'Leilão',
  CREDENCIAMENTO:    'Credenciamento',
  REGISTRO_PRECO:    'Registro de Preço',
}

// ─── Mock ─────────────────────────────────────────────────────────────────────

const MOCK: Empenho[] = [
  {
    id: '1', numero: '2026/0142', exercicio: 2026, dataEmissao: '2026-11-01T00:00:00Z',
    tipoDespesa: 'OUTRAS_CORRENTES', modalidadeLicitacao: 'PREGAO_ELETRONICO',
    descricao: 'Aquisição de material de escritório para as secretarias municipais',
    valorOriginal: 48_500, valorReforco: 0, valorAnulado: 0, valorLiquidado: 48_500, valorPago: 48_500,
    status: 'PAGO',
    fornecedor: { id: 'f1', nome: 'Papelaria Central Ltda', cnpjCpf: '12345678000195' },
    unidade: { id: 'u1', nomeUnidade: 'Administração Municipal' },
    _count: { pagamentos: 1 },
  },
  {
    id: '2', numero: '2026/0143', exercicio: 2026, dataEmissao: '2026-11-05T00:00:00Z',
    tipoDespesa: 'INVESTIMENTOS', modalidadeLicitacao: 'CONCORRENCIA',
    descricao: 'Pavimentação da Rua das Flores — 1ª etapa',
    valorOriginal: 380_000, valorReforco: 0, valorAnulado: 0, valorLiquidado: 190_000, valorPago: 0,
    status: 'LIQUIDADO',
    fornecedor: { id: 'f2', nome: 'Construtora Nordeste SA', cnpjCpf: '98765432000112' },
    unidade: { id: 'u2', nomeUnidade: 'Secretaria de Obras' },
    _count: { pagamentos: 0 },
  },
  {
    id: '3', numero: '2026/0144', exercicio: 2026, dataEmissao: '2026-11-08T00:00:00Z',
    tipoDespesa: 'PESSOAL',
    descricao: 'Folha de pagamento — novembro 2026 — servidores estatutários',
    valorOriginal: 1_240_000, valorReforco: 0, valorAnulado: 0, valorLiquidado: 0, valorPago: 0,
    status: 'EMITIDO',
    unidade: { id: 'u3', nomeUnidade: 'Todas as secretarias' },
    _count: { pagamentos: 0 },
  },
  {
    id: '4', numero: '2026/0139', exercicio: 2026, dataEmissao: '2026-10-20T00:00:00Z',
    tipoDespesa: 'OUTRAS_CORRENTES', modalidadeLicitacao: 'DISPENSA',
    descricao: 'Manutenção e reparos no veículo oficial Fiat Strada (placa ABC-1234)',
    valorOriginal: 3_200, valorReforco: 0, valorAnulado: 3_200, valorLiquidado: 0, valorPago: 0,
    status: 'ANULADO',
    fornecedor: { id: 'f3', nome: 'Auto Center Rápido Me', cnpjCpf: '11122233000144' },
    unidade: { id: 'u4', nomeUnidade: 'Secretaria de Obras' },
    _count: { pagamentos: 0 },
  },
]

// ─── Painel detalhe ───────────────────────────────────────────────────────────

function PainelEmpenho({ emp, onClose }: { emp: Empenho; onClose: () => void }) {
  const sit = STATUS_INFO[emp.status] ?? { label: emp.status, cls: 'bg-slate-100 text-slate-500', icon: FileText }
  const SitIcon = sit.icon
  const valorLiquido = emp.valorOriginal + emp.valorReforco - emp.valorAnulado

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg bg-white h-full shadow-xl flex flex-col">

        <div className="p-5 border-b border-slate-200 bg-emerald-50 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900">Empenho {emp.numero}</h2>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sit.cls}`}>
                <SitIcon className="w-3 h-3" /> {sit.label}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{emp.descricao}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg shrink-0"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Valores */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Valor Original',  value: emp.valorOriginal,  cls: 'text-slate-800' },
              { label: 'Reforço',          value: emp.valorReforco,   cls: 'text-violet-700' },
              { label: 'Anulado',          value: emp.valorAnulado,   cls: 'text-red-600' },
              { label: 'Valor Líquido',    value: valorLiquido,        cls: 'text-indigo-700' },
              { label: 'Liquidado',        value: emp.valorLiquidado, cls: 'text-amber-700' },
              { label: 'Pago',             value: emp.valorPago,      cls: 'text-emerald-700' },
            ].map(({ label, value, cls }) => (
              <div key={label} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">{label}</p>
                <p className={`font-bold text-sm ${cls}`}>{fmtMoeda(value)}</p>
              </div>
            ))}
          </div>

          {/* Workflow */}
          <div className="flex items-center gap-2 text-xs">
            {['EMITIDO','LIQUIDADO','PAGO'].map((s, i) => {
              const done  = ['PAGO','LIQUIDADO','EMITIDO'].indexOf(emp.status) <= 2 - i
              const atual = emp.status === s
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full font-medium ${atual ? 'bg-emerald-600 text-white' : done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                    {done && !atual && <CheckCircle className="w-3 h-3" />}
                    {s}
                  </div>
                  {i < 2 && <ChevronRight className="w-3 h-3 text-slate-300" />}
                </div>
              )
            })}
          </div>

          {/* Dados gerais */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <Row label="Emissão"      value={fmtData(emp.dataEmissao)} />
            <Row label="Tipo Despesa" value={TIPO_DESPESA_LABEL[emp.tipoDespesa] ?? emp.tipoDespesa} />
            {emp.modalidadeLicitacao && <Row label="Modalidade" value={MODALIDADE_LABEL[emp.modalidadeLicitacao] ?? emp.modalidadeLicitacao} />}
            {emp.unidade && <Row label="Unidade" value={emp.unidade.nomeUnidade} />}
          </div>

          {/* Fornecedor */}
          {emp.fornecedor && (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Fornecedor</p>
              <p className="font-medium text-slate-800">{emp.fornecedor.nome}</p>
              <p className="text-sm text-slate-500">{fmtCNPJ(emp.fornecedor.cnpjCpf)}</p>
            </div>
          )}

        </div>

        {/* Ações */}
        <div className="p-4 border-t border-slate-200">
          {emp.status === 'EMITIDO' && (
            <div className="flex gap-2">
              <button className="flex-1 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" /> Liquidar
              </button>
              <button className="flex-1 py-2 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg text-sm font-medium hover:bg-violet-100 flex items-center justify-center gap-2">
                <ArrowUpCircle className="w-4 h-4" /> Reforço
              </button>
              <button className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-100">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}
          {emp.status === 'LIQUIDADO' && (
            <button className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-2">
              <Banknote className="w-4 h-4" /> Registrar Pagamento
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800 text-right max-w-[180px] truncate">{value}</span>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function EmpenhosPage() {
  const [empenhos] = useState<Empenho[]>(MOCK)
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [selecionado, setSelecionado] = useState<Empenho | null>(null)

  const filtrados = empenhos.filter(e => {
    if (statusFiltro && e.status !== statusFiltro) return false
    if (busca) {
      const q = busca.toLowerCase()
      return e.numero.includes(q)
          || e.descricao.toLowerCase().includes(q)
          || e.fornecedor?.nome.toLowerCase().includes(q) === true
    }
    return true
  })

  const kpis = {
    emitidos:   empenhos.filter(e => e.status === 'EMITIDO').length,
    liquidados: empenhos.filter(e => e.status === 'LIQUIDADO').length,
    pagos:      empenhos.filter(e => e.status === 'PAGO').length,
    totalPago:  empenhos.filter(e => e.status === 'PAGO').reduce((s, e) => s + e.valorPago, 0),
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" /> Empenhos
          </h1>
          <p className="text-sm text-slate-500">{filtrados.length} empenhos encontrados</p>
        </div>
        <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Empenho
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Emitidos',  value: kpis.emitidos,  cls: 'bg-blue-50 border-blue-200 text-blue-700',    icon: FileText },
          { label: 'Liquidados',value: kpis.liquidados,cls: 'bg-amber-50 border-amber-200 text-amber-700', icon: Clock },
          { label: 'Pagos',     value: kpis.pagos,     cls: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: CheckCircle },
          { label: 'Total Pago', value: kpis.totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }), cls: 'bg-violet-50 border-violet-200 text-violet-700', icon: DollarSign },
        ].map(({ label, value, cls, icon: Icon }) => (
          <div key={label} className={`${cls} border rounded-xl p-4 flex items-center gap-3`}>
            <Icon className="w-5 h-5" />
            <div>
              <p className="text-xs opacity-70">{label}</p>
              <p className="text-xl font-bold">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="Buscar por número, descrição ou fornecedor…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          value={statusFiltro}
          onChange={e => setStatusFiltro(e.target.value)}
        >
          <option value="">Todos os Status</option>
          {Object.entries(STATUS_INFO).map(([v, i]) => <option key={v} value={v}>{i.label}</option>)}
        </select>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtrados.map(e => {
          const sit = STATUS_INFO[e.status] ?? { label: e.status, cls: 'bg-slate-100 text-slate-500', icon: FileText }
          const SitIcon = sit.icon
          return (
            <div
              key={e.id}
              className={`bg-white rounded-xl border p-4 flex items-center gap-4 hover:shadow-sm cursor-pointer transition-all ${e.status === 'ANULADO' ? 'opacity-60' : 'hover:border-emerald-200'} border-slate-200`}
              onClick={() => setSelecionado(e)}
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-slate-800">{e.numero}</span>
                  <span className="text-xs text-slate-400 hidden sm:block">· {TIPO_DESPESA_LABEL[e.tipoDespesa]}</span>
                </div>
                <p className="text-sm text-slate-600 truncate mt-0.5">{e.descricao}</p>
                {e.fornecedor && <p className="text-xs text-slate-400 mt-0.5">{e.fornecedor.nome}</p>}
              </div>

              <div className="text-right hidden sm:block shrink-0">
                <p className="font-bold text-slate-800">{fmtMoeda(e.valorOriginal)}</p>
                {e.valorPago > 0 && <p className="text-xs text-emerald-600">Pago: {fmtMoeda(e.valorPago)}</p>}
              </div>

              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sit.cls} shrink-0`}>
                <SitIcon className="w-3 h-3" /> {sit.label}
              </span>

              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </div>
          )
        })}
      </div>

      {selecionado && <PainelEmpenho emp={selecionado} onClose={() => setSelecionado(null)} />}
    </div>
  )
}
