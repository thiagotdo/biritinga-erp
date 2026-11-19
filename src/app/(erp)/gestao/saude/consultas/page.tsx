'use client'

import { useState } from 'react'
import {
  Stethoscope, Search, Plus, X, ChevronDown, ChevronUp,
  CheckCircle, Edit3, PenTool, Thermometer, Heart,
  Activity, Droplets, Wind, Scale, Ruler,
  Pill, FlaskConical, FileText, Clock, AlertCircle,
} from 'lucide-react'

interface SinaisVitais {
  pressao: string; fc: number; fr: number; temp: number; sat: number; peso: number; altura: number; glicemia?: number
}

interface Prescricao { medicamento: string; dose: string; freq: string; duracao?: string; via?: string; continuo?: boolean }
interface Exame { nome: string; indicacao?: string; urgente?: boolean }

interface ConsultaForm {
  paciente: string; profissional: string; tipo: string; agendamentoId?: string
  sinaisVitais: Partial<SinaisVitais>
  queixaPrincipal: string; historicoDoenca: string; exameFisico: string
  hipotese: string; cid10: string; conduta: string; encaminhamento: string
  subjetivo: string; objetivo: string; avaliacao: string; plano: string
  prescricoes: Prescricao[]; exames: Exame[]
}

const IMC_LABEL = (imc: number): { label: string; cor: string } => {
  if (imc < 18.5) return { label: 'Abaixo do peso', cor: 'text-blue-600' }
  if (imc < 25)   return { label: 'Peso normal', cor: 'text-green-600' }
  if (imc < 30)   return { label: 'Sobrepeso', cor: 'text-orange-500' }
  return { label: 'Obesidade', cor: 'text-red-600' }
}

const MOCK_FILA = [
  { id: '1', paciente: 'Luciana Ferreira Costa', hora: '08:30', tipo: 'Pré-Natal', aguardando: true },
  { id: '2', paciente: 'Francisca Oliveira Lima', hora: '09:00', tipo: 'Puericultura', aguardando: true },
  { id: '3', paciente: 'Antônio Carlos Souza', hora: '09:30', tipo: 'Saúde Mental', aguardando: true },
]

function calcIMC(peso: number, altura: number): number {
  const hm = altura / 100
  return parseFloat((peso / (hm * hm)).toFixed(1))
}

