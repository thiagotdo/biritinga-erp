'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, AlertTriangle, Clock, CheckCircle, XCircle, ChevronRight, ArrowRight } from 'lucide-react'

type Situacao = 'SOLICITADO' | 'EM_REGULACAO' | 'AGENDADO' | 'REALIZADO' | 'CANCELADO' | 'DEVOLVIDO'
type Prioridade = 'ELETIVO' | 'PRIORITARIO' | 'URGENTE'

interface Regulacao {
  id: string; numero: string; tipo: string
  prioridade: Prioridade; situacao: Situacao
  procedimentoNome: string; procedimentoCod: string | null
  cid10Indicacao: string | null; justificativaClinica: string
  unidadeSolicitante: string; profissionalSolicitante: string
  unidadeDestino: string | null; profissionalDestino: string | null
  dataAgendamento: string | null; dataRealizacao: string | null
  reguladorNome: string | null; laudoResultado: string | null
  motivoCancelamento: string | null; motivoDevolucao: string | null
  dataSolicitacao: string
  paciente: { nomeCompleto: string; dataNascimento: string; cns: string | null; telefone: string | null }
}

// ─── Mapas ────────────────────────────────────────────────────────────────────

const SIT: Record<Situacao, { label: string; cor: string; bg: string }> = {
  SOLICITADO:    { label: 'Solicitado',    cor: 'text-blue-700',   bg: 'bg-blue-50'   },
  EM_REGULACAO:  { label: 'Em Regulação',  cor: 'text-yellow-700', bg: 'bg-yellow-50' },
  AGENDADO:      { label: 'Agendado',      cor: 'text-indigo-700', bg: 'bg-indigo-50' },
  REALIZADO:     { label: 'Realizado',     cor: 'text-green-700',  bg: 'bg-green-50'  },
  CANCELADO:     { label: 'Cancelado',     cor: 'text-slate-500',  bg: 'bg-slate-100' },
  DEVOLVIDO:     { label: 'Devolvido',     cor: 'text-orange-700', bg: 'bg-orange-50' },
}

const PRIO: Record<Prioridade, { label: string; cor: string; bg: string; borda: string }> = {
  URGENTE:    { label: 'URGENTE',    cor: 'text-red-700',    bg: 'bg-red-100',    borda: 'border-red-400'    },
  PRIORITARIO:{ label: 'PRIORITÁRIO',cor: 'text-orange-700', bg: 'bg-orange-100', borda: 'border-orange-400' },
  ELETIVO:    { label: 'Eletivo',    cor: 'text-green-700',  bg: 'bg-green-100',  borda: 'border-green-300'  },
}

const TIPO_LABEL: Record<string, string> = {
  CONSULTA_ESPECIALIDADE: 'Consulta Especialidade',
  EXAME_IMAGEM:           'Exame de Imagem',
  EXAME_LABORATORIAL:     'Exame Laboratorial',
  PROCEDIMENTO_CIRURGICO: 'Procedimento Cirúrgico',
  INTERNACAO:             'Internação',
  TERAPIA:                'Terapia',
}

const ACOES: Record<Situacao, string[]> = {
  SOLICITADO:    ['INICIAR_REGULACAO', 'CANCELAR'],
  EM_REGULACAO:  ['AGENDAR', 'DEVOLVER', 'CANCELAR'],
  AGENDADO:      ['REGISTRAR_REALIZADO', 'CANCELAR'],
  REALIZADO:     [],
  CANCELADO:     [],
  DEVOLVIDO:     ['INICIAR_REGULACAO'],
}

function idadeAnos(dataNasc: string): number {
  const hoje = new Date(), nasc = new Date(dataNasc)
  let i = hoje.getFullYear() - nasc.getFullYear()
  if (hoje.getMonth() < nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())) i--
  return i
}

function diasAtraso(dataSolicitacao: string): number {
  return Math.floor((Date.now() - new Date(dataSolicitacao).getTime()) / 86400000)
}

function ChipSit({ sit }: { sit: Situacao }) {
  const s = SIT[sit]
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.cor} ${s.bg}`}>{s.label}</span>
}

function ChipPrio({ prio }: { prio: Prioridade }) {
  const p = PRIO[prio]
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${p.cor} ${p.bg} ${p.borda}`}>{p.label}</span>
}

// ─── Painel de Regulação ──────────────────────────────────────────────────────

