'use client'

import { useState, useEffect, useCallback } from 'react'

interface AgendaItem {
  id: string
  numero: string
  tipo: string
  dataHora: string
  situacao: string
  queixaPrincipal?: string
  cid10Principal?: string
  conduta?: string
  prescricao?: string
  encaminhamento?: string
  pressaoSistolica?: number
  pressaoDiastolica?: number
  frequenciaCardiaca?: number
  temperatura?: number
  peso?: number
  altura?: number
  imc?: number
  saturacaoO2?: number
  paciente: { nomeCompleto: string; nomeSocial?: string; dataNascimento: string; telefoneCelular?: string }
  profissional?: { nomeCompleto: string; especialidade: string }
}

const SIT_COR: Record<string, string> = {
  AGENDADO: 'bg-blue-100 text-blue-800',
  EM_ESPERA: 'bg-yellow-100 text-yellow-800',
  EM_ATENDIMENTO: 'bg-orange-100 text-orange-800',
  CONCLUIDO: 'bg-green-100 text-green-800',
  FALTOU: 'bg-red-100 text-red-700',
  CANCELADO: 'bg-gray-100 text-gray-600',
}

const TIPO_ICON: Record<string, string> = {
  CONSULTA: '🩺', RETORNO: '🔄', URGENCIA_EMERGENCIA: '🚨',
  VISITA_DOMICILIAR: '🏠', PROCEDIMENTO: '⚕️', EXAME: '🔬',
  VACINACAO: '💉', PRE_NATAL: '🤱', PUERICULTURA: '👶',
  PLANEJAMENTO_FAMILIAR: '👨‍👩‍👧', SAUDE_MENTAL: '🧠',
}

const TIPO_LABEL: Record<string, string> = {
  CONSULTA: 'Consulta', RETORNO: 'Retorno', URGENCIA_EMERGENCIA: 'Urgência',
  VISITA_DOMICILIAR: 'Visita Domiciliar', PROCEDIMENTO: 'Procedimento', EXAME: 'Exame',
  VACINACAO: 'Vacinação', PRE_NATAL: 'Pré-natal', PUERICULTURA: 'Puericultura',
  PLANEJAMENTO_FAMILIAR: 'Plan. Familiar', SAUDE_MENTAL: 'Saúde Mental',
}

const fmtH = (s: string) => new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const fmtD = (s: string) => new Date(s).toLocaleDateString('pt-BR')
const calcIdade = (d: string) => {
  const diff = Date.now() - new Date(d).getTime()
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
}

