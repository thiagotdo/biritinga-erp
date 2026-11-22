'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Shield, AlertTriangle, CheckCircle, User, Calendar } from 'lucide-react'

type SituacaoVac = 'APLICADA' | 'CONTRAINDICADA' | 'RECUSADA' | 'PENDENTE'

interface Vacina {
  id: string; nome: string; esquema: string | null; indicacaoFaixa: string | null
  viaAplicacao: string | null; doseML: number | null
}

interface DoseAplicada {
  id: string; dose: string; lote: string | null; dataAplicacao: string
  unidadeSaude: string; profissionalNome: string | null; situacao: SituacaoVac
  localAplicacao: string | null; observacoes: string | null
}

interface CarteiraItem {
  vacina: Vacina
  doses: DoseAplicada[]
}

interface EstoqueVacina {
  id: string; lote: string; dataValidade: string
  quantidadeAtual: number; quantidadeMinima: number; unidadeSaude: string
  critico: boolean; vencendo: boolean; vencido: boolean
  vacina: { id: string; nome: string }
}

interface KPIs {
  totalHoje: number; totalMes: number; estoquesCriticos: number; vencendo30: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function idadeAnos(dataNasc: string): number {
  const hoje = new Date(), nasc = new Date(dataNasc)
  let i = hoje.getFullYear() - nasc.getFullYear()
  if (hoje.getMonth() < nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())) i--
  return i
}

