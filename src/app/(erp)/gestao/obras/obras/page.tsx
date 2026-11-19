'use client'
import { useState, useEffect, useCallback } from 'react'

type Obra = {
  id: string; numero: string; titulo: string; tipo: string; situacao: string
  bairro?: string; logradouro?: string; fontRecurso?: string
  valorOrcado: number; valorMedidoAcumulado: number; percentualFisicoAcumulado: number
  dataInicioPrevista?: string; dataConclusaoPrevista?: string
  responsavelTecnico?: string
  contrato?: { numero: string; contratadaNome: string; valorContrato: number } | null
  _count: { medicoes: number; fiscalizacoes: number }
}
type ObraDetalhe = Obra & {
  descricao?: string; programaFederal?: string; crea?: string
  dataInicioReal?: string; dataConclusaoReal?: string
  medicoes: MedicaoRow[]; fiscalizacoes: any[]
}
type MedicaoRow = {
  id: string; numero: number; periodo: string; dataMedicao: string
  percentualPeriodo: number; percentualAcumulado: number
  valorBruto: number; valorLiquido: number; situacao: string
  dataPagamento?: string; notaFiscal?: string
}
type KPIs = {
  total: number; planejadas: number; emExecucao: number; paralisadas: number
  concluidas: number; canceladas: number
  totalOrcado: string; totalMedido: string; avgPercFisico: string
}

const SITUACAO_COR: Record<string, string> = {
  PLANEJADA:    'bg-gray-100 text-gray-700',
  LICITANDO:    'bg-yellow-100 text-yellow-700',
  CONTRATADA:   'bg-blue-100 text-blue-700',
  EM_EXECUCAO:  'bg-green-100 text-green-700',
  PARALISADA:   'bg-orange-100 text-orange-700',
  CONCLUIDA:    'bg-teal-100 text-teal-700',
  CANCELADA:    'bg-red-100 text-red-700',
}

const TIPO_ICON: Record<string, string> = {
  PAVIMENTACAO: '🛣️', DRENAGEM: '💧', CONSTRUCAO: '🏗️', REFORMA: '🔨',
  AMPLIACAO: '📐', SANEAMENTO: '🚰', ILUMINACAO: '💡', PONTES_VIADUTOS: '🌉',
  REVITALIZACAO: '✨', DEMOLIÇÃO: '🏚️', OUTRO: '🔧',
}

function BarraProgresso({ perc }: { perc: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
      <div
        className={`h-2 rounded-full transition-all ${perc >= 100 ? 'bg-teal-500' : perc >= 70 ? 'bg-green-500' : perc >= 30 ? 'bg-blue-500' : 'bg-yellow-400'}`}
        style={{ width: `${Math.min(100, perc)}%` }}
      />
    </div>
  )
}

