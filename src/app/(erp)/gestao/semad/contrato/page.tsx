'use client'

import { useState, useEffect, useCallback } from 'react'
import { PlusCircle, Search, Eye, X, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Contrato {
  id: string; numero: string; situacao: string
  contratadoNome: string; contratadoCnpj: string
  objeto: string; valorInicial: number; valorAtual: number; percentualAcrescimo: number
  dataAssinatura?: string; dataVigenciaInicio?: string; dataVigenciaFim?: string
  fiscalNome?: string; processoNumero?: string; criadoEm: string
  _count: { aditivos: number; medicoes: number }
  diasParaVencer?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const moeda = (v?: number | null) => v != null
  ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'
const dataFmt = (d?: string | null) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

const SIT: Record<string, { label: string; cor: string; bg: string }> = {
  MINUTA:       { label: 'Minuta',       cor: 'text-slate-600',   bg: 'bg-slate-100'   },
  ASSINADO:     { label: 'Assinado',     cor: 'text-blue-700',    bg: 'bg-blue-50'     },
  EM_EXECUCAO:  { label: 'Em Execução',  cor: 'text-emerald-700', bg: 'bg-emerald-50'  },
  SUSPENSO:     { label: 'Suspenso',     cor: 'text-amber-700',   bg: 'bg-amber-50'    },
  RESCINDIDO:   { label: 'Rescindido',   cor: 'text-red-700',     bg: 'bg-red-50'      },
  CONCLUIDO:    { label: 'Concluído',    cor: 'text-teal-700',    bg: 'bg-teal-50'     },
  EXPIRADO:     { label: 'Expirado',     cor: 'text-orange-700',  bg: 'bg-orange-50'   },
}

const ACOES_TRANSICAO: Record<string, { acao: string; label: string; cor: string }[]> = {
  MINUTA:      [{ acao: 'ASSINAR',           label: 'Assinar Contrato',  cor: 'bg-blue-600 hover:bg-blue-700'     }],
  ASSINADO:    [{ acao: 'INICIAR_EXECUCAO',  label: 'Iniciar Execução',  cor: 'bg-emerald-600 hover:bg-emerald-700'}],
  EM_EXECUCAO: [
    { acao: 'SUSPENDER',  label: 'Suspender',         cor: 'bg-amber-600 hover:bg-amber-700'  },
    { acao: 'CONCLUIR',   label: 'Concluir Contrato', cor: 'bg-teal-600 hover:bg-teal-700'    },
    { acao: 'RESCINDIR',  label: 'Rescindir',         cor: 'bg-red-600 hover:bg-red-700'      },
  ],
  SUSPENSO:    [{ acao: 'RETOMAR',           label: 'Retomar Execução',  cor: 'bg-emerald-600 hover:bg-emerald-700'}],
}

// ─── Modal Novo Contrato ───────────────────────────────────────────────────────

function ModalNovoContrato({ onClose, onSalvar }: { onClose: () => void; onSalvar: () => void }) {
  const [form, setForm] = useState({
    objeto: '', contratadoNome: '', contratadoCnpj: '', contratadoEmail: '',
    valorInicial: '', dataAssinatura: '', dataVigenciaInicio: '', dataVigenciaFim: '',
    fiscalNome: '', fiscalMatricula: '', processoNumero: '', licitacaoId: '',
    fundamentoLegal: '', observacoes: '',
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({...f, [k]: e.target.value}))

  async function salvar() {
    setSalvando(true); setErro('')
    try {
      const r = await fetch('/api/semad/contrato', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'CONTRATO', ...form, valorInicial: Number(form.valorInicial) }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.erro ?? 'Erro ao criar contrato') }
      onSalvar()
    } catch (e: any) { setErro(e.message) }
    setSalvando(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-slate-800">Novo Contrato</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Objeto do Contrato *</label>
            <textarea value={form.objeto} onChange={set('objeto')} rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contratado *</label>
              <input type="text" value={form.contratadoNome} onChange={set('contratadoNome')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ *</label>
              <input type="text" value={form.contratadoCnpj} onChange={set('contratadoCnpj')} placeholder="00.000.000/0000-00"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor Inicial (R$) *</label>
              <input type="number" value={form.valorInicial} onChange={set('valorInicial')} placeholder="0.00"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data de Assinatura</label>
              <input type="date" value={form.dataAssinatura} onChange={set('dataAssinatura')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vigência Início</label>
              <input type="date" value={form.dataVigenciaInicio} onChange={set('dataVigenciaInicio')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vigência Fim</label>
              <input type="date" value={form.dataVigenciaFim} onChange={set('dataVigenciaFim')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fiscal do Contrato</label>
              <input type="text" value={form.fiscalNome} onChange={set('fiscalNome')}
                placeholder="Art. 117 Lei 14.133/2021"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Processo Administrativo</label>
              <input type="text" value={form.processoNumero} onChange={set('processoNumero')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
          {erro && <p className="text-red-600 text-sm">{erro}</p>}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button onClick={salvar} disabled={salvando}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {salvando ? 'Criando…' : 'Criar Contrato'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Painel do contrato ───────────────────────────────────────────────────────

function PainelContrato({ id, onFechar, onAtualizar }: { id: string; onFechar: () => void; onAtualizar: () => void }) {
  const [cont, setCont] = useState<any>(null)
  const [atuando, setAtuando] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<'info'|'aditivos'|'medicoes'>('info')

  // Formulários de ação
  const [formAditivo, setFormAditivo] = useState({ tipo: 'PRAZO', dataAssinatura: '', motivoJustificativa: '', novaDataFim: '', valorAcrescimo: '' })
  const [formMedicao, setFormMedicao] = useState({ periodo: '', descricao: '', valorMedicao: '' })
  const [erroAdicao, setErroAdicao] = useState('')

  const carregar = useCallback(() => {
    fetch(`/api/semad/contrato?id=${id}`).then(r => r.json()).then(d => setCont(d.contrato))
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  async function agir(acao: string, extra: Record<string,any> = {}) {
    setAtuando(true)
    await fetch('/api/semad/contrato', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, acao, ...extra }),
    })
    carregar(); onAtualizar(); setAtuando(false)
  }

  async function adicionarAditivo() {
    setErroAdicao('')
    try {
      const r = await fetch('/api/semad/contrato', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contratoId: id, ...formAditivo, tipo: 'ADITIVO', valorAcrescimo: formAditivo.valorAcrescimo ? Number(formAditivo.valorAcrescimo) : undefined }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.erro ?? 'Erro') }
      setFormAditivo({ tipo: 'PRAZO', dataAssinatura: '', motivoJustificativa: '', novaDataFim: '', valorAcrescimo: '' })
      carregar(); onAtualizar()
    } catch (e: any) { setErroAdicao(e.message) }
  }

  async function adicionarMedicao() {
    setErroAdicao('')
    try {
      const r = await fetch('/api/semad/contrato', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'MEDICAO', contratoId: id, ...formMedicao, valorMedicao: Number(formMedicao.valorMedicao) }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.erro ?? 'Erro') }
      setFormMedicao({ periodo: '', descricao: '', valorMedicao: '' })
      carregar(); onAtualizar()
    } catch (e: any) { setErroAdicao(e.message) }
  }

  if (!cont) return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onFechar}/>
      <aside className="fixed right-0 top-0 h-full w-[500px] z-50 bg-white shadow-2xl flex items-center justify-center">
        <p className="text-slate-400 text-sm">Carregando…</p>
      </aside>
    </>
  )

  const sit = SIT[cont.situacao] ?? SIT['MINUTA']
  const acoes = ACOES_TRANSICAO[cont.situacao] ?? []
  const totalMedicoes = cont.medicoes?.reduce((s: number, m: any) => s + Number(m.valorMedicao), 0) ?? 0
  const percExec = cont.valorAtual > 0 ? Math.min(100, (totalMedicoes / Number(cont.valorAtual)) * 100) : 0

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onFechar}/>
      <aside className="fixed right-0 top-0 h-full w-[520px] z-50 bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 p-4 z-10">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-bold text-slate-800">{cont.numero}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sit.bg} ${sit.cor}`}>{sit.label}</span>
              </div>
              <p className="text-xs text-slate-500">{cont.contratadoNome} · {cont.contratadoCnpj}</p>
            </div>
            <button onClick={onFechar} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
          </div>
          {/* Abas */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {(['info','aditivos','medicoes'] as const).map(a => (
              <button key={a} onClick={() => setAbaAtiva(a)}
                className={`flex-1 py-1 text-xs font-medium rounded-md transition-all capitalize ${abaAtiva===a ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {a === 'medicoes' ? 'Medições' : a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* ABA INFO */}
          {abaAtiva === 'info' && (
            <>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Objeto</p>
                <p className="text-sm text-slate-700">{cont.objeto}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { l: 'Valor Inicial',  v: moeda(cont.valorInicial) },
                  { l: 'Valor Atual',    v: moeda(cont.valorAtual)   },
                  { l: '% Acréscimo',    v: `${Number(cont.percentualAcrescimo).toFixed(1)}%` },
                  { l: 'Aditivos',       v: `${cont._count?.aditivos ?? 0}` },
                  { l: 'Vigência Início',v: dataFmt(cont.dataVigenciaInicio) },
                  { l: 'Vigência Fim',   v: dataFmt(cont.dataVigenciaFim)   },
                  { l: 'Assinatura',     v: dataFmt(cont.dataAssinatura)    },
                  { l: 'Fiscal',         v: cont.fiscalNome ?? '—'          },
                ].map(item => (
                  <div key={item.l} className="bg-slate-50 rounded p-2">
                    <p className="text-xs text-slate-400">{item.l}</p>
                    <p className="font-medium text-slate-700 text-xs">{item.v}</p>
                  </div>
                ))}
              </div>
              {/* Execução financeira */}
              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>Execução financeira</span>
                  <span>{moeda(totalMedicoes)} / {moeda(cont.valorAtual)}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{width:`${percExec}%`}}/>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 text-right">{percExec.toFixed(1)}% executado</p>
              </div>
              {/* Ações de transição */}
              {acoes.length > 0 && (
                <div className="space-y-2 pt-2">
                  {acoes.map(a => (
                    <button key={a.acao} onClick={() => agir(a.acao)} disabled={atuando}
                      className={`w-full py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${a.cor}`}>
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ABA ADITIVOS */}
          {abaAtiva === 'aditivos' && (
            <>
              {cont.aditivos?.length > 0 ? cont.aditivos.map((a: any) => (
                <div key={a.id} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{a.numero}</span>
                    <span className="text-xs text-slate-500">{dataFmt(a.dataAssinatura)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{a.tipo.replace(/_/g,' ')}</p>
                  {a.valorAcrescimo != null && (
                    <p className="text-sm font-semibold text-emerald-700">{moeda(a.valorAcrescimo)}</p>
                  )}
                  {a.novaDataFim && <p className="text-xs text-slate-500">Nova vigência: {dataFmt(a.novaDataFim)}</p>}
                  <p className="text-xs text-slate-500 mt-1">{a.motivoJustificativa}</p>
                </div>
              )) : <p className="text-sm text-slate-400 text-center py-4">Nenhum aditivo</p>}

              {/* Formulário novo aditivo */}
              <div className="border border-dashed border-slate-300 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-600">Novo Aditivo (Art. 125 Lei 14.133)</p>
                <select value={formAditivo.tipo} onChange={e => setFormAditivo(f => ({...f, tipo: e.target.value}))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {['PRAZO','VALOR','PRAZO_E_VALOR','OBJETO','SUBCONTRATACAO','CESSAO'].map(t => (
                    <option key={t} value={t}>{t.replace(/_/g,' ')}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={formAditivo.dataAssinatura}
                    onChange={e => setFormAditivo(f => ({...f, dataAssinatura: e.target.value}))}
                    placeholder="Data assinatura"
                    className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  {['PRAZO','PRAZO_E_VALOR'].includes(formAditivo.tipo) && (
                    <input type="date" value={formAditivo.novaDataFim}
                      onChange={e => setFormAditivo(f => ({...f, novaDataFim: e.target.value}))}
                      placeholder="Nova data fim"
                      className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  )}
                  {['VALOR','PRAZO_E_VALOR'].includes(formAditivo.tipo) && (
                    <input type="number" value={formAditivo.valorAcrescimo}
                      onChange={e => setFormAditivo(f => ({...f, valorAcrescimo: e.target.value}))}
                      placeholder="Valor acréscimo (R$)"
                      className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  )}
                </div>
                <textarea value={formAditivo.motivoJustificativa}
                  onChange={e => setFormAditivo(f => ({...f, motivoJustificativa: e.target.value}))}
                  placeholder="Justificativa…" rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
                {erroAdicao && <p className="text-red-600 text-xs">{erroAdicao}</p>}
                <button onClick={adicionarAditivo}
                  className="w-full py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Adicionar Aditivo
                </button>
              </div>
            </>
          )}

          {/* ABA MEDIÇÕES */}
          {abaAtiva === 'medicoes' && (
            <>
              {cont.medicoes?.length > 0 ? cont.medicoes.map((m: any) => (
                <div key={m.id} className="flex items-start justify-between bg-slate-50 rounded-lg p-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-slate-700">Nº {m.numero} · {m.periodo}</span>
                      {m.atestado
                        ? <CheckCircle size={13} className="text-emerald-600"/>
                        : <Clock size={13} className="text-amber-500"/>}
                    </div>
                    <p className="text-xs text-slate-500">{m.descricao}</p>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-sm font-semibold text-slate-700">{moeda(m.valorMedicao)}</p>
                    {!m.atestado && (
                      <button onClick={() => agir('ATESTAR_MEDICAO', { medicaoId: m.id })}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium mt-0.5">
                        Atestar
                      </button>
                    )}
                  </div>
                </div>
              )) : <p className="text-sm text-slate-400 text-center py-4">Nenhuma medição</p>}

              {/* Formulário nova medição */}
              <div className="border border-dashed border-slate-300 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-600">Nova Medição</p>
                <div className="grid grid-cols-2 gap-2">
                  <input type="month" value={formMedicao.periodo}
                    onChange={e => setFormMedicao(f => ({...f, periodo: e.target.value}))}
                    className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  <input type="number" value={formMedicao.valorMedicao}
                    onChange={e => setFormMedicao(f => ({...f, valorMedicao: e.target.value}))}
                    placeholder="Valor (R$)"
                    className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <textarea value={formMedicao.descricao}
                  onChange={e => setFormMedicao(f => ({...f, descricao: e.target.value}))}
                  placeholder="Descrição dos serviços medidos…" rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
                {erroAdicao && <p className="text-red-600 text-xs">{erroAdicao}</p>}
                <button onClick={adicionarMedicao}
                  className="w-full py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Registrar Medição
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ContratoPage() {
  const [contratos, setContratos]   = useState<Contrato[]>([])
  const [resumo, setResumo]         = useState<any>(null)
  const [selId, setSelId]           = useState<string | null>(null)
  const [showModal, setShowModal]   = useState(false)
  const [busca, setBusca]           = useState('')
  const [filtroSit, setFiltroSit]   = useState('')
  const [soVencendo, setSoVencendo] = useState(false)
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const p = new URLSearchParams()
    if (busca)       p.set('busca', busca)
    if (filtroSit)   p.set('situacao', filtroSit)
    if (soVencendo)  p.set('vencendo', 'true')
    const r = await fetch(`/api/semad/contrato?${p}`)
    const d = await r.json()
    setContratos(d.contratos ?? [])
    setResumo(d.resumo ?? null)
    setCarregando(false)
  }, [busca, filtroSit, soVencendo])

  useEffect(() => { carregar() }, [carregar])

  const alertaVencendo = resumo?.vencendoEm60Dias ?? 0

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contratos</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestão e fiscalização — Art. 117 Lei 14.133/2021</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm">
          <PlusCircle size={16}/> Novo Contrato
        </button>
      </div>

      {/* Alerta vencendo */}
      {alertaVencendo > 0 && (
        <button onClick={() => setSoVencendo(v => !v)}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all
            ${soVencendo ? 'bg-orange-100 border-orange-400' : 'bg-orange-50 border-orange-200'}`}>
          <AlertTriangle size={18} className="text-orange-500 shrink-0"/>
          <div>
            <p className="text-sm font-semibold text-orange-800">
              {alertaVencendo} contrato{alertaVencendo > 1 ? 's' : ''} vencendo em até 60 dias
            </p>
            <p className="text-xs text-orange-600">Clique para {soVencendo ? 'ver todos' : 'filtrar'}</p>
          </div>
        </button>
      )}

      {/* KPIs */}
      {resumo && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { l: 'Total Contratos',   v: resumo.total,            cor: 'text-slate-700' },
            { l: 'Em Execução',       v: resumo.emExecucao,       cor: 'text-emerald-700' },
            { l: 'Valor Total',       v: moeda(resumo.valorTotal), cor: 'text-blue-700' },
            { l: 'Valor em Execução', v: moeda(resumo.valorEmExecucao), cor: 'text-teal-700' },
          ].map(k => (
            <div key={k.l} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-400">{k.l}</p>
              <p className={`text-lg font-bold mt-0.5 ${k.cor}`}>{k.v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por número, contratado, objeto…"
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <select value={filtroSit} onChange={e => setFiltroSit(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todas as situações</option>
          {Object.entries(SIT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Número','Contratado','Objeto','Valor Atual','Vigência Fim','Aditivos','Situação',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {carregando ? (
              <tr><td colSpan={8} className="py-10 text-center text-slate-400">Carregando…</td></tr>
            ) : contratos.length === 0 ? (
              <tr><td colSpan={8} className="py-10 text-center text-slate-400">Nenhum contrato encontrado</td></tr>
            ) : contratos.map(c => {
              const sit = SIT[c.situacao] ?? SIT['MINUTA']
              const vencendo = c.diasParaVencer != null && c.diasParaVencer <= 60
              return (
                <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${vencendo ? 'bg-orange-50/50' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">{c.numero}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700 font-medium text-xs truncate max-w-32">{c.contratadoNome}</p>
                    <p className="text-slate-400 text-xs">{c.contratadoCnpj}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700 max-w-48 truncate">{c.objeto}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <p className="text-slate-700 text-xs">{moeda(c.valorAtual)}</p>
                    {Number(c.percentualAcrescimo) > 0 && (
                      <p className="text-xs text-emerald-600">+{Number(c.percentualAcrescimo).toFixed(1)}%</p>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-xs whitespace-nowrap ${vencendo ? 'text-orange-600 font-medium' : 'text-slate-500'}`}>
                    {dataFmt(c.dataVigenciaFim)}
                    {c.diasParaVencer != null && vencendo && (
                      <span className="ml-1 text-orange-500">({c.diasParaVencer}d)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{c._count.aditivos}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sit.bg} ${sit.cor}`}>{sit.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelId(c.id)} className="text-slate-400 hover:text-blue-600"><Eye size={15}/></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selId && <PainelContrato id={selId} onFechar={() => setSelId(null)} onAtualizar={carregar}/>}
      {showModal && <ModalNovoContrato onClose={() => setShowModal(false)} onSalvar={() => { setShowModal(false); carregar() }}/>}
    </div>
  )
}