function ChipDose({ sit }: { sit: SituacaoVac }) {
  const map: Record<SituacaoVac, { label: string; cor: string; bg: string }> = {
    APLICADA:        { label: '✓',             cor: 'text-green-700',  bg: 'bg-green-100'  },
    CONTRAINDICADA:  { label: 'CI',            cor: 'text-orange-700', bg: 'bg-orange-100' },
    RECUSADA:        { label: 'R',             cor: 'text-red-600',    bg: 'bg-red-100'    },
    PENDENTE:        { label: '?',             cor: 'text-slate-500',  bg: 'bg-slate-100'  },
  }
  const m = map[sit]
  return <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${m.cor} ${m.bg}`}>{m.label}</span>
}

// ─── Carteira Vacinal ─────────────────────────────────────────────────────────

function CarteiraVacinal({ carteira }: { carteira: CarteiraItem[] }) {
  if (carteira.length === 0) {
    return <div className="text-center py-8 text-slate-400"><p className="text-sm">Nenhuma vacina no catálogo.</p></div>
  }

  return (
    <div className="space-y-2">
      {carteira.map(({ vacina, doses }) => (
        <div key={vacina.id} className={`border rounded-xl p-3 ${doses.length === 0 ? 'border-slate-200 bg-white' : 'border-green-200 bg-green-50'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">{vacina.nome}</p>
              {vacina.indicacaoFaixa && <p className="text-xs text-slate-500">{vacina.indicacaoFaixa}</p>}
              {vacina.esquema && <p className="text-xs text-slate-400">{vacina.esquema}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {doses.length === 0 ? (
                <span className="text-xs text-slate-400 italic">Não aplicada</span>
              ) : (
                doses.map((d, i) => (
                  <div key={d.id} title={`${d.dose} - ${new Date(d.dataAplicacao).toLocaleDateString('pt-BR')} - ${d.unidadeSaude}${d.lote ? ` - Lote ${d.lote}` : ''}`}>
                    <ChipDose sit={d.situacao} />
                  </div>
                ))
              )}
            </div>
          </div>
          {doses.length > 0 && (
            <div className="mt-2 space-y-1">
              {doses.map(d => (
                <div key={d.id} className="text-xs text-slate-500 flex items-center gap-2">
                  <ChipDose sit={d.situacao} />
                  <span className="font-medium">{d.dose}</span>
                  <span>·</span>
                  <span>{new Date(d.dataAplicacao).toLocaleDateString('pt-BR')}</span>
                  <span>·</span>
                  <span>{d.unidadeSaude}</span>
                  {d.lote && <><span>·</span><span className="font-mono">Lote {d.lote}</span></>}
                  {d.profissionalNome && <><span>·</span><span>{d.profissionalNome}</span></>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Modal aplicar vacina ─────────────────────────────────────────────────────

function ModalAplicarVacina({
  pacienteId, vacinas, estoques, onFechar, onSalvar,
}: {
  pacienteId: string
  vacinas: Vacina[]
  estoques: EstoqueVacina[]
  onFechar: () => void
  onSalvar: (d: any) => void
}) {
  const [form, setForm] = useState({
    vacinaId: '', dose: 'D1', lote: '', estoqueId: '',
    dataAplicacao: new Date().toISOString().split('T')[0],
    unidadeSaude: '', profissionalNome: '', localAplicacao: '',
    situacao: 'APLICADA', motivoContraindicacao: '', motivoRecusa: '', observacoes: '',
  })

  const F = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const estoquesVacina = estoques.filter(e => e.vacina.id === form.vacinaId && !e.vencido && e.quantidadeAtual > 0)
  const valido = form.vacinaId && form.dose && form.dataAplicacao && form.unidadeSaude

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Registrar Vacinação</h2>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600">Vacina *</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.vacinaId} onChange={e => F('vacinaId', e.target.value)}>
                <option value="">Selecionar...</option>
                {vacinas.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Dose *</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.dose} onChange={e => F('dose', e.target.value)}>
                {['D1','D2','D3','D4','DR','RC','Único','Reforço','Anual'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Situação</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
              value={form.situacao} onChange={e => F('situacao', e.target.value)}>
              <option value="APLICADA">Aplicada</option>
              <option value="CONTRAINDICADA">Contraindicada</option>
              <option value="RECUSADA">Recusada pelo paciente</option>
            </select>
          </div>

          {form.situacao === 'CONTRAINDICADA' && (
            <div>
              <label className="text-xs font-medium text-slate-600">Motivo da Contraindicação</label>
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none resize-none" rows={2}
                value={form.motivoContraindicacao} onChange={e => F('motivoContraindicacao', e.target.value)} />
            </div>
          )}

          {form.situacao === 'RECUSADA' && (
            <div>
              <label className="text-xs font-medium text-slate-600">Motivo da Recusa</label>
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none resize-none" rows={2}
                value={form.motivoRecusa} onChange={e => F('motivoRecusa', e.target.value)} />
            </div>
          )}

          {form.situacao === 'APLICADA' && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-600">Estoque / Lote (opcional)</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                  value={form.estoqueId} onChange={e => {
                    const est = estoques.find(est => est.id === e.target.value)
                    setForm(f => ({ ...f, estoqueId: e.target.value, lote: est?.lote ?? f.lote }))
                  }}>
                  <option value="">Sem baixa de estoque</option>
                  {estoquesVacina.map(e => (
                    <option key={e.id} value={e.id}>
                      Lote {e.lote} · {e.quantidadeAtual} doses · {e.unidadeSaude}
                    </option>
                  ))}
                </select>
              </div>
              {!form.estoqueId && (
                <div>
                  <label className="text-xs font-medium text-slate-600">Lote (manual)</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                    value={form.lote} onChange={e => F('lote', e.target.value)} />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-600">Local de Aplicação</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                  placeholder="Ex: Deltóide direito" value={form.localAplicacao}
                  onChange={e => F('localAplicacao', e.target.value)} />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-medium text-slate-600">Data de Aplicação *</label>
            <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
              value={form.dataAplicacao} onChange={e => F('dataAplicacao', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Unidade de Saúde *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.unidadeSaude} onChange={e => F('unidadeSaude', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Profissional</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.profissionalNome} onChange={e => F('profissionalNome', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Observações</label>
            <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none resize-none" rows={2}
              value={form.observacoes} onChange={e => F('observacoes', e.target.value)} />
          </div>
        </div>
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onFechar} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
          <button onClick={() => onSalvar({ pacienteId, ...form })} disabled={!valido}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">
            Registrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function VacinacaoPage() {
  const [aba, setAba] = useState<'carteira' | 'estoque' | 'registro'>('carteira')
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [carteira, setCarteira] = useState<CarteiraItem[]>([])
  const [estoques, setEstoques] = useState<EstoqueVacina[]>([])
  const [vacinas, setVacinas] = useState<Vacina[]>([])
  const [pacienteId, setPacienteId] = useState<string | null>(null)
  const [pacienteNome, setPacienteNome] = useState('')
  const [pacienteDtNasc, setPacienteDtNasc] = useState('')
  const [buscaPac, setBuscaPac] = useState('')
  const [pacientes, setPacientes] = useState<any[]>([])
  const [modalAplicar, setModalAplicar] = useState(false)
  const [buscaEstoque, setBuscaEstoque] = useState('')
  const [porVacina, setPorVacina] = useState<any[]>([])
  const [carregando, setCarregando] = useState(false)

  async function carregarDashboard() {
    const res = await fetch('/api/saude/vacinacao?relatorio=DASHBOARD').then(r => r.json())
    setKpis(res.kpis)
    setPorVacina(res.porVacina ?? [])
  }

  async function carregarCarteira(id: string) {
    setCarregando(true)
    const res = await fetch(`/api/saude/vacinacao?pacienteId=${id}`).then(r => r.json())
    setCarteira(res.carteira ?? [])
    setVacinas(res.carteira?.map((c: CarteiraItem) => c.vacina) ?? [])
    setCarregando(false)
  }

  async function carregarEstoques() {
    const p = new URLSearchParams({ aba: 'estoque' })
    if (buscaEstoque) p.set('busca', buscaEstoque)
    const res = await fetch(`/api/saude/vacinacao?${p}`).then(r => r.json())
    setEstoques(res.estoques ?? [])
  }

  async function buscarPacientes(q: string) {
    if (q.length < 3) return
    const res = await fetch(`/api/saude/paciente?busca=${q}&limit=10`).then(r => r.json())
    setPacientes(res.pacientes ?? [])
  }

  useEffect(() => { carregarDashboard() }, [])
  useEffect(() => { if (aba === 'estoque') carregarEstoques() }, [aba, buscaEstoque])

  async function registrarVacinacao(dados: any) {
    await fetch('/api/saude/vacinacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    setModalAplicar(false)
    if (pacienteId) carregarCarteira(pacienteId)
    carregarDashboard()
    if (aba === 'estoque') carregarEstoques()
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Vacinação - PNI</h1>
            <p className="text-sm text-slate-500 mt-0.5">Carteira vacinal, aplicações e controle de estoque</p>
          </div>
          <button onClick={() => setModalAplicar(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 shadow-sm">
            <Shield size={16}/> Registrar Vacinação
          </button>
        </div>

        {/* KPIs */}
        {kpis && (
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Aplicadas Hoje', val: kpis.totalHoje, cor: 'bg-white border border-slate-200' },
              { label: 'Aplicadas este Mês', val: kpis.totalMes, cor: 'bg-indigo-50 border border-indigo-200' },
              { label: 'Estoques Críticos', val: kpis.estoquesCriticos, cor: kpis.estoquesCriticos > 0 ? 'bg-red-50 border border-red-300' : 'bg-white border border-slate-200' },
              { label: 'Vencendo 30d', val: kpis.vencendo30, cor: kpis.vencendo30 > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-white border border-slate-200' },
            ].map(({ label, val, cor }) => (
              <div key={label} className={`${cor} rounded-xl p-4 text-center`}>
                <p className="text-3xl font-bold text-slate-800">{val}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-5 gap-5">
          {(['carteira', 'estoque', 'registro'] as const).map(t => (
            <button key={t} onClick={() => setAba(t)}
              className={`text-sm py-3 border-b-2 transition-colors ${aba === t ? 'border-indigo-500 text-indigo-600 font-medium' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t === 'carteira' ? 'Carteira Vacinal' : t === 'estoque' ? 'Estoque de Vacinas' : 'Registro do Dia'}
            </button>
          ))}
        </div>

        {/* Aba carteira */}
        {aba === 'carteira' && (
          <div className="grid grid-cols-12 gap-5">
            {/* Busca paciente */}
            <div className="col-span-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Consultar Paciente</p>
                {pacienteId ? (
                  <div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-green-800">{pacienteNome}</p>
                          {pacienteDtNasc && <p className="text-xs text-green-600">{idadeAnos(pacienteDtNasc)} anos</p>}
                        </div>
                        <button onClick={() => { setPacienteId(null); setCarteira([]); setPacienteNome(''); setPacienteDtNasc('') }}
                          className="text-green-400 hover:text-green-600">×</button>
                      </div>
                    </div>
                    <button onClick={() => setModalAplicar(true)}
                      className="w-full py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center justify-center gap-2">
                      <Plus size={14}/> Nova Aplicação
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                      placeholder="Nome, CNS, CPF..."
                      value={buscaPac}
                      onChange={e => { setBuscaPac(e.target.value); buscarPacientes(e.target.value) }} />
                    {pacientes.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                        {pacientes.map(p => (
                          <button key={p.id} onClick={() => {
                            setPacienteId(p.id); setPacienteNome(p.nomeCompleto)
                            setPacienteDtNasc(p.dataNascimento); setPacientes([]); setBuscaPac('')
                            carregarCarteira(p.id)
                          }}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 border-b border-slate-50 last:border-0">
                            <p className="font-medium">{p.nomeCompleto}</p>
                            <p className="text-xs text-slate-400">{idadeAnos(p.dataNascimento)} anos{p.cns ? ` · CNS ${p.cns}` : ''}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Ranking do mês */}
                {porVacina.length > 0 && (
                  <div className="mt-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Mais Aplicadas (mês)</p>
                    <div className="space-y-1.5">
                      {porVacina.slice(0, 6).map(pv => (
                        <div key={pv.vacinaId} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-700 truncate">{pv.nomeVacina}</span>
                              <span className="text-xs font-bold text-slate-600 ml-2">{pv._count}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full mt-0.5">
                              <div className="h-1.5 bg-indigo-400 rounded-full"
                                style={{ width: `${Math.min(100, (pv._count / (porVacina[0]?._count || 1)) * 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Carteira */}
            <div className="col-span-8">
              {!pacienteId ? (
                <div className="bg-white border border-slate-200 rounded-xl flex items-center justify-center h-64 text-slate-400">
                  <div className="text-center">
                    <User size={28} className="mx-auto mb-2 opacity-30"/>
                    <p className="text-sm">Busque um paciente para ver a carteira vacinal</p>
                  </div>
                </div>
              ) : carregando ? (
                <div className="text-center py-8 text-slate-400">Carregando carteira…</div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-slate-700">
                      Carteira Vacinal - {carteira.filter(c => c.doses.length > 0).length}/{carteira.length} vacinas
                    </p>
                    <div className="text-xs text-slate-500">
                      ✓ Aplicada &nbsp; CI Contraindicada &nbsp; R Recusada
                    </div>
                  </div>
                  <CarteiraVacinal carteira={carteira} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Aba estoque */}
        {aba === 'estoque' && (
          <div>
            <div className="flex gap-2 mb-4">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input className="border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                  placeholder="Buscar vacina..."
                  value={buscaEstoque} onChange={e => setBuscaEstoque(e.target.value)} />
              </div>
              <button onClick={() => setAba('registro')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white text-sm font-medium rounded-xl hover:bg-slate-800 ml-auto">
                <Plus size={14}/> Entrada de Estoque
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Vacina</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Unidade</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Lote</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Doses</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Validade</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {estoques.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-400">Nenhum estoque registrado.</td></tr>
                  ) : estoques.map(e => (
                    <tr key={e.id} className={e.vencido ? 'bg-red-50' : e.critico ? 'bg-orange-50' : ''}>
                      <td className="px-4 py-3 font-medium text-slate-800">{e.vacina.nome}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{e.unidadeSaude}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{e.lote}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${e.critico ? 'text-red-600' : 'text-slate-800'}`}>{e.quantidadeAtual}</span>
                        <span className="text-xs text-slate-400">/{e.quantidadeMinima}</span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className={e.vencido ? 'text-red-600 font-semibold' : e.vencendo ? 'text-orange-600 font-semibold' : 'text-slate-600'}>
                          {new Date(e.dataValidade).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {e.vencido && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Vencido</span>}
                        {!e.vencido && e.critico && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Crítico</span>}
                        {!e.vencido && e.vencendo && !e.critico && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Vencendo</span>}
                        {!e.vencido && !e.critico && !e.vencendo && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">OK</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Aba registro */}
        {aba === 'registro' && (
          <div className="max-w-lg">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-slate-700 mb-4">Entrada de Estoque de Vacinas</p>
              <EntradaEstoqueVacina onSalvar={async d => {
                await fetch('/api/saude/vacinacao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'ENTRADA_ESTOQUE', ...d }) })
                carregarDashboard(); setAba('estoque')
              }} />
            </div>
          </div>
        )}
      </div>

      {modalAplicar && (
        <ModalAplicarVacina
          pacienteId={pacienteId ?? ''}
          vacinas={vacinas.length > 0 ? vacinas : carteira.map(c => c.vacina)}
          estoques={estoques}
          onFechar={() => setModalAplicar(false)}
          onSalvar={registrarVacinacao}
        />
      )}
    </div>
  )
}

// ─── Formulário entrada estoque vacinas ───────────────────────────────────────

function EntradaEstoqueVacina({ onSalvar }: { onSalvar: (d: any) => void }) {
  const [form, setForm] = useState({
    vacinaId: '', unidadeSaude: '', lote: '',
    dataFabricacao: '', dataValidade: '', quantidade: 1, quantidadeMinima: 5,
  })
  const [vacinas, setVacinas] = useState<Vacina[]>([])

  useEffect(() => {
    // Buscar catálogo de vacinas do primeiro item do estoque
    fetch('/api/saude/vacinacao?pacienteId=__DUMMY__').then(r => r.json()).catch(() => {})
  }, [])

  const F = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const valido = form.vacinaId && form.unidadeSaude && form.lote && form.dataValidade && form.quantidade > 0

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-slate-600">Vacina *</label>
        <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
          placeholder="ID da vacina no catálogo" value={form.vacinaId}
          onChange={e => F('vacinaId', e.target.value)} />
        <p className="text-xs text-slate-400 mt-0.5">Use o ID da vacina do catálogo (Prisma)</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600">Unidade de Saúde *</label>
          <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
            value={form.unidadeSaude} onChange={e => F('unidadeSaude', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Lote *</label>
          <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
            value={form.lote} onChange={e => F('lote', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600">Fabricação</label>
          <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
            value={form.dataFabricacao} onChange={e => F('dataFabricacao', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Validade *</label>
          <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
            value={form.dataValidade} onChange={e => F('dataValidade', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Quantidade *</label>
          <input type="number" min={1} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
            value={form.quantidade} onChange={e => F('quantidade', parseInt(e.target.value) || 1)} />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600">Qtd. Mínima para Alerta</label>
        <input type="number" min={1} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
          value={form.quantidadeMinima} onChange={e => F('quantidadeMinima', parseInt(e.target.value) || 5)} />
      </div>

      <button onClick={() => onSalvar(form)} disabled={!valido}
        className="w-full py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50">
        Registrar Entrada
      </button>
    </div>
  )
}