function ModalObra({ onSalvar, onClose }: { onSalvar: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    titulo: '', tipo: 'CONSTRUCAO', bairro: '', logradouro: '',
    valorOrcado: '', fontRecurso: '', programaFederal: '',
    dataInicioPrevista: '', dataConclusaoPrevista: '',
    responsavelTecnico: '', crea: '', descricao: '',
  })
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-lg font-bold text-gray-800">Nova Obra</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Título da Obra *</label>
            <input type="text" value={form.titulo} onChange={e => f('titulo', e.target.value)}
              placeholder="Pavimentação da Rua das Flores"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => f('tipo', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500">
                {['PAVIMENTACAO','DRENAGEM','CONSTRUCAO','REFORMA','AMPLIACAO','DEMOLIÇÃO','REVITALIZACAO','SANEAMENTO','ILUMINACAO','PONTES_VIADUTOS','OUTRO'].map(t => (
                  <option key={t} value={t}>{TIPO_ICON[t]} {t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Valor Orçado R$ *</label>
              <input type="number" value={form.valorOrcado} onChange={e => f('valorOrcado', e.target.value)} min="0" step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Logradouro</label>
              <input type="text" value={form.logradouro} onChange={e => f('logradouro', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Bairro</label>
              <input type="text" value={form.bairro} onChange={e => f('bairro', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fonte de Recurso</label>
              <input type="text" value={form.fontRecurso} onChange={e => f('fontRecurso', e.target.value)} placeholder="Federal, Municipal, Convênio…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Programa Federal</label>
              <input type="text" value={form.programaFederal} onChange={e => f('programaFederal', e.target.value)} placeholder="PAC, FNHIS…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Início Previsto</label>
              <input type="date" value={form.dataInicioPrevista} onChange={e => f('dataInicioPrevista', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Conclusão Prevista</label>
              <input type="date" value={form.dataConclusaoPrevista} onChange={e => f('dataConclusaoPrevista', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Responsável Técnico</label>
              <input type="text" value={form.responsavelTecnico} onChange={e => f('responsavelTecnico', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">CREA/CAU</label>
              <input type="text" value={form.crea} onChange={e => f('crea', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Descrição</label>
            <textarea value={form.descricao} onChange={e => f('descricao', e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>
        <div className="p-6 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700">Cancelar</button>
          <button onClick={() => onSalvar({ ...form, valorOrcado: Number(form.valorOrcado) })}
            disabled={!form.titulo || !form.valorOrcado}
            className="px-6 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
            Cadastrar Obra
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalMedicao({ obraId, onSalvar, onClose }: { obraId: string; onSalvar: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    periodo: '', dataMedicao: new Date().toISOString().split('T')[0],
    percentualPeriodo: '', percentualAcumulado: '', valorBruto: '',
    descontosRetencoes: '0', notaFiscal: '', observacoes: '',
  })
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const valorLiquido = Number(form.valorBruto) - Number(form.descontosRetencoes)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-5 border-b"><h2 className="font-bold text-gray-800">Nova Medição</h2></div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Período *</label>
              <input type="text" value={form.periodo} onChange={e => f('periodo', e.target.value)} placeholder="01/10 a 31/10/2026"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Data da Medição</label>
              <input type="date" value={form.dataMedicao} onChange={e => f('dataMedicao', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">% Físico Período</label>
              <input type="number" value={form.percentualPeriodo} onChange={e => f('percentualPeriodo', e.target.value)} min="0" max="100" step="0.01"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">% Físico Acumulado</label>
              <input type="number" value={form.percentualAcumulado} onChange={e => f('percentualAcumulado', e.target.value)} min="0" max="100" step="0.01"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Valor Bruto R$</label>
              <input type="number" value={form.valorBruto} onChange={e => f('valorBruto', e.target.value)} min="0" step="0.01"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Deduções/Retenções R$</label>
              <input type="number" value={form.descontosRetencoes} onChange={e => f('descontosRetencoes', e.target.value)} min="0" step="0.01"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
          {form.valorBruto && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm font-semibold text-green-700">
              Valor Líquido: R$ {valorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nota Fiscal</label>
            <input type="text" value={form.notaFiscal} onChange={e => f('notaFiscal', e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
          <button onClick={() => onSalvar({
            obraId, ...form,
            percentualPeriodo:   Number(form.percentualPeriodo),
            percentualAcumulado: Number(form.percentualAcumulado),
            valorBruto:          Number(form.valorBruto),
            descontosRetencoes:  Number(form.descontosRetencoes),
          })} disabled={!form.periodo || !form.valorBruto}
            className="px-5 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            Registrar Medição
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ObrasPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [obras, setObras] = useState<Obra[]>([])
  const [obraDetalhe, setObraDetalhe] = useState<ObraDetalhe | null>(null)
  const [filtroSituacao, setFiltroSituacao] = useState('')
  const [busca, setBusca] = useState('')
  const [modalObra, setModalObra] = useState(false)
  const [modalMedicao, setModalMedicao] = useState(false)
  const [msg, setMsg] = useState('')

  const carregarDados = useCallback(async () => {
    const [kR, oR] = await Promise.all([
      fetch('/api/obras/obra?relatorio=DASHBOARD'),
      fetch(`/api/obras/obra${filtroSituacao ? `?situacao=${filtroSituacao}` : ''}${busca ? `${filtroSituacao ? '&' : '?'}busca=${busca}` : ''}`),
    ])
    const [kD, oD] = await Promise.all([kR.json(), oR.json()])
    setKpis(kD.kpis)
    setObras(oD.obras ?? [])
  }, [filtroSituacao, busca])

  useEffect(() => { carregarDados() }, [carregarDados])

  async function abrirObra(id: string) {
    const r = await fetch(`/api/obras/obra?id=${id}`)
    const d = await r.json()
    if (d.obra) setObraDetalhe(d.obra)
  }

  async function cadastrarObra(dados: any) {
    const r = await fetch('/api/obras/obra', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    setMsg(`Obra ${d.numero} cadastrada!`)
    setModalObra(false)
    carregarDados()
    setTimeout(() => setMsg(''), 4000)
  }

  async function mudarSituacao(id: string, acao: string) {
    const r = await fetch('/api/obras/obra', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, acao }),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    setMsg(`Situação: ${d.situacao}`)
    carregarDados()
    if (obraDetalhe?.id === id) abrirObra(id)
    setTimeout(() => setMsg(''), 3000)
  }

  async function registrarMedicao(dados: any) {
    const r = await fetch('/api/obras/medicao', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    setMsg(`${d.numero}ª Medição registrada!`)
    setModalMedicao(false)
    if (obraDetalhe) abrirObra(obraDetalhe.id)
    setTimeout(() => setMsg(''), 3000)
  }

  async function aprovarMedicao(id: string) {
    const r = await fetch('/api/obras/medicao', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, acao: 'APROVAR' }),
    })
    if (!r.ok) return
    setMsg('Medição aprovada!')
    if (obraDetalhe) abrirObra(obraDetalhe.id)
    setTimeout(() => setMsg(''), 3000)
  }

  const fmtMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Obras e Urbanismo</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gestão de obras públicas · Lei 14.133/2021 · Estatuto da Cidade</p>
          </div>
          <button onClick={() => setModalObra(true)}
            className="px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700">
            + Nova Obra
          </button>
        </div>
      </div>

      {msg && (
        <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{msg}</div>
      )}

      {/* KPIs */}
      {kpis && (
        <div className="px-6 py-4 grid grid-cols-5 lg:grid-cols-9 gap-2">
          {[
            { label: 'Total',         valor: kpis.total,         cor: 'text-gray-800' },
            { label: 'Planejadas',    valor: kpis.planejadas,    cor: 'text-gray-600' },
            { label: 'Em Execução',   valor: kpis.emExecucao,    cor: 'text-green-600' },
            { label: 'Paralisadas',   valor: kpis.paralisadas,   cor: 'text-orange-600' },
            { label: 'Concluídas',    valor: kpis.concluidas,    cor: 'text-teal-600' },
            { label: 'Total Orçado',  valor: `R$ ${Number(kpis.totalOrcado).toLocaleString('pt-BR',{maximumFractionDigits:0})}`, cor: 'text-blue-600' },
            { label: 'Total Medido',  valor: `R$ ${Number(kpis.totalMedido).toLocaleString('pt-BR',{maximumFractionDigits:0})}`, cor: 'text-indigo-600' },
            { label: '% Físico Méd.', valor: `${kpis.avgPercFisico}%`, cor: 'text-green-600' },
            { label: 'Canceladas',    valor: kpis.canceladas,    cor: 'text-red-600' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <div className={`text-lg font-bold ${k.cor}`}>{k.valor}</div>
              <div className="text-xs text-gray-400 mt-0.5 leading-tight">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="px-6 pb-4 flex gap-3">
        <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar obra…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 w-56" />
        <select value={filtroSituacao} onChange={e => setFiltroSituacao(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500">
          <option value="">Todas as situações</option>
          {Object.keys(SITUACAO_COR).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <span className="ml-auto text-sm text-gray-500 self-center">{obras.length} obras</span>
      </div>

      {/* Layout 2 colunas */}
      <div className="px-6 pb-8 grid grid-cols-5 gap-6">
        {/* Lista */}
        <div className="col-span-2 space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
          {obras.map(o => (
            <button key={o.id} onClick={() => abrirObra(o.id)}
              className={`w-full text-left bg-white rounded-xl border p-4 hover:border-orange-400 hover:shadow-sm transition-all ${obraDetalhe?.id === o.id ? 'border-orange-500 ring-1 ring-orange-200' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm">{TIPO_ICON[o.tipo] ?? '🔧'}</span>
                    <span className="font-semibold text-gray-900 text-sm truncate">{o.titulo}</span>
                  </div>
                  <div className="text-xs text-gray-400">{o.numero}{o.bairro ? ` · ${o.bairro}` : ''}</div>
                  {o.contrato && <div className="text-xs text-gray-400 mt-0.5">{o.contrato.contratadaNome}</div>}
                  <div className="mt-1.5">
                    <div className="text-xs text-gray-500 flex justify-between">
                      <span>{o.percentualFisicoAcumulado.toFixed(0)}% físico</span>
                      <span className="text-indigo-600">{fmtMoeda(Number(o.valorOrcado))}</span>
                    </div>
                    <BarraProgresso perc={Number(o.percentualFisicoAcumulado)} />
                  </div>
                </div>
                <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${SITUACAO_COR[o.situacao] ?? ''}`}>
                  {o.situacao.replace(/_/g, ' ')}
                </span>
              </div>
            </button>
          ))}
          {obras.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <div className="text-4xl mb-2">🏗️</div>
              <div>Nenhuma obra encontrada</div>
            </div>
          )}
        </div>

        {/* Painel detalhe */}
        <div className="col-span-3">
          {!obraDetalhe ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <div className="text-5xl mb-3">🏗️</div>
              <div>Selecione uma obra para ver os detalhes</div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200">
              {/* Header */}
              <div className="p-5 border-b">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{TIPO_ICON[obraDetalhe.tipo] ?? '🔧'}</span>
                      <h2 className="text-lg font-bold text-gray-900">{obraDetalhe.titulo}</h2>
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {obraDetalhe.numero} · {obraDetalhe.bairro ?? '—'}
                      {obraDetalhe.fontRecurso && <span className="ml-2 text-indigo-600">{obraDetalhe.fontRecurso}</span>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${SITUACAO_COR[obraDetalhe.situacao]}`}>
                    {obraDetalhe.situacao.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Financeiro */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-sm font-bold text-blue-700">{fmtMoeda(Number(obraDetalhe.valorOrcado))}</div>
                    <div className="text-xs text-gray-400">orçado</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-sm font-bold text-indigo-700">{fmtMoeda(Number(obraDetalhe.valorMedidoAcumulado))}</div>
                    <div className="text-xs text-gray-400">medido</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-sm font-bold text-green-700">{Number(obraDetalhe.percentualFisicoAcumulado).toFixed(1)}%</div>
                    <div className="text-xs text-gray-400">físico</div>
                  </div>
                </div>
                <BarraProgresso perc={Number(obraDetalhe.percentualFisicoAcumulado)} />

                {/* Ações de situação */}
                <div className="mt-3 flex gap-2 flex-wrap">
                  {obraDetalhe.situacao === 'PLANEJADA' && (
                    <button onClick={() => mudarSituacao(obraDetalhe.id, 'EM_EXECUCAO')}
                      className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200">
                      Iniciar Execução
                    </button>
                  )}
                  {obraDetalhe.situacao === 'EM_EXECUCAO' && (
                    <>
                      <button onClick={() => setModalMedicao(true)}
                        className="px-3 py-1.5 text-xs bg-indigo-100 text-indigo-700 rounded-lg font-medium hover:bg-indigo-200">
                        + Medição
                      </button>
                      <button onClick={() => mudarSituacao(obraDetalhe.id, 'PARALISADA')}
                        className="px-3 py-1.5 text-xs bg-orange-100 text-orange-700 rounded-lg font-medium hover:bg-orange-200">
                        Paralisar
                      </button>
                      <button onClick={() => mudarSituacao(obraDetalhe.id, 'CONCLUIDA')}
                        className="px-3 py-1.5 text-xs bg-teal-100 text-teal-700 rounded-lg font-medium hover:bg-teal-200">
                        Concluir
                      </button>
                    </>
                  )}
                  {obraDetalhe.situacao === 'PARALISADA' && (
                    <button onClick={() => mudarSituacao(obraDetalhe.id, 'EM_EXECUCAO')}
                      className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200">
                      Retomar
                    </button>
                  )}
                </div>
              </div>

              {/* Medições */}
              <div className="p-5 max-h-96 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Medições ({obraDetalhe.medicoes?.length ?? 0})
                </h3>
                {(obraDetalhe.medicoes ?? []).length === 0 ? (
                  <div className="text-sm text-gray-400 text-center py-4">Nenhuma medição lançada</div>
                ) : (
                  <div className="space-y-2">
                    {obraDetalhe.medicoes.map(m => (
                      <div key={m.id} className="border border-gray-100 rounded-lg p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-semibold text-gray-700">
                              {m.numero}ª Medição — {m.periodo}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(m.dataMedicao).toLocaleDateString('pt-BR')}
                              {m.notaFiscal && ` · NF: ${m.notaFiscal}`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-green-700">{fmtMoeda(Number(m.valorLiquido))}</div>
                            <div className="text-xs text-gray-400">{m.percentualAcumulado}% acum.</div>
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            m.situacao === 'PAGA'      ? 'bg-green-100 text-green-700' :
                            m.situacao === 'APROVADA'  ? 'bg-blue-100 text-blue-700' :
                            m.situacao === 'REJEITADA' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>{m.situacao}</span>
                        </div>
                        {m.situacao === 'PENDENTE' && (
                          <button onClick={() => aprovarMedicao(m.id)}
                            className="mt-2 w-full py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium">
                            Aprovar Medição
                          </button>
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

      {modalObra    && <ModalObra onSalvar={cadastrarObra} onClose={() => setModalObra(false)} />}
      {modalMedicao && obraDetalhe && (
        <ModalMedicao obraId={obraDetalhe.id} onSalvar={registrarMedicao} onClose={() => setModalMedicao(false)} />
      )}
    </div>
  )
}
