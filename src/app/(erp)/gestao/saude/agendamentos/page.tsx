'use client'

import { useState } from 'react'
import {
  Calendar, ChevronLeft, ChevronRight, Plus, X,
  Clock, User, Stethoscope, CheckCircle, AlertCircle,
  XCircle, RotateCcw, Coffee, Search,
} from 'lucide-react'

type StatusAg = 'AGENDADO' | 'CONFIRMADO' | 'EM_ATENDIMENTO' | 'REALIZADO' | 'CANCELADO' | 'FALTA' | 'REMARCADO'

interface Agendamento {
  id: string
  hora: string
  paciente: string
  cpf: string
  profissional: string
  especialidade: string
  tipo: string
  unidade: string
  status: StatusAg
  prioridade: boolean
  observacoes?: string
}

const STATUS_INFO: Record<StatusAg, { label: string; cor: string; bg: string; icon: React.ReactNode }> = {
  AGENDADO:        { label: 'Agendado',       cor: 'text-blue-700',   bg: 'bg-blue-100',   icon: <Clock className="w-3.5 h-3.5" /> },
  CONFIRMADO:      { label: 'Confirmado',     cor: 'text-green-700',  bg: 'bg-green-100',  icon: <CheckCircle className="w-3.5 h-3.5" /> },
  EM_ATENDIMENTO:  { label: 'Em atendimento', cor: 'text-indigo-700', bg: 'bg-indigo-100', icon: <Stethoscope className="w-3.5 h-3.5" /> },
  REALIZADO:       { label: 'Realizado',      cor: 'text-teal-700',   bg: 'bg-teal-100',   icon: <CheckCircle className="w-3.5 h-3.5" /> },
  CANCELADO:       { label: 'Cancelado',      cor: 'text-red-700',    bg: 'bg-red-100',    icon: <XCircle className="w-3.5 h-3.5" /> },
  FALTA:           { label: 'Falta',          cor: 'text-orange-700', bg: 'bg-orange-100', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  REMARCADO:       { label: 'Remarcado',      cor: 'text-gray-700',   bg: 'bg-gray-100',   icon: <RotateCcw className="w-3.5 h-3.5" /> },
}

const MOCK_AGENDAMENTOS: Agendamento[] = [
  { id: '1', hora: '07:30', paciente: 'Maria das Graças Santos', cpf: '123.456.789-00', profissional: 'Dr. Marcos Vieira', especialidade: 'Clínica Geral', tipo: 'Consulta HIPERDIA', unidade: 'UBS Centro', status: 'REALIZADO', prioridade: false },
  { id: '2', hora: '08:00', paciente: 'João Pereira da Silva', cpf: '234.567.890-11', profissional: 'Dr. Marcos Vieira', especialidade: 'Clínica Geral', tipo: 'Consulta de Retorno', unidade: 'UBS Centro', status: 'REALIZADO', prioridade: false },
  { id: '3', hora: '08:30', paciente: 'Luciana Ferreira Costa', cpf: '567.890.123-44', profissional: 'Dra. Ana Paula Costa', especialidade: 'Ginecologia', tipo: 'Pré-Natal', unidade: 'UBS Centro', status: 'EM_ATENDIMENTO', prioridade: true, observacoes: 'Gestação 24 semanas' },
  { id: '4', hora: '09:00', paciente: 'Francisca Oliveira Lima', cpf: '345.678.901-22', profissional: 'Dr. Paulo Santos', especialidade: 'Pediatria', tipo: 'Consulta de Rotina', unidade: 'UBS Centro', status: 'CONFIRMADO', prioridade: false },
  { id: '5', hora: '09:30', paciente: 'Antônio Carlos Souza', cpf: '456.789.012-33', profissional: 'Dra. Carla Mendes', especialidade: 'Psiquiatria', tipo: 'Consulta Saúde Mental', unidade: 'CAPS João da Cruz', status: 'AGENDADO', prioridade: false },
  { id: '6', hora: '10:00', paciente: 'Raimundo Neto Alves', cpf: '678.901.234-55', profissional: 'Dr. Marcos Vieira', especialidade: 'Clínica Geral', tipo: 'Consulta HIPERDIA', unidade: 'UBS Centro', status: 'FALTA', prioridade: false },
  { id: '7', hora: '10:30', paciente: 'Sebastiana Lima Cruz', cpf: '789.012.345-66', profissional: 'Dr. Paulo Santos', especialidade: 'Pediatria', tipo: 'Puericultura', unidade: 'UBS Centro', status: 'CONFIRMADO', prioridade: false },
  { id: '8', hora: '11:00', paciente: 'Carlos Almeida Melo', cpf: '890.123.456-77', profissional: 'Dr. Marcos Vieira', especialidade: 'Clínica Geral', tipo: 'Primeira Consulta', unidade: 'UBS Centro', status: 'AGENDADO', prioridade: false },
  { id: '9', hora: '14:00', paciente: 'Ana Beatriz Rezende', cpf: '901.234.567-88', profissional: 'Dra. Ana Paula Costa', especialidade: 'Ginecologia', tipo: 'Consulta Preventivo', unidade: 'UBS Centro', status: 'CONFIRMADO', prioridade: false },
  { id: '10', hora: '14:30', paciente: 'Marcos dos Santos', cpf: '012.345.678-99', profissional: 'Dra. Carla Mendes', especialidade: 'Psiquiatria', tipo: 'Consulta Saúde Mental', unidade: 'CAPS João da Cruz', status: 'AGENDADO', prioridade: true, observacoes: 'Crise relatada pela família' },
]

function getDiaLabel(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function getDataFormatada(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

export default function AgendamentosPage() {
  const [diaOffset, setDiaOffset] = useState(0)
  const [filtroStatus, setFiltroStatus] = useState<StatusAg | ''>('')
  const [filtroProfissional, setFiltroProfissional] = useState('')
  const [modalNovoAg, setModalNovoAg] = useState(false)
  const [visualizacao, setVisualizacao] = useState<'lista' | 'profissional'>('lista')

  const profissionais = [...new Set(MOCK_AGENDAMENTOS.map(a => a.profissional))]

  const filtrados = MOCK_AGENDAMENTOS.filter(ag => {
    const matchStatus = !filtroStatus || ag.status === filtroStatus
    const matchProf = !filtroProfissional || ag.profissional === filtroProfissional
    return matchStatus && matchProf
  })

  // KPI do dia
  const kpis = {
    total: MOCK_AGENDAMENTOS.length,
    realizados: MOCK_AGENDAMENTOS.filter(a => a.status === 'REALIZADO').length,
    emAtendimento: MOCK_AGENDAMENTOS.filter(a => a.status === 'REALIZADO' || a.status === 'EM_ATENDIMENTO').length,
    faltas: MOCK_AGENDAMENTOS.filter(a => a.status === 'FALTA').length,
    aguardando: MOCK_AGENDAMENTOS.filter(a => ['AGENDADO', 'CONFIRMADO'].includes(a.status)).length,
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Agendamentos</h1>
            <p className="text-xs text-gray-500">{getDataFormatada(diaOffset)}</p>
          </div>
        </div>
        <button
          onClick={() => setModalNovoAg(true)}
          className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Agendamento
        </button>
      </div>

      {/* Navegação de dias */}
      <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        <button onClick={() => setDiaOffset(d => d - 1)} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        {[-2, -1, 0, 1, 2].map(o => (
          <button
            key={o}
            onClick={() => setDiaOffset(o)}
            className={`flex-1 text-center py-2 rounded-xl text-xs transition-colors ${
              o === diaOffset
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {getDiaLabel(o)}
          </button>
        ))}
        <button onClick={() => setDiaOffset(d => d + 1)} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={() => setDiaOffset(0)}
          className="ml-2 text-xs text-blue-600 font-medium hover:underline"
        >
          Hoje
        </button>
      </div>

      {/* KPIs do dia */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total', valor: kpis.total, cor: 'text-gray-800' },
          { label: 'Aguardando', valor: kpis.aguardando, cor: 'text-blue-600' },
          { label: 'Em atend.', valor: 1, cor: 'text-indigo-600' },
          { label: 'Realizados', valor: kpis.realizados, cor: 'text-green-600' },
          { label: 'Faltas', valor: kpis.faltas, cor: 'text-orange-600' },
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
              <button
                key={s || 'todos'}
                onClick={() => setFiltroStatus(s)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  filtroStatus === s
                    ? s ? `${info!.bg} ${info!.cor} border-transparent font-medium` : 'bg-gray-900 text-white border-transparent font-medium'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {s ? info!.label : 'Todos'}
              </button>
            )
          })}
        </div>
        <select
          value={filtroProfissional}
          onChange={e => setFiltroProfissional(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
        >
          <option value="">Todos profissionais</option>
          {profissionais.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Lista de agendamentos */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {filtrados.map(ag => {
          const statusInfo = STATUS_INFO[ag.status]
          return (
            <div key={ag.id} className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors ${ag.prioridade ? 'border-l-4 border-orange-400' : ''}`}>
              {/* Hora */}
              <div className="text-center min-w-[52px]">
                <p className="text-sm font-bold text-gray-800">{ag.hora}</p>
              </div>

              {/* Paciente */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{ag.paciente}</p>
                  {ag.prioridade && <AlertCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                </div>
                <p className="text-xs text-gray-400">{ag.cpf} · {ag.tipo}</p>
                {ag.observacoes && <p className="text-xs text-orange-600 mt-0.5">⚠ {ag.observacoes}</p>}
              </div>

              {/* Profissional */}
              <div className="text-right hidden md:block">
                <p className="text-xs font-medium text-gray-700">{ag.profissional}</p>
                <p className="text-xs text-gray-400">{ag.especialidade}</p>
              </div>

              {/* Status */}
              <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${statusInfo.bg} ${statusInfo.cor}`}>
                {statusInfo.icon}
                {statusInfo.label}
              </div>

              {/* Ações */}
              {['AGENDADO', 'CONFIRMADO'].includes(ag.status) && (
                <div className="flex gap-1">
                  <button className="text-xs text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded-lg transition-colors">
                    Confirmar
                  </button>
                  <button className="text-xs text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors">
                    Cancelar
                  </button>
                </div>
              )}
              {ag.status === 'EM_ATENDIMENTO' && (
                <button className="text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors">
                  Ver consulta
                </button>
              )}
            </div>
          )
        })}
        {filtrados.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Coffee className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum agendamento encontrado</p>
          </div>
        )}
      </div>

      {/* Modal Novo Agendamento */}
      {modalNovoAg && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Novo Agendamento</h2>
              <button onClick={() => setModalNovoAg(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              {/* Busca paciente */}
              <div>
                <label className="text-xs font-medium text-gray-600">Paciente *</label>
                <div className="relative mt-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" placeholder="Buscar paciente por nome ou CPF..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Unidade *</label>
                  <select className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white">
                    <option>UBS Centro</option>
                    <option>USF Bairro Novo</option>
                    <option>UPA Municipal</option>
                    <option>CAPS João da Cruz</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Profissional</label>
                  <select className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white">
                    <option value="">Qualquer disponível</option>
                    <option>Dr. Marcos Vieira</option>
                    <option>Dra. Ana Paula Costa</option>
                    <option>Dr. Paulo Santos</option>
                    <option>Dra. Carla Mendes</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Data *</label>
                  <input type="date" className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Horário *</label>
                  <input type="time" className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600">Tipo de Consulta *</label>
                  <select className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white">
                    <option>Consulta de Rotina</option>
                    <option>Consulta de Retorno</option>
                    <option>Pré-Natal</option>
                    <option>Consulta HIPERDIA</option>
                    <option>Puericultura</option>
                    <option>Urgência/Emergência</option>
                    <option>Saúde Mental</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600">Observações</label>
                  <textarea rows={2} className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" placeholder="Observações sobre o agendamento..." />
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-xl border border-orange-100">
                <input type="checkbox" id="prioridade" className="accent-orange-500" />
                <label htmlFor="prioridade" className="text-sm text-orange-800">Marcar como prioridade / urgência</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 pt-0">
              <button onClick={() => setModalNovoAg(false)} className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Confirmar Agendamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
