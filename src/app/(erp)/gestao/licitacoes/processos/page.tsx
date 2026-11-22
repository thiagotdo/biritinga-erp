'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Gavel, Plus, AlertTriangle, CheckCircle, Clock,
  FileText, ChevronRight, Users, Package, TrendingDown,
  Calendar, Building2, XCircle, Filter
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Modalidade = 'PREGAO' | 'CONCORRENCIA' | 'CONCURSO' | 'LEILAO'
  | 'DIALOGO_COMPETITIVO' | 'DISPENSA' | 'INEXIGIBILIDADE'
type Situacao = 'RASCUNHO' | 'PUBLICADO' | 'EM_JULGAMENTO' | 'SUSPENSO'
  | 'FRACASSADO' | 'DESERTO' | 'ADJUDICADO' | 'HOMOLOGADO' | 'CANCELADO' | 'CONTRATADO'

interface Processo {
  id: string; numero: string; anoExercicio: number
  modalidade: Modalidade; criterio: string; situacao: Situacao
  objeto: string; valorEstimado: number; valorHomologado?: number
  dataPublicacao?: string; dataAberturaPropostas?: string; dataHomologacao?: string
  agenteContratacao?: string; pregoeiro?: string; unidadeRequisitante?: string
  _count: { propostas: number; itens: number }
}

