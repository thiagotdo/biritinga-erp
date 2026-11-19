'use client'
import { useState, useEffect, useCallback } from 'react'

type Bem = {
  id: string; numeroPlaqueta: string; descricao: string; categoria: string
  marca?: string; modelo?: string; estado: string; situacao: string
  secretaria: string; setor?: string; local?: string; responsavel?: string
  valorAquisicao: number; valorAtual: number; dataAquisicao: string
  taxaDepAnual?: number; vidaUtilAnos?: number; depAcumulada: number
}
type BemDetalhe = Bem & {
  serie?: string; fabricante?: string; anoFab?: number; cor?: string
  nfNumero?: string; processo?: string; fornecedor?: string; origemRecurso?: string
  seguro: boolean; seguradora?: string; vencSeguro?: string; observacoes?: string
  movimentacoes: MovRow[]
}
type MovRow = { id: string; tipo: string; dataMovimentacao: string; motivo: string; secretariaOrigem?: string; secretariaDestino?: string; responsavelDestino?: string }
type KPIs  = { total: number; ativos: number; emManut: number; extraviados: number; baixados: number; alienados: number; valorAtual: number; valorAquisicao: number; depAcumulada: number }
type DepPreview = { id: string; numeroPlaqueta: string; descricao: string; secretaria: string; valorAtual: number; depMensal: string; valorApos: string }

const CAT_ICON: Record<string, string> = {
  IMOVEL: '🏢', VEICULO: '🚗', MOVEL: '🪑', EQUIPAMENTO: '💻',
  ELETRODOMESTICO: '❄️', FERRAMENTA: '🔧', MAQUINA: '⚙️',
  OBRA_ARTE: '🎨', SEMOVENTE: '🐄', INTANGIVEL: '💾', OUTRO: '📦',
}
const SIT_COR: Record<string, string> = {
  ATIVO:            'bg-green-100 text-green-700',
  EM_MANUTENCAO:    'bg-orange-100 text-orange-700',
  EXTRAVIADO:       'bg-red-100 text-red-700',
  CEDIDO:           'bg-blue-100 text-blue-700',
  ALIENADO:         'bg-purple-100 text-purple-500',
  BAIXADO:          'bg-gray-100 text-gray-400',
  DEPRECIADO_TOTAL: 'bg-yellow-100 text-yellow-600',
}
const ESTADO_COR: Record<string, string> = {
  OTIMO: 'text-green-600', BOM: 'text-green-500', REGULAR: 'text-yellow-600',
  RUIM: 'text-orange-600', PESSIMO: 'text-red-600', IRRECUPERAVEL: 'text-red-800',
}

function percDep(bem: Bem) {
  const base = Number(bem.valorAquisicao)
  if (!base) return 0
  return Math.min(100, (Number(bem.depAcumulada) / base) * 100)
}