function PainelRegulacao({
  reg, onAcao,
}: {
  reg: Regulacao
  onAcao: (acao: string, dados?: any) => void
}) {
  const [acao, setAcao] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)
  const dias = diasAtraso(reg.dataSolicitacao)
  const acoes = ACOES[reg.situacao] ?? []
  const p = reg.paciente

  async function enviar() {
    setSalvando(true)
    await onAcao(acao!, form)
    setSalvando(false)
    setAcao(null)
    setForm({})
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      {/* Header */}
      <div className={`px-5 py-4 border-b border-l-4 rounded-tl-xl rounded-tr-xl ${PRIO[reg.prioridade].borda}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-semibold text-slate-500">{reg.numero}</span>
              <ChipPrio prio={reg.prioridade} />
              <ChipSit sit={reg.situacao} />
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{TIPO_LABEL[reg.tipo] ?? reg.tipo}</span>
            </div>
            <p className="text-lg font-semibold text-slate-800 mt-1">{p.nomeCompleto}</p>
            <p className="text-xs text-slate-500">
              {idadeAnos(p.dataNascimento)} anos
              {p.cns && <> · CNS: <span className="font-medium">{p.cns}</span></>}
              {p.telefone && <> · {p.telefone}</>}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500 shrink-0">
            <p>Solicitado em</p>
            <p className="font-medium">{new Date(reg.dataSolicitacao).toLocaleDateString('pt-BR')}</p>
            <p className={`font-semibold mt-1 ${dias >= 30 ? 'text-red-600' : dias >= 15 ? 'text-orange-600' : 'text-slate-700'}`}>
              {dias} {dias === 1 ? 'dia' : 'dias'} na fila
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-5 space-y-4">
        {/* Procedimento */}
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide">Procedimento</p>
          <p className="font-semibold text-slate-800">
            {reg.procedimentoNome}
            {reg.procedimentoCod && <span className="font-mono text-xs text-slate-400 ml-2">[{reg.procedimentoCod}]</span>}
          </p>
          {reg.cid10Indicacao && <p className="text-xs text-slate-500">CID-10: <span className="font-mono">{reg.cid10Indicacao}</span></p>}
        </div>

        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide">Justificativa Clínica</p>
          <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 mt-1">{reg.justificativaClinica}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-400">Solicitante</p>
            <p className="font-medium text-slate-700">{reg.profissionalSolicitante}</p>
            <p className="text-xs text-slate-500">{reg.unidadeSolicitante}</p>
          </div>
          {reg.unidadeDestino && (
            <div>
              <p className="text-xs text-slate-400">Unidade de Destino</p>
              <p className="font-medium text-slate-700">{reg.unidadeDestino}</p>
              {reg.profissionalDestino && <p className="text-xs text-slate-500">{reg.profissionalDestino}</p>}
              {reg.dataAgendamento && (
                <p className="text-xs font-semibold text-indigo-600 mt-0.5">
                  📅 {new Date(reg.dataAgendamento).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
          )}
        </div>

        {reg.laudoResultado && (
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Laudo / Resultado</p>
            <p className="text-sm text-slate-700 bg-green-50 border border-green-100 rounded-lg p-3 mt-1">{reg.laudoResultado}</p>
          </div>
        )}

        {(reg.motivoCancelamento || reg.motivoDevolucao) && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-orange-700">{reg.motivoCancelamento ? 'Motivo do Cancelamento' : 'Motivo da Devolução'}</p>
            <p className="text-sm text-orange-800 mt-0.5">{reg.motivoCancelamento ?? reg.motivoDevolucao}</p>
          </div>
        )}

        {/* Ações */}
        {acoes.length > 0 && !acao && (
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500 mb-2">Ações</p>
            <div className="flex gap-2 flex-wrap">
              {acoes.map(a => (
                <button key={a} onClick={() => setAcao(a)}
                  className={`px-4 py-2 text-sm font-medium rounded-xl text-white ${
                    a === 'INICIAR_REGULACAO' ? 'bg-yellow-500 hover:bg-yellow-600' :
                    a === 'AGENDAR' ? 'bg-indigo-600 hover:bg-indigo-700' :
                    a === 'REGISTRAR_REALIZADO' ? 'bg-green-600 hover:bg-green-700' :
                    a === 'CANCELAR' ? 'bg-red-500 hover:bg-red-600' :
                    'bg-slate-500 hover:bg-slate-600'
                  }`}>
                  {a === 'INICIAR_REGULACAO' ? 'Iniciar Regulação' :
                   a === 'AGENDAR' ? 'Agendar' :
                   a === 'REGISTRAR_REALIZADO' ? 'Registrar Realizado' :
                   a === 'DEVOLVER' ? 'Devolver' :
                   a === 'CANCELAR' ? 'Cancelar' : a}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Formulários de ação */}
        {acao && (
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700">
              {acao === 'INICIAR_REGULACAO' ? 'Iniciar Regulação' :
               acao === 'AGENDAR' ? 'Agendar Procedimento' :
               acao === 'REGISTRAR_REALIZADO' ? 'Registrar Realização' :
               acao === 'DEVOLVER' ? 'Devolver Solicitação' :
               acao === 'CANCELAR' ? 'Cancelar Regulação' : acao}
            </p>

            {acao === 'INICIAR_REGULACAO' && (
              <div>
                <label className="text-xs font-medium text-slate-600">Regulador Responsável</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                  placeholder="Nome do regulador..."
                  value={form.reguladorNome ?? ''}
                  onChange={e => setForm(f => ({ ...f, reguladorNome: e.target.value }))} />
                <label className="text-xs font-medium text-slate-600 mt-2 block">Observações</label>
                <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none resize-none" rows={2}
                  value={form.observacaoRegulacao ?? ''}
                  onChange={e => setForm(f => ({ ...f, observacaoRegulacao: e.target.value }))} />
              </div>
            )}

            {acao === 'AGENDAR' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Unidade de Destino *</label>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                      value={form.unidadeDestino ?? ''}
                      onChange={e => setForm(f => ({ ...f, unidadeDestino: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Profissional de Destino</label>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                      value={form.profissionalDestino ?? ''}
                      onChange={e => setForm(f => ({ ...f, profissionalDestino: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Data e Hora do Agendamento *</label>
                  <input type="datetime-local" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                    value={form.dataAgendamento ?? ''}
                    onChange={e => setForm(f => ({ ...f, dataAgendamento: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Regulador</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                    value={form.reguladorNome ?? reg.reguladorNome ?? ''}
                    onChange={e => setForm(f => ({ ...f, reguladorNome: e.target.value }))} />
                </div>
              </div>
            )}

            {acao === 'REGISTRAR_REALIZADO' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Data de Realização</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    onChange={e => setForm(f => ({ ...f, dataRealizacao: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Laudo / Resultado</label>
                  <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none resize-none" rows={3}
                    value={form.laudoResultado ?? ''}
                    onChange={e => setForm(f => ({ ...f, laudoResultado: e.target.value }))} />
                </div>
              </div>
            )}

            {(acao === 'CANCELAR' || acao === 'DEVOLVER') && (
              <div>
                <label className="text-xs font-medium text-slate-600">
                  {acao === 'CANCELAR' ? 'Motivo do Cancelamento *' : 'Motivo da Devolução *'}
                </label>
                <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none resize-none" rows={3}
                  value={form[acao === 'CANCELAR' ? 'motivoCancelamento' : 'motivoDevolucao'] ?? ''}
                  onChange={e => setForm(f => ({ ...f, [acao === 'CANCELAR' ? 'motivoCancelamento' : 'motivoDevolucao']: e.target.value }))} />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={() => { setAcao(null); setForm({}) }}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={enviar} disabled={salvando}
                className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 flex items-center gap-2">
                {salvando ? 'Salvando…' : <><CheckCircle size={14}/> Confirmar</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function RegulacaoPage() {
  const [regulacoes, setRegulacoes] = useState<Regulacao[]>([])
  const [kpis, setKpis] = useState<any>(null)
  const [selecionado, setSelecionado] = useState<Regulacao | null>(null)
  const [filtroSit, setFiltroSit] = useState('')
  const [filtroPrio, setFiltroPrio] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [busca, setBusca] = useState('')
  const [modalNova, setModalNova] = useState(false)
  const [carregando, setCarregando] = useState(true)

  async function carregar() {
    setCarregando(true)
    const p = new URLSearchParams()
    if (filtroSit) p.set('situacao', filtroSit)
    if (filtroPrio) p.set('prioridade', filtroPrio)
    if (filtroTipo) p.set('tipo', filtroTipo)
    if (busca) p.set('busca', busca)

    const [resReg, resDash] = await Promise.all([
      fetch(`/api/saude/regulacao?${p}`).then(r => r.json()),
      fetch('/api/saude/regulacao?relatorio=DASHBOARD').then(r => r.json()),
    ])
    setRegulacoes(resReg.regulacoes ?? [])
    setKpis(resDash.kpis ?? null)
    setCarregando(false)
  }

  useEffect(() => { carregar() }, [filtroSit, filtroPrio, filtroTipo, busca])

  async function executarAcao(acao: string, dados?: any) {
    if (!selecionado) return
    await fetch('/api/saude/regulacao', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selecionado.id, acao, ...dados }),
    })
    // Recarregar detalhe
    const res = await fetch(`/api/saude/regulacao?id=${selecionado.id}`).then(r => r.json())
    setSelecionado(res.regulacao)
    carregar()
  }

  async function salvarNovaRegulacao(d: any) {
    await fetch('/api/saude/regulacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d),
    })
    setModalNova(false)
    carregar()
  }

  const urgentes = regulacoes.filter(r => r.prioridade === 'URGENTE' && !['REALIZADO','CANCELADO'].includes(r.situacao))

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Regulação em Saúde</h1>
            <p className="text-sm text-slate-500 mt-0.5">Fila de regulação para consultas, exames e procedimentos</p>
          </div>
          <button onClick={() => setModalNova(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 shadow-sm">
            <Plus size={16}/> Nova Solicitação
          </button>
        </div>

        {/* Alerta urgentes */}
        {urgentes.length > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0"/>
            <p className="text-sm text-red-700 font-medium">
              {urgentes.length} solicitaç{urgentes.length === 1 ? 'ão URGENTE' : 'ões URGENTES'} aguardando regulação
            </p>
            <button onClick={() => setFiltroPrio('URGENTE')} className="ml-auto text-xs font-medium text-red-600 hover:text-red-800 underline">
              Ver urgentes
            </button>
          </div>
        )}

        {/* KPIs */}
        {kpis && (
          <div className="grid grid-cols-5 gap-3 mb-5">
            {[
              { label: 'Total',         val: kpis.total,       cor: 'bg-white border border-slate-200' },
              { label: 'Solicitados',   val: kpis.solicitado,  cor: 'bg-blue-50 border border-blue-200' },
              { label: 'Em Regulação',  val: kpis.emRegulacao, cor: 'bg-yellow-50 border border-yellow-200' },
              { label: 'Agendados',     val: kpis.agendado,    cor: 'bg-indigo-50 border border-indigo-200' },
              { label: 'Urgentes',      val: kpis.urgentes,    cor: kpis.urgentes > 0 ? 'bg-red-50 border border-red-300' : 'bg-white border border-slate-200' },
            ].map(({ label, val, cor }) => (
              <div key={label} className={`${cor} rounded-xl p-4 text-center`}>
                <p className="text-3xl font-bold text-slate-800">{val}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-3 mb-5 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-300 focus:outline-none"
              placeholder="Buscar paciente, número, procedimento..."
              value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          {[
            { label: 'Prioridade', val: filtroPrio, set: setFiltroPrio, opts: [['', 'Todas'], ['URGENTE', 'Urgente'], ['PRIORITARIO', 'Prioritário'], ['ELETIVO', 'Eletivo']] },
            { label: 'Situação', val: filtroSit, set: setFiltroSit, opts: [['', 'Todas'], ...Object.entries(SIT).map(([v, m]) => [v, m.label])] },
            { label: 'Tipo', val: filtroTipo, set: setFiltroTipo, opts: [['', 'Todos'], ...Object.entries(TIPO_LABEL).map(([v, l]) => [v, l])] },
          ].map(({ label, val, set, opts }) => (
            <select key={label} className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-300 focus:outline-none"
              value={val} onChange={e => { (set as any)(e.target.value); setSelecionado(null) }}>
              {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
          {(filtroSit || filtroPrio || filtroTipo || busca) && (
            <button onClick={() => { setFiltroSit(''); setFiltroPrio(''); setFiltroTipo(''); setBusca('') }}
              className="text-xs text-indigo-600 hover:text-indigo-800">Limpar filtros</button>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-12 gap-5">
          {/* Fila */}
          <div className="col-span-5 space-y-2">
            {carregando ? (
              <div className="text-center py-12 text-slate-400">Carregando…</div>
            ) : regulacoes.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CheckCircle size={28} className="mx-auto mb-2 opacity-30"/>
                <p className="text-sm">Nenhuma regulação encontrada.</p>
              </div>
            ) : regulacoes.map(r => {
              const dias = diasAtraso(r.dataSolicitacao)
              return (
                <button key={r.id}
                  onClick={() => setSelecionado(r)}
                  className={`w-full text-left bg-white border rounded-xl p-3 hover:shadow-sm transition-all border-l-4 ${
                    PRIO[r.prioridade].borda
                  } ${selecionado?.id === r.id ? 'ring-2 ring-indigo-100' : ''} ${
                    ['REALIZADO','CANCELADO'].includes(r.situacao) ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <ChipPrio prio={r.prioridade} />
                        <ChipSit sit={r.situacao} />
                        <span className="font-mono text-xs text-slate-400">{r.numero}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 truncate">{r.paciente.nomeCompleto}</p>
                      <p className="text-xs text-slate-600 font-medium truncate">{r.procedimentoNome}</p>
                      <p className="text-xs text-slate-400">{TIPO_LABEL[r.tipo] ?? r.tipo} · {r.unidadeSolicitante}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-bold ${dias >= 30 ? 'text-red-600' : dias >= 15 ? 'text-orange-500' : 'text-slate-400'}`}>
                        {dias}d
                      </p>
                      {r.dataAgendamento && (
                        <p className="text-xs text-indigo-600 font-medium mt-1">
                          📅 {new Date(r.dataAgendamento).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Painel detalhe */}
          <div className="col-span-7">
            {selecionado ? (
              <PainelRegulacao reg={selecionado} onAcao={executarAcao} />
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl flex items-center justify-center h-64 text-slate-400">
                <div className="text-center">
                  <ArrowRight size={28} className="mx-auto mb-2 opacity-30"/>
                  <p className="text-sm">Selecione uma solicitação para ver detalhes</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal nova solicitação */}
      {modalNova && (
        <ModalNovaRegulacao onFechar={() => setModalNova(false)} onSalvar={salvarNovaRegulacao} />
      )}
    </div>
  )
}

// ─── Modal nova regulação ─────────────────────────────────────────────────────

function ModalNovaRegulacao({
  onFechar, onSalvar,
}: {
  onFechar: () => void
  onSalvar: (d: any) => void
}) {
  const [form, setForm] = useState({
    pacienteId: '', pacienteNome: '',
    tipo: 'CONSULTA_ESPECIALIDADE', prioridade: 'ELETIVO',
    procedimentoNome: '', procedimentoCod: '', cid10Indicacao: '',
    justificativaClinica: '', unidadeSolicitante: '', profissionalSolicitante: '',
  })
  const [buscaPac, setBuscaPac] = useState('')
  const [pacientes, setPacientes] = useState<any[]>([])

  async function buscarPacientes(q: string) {
    if (q.length < 3) return
    const res = await fetch(`/api/saude/paciente?busca=${q}&limit=10`).then(r => r.json())
    setPacientes(res.pacientes ?? [])
  }

  const F = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const valido = form.pacienteId && form.procedimentoNome && form.justificativaClinica.length >= 10
    && form.unidadeSolicitante && form.profissionalSolicitante

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Nova Solicitação de Regulação</h2>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <div className="p-6 space-y-4">
          {/* Paciente */}
          <div>
            <label className="text-xs font-medium text-slate-600">Paciente *</label>
            {form.pacienteId ? (
              <div className="mt-1 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-green-800">{form.pacienteNome}</span>
                <button onClick={() => setForm(f => ({ ...f, pacienteId: '', pacienteNome: '' }))} className="ml-auto text-green-400 hover:text-green-600">×</button>
              </div>
            ) : (
              <div className="relative mt-1">
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                  placeholder="Digite nome, CNS ou CPF..." value={buscaPac}
                  onChange={e => { setBuscaPac(e.target.value); buscarPacientes(e.target.value) }} />
                {pacientes.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {pacientes.map(p => (
                      <button key={p.id} onClick={() => { setForm(f => ({ ...f, pacienteId: p.id, pacienteNome: p.nomeCompleto })); setPacientes([]) }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 border-b border-slate-50 last:border-0">
                        <span className="font-medium">{p.nomeCompleto}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600">Tipo *</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.tipo} onChange={e => F('tipo', e.target.value)}>
                {Object.entries(TIPO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Prioridade *</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.prioridade} onChange={e => F('prioridade', e.target.value)}>
                <option value="ELETIVO">Eletivo</option>
                <option value="PRIORITARIO">Prioritário</option>
                <option value="URGENTE">🚨 Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Procedimento *</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
              placeholder="Nome do procedimento ou especialidade..."
              value={form.procedimentoNome} onChange={e => F('procedimentoNome', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600">Código TUSS/SIGTAP</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                placeholder="0301010064" value={form.procedimentoCod}
                onChange={e => F('procedimentoCod', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">CID-10 de Indicação</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                placeholder="Ex: M54.5" value={form.cid10Indicacao}
                onChange={e => F('cid10Indicacao', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Justificativa Clínica * (mín. 10 caracteres)</label>
            <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none resize-none" rows={3}
              value={form.justificativaClinica} onChange={e => F('justificativaClinica', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600">Unidade Solicitante *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.unidadeSolicitante} onChange={e => F('unidadeSolicitante', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Profissional Solicitante *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.profissionalSolicitante} onChange={e => F('profissionalSolicitante', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onFechar} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
          <button onClick={() => onSalvar(form)} disabled={!valido}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">
            Criar Solicitação
          </button>
        </div>
      </div>
    </div>
  )
}
