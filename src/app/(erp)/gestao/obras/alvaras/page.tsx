'use client'
import { useState, useEffect, useCallback } from 'react'

type Alvara = {
  id: string; numero?: string; tipo: string; situacao: string
  requerentNome: string; logradouro?: string; numero_imovel?: string; bairro?: string
  areaTotal?: number; areaConstruida?: number
  dataSolicitacao: string; dataEmissao?: string; dataVencimento?: string
  taxaAlvara?: number; taxaPaga: boolean
}
type AlvaraDetalhe = Alvara & {
  requerentCpfCnpj?: string; requerentTelefone?: string; requerentEmail?: string
  inscricaoImobiliaria?: string; responsavelTecnico?: string; crea?: string
  numeroPavimentos?: number; usoImovel?: string; motivoIndeferimento?: string
  observacoes?: string
  fiscalizacoes: FiscRow[]
}
type FiscRow = {
  id: string; dataVisita: string; fiscal: string; conformidade?: string
  situacao: string; relatorio?: string; descricaoInfracao?: string
  numeroAuto?: string; valorMulta?: number; dataEmbargo?: string
}
type KPIs = { total: number; solicitados: number; emAnalise: number; aprovados: number; indeferidos: number; vencidos: number; aVencer: number }

const SITUACAO_COR: Record<string, string> = {
  SOLICITADO:  'bg-gray-100 text-gray-700',
  EM_ANALISE:  'bg-blue-100 text-blue-700',
  APROVADO:    'bg-green-100 text-green-700',
  INDEFERIDO:  'bg-red-100 text-red-700',
  VENCIDO:     'bg-orange-100 text-orange-700',
  CANCELADO:   'bg-gray-100 text-gray-400',
}

const TIPO_ICON: Record<string, string> = {
  CONSTRUCAO: '🏗️', REFORMA: '🔨', DEMOLIÇÃO: '🏚️', AMPLIACAO: '📐',
  REGULARIZACAO: '📋', HABITE_SE: '🏠', LOCALIZACAO: '📍', EVENTOS: '🎪',
}

const STEPS = ['SOLICITADO', 'EM_ANALISE', 'APROVADO']

