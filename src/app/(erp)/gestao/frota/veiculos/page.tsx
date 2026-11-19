'use client'
import { useState, useEffect, useCallback } from 'react'

type Veiculo = {
  id: string; placa: string; tipo: string; marca: string; modelo: string
  anoFab: number; anoMod: number; combustivel: string; situacao: string
  hodometro: number; secretaria?: string; patrimonio?: string
  vencCRLV?: string; vencSeguro?: string
  _count: { abastecimentos: number; manutencoes: number }
}
type VeiculoDetalhe = Veiculo & {
  chassi?: string; renavam?: string; cor?: string; capacidade?: number
  seguradora?: string; apolice?: string; vencLicenciamento?: string; observacoes?: string
  abastecimentos: AbastRow[]; manutencoes: ManutRow[]; agendamentos: AgRow[]
}
type AbastRow = { id: string; dataAbast: string; litros: number; valorTotal: number; combustivel: string; hodometro: number; consumoKmL?: number; posto?: string }
type ManutRow = { id: string; tipo: string; situacao: string; descricao: string; dataEntrada: string; dataConclusao?: string; valorFinal?: number; oficina?: string }
type AgRow   = { id: string; dataSaida: string; dataRetornoPrev: string; destino: string; solicitante: string; situacao: string }
type KPIs = { total: number; ativos: number; emManutencao: number; aguardManut: number; inativos: number; sinistrados: number; crlvVencendo: number; seguroVencendo: number; gastoMes: number; manutAberta: number }

const TIPO_ICON: Record<string, string> = {
  CARRO: '🚗', CAMINHONETE: '🛻', VAN: '🚐', MICRO_ONIBUS: '🚌', ONIBUS: '🚌',
  CAMINHAO: '🚛', CAMINHAO_PIPA: '🚒', TRATOR: '🚜', RETROESCAVADEIRA: '🚜',
  MOTONIVELADORA: '🚧', MOTOCICLETA: '🏍️', BICICLETA_ELETRICA: '🚴', BARCO: '⛵', OUTRO: '🔧',
}
const SITUACAO_COR: Record<string, string> = {
  ATIVO:               'bg-green-100 text-green-700',
  EM_MANUTENCAO:       'bg-orange-100 text-orange-700',
  AGUARDANDO_MANUTENCAO: 'bg-yellow-100 text-yellow-700',
  INATIVO:             'bg-gray-100 text-gray-500',
  SINISTRADO:          'bg-red-100 text-red-700',
  ALIENADO:            'bg-purple-100 text-purple-500',
}

