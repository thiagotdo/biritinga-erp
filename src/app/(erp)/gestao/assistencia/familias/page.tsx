'use client'
import { useState, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Unidade = { id: string; nome: string; tipo: string; _count: { familias: number } }
type Familia = {
  id: string; numeroProntuario: string; responsavelNome: string
  bairro?: string; telefone?: string; situacao: string
  nivelVulnerabilidade: string; quantidadeMembros: number
  rendaFamiliar?: number; percapita?: number
  bolsaFamilia: boolean; bpc: boolean
  criancas: boolean; idosos: boolean; pcd: boolean; violencia: boolean; situacaoRua: boolean
  dataIngresso: string; unidade?: { nome: string }
  _count: { atendimentos: number; beneficios: number }
}
type FamiliaDetalhe = Familia & {
  responsavelCpf?: string; responsavelNis?: string; logradouro?: string
  numeroCadunico?: string; cadunico: boolean; gestante: boolean; substancias: boolean
  observacoes?: string; membros: any[]
  atendimentos: any[]; beneficios: any[]
}
type KPIs = {
  total: number; ativas: number; bolsaFamilia: number; bpc: number
  situacaoRua: number; criancas: number; idosos: number; pcd: number; violencia: number; atendMes: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const NIVEL_COR: Record<string, string> = {
  BAIXO:     'bg-green-100 text-green-700',
  MEDIO:     'bg-yellow-100 text-yellow-700',
  ALTO:      'bg-orange-100 text-orange-700',
  MUITO_ALTO: 'bg-red-100 text-red-700',
}
const NIVEL_LABEL: Record<string, string> = {
  BAIXO: 'Baixo', MEDIO: 'Médio', ALTO: 'Alto', MUITO_ALTO: 'Muito Alto',
}

function BadgeVulnerabilidade({ nivel }: { nivel: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${NIVEL_COR[nivel] ?? 'bg-gray-100 text-gray-600'}`}>
      {NIVEL_LABEL[nivel] ?? nivel}
    </span>
  )
}

// ─── Modal Família ────────────────────────────────────────────────────────────
function ModalFamilia({ unidades, onSalvar, onClose }: {
  unidades: Unidade[]; onSalvar: (d: any) => void; onClose: () => void
}) {
  const [form, setForm] = useState({
    responsavelNome: '', responsavelCpf: '', responsavelNis: '', responsavelSexo: 'F',
    telefone: '', bairro: '', logradouro: '', numero: '', cep: '',
    quantidadeMembros: 1, rendaFamiliar: '', percapita: '',
    unidadeId: '', nivelVulnerabilidade: 'MEDIO',
    bolsaFamilia: false, bpc: false, cadunico: false, numeroCadunico: '',
    criancas: false, idosos: false, pcd: false, gestante: false,
    violencia: false, substancias: false, situacaoRua: false,
    observacoes: '',
  })
  const f = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))
  const [aba, setAba] = useState<'basico' | 'programas' | 'vulnerabilidades'>('basico')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Nova Família — Prontuário SUAS</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* Tabs */}
        <div className="border-b px-6 flex gap-1">
          {(['basico', 'programas', 'vulnerabilidades'] as const).map(t => (
            <button key={t} onClick={() => setAba(t)}
              className={`py-2 px-3 text-sm font-medium border-b-2 transition-colors capitalize ${aba === t ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'basico' ? 'Dados Básicos' : t === 'programas' ? 'Programas Sociais' : 'Vulnerabilidades'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {aba === 'basico' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nome do Responsável *</label>
                  <input type="text" value={form.responsavelNome} onChange={e => f('responsavelNome', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">CPF</label>
                  <input type="text" value={form.responsavelCpf} onChange={e => f('responsavelCpf', e.target.value)} placeholder="000.000.000-00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">NIS</label>
                  <input type="text" value={form.responsavelNis} onChange={e => f('responsavelNis', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Telefone</label>
                  <input type="text" value={form.telefone} onChange={e => f('telefone', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Bairro</label>
                  <input type="text" value={form.bairro} onChange={e => f('bairro', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nº de Membros</label>
                  <input type="number" value={form.quantidadeMembros} min={1} onChange={e => f('quantidadeMembros', Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Renda Familiar R$</label>
                  <input type="number" value={form.rendaFamiliar} min={0} step="0.01" onChange={e => f('rendaFamiliar', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Per Capita R$</label>
                  <input type="number" value={form.percapita} min={0} step="0.01" onChange={e => f('percapita', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Unidade de Referência</label>
                  <select value={form.unidadeId} onChange={e => f('unidadeId', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                    <option value="">Nenhuma</option>
                    {unidades.map(u => <option key={u.id} value={u.id}>{u.nome} ({u.tipo})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nível de Vulnerabilidade</label>
                  <select value={form.nivelVulnerabilidade} onChange={e => f('nivelVulnerabilidade', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                    <option value="BAIXO">Baixo</option>
                    <option value="MEDIO">Médio</option>
                    <option value="ALTO">Alto</option>
                    <option value="MUITO_ALTO">Muito Alto</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {aba === 'programas' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['bolsaFamilia', 'Bolsa Família / Auxílio Brasil'],
                  ['bpc', 'BPC (LOAS — Art. 20)'],
                  ['cadunico', 'Cadastrado no CadÚnico'],
                ].map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <input type="checkbox" checked={(form as any)[k]} onChange={e => f(k, e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600" />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
              {form.cadunico && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Número CadÚnico</label>
                  <input type="text" value={form.numeroCadunico} onChange={e => f('numeroCadunico', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={e => f('observacoes', e.target.value)} rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          )}

          {aba === 'vulnerabilidades' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Marque as vulnerabilidades identificadas na família (LGPD — dados tratados com sigilo):</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['criancas', '👶 Crianças (ECA)'],
                  ['idosos', '🧓 Idosos (Estatuto)'],
                  ['pcd', '♿ Pessoa com Deficiência'],
                  ['gestante', '🤰 Gestante'],
                  ['violencia', '⚠️ Situação de Violência'],
                  ['substancias', '💊 Uso de Substâncias'],
                  ['situacaoRua', '🏕️ Situação de Rua'],
                ].map(([k, label]) => (
                  <label key={k} className={`flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50 transition-colors ${(form as any)[k] ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
                    <input type="checkbox" checked={(form as any)[k]} onChange={e => f(k, e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-orange-600" />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button onClick={() => onSalvar(form)} disabled={!form.responsavelNome}
            className="px-6 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            Cadastrar Família
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Painel Família ───────────────────────────────────────────────────────────
function PainelFamilia({ familia, onNovoAtendimento }: { familia: FamiliaDetalhe; onNovoAtendimento: () => void }) {
  const flags = [
    { k: 'criancas',    l: '👶 Crianças',      v: familia.criancas },
    { k: 'idosos',      l: '🧓 Idosos',         v: familia.idosos },
    { k: 'pcd',         l: '♿ PcD',             v: familia.pcd },
    { k: 'gestante',    l: '🤰 Gestante',        v: familia.gestante },
    { k: 'violencia',   l: '⚠️ Violência',      v: familia.violencia },
    { k: 'substancias', l: '💊 Substâncias',    v: familia.substancias },
    { k: 'situacaoRua', l: '🏕️ Situação de Rua', v: familia.situacaoRua },
  ].filter(f => f.v)

  return (
    <div className="bg-white rounded-xl border border-gray-200 h-full flex flex-col">
      {/* Cabeçalho */}
      <div className="p-5 border-b">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{familia.responsavelNome}</h2>
            <div className="text-sm text-gray-500 mt-0.5">Prontuário: {familia.numeroProntuario}</div>
            {familia.bairro && <div className="text-xs text-gray-400 mt-0.5">{familia.bairro}</div>}
          </div>
          <BadgeVulnerabilidade nivel={familia.nivelVulnerabilidade} />
        </div>

        {/* Flags de vulnerabilidade */}
        {flags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {flags.map(f => (
              <span key={f.k} className="text-xs bg-orange-50 border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full">
                {f.l}
              </span>
            ))}
          </div>
        )}

        {/* Dados financeiros */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-sm font-bold text-gray-700">{familia.quantidadeMembros}</div>
            <div className="text-xs text-gray-400">membros</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-sm font-bold text-gray-700">
              {familia.rendaFamiliar ? `R$ ${Number(familia.rendaFamiliar).toFixed(0)}` : '—'}
            </div>
            <div className="text-xs text-gray-400">renda</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className={`text-sm font-bold ${Number(familia.percapita) <= 218 ? 'text-red-600' : 'text-gray-700'}`}>
              {familia.percapita ? `R$ ${Number(familia.percapita).toFixed(0)}` : '—'}
            </div>
            <div className="text-xs text-gray-400">per capita</div>
          </div>
        </div>

        {/* Programas */}
        <div className="mt-3 flex gap-1.5 flex-wrap">
          {familia.bolsaFamilia && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Bolsa Família</span>}
          {familia.bpc && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">BPC</span>}
          {familia.cadunico && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">CadÚnico</span>}
        </div>
      </div>

      {/* Histórico de atendimentos */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Atendimentos</h3>
          <button onClick={onNovoAtendimento}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">+ Registrar</button>
        </div>
        {familia.atendimentos.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-4">Nenhum atendimento registrado</div>
        ) : familia.atendimentos.slice(0, 10).map((at: any) => (
          <div key={at.id} className="border-b border-gray-100 py-2.5 last:border-0">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-medium text-gray-700">{at.tipo.replace(/_/g, ' ')}</div>
                <div className="text-xs text-gray-400">{new Date(at.dataAtendimento).toLocaleDateString('pt-BR')}</div>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                at.situacao === 'REALIZADO' ? 'bg-green-100 text-green-700' :
                at.situacao === 'AGENDADO'  ? 'bg-blue-100 text-blue-700' :
                at.situacao === 'FALTOU'    ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-600'
              }`}>{at.situacao}</span>
            </div>
            {at.descricao && <div className="text-xs text-gray-500 mt-1 line-clamp-2">{at.descricao}</div>}
          </div>
        ))}

        {/* Benefícios */}
        {familia.beneficios.length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-gray-700 mt-4 mb-2">Benefícios Ativos</h3>
            {familia.beneficios.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                <div className="text-xs font-medium text-gray-700">{b.tipo.replace(/_/g, ' ')}</div>
                {b.valor && <div className="text-xs text-green-600 font-semibold">R$ {Number(b.valor).toFixed(2)}</div>}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Modal Atendimento ────────────────────────────────────────────────────────
function ModalAtendimento({ familiaId, unidades, onSalvar, onClose }: {
  familiaId: string; unidades: Unidade[]; onSalvar: (d: any) => void; onClose: () => void
}) {
  const [form, setForm] = useState({
    unidadeId: unidades[0]?.id ?? '', tipo: 'ATENDIMENTO_INDIVIDUAL',
    dataAtendimento: new Date().toISOString().slice(0, 16),
    tecnicoNome: '', objetivo: '', descricao: '', encaminhamentos: '',
  })
  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-5 border-b"><h2 className="font-bold text-gray-800">Registrar Atendimento</h2></div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => f('tipo', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                {['RECEPCAO_TRIAGEM','ATENDIMENTO_INDIVIDUAL','ATENDIMENTO_FAMILIAR','VISITA_DOMICILIAR','REUNIAO_GRUPO','OFICINA','ENCAMINHAMENTO','ACOMPANHAMENTO'].map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Data/Hora</label>
              <input type="datetime-local" value={form.dataAtendimento} onChange={e => f('dataAtendimento', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Unidade</label>
            <select value={form.unidadeId} onChange={e => f('unidadeId', e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
              {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Técnico(a) responsável</label>
            <input type="text" value={form.tecnicoNome} onChange={e => f('tecnicoNome', e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Objetivo</label>
            <input type="text" value={form.objetivo} onChange={e => f('objetivo', e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Relato do atendimento</label>
            <textarea value={form.descricao} onChange={e => f('descricao', e.target.value)} rows={3}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Encaminhamentos</label>
            <input type="text" value={form.encaminhamentos} onChange={e => f('encaminhamentos', e.target.value)}
              placeholder="Encaminhar para CREAS, SCFV..."
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">Cancelar</button>
          <button onClick={() => onSalvar({ ...form, familiaId, situacao: 'REALIZADO' })}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            Registrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function FamiliasPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [familias, setFamilias] = useState<Familia[]>([])
  const [familiaDetalhe, setFamiliaDetalhe] = useState<FamiliaDetalhe | null>(null)
  const [busca, setBusca] = useState('')
  const [filtroNivel, setFiltroNivel] = useState('')
  const [modalFamilia, setModalFamilia] = useState(false)
  const [modalAtendimento, setModalAtendimento] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { carregarDados() }, [])
  useEffect(() => {
    const timer = setTimeout(() => buscarFamilias(), 400)
    return () => clearTimeout(timer)
  }, [busca, filtroNivel])

  async function carregarDados() {
    const [kR, uR] = await Promise.all([
      fetch('/api/assistencia/familia?relatorio=DASHBOARD'),
      fetch('/api/assistencia/unidade'),
    ])
    const [kD, uD] = await Promise.all([kR.json(), uR.json()])
    setKpis(kD.kpis)
    setUnidades(uD.unidades ?? [])
    buscarFamilias()
  }

  async function buscarFamilias() {
    const params = new URLSearchParams()
    if (busca)       params.set('busca', busca)
    if (filtroNivel) params.set('nivelVulnerabilidade', filtroNivel)
    const r = await fetch(`/api/assistencia/familia?${params}`)
    const d = await r.json()
    setFamilias(d.familias ?? [])
  }

  async function abrirFamilia(id: string) {
    const r = await fetch(`/api/assistencia/familia?id=${id}`)
    const d = await r.json()
    if (d.familia) setFamiliaDetalhe(d.familia)
  }

  async function cadastrarFamilia(dados: any) {
    const payload = {
      ...dados,
      rendaFamiliar: dados.rendaFamiliar ? Number(dados.rendaFamiliar) : undefined,
      percapita:     dados.percapita     ? Number(dados.percapita)     : undefined,
    }
    const r = await fetch('/api/assistencia/familia', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    setMsg(`Prontuário ${d.numeroProntuario} criado!`)
    setModalFamilia(false)
    carregarDados()
    setTimeout(() => setMsg(''), 4000)
  }

  async function registrarAtendimento(dados: any) {
    const r = await fetch('/api/assistencia/atendimento', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados),
    })
    if (!r.ok) { const d = await r.json(); setMsg(d.erro ?? 'Erro'); return }
    setMsg('Atendimento registrado!')
    setModalAtendimento(false)
    if (familiaDetalhe) abrirFamilia(familiaDetalhe.id)
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assistência Social — Famílias</h1>
            <p className="text-sm text-gray-500 mt-0.5">Prontuário SUAS · LOAS 8.742/1993 · NOB-SUAS 2012</p>
          </div>
          <button onClick={() => setModalFamilia(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
            + Nova Família
          </button>
        </div>
      </div>

      {msg && (
        <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{msg}</div>
      )}

      {/* KPIs */}
      {kpis && (
        <div className="px-6 py-4 grid grid-cols-5 lg:grid-cols-10 gap-2">
          {[
            { label: 'Total',        valor: kpis.total,       cor: 'text-gray-800' },
            { label: 'Ativas',       valor: kpis.ativas,      cor: 'text-green-600' },
            { label: 'Bolsa Família', valor: kpis.bolsaFamilia, cor: 'text-blue-600' },
            { label: 'BPC',          valor: kpis.bpc,         cor: 'text-purple-600' },
            { label: 'Crianças (ECA)', valor: kpis.criancas,  cor: 'text-yellow-600' },
            { label: 'Idosos',       valor: kpis.idosos,      cor: 'text-orange-600' },
            { label: 'PcD',          valor: kpis.pcd,         cor: 'text-pink-600' },
            { label: 'Violência',    valor: kpis.violencia,   cor: 'text-red-600' },
            { label: 'Situação de Rua', valor: kpis.situacaoRua, cor: 'text-red-800' },
            { label: 'Atend./Mês',   valor: kpis.atendMes,    cor: 'text-indigo-600' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <div className={`text-xl font-bold ${k.cor}`}>{k.valor}</div>
              <div className="text-xs text-gray-400 mt-0.5 leading-tight">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="px-6 pb-4 flex gap-3">
        <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, CPF, NIS ou prontuário..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 max-w-sm" />
        <select value={filtroNivel} onChange={e => setFiltroNivel(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
          <option value="">Todos os níveis</option>
          <option value="MUITO_ALTO">Muito Alto</option>
          <option value="ALTO">Alto</option>
          <option value="MEDIO">Médio</option>
          <option value="BAIXO">Baixo</option>
        </select>
        <span className="ml-auto text-sm text-gray-500 self-center">{familias.length} famílias</span>
      </div>

      {/* Layout 2 colunas */}
      <div className="px-6 pb-8 grid grid-cols-5 gap-6">
        {/* Lista */}
        <div className="col-span-2 space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
          {familias.map(f => (
            <button key={f.id} onClick={() => abrirFamilia(f.id)}
              className={`w-full text-left bg-white rounded-xl border p-4 hover:border-indigo-400 hover:shadow-sm transition-all ${familiaDetalhe?.id === f.id ? 'border-indigo-500 ring-1 ring-indigo-200' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 text-sm truncate">{f.responsavelNome}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{f.numeroProntuario} · {f.quantidadeMembros} membros</div>
                  {f.bairro && <div className="text-xs text-gray-400">{f.bairro}</div>}
                  <div className="mt-1.5 flex gap-1 flex-wrap">
                    {f.bolsaFamilia && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 rounded">BF</span>}
                    {f.bpc         && <span className="text-xs bg-purple-50 text-purple-600 px-1.5 rounded">BPC</span>}
                    {f.criancas    && <span className="text-xs bg-yellow-50 text-yellow-600 px-1.5 rounded">👶</span>}
                    {f.idosos      && <span className="text-xs bg-orange-50 text-orange-600 px-1.5 rounded">🧓</span>}
                    {f.pcd         && <span className="text-xs bg-pink-50 text-pink-600 px-1.5 rounded">♿</span>}
                    {f.violencia   && <span className="text-xs bg-red-50 text-red-600 px-1.5 rounded">⚠️</span>}
                    {f.situacaoRua && <span className="text-xs bg-red-50 text-red-700 px-1.5 rounded">Rua</span>}
                  </div>
                </div>
                <BadgeVulnerabilidade nivel={f.nivelVulnerabilidade} />
              </div>
            </button>
          ))}
          {familias.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <div className="text-4xl mb-2">🏠</div>
              <div>Nenhuma família encontrada</div>
            </div>
          )}
        </div>

        {/* Painel detalhe */}
        <div className="col-span-3">
          {!familiaDetalhe ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <div className="text-5xl mb-3">👈</div>
              <div>Selecione uma família para ver o prontuário</div>
            </div>
          ) : (
            <PainelFamilia
              familia={familiaDetalhe}
              onNovoAtendimento={() => setModalAtendimento(true)}
            />
          )}
        </div>
      </div>

      {modalFamilia && (
        <ModalFamilia unidades={unidades} onSalvar={cadastrarFamilia} onClose={() => setModalFamilia(false)} />
      )}
      {modalAtendimento && familiaDetalhe && (
        <ModalAtendimento
          familiaId={familiaDetalhe.id} unidades={unidades}
          onSalvar={registrarAtendimento} onClose={() => setModalAtendimento(false)}
        />
      )}
    </div>
  )
}