function Stepper({ situacao }: { situacao: string }) {
  const idx = STEPS.indexOf(situacao)
  const isIndeferido = situacao === 'INDEFERIDO'
  const isVencido    = situacao === 'VENCIDO'

  return (
    <div className="flex items-center gap-1 mt-2">
      {STEPS.map((s, i) => {
        const done    = idx > i || (s === 'APROVADO' && isVencido)
        const current = idx === i && !isIndeferido
        const future  = idx < i && !isVencido
        return (
          <div key={s} className="flex items-center">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
              current ? 'bg-blue-500 text-white' :
              done    ? 'bg-green-500 text-white' :
              future  ? 'bg-gray-100 text-gray-400' :
              'bg-gray-100 text-gray-400'
            }`}>
              {done && <span>✓</span>}
              {s.replace(/_/g, ' ')}
            </div>
            {i < STEPS.length - 1 && <div className={`w-4 h-0.5 ${done || current ? 'bg-blue-300' : 'bg-gray-200'}`} />}
          </div>
        )
      })}
      {(isIndeferido || isVencido) && (
        <span className={`ml-2 text-xs px-2 py-0.5 rounded font-medium ${SITUACAO_COR[situacao]}`}>
          {situacao}
        </span>
      )}
    </div>
  )
}

function ModalAlvara({ onSalvar, onClose }: { onSalvar: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    tipo: 'CONSTRUCAO', requerentNome: '', requerentCpfCnpj: '', requerentTelefone: '', requerentEmail: '',
    logradouro: '', numero_imovel: '', bairro: '', cep: '', inscricaoImobiliaria: '',
    responsavelTecnico: '', crea: '', areaTotal: '', areaConstruida: '', numeroPavimentos: '',
    usoImovel: '', taxaAlvara: '', observacoes: '',
  })
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b">
          <h2 className="text-lg font-bold text-gray-800">Solicitar Alvará</h2>
          <p className="text-xs text-gray-400 mt-0.5">Lei 10.257/2001 — Estatuto da Cidade</p>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Alvará *</label>
              <select value={form.tipo} onChange={e => f('tipo', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {['CONSTRUCAO','REFORMA','DEMOLIÇÃO','AMPLIACAO','REGULARIZACAO','HABITE_SE','LOCALIZACAO','EVENTOS'].map(t => (
                  <option key={t} value={t}>{TIPO_ICON[t]} {t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Taxa R$</label>
              <input type="number" value={form.taxaAlvara} onChange={e => f('taxaAlvara', e.target.value)} min="0" step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Requerente</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Nome / Razão Social *</label>
                <input type="text" value={form.requerentNome} onChange={e => f('requerentNome', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">CPF / CNPJ</label>
                <input type="text" value={form.requerentCpfCnpj} onChange={e => f('requerentCpfCnpj', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Telefone</label>
                <input type="text" value={form.requerentTelefone} onChange={e => f('requerentTelefone', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Localização do Imóvel</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Logradouro</label>
                <input type="text" value={form.logradouro} onChange={e => f('logradouro', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Número</label>
                <input type="text" value={form.numero_imovel} onChange={e => f('numero_imovel', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Bairro</label>
                <input type="text" value={form.bairro} onChange={e => f('bairro', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">CEP</label>
                <input type="text" value={form.cep} onChange={e => f('cep', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Inscrição Imobiliária</label>
                <input type="text" value={form.inscricaoImobiliaria} onChange={e => f('inscricaoImobiliaria', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Dados Técnicos</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Responsável Técnico</label>
                <input type="text" value={form.responsavelTecnico} onChange={e => f('responsavelTecnico', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">CREA/CAU</label>
                <input type="text" value={form.crea} onChange={e => f('crea', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Área Total m²</label>
                <input type="number" value={form.areaTotal} onChange={e => f('areaTotal', e.target.value)} min="0" step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Área Construída m²</label>
                <input type="number" value={form.areaConstruida} onChange={e => f('areaConstruida', e.target.value)} min="0" step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Pavimentos</label>
                <input type="number" value={form.numeroPavimentos} onChange={e => f('numeroPavimentos', e.target.value)} min="1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Uso do Imóvel</label>
                <input type="text" value={form.usoImovel} onChange={e => f('usoImovel', e.target.value)} placeholder="Residencial, Comercial…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
          <button onClick={() => onSalvar({
            ...form,
            areaTotal:        form.areaTotal        ? Number(form.areaTotal)        : undefined,
            areaConstruida:   form.areaConstruida   ? Number(form.areaConstruida)   : undefined,
            numeroPavimentos: form.numeroPavimentos ? Number(form.numeroPavimentos) : undefined,
            taxaAlvara:       form.taxaAlvara       ? Number(form.taxaAlvara)       : undefined,
          })} disabled={!form.requerentNome}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            Registrar Solicitação
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalIndeferir({ onConfirmar, onClose }: { onConfirmar: (motivo: string) => void; onClose: () => void }) {
  const [motivo, setMotivo] = useState('')
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="p-5 border-b"><h2 className="font-bold text-gray-800">Indeferir Alvará</h2></div>
        <div className="p-5">
          <label className="block text-xs font-medium text-gray-500 mb-1">Motivo do Indeferimento *</label>
          <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3}
            placeholder="Descreva o motivo do indeferimento…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="p-5 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
          <button onClick={() => onConfirmar(motivo)} disabled={!motivo.trim()}
            className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            Indeferir
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AlvarasPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [alvaras, setAlvaras] = useState<Alvara[]>([])
  const [alvaraDetalhe, setAlvaraDetalhe] = useState<AlvaraDetalhe | null>(null)
  const [filtroSituacao, setFiltroSituacao] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [busca, setBusca] = useState('')
  const [modalAlvara, setModalAlvara] = useState(false)
  const [modalIndeferir, setModalIndeferir] = useState(false)
  const [msg, setMsg] = useState('')

  const carregarDados = useCallback(async () => {
    const params = new URLSearchParams()
    if (filtroSituacao) params.set('situacao', filtroSituacao)
    if (filtroTipo)     params.set('tipo', filtroTipo)
    if (busca)          params.set('busca', busca)
    const [kR, aR] = await Promise.all([
      fetch('/api/obras/alvara?relatorio=DASHBOARD'),
      fetch(`/api/obras/alvara?${params}`),
    ])
    const [kD, aD] = await Promise.all([kR.json(), aR.json()])
    setKpis(kD.kpis)
    setAlvaras(aD.alvaras ?? [])
  }, [filtroSituacao, filtroTipo, busca])

  useEffect(() => { carregarDados() }, [carregarDados])

  async function abrirAlvara(id: string) {
    const r = await fetch(`/api/obras/alvara?id=${id}`)
    const d = await r.json()
    if (d.alvara) setAlvaraDetalhe(d.alvara)
  }

  async function solicitar(dados: any) {
    const r = await fetch('/api/obras/alvara', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    setMsg('Solicitação registrada!')
    setModalAlvara(false)
    carregarDados()
    setTimeout(() => setMsg(''), 4000)
  }

  async function mudarSituacao(id: string, acao: string, extra?: object) {
    const r = await fetch('/api/obras/alvara', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, acao, ...extra }),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    const label = d.numero ? `Alvará ${d.numero} emitido!` : `Situação: ${acao.replace(/_/g, ' ')}`
    setMsg(label)
    carregarDados()
    if (alvaraDetalhe?.id === id) abrirAlvara(id)
    setTimeout(() => setMsg(''), 4000)
  }

  const fmtData = (v?: string) => v ? new Date(v).toLocaleDateString('pt-BR') : '—'

  // Verifica alvarás a vencer em ≤ 7 dias
  const vencendoBreve = (d?: string) => {
    if (!d) return false
    const diff = (new Date(d).getTime() - Date.now()) / 86400000
    return diff <= 7 && diff >= 0
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alvarás e Fiscalização</h1>
            <p className="text-sm text-gray-500 mt-0.5">Lei 10.257/2001 — Estatuto da Cidade · Lei 14.133/2021</p>
          </div>
          <button onClick={() => setModalAlvara(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
            + Solicitar Alvará
          </button>
        </div>
      </div>

      {msg && (
        <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{msg}</div>
      )}

      {/* KPIs */}
      {kpis && (
        <div className="px-6 py-4 grid grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { label: 'Total',        valor: kpis.total,       cor: 'text-gray-800' },
            { label: 'Solicitados',  valor: kpis.solicitados, cor: 'text-gray-600' },
            { label: 'Em Análise',   valor: kpis.emAnalise,   cor: 'text-blue-600' },
            { label: 'Aprovados',    valor: kpis.aprovados,   cor: 'text-green-600' },
            { label: 'Indeferidos',  valor: kpis.indeferidos, cor: 'text-red-600' },
            { label: 'Vencidos',     valor: kpis.vencidos,    cor: 'text-orange-600' },
            { label: 'A Vencer 30d', valor: kpis.aVencer,     cor: kpis.aVencer > 0 ? 'text-yellow-600' : 'text-gray-500' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <div className={`text-xl font-bold ${k.cor}`}>{k.valor}</div>
              <div className="text-xs text-gray-400 mt-0.5">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="px-6 pb-4 flex gap-3 flex-wrap">
        <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar requerente, número…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-52" />
        <select value={filtroSituacao} onChange={e => setFiltroSituacao(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todas as situações</option>
          {Object.keys(SITUACAO_COR).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todos os tipos</option>
          {['CONSTRUCAO','REFORMA','DEMOLIÇÃO','AMPLIACAO','REGULARIZACAO','HABITE_SE','LOCALIZACAO','EVENTOS'].map(t => (
            <option key={t} value={t}>{TIPO_ICON[t]} {t.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <span className="ml-auto text-sm text-gray-500 self-center">{alvaras.length} alvarás</span>
      </div>

      {/* Layout 2 colunas */}
      <div className="px-6 pb-8 grid grid-cols-5 gap-6">
        {/* Lista */}
        <div className="col-span-2 space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
          {alvaras.map(a => (
            <button key={a.id} onClick={() => abrirAlvara(a.id)}
              className={`w-full text-left bg-white rounded-xl border p-4 hover:border-blue-400 hover:shadow-sm transition-all ${alvaraDetalhe?.id === a.id ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span>{TIPO_ICON[a.tipo] ?? '📋'}</span>
                    <span className="font-semibold text-gray-900 text-sm truncate">{a.requerentNome}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {a.numero ?? 'Aguardando número'}
                    {a.bairro && ` · ${a.bairro}`}
                    {a.logradouro && `, ${a.logradouro}`}
                    {a.numero_imovel && ` nº${a.numero_imovel}`}
                  </div>
                  {(a.areaConstruida || a.areaTotal) && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {a.areaConstruida ? `${a.areaConstruida} m² construídos` : ''}
                      {a.areaTotal ? ` · ${a.areaTotal} m² total` : ''}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-0.5">Solicitado {fmtData(a.dataSolicitacao)}</div>
                  {vencendoBreve(a.dataVencimento) && (
                    <div className="mt-1 text-xs font-medium text-yellow-600 bg-yellow-50 rounded px-1.5 py-0.5 inline-block">
                      ⚠️ Vence {fmtData(a.dataVencimento)}
                    </div>
                  )}
                </div>
                <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${SITUACAO_COR[a.situacao] ?? ''}`}>
                  {a.tipo.replace(/_/g, ' ')}
                </span>
              </div>
              <Stepper situacao={a.situacao} />
            </button>
          ))}
          {alvaras.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <div className="text-4xl mb-2">🏠</div>
              <div>Nenhum alvará encontrado</div>
            </div>
          )}
        </div>

        {/* Painel detalhe */}
        <div className="col-span-3">
          {!alvaraDetalhe ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <div className="text-5xl mb-3">🏠</div>
              <div>Selecione um alvará para ver os detalhes</div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200">
              {/* Header */}
              <div className="p-5 border-b">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{TIPO_ICON[alvaraDetalhe.tipo] ?? '📋'}</span>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">{alvaraDetalhe.requerentNome}</h2>
                        <div className="text-sm text-gray-500">
                          {alvaraDetalhe.numero ?? 'Número pendente'} · {alvaraDetalhe.tipo.replace(/_/g, ' ')}
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${SITUACAO_COR[alvaraDetalhe.situacao]}`}>
                    {alvaraDetalhe.situacao.replace(/_/g, ' ')}
                  </span>
                </div>
                <Stepper situacao={alvaraDetalhe.situacao} />
              </div>

              {/* Dados */}
              <div className="p-5 grid grid-cols-2 gap-4 border-b text-sm">
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Requerente</div>
                  <div className="font-medium">{alvaraDetalhe.requerentNome}</div>
                  {alvaraDetalhe.requerentCpfCnpj && <div className="text-gray-500 text-xs">{alvaraDetalhe.requerentCpfCnpj}</div>}
                  {alvaraDetalhe.requerentTelefone && <div className="text-gray-500 text-xs">{alvaraDetalhe.requerentTelefone}</div>}
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Localização</div>
                  <div className="font-medium">
                    {[alvaraDetalhe.logradouro, alvaraDetalhe.numero_imovel].filter(Boolean).join(', ') || '—'}
                  </div>
                  {alvaraDetalhe.bairro && <div className="text-gray-500 text-xs">{alvaraDetalhe.bairro}</div>}
                  {alvaraDetalhe.inscricaoImobiliaria && (
                    <div className="text-gray-500 text-xs">Inscrição: {alvaraDetalhe.inscricaoImobiliaria}</div>
                  )}
                </div>
                {alvaraDetalhe.responsavelTecnico && (
                  <div>
                    <div className="text-xs text-gray-400 mb-0.5">Responsável Técnico</div>
                    <div className="font-medium">{alvaraDetalhe.responsavelTecnico}</div>
                    {alvaraDetalhe.crea && <div className="text-gray-500 text-xs">{alvaraDetalhe.crea}</div>}
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Áreas</div>
                  {alvaraDetalhe.areaTotal && <div className="text-xs">Total: {alvaraDetalhe.areaTotal} m²</div>}
                  {alvaraDetalhe.areaConstruida && <div className="text-xs">Construída: {alvaraDetalhe.areaConstruida} m²</div>}
                  {alvaraDetalhe.numeroPavimentos && <div className="text-xs">{alvaraDetalhe.numeroPavimentos} pavimento(s)</div>}
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Datas</div>
                  <div className="text-xs">Solicitação: {fmtData(alvaraDetalhe.dataSolicitacao)}</div>
                  {alvaraDetalhe.dataEmissao   && <div className="text-xs">Emissão: {fmtData(alvaraDetalhe.dataEmissao)}</div>}
                  {alvaraDetalhe.dataVencimento && (
                    <div className={`text-xs font-medium ${vencendoBreve(alvaraDetalhe.dataVencimento) ? 'text-yellow-600' : ''}`}>
                      Vencimento: {fmtData(alvaraDetalhe.dataVencimento)}
                    </div>
                  )}
                </div>
                {alvaraDetalhe.taxaAlvara && (
                  <div>
                    <div className="text-xs text-gray-400 mb-0.5">Taxa</div>
                    <div className="text-xs">R$ {Number(alvaraDetalhe.taxaAlvara).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <div className={`text-xs font-medium ${alvaraDetalhe.taxaPaga ? 'text-green-600' : 'text-red-500'}`}>
                      {alvaraDetalhe.taxaPaga ? '✓ Paga' : '✗ Pendente'}
                    </div>
                  </div>
                )}
                {alvaraDetalhe.motivoIndeferimento && (
                  <div className="col-span-2 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-xs font-medium text-red-700">Motivo do indeferimento</div>
                    <div className="text-sm text-red-800 mt-0.5">{alvaraDetalhe.motivoIndeferimento}</div>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="p-5 border-b flex gap-2 flex-wrap">
                {alvaraDetalhe.situacao === 'SOLICITADO' && (
                  <>
                    <button onClick={() => mudarSituacao(alvaraDetalhe.id, 'EM_ANALISE')}
                      className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200">
                      Iniciar Análise
                    </button>
                    <button onClick={() => setModalIndeferir(true)}
                      className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200">
                      Indeferir
                    </button>
                  </>
                )}
                {alvaraDetalhe.situacao === 'EM_ANALISE' && (
                  <>
                    <button onClick={() => mudarSituacao(alvaraDetalhe.id, 'APROVADO')}
                      className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200">
                      Aprovar e Emitir
                    </button>
                    <button onClick={() => setModalIndeferir(true)}
                      className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200">
                      Indeferir
                    </button>
                  </>
                )}
                {alvaraDetalhe.situacao === 'INDEFERIDO' && (
                  <button onClick={() => mudarSituacao(alvaraDetalhe.id, 'EM_ANALISE')}
                    className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200">
                    Reabrir Análise (Recurso)
                  </button>
                )}
                {alvaraDetalhe.situacao === 'VENCIDO' && (
                  <button onClick={() => mudarSituacao(alvaraDetalhe.id, 'EM_ANALISE')}
                    className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200">
                    Solicitar Renovação
                  </button>
                )}
              </div>

              {/* Fiscalizações */}
              <div className="p-5 max-h-72 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Fiscalizações ({alvaraDetalhe.fiscalizacoes?.length ?? 0})
                </h3>
                {(alvaraDetalhe.fiscalizacoes ?? []).length === 0 ? (
                  <div className="text-sm text-gray-400 text-center py-4">Nenhuma fiscalização registrada</div>
                ) : (
                  <div className="space-y-2">
                    {alvaraDetalhe.fiscalizacoes.map(f => (
                      <div key={f.id} className={`border rounded-lg p-3 ${
                        f.situacao === 'EMBARGADA' ? 'border-red-300 bg-red-50' :
                        f.situacao === 'IRREGULAR' ? 'border-orange-300 bg-orange-50' :
                        'border-gray-100'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold text-gray-700">
                              {fmtData(f.dataVisita)} · {f.fiscal}
                            </div>
                            {f.conformidade && (
                              <div className={`text-xs mt-0.5 ${
                                f.conformidade === 'CONFORME' ? 'text-green-600' : 'text-red-600'
                              }`}>{f.conformidade.replace(/_/g, ' ')}</div>
                            )}
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            f.situacao === 'EMBARGADA' ? 'bg-red-200 text-red-800' :
                            f.situacao === 'IRREGULAR' ? 'bg-orange-200 text-orange-800' :
                            f.situacao === 'REALIZADA' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{f.situacao}</span>
                        </div>
                        {f.descricaoInfracao && (
                          <div className="mt-1.5 text-xs text-orange-800 font-medium">
                            Auto {f.numeroAuto} — {f.descricaoInfracao}
                            {f.valorMulta ? ` · Multa: R$ ${Number(f.valorMulta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {modalAlvara && <ModalAlvara onSalvar={solicitar} onClose={() => setModalAlvara(false)} />}
      {modalIndeferir && alvaraDetalhe && (
        <ModalIndeferir
          onConfirmar={(motivo) => { mudarSituacao(alvaraDetalhe.id, 'INDEFERIDO', { motivo }); setModalIndeferir(false) }}
          onClose={() => setModalIndeferir(false)}
        />
      )}
    </div>
  )
}