function diasAteVencer(d?: string) {
  if (!d) return null
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

function BadgeVenc({ label, data }: { label: string; data?: string }) {
  const dias = diasAteVencer(data)
  if (dias === null) return null
  const cor = dias < 0 ? 'bg-red-100 text-red-700' : dias <= 30 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-600'
  const txt = dias < 0 ? `${label} vencido` : dias === 0 ? `${label} vence hoje` : `${label} ${dias}d`
  return <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cor}`}>{txt}</span>
}

function ModalVeiculo({ onSalvar, onClose }: { onSalvar: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    placa: '', renavam: '', chassi: '', tipo: 'CARRO', marca: '', modelo: '',
    anoFab: new Date().getFullYear().toString(), anoMod: new Date().getFullYear().toString(),
    cor: '', combustivel: 'FLEX', capacidade: '', hodometro: '0',
    secretaria: '', patrimonio: '', seguradora: '', apolice: '',
    vencSeguro: '', vencLicenciamento: '', vencCRLV: '', observacoes: '',
  })
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b">
          <h2 className="text-lg font-bold text-gray-800">Cadastrar Veículo</h2>
          <p className="text-xs text-gray-400 mt-0.5">CTB Lei 9.503/1997 · CONTRAN Res. 952/2022</p>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Placa *</label>
              <input type="text" value={form.placa} onChange={e => f('placa', e.target.value.toUpperCase())}
                placeholder="AAA0A00" maxLength={8}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo *</label>
              <select value={form.tipo} onChange={e => f('tipo', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                {Object.keys(TIPO_ICON).map(t => (
                  <option key={t} value={t}>{TIPO_ICON[t]} {t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Combustível *</label>
              <select value={form.combustivel} onChange={e => f('combustivel', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                {['GASOLINA','ETANOL','DIESEL','DIESEL_S10','GNV','FLEX','ELETRICO','HIBRIDO'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Marca *</label>
              <input type="text" value={form.marca} onChange={e => f('marca', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Modelo *</label>
              <input type="text" value={form.modelo} onChange={e => f('modelo', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Cor</label>
              <input type="text" value={form.cor} onChange={e => f('cor', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Ano Fab.</label>
              <input type="number" value={form.anoFab} onChange={e => f('anoFab', e.target.value)} min="1950" max="2030"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Ano Mod.</label>
              <input type="number" value={form.anoMod} onChange={e => f('anoMod', e.target.value)} min="1950" max="2030"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Hodômetro km</label>
              <input type="number" value={form.hodometro} onChange={e => f('hodometro', e.target.value)} min="0"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Capacidade</label>
              <input type="number" value={form.capacidade} onChange={e => f('capacidade', e.target.value)} min="1"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">RENAVAM</label>
              <input type="text" value={form.renavam} onChange={e => f('renavam', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nº Patrimônio</label>
              <input type="text" value={form.patrimonio} onChange={e => f('patrimonio', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Secretaria Responsável</label>
              <input type="text" value={form.secretaria} onChange={e => f('secretaria', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Seguradora</label>
              <input type="text" value={form.seguradora} onChange={e => f('seguradora', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Venc. CRLV</label>
              <input type="date" value={form.vencCRLV} onChange={e => f('vencCRLV', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Venc. Licenciamento</label>
              <input type="date" value={form.vencLicenciamento} onChange={e => f('vencLicenciamento', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Venc. Seguro</label>
              <input type="date" value={form.vencSeguro} onChange={e => f('vencSeguro', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
          <button onClick={() => onSalvar({ ...form, anoFab: Number(form.anoFab), anoMod: Number(form.anoMod), hodometro: Number(form.hodometro), capacidade: form.capacidade ? Number(form.capacidade) : undefined })}
            disabled={!form.placa || !form.marca || !form.modelo}
            className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            Cadastrar
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalAbastecimento({ veiculoId, hodAtual, onSalvar, onClose }: { veiculoId: string; hodAtual: number; onSalvar: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    combustivel: 'FLEX', hodometro: hodAtual.toString(), litros: '', valorLitro: '', posto: '', nfNumero: '',
    dataAbast: new Date().toISOString().split('T')[0],
  })
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const total = form.litros && form.valorLitro ? (Number(form.litros) * Number(form.valorLitro)).toFixed(2) : '—'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="p-5 border-b"><h2 className="font-bold text-gray-800">Registrar Abastecimento</h2></div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Data *</label>
              <input type="date" value={form.dataAbast} onChange={e => f('dataAbast', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Combustível</label>
              <select value={form.combustivel} onChange={e => f('combustivel', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                {['GASOLINA','ETANOL','DIESEL','DIESEL_S10','GNV','FLEX','ELETRICO','HIBRIDO'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Hodômetro km * (atual: {hodAtual.toLocaleString('pt-BR')})</label>
            <input type="number" value={form.hodometro} onChange={e => f('hodometro', e.target.value)} min={hodAtual}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Litros *</label>
              <input type="number" value={form.litros} onChange={e => f('litros', e.target.value)} min="0.1" step="0.001"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">R$/L *</label>
              <input type="number" value={form.valorLitro} onChange={e => f('valorLitro', e.target.value)} min="0.01" step="0.001"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
          {form.litros && form.valorLitro && (
            <div className="bg-green-50 border border-green-200 rounded p-2 text-sm font-semibold text-green-700 text-center">
              Total: R$ {total}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Posto</label>
              <input type="text" value={form.posto} onChange={e => f('posto', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">NF</label>
              <input type="text" value={form.nfNumero} onChange={e => f('nfNumero', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
          <button onClick={() => onSalvar({ veiculoId, ...form, hodometro: Number(form.hodometro), litros: Number(form.litros), valorLitro: Number(form.valorLitro) })}
            disabled={!form.litros || !form.valorLitro || !form.hodometro}
            className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            Registrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function VeiculosPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [detalhe, setDetalhe] = useState<VeiculoDetalhe | null>(null)
  const [filtroSituacao, setFiltroSituacao] = useState('')
  const [busca, setBusca] = useState('')
  const [modalVeiculo, setModalVeiculo] = useState(false)
  const [modalAbast, setModalAbast] = useState(false)
  const [msg, setMsg] = useState('')

  const carregar = useCallback(async () => {
    const params = new URLSearchParams()
    if (filtroSituacao) params.set('situacao', filtroSituacao)
    if (busca)          params.set('busca', busca)
    const [kR, vR] = await Promise.all([
      fetch('/api/frota/veiculo?relatorio=DASHBOARD'),
      fetch(`/api/frota/veiculo?${params}`),
    ])
    const [kD, vD] = await Promise.all([kR.json(), vR.json()])
    setKpis(kD.kpis)
    setVeiculos(vD.veiculos ?? [])
  }, [filtroSituacao, busca])

  useEffect(() => { carregar() }, [carregar])

  async function abrirDetalhe(id: string) {
    const r = await fetch(`/api/frota/veiculo?id=${id}`)
    const d = await r.json()
    if (d.veiculo) setDetalhe(d.veiculo)
  }

  async function cadastrarVeiculo(dados: any) {
    const r = await fetch('/api/frota/veiculo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    setMsg(`Veículo ${d.veiculo.placa} cadastrado!`)
    setModalVeiculo(false)
    carregar()
    setTimeout(() => setMsg(''), 4000)
  }

  async function registrarAbastecimento(dados: any) {
    const r = await fetch('/api/frota/abastecimento', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    const cons = d.consumoKmL ? ` · ${d.consumoKmL} km/L` : ''
    setMsg(`Abastecimento registrado! R$ ${Number(d.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${cons}`)
    setModalAbast(false)
    if (detalhe) abrirDetalhe(detalhe.id)
    carregar()
    setTimeout(() => setMsg(''), 5000)
  }

  async function mudarSituacao(id: string, situacao: string) {
    await fetch('/api/frota/veiculo', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, situacao }),
    })
    carregar()
    if (detalhe?.id === id) abrirDetalhe(id)
  }

  const fmtMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtData  = (v: string) => new Date(v).toLocaleDateString('pt-BR')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Frota Municipal</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gestão de veículos · CTB Lei 9.503/1997 · CONTRAN Res. 952/2022</p>
          </div>
          <button onClick={() => setModalVeiculo(true)}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700">
            + Novo Veículo
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
            { label: 'Total',         valor: kpis.total,         cor: 'text-gray-800' },
            { label: 'Ativos',        valor: kpis.ativos,        cor: 'text-green-600' },
            { label: 'Em Manutenção', valor: kpis.emManutencao,  cor: 'text-orange-600' },
            { label: 'Ag. Manut.',    valor: kpis.aguardManut,   cor: 'text-yellow-600' },
            { label: 'Inativos',      valor: kpis.inativos,      cor: 'text-gray-500' },
            { label: 'Sinistrados',   valor: kpis.sinistrados,   cor: 'text-red-600' },
            { label: 'CRLV Venc.',    valor: kpis.crlvVencendo,  cor: kpis.crlvVencendo > 0 ? 'text-red-600' : 'text-gray-400' },
            { label: 'Seg. Venc.',    valor: kpis.seguroVencendo, cor: kpis.seguroVencendo > 0 ? 'text-orange-600' : 'text-gray-400' },
            { label: 'Gasto/Mês',     valor: fmtMoeda(Number(kpis.gastoMes)), cor: 'text-indigo-600' },
            { label: 'Manut. Abertas',valor: kpis.manutAberta,   cor: kpis.manutAberta > 0 ? 'text-orange-600' : 'text-gray-400' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <div className={`text-base font-bold ${k.cor}`}>{k.valor}</div>
              <div className="text-xs text-gray-400 mt-0.5 leading-tight">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="px-6 pb-4 flex gap-3 flex-wrap">
        <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Placa, modelo, secretaria…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-52" />
        <select value={filtroSituacao} onChange={e => setFiltroSituacao(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todas as situações</option>
          {Object.keys(SITUACAO_COR).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <span className="ml-auto text-sm text-gray-500 self-center">{veiculos.length} veículos</span>
      </div>

      {/* Layout 2 colunas */}
      <div className="px-6 pb-8 grid grid-cols-5 gap-6">
        {/* Lista */}
        <div className="col-span-2 space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
          {veiculos.map(v => (
            <button key={v.id} onClick={() => abrirDetalhe(v.id)}
              className={`w-full text-left bg-white rounded-xl border p-4 hover:border-green-400 hover:shadow-sm transition-all ${detalhe?.id === v.id ? 'border-green-500 ring-1 ring-green-200' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{TIPO_ICON[v.tipo] ?? '🔧'}</span>
                    <div>
                      <div className="font-bold text-gray-900 font-mono">{v.placa}</div>
                      <div className="text-xs text-gray-500">{v.marca} {v.modelo} · {v.anoMod}</div>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {v.secretaria && <span className="text-xs text-gray-400">{v.secretaria}</span>}
                    <BadgeVenc label="CRLV"   data={v.vencCRLV} />
                    <BadgeVenc label="Seguro" data={v.vencSeguro} />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {v.hodometro.toLocaleString('pt-BR')} km · {v.combustivel}
                  </div>
                </div>
                <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${SITUACAO_COR[v.situacao] ?? ''}`}>
                  {v.situacao.replace(/_/g, ' ')}
                </span>
              </div>
            </button>
          ))}
          {veiculos.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <div className="text-4xl mb-2">🚗</div>
              <div>Nenhum veículo encontrado</div>
            </div>
          )}
        </div>

        {/* Painel detalhe */}
        <div className="col-span-3">
          {!detalhe ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <div className="text-5xl mb-3">🚗</div>
              <div>Selecione um veículo para ver detalhes</div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200">
              {/* Header */}
              <div className="p-5 border-b">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{TIPO_ICON[detalhe.tipo] ?? '🔧'}</div>
                    <div>
                      <div className="text-2xl font-bold font-mono text-gray-900">{detalhe.placa}</div>
                      <div className="text-sm text-gray-500">{detalhe.marca} {detalhe.modelo} {detalhe.anoFab}/{detalhe.anoMod}</div>
                      <div className="text-xs text-gray-400">{detalhe.hodometro.toLocaleString('pt-BR')} km · {detalhe.combustivel}{detalhe.cor ? ` · ${detalhe.cor}` : ''}</div>
                    </div>
                  </div>
                  <span className={`text-sm px-3 py-1 rounded-full font-medium ${SITUACAO_COR[detalhe.situacao]}`}>
                    {detalhe.situacao.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Info rápida */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {detalhe.secretaria  && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{detalhe.secretaria}</span>}
                  {detalhe.patrimonio  && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Patr. {detalhe.patrimonio}</span>}
                  <BadgeVenc label="CRLV"           data={detalhe.vencCRLV} />
                  <BadgeVenc label="Licenciamento"  data={detalhe.vencLicenciamento} />
                  <BadgeVenc label="Seguro"         data={detalhe.vencSeguro} />
                </div>

                {/* Ações */}
                <div className="mt-3 flex gap-2 flex-wrap">
                  {detalhe.situacao === 'ATIVO' && (
                    <button onClick={() => setModalAbast(true)}
                      className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200">
                      ⛽ Abastecer
                    </button>
                  )}
                  {['ATIVO','AGUARDANDO_MANUTENCAO'].includes(detalhe.situacao) && (
                    <button onClick={() => mudarSituacao(detalhe.id, 'EM_MANUTENCAO')}
                      className="px-3 py-1.5 text-xs bg-orange-100 text-orange-700 rounded-lg font-medium hover:bg-orange-200">
                      🔧 Enviar p/ Manutenção
                    </button>
                  )}
                  {detalhe.situacao === 'EM_MANUTENCAO' && (
                    <button onClick={() => mudarSituacao(detalhe.id, 'ATIVO')}
                      className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200">
                      ✓ Liberar Veículo
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs histórico */}
              <div className="p-5 max-h-96 overflow-y-auto">
                <div className="mb-3 font-semibold text-sm text-gray-700">
                  Últimos Abastecimentos ({detalhe.abastecimentos?.length ?? 0})
                </div>
                {(detalhe.abastecimentos ?? []).length === 0 ? (
                  <div className="text-sm text-gray-400 text-center py-3">Nenhum abastecimento registrado</div>
                ) : (
                  <div className="space-y-1.5 mb-5">
                    {detalhe.abastecimentos.map(a => (
                      <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs">
                        <div>
                          <span className="font-medium">{fmtData(a.dataAbast)}</span>
                          <span className="text-gray-400 ml-2">{a.hodometro.toLocaleString('pt-BR')} km</span>
                          {a.posto && <span className="text-gray-400 ml-2">{a.posto}</span>}
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-green-700">{fmtMoeda(Number(a.valorTotal))}</span>
                          <span className="text-gray-400 ml-2">{Number(a.litros).toFixed(1)} L</span>
                          {a.consumoKmL && <span className="ml-2 text-indigo-600">{Number(a.consumoKmL).toFixed(1)} km/L</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mb-3 font-semibold text-sm text-gray-700">
                  Manutenções ({detalhe.manutencoes?.length ?? 0})
                </div>
                {(detalhe.manutencoes ?? []).length === 0 ? (
                  <div className="text-sm text-gray-400 text-center py-3">Nenhuma manutenção registrada</div>
                ) : (
                  <div className="space-y-1.5">
                    {detalhe.manutencoes.map(m => (
                      <div key={m.id} className={`rounded-lg px-3 py-2 text-xs border ${m.situacao === 'CONCLUIDA' ? 'bg-gray-50 border-gray-100' : 'bg-orange-50 border-orange-200'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{m.tipo.replace(/_/g, ' ')}</span>
                          <span className={`px-1.5 py-0.5 rounded font-medium ${
                            m.situacao === 'CONCLUIDA'   ? 'bg-green-100 text-green-700' :
                            m.situacao === 'EM_EXECUCAO' ? 'bg-orange-100 text-orange-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>{m.situacao}</span>
                        </div>
                        <div className="text-gray-500 mt-0.5">{m.descricao.slice(0, 60)}{m.descricao.length > 60 ? '…' : ''}</div>
                        <div className="text-gray-400 mt-0.5">
                          {fmtData(m.dataEntrada)}
                          {m.oficina && ` · ${m.oficina}`}
                          {m.valorFinal ? ` · ${fmtMoeda(Number(m.valorFinal))}` : ''}
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

      {modalVeiculo && <ModalVeiculo onSalvar={cadastrarVeiculo} onClose={() => setModalVeiculo(false)} />}
      {modalAbast && detalhe && (
        <ModalAbastecimento
          veiculoId={detalhe.id}
          hodAtual={detalhe.hodometro}
          onSalvar={registrarAbastecimento}
          onClose={() => setModalAbast(false)}
        />
      )}
    </div>
  )
}
