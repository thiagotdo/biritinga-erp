'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  PlusCircle, ChevronRight, TrendingUp, Layers, AlertCircle,
  FileText, Edit3, CheckCircle, Lock,
} from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Orcamento {
  id: string
  exercicio: number
  situacao: 'ELABORACAO' | 'APROVADO_PL' | 'VIGENTE' | 'ENCERRADO'
  totalDespesa: number
  totalReceita: number
  leiNumero?: string
  leiData?: string
  observacoes?: string
}

interface Dotacao {
  id: string
  codigo: string
  descricao: string
  secretaria?: string
  natureza: string
  unidadeOrcamentaria: string
  valorOriginal: number
  valorAtual: number
  valorEmpenhado: number
  valorLiquidado: number
  valorPago: number
}

interface OrcamentoDetalhe {
  orcamento: Orcamento
  dotacoes: Dotacao[]
  resumo: {
    porSecretaria: Array<{ secretaria: string; valorAtual: number; valorEmpenhado: number; valorPago: number }>
    porNatureza:   Array<{ natureza: string; valorAtual: number; valorEmpenhado: number }>
    execucao: { valorOriginal: number; valorAtual: number; valorEmpenhado: number; valorLiquidado: number; valorPago: number; percEmpenhado: number }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct   = (v: number) => `${Number(v).toFixed(1)}%`

const SITUACAO_INFO: Record<string, { label: string; cor: string; bg: string }> = {
  ELABORACAO:  { label: 'Elaboração',   cor: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  APROVADO_PL: { label: 'Aprovado PL',  cor: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  VIGENTE:     { label: 'Vigente',      cor: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  ENCERRADO:   { label: 'Encerrado',    cor: 'text-slate-600',   bg: 'bg-slate-50 border-slate-200' },
}

const ACOES_TRANSICAO: Record<string, { acao: string; label: string; icone: React.ReactNode; cor: string }[]> = {
  ELABORACAO:  [{ acao: 'ENVIAR_PL', label: 'Enviar PL', icone: <ChevronRight size={14}/>, cor: 'bg-blue-600 hover:bg-blue-700' }],
  APROVADO_PL: [{ acao: 'APROVAR',   label: 'Aprovar e Vigorar', icone: <CheckCircle size={14}/>, cor: 'bg-emerald-600 hover:bg-emerald-700' }],
  VIGENTE:     [{ acao: 'ENCERRAR',  label: 'Encerrar', icone: <Lock size={14}/>, cor: 'bg-slate-600 hover:bg-slate-700' }],
  ENCERRADO:   [],
}

function BarraExecucao({ label, valor, total, cor }: { label: string; valor: number; total: number; cor: string }) {
  const p = total > 0 ? Math.min((valor / total) * 100, 100) : 0
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium">{pct(p)}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${cor} rounded-full transition-all`} style={{ width: `${p}%` }}/>
      </div>
    </div>
  )
}

// ─── Modal criar LOA ──────────────────────────────────────────────────────────

function ModalNovaLOA({ onClose, onSalvar }: { onClose: () => void; onSalvar: () => void }) {
  const [form, setForm] = useState({ exercicio: new Date().getFullYear() + 1, totalDespesa: '', totalReceita: '', leiNumero: '', observacoes: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar() {
    setSalvando(true); setErro('')
    try {
      const r = await fetch('/api/sefin/orcamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'LOA', ...form, totalDespesa: Number(form.totalDespesa), totalReceita: Number(form.totalReceita) }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.erro ?? 'Erro'); }
      onSalvar()
    } catch (e: any) { setErro(e.message) }
    setSalvando(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-5">Nova LOA</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Exercício</label>
            <input type="number" value={form.exercicio} onChange={e => setForm(f => ({...f, exercicio: Number(e.target.value)}))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total Despesa (R$)</label>
              <input type="number" value={form.totalDespesa} onChange={e => setForm(f => ({...f, totalDespesa: e.target.value}))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total Receita (R$)</label>
              <input type="number" value={form.totalReceita} onChange={e => setForm(f => ({...f, totalReceita: e.target.value}))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00"/>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Número da Lei</label>
            <input type="text" value={form.leiNumero} onChange={e => setForm(f => ({...f, leiNumero: e.target.value}))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Lei n.º 001/2027"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
            <textarea value={form.observacoes} onChange={e => setForm(f => ({...f, observacoes: e.target.value}))} rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
          </div>
          {erro && <p className="text-red-600 text-sm">{erro}</p>}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {salvando ? 'Criando…' : 'Criar LOA'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal adicionar dotação ──────────────────────────────────────────────────

function ModalDotacao({ orcamentoId, onClose, onSalvar }: { orcamentoId: string; onClose: () => void; onSalvar: () => void }) {
  const [form, setForm] = useState({
    unidadeGestora: '02', unidadeOrcamentaria: '', funcao: '', subfuncao: '',
    programa: '', acao: '', natureza: 'OUTRAS_CORRENTES', fonte: '00',
    codigo: '', descricao: '', valorOriginal: '', secretaria: '',
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({...f, [k]: e.target.value}))

  async function salvar() {
    setSalvando(true); setErro('')
    try {
      const r = await fetch('/api/sefin/orcamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'DOTACAO', orcamentoId, dotacao: { ...form, valorOriginal: Number(form.valorOriginal) } }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.erro ?? 'Erro') }
      onSalvar()
    } catch (e: any) { setErro(e.message) }
    setSalvando(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-slate-800 mb-5">Nova Dotação</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            ['Unidade Gestora', 'unidadeGestora', '02'],
            ['Unidade Orçamentária', 'unidadeOrcamentaria', '02.01'],
            ['Função', 'funcao', '04'],
            ['Subfunção', 'subfuncao', '122'],
            ['Programa', 'programa', '0001'],
            ['Ação', 'acao', '2001'],
            ['Fonte', 'fonte', '00'],
            ['Código Reduzido', 'codigo', '100'],
          ].map(([label, key, placeholder]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
              <input type="text" value={(form as any)[key]} onChange={set(key)} placeholder={placeholder}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Secretaria</label>
            <input type="text" value={form.secretaria} onChange={set('secretaria')} placeholder="Ex: Secretaria de Administração"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Natureza da Despesa</label>
            <select value={form.natureza} onChange={set('natureza')}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {['PESSOAL_ENCARGOS','JUROS_ENCARGOS_DIVIDA','OUTRAS_CORRENTES','INVESTIMENTOS','INVERSOES_FINANCEIRAS','AMORTIZACAO_DIVIDA'].map(n => (
                <option key={n} value={n}>{n.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <input type="text" value={form.descricao} onChange={set('descricao')} placeholder="Manutenção Administrativa"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
            <input type="number" value={form.valorOriginal} onChange={set('valorOriginal')} placeholder="0.00"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
        </div>
        {erro && <p className="text-red-600 text-sm mt-3">{erro}</p>}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {salvando ? 'Salvando…' : 'Adicionar Dotação'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Painel de orçamento ──────────────────────────────────────────────────────

function PainelOrcamento({ detalhe, onAtualizar }: { detalhe: OrcamentoDetalhe; onAtualizar: () => void }) {
  const { orcamento, dotacoes, resumo } = detalhe
  const [showModalDot, setShowModalDot] = useState(false)
  const [transicionando, setTransicionando] = useState(false)
  const sit = SITUACAO_INFO[orcamento.situacao]

  async function transicionar(acao: string) {
    setTransicionando(true)
    await fetch('/api/sefin/orcamento', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orcamento.id, acao }),
    })
    onAtualizar()
    setTransicionando(false)
  }

  const exec = resumo.execucao

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-bold text-slate-800">LOA {orcamento.exercicio}</h2>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${sit.bg} ${sit.cor}`}>{sit.label}</span>
          </div>
          {orcamento.leiNumero && <p className="text-sm text-slate-500">{orcamento.leiNumero}</p>}
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {ACOES_TRANSICAO[orcamento.situacao]?.map(a => (
            <button key={a.acao} onClick={() => transicionar(a.acao)} disabled={transicionando}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50 ${a.cor}`}>
              {a.icone}{a.label}
            </button>
          ))}
          {orcamento.situacao !== 'ENCERRADO' && (
            <button onClick={() => setShowModalDot(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700">
              <PlusCircle size={12}/> Dotação
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
        {[
          { label: 'Orçado',     valor: exec.valorAtual,     cor: 'text-slate-800' },
          { label: 'Empenhado',  valor: exec.valorEmpenhado, cor: 'text-amber-700'  },
          { label: 'Liquidado',  valor: exec.valorLiquidado, cor: 'text-blue-700'   },
          { label: 'Pago',       valor: exec.valorPago,      cor: 'text-emerald-700' },
        ].map(kpi => (
          <div key={kpi.label} className="p-4">
            <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
            <p className={`text-base font-bold ${kpi.cor}`}>{moeda(kpi.valor)}</p>
          </div>
        ))}
      </div>

      {/* Barras */}
      <div className="p-5 border-b border-slate-100">
        <BarraExecucao label="Empenhado / Orçado"  valor={exec.valorEmpenhado} total={exec.valorAtual} cor="bg-amber-400"/>
        <BarraExecucao label="Liquidado / Orçado"  valor={exec.valorLiquidado} total={exec.valorAtual} cor="bg-blue-400"/>
        <BarraExecucao label="Pago / Orçado"       valor={exec.valorPago}      total={exec.valorAtual} cor="bg-emerald-500"/>
      </div>

      {/* Dotações */}
      <div className="p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Dotações ({dotacoes.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-100">
                {['Código', 'Descrição', 'Secretaria', 'Natureza', 'Orçado', 'Empenhado', 'Pago'].map(h => (
                  <th key={h} className="pb-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dotacoes.map(d => (
                <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-2 pr-4 font-mono text-xs text-slate-600">{d.codigo}</td>
                  <td className="py-2 pr-4 text-slate-700">{d.descricao}</td>
                  <td className="py-2 pr-4 text-slate-500 text-xs">{d.secretaria ?? '—'}</td>
                  <td className="py-2 pr-4 text-xs text-slate-500">{d.natureza.replace(/_/g,' ')}</td>
                  <td className="py-2 pr-4 text-right font-medium text-slate-700 whitespace-nowrap">{moeda(d.valorAtual)}</td>
                  <td className="py-2 pr-4 text-right text-amber-700 whitespace-nowrap">{moeda(d.valorEmpenhado)}</td>
                  <td className="py-2 text-right text-emerald-700 whitespace-nowrap">{moeda(d.valorPago)}</td>
                </tr>
              ))}
              {dotacoes.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400 text-sm">Nenhuma dotação cadastrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModalDot && (
        <ModalDotacao orcamentoId={orcamento.id} onClose={() => setShowModalDot(false)}
          onSalvar={() => { setShowModalDot(false); onAtualizar() }}/>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function OrcamentoPage() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [detalhe, setDetalhe]       = useState<OrcamentoDetalhe | null>(null)
  const [exercicioSel, setExercicioSel] = useState<number | null>(null)
  const [showModalLOA, setShowModalLOA] = useState(false)
  const [carregando, setCarregando]     = useState(true)

  const carregarLista = useCallback(async () => {
    setCarregando(true)
    try {
      const r = await fetch('/api/sefin/orcamento')
      const d = await r.json()
      setOrcamentos(d.orcamentos ?? [])
      if (!exercicioSel && d.orcamentos?.length > 0) {
        setExercicioSel(d.orcamentos[0].exercicio)
      }
    } finally { setCarregando(false) }
  }, [exercicioSel])

  const carregarDetalhe = useCallback(async (exercicio: number) => {
    const r = await fetch(`/api/sefin/orcamento?exercicio=${exercicio}`)
    const d = await r.json()
    setDetalhe(d)
  }, [])

  useEffect(() => { carregarLista() }, [])
  useEffect(() => { if (exercicioSel) carregarDetalhe(exercicioSel) }, [exercicioSel])

  return (
    <div className="p-6 space-y-6">
      {/* Título */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orçamento Municipal</h1>
          <p className="text-slate-500 text-sm mt-0.5">Lei Orçamentária Anual (LOA) · Dotações · Suplementações</p>
        </div>
        <button onClick={() => setShowModalLOA(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm">
          <PlusCircle size={16}/> Nova LOA
        </button>
      </div>

      {/* Seletor de exercício */}
      {orcamentos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {orcamentos.map(o => {
            const sit = SITUACAO_INFO[o.situacao]
            return (
              <button key={o.id} onClick={() => setExercicioSel(o.exercicio)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${exercicioSel === o.exercicio ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'}`}>
                {o.exercicio}
                <span className={`ml-2 text-xs ${exercicioSel === o.exercicio ? 'text-slate-300' : sit.cor}`}>{sit.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Conteúdo */}
      {carregando ? (
        <div className="text-center py-16 text-slate-400">Carregando…</div>
      ) : orcamentos.length === 0 ? (
        <div className="text-center py-16">
          <FileText size={40} className="mx-auto text-slate-300 mb-3"/>
          <p className="text-slate-500 text-sm mb-4">Nenhum orçamento cadastrado</p>
          <button onClick={() => setShowModalLOA(true)} className="text-blue-600 text-sm font-medium hover:underline">Criar primeiro orçamento</button>
        </div>
      ) : detalhe ? (
        <PainelOrcamento detalhe={detalhe} onAtualizar={() => { carregarDetalhe(exercicioSel!); carregarLista() }}/>
      ) : null}

      {showModalLOA && (
        <ModalNovaLOA onClose={() => setShowModalLOA(false)} onSalvar={() => { setShowModalLOA(false); carregarLista() }}/>
      )}
    </div>
  )
}
