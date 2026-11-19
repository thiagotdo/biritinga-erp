'use client'

import { useEffect, useState } from 'react'
import {
  Flag, CheckCircle, XCircle, Clock, BarChart2,
  TrendingUp, AlertCircle, ChevronRight,
} from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type SituacaoRecurso = 'RECEBIDO' | 'EM_ANALISE' | 'PROVIDO' | 'PARCIALMENTE_PROVIDO' | 'IMPROVIDO' | 'DESISTIDO'

interface Recurso {
  id: string
  numero: string
  instancia: string
  situacao: SituacaoRecurso
  nomeRecorrente: string | null
  motivoRecurso: string
  dataProtocolo: string
  dataLimiteDecisao: string
  dataDecisao: string | null
  textoDecisao: string | null
  autoridade: string | null
  dentroDoPrazo: boolean | null
  pedido?: {
    protocolo: string
    assunto: string
    situacao: string
  }
}

interface DashboardSIC {
  kpis: {
    total: number
    pendentes: number
    respondidos: number
    indeferidos: number
    atrasados: number
    vencendoHoje: number
  }
  porSituacao: Array<{ situacao: string; _count: number }>
  porSetor: Array<{ setorDestinatario: string; _count: number }>
  mediaRespostaDias: number
  percentualNoPrazo: number
}

// ─── Mapas ────────────────────────────────────────────────────────────────────

const SIT_REC: Record<SituacaoRecurso, { label: string; cor: string; bg: string; icone: React.ReactNode }> = {
  RECEBIDO:           { label: 'Recebido',       cor: 'text-blue-700',   bg: 'bg-blue-50',   icone: <Flag size={12}/> },
  EM_ANALISE:         { label: 'Em Análise',      cor: 'text-yellow-700', bg: 'bg-yellow-50', icone: <Clock size={12}/> },
  PROVIDO:            { label: 'Provido',         cor: 'text-green-700',  bg: 'bg-green-50',  icone: <CheckCircle size={12}/> },
  PARCIALMENTE_PROVIDO:{ label: 'Prov. Parcial', cor: 'text-teal-700',   bg: 'bg-teal-50',   icone: <CheckCircle size={12}/> },
  IMPROVIDO:          { label: 'Improvido',       cor: 'text-red-700',    bg: 'bg-red-50',    icone: <XCircle size={12}/> },
  DESISTIDO:          { label: 'Desistido',       cor: 'text-slate-600',  bg: 'bg-slate-100', icone: <XCircle size={12}/> },
}

const INSTANCIAS: Record<string, string> = {
  PRIMEIRA_INSTANCIA: '1ª Instância',
  SEGUNDA_INSTANCIA:  '2ª Instância',
  TERCEIRA_INSTANCIA: '3ª Instância',
  CGM_TCM:            'CGM/TCM',
}

const ACOES_RECURSO: Record<string, string[]> = {
  RECEBIDO:   ['DECIDIR_EM_ANALISE', 'DECIDIR_IMPROVIDO', 'DECIDIR_PROVIDO', 'DECIDIR_PROVIDO_PARCIAL', 'DESISTIR'],
  EM_ANALISE: ['DECIDIR_IMPROVIDO', 'DECIDIR_PROVIDO', 'DECIDIR_PROVIDO_PARCIAL', 'DESISTIR'],
  PROVIDO:    [],
  PARCIALMENTE_PROVIDO: [],
  IMPROVIDO:  [],
  DESISTIDO:  [],
}

const ACOES_LABEL: Record<string, { label: string; cor: string }> = {
  DECIDIR_EM_ANALISE:    { label: 'Iniciar Análise',    cor: 'bg-yellow-500 hover:bg-yellow-600' },
  DECIDIR_PROVIDO:       { label: 'Prover Recurso',     cor: 'bg-green-600 hover:bg-green-700'  },
  DECIDIR_PROVIDO_PARCIAL:{ label: 'Prover Parcial',   cor: 'bg-teal-600 hover:bg-teal-700'    },
  DECIDIR_IMPROVIDO:     { label: 'Manter Indeferimento', cor: 'bg-red-600 hover:bg-red-700'   },
  DESISTIR:              { label: 'Registrar Desistência', cor: 'bg-slate-500 hover:bg-slate-600' },
}

