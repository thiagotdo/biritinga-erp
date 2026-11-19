'use client'

import { useState, useEffect, useCallback } from 'react'
import { PlusCircle, TrendingUp, TrendingDown, AlertCircle, X, CheckCircle, Ban } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ReceitaPrevista {
  id: string
  codigo: string
  descricao: string
  natureza: string
  fonte: string
  valorPrevisto: number
  lancamentos: LancamentoReceita[]
  totais: { arrecadado: number; lancada: number; previsto: number; saldo: number; percArrecadado: string }
}

interface LancamentoReceita {
  id: string
  valor: number
  competencia: string
  situacao: 'LANCADA' | 'ARRECADADA' | 'CANCELADA'
  documentoOrigem?: string
  descricao?: string
  dataArrecadacao?: string
  receitaPrevista?: { codigo: string; descricao: string; natureza: string }
}

interface ResumoReceita {
  porNatureza: Array<{ natureza: string; previsto: number; arrecadado: number }>
  total: { previsto: number; arrecadado: number }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct   = (v: string | number) => `${Number(v).toFixed(1)}%`

function competenciaLabel(c: string) {
  const [ano, mes] = c.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${nomes[Number(mes)-1]}/${ano}`
}

const NATUREZA_LABELS: Record<string, string> = {
  TRIBUTARIA:              'Tributária',
  CONTRIBUICOES:           'Contribuições',
  PATRIMONIAL:             'Patrimonial',
  AGROPECUARIA:            'Agropecuária',
  INDUSTRIAL:              'Industrial',
  SERVICOS:                'Serviços',
  TRANSFERENCIAS_CORRENTES:'Transferências Correntes',
  OUTRAS_CORRENTES:        'Outras Correntes',
  OPERACOES_CREDITO:       'Operações de Crédito',
  ALIENACAO_BENS:          'Alienação de Bens',
  TRANSFERENCIAS_CAPITAL:  'Transferências de Capital',
  OUTRAS_CAPITAL:          'Outras de Capital',
}

const SIT_INFO: Record<string, { label: string; cor: string; bg: string }> = {
  LANCADA:    { label: 'Lançada',    cor: 'text-amber-700',   bg: 'bg-amber-50'   },
  ARRECADADA: { label: 'Arrecadada', cor: 'text-emerald-700', bg: 'bg-emerald-50' },
  CANCELADA:  { label: 'Cancelada',  cor: 'text-red-600',     bg: 'bg-red-50'     },
}

// ─── Modal novo lançamento ────────────────────────────────────────────────────

function ModalLancamento({ receitas, onClose, onSalvar }: { receitas: ReceitaPrevista[]; onClose: () => void; onSalvar: () => void }) {
  const hoje = new Date()
  const [form, setForm] = useState({
    receitaPrevistaId: '',
    valor: '',
    situacao: 'ARRECADADA',
    competencia: `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}`,
    documentoOrigem: '',
    descricao: '',
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({...f, [k]: e.target.value}))

  async function salvar() {
    setSalvando(true); setErro('')
    try {
      const r = await fetch('/api/sefin/receita', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, valor: Number(form.valor) }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.erro ?? 'Erro') }
      onSalvar()
    } catch (e: any) { setErro(e.message) }
    setSalvando(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-slate-800">Registrar Arrecadação</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Receita</label>
            <select value={form.receitaPrevistaId} onChange={set('receitaPrevistaId')}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Selecionar receita…</option>
              {receitas.map(r => (
                <option key={r.id} value={r.id}>{r.codigo} — {r.descricao}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
              <input type="number" value={form.valor} onChange={set('valor')} placeholder="0.00"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Competência</label>
              <input type="month" value={form.competencia} onChange={set('competencia')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Situação</label>
            <select value={form.situacao} onChange={set('situacao')}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="ARRECADADA">Arrecadada</option>
              <option value="LANCADA">Lançada (aguardando confirmação)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Documento de Origem</label>
            <input type="text" value={form.documentoOrigem} onChange={set('documentoOrigem')} placeholder="DAM, GRU, Nota…"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <input type="text" value={form.descricao} onChange={set('descricao')}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          {erro && <p className="text-red-600 text-sm">{erro}</p>}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {salvando ? 'Salvando…' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Painel de receita prevista ───────────────────────────────────────────────

function PainelReceita({ receita, onFechar, onAtualizar }: { receita: ReceitaPrevista; onFechar: () => void; onAtualizar: () => void }) {
  async function acao(id: string, acaoStr: string) {
    await fetch('/api/sefin/receita', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, acao: acaoStr }),
    })
    onAtualizar()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onFechar}/>
      <aside className="fixed right-0 top-0 h-full w-96 z-50 bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex justify-between items-start">
          <div>
            <p className="text-xs font-mono text-slate-500 mb-0.5">{receita.codigo}</p>
            <h2 className="font-bold text-slate-800">{receita.descricao}</h2>
            <p className="text-xs text-slate-500">{NATUREZA_LABELS[receita.natureza]}</p>
          </div>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 mt-1"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-5">
          {/* Totais */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Previsto',    valor: receita.totais.previsto,    cor: 'text-slate-700' },
              { label: 'Arrecadado',  valor: receita.totais.arrecadado,  cor: 'text-emerald-700' },
              { label: 'Saldo',       valor: receita.totais.saldo,       cor: receita.totais.saldo < 0 ? 'text-red-600' : 'text-blue-700' },
              { label: '% Arrecadado',valor: null, pct: receita.totais.percArrecadado, cor: 'text-slate-700' },
            ].map(item => (
              <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-0.5">{item.label}</p>
                <p className={`text-sm font-bold ${item.cor}`}>
                  {item.pct !== undefined ? `${item.pct}%` : moeda(item.valor as number)}
                </p>
              </div>
            ))}
          </div>

          {/* Lançamentos */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Lançamentos ({receita.lancamentos.length})</p>
            {receita.lancamentos.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Nenhum lançamento</p>
            ) : (
              <div className="space-y-2">
                {receita.lancamentos.map(l => {
                  const sit = SIT_INFO[l.situacao]
                  return (
                    <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${sit.bg} ${sit.cor} font-medium`}>{sit.label}</span>
                          <span className="text-xs text-slate-500">{competenciaLabel(l.competencia)}</span>
                        </div>
                        {l.documentoOrigem && <p className="text-xs text-slate-400 mt-0.5">{l.documentoOrigem}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm text-emerald-700">{moeda(Number(l.valor))}</p>
                        {l.situacao === 'LANCADA' && (
                          <div className="flex gap-1 mt-1">
                            <button onClick={() => acao(l.id, 'CONFIRMAR')} title="Confirmar" className="text-emerald-600 hover:text-emerald-700"><CheckCircle size={13}/></button>
                            <button onClick={() => acao(l.id, 'CANCELAR')} title="Cancelar" className="text-red-500 hover:text-red-600"><Ban size={13}/></button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ReceitaPage() {
  const [receitas, setReceitas]           = useState<ReceitaPrevista[]>([])
  const [recentes, setRecentes]           = useState<LancamentoReceita[]>([])
  const [resumo, setResumo]               = useState<ResumoReceita | null>(null)
  const [receitaSel, setReceitaSel]       = useState<ReceitaPrevista | null>(null)
  const [showModal, setShowModal]         = useState(false)
  const [exercicio, setExercicio]         = useState(new Date().getFullYear())
  const [competencia, setCompetencia]     = useState('')
  const [carregando, setCarregando]       = useState(true)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const params = new URLSearchParams({ exercicio: String(exercicio) })
    if (competencia) params.set('competencia', competencia)
    const r = await fetch(`/api/sefin/receita?${params}`)
    const d = await r.json()
    setReceitas(d.receitas ?? [])
    setRecentes(d.lancamentosRecentes ?? [])
    setResumo(d.resumo ?? null)
    setCarregando(false)
  }, [exercicio, competencia])

  useEffect(() => { carregar() }, [carregar])

  const percGeral = resumo && resumo.total.previsto > 0
    ? ((resumo.total.arrecadado / resumo.total.previsto) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="p-6 space-y-6">
      {/* Título */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Receitas</h1>
          <p className="text-slate-500 text-sm mt-0.5">Previsão e arrecadação por natureza (PCASP)</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 shadow-sm">
          <PlusCircle size={16}/> Registrar Arrecadação
        </button>
      </div>

      {/* KPIs gerais */}
      {resumo && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Previsto</p>
            <p className="text-xl font-bold text-slate-800">{moeda(resumo.total.previsto)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Arrecadado</p>
            <p className="text-xl font-bold text-emerald-700">{moeda(resumo.total.arrecadado)}</p>
            <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(Number(percGeral), 100)}%` }}/>
            </div>
            <p className="text-xs text-slate-500 mt-1">{percGeral}% do previsto</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Saldo a Arrecadar</p>
            <p className={`text-xl font-bold ${resumo.total.previsto - resumo.total.arrecadado < 0 ? 'text-red-600' : 'text-blue-700'}`}>
              {moeda(resumo.total.previsto - resumo.total.arrecadado)}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-5 gap-6">
        {/* Tabela de receitas */}
        <div className="col-span-3 space-y-4">
          {/* Filtros */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex gap-3 shadow-sm">
            <input type="number" value={exercicio} onChange={e => setExercicio(Number(e.target.value))} min={2020} max={2099}
              className="border rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            <input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            {competencia && (
              <button onClick={() => setCompetencia('')} className="text-slate-400 hover:text-slate-600 text-xs">Limpar</button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Código', 'Descrição', 'Previsto', 'Arrecadado', '%'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {carregando ? (
                  <tr><td colSpan={5} className="py-10 text-center text-slate-400">Carregando…</td></tr>
                ) : receitas.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-slate-400">Nenhuma receita cadastrada</td></tr>
                ) : receitas.map(r => (
                  <tr key={r.id} onClick={() => setReceitaSel(r)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.codigo}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 truncate max-w-48">{r.descricao}</p>
                      <p className="text-xs text-slate-400">{NATUREZA_LABELS[r.natureza]}</p>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-slate-700">{moeda(r.totais.previsto)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-emerald-700 font-medium">{moeda(r.totais.arrecadado)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-12">
                          <div className={`h-full rounded-full ${Number(r.totais.percArrecadado) >= 100 ? 'bg-emerald-500' : 'bg-blue-400'}`}
                            style={{ width: `${Math.min(Number(r.totais.percArrecadado), 100)}%` }}/>
                        </div>
                        <span className="text-xs text-slate-500 w-12 text-right">{r.totais.percArrecadado}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lançamentos recentes */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700 text-sm">Lançamentos Recentes</h3>
            </div>
            <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
              {recentes.length === 0 ? (
                <p className="py-8 text-center text-slate-400 text-sm">Nenhum lançamento</p>
              ) : recentes.map(l => {
                const sit = SIT_INFO[l.situacao]
                return (
                  <div key={l.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{l.receitaPrevista?.descricao}</p>
                        <p className="text-xs text-slate-400">{competenciaLabel(l.competencia)}</p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-sm font-bold text-emerald-700">{moeda(Number(l.valor))}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${sit.bg} ${sit.cor}`}>{sit.label}</span>
                      </div>
                    </div>
                    {l.documentoOrigem && <p className="text-xs text-slate-400 mt-1">{l.documentoOrigem}</p>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Por natureza */}
          {resumo && resumo.porNatureza.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm mt-4">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-700 text-sm">Por Natureza</h3>
              </div>
              <div className="p-4 space-y-3">
                {resumo.porNatureza.map(n => (
                  <div key={n.natureza}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 truncate max-w-36">{NATUREZA_LABELS[n.natureza] ?? n.natureza}</span>
                      <span className="text-slate-500 ml-2">{n.previsto > 0 ? pct((n.arrecadado / n.previsto)*100) : '—'}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full"
                        style={{ width: n.previsto > 0 ? `${Math.min((n.arrecadado/n.previsto)*100, 100)}%` : '0%' }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {receitaSel && (
        <PainelReceita receita={receitaSel} onFechar={() => setReceitaSel(null)}
          onAtualizar={() => { carregar(); setReceitaSel(null) }}/>
      )}
      {showModal && (
        <ModalLancamento receitas={receitas} onClose={() => setShowModal(false)}
          onSalvar={() => { setShowModal(false); carregar() }}/>
      )}
    </div>
  )
}