function ModalBem({ onSalvar, onClose }: { onSalvar: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    descricao: '', categoria: 'EQUIPAMENTO', marca: '', modelo: '', serie: '', anoFab: '',
    secretaria: '', setor: '', local: '', responsavel: '',
    valorAquisicao: '', dataAquisicao: new Date().toISOString().split('T')[0],
    valorResidual: '0', fornecedor: '', nfNumero: '', processo: '', origemRecurso: '', observacoes: '',
    estado: 'BOM',
  })
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b">
          <h2 className="text-lg font-bold text-gray-800">Tombamento de Bem</h2>
          <p className="text-xs text-gray-400 mt-0.5">Lei 4.320/1964 · NBC T 16.9 · MCASP</p>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Descrição *</label>
            <input type="text" value={form.descricao} onChange={e => f('descricao', e.target.value)}
              placeholder="Notebook Dell Inspiron 15, Cadeira Executiva…"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Categoria *</label>
              <select value={form.categoria} onChange={e => f('categoria', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                {Object.keys(CAT_ICON).map(c => (
                  <option key={c} value={c}>{CAT_ICON[c]} {c.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
              <select value={form.estado} onChange={e => f('estado', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                {['OTIMO','BOM','REGULAR','RUIM','PESSIMO','IRRECUPERAVEL'].map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Ano Fab.</label>
              <input type="number" value={form.anoFab} onChange={e => f('anoFab', e.target.value)} min="1950" max="2030"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Marca</label>
              <input type="text" value={form.marca} onChange={e => f('marca', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Modelo</label>
              <input type="text" value={form.modelo} onChange={e => f('modelo', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nº de Série</label>
              <input type="text" value={form.serie} onChange={e => f('serie', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Secretaria *</label>
              <input type="text" value={form.secretaria} onChange={e => f('secretaria', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Setor</label>
              <input type="text" value={form.setor} onChange={e => f('setor', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Local / Sala</label>
              <input type="text" value={form.local} onChange={e => f('local', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Responsável pelo Bem</label>
            <input type="text" value={form.responsavel} onChange={e => f('responsavel', e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Valor Aquisição R$ *</label>
              <input type="number" value={form.valorAquisicao} onChange={e => f('valorAquisicao', e.target.value)} min="0.01" step="0.01"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Valor Residual R$</label>
              <input type="number" value={form.valorResidual} onChange={e => f('valorResidual', e.target.value)} min="0" step="0.01"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Data Aquisição *</label>
              <input type="date" value={form.dataAquisicao} onChange={e => f('dataAquisicao', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fornecedor</label>
              <input type="text" value={form.fornecedor} onChange={e => f('fornecedor', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">NF</label>
              <input type="text" value={form.nfNumero} onChange={e => f('nfNumero', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Origem do Recurso</label>
              <input type="text" value={form.origemRecurso} onChange={e => f('origemRecurso', e.target.value)} placeholder="Federal, Municipal…"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
          <button onClick={() => onSalvar({ ...form, valorAquisicao: Number(form.valorAquisicao), valorResidual: Number(form.valorResidual), anoFab: form.anoFab ? Number(form.anoFab) : undefined })}
            disabled={!form.descricao || !form.secretaria || !form.valorAquisicao}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            Tombar Bem
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalTransferir({ bem, onSalvar, onClose }: { bem: BemDetalhe; onSalvar: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({ secretariaDestino: '', setorDestino: '', responsavelDestino: '', motivo: '', documento: '' })
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="p-5 border-b"><h2 className="font-bold text-gray-800">Transferir Bem</h2></div>
        <div className="p-5 space-y-3">
          <div className="bg-indigo-50 rounded-lg p-3 text-sm">
            <div className="font-medium">{bem.numeroPlaqueta}</div>
            <div className="text-gray-500 text-xs">{bem.descricao}</div>
            <div className="text-gray-400 text-xs mt-0.5">Atual: {bem.secretaria}{bem.setor ? ` / ${bem.setor}` : ''}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Secretaria Destino *</label>
            <input type="text" value={form.secretariaDestino} onChange={e => f('secretariaDestino', e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Setor Destino</label>
            <input type="text" value={form.setorDestino} onChange={e => f('setorDestino', e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Novo Responsável</label>
            <input type="text" value={form.responsavelDestino} onChange={e => f('responsavelDestino', e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Motivo *</label>
            <textarea value={form.motivo} onChange={e => f('motivo', e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Documento / Portaria</label>
            <input type="text" value={form.documento} onChange={e => f('documento', e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
          <button onClick={() => onSalvar({ acao: 'TRANSFERIR', ...form })}
            disabled={!form.secretariaDestino || !form.motivo}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            Transferir
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BensPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [porCategoria, setPorCategoria] = useState<any[]>([])
  const [bens, setBens] = useState<Bem[]>([])
  const [detalhe, setDetalhe] = useState<BemDetalhe | null>(null)
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState('')
  const [busca, setBusca] = useState('')
  const [modalBem, setModalBem] = useState(false)
  const [modalTransferir, setModalTransferir] = useState(false)
  const [depPreview, setDepPreview] = useState<DepPreview[] | null>(null)
  const [processandoDep, setProcessandoDep] = useState(false)
  const [msg, setMsg] = useState('')

  const carregar = useCallback(async () => {
    const params = new URLSearchParams()
    if (filtroCategoria) params.set('categoria', filtroCategoria)
    if (filtroSituacao)  params.set('situacao', filtroSituacao)
    if (busca)           params.set('busca', busca)
    const [kR, bR] = await Promise.all([
      fetch('/api/patrimonio/bem?relatorio=DASHBOARD'),
      fetch(`/api/patrimonio/bem?${params}`),
    ])
    const [kD, bD] = await Promise.all([kR.json(), bR.json()])
    setKpis(kD.kpis)
    setPorCategoria(kD.porCategoria ?? [])
    setBens(bD.bens ?? [])
  }, [filtroCategoria, filtroSituacao, busca])

  useEffect(() => { carregar() }, [carregar])

  async function abrirDetalhe(id: string) {
    const r = await fetch(`/api/patrimonio/bem?id=${id}`)
    const d = await r.json()
    if (d.bem) setDetalhe(d.bem)
  }

  async function tombar(dados: any) {
    const r = await fetch('/api/patrimonio/bem', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    setMsg(`Bem tombado — Plaqueta: ${d.plaqueta}`)
    setModalBem(false)
    carregar()
    setTimeout(() => setMsg(''), 5000)
  }

  async function acaoBem(id: string, dados: any) {
    const r = await fetch('/api/patrimonio/bem', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...dados }),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    setMsg('Operação realizada!')
    setModalTransferir(false)
    carregar()
    if (detalhe?.id === id) abrirDetalhe(id)
    setTimeout(() => setMsg(''), 3000)
  }

  async function carregarDepPreview() {
    const r = await fetch('/api/patrimonio/depreciacao?relatorio=PREVIEW')
    const d = await r.json()
    setDepPreview(d.preview ?? [])
  }

  async function processarDepreciacao() {
    setProcessandoDep(true)
    const mes = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    const r = await fetch('/api/patrimonio/depreciacao', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competencia: mes }),
    })
    const d = await r.json()
    setProcessandoDep(false)
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    setMsg(`Depreciação processada: ${d.processados} bens · R$ ${Number(d.totalDepreciado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
    setDepPreview(null)
    carregar()
    setTimeout(() => setMsg(''), 6000)
  }

  const fmtMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtData  = (v: string) => new Date(v).toLocaleDateString('pt-BR')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patrimônio Público</h1>
            <p className="text-sm text-gray-500 mt-0.5">Lei 4.320/1964 · NBC T 16.9 · MCASP · Decreto 93.872/1986</p>
          </div>
          <div className="flex gap-2">
            <button onClick={carregarDepPreview}
              className="px-3 py-2 rounded-lg border border-indigo-300 text-indigo-600 text-sm font-medium hover:bg-indigo-50">
              📉 Depreciar
            </button>
            <button onClick={() => setModalBem(true)}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
              + Tombar Bem
            </button>
          </div>
        </div>
      </div>

      {msg && (
        <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{msg}</div>
      )}

      {/* Modal prévia de depreciação */}
      {depPreview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-5 border-b">
              <h2 className="font-bold text-gray-800">Prévia — Depreciação Mensal (NBC T 16.9)</h2>
              <p className="text-xs text-gray-400 mt-0.5">{depPreview.length} bens a depreciar nesta competência</p>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {depPreview.length === 0 ? (
                <div className="text-center text-gray-400 py-8">Todos os bens já foram depreciados nesta competência.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="text-left pb-2">Plaqueta</th>
                      <th className="text-left pb-2">Descrição</th>
                      <th className="text-right pb-2">Valor Atual</th>
                      <th className="text-right pb-2">Depreciação</th>
                      <th className="text-right pb-2">Valor Após</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {depPreview.slice(0, 50).map(b => (
                      <tr key={b.id} className="py-1">
                        <td className="py-1 font-mono text-indigo-600">{b.numeroPlaqueta}</td>
                        <td className="py-1 text-gray-700 max-w-[160px] truncate">{b.descricao}</td>
                        <td className="py-1 text-right text-gray-500">{fmtMoeda(Number(b.valorAtual))}</td>
                        <td className="py-1 text-right text-orange-600 font-medium">-{fmtMoeda(Number(b.depMensal))}</td>
                        <td className="py-1 text-right text-green-700 font-semibold">{fmtMoeda(Number(b.valorApos))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {depPreview.length > 50 && <p className="text-xs text-gray-400 mt-2 text-center">+{depPreview.length - 50} bens não exibidos</p>}
            </div>
            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => setDepPreview(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
              {depPreview.length > 0 && (
                <button onClick={processarDepreciacao} disabled={processandoDep}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {processandoDep ? 'Processando…' : `Processar ${depPreview.length} bens`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      {kpis && (
        <div className="px-6 py-4 grid grid-cols-5 lg:grid-cols-9 gap-2">
          {[
            { label: 'Total',         valor: kpis.total,         cor: 'text-gray-800' },
            { label: 'Ativos',        valor: kpis.ativos,        cor: 'text-green-600' },
            { label: 'Em Manutenção', valor: kpis.emManut,       cor: 'text-orange-600' },
            { label: 'Extraviados',   valor: kpis.extraviados,   cor: 'text-red-600' },
            { label: 'Baixados',      valor: kpis.baixados,      cor: 'text-gray-400' },
            { label: 'Valor Atual',   valor: fmtMoeda(Number(kpis.valorAtual)),     cor: 'text-green-700' },
            { label: 'Valor Original',valor: fmtMoeda(Number(kpis.valorAquisicao)), cor: 'text-blue-600' },
            { label: 'Dep. Acum.',    valor: fmtMoeda(Number(kpis.depAcumulada)),   cor: 'text-orange-600' },
            { label: 'Alienados',     valor: kpis.alienados,     cor: 'text-purple-500' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <div className={`text-sm font-bold ${k.cor}`}>{k.valor}</div>
              <div className="text-xs text-gray-400 mt-0.5 leading-tight">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="px-6 pb-4 flex gap-3 flex-wrap">
        <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Plaqueta, descrição, série…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-52" />
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todas as categorias</option>
          {Object.keys(CAT_ICON).map(c => <option key={c} value={c}>{CAT_ICON[c]} {c.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={filtroSituacao} onChange={e => setFiltroSituacao(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todas as situações</option>
          {Object.keys(SIT_COR).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <span className="ml-auto text-sm text-gray-500 self-center">{bens.length} bens</span>
      </div>

      {/* Layout 2 colunas */}
      <div className="px-6 pb-8 grid grid-cols-5 gap-6">
        {/* Lista */}
        <div className="col-span-2 space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
          {bens.map(b => (
            <button key={b.id} onClick={() => abrirDetalhe(b.id)}
              className={`w-full text-left bg-white rounded-xl border p-4 hover:border-indigo-400 transition-all ${detalhe?.id === b.id ? 'border-indigo-500 ring-1 ring-indigo-200' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-base">{CAT_ICON[b.categoria] ?? '📦'}</span>
                    <span className="font-mono text-xs text-indigo-600">{b.numeroPlaqueta}</span>
                  </div>
                  <div className="font-semibold text-sm text-gray-900 leading-tight truncate">{b.descricao}</div>
                  {(b.marca || b.modelo) && (
                    <div className="text-xs text-gray-400">{[b.marca, b.modelo].filter(Boolean).join(' ')}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-0.5">{b.secretaria}{b.local ? ` · ${b.local}` : ''}</div>
                  {/* Barra de depreciação */}
                  <div className="mt-1.5">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-400">{percDep(b).toFixed(0)}% depreciado</span>
                      <span className="font-medium text-green-700">{fmtMoeda(Number(b.valorAtual))}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${percDep(b) >= 90 ? 'bg-red-400' : percDep(b) >= 50 ? 'bg-orange-400' : 'bg-indigo-400'}`}
                        style={{ width: `${percDep(b)}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${SIT_COR[b.situacao] ?? ''}`}>
                    {b.situacao.replace(/_/g, ' ')}
                  </span>
                  <span className={`text-xs font-medium ${ESTADO_COR[b.estado] ?? ''}`}>{b.estado}</span>
                </div>
              </div>
            </button>
          ))}
          {bens.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <div className="text-4xl mb-2">📦</div>
              <div>Nenhum bem encontrado</div>
            </div>
          )}
        </div>

        {/* Painel detalhe */}
        <div className="col-span-3">
          {!detalhe ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <div className="text-5xl mb-3">🏛️</div>
              <div>Selecione um bem para ver detalhes</div>
              {/* Mini gráfico por categoria */}
              {porCategoria.length > 0 && (
                <div className="mt-8 text-left">
                  <div className="text-sm font-semibold text-gray-600 mb-3 text-center">Por Categoria</div>
                  <div className="space-y-1.5">
                    {porCategoria.slice(0, 8).map((c: any) => (
                      <div key={c.categoria} className="flex items-center gap-2 text-xs">
                        <span className="w-5">{CAT_ICON[c.categoria] ?? '📦'}</span>
                        <span className="text-gray-600 w-28 truncate">{c.categoria.replace(/_/g, ' ')}</span>
                        <span className="font-medium text-gray-800 w-8 text-right">{c._count.id}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 ml-1">
                          <div className="h-1.5 rounded-full bg-indigo-400"
                            style={{ width: `${Math.min(100, (c._count.id / (kpis?.total ?? 1)) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-5 border-b">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{CAT_ICON[detalhe.categoria] ?? '📦'}</span>
                      <div>
                        <div className="font-mono text-sm text-indigo-600">{detalhe.numeroPlaqueta}</div>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">{detalhe.descricao}</h2>
                        {(detalhe.marca || detalhe.modelo) && (
                          <div className="text-sm text-gray-500">{[detalhe.marca, detalhe.modelo].filter(Boolean).join(' ')}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SIT_COR[detalhe.situacao]}`}>
                      {detalhe.situacao.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-xs font-medium ${ESTADO_COR[detalhe.estado]}`}>{detalhe.estado}</span>
                  </div>
                </div>

                {/* Valores */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-blue-50 rounded-lg p-2 text-center">
                    <div className="text-sm font-bold text-blue-700">{fmtMoeda(Number(detalhe.valorAquisicao))}</div>
                    <div className="text-xs text-gray-400">custo histórico</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2 text-center">
                    <div className="text-sm font-bold text-green-700">{fmtMoeda(Number(detalhe.valorAtual))}</div>
                    <div className="text-xs text-gray-400">valor atual</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-2 text-center">
                    <div className="text-sm font-bold text-orange-700">{fmtMoeda(Number(detalhe.depAcumulada))}</div>
                    <div className="text-xs text-gray-400">dep. acumulada</div>
                  </div>
                </div>

                {/* Barra depreciação */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">{percDep(detalhe).toFixed(1)}% depreciado</span>
                    {detalhe.taxaDepAnual && <span className="text-gray-400">{(Number(detalhe.taxaDepAnual) * 100).toFixed(1)}% a.a. · {detalhe.vidaUtilAnos} anos</span>}
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${percDep(detalhe) >= 90 ? 'bg-red-400' : percDep(detalhe) >= 50 ? 'bg-orange-400' : 'bg-indigo-400'}`}
                      style={{ width: `${percDep(detalhe)}%` }} />
                  </div>
                </div>

                {/* Info */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                  <div>Localização: <span className="text-gray-700">{detalhe.secretaria}{detalhe.setor ? ` / ${detalhe.setor}` : ''}</span></div>
                  {detalhe.local && <div>Local: <span className="text-gray-700">{detalhe.local}</span></div>}
                  {detalhe.responsavel && <div>Responsável: <span className="text-gray-700">{detalhe.responsavel}</span></div>}
                  <div>Aquisição: <span className="text-gray-700">{fmtData(detalhe.dataAquisicao)}</span></div>
                  {detalhe.fornecedor && <div>Fornecedor: <span className="text-gray-700">{detalhe.fornecedor}</span></div>}
                  {detalhe.origemRecurso && <div>Recurso: <span className="text-gray-700">{detalhe.origemRecurso}</span></div>}
                </div>

                {/* Ações */}
                {detalhe.situacao === 'ATIVO' && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setModalTransferir(true)}
                      className="px-3 py-1.5 text-xs bg-indigo-100 text-indigo-700 rounded-lg font-medium hover:bg-indigo-200">
                      ↔ Transferir
                    </button>
                    <button onClick={() => acaoBem(detalhe.id, { acao: 'BAIXA', motivo: 'Baixa por sucata/inservível' })}
                      className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200">
                      Baixar Bem
                    </button>
                    <button onClick={() => acaoBem(detalhe.id, { acao: 'ALIENACAO', motivo: 'Alienação patrimonial' })}
                      className="px-3 py-1.5 text-xs bg-purple-100 text-purple-600 rounded-lg font-medium hover:bg-purple-200">
                      Alienar
                    </button>
                  </div>
                )}
              </div>

              {/* Histórico de movimentações */}
              <div className="p-5 max-h-64 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Histórico de Movimentações</h3>
                {(detalhe.movimentacoes ?? []).length === 0 ? (
                  <div className="text-xs text-gray-400 text-center py-3">Sem movimentações</div>
                ) : (
                  <div className="space-y-1.5">
                    {detalhe.movimentacoes.map(m => (
                      <div key={m.id} className="flex items-start gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex-1">
                          <span className="font-medium text-indigo-600">{m.tipo.replace(/_/g, ' ')}</span>
                          <span className="text-gray-400 ml-2">{new Date(m.dataMovimentacao).toLocaleDateString('pt-BR')}</span>
                          {m.secretariaOrigem && m.secretariaDestino && (
                            <div className="text-gray-500 mt-0.5">{m.secretariaOrigem} → {m.secretariaDestino}</div>
                          )}
                          <div className="text-gray-500 mt-0.5 truncate">{m.motivo}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {modalBem && <ModalBem onSalvar={tombar} onClose={() => setModalBem(false)} />}
      {modalTransferir && detalhe && (
        <ModalTransferir bem={detalhe} onSalvar={(d) => acaoBem(detalhe.id, d)} onClose={() => setModalTransferir(false)} />
      )}
    </div>
  )
}