// ─── Painel de estatísticas ───────────────────────────────────────────────────

function PainelEstatisticas({ dash }: { dash: DashboardSIC }) {
  const { kpis, porSituacao, porSetor, mediaRespostaDias, percentualNoPrazo } = dash

  const corMedia  = mediaRespostaDias <= 15 ? 'text-green-600' : mediaRespostaDias <= 20 ? 'text-orange-600' : 'text-red-600'
  const corPrazo  = percentualNoPrazo >= 80 ? 'text-green-600' : percentualNoPrazo >= 60 ? 'text-orange-600' : 'text-red-600'

  const maxSetor  = Math.max(...porSetor.map(s => s._count), 1)

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-slate-800">{kpis.total}</p>
          <p className="text-xs text-slate-400 mt-0.5">Total de Pedidos</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className={`text-3xl font-bold ${corMedia}`}>{mediaRespostaDias.toFixed(1)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Dias médios de resposta</p>
          <p className="text-xs text-slate-400">(Prazo legal: 20 dias úteis)</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className={`text-3xl font-bold ${corPrazo}`}>{percentualNoPrazo}%</p>
          <p className="text-xs text-slate-400 mt-0.5">Respondidos no prazo</p>
        </div>
      </div>

      {/* Por situação */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Por Situação</p>
        <div className="grid grid-cols-2 gap-2">
          {porSituacao.map(({ situacao, _count }) => (
            <div key={situacao} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-xs text-slate-600">{situacao.replace(/_/g,' ')}</span>
              <span className="text-sm font-bold text-slate-800">{_count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Por setor */}
      {porSetor.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Top Setores Demandados</p>
          <div className="space-y-2">
            {porSetor.slice(0, 8).map(({ setorDestinatario, _count }) => (
              <div key={setorDestinatario} className="flex items-center gap-2">
                <span className="text-xs text-slate-600 w-32 truncate flex-shrink-0">{setorDestinatario}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full"
                    style={{ width: `${(_count / maxSetor) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-slate-700 w-6 text-right">{_count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Form de decisão ──────────────────────────────────────────────────────────

function FormDecisao({
  recurso,
  onSalvar,
  onFechar,
}: {
  recurso: Recurso
  onSalvar: (acao: string, extras: Record<string,string>) => void
  onFechar: () => void
}) {
  const [acao, setAcao] = useState('')
  const [form, setForm] = useState({ textoDecisao: '', autoridade: '' })
  const [salvando, setSalvando] = useState(false)

  const acoes = ACOES_RECURSO[recurso.situacao] ?? []
  const atrasado = new Date(recurso.dataLimiteDecisao) < new Date()

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      {/* Cabeçalho recurso */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-slate-800">{recurso.numero}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SIT_REC[recurso.situacao].cor} ${SIT_REC[recurso.situacao].bg}`}>
                {SIT_REC[recurso.situacao].label}
              </span>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{INSTANCIAS[recurso.instancia] ?? recurso.instancia}</span>
            </div>
            {recurso.pedido && (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <ChevronRight size={11}/> Pedido: <span className="font-medium">{recurso.pedido.protocolo}</span> — {recurso.pedido.assunto}
              </p>
            )}
          </div>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-3 text-xs text-slate-500">
          <div>
            <span className="text-slate-400">Recorrente: </span>
            <span className="font-medium text-slate-700">{recurso.nomeRecorrente ?? 'Não informado'}</span>
          </div>
          <div>
            <span className="text-slate-400">Prazo decisão: </span>
            <span className={`font-medium ${atrasado ? 'text-red-600' : 'text-slate-700'}`}>
              {new Date(recurso.dataLimiteDecisao).toLocaleDateString('pt-BR')}
              {atrasado && ' ⚠ Atrasado'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Motivo do recurso */}
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1">MOTIVO DO RECURSO</p>
          <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{recurso.motivoRecurso}</p>
        </div>

        {/* Decisão existente */}
        {recurso.textoDecisao && (
          <div className={`border rounded-lg p-3 ${
            recurso.situacao === 'PROVIDO' ? 'border-green-200 bg-green-50' : 'border-red-100 bg-red-50'
          }`}>
            <p className="text-xs font-semibold mb-1 text-slate-600">
              DECISÃO — {recurso.autoridade ?? ''} · {recurso.dataDecisao ? new Date(recurso.dataDecisao).toLocaleDateString('pt-BR') : ''}
              {recurso.dentroDoPrazo === false && <span className="text-orange-600 ml-2">(Fora do prazo)</span>}
            </p>
            <p className="text-sm text-slate-700">{recurso.textoDecisao}</p>
          </div>
        )}

        {/* Ações disponíveis */}
        {acoes.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">DECIDIR</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {acoes.map(a => {
                const meta = ACOES_LABEL[a]
                if (!meta) return null
                return (
                  <button key={a} onClick={() => setAcao(acao === a ? '' : a)}
                    className={`px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors ${meta.cor} ${acao === a ? 'ring-2 ring-offset-1 ring-slate-300' : ''}`}>
                    {meta.label}
                  </button>
                )
              })}
            </div>

            {acao && !['DECIDIR_EM_ANALISE','DESISTIR'].includes(acao) && (
              <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
                <div>
                  <label className="text-xs font-medium text-slate-600">Autoridade Decisória</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                    placeholder="Nome do responsável pela decisão"
                    value={form.autoridade} onChange={e => setForm(f => ({ ...f, autoridade: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Texto da Decisão *</label>
                  <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none resize-none" rows={4}
                    placeholder="Fundamentação e conclusão da decisão..."
                    value={form.textoDecisao} onChange={e => setForm(f => ({ ...f, textoDecisao: e.target.value }))} />
                </div>
                {acao === 'DECIDIR_IMPROVIDO' && (
                  <p className="text-xs text-slate-500">
                    ℹ️ Mantendo o indeferimento, o recurso será encerrado. Poderão caber recursos em instâncias superiores.
                  </p>
                )}
                {(acao === 'DECIDIR_PROVIDO' || acao === 'DECIDIR_PROVIDO_PARCIAL') && (
                  <p className="text-xs text-green-700">
                    ✓ O recurso sendo provido, o pedido retornará para resposta.
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setAcao(''); setForm({ textoDecisao: '', autoridade: '' }) }}
                    className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      setSalvando(true)
                      await onSalvar(acao, form)
                      setSalvando(false)
                      setAcao('')
                    }}
                    disabled={salvando || (!form.textoDecisao && !['DECIDIR_EM_ANALISE','DESISTIR'].includes(acao))}
                    className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">
                    {salvando ? 'Salvando…' : 'Confirmar Decisão'}
                  </button>
                </div>
              </div>
            )}

            {acao === 'DECIDIR_EM_ANALISE' && (
              <div className="flex justify-end">
                <button onClick={async () => {
                  setSalvando(true)
                  await onSalvar(acao, {})
                  setSalvando(false)
                  setAcao('')
                }} disabled={salvando}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-yellow-500 hover:bg-yellow-600 rounded-lg disabled:opacity-50">
                  {salvando ? 'Salvando…' : 'Iniciar Análise'}
                </button>
              </div>
            )}

            {acao === 'DESISTIR' && (
              <div className="flex justify-end">
                <button onClick={async () => {
                  setSalvando(true)
                  await onSalvar(acao, {})
                  setSalvando(false)
                  setAcao('')
                }} disabled={salvando}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-slate-500 hover:bg-slate-600 rounded-lg disabled:opacity-50">
                  {salvando ? 'Salvando…' : 'Confirmar Desistência'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function RecursosPage() {
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [dash, setDash] = useState<DashboardSIC | null>(null)
  const [selecionado, setSelecionado] = useState<Recurso | null>(null)
  const [aba, setAba] = useState<'recursos' | 'estatisticas'>('recursos')
  const [filtroSit, setFiltroSit] = useState('')
  const [filtroInst, setFiltroInst] = useState('')
  const [carregando, setCarregando] = useState(true)

  async function carregar() {
    setCarregando(true)

    // Buscar recursos via pedido (todos os que têm recurso aberto)
    const [resRecursos, resDash] = await Promise.all([
      // Buscar pedidos em RECURSO_ABERTO para obter recursos
      fetch('/api/esic/pedido?situacao=RECURSO_ABERTO').then(r => r.json()),
      fetch('/api/esic/pedido?relatorio=DASHBOARD').then(r => r.json()),
    ])

    // Flatten recursos de cada pedido
    const pedidosComRecurso = resRecursos.pedidos ?? []
    const recursosLista: Recurso[] = []

    for (const p of pedidosComRecurso) {
      const det = await fetch(`/api/esic/pedido?id=${p.id}`).then(r => r.json())
      for (const r of (det.pedido?.recursos ?? [])) {
        recursosLista.push({
          ...r,
          pedido: { protocolo: p.protocolo, assunto: p.assunto, situacao: p.situacao },
        })
      }
    }

    // Filtrar por situação e instância
    let filtrados = recursosLista
    if (filtroSit)  filtrados = filtrados.filter(r => r.situacao === filtroSit)
    if (filtroInst) filtrados = filtrados.filter(r => r.instancia === filtroInst)

    setRecursos(filtrados)
    setDash(resDash)
    setCarregando(false)
  }

  useEffect(() => { carregar() }, [filtroSit, filtroInst])

  async function executarAcaoRecurso(acao: string, extras: Record<string,string>) {
    if (!selecionado) return

    // Mapeamento: "DECIDIR_EM_ANALISE" → situação EM_ANALISE via patch no recurso
    const acaoApi =
      acao === 'DECIDIR_EM_ANALISE'       ? 'DECIDIR_EM_ANALISE' :
      acao === 'DECIDIR_PROVIDO'          ? 'DECIDIR_PROVIDO' :
      acao === 'DECIDIR_PROVIDO_PARCIAL'  ? 'DECIDIR_PROVIDO_PARCIAL' :
      acao === 'DECIDIR_IMPROVIDO'        ? 'DECIDIR_IMPROVIDO' :
      acao === 'DESISTIR'                 ? 'DESISTIR' : acao

    await fetch('/api/esic/pedido', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recursoId: selecionado.id, acao: acaoApi, ...extras }),
    })

    setSelecionado(null)
    carregar()
  }

  const atrasados = recursos.filter(r =>
    ['RECEBIDO','EM_ANALISE'].includes(r.situacao) &&
    new Date(r.dataLimiteDecisao) < new Date()
  ).length

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">e-SIC — Recursos e Estatísticas</h1>
          <p className="text-sm text-slate-500 mt-0.5">Art. 15 Lei 12.527/2011 — Recursos em 3 instâncias</p>
        </div>

        {atrasados > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
            <AlertCircle size={18} className="text-red-500"/>
            <span className="text-sm text-red-700 font-medium">
              {atrasados} recurso{atrasados > 1 ? 's' : ''} fora do prazo legal para decisão.
            </span>
          </div>
        )}

        {/* Abas */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-5">
          {(['recursos', 'estatisticas'] as const).map(a => (
            <button key={a} onClick={() => setAba(a)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${aba === a ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
              {a === 'recursos' ? `Recursos (${recursos.length})` : 'Estatísticas SIC'}
            </button>
          ))}
        </div>

        {/* Aba: Recursos */}
        {aba === 'recursos' && (
          <div className="grid grid-cols-12 gap-5">
            {/* Lista */}
            <div className="col-span-5">
              {/* Filtros */}
              <div className="flex gap-2 mb-3">
                <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-300 focus:outline-none flex-1"
                  value={filtroSit} onChange={e => setFiltroSit(e.target.value)}>
                  <option value="">Todas as situações</option>
                  {Object.entries(SIT_REC).map(([v, m]) => (
                    <option key={v} value={v}>{m.label}</option>
                  ))}
                </select>
                <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-300 focus:outline-none flex-1"
                  value={filtroInst} onChange={e => setFiltroInst(e.target.value)}>
                  <option value="">Todas as instâncias</option>
                  {Object.entries(INSTANCIAS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                {carregando ? (
                  <div className="text-center py-12 text-slate-400">Carregando…</div>
                ) : recursos.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Flag size={28} className="mx-auto mb-2 opacity-30"/>
                    <p className="text-sm">Nenhum recurso encontrado.</p>
                  </div>
                ) : recursos.map(r => {
                  const atrasado = ['RECEBIDO','EM_ANALISE'].includes(r.situacao) && new Date(r.dataLimiteDecisao) < new Date()
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelecionado(selecionado?.id === r.id ? null : r)}
                      className={`w-full text-left bg-white border rounded-xl p-4 hover:shadow-sm transition-all ${
                        selecionado?.id === r.id ? 'border-indigo-400 ring-2 ring-indigo-100' :
                        atrasado ? 'border-red-300 bg-red-50' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-semibold text-slate-600">{r.numero}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SIT_REC[r.situacao].cor} ${SIT_REC[r.situacao].bg}`}>
                            {SIT_REC[r.situacao].label}
                          </span>
                          <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                            {INSTANCIAS[r.instancia] ?? r.instancia}
                          </span>
                        </div>
                      </div>
                      {r.pedido && (
                        <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                          <ChevronRight size={10}/>{r.pedido.protocolo} — {r.pedido.assunto}
                        </p>
                      )}
                      <p className="text-sm text-slate-700 leading-snug line-clamp-2">{r.motivoRecurso}</p>
                      <p className={`text-xs mt-1.5 ${atrasado ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                        {atrasado ? '⚠ Prazo expirado — ' : 'Prazo: '}
                        {new Date(r.dataLimiteDecisao).toLocaleDateString('pt-BR')}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Painel detalhe */}
            <div className="col-span-7">
              {selecionado ? (
                <FormDecisao
                  recurso={selecionado}
                  onSalvar={executarAcaoRecurso}
                  onFechar={() => setSelecionado(null)}
                />
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl flex items-center justify-center h-64 text-slate-400">
                  <div className="text-center">
                    <Flag size={28} className="mx-auto mb-2 opacity-30"/>
                    <p className="text-sm">Selecione um recurso para decidir</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Aba: Estatísticas */}
        {aba === 'estatisticas' && dash && (
          <div className="max-w-2xl">
            <PainelEstatisticas dash={dash} />

            <div className="mt-5 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart2 size={16} className="text-blue-600"/>
                <p className="text-sm font-semibold text-blue-800">Relatório Anual SIC — Art. 45 LAI</p>
              </div>
              <p className="text-xs text-blue-700">
                O órgão deve publicar anualmente estatísticas do e-SIC: total de pedidos, respostas, indeferimentos,
                recursos, tempo médio, por tema e setor. Exporte estes dados para o relatório de gestão.
              </p>
              <div className="grid grid-cols-3 gap-3 mt-3">
                {[
                  { label: 'Total', val: dash.kpis.total },
                  { label: 'No prazo', val: `${dash.percentualNoPrazo}%` },
                  { label: 'Média dias', val: dash.mediaRespostaDias.toFixed(1) },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-white rounded-lg p-3 text-center border border-blue-100">
                    <p className="text-xl font-bold text-blue-800">{val}</p>
                    <p className="text-xs text-blue-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
