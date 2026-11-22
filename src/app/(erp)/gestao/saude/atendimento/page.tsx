'use client'
import { useState, useEffect, useCallback } from 'react'

interface Atendimento {
  id: string; tipo: string; dataAtendimento: string
  subjetivo?: string; objetivo?: string; avaliacao?: string; plano?: string
  pa?: string; fc?: number; fr?: number; temperatura?: number
  peso?: number; altura?: number; saturacao?: number; glicemia?: number
  cidPrincipal?: string; cidDescricao?: string
  paciente:     { nome: string; cpf?: string }
  profissional: { nome: string; especialidade: string }
  unidade:      { nome: string }
  _count?:      { prescricoes: number; encaminhamentos: number }
  prescricoes?:  any[]
  encaminhamentos?: any[]
}

interface Paciente { id: string; nome: string; cpf?: string; dataNascimento?: string }
interface Profissional { id: string; nome: string; especialidade: string }
interface Unidade { id: string; nome: string }

const BRL = (v: number) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const DATA_HORA = (s: string) => new Date(s).toLocaleString('pt-BR')

const TIPO_COR: Record<string, string> = {
  CONSULTA: 'bg-blue-100 text-blue-800', URGENCIA: 'bg-red-100 text-red-800',
  PROCEDIMENTO: 'bg-purple-100 text-purple-800', VACINA: 'bg-green-100 text-green-800',
  ODONTOLOGICO: 'bg-cyan-100 text-cyan-800', VISITA_DOMICILIAR: 'bg-orange-100 text-orange-800',
}