export default function ConsultasPage() {
  const [consultaAtiva, setConsultaAtiva] = useState<string | null>(null)
  const [secaoAberta, setSecaoAberta] = useState<string>('sinais')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [form, setForm] = useState<ConsultaForm>({
    paciente: '', profissional: 'Dr. Marcos Vieira', tipo: 'CONSULTA_ROTINA',
    sinaisVitais: {},
    queixaPrincipal: '', historicoDoenca: '', exameFisico: '',
    hipotese: '', cid10: '', conduta: '', encaminhamento: '',
    subjetivo: '', objetivo: '', avaliacao: '', plano: '',
    prescricoes: [], exames: [],
  })
  const [novaPrescricao, setNovaPrescricao] = useState<Partial<Prescricao>>({})
  const [novoExame, setNovoExame] = useState('')

  const sv = form.sinaisVitais
  const imc = sv.peso && sv.altura ? calcIMC(sv.peso, sv.altura) : null

  const setSV = (k: keyof SinaisVitais, v: string | number) =>
    setForm(f => ({ ...f, sinaisVitais: { ...f.sinaisVitais, [k]: v } }))

  const addPrescricao = () => {
    if (!novaPrescricao.medicamento || !novaPrescricao.dose || !novaPrescricao.freq) return
    setForm(f => ({ ...f, prescricoes: [...f.prescricoes, novaPrescricao as Prescricao] }))
    setNovaPrescricao({})
  }

  const addExame = () => {
    if (!novoExame.trim()) return
    setForm(f => ({ ...f, exames: [...f.exames, { nome: novoExame.trim() }] }))
    setNovoExame('')
  }

  const handleSalvar = async (acao: 'salvar_rascunho' | 'finalizar' | 'assinar') => {
    setSalvando(true)
    await new Promise(r => setTimeout(r, 1200))
    setSalvando(false)
    setSalvo(true)
    setTimeout(() => setSalvo(false), 3000)
  }

  const toggle = (s: string) => setSecaoAberta(o => o === s ? '' : s)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Consultas / Prontuário</h1>
            <p className="text-xs text-gray-500">Registro de atendimentos clínicos</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Fila de espera */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" /> Aguardando Atendimento
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {MOCK_FILA.map(f => (
                <div
                  key={f.id}
                  className={`p-3 cursor-pointer hover:bg-indigo-50 transition-colors ${consultaAtiva === f.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}
                  onClick={() => { setConsultaAtiva(f.id); setForm(cf => ({ ...cf, paciente: f.paciente, tipo: f.tipo })) }}
                >
                  <p className="text-sm font-medium text-gray-800 leading-tight">{f.paciente}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{f.hora} · {f.tipo}</p>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gray-100">
              <button className="w-full text-xs text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Iniciar sem agendamento
              </button>
            </div>
          </div>
        </div>

        {/* Formulário do prontuário */}
        <div className="lg:col-span-3 space-y-3">
          {!consultaAtiva ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center text-gray-400">
              <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Selecione um paciente da fila<br />ou inicie um atendimento</p>
            </div>
          ) : (
            <>
              {/* Info paciente */}
              <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-indigo-900">{form.paciente}</p>
                  <p className="text-xs text-indigo-600">{form.tipo} · {form.profissional}</p>
                </div>
                <div className="flex gap-2">
                  {salvo && (
                    <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-lg">
                      <CheckCircle className="w-3.5 h-3.5" /> Salvo
                    </span>
                  )}
                  <button
                    onClick={() => handleSalvar('salvar_rascunho')}
                    disabled={salvando}
                    className="text-xs px-3 py-1.5 rounded-lg border border-indigo-300 text-indigo-700 hover:bg-indigo-100 transition-colors"
                  >
                    {salvando ? <Clock className="w-3 h-3 animate-spin inline mr-1" /> : null}
                    Salvar rascunho
                  </button>
                  <button
                    onClick={() => handleSalvar('finalizar')}
                    className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    Finalizar
                  </button>
                  <button
                    onClick={() => handleSalvar('assinar')}
                    className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-1"
                  >
                    <PenTool className="w-3 h-3" /> Assinar
                  </button>
                </div>
              </div>

              {/* Seção: Sinais Vitais */}
              <SecaoCard
                titulo="Sinais Vitais"
                icone={<Activity className="w-4 h-4 text-red-500" />}
                aberta={secaoAberta === 'sinais'}
                onToggle={() => toggle('sinais')}
              >
                <div className="grid grid-cols-4 gap-3">
                  <SVInput label="PA (mmHg)" placeholder="120/80" value={sv.pressao || ''} onChange={v => setSV('pressao', v)} />
                  <SVInput label="FC (bpm)" placeholder="72" type="number" value={sv.fc || ''} onChange={v => setSV('fc', Number(v))} icon={<Heart className="w-3.5 h-3.5 text-red-400" />} />
                  <SVInput label="FR (rpm)" placeholder="16" type="number" value={sv.fr || ''} onChange={v => setSV('fr', Number(v))} icon={<Wind className="w-3.5 h-3.5 text-blue-400" />} />
                  <SVInput label="Temp. (°C)" placeholder="36.5" type="number" step="0.1" value={sv.temp || ''} onChange={v => setSV('temp', Number(v))} icon={<Thermometer className="w-3.5 h-3.5 text-orange-400" />} />
                  <SVInput label="SpO2 (%)" placeholder="98" type="number" value={sv.sat || ''} onChange={v => setSV('sat', Number(v))} icon={<Droplets className="w-3.5 h-3.5 text-blue-500" />} />
                  <SVInput label="Peso (kg)" placeholder="70" type="number" step="0.1" value={sv.peso || ''} onChange={v => setSV('peso', Number(v))} icon={<Scale className="w-3.5 h-3.5 text-purple-400" />} />
                  <SVInput label="Altura (cm)" placeholder="170" type="number" value={sv.altura || ''} onChange={v => setSV('altura', Number(v))} icon={<Ruler className="w-3.5 h-3.5 text-teal-400" />} />
                  <SVInput label="Glicemia" placeholder="98" type="number" value={sv.glicemia || ''} onChange={v => setSV('glicemia', Number(v))} icon={<Droplets className="w-3.5 h-3.5 text-pink-400" />} />
                </div>
                {imc && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                    <span className="text-xs text-gray-500">IMC:</span>
                    <span className="text-sm font-bold text-gray-800">{imc}</span>
                    <span className={`text-xs font-medium ${IMC_LABEL(imc).cor}`}>{IMC_LABEL(imc).label}</span>
                  </div>
                )}
              </SecaoCard>

              {/* Seção: Anamnese / SOAP */}
              <SecaoCard
                titulo="Anamnese & SOAP"
                icone={<FileText className="w-4 h-4 text-blue-500" />}
                aberta={secaoAberta === 'anamnese'}
                onToggle={() => toggle('anamnese')}
              >
                <div className="space-y-3">
                  <TextareaField label="Queixa Principal" value={form.queixaPrincipal} onChange={v => setForm(f => ({ ...f, queixaPrincipal: v }))} rows={2} />
                  <TextareaField label="Histórico da Doença Atual (HDA)" value={form.historicoDoenca} onChange={v => setForm(f => ({ ...f, historicoDoenca: v }))} rows={3} />

                  <div className="grid grid-cols-2 gap-3">
                    <TextareaField label="S — Subjetivo" value={form.subjetivo} onChange={v => setForm(f => ({ ...f, subjetivo: v }))} placeholder="O que o paciente relata..." rows={3} />
                    <TextareaField label="O — Objetivo" value={form.objetivo} onChange={v => setForm(f => ({ ...f, objetivo: v }))} placeholder="Achados do exame físico..." rows={3} />
                    <TextareaField label="A — Avaliação" value={form.avaliacao} onChange={v => setForm(f => ({ ...f, avaliacao: v }))} placeholder="Hipótese diagnóstica..." rows={3} />
                    <TextareaField label="P — Plano" value={form.plano} onChange={v => setForm(f => ({ ...f, plano: v }))} placeholder="Conduta terapêutica..." rows={3} />
                  </div>
                </div>
              </SecaoCard>

              {/* Seção: Diagnóstico */}
              <SecaoCard
                titulo="Diagnóstico & Conduta"
                icone={<Edit3 className="w-4 h-4 text-teal-500" />}
                aberta={secaoAberta === 'diagnostico'}
                onToggle={() => toggle('diagnostico')}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Hipótese Diagnóstica</label>
                    <input value={form.hipotese} onChange={e => setForm(f => ({ ...f, hipotese: e.target.value }))} placeholder="Descrição do diagnóstico..." className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">CID-10 Principal</label>
                    <input value={form.cid10} onChange={e => setForm(f => ({ ...f, cid10: e.target.value }))} placeholder="Ex: I10, E11.9, Z00.0..." className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                  </div>
                  <div className="col-span-2">
                    <TextareaField label="Conduta / Tratamento" value={form.conduta} onChange={v => setForm(f => ({ ...f, conduta: v }))} rows={2} />
                  </div>
                  <div className="col-span-2">
                    <TextareaField label="Encaminhamento" value={form.encaminhamento} onChange={v => setForm(f => ({ ...f, encaminhamento: v }))} placeholder="Para especialidade ou serviço..." rows={2} />
                  </div>
                </div>
              </SecaoCard>

              {/* Seção: Prescrição */}
              <SecaoCard
                titulo={`Prescrições (${form.prescricoes.length})`}
                icone={<Pill className="w-4 h-4 text-purple-500" />}
                aberta={secaoAberta === 'prescricao'}
                onToggle={() => toggle('prescricao')}
              >
                {form.prescricoes.length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    {form.prescricoes.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg">
                        <Pill className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span className="flex-1 text-xs text-gray-800"><strong>{p.medicamento}</strong> {p.dose} — {p.freq}{p.duracao ? ` por ${p.duracao}` : ''}</span>
                        {p.continuo && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded-full">Contínuo</span>}
                        <button onClick={() => setForm(f => ({ ...f, prescricoes: f.prescricoes.filter((_, j) => j !== i) }))} className="text-gray-400 hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-5 gap-2">
                  <input value={novaPrescricao.medicamento || ''} onChange={e => setNovaPrescricao(p => ({ ...p, medicamento: e.target.value }))} placeholder="Medicamento" className="col-span-2 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                  <input value={novaPrescricao.dose || ''} onChange={e => setNovaPrescricao(p => ({ ...p, dose: e.target.value }))} placeholder="Dose" className="px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                  <input value={novaPrescricao.freq || ''} onChange={e => setNovaPrescricao(p => ({ ...p, freq: e.target.value }))} placeholder="Frequência" className="px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                  <button onClick={addPrescricao} className="bg-purple-600 text-white rounded-lg text-xs hover:bg-purple-700 transition-colors px-2">
                    <Plus className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              </SecaoCard>

              {/* Seção: Exames */}
              <SecaoCard
                titulo={`Solicitação de Exames (${form.exames.length})`}
                icone={<FlaskConical className="w-4 h-4 text-cyan-500" />}
                aberta={secaoAberta === 'exames'}
                onToggle={() => toggle('exames')}
              >
                {form.exames.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {form.exames.map((e, i) => (
                      <span key={i} className="flex items-center gap-1 text-xs bg-cyan-50 text-cyan-800 px-2 py-1 rounded-full border border-cyan-100">
                        {e.nome}
                        {e.urgente && <AlertCircle className="w-3 h-3 text-red-500" />}
                        <button onClick={() => setForm(f => ({ ...f, exames: f.exames.filter((_, j) => j !== i) }))} className="ml-0.5 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input value={novoExame} onChange={e => setNovoExame(e.target.value)} onKeyDown={e => e.key === 'Enter' && addExame()} placeholder="Nome do exame (Enter para adicionar)" className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
                  <button onClick={addExame} className="bg-cyan-600 text-white rounded-lg text-xs hover:bg-cyan-700 transition-colors px-3 py-2">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-2 flex gap-1.5 flex-wrap">
                  {['Hemograma', 'Glicemia de jejum', 'Urina tipo I', 'Lipidograma', 'TSH', 'HbA1c'].map(e => (
                    <button key={e} onClick={() => setForm(f => ({ ...f, exames: [...f.exames, { nome: e }] }))} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-full transition-colors">
                      + {e}
                    </button>
                  ))}
                </div>
              </SecaoCard>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SecaoCard({ titulo, icone, aberta, onToggle, children }: {
  titulo: string; icone: React.ReactNode; aberta: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors" onClick={onToggle}>
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          {icone} {titulo}
        </span>
        {aberta ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {aberta && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

function SVInput({ label, value, onChange, placeholder, type = 'text', step, icon }: {
  label: string; value: any; onChange: (v: string) => void; placeholder?: string; type?: string; step?: string; icon?: React.ReactNode
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 flex items-center gap-1">{icon}{label}</label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
      />
    </div>
  )
}

function TextareaField({ label, value, onChange, placeholder, rows = 2 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
      />
    </div>
  )
}