interface KPIs {
  total: number; rascunhos: number; publicados: number; emJulgamento: number
  homologados: number; cancelados: number; contratados: number
  valorEstimadoTotal: number; valorHomologadoTotal: number
  economiaTotal: number; percentualEconomia: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SIT: Record<Situacao, { label: string; color: string }> = {
  RASCUNHO:      { label: 'Rascunho',      color: 'bg-gray-100 text-gray-600' },
  PUBLICADO:     { label: 'Publicado',      color: 'bg-blue-100 text-blue-700' },
  EM_JULGAMENTO: { label: 'Em Julgamento',  color: 'bg-yellow-100 text-yellow-700' },
  SUSPENSO:      { label: 'Suspenso',       color: 'bg-orange-100 text-orange-700' },
  FRACASSADO:    { label: 'Fracassado',     color: 'bg-red-100 text-red-600' },
  DESERTO:       { label: 'Deserto',        color: 'bg-red-100 text-red-600' },
  ADJUDICADO:    { label: 'Adjudicado',     color: 'bg-purple-100 text-purple-700' },
  HOMOLOGADO:    { label: 'Homologado',     color: 'bg-teal-100 text-teal-700' },
  CANCELADO:     { label: 'Cancelado',      color: 'bg-red-200 text-red-700' },
  CONTRATADO:    { label: 'Contratado',     color: 'bg-green-100 text-green-700' },
}

const MOD_LABEL: Record<Modalidade, string> = {
  PREGAO: 'Pregão', CONCORRENCIA: 'Concorrência', CONCURSO: 'Concurso',
  LEILAO: 'Leilão', DIALOGO_COMPETITIVO: 'Diálogo Comp.',
  DISPENSA: 'Dispensa', INEXIGIBILIDADE: 'Inexigibilidade',
}

const TRANSICOES_DISPONIVEIS: Record<Situacao, { label: string; acao: string }[]> = {
  RASCUNHO:      [{ label: 'Publicar', acao: 'PUBLICADO' }, { label: 'Cancelar', acao: 'CANCELADO' }],
  PUBLICADO:     [{ label: 'Iniciar Julgamento', acao: 'EM_JULGAMENTO' }, { label: 'Declarar Deserto', acao: 'DESERTO' }, { label: 'Suspender', acao: 'SUSPENSO' }, { label: 'Cancelar', acao: 'CANCELADO' }],
  EM_JULGAMENTO: [{ label: 'Adjudicar', acao: 'ADJUDICADO' }, { label: 'Fracassado', acao: 'FRACASSADO' }, { label: 'Suspender', acao: 'SUSPENSO' }, { label: 'Cancelar', acao: 'CANCELADO' }],
  SUSPENSO:      [{ label: 'Retomar', acao: 'EM_JULGAMENTO' }, { label: 'Cancelar', acao: 'CANCELADO' }],
  ADJUDICADO:    [{ label: 'Homologar', acao: 'HOMOLOGADO' }, { label: 'Cancelar', acao: 'CANCELADO' }],
  HOMOLOGADO:    [{ label: 'Gerar Contrato', acao: '_CONTRATO' }],
  FRACASSADO:    [{ label: 'Reabrir', acao: 'PUBLICADO' }, { label: 'Cancelar', acao: 'CANCELADO' }],
  DESERTO:       [{ label: 'Reabrir', acao: 'PUBLICADO' }, { label: 'Cancelar', acao: 'CANCELADO' }],
  CANCELADO:     [],
  CONTRATADO:    [],
}

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtData(d?: string) { return d ? new Date(d).toLocaleDateString('pt-BR') : '—' }

// ─── Modal Novo Processo ──────────────────────────────────────────────────────
function ModalNovoProcesso({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    modalidade: 'PREGAO', criterio: 'MENOR_PRECO', modoDisputa: 'ABERTO',
    objeto: '', justificativa: '', valorEstimado: '',
    anoExercicio: new Date().getFullYear(),
    agenteContratacao: '', pregoeiro: '', unidadeRequisitante: '', secretariaResponsavel: '',
    dataPublicacao: '', dataAberturaPropostas: '',
    fundamentoLegal: 'Art. 28 II c/c Lei 14.133/2021',
    empenhoNumero: '', dotacaoOrcamentaria: '',
  })
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  async function salvar() {
    setSaving(true); setErro('')
    try {
      const r = await fetch('/api/licitacoes/processo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, valorEstimado: Number(form.valorEstimado) }),
      })
      const data = await r.json()
      if (!r.ok) { setErro(typeof data.erro === 'string' ? data.erro : 'Erro ao salvar'); return }
      onSaved()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex justify-between items-center">
          <h2 className="font-semibold flex items-center gap-2"><Gavel size={18} /> Novo Processo Licitatório</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          {erro && <div className="bg-red-50 text-red-700 px-3 py-2 rounded text-sm">{erro}</div>}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Modalidade *</label>
              <select value={form.modalidade} onChange={e => set('modalidade', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {Object.entries(MOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Critério *</label>
              <select value={form.criterio} onChange={e => set('criterio', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {['MENOR_PRECO','MAIOR_DESCONTO','MELHOR_TECNICA_PRECO','MELHOR_TECNICA','MAIOR_LANCE','MAIOR_RETORNO'].map(c =>
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Modo Disputa</label>
              <select value={form.modoDisputa} onChange={e => set('modoDisputa', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {['ABERTO','FECHADO','ABERTO_FECHADO'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Objeto * <span className="text-gray-400 font-normal">(descrição do que será contratado)</span></label>
            <textarea value={form.objeto} onChange={e => set('objeto', e.target.value)} rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Contratação de empresa especializada em…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor Estimado (R$) *</label>
              <input type="number" value={form.valorEstimado} onChange={e => set('valorEstimado', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="150000.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Exercício</label>
              <input type="number" value={form.anoExercicio} onChange={e => set('anoExercicio', Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Agente de Contratação</label>
              <input value={form.agenteContratacao} onChange={e => set('agenteContratacao', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pregoeiro</label>
              <input value={form.pregoeiro} onChange={e => set('pregoeiro', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unidade Requisitante</label>
              <input value={form.unidadeRequisitante} onChange={e => set('unidadeRequisitante', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Secretaria Responsável</label>
              <input value={form.secretariaResponsavel} onChange={e => set('secretariaResponsavel', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data Publicação</label>
              <input type="date" value={form.dataPublicacao} onChange={e => set('dataPublicacao', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Abertura de Propostas</label>
              <input type="date" value={form.dataAberturaPropostas} onChange={e => set('dataAberturaPropostas', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fundamento Legal</label>
              <input value={form.fundamentoLegal} onChange={e => set('fundamentoLegal', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dotação Orçamentária</label>
              <input value={form.dotacaoOrcamentaria} onChange={e => set('dotacaoOrcamentaria', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="02.06.26.782.0003.2027" />
            </div>
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={salvar} disabled={saving || !form.objeto || !form.valorEstimado}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Criando…' : 'Criar Processo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Painel detalhe ───────────────────────────────────────────────────────────
function PainelProcesso({ processo, onAtualizar }: { processo: any; onAtualizar: () => void }) {
  const [loading, setLoading] = useState(false)
  const transicoes = TRANSICOES_DISPONIVEIS[processo.situacao as Situacao] ?? []

  const economia = processo.valorHomologado
    ? ((processo.valorEstimado - processo.valorHomologado) / processo.valorEstimado * 100).toFixed(1)
    : null

  async function avancar(acao: string) {
    if (acao === '_CONTRATO') {
      // Abrir tela de contratos - apenas navegar
      return
    }
    setLoading(true)
    try {
      await fetch('/api/licitacoes/processo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: processo.id, acao: 'ALTERAR_SITUACAO', situacao: acao }),
      })
      onAtualizar()
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold font-mono">{processo.numero}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{MOD_LABEL[processo.modalidade as Modalidade]} · {processo.criterio.replace(/_/g,' ')}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${SIT[processo.situacao as Situacao].color}`}>
          {SIT[processo.situacao as Situacao].label}
        </span>
      </div>

      {/* Objeto */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500 mb-1">Objeto</p>
        <p className="text-sm">{processo.objeto}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Valor Estimado</p>
          <p className="font-bold text-sm">{fmt(processo.valorEstimado)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Valor Homologado</p>
          <p className="font-bold text-sm">{processo.valorHomologado ? fmt(processo.valorHomologado) : '—'}</p>
        </div>
        <div className={`rounded-lg p-3 text-center ${economia ? 'bg-green-50' : 'bg-gray-50'}`}>
          <p className="text-xs text-gray-500">Economia</p>
          <p className={`font-bold text-sm ${economia ? 'text-green-600' : ''}`}>
            {economia ? `${economia}%` : '—'}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2 text-sm">
        {processo.unidadeRequisitante && (
          <div className="flex justify-between">
            <span className="text-gray-500 flex items-center gap-1"><Building2 size={12} /> Unidade</span>
            <span>{processo.unidadeRequisitante}</span>
          </div>
        )}
        {processo.pregoeiro && (
          <div className="flex justify-between">
            <span className="text-gray-500">Pregoeiro</span>
            <span>{processo.pregoeiro}</span>
          </div>
        )}
        {processo.dataPublicacao && (
          <div className="flex justify-between">
            <span className="text-gray-500 flex items-center gap-1"><Calendar size={12} /> Publicação</span>
            <span>{fmtData(processo.dataPublicacao)}</span>
          </div>
        )}
        {processo.dataAberturaPropostas && (
          <div className="flex justify-between">
            <span className="text-gray-500">Abertura Propostas</span>
            <span className="font-medium">{fmtData(processo.dataAberturaPropostas)}</span>
          </div>
        )}
        {processo.dataHomologacao && (
          <div className="flex justify-between">
            <span className="text-gray-500">Homologação</span>
            <span>{fmtData(processo.dataHomologacao)}</span>
          </div>
        )}
      </div>

      {/* Propostas e itens */}
      <div className="flex gap-3">
        <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
          <Users size={16} className="mx-auto text-blue-500 mb-1" />
          <p className="text-xs text-gray-500">Propostas</p>
          <p className="font-bold">{processo._count?.propostas ?? 0}</p>
        </div>
        <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
          <Package size={16} className="mx-auto text-green-500 mb-1" />
          <p className="text-xs text-gray-500">Itens</p>
          <p className="font-bold">{processo._count?.itens ?? 0}</p>
        </div>
      </div>

      {/* Fundamento legal */}
      {processo.fundamentoLegal && (
        <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
          ⚖️ {processo.fundamentoLegal}
        </div>
      )}

      {/* Ações de transição */}
      {transicoes.length > 0 && (
        <div className="border-t pt-3">
          <p className="text-xs text-gray-500 mb-2">Avançar processo:</p>
          <div className="flex flex-wrap gap-2">
            {transicoes.map(t => (
              <button key={t.acao} onClick={() => avancar(t.acao)} disabled={loading}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors disabled:opacity-50
                  ${t.acao.includes('CANCEL') || t.acao.includes('RESCIND')
                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                    : t.acao === '_CONTRATO'
                    ? 'border-green-500 bg-green-600 text-white hover:bg-green-700'
                    : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                  }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProcessosPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [processos, setProcessos] = useState<Processo[]>([])
  const [selecionado, setSelecionado] = useState<any>(null)
  const [busca, setBusca] = useState('')
  const [filtroSit, setFiltroSit] = useState('')
  const [filtroMod, setFiltroMod] = useState('')
  const [modal, setModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [vencendoBreve, setVencendoBreve] = useState<any[]>([])

  const carregar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filtroSit) params.set('situacao', filtroSit)
    if (filtroMod) params.set('modalidade', filtroMod)
    if (busca)     params.set('busca', busca)

    const [dR, pR] = await Promise.all([
      fetch('/api/licitacoes/processo?relatorio=DASHBOARD').then(r => r.json()),
      fetch(`/api/licitacoes/processo?${params}`).then(r => r.json()),
    ])
    setKpis(dR.kpis)
    setVencendoBreve(dR.vencendoBreve ?? [])
    setProcessos(pR.processos ?? [])
    setLoading(false)
  }, [filtroSit, filtroMod, busca])

  useEffect(() => { carregar() }, [carregar])

  const atualizarSelecionado = async (id: string) => {
    const r = await fetch(`/api/licitacoes/processo?id=${id}`)
    const d = await r.json()
    setSelecionado(d.processo)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gavel size={24} className="text-blue-600" /> Processos Licitatórios
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Lei 14.133/2021 - Nova Lei de Licitações e Contratos</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <Plus size={16} /> Novo Processo
        </button>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Total', value: kpis.total, color: 'text-blue-600' },
            { label: 'Rascunhos', value: kpis.rascunhos, color: 'text-gray-500' },
            { label: 'Publicados', value: kpis.publicados, color: 'text-blue-600' },
            { label: 'Em Julgamento', value: kpis.emJulgamento, color: 'text-yellow-600' },
            { label: 'Homologados', value: kpis.homologados, color: 'text-teal-600' },
            { label: 'Contratados', value: kpis.contratados, color: 'text-green-600' },
            { label: 'Cancelados', value: kpis.cancelados, color: 'text-red-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border p-4">
              <p className={`text-xs font-medium ${color} mb-1`}>{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Valores e economia */}
      {kpis && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 mb-1">Valor Estimado Total (ano)</p>
            <p className="text-xl font-bold">{fmt(kpis.valorEstimadoTotal)}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 mb-1">Valor Homologado Total</p>
            <p className="text-xl font-bold">{fmt(kpis.valorHomologadoTotal)}</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-4">
            <p className="text-xs text-green-600 mb-1 flex items-center gap-1">
              <TrendingDown size={12} /> Economia nas Licitações
            </p>
            <p className="text-xl font-bold text-green-700">{fmt(kpis.economiaTotal)}</p>
            <p className="text-xs text-green-600">{kpis.percentualEconomia}% de redução</p>
          </div>
        </div>
      )}

      {/* Alerta prazos */}
      {vencendoBreve.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-orange-700 flex items-center gap-1 mb-2">
            <AlertTriangle size={14} /> Propostas abrindo nos próximos 15 dias
          </p>
          <div className="space-y-1">
            {vencendoBreve.map(v => (
              <div key={v.id} className="flex justify-between text-sm">
                <span className="font-mono font-semibold text-orange-800">{v.numero}</span>
                <span className="text-orange-700 flex-1 mx-3 truncate">{v.objeto.substring(0, 60)}…</span>
                <span className="text-orange-600 font-medium">{fmtData(v.dataAberturaPropostas)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Layout 2 col */}
      <div className="grid grid-cols-5 gap-4">
        {/* Lista */}
        <div className="col-span-2 bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b space-y-2">
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar nº, objeto…"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              onKeyDown={e => e.key === 'Enter' && carregar()} />
            <div className="flex gap-1 flex-wrap">
              {['', 'RASCUNHO', 'PUBLICADO', 'EM_JULGAMENTO', 'HOMOLOGADO', 'CONTRATADO'].map(s => (
                <button key={s} onClick={() => setFiltroSit(s)}
                  className={`px-2 py-0.5 rounded text-xs border transition-colors
                    ${filtroSit === s ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}>
                  {s || 'Todos'}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-y-auto max-h-[560px]">
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Carregando…</div>
            ) : processos.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">Nenhum processo encontrado</div>
            ) : processos.map(p => (
              <button key={p.id}
                onClick={async () => {
                  const r = await fetch(`/api/licitacoes/processo?id=${p.id}`)
                  const d = await r.json()
                  setSelecionado(d.processo)
                }}
                className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors
                  ${selecionado?.id === p.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm font-mono">{p.numero}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[180px]">{p.objeto.substring(0, 50)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${SIT[p.situacao].color}`}>
                      {SIT[p.situacao].label}
                    </span>
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-400">{MOD_LABEL[p.modalidade]}</span>
                  <span className="text-xs font-medium">{fmt(p.valorEstimado)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Painel */}
        <div className="col-span-3 bg-white rounded-xl border p-5 overflow-y-auto max-h-[680px]">
          {selecionado ? (
            <PainelProcesso
              processo={selecionado}
              onAtualizar={() => { carregar(); atualizarSelecionado(selecionado.id) }}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3 py-20">
              <Gavel size={40} className="opacity-30" />
              <p className="text-sm">Selecione um processo para ver os detalhes</p>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <ModalNovoProcesso
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); carregar() }}
        />
      )}
    </div>
  )
}