export default function AtendimentosPage() {
  const [agenda, setAgenda] = useState<AgendaItem[]>([])
  const [kpis, setKpis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dataRef, setDataRef] = useState(new Date().toISOString().slice(0, 10))

  const [atdSel, setAtdSel] = useState<AgendaItem | null>(null)
  const [modalConcluir, setModalConcluir] = useState(false)
  const [modalVacina, setModalVacina] = useState(false)
  const [formConcluir, setFormConcluir] = useState<any>({})
  const [formVacina, setFormVacina] = useState<any>({})
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/saude/atendimento?relatorio=AGENDA&data=${dataRef}`)
      const d = await r.json()
      setAgenda(d.agenda ?? [])
      setKpis(d.kpis)
    } finally { setLoading(false) }
  }, [dataRef])

  useEffect(() => { carregar() }, [carregar])

  const mudarSituacao = async (atd: AgendaItem, acao: string) => {
    await fetch('/api/saude/atendimento', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: atd.id, acao }),
    })
    carregar()
    if (atdSel?.id === atd.id) setAtdSel(prev => prev ? { ...prev, situacao: acao === 'INICIAR' ? 'EM_ATENDIMENTO' : acao } : null)
  }

  const concluir = async () => {
    if (!atdSel) return
    setSalvando(true); setErro('')
    try {
      const r = await fetch('/api/saude/atendimento', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: atdSel.id, acao: 'CONCLUIR', ...formConcluir }),
      })
      const d = await r.json()
      if (!r.ok) { setErro(d.erro?.fieldErrors ? JSON.stringify(d.erro.fieldErrors) : d.erro); return }
      setModalConcluir(false)
      carregar()
      setAtdSel(prev => prev ? { ...prev, situacao: 'CONCLUIDO', ...formConcluir, imc: d.imc } : null)
    } finally { setSalvando(false) }
  }

  const registrarVacina = async () => {
    if (!atdSel) return
    setSalvando(true); setErro('')
    try {
      const r = await fetch('/api/saude/atendimento', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: atdSel.id, acao: 'VACINAR', ...formVacina }),
      })
      const d = await r.json()
      if (!r.ok) { setErro(d.erro); return }
      setModalVacina(false)
      setFormVacina({})
    } finally { setSalvando(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center"><div className="text-4xl mb-2">📅</div><p className="text-gray-500">Carregando agenda...</p></div>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda de Atendimentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestão da agenda diária e registro de atendimentos</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { const d = new Date(dataRef); d.setDate(d.getDate()-1); setDataRef(d.toISOString().slice(0,10)) }}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">‹</button>
          <input type="date" value={dataRef} onChange={e => setDataRef(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          <button onClick={() => { const d = new Date(dataRef); d.setDate(d.getDate()+1); setDataRef(d.toISOString().slice(0,10)) }}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">›</button>
          <button onClick={() => setDataRef(new Date().toISOString().slice(0,10))}
            className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium">Hoje</button>
        </div>
      </div>

      {/* KPIs do dia */}
      {kpis && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total', valor: kpis.total, icon: '📋', cor: 'gray' },
            { label: 'Aguardando', valor: kpis.aguardando, icon: '⏳', cor: 'yellow' },
            { label: 'Concluídos', valor: kpis.concluidos, icon: '✅', cor: 'green' },
            { label: 'Faltou', valor: kpis.faltou, icon: '❌', cor: 'red' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <div className="text-2xl mb-1">{k.icon}</div>
              <div className="text-2xl font-bold text-gray-900">{k.valor}</div>
              <div className="text-xs text-gray-500">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agenda */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">
              {agenda.length} atendimento{agenda.length !== 1 ? 's' : ''} em {fmtD(dataRef + 'T12:00:00')}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {agenda.length === 0 ? (
              <p className="text-center text-gray-400 py-12">Nenhum atendimento nesta data</p>
            ) : agenda.map(a => (
              <div key={a.id} onClick={() => setAtdSel(a)}
                className={`flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${atdSel?.id === a.id ? 'bg-blue-50' : ''}`}>
                <div className="text-center min-w-12">
                  <div className="text-2xl">{TIPO_ICON[a.tipo] ?? '📋'}</div>
                  <div className="text-xs font-mono text-gray-500 mt-0.5">{fmtH(a.dataHora)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{a.paciente?.nomeSocial ?? a.paciente?.nomeCompleto}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span>{TIPO_LABEL[a.tipo] ?? a.tipo}</span>
                    {a.paciente?.dataNascimento && <span>· {calcIdade(a.paciente.dataNascimento)} anos</span>}
                    {a.profissional && <span>· {a.profissional.nomeCompleto}</span>}
                  </div>
                  {a.queixaPrincipal && <div className="text-xs text-gray-400 truncate mt-0.5">"{a.queixaPrincipal}"</div>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SIT_COR[a.situacao] ?? 'bg-gray-100'}`}>
                    {a.situacao.replace(/_/g,' ')}
                  </span>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {a.situacao === 'AGENDADO' && (
                      <button onClick={() => mudarSituacao(a, 'INICIAR')} className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded hover:bg-orange-200">Chamar</button>
                    )}
                    {a.situacao === 'EM_ATENDIMENTO' && (
                      <button onClick={() => { setAtdSel(a); setFormConcluir({}); setModalConcluir(true) }}
                        className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200">Concluir</button>
                    )}
                    {['AGENDADO','EM_ESPERA'].includes(a.situacao) && (
                      <button onClick={() => mudarSituacao(a, 'FALTOU')} className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200">Faltou</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detalhe */}
        <div>
          {atdSel ? (
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-mono text-gray-400">{atdSel.numero}</span>
                  <h3 className="font-semibold text-gray-900 mt-0.5">{atdSel.paciente?.nomeCompleto}</h3>
                  {atdSel.paciente?.telefoneCelular && (
                    <p className="text-xs text-gray-500">📱 {atdSel.paciente.telefoneCelular}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${SIT_COR[atdSel.situacao] ?? 'bg-gray-100'}`}>
                  {atdSel.situacao.replace(/_/g,' ')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-400">Tipo:</span> <span className="font-medium">{TIPO_LABEL[atdSel.tipo]}</span></div>
                <div><span className="text-gray-400">Hora:</span> <span className="font-medium">{fmtH(atdSel.dataHora)}</span></div>
                {atdSel.profissional && (
                  <div className="col-span-2"><span className="text-gray-400">Prof.:</span> <span className="font-medium">{atdSel.profissional.nomeCompleto}</span></div>
                )}
              </div>

              {/* Dados clínicos (quando concluído) */}
              {atdSel.situacao === 'CONCLUIDO' && (
                <div className="space-y-2">
                  {atdSel.cid10Principal && (
                    <div className="bg-blue-50 rounded-lg p-2 text-xs">
                      <span className="text-blue-500 font-medium">CID-10:</span> {atdSel.cid10Principal}
                    </div>
                  )}
                  {/* Sinais vitais */}
                  {(atdSel.pressaoSistolica || atdSel.temperatura || atdSel.peso) && (
                    <div className="bg-gray-50 rounded-lg p-2 text-xs grid grid-cols-2 gap-1">
                      {atdSel.pressaoSistolica && <div>PA: {atdSel.pressaoSistolica}/{atdSel.pressaoDiastolica} mmHg</div>}
                      {atdSel.frequenciaCardiaca && <div>FC: {atdSel.frequenciaCardiaca} bpm</div>}
                      {atdSel.temperatura && <div>Temp: {atdSel.temperatura}°C</div>}
                      {atdSel.saturacaoO2 && <div>SpO2: {atdSel.saturacaoO2}%</div>}
                      {atdSel.peso && <div>Peso: {atdSel.peso} kg</div>}
                      {atdSel.imc && <div>IMC: {Number(atdSel.imc).toFixed(1)}</div>}
                    </div>
                  )}
                  {atdSel.conduta && (
                    <div>
                      <div className="text-xs text-gray-400 mb-0.5">Conduta:</div>
                      <p className="text-xs text-gray-700 bg-gray-50 rounded p-2">{atdSel.conduta}</p>
                    </div>
                  )}
                  {atdSel.prescricao && (
                    <div>
                      <div className="text-xs text-gray-400 mb-0.5">Prescrição:</div>
                      <p className="text-xs text-gray-700 bg-green-50 rounded p-2">{atdSel.prescricao}</p>
                    </div>
                  )}
                  {atdSel.encaminhamento && (
                    <div className="bg-yellow-50 rounded-lg p-2 text-xs">
                      <span className="text-yellow-700 font-medium">Encaminhamento:</span> {atdSel.encaminhamento}
                    </div>
                  )}
                </div>
              )}

              {/* Ações */}
              <div className="flex flex-wrap gap-2">
                {atdSel.situacao === 'AGENDADO' && (
                  <button onClick={() => mudarSituacao(atdSel, 'INICIAR')}
                    className="flex-1 text-xs px-2 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 font-medium">Chamar Paciente</button>
                )}
                {atdSel.situacao === 'EM_ATENDIMENTO' && (
                  <>
                    <button onClick={() => { setFormConcluir({}); setModalConcluir(true) }}
                      className="flex-1 text-xs px-2 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium">✅ Concluir</button>
                    <button onClick={() => { setFormVacina({ dataAplicacao: new Date().toISOString().slice(0,10) }); setModalVacina(true) }}
                      className="flex-1 text-xs px-2 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium">💉 Vacinar</button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
              <div className="text-4xl mb-2">📅</div>
              <p className="text-gray-400 text-sm">Selecione um atendimento para ver detalhes</p>
            </div>
          )}
        </div>
      </div>

      {/* ══ MODAL: Concluir Atendimento ════════════════════════════════════════ */}
      {modalConcluir && atdSel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Concluir Atendimento - {atdSel.paciente?.nomeCompleto}</h2>
              <button onClick={() => setModalConcluir(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {erro && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{erro}</div>}

              {/* Sinais vitais */}
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sinais Vitais</div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'pressaoSistolica', label: 'PA Sistólica', placeholder: 'Ex: 120' },
                    { key: 'pressaoDiastolica', label: 'PA Diastólica', placeholder: 'Ex: 80' },
                    { key: 'frequenciaCardiaca', label: 'FC (bpm)', placeholder: 'Ex: 72' },
                    { key: 'temperatura', label: 'Temp. (°C)', placeholder: 'Ex: 36.5' },
                    { key: 'saturacaoO2', label: 'SpO2 (%)', placeholder: 'Ex: 98' },
                    { key: 'peso', label: 'Peso (kg)', placeholder: 'Ex: 70' },
                    { key: 'altura', label: 'Altura (cm)', placeholder: 'Ex: 170' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                      <input type="number" placeholder={f.placeholder} value={formConcluir[f.key] ?? ''}
                        onChange={e => setFormConcluir((p: any) => ({ ...p, [f.key]: e.target.value ? Number(e.target.value) : undefined }))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Clínico */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Queixa Principal</label>
                <input value={formConcluir.queixaPrincipal ?? ''} onChange={e => setFormConcluir((p: any) => ({ ...p, queixaPrincipal: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">CID-10 Principal</label>
                  <input value={formConcluir.cid10Principal ?? ''} onChange={e => setFormConcluir((p: any) => ({ ...p, cid10Principal: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: J00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">CID-10 Secundário</label>
                  <input value={formConcluir.cid10Secundario ?? ''} onChange={e => setFormConcluir((p: any) => ({ ...p, cid10Secundario: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Opcional" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Hipótese Diagnóstica / Diagnóstico</label>
                <textarea value={formConcluir.hipoteseDiag ?? ''} onChange={e => setFormConcluir((p: any) => ({ ...p, hipoteseDiag: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Conduta</label>
                <textarea value={formConcluir.conduta ?? ''} onChange={e => setFormConcluir((p: any) => ({ ...p, conduta: e.target.value }))}
                  rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Prescrição</label>
                <textarea value={formConcluir.prescricao ?? ''} onChange={e => setFormConcluir((p: any) => ({ ...p, prescricao: e.target.value }))}
                  rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Encaminhamento para</label>
                  <input value={formConcluir.encaminhamento ?? ''} onChange={e => setFormConcluir((p: any) => ({ ...p, encaminhamento: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Especialidade ou serviço" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Retorno em</label>
                  <input type="date" value={formConcluir.retornoEm ?? ''} onChange={e => setFormConcluir((p: any) => ({ ...p, retornoEm: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setModalConcluir(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={concluir} disabled={salvando}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                {salvando ? 'Registrando...' : '✅ Concluir Atendimento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Registrar Vacinação ══════════════════════════════════════════ */}
      {modalVacina && atdSel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">💉 Registrar Vacinação</h2>
              <button onClick={() => setModalVacina(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {erro && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{erro}</div>}
              <p className="text-sm text-gray-600">Paciente: <span className="font-medium">{atdSel.paciente?.nomeCompleto}</span></p>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Imunobiológico (vacina) *</label>
                <input value={formVacina.imunobiologico ?? ''} onChange={e => setFormVacina((p: any) => ({ ...p, imunobiologico: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Influenza, COVID-19, Hepatite B..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Dose</label>
                  <select value={formVacina.dose ?? ''} onChange={e => setFormVacina((p: any) => ({ ...p, dose: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Selecione</option>
                    {['D1','D2','D3','D4','Reforço','Reforço 2','Anual','Dose Única'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Data de Aplicação</label>
                  <input type="date" value={formVacina.dataAplicacao ?? new Date().toISOString().slice(0,10)}
                    onChange={e => setFormVacina((p: any) => ({ ...p, dataAplicacao: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Lote</label>
                  <input value={formVacina.lote ?? ''} onChange={e => setFormVacina((p: any) => ({ ...p, lote: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fabricante</label>
                  <input value={formVacina.fabricante ?? ''} onChange={e => setFormVacina((p: any) => ({ ...p, fabricante: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setModalVacina(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={registrarVacina} disabled={salvando || !formVacina.imunobiologico}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {salvando ? 'Registrando...' : '💉 Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