// ─── Modal Prontuário ────────────────────────────────────────────────────────
function ModalProntuario({
  agendamentoId, pacienteId: pacienteIdInicial, profissionais, unidades,
  onClose, onSalvo,
}: {
  agendamentoId?: string; pacienteId?: string
  profissionais: Profissional[]; unidades: Unidade[]
  onClose: () => void; onSalvo: () => void
}) {
  const [form, setForm] = useState({
    agendamentoId: agendamentoId || '',
    pacienteId: pacienteIdInicial || '',
    profissionalId: '', unidadeId: '', tipo: 'CONSULTA',
    // SOAP
    subjetivo: '', objetivo: '', avaliacao: '', plano: '',
    // Sinais vitais
    pa: '', fc: '', fr: '', temperatura: '', peso: '', altura: '', saturacao: '', glicemia: '',
    // CID-10
    cidPrincipal: '', cidDescricao: '',
  })
  const [buscaPac, setBuscaPac] = useState('')
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [prescricoes, setPrescricoes] = useState<{ medicamento: string; dosagem: string; posologia: string; quantidade: string }[]>([])
  const [encaminhamentos, setEncaminhamentos] = useState<{ especialidade: string; prioridade: string; justificativa: string }[]>([])
  const [aba, setAba] = useState<'soap'|'vitais'|'rx'|'enc'>('soap')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (buscaPac.length < 2) return
    const t = setTimeout(async () => {
      const r = await fetch(`/api/saude/paciente?busca=${buscaPac}`)
      const j = await r.json()
      setPacientes(j.pacientes || [])
    }, 350)
    return () => clearTimeout(t)
  }, [buscaPac])

  async function salvar() {
    setErro(''); setCarregando(true)
    try {
      const payload: any = {
        ...form,
        fc:          form.fc          ? Number(form.fc)          : undefined,
        fr:          form.fr          ? Number(form.fr)          : undefined,
        temperatura: form.temperatura ? Number(form.temperatura) : undefined,
        peso:        form.peso        ? Number(form.peso)        : undefined,
        altura:      form.altura      ? Number(form.altura)      : undefined,
        saturacao:   form.saturacao   ? Number(form.saturacao)   : undefined,
        glicemia:    form.glicemia    ? Number(form.glicemia)    : undefined,
        prescricoes: prescricoes.filter(p => p.medicamento).map(p => ({
          ...p, quantidade: Number(p.quantidade) || 1,
        })),
        encaminhamentos: encaminhamentos.filter(e => e.especialidade),
      }
      if (!payload.agendamentoId) delete payload.agendamentoId
      const r = await fetch('/api/saude/atendimento', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await r.json()
      if (!r.ok) { setErro(j.erro?.formErrors?.[0] || j.erro || 'Erro'); return }
      onSalvo()
    } finally { setCarregando(false) }
  }

  const addPrescricao = () => setPrescricoes(p => [...p, { medicamento: '', dosagem: '', posologia: '', quantidade: '1' }])
  const addEnc = () => setEncaminhamentos(e => [...e, { especialidade: '', prioridade: 'ELETIVO', justificativa: '' }])

  const ABA = [
    { id: 'soap', label: '📝 SOAP' },
    { id: 'vitais', label: '💓 Sinais Vitais' },
    { id: 'rx', label: `💊 Prescrições${prescricoes.length > 0 ? ` (${prescricoes.length})` : ''}` },
    { id: 'enc', label: `📨 Encaminhamentos${encaminhamentos.length > 0 ? ` (${encaminhamentos.length})` : ''}` },
  ] as const

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[95vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="font-semibold text-lg">Registrar Atendimento</h2>
          <p className="text-xs text-gray-500">Prontuário Eletrônico - SOAP</p>
        </div>
        <div className="p-6 space-y-4">

          {/* Paciente */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-600 mb-1">Paciente *</label>
            <input value={buscaPac} onChange={e => setBuscaPac(e.target.value)}
              placeholder="Buscar..." className="w-full border rounded-lg px-3 py-2 text-sm" />
            {pacientes.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 bg-white border rounded-lg shadow-lg mt-1 max-h-32 overflow-y-auto">
                {pacientes.map(p => (
                  <button key={p.id} onClick={() => { setForm(f => ({ ...f, pacienteId: p.id })); setBuscaPac(p.nome); setPacientes([]) }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-0">
                    {p.nome}{p.cpf && <span className="text-gray-400 ml-2 text-xs">{p.cpf}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {['CONSULTA','URGENCIA','PROCEDIMENTO','VACINA','ODONTOLOGICO','VISITA_DOMICILIAR'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Profissional *</label>
              <select value={form.profissionalId} onChange={e => setForm(f => ({ ...f, profissionalId: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unidade</label>
              <select value={form.unidadeId} onChange={e => setForm(f => ({ ...f, unidadeId: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
          </div>

          {/* Abas */}
          <div className="border rounded-xl overflow-hidden">
            <div className="flex border-b bg-gray-50">
              {ABA.map(a => (
                <button key={a.id} onClick={() => setAba(a.id as any)}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition-colors
                    ${aba === a.id ? 'bg-white border-b-2 border-blue-600 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
                  {a.label}
                </button>
              ))}
            </div>

            <div className="p-4">
              {aba === 'soap' && (
                <div className="space-y-3">
                  {[
                    { key: 'subjetivo', label: 'S - Subjetivo (queixa, HDA)', placeholder: 'O paciente refere...' },
                    { key: 'objetivo', label: 'O - Objetivo (exame físico)', placeholder: 'Ao exame...' },
                    { key: 'avaliacao', label: 'A - Avaliação (diagnóstico / CID)', placeholder: 'Hipótese diagnóstica...' },
                    { key: 'plano', label: 'P - Plano (conduta)', placeholder: 'Prescrito... Encaminhado...' },
                  ].map(campo => (
                    <div key={campo.key}>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">{campo.label}</label>
                      <textarea value={(form as any)[campo.key]}
                        onChange={e => setForm(f => ({ ...f, [campo.key]: e.target.value }))}
                        placeholder={campo.placeholder}
                        className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">CID-10</label>
                      <input value={form.cidPrincipal} onChange={e => setForm(f => ({ ...f, cidPrincipal: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="J06.9" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
                      <input value={form.cidDescricao} onChange={e => setForm(f => ({ ...f, cidDescricao: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                </div>
              )}

              {aba === 'vitais' && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'pa', label: 'P.A.', placeholder: '120/80', text: true },
                    { key: 'fc', label: 'F.C. (bpm)', placeholder: '72' },
                    { key: 'fr', label: 'F.R. (irpm)', placeholder: '16' },
                    { key: 'temperatura', label: 'Temperatura (°C)', placeholder: '36.5' },
                    { key: 'saturacao', label: 'SpO2 (%)', placeholder: '98' },
                    { key: 'glicemia', label: 'Glicemia (mg/dL)', placeholder: '90' },
                    { key: 'peso', label: 'Peso (kg)', placeholder: '70.0' },
                    { key: 'altura', label: 'Altura (m)', placeholder: '1.70' },
                  ].map(sv => (
                    <div key={sv.key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{sv.label}</label>
                      <input type={sv.text ? 'text' : 'number'} step="0.1"
                        value={(form as any)[sv.key]}
                        onChange={e => setForm(f => ({ ...f, [sv.key]: e.target.value }))}
                        placeholder={sv.placeholder}
                        className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                  ))}
                  {form.peso && form.altura && (
                    <div className="col-span-3 bg-blue-50 rounded-lg p-3 text-sm">
                      IMC: <strong>{(Number(form.peso) / (Number(form.altura) ** 2)).toFixed(1)}</strong>
                    </div>
                  )}
                </div>
              )}

              {aba === 'rx' && (
                <div className="space-y-3">
                  {prescricoes.map((p, i) => (
                    <div key={i} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                      <div className="grid grid-cols-2 gap-2">
                        <input value={p.medicamento} onChange={e => setPrescricoes(ps => ps.map((x, j) => j === i ? { ...x, medicamento: e.target.value } : x))}
                          placeholder="Medicamento *" className="border rounded-lg px-3 py-1.5 text-sm" />
                        <input value={p.dosagem} onChange={e => setPrescricoes(ps => ps.map((x, j) => j === i ? { ...x, dosagem: e.target.value } : x))}
                          placeholder="Dosagem (ex: 500mg)" className="border rounded-lg px-3 py-1.5 text-sm" />
                        <input value={p.posologia} onChange={e => setPrescricoes(ps => ps.map((x, j) => j === i ? { ...x, posologia: e.target.value } : x))}
                          placeholder="Posologia (ex: 1cp de 8/8h por 7d)" className="border rounded-lg px-3 py-1.5 text-sm col-span-2" />
                        <input type="number" value={p.quantidade} onChange={e => setPrescricoes(ps => ps.map((x, j) => j === i ? { ...x, quantidade: e.target.value } : x))}
                          placeholder="Qtd" className="border rounded-lg px-3 py-1.5 text-sm" />
                        <button onClick={() => setPrescricoes(ps => ps.filter((_, j) => j !== i))}
                          className="text-red-500 text-sm hover:text-red-700">Remover</button>
                      </div>
                    </div>
                  ))}
                  <button onClick={addPrescricao} className="w-full py-2 text-sm border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:border-blue-500">
                    + Adicionar Medicamento
                  </button>
                </div>
              )}

              {aba === 'enc' && (
                <div className="space-y-3">
                  {encaminhamentos.map((e, i) => (
                    <div key={i} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                      <div className="grid grid-cols-2 gap-2">
                        <input value={e.especialidade} onChange={ev => setEncaminhamentos(es => es.map((x, j) => j === i ? { ...x, especialidade: ev.target.value } : x))}
                          placeholder="Especialidade *" className="border rounded-lg px-3 py-1.5 text-sm" />
                        <select value={e.prioridade} onChange={ev => setEncaminhamentos(es => es.map((x, j) => j === i ? { ...x, prioridade: ev.target.value } : x))}
                          className="border rounded-lg px-3 py-1.5 text-sm">
                          <option value="ELETIVO">Eletivo</option>
                          <option value="PRIORITARIO">Prioritário</option>
                          <option value="URGENTE">Urgente</option>
                        </select>
                        <textarea value={e.justificativa} onChange={ev => setEncaminhamentos(es => es.map((x, j) => j === i ? { ...x, justificativa: ev.target.value } : x))}
                          placeholder="Justificativa clínica" className="border rounded-lg px-3 py-1.5 text-sm col-span-2" rows={2} />
                        <button onClick={() => setEncaminhamentos(es => es.filter((_, j) => j !== i))}
                          className="text-red-500 text-sm">Remover</button>
                      </div>
                    </div>
                  ))}
                  <button onClick={addEnc} className="w-full py-2 text-sm border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:border-blue-500">
                    + Adicionar Encaminhamento
                  </button>
                </div>
              )}
            </div>
          </div>

          {erro && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{erro}</div>}
        </div>
        <div className="p-6 border-t flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
          <button onClick={salvar}
            disabled={carregando || !form.pacienteId || !form.profissionalId || !form.unidadeId}
            className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {carregando ? 'Salvando…' : 'Salvar Prontuário'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Painel do Atendimento ────────────────────────────────────────────────────
function PainelAtendimento({ at }: { at: Atendimento }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm space-y-0">
      <div className="p-5 border-b flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_COR[at.tipo] || 'bg-gray-100 text-gray-700'}`}>{at.tipo}</span>
            {at.cidPrincipal && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-mono">{at.cidPrincipal}</span>}
          </div>
          <p className="font-bold text-gray-900">{at.paciente.nome}</p>
          <p className="text-xs text-gray-500">{at.profissional.nome} · {at.profissional.especialidade}</p>
        </div>
        <p className="text-xs text-gray-400">{DATA_HORA(at.dataAtendimento)}</p>
      </div>

      {/* SOAP */}
      {[
        { key: 'subjetivo', label: 'S - Subjetivo', cor: 'bg-blue-50 border-blue-200' },
        { key: 'objetivo',  label: 'O - Objetivo',  cor: 'bg-green-50 border-green-200' },
        { key: 'avaliacao', label: 'A - Avaliação',  cor: 'bg-yellow-50 border-yellow-200' },
        { key: 'plano',     label: 'P - Plano',      cor: 'bg-purple-50 border-purple-200' },
      ].filter(c => (at as any)[c.key]).map(c => (
        <div key={c.key} className={`p-4 border-b border ${c.cor}`}>
          <p className="text-xs font-semibold text-gray-500 mb-1">{c.label}</p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{(at as any)[c.key]}</p>
        </div>
      ))}

      {/* Sinais vitais */}
      {(at.pa || at.fc || at.temperatura || at.peso) && (
        <div className="p-4 border-b">
          <p className="text-xs font-semibold text-gray-500 mb-2">SINAIS VITAIS</p>
          <div className="flex flex-wrap gap-3">
            {at.pa          && <span className="bg-red-50 text-red-700 px-2 py-1 rounded text-xs">PA: {at.pa} mmHg</span>}
            {at.fc          && <span className="bg-pink-50 text-pink-700 px-2 py-1 rounded text-xs">FC: {at.fc} bpm</span>}
            {at.temperatura && <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs">Temp: {at.temperatura}°C</span>}
            {at.saturacao   && <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">SpO2: {at.saturacao}%</span>}
            {at.glicemia    && <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs">Gli: {at.glicemia} mg/dL</span>}
            {at.peso && at.altura && (
              <span className="bg-teal-50 text-teal-700 px-2 py-1 rounded text-xs">
                IMC: {(at.peso / (at.altura ** 2)).toFixed(1)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Prescrições */}
      {at.prescricoes && at.prescricoes.length > 0 && (
        <div className="p-4 border-b">
          <p className="text-xs font-semibold text-gray-500 mb-2">PRESCRIÇÕES ({at.prescricoes.length})</p>
          {at.prescricoes.map((p: any, i: number) => (
            <div key={i} className="text-sm mb-1 flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">💊</span>
              <div>
                <span className="font-medium">{p.medicamento}</span> {p.dosagem}
                <span className="text-gray-500 text-xs block">{p.posologia} · Qtd: {p.quantidade}</span>
                {p.dispensado && <span className="text-green-600 text-xs">✔ Dispensado</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Encaminhamentos */}
      {at.encaminhamentos && at.encaminhamentos.length > 0 && (
        <div className="p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">ENCAMINHAMENTOS</p>
          {at.encaminhamentos.map((e: any, i: number) => (
            <div key={i} className="text-sm mb-1 flex items-center gap-2">
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${e.prioridade === 'URGENTE' ? 'bg-red-100 text-red-700' : e.prioridade === 'PRIORITARIO' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                {e.prioridade}
              </span>
              <span>{e.especialidade}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function AtendimentoPage() {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [selecionado, setSelecionado] = useState<Atendimento | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [modalNovo, setModalNovo] = useState(false)
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [busca, setBusca] = useState('')
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10))
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    Promise.all([
      fetch('/api/saude/profissional').then(r => r.json()),
      fetch('/api/saude/unidade').then(r => r.json()),
    ]).then(([jp, ju]) => {
      setProfissionais(jp.profissionais || [])
      setUnidades(ju.unidades || [])
    })
  }, [])

  const carregar = useCallback(async () => {
    setCarregando(true)
    const params = new URLSearchParams({ dataInicio, dataFim })
    const r = await fetch(`/api/saude/atendimento?${params}`)
    const j = await r.json()
    setAtendimentos(j.atendimentos || [])
    setCarregando(false)
  }, [dataInicio, dataFim])

  useEffect(() => { carregar() }, [carregar])

  async function selecionarAtendimento(at: Atendimento) {
    const r = await fetch(`/api/saude/atendimento?id=${at.id}`)
    const j = await r.json()
    setSelecionado(j.atendimento)
  }

  const filtrados = busca
    ? atendimentos.filter(a => a.paciente.nome.toLowerCase().includes(busca.toLowerCase()))
    : atendimentos

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prontuários / Atendimentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">LGPD Art. 11 - Dados sensíveis de saúde</p>
        </div>
        <button onClick={() => setModalNovo(true)}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          + Novo Atendimento
        </button>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Lista */}
        <div className="col-span-2 space-y-3">
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar paciente..."
              className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {carregando ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">Carregando…</div>
          ) : filtrados.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
              <p className="text-3xl mb-2">🏥</p>
              <p>Nenhum atendimento encontrado</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
              {filtrados.map(at => {
                const ativo = selecionado?.id === at.id
                return (
                  <button key={at.id} onClick={() => selecionarAtendimento(at)}
                    className={`w-full text-left bg-white rounded-xl border p-4 hover:border-blue-300 transition-colors ${ativo ? 'border-blue-500 ring-1 ring-blue-200' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_COR[at.tipo] || 'bg-gray-100 text-gray-700'}`}>{at.tipo}</span>
                      <span className="text-xs text-gray-400">{new Date(at.dataAtendimento).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 truncate">{at.paciente.nome}</p>
                    <p className="text-xs text-gray-500">{at.profissional.nome}</p>
                    {at._count && (at._count.prescricoes > 0 || at._count.encaminhamentos > 0) && (
                      <div className="flex gap-2 mt-1">
                        {at._count.prescricoes > 0 && <span className="text-xs text-blue-600">💊 {at._count.prescricoes} Rx</span>}
                        {at._count.encaminhamentos > 0 && <span className="text-xs text-purple-600">📨 {at._count.encaminhamentos} enc.</span>}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Painel detalhe */}
        <div className="col-span-3">
          {selecionado ? (
            <PainelAtendimento at={selecionado} />
          ) : (
            <div className="bg-white rounded-xl border p-16 text-center text-gray-400">
              <p className="text-4xl mb-3">🩺</p>
              <p>Selecione um atendimento para ver o prontuário</p>
            </div>
          )}
        </div>
      </div>

      {modalNovo && (
        <ModalProntuario profissionais={profissionais} unidades={unidades}
          onClose={() => setModalNovo(false)} onSalvo={() => { setModalNovo(false); carregar() }} />
      )}
    </div>
  )
}
