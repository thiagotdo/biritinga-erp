'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Calendar, ChevronLeft, ChevronRight, Plus, X,
  Clock, Stethoscope, CheckCircle, AlertCircle,
  XCircle, RotateCcw, Coffee, Search, Loader2,
} from 'lucide-react'

type StatusAg = 'AGENDADO' | 'CONFIRMADO' | 'EM_ATENDIMENTO' | 'REALIZADO' | 'CANCELADO' | 'FALTA' | 'REMARCADO'

interface Agendamento {
  id: string
  hora: string
  pacienteNome: string
  cpf?: string
  profissionalNome?: string
  especialidade?: string
  tipoConsulta?: string
  unidadeNome?: string
  status: StatusAg
  prioridade?: boolean
  observacoes?: string
}

const STATUS_INFO: Record<string, { label: string; cor: string; bg: string; icon: React.ReactNode }> = {
  AGENDADO:        { label: 'Agendado',       cor: 'text-blue-700',   bg: 'bg-blue-100',   icon: <Clock className="w-3.5 h-3.5" /> },
  CONFIRMADO:      { label: 'Confirmado',     cor: 'text-green-700',  bg: 'bg-green-100',  icon: <CheckCircle className="w-3.5 h-3.5" /> },
  EM_ATENDIMENTO:  { label: 'Em atendimento', cor: 'text-indigo-700', bg: 'bg-indigo-100', icon: <Stethoscope className="w-3.5 h-3.5" /> },
  REALIZADO:       { label: 'Realizado',      cor: 'text-teal-700',   bg: 'bg-teal-100',   icon: <CheckCircle className="w-3.5 h-3.5" /> },
  CANCELADO:       { label: 'Cancelado',      cor: 'text-red-700',    bg: 'bg-red-100',    icon: <XCircle className="w-3.5 h-3.5" /> },
  FALTA:           { label: 'Falta',          cor: 'text-orange-700', bg: 'bg-orange-100', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  REMARCADO:       { label: 'Remarcado',      cor: 'text-gray-700',   bg: 'bg-gray-100',   icon: <RotateCcw className="w-3.5 h-3.5" /> },
}

function getDiaLabel(offset: number) {
  const d = new Date(); d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}
function getDataIso(offset: number) {
  const d = new Date(); d.setDate(d.getDate() + offset)
  return d.toISOString().split('T')[0]
}
function getDataFormatada(offset: number) {
  const d = new Date(); d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

export default function AgendamentosPage() {
  const [diaOffset, setDiaOffset] = useState(0)
  const [filtroStatus, setFiltroStatus] = useState<StatusAg | ''>('')
  const [filtroProfissional, setFiltroProfissional] = useState('')
  const [modalNovoAg, setModalNovoAg] = useState(false)
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ pacienteId: '', unidadeId: '', profissionalId: '', data: getDataIso(0), hora: '', tipoConsulta: 'Consulta de Rotina', prioridade: false, observacoes: '' })
  const [pacientes, setPacientes] = useState<{ id: string; nome: string; cpf?: string }[]>([])
  const [unidades, setUnidades] = useState<{ id: string; nome: string }[]>([])
  const [profissionais, setProfissionais] = useState<{ id: string; nome: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(() => {
    setLoading(true)
    const data = getDataIso(diaOffset)
    const params = new URLSearchParams({ data })
    if (filtroStatus) params.set('status', filtroStatus)
    fetch(`/api/saude/agendamentos?${params}`)
      .then(r => r.json())
      .then(d => { setAgendamentos(d.agendamentos ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [diaOffset, filtroStatus])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    fetch('/api/saude/pacientes?limit=200').then(r => r.json()).then(d => setPacientes(d.pacientes ?? [])).catch(() => {})
    fetch('/api/saude/unidade').then(r => r.json()).then(d => setUnidades(d.unidades ?? [])).catch(() => {})
    fetch('/api/saude/profissional').then(r => r.json()).then(d => setProfissionais(d.profissionais ?? [])).catch(() => {})
  }, [])

  const atualizarStatus = async (id: string, status: string) => {
    await fetch('/api/saude/agendamentos', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    carregar()
  }

  const salvar = async () => {
    if (!form.pacienteId || !form.data || !form.hora) return setErro('Dados obrigatórios faltando')
    setSalvando(true); setErro('')
    const r = await fetch('/api/saude/agendamentos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await r.json()
    setSalvando(false)
    if (!r.ok) return setErro(d.erro ?? 'Erro ao salvar')
    setModalNovoAg(false)
    carregar()
  }

  const filtrados = filtroProfissional
    ? agendamentos.filter(a => a.profissionalNome === filtroProfissional)
    : agendamentos

  const kpis = {
    total: agendamentos.length,
    realizados: agendamentos.filter(a => a.status === 'REALIZADO').length,
    emAtendimento: agendamentos.filter(a => a.status === 'EM_ATENDIMENTO').length,
    faltas: agendamentos.filter(a => a.status === 'FALTA').length,
    aguardando: agendamentos.filter(a => ['AGENDADO', 'CONFIRMADO'].includes(a.status)).length,
  }

  const profissionaisUnicos = [...new Set(agendamentos.map(a => a.profissionalNome).filter(Boolean))] as string[]

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Agendamentos</h1>
            <p className="text-xs text-gray-500 capitalize">{getDataFormatada(diaOffset)}</p>
          </div>
        </div>
        <button onClick={() => setModalNovoAg(true)}
          className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Novo Agendamento
        </button>
      </div>

      {/* Navegação de dias */}
      <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        <button onClick={() => setDiaOffset(d => d - 1)} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        {[-2, -1, 0, 1, 2].map(o => (
          <button key={o} onClick={() => setDiaOffset(o)}
            className={`flex-1 text-center py-2 rounded-xl text-xs transition-colors ${o === diaOffset ? 'bg-blue-600 text-white font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
            {getDiaLabel(o)}
          </button>
        ))}
        <button onClick={() => setDiaOffset(d => d + 1)} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
        <button onClick={() => setDiaOffset(0)} className="ml-2 text-xs text-blue-600 font-medium hover:underline">Hoje</button>
      </div>

      {/* KPIs do dia */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total',      valor: kpis.total,         cor: 'text-gray-800' },
          { label: 'Aguardando', valor: kpis.aguardando,    cor: 'text-blue-600' },
          { label: 'Em atend.',  valor: kpis.emAtendimento, cor: 'text-indigo-600' },
          { label: 'Realizados', valor: kpis.realizados,    cor: 'text-green-600' },
          { label: 'Faltas',     valor: kpis.faltas,        cor: 'text-orange-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
            <p className={`text-2xl font-bold ${k.cor}`}>{k.valor}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap flex-1">
          {(['', 'AGENDADO', 'CONFIRMADO', 'EM_ATENDIMENTO', 'REALIZADO', 'FALTA', 'CANCELADO'] as (StatusAg | '')[]).map(s => {
            const info = s ? STATUS_INFO[s] : null
            return (
              <button key={s || 'todos'} onClick={() => setFiltroStatus(s)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filtroStatus === s
                  ? s ? `${info!.bg} ${info!.cor} border-transparent font-medium` : 'bg-gray-900 text-white border-transparent font-medium'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                {s ? info!.label : 'Todos'}
              </button>
            )
          })}
        </div>
        <select value={filtroProfissional} onChange={e => setFiltroProfissional(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none bg-white">
          <option value="">Todos profissionais</option>
          {profissionaisUnicos.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin w-6 h-6 text-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {filtrados.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Coffee className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum agendamento neste dia</p>
            </div>
          ) : filtrados.map(ag => {
            const statusInfo = STATUS_INFO[ag.status] ?? STATUS_INFO['AGENDADO']
            return (
              <div key={ag.id} className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors ${ag.prioridade ? 'border-l-4 border-orange-400' : ''}`}>
                <div className="text-center min-w-[52px]">
                  <p className="text-sm font-bold text-gray-800">{ag.hora}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{ag.pacienteNome}</p>
                    {ag.prioridade && <AlertCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-400">{ag.cpf ?? ''}{ag.tipoConsulta ? ` · ${ag.tipoConsulta}` : ''}</p>
                  {ag.observacoes && <p className="text-xs text-orange-600 mt-0.5">⚠ {ag.observacoes}</p>}
                </div>
                {ag.profissionalNome && (
                  <div className="text-right hidden md:block">
                    <p className="text-xs font-medium text-gray-700">{ag.profissionalNome}</p>
                    {ag.especialidade && <p className="text-xs text-gray-400">{ag.especialidade}</p>}
                  </div>
                )}
                <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${statusInfo.bg} ${statusInfo.cor}`}>
                  {statusInfo.icon}
                  {statusInfo.label}
                </div>
                {['AGENDADO', 'CONFIRMADO'].includes(ag.status) && (
                  <div className="flex gap-1">
                    <button onClick={() => atualizarStatus(ag.id, ag.status === 'AGENDADO' ? 'CONFIRMADO' : 'EM_ATENDIMENTO')}
                      className="text-xs text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded-lg">
                      {ag.status === 'AGENDADO' ? 'Confirmar' : 'Iniciar'}
                    </button>
                    <button onClick={() => atualizarStatus(ag.id, 'CANCELADO')}
                      className="text-xs text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg">
                      Cancelar
                    </button>
                  </div>
                )}
                {ag.status === 'EM_ATENDIMENTO' && (
                  <button onClick={() => atualizarStatus(ag.id, 'REALIZADO')}
                    className="text-xs text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded-lg">
                    Finalizar
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Novo Agendamento */}
      {modalNovoAg && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModalNovoAg(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Novo Agendamento</h2>
              <button onClick={() => setModalNovoAg(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              {erro && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{erro}</div>}
              <div>
                <label className="text-xs font-medium text-gray-600">Paciente *</label>
                <select className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  value={form.pacienteId} onChange={e => setForm(f => ({ ...f, pacienteId: e.target.value }))}>
                  <option value="">Selecionar paciente...</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Unidade</label>
                  <select className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white"
                    value={form.unidadeId} onChange={e => setForm(f => ({ ...f, unidadeId: e.target.value }))}>
                    <option value="">Qualquer</option>
                    {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Profissional</label>
                  <select className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white"
                    value={form.profissionalId} onChange={e => setForm(f => ({ ...f, profissionalId: e.target.value }))}>
                    <option value="">Qualquer disponível</option>
                    {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Data *</label>
                  <input type="date" className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Horário *</label>
                  <input type="time" className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600">Tipo de Consulta</label>
                  <select className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white"
                    value={form.tipoConsulta} onChange={e => setForm(f => ({ ...f, tipoConsulta: e.target.value }))}>
                    {['Consulta de Rotina','Consulta de Retorno','Pré-Natal','Consulta HIPERDIA','Puericultura','Urgência/Emergência','Saúde Mental'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600">Observações</label>
                  <textarea rows={2} className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none"
                    value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-xl border border-orange-100">
                <input type="checkbox" id="prior" checked={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.checked }))} className="accent-orange-500" />
                <label htmlFor="prior" className="text-sm text-orange-800">Marcar como prioridade / urgência</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 pt-0">
              <button onClick={() => setModalNovoAg(false)} className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={salvar} disabled={salvando}
                className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmar Agendamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
