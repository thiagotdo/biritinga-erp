'use client'
import { useState, useEffect, useCallback } from 'react'

type Imovel = {
  id: string; inscricaoImobiliaria: string; tipoImovel: string; situacaoImovel: string
  logradouro?: string; numero?: string; bairro?: string; complemento?: string
  areaTerreno?: number; areaConstrucao?: number
  valorVenalTerreno?: number; valorVenalConstrucao?: number; valorVenal?: number
  aliquotaIPTU?: number; reducaoFiscal?: number
  isento: boolean; motivoIsencao?: string
  iptuProgressivo: boolean; anoProgressivo?: number
  contribuinte?: { inscricaoMunicipal: string; nomeCompleto?: string; razaoSocial?: string; nomeFantasia?: string }
  _count?: { lancamentos: number }
  // calculo preview
  iptuCalculado?: number; aliquotaEfetiva?: number; ehProgressivo?: boolean
}
type LancIPTU = {
  id: string; exercicio: number; situacao: string
  valorPrincipal: number; valorTotal: number; valorSaldo: number; valorPago: number
  vencimento: string; vencido?: boolean
}
type Kpis = {
  totalImoveis: number; ativos: number; isentos: number; progressivos: number
  iptuAberto: number; iptuAbertoCount: number; iptuPagoAno: number
  totalValorVenal: number; percArrecad: number
}

const TIPO_ICON: Record<string, string> = {
  RESIDENCIAL: '🏠', COMERCIAL: '🏢', INDUSTRIAL: '🏭',
  TERRENO: '🟫', RURAL: '🌾', MISTO: '🏗', OUTROS: '📦',
}
const SIT_COR: Record<string, string> = {
  REGULAR: 'bg-green-100 text-green-700',
  IRREGULAR: 'bg-red-100 text-red-700',
  EM_CONSTRUCAO: 'bg-yellow-100 text-yellow-700',
  DEMOLIDO: 'bg-gray-100 text-gray-400',
  ISENTO: 'bg-blue-100 text-blue-600',
}
const LANC_COR: Record<string, string> = {
  ABERTO: 'bg-yellow-100 text-yellow-700',
  PAGO: 'bg-green-100 text-green-700',
  PARCELADO: 'bg-blue-100 text-blue-700',
  PROTESTADO: 'bg-orange-100 text-orange-700',
  PRESCRITO: 'bg-gray-100 text-gray-400',
}

export default function IptuPage() {
  const [imoveis, setImoveis] = useState<Imovel[]>([])
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [selecionado, setSelecionado] = useState<Imovel | null>(null)
  const [lancamentos, setLancamentos] = useState<LancIPTU[]>([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // Filtros
  const [filtBusca, setFiltBusca] = useState('')
  const [filtTipo, setFiltTipo] = useState('')
  const [filtBairro, setFiltBairro] = useState('')
  const [filtIsento, setFiltIsento] = useState('')

  // Modais
  const [modalNovo, setModalNovo] = useState(false)
  const [modalLancar, setModalLancar] = useState(false)
  const [modalPagar, setModalPagar] = useState<LancIPTU | null>(null)

  // Form novo imóvel
  const [form, setForm] = useState({
    contribuinteId: '', tipoImovel: 'RESIDENCIAL',
    logradouro: '', numero: '', complemento: '', bairro: '', cep: '',
    quadra: '', lote: '', setor: '',
    areaTerreno: '', areaConstrucao: '',
    valorVenalTerreno: '', valorVenalConstrucao: '',
    aliquotaIPTU: '1', reducaoFiscal: '0',
    isento: false, motivoIsencao: '',
    iptuProgressivo: false, anoProgressivo: '',
    contribuinteBusca: '',
  })
  const [contribuintesEncontrados, setContribuintesEncontrados] = useState<any[]>([])

  // Form lançar exercício
  const [formLancar, setFormLancar] = useState({
    exercicio: String(new Date().getFullYear()),
    parcelas: '10',
  })

  const [formPag, setFormPag] = useState({ valorPago: '', formaPagamento: 'PIX', autenticacao: '' })

  const valorVenalTotal = parseFloat(form.valorVenalTerreno || '0') + parseFloat(form.valorVenalConstrucao || '0')
  const iptuPreview = valorVenalTotal > 0 ? valorVenalTotal * parseFloat(form.aliquotaIPTU || '1') / 100 * (1 - parseFloat(form.reducaoFiscal || '0') / 100) : 0

  const carregar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filtBusca)  params.set('busca',  filtBusca)
    if (filtTipo)   params.set('tipo',   filtTipo)
    if (filtBairro) params.set('bairro', filtBairro)
    if (filtIsento) params.set('isento', filtIsento)

    const [r1, r2] = await Promise.all([
      fetch(`/api/tributacao/iptu?${params}`),
      fetch('/api/tributacao/iptu?relatorio=DASHBOARD'),
    ])
    const d1 = await r1.json(); const d2 = await r2.json()
    setImoveis(d1.imoveis ?? [])
    setKpis(d2.kpis ?? null)
    setLoading(false)
  }, [filtBusca, filtTipo, filtBairro, filtIsento])

  useEffect(() => { carregar() }, [carregar])

  async function buscarContribuinte() {
    if (!form.contribuinteBusca || form.contribuinteBusca.length < 3) return
    const r = await fetch(`/api/tributacao/contribuinte?busca=${encodeURIComponent(form.contribuinteBusca)}`)
    const d = await r.json()
    setContribuintesEncontrados(d.contribuintes ?? [])
  }

  async function abrirImovel(im: Imovel) {
    const r = await fetch(`/api/tributacao/iptu?id=${im.id}`)
    const d = await r.json()
    setSelecionado(d.imovel)
    setLancamentos(d.lancamentos ?? [])
  }

  async function cadastrarImovel() {
    const r = await fetch('/api/tributacao/iptu', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acao: 'CADASTRAR',
        contribuinteId: form.contribuinteId || undefined,
        tipoImovel: form.tipoImovel,
        logradouro: form.logradouro, numero: form.numero,
        complemento: form.complemento, bairro: form.bairro, cep: form.cep,
        quadra: form.quadra, lote: form.lote, setor: form.setor,
        areaTerreno: parseFloat(form.areaTerreno) || 0,
        areaConstrucao: parseFloat(form.areaConstrucao) || 0,
        valorVenalTerreno: parseFloat(form.valorVenalTerreno) || 0,
        valorVenalConstrucao: parseFloat(form.valorVenalConstrucao) || 0,
        aliquotaIPTU: parseFloat(form.aliquotaIPTU) || 1,
        reducaoFiscal: parseFloat(form.reducaoFiscal) || 0,
        isento: form.isento, motivoIsencao: form.motivoIsencao || undefined,
        iptuProgressivo: form.iptuProgressivo,
        anoProgressivo: form.anoProgressivo ? parseInt(form.anoProgressivo) : undefined,
      }),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); setTimeout(() => setMsg(''), 5000); return }
    setMsg(`Imóvel ${d.inscricaoImobiliaria} cadastrado! IPTU estimado: ${fmtMoeda(d.iptuCalculado)}`)
    setModalNovo(false)
    carregar()
    setTimeout(() => setMsg(''), 5000)
  }

  async function lancarExercicio() {
    const r = await fetch('/api/tributacao/iptu', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acao: 'LANCAR_EXERCICIO',
        exercicio: parseInt(formLancar.exercicio),
        parcelas: parseInt(formLancar.parcelas),
      }),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); setTimeout(() => setMsg(''), 5000); return }
    setMsg(`IPTU ${formLancar.exercicio} lançado — ${d.imoveisSocializados} imóveis · ${d.lancamentosCriados} lançamentos · R$${Number(d.valorTotal).toFixed(2)} total`)
    setModalLancar(false)
    carregar()
    setTimeout(() => setMsg(''), 8000)
  }

  async function registrarPagamento() {
    if (!modalPagar) return
    const r = await fetch('/api/tributacao/debito', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acao: 'PAGAR',
        lancamentoId: modalPagar.id,
        valorPago: parseFloat(formPag.valorPago),
        formaPagamento: formPag.formaPagamento,
        autenticacao: formPag.autenticacao || undefined,
      }),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); setTimeout(() => setMsg(''), 5000); return }
    setMsg(d.quitado ? '✅ IPTU QUITADO!' : `💰 Pagamento registrado — Saldo: ${fmtMoeda(d.novoSaldo)}`)
    setModalPagar(null)
    setFormPag({ valorPago: '', formaPagamento: 'PIX', autenticacao: '' })
    if (selecionado) abrirImovel(selecionado)
    setTimeout(() => setMsg(''), 4000)
  }

  const fmtMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtData  = (s: string) => new Date(s).toLocaleDateString('pt-BR')
  const nomeContrib = (c?: { nomeCompleto?: string; razaoSocial?: string; nomeFantasia?: string }) =>
    c ? (c.nomeFantasia ?? c.razaoSocial ?? c.nomeCompleto ?? '—') : '—'

  const totalAbertoIm = lancamentos.filter(l => l.situacao === 'ABERTO').reduce((s, l) => s + Number(l.valorSaldo), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">IPTU — Imposto Predial e Territorial Urbano</h1>
            <p className="text-sm text-gray-500 mt-0.5">CTN Art.32-34 · Lei 10.257/2001 (IPTU Progressivo) · Estágio da Cidade</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setModalLancar(true)}
              className="px-4 py-2 rounded-lg bg-orange-50 text-orange-700 text-sm font-medium border border-orange-200 hover:bg-orange-100">
              📋 Lançar Exercício
            </button>
            <button onClick={() => setModalNovo(true)}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
              + Cadastrar Imóvel
            </button>
          </div>
        </div>
      </div>

      {msg && <div className="mx-6 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">{msg}</div>}

      {/* KPIs */}
      {kpis && (
        <div className="px-6 py-4 grid grid-cols-5 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-gray-800">{kpis.totalImoveis}</div>
            <div className="text-xs text-gray-500 mt-1">Imóveis Cadastrados</div>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
            <div className="text-3xl font-bold text-green-700">{kpis.ativos}</div>
            <div className="text-xs text-gray-500 mt-1">Ativos (tributáveis)</div>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{kpis.isentos}</div>
            <div className="text-xs text-gray-500 mt-1">Isentos</div>
          </div>
          <div className="bg-orange-50 rounded-xl border border-orange-200 p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">{kpis.progressivos}</div>
            <div className="text-xs text-gray-500 mt-1">IPTU Progressivo</div>
          </div>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-xl font-bold text-gray-700">{fmtMoeda(kpis.totalValorVenal)}</div>
            <div className="text-xs text-gray-500 mt-1">Valor Venal Total</div>
          </div>

          <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 col-span-2">
            <div className="text-xs text-gray-500 mb-1">IPTU em Aberto</div>
            <div className="text-2xl font-bold text-yellow-700">{fmtMoeda(kpis.iptuAberto)}</div>
            <div className="text-xs text-gray-400">{kpis.iptuAbertoCount} lançamentos</div>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-4 col-span-2">
            <div className="text-xs text-gray-500 mb-1">Arrecadado no Ano</div>
            <div className="text-2xl font-bold text-green-700">{fmtMoeda(kpis.iptuPagoAno)}</div>
          </div>
          <div className={`rounded-xl border p-4 col-span-1 flex flex-col items-center justify-center ${kpis.percArrecad >= 70 ? 'bg-green-50 border-green-200' : kpis.percArrecad >= 40 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
            <div className={`text-3xl font-bold ${kpis.percArrecad >= 70 ? 'text-green-700' : kpis.percArrecad >= 40 ? 'text-yellow-700' : 'text-red-700'}`}>
              {kpis.percArrecad.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Taxa de Arrecadação</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="px-6 pb-3 flex gap-3">
        <input value={filtBusca} onChange={e => setFiltBusca(e.target.value)}
          placeholder="Inscrição, logradouro, bairro…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 max-w-sm" />
        <select value={filtTipo} onChange={e => setFiltTipo(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todos os tipos</option>
          {Object.keys(TIPO_ICON).map(t => <option key={t} value={t}>{TIPO_ICON[t]} {t}</option>)}
        </select>
        <input value={filtBairro} onChange={e => setFiltBairro(e.target.value)}
          placeholder="Bairro" className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32" />
        <select value={filtIsento} onChange={e => setFiltIsento(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todos</option>
          <option value="false">Tributáveis</option>
          <option value="true">Isentos</option>
        </select>
      </div>

      {/* Layout 2 colunas */}
      <div className="px-6 pb-6 grid grid-cols-5 gap-5">
        {/* Lista imóveis */}
        <div className="col-span-2 space-y-2 max-h-[calc(100vh-420px)] overflow-y-auto">
          {loading && (
            <div className="text-center text-gray-400 py-10 text-sm">Carregando…</div>
          )}
          {!loading && imoveis.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
              <div className="text-4xl mb-2">🏠</div>
              <div className="font-medium">Nenhum imóvel encontrado</div>
            </div>
          )}
          {imoveis.map(im => (
            <button key={im.id} onClick={() => abrirImovel(im)}
              className={`w-full text-left bg-white rounded-xl border p-4 hover:border-indigo-400 transition-all ${selecionado?.id === im.id ? 'border-indigo-500 ring-1 ring-indigo-200' : im.iptuProgressivo ? 'border-orange-300' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{TIPO_ICON[im.tipoImovel] ?? '🏠'}</span>
                  <div>
                    <div className="font-mono text-xs text-gray-400">{im.inscricaoImobiliaria}</div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${SIT_COR[im.situacaoImovel] ?? 'bg-gray-100 text-gray-600'}`}>{im.situacaoImovel}</span>
                    {im.iptuProgressivo && <span className="ml-1 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">🔺 Progressivo</span>}
                    {im.isento && <span className="ml-1 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">Isento</span>}
                  </div>
                </div>
                {im.iptuCalculado && <span className="text-xs text-indigo-600 font-bold">{fmtMoeda(im.iptuCalculado)}/ano</span>}
              </div>
              <div className="text-sm text-gray-700 mt-1">
                {im.logradouro}{im.numero ? `, ${im.numero}` : ''}{im.bairro ? ` — ${im.bairro}` : ''}
              </div>
              <div className="flex justify-between items-center mt-1 text-xs text-gray-400">
                <span>{nomeContrib(im.contribuinte)}</span>
                {im.aliquotaEfetiva && (
                  <span className={`font-medium ${Number(im.aliquotaEfetiva) >= 4 ? 'text-orange-500' : 'text-gray-500'}`}>
                    {Number(im.aliquotaEfetiva).toFixed(2)}% ef.
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Detalhe imóvel */}
        <div className="col-span-3">
          {!selecionado ? (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-400">
              <div className="text-6xl mb-4">🏠</div>
              <div className="text-lg font-medium">Selecione um imóvel</div>
              <div className="text-sm mt-2">Visualize dados cadastrais, cálculo IPTU e histórico de débitos</div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200">
              {/* Header imóvel */}
              <div className="p-5 border-b">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{TIPO_ICON[selecionado.tipoImovel] ?? '🏠'}</span>
                      <div>
                        <div className="font-bold text-gray-900">{selecionado.inscricaoImobiliaria}</div>
                        <div className="text-sm text-gray-500">
                          {selecionado.logradouro}{selecionado.numero ? `, ${selecionado.numero}` : ''}
                          {selecionado.complemento ? ` — ${selecionado.complemento}` : ''}
                          {selecionado.bairro ? ` · ${selecionado.bairro}` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${SIT_COR[selecionado.situacaoImovel] ?? 'bg-gray-100 text-gray-600'}`}>
                      {selecionado.situacaoImovel}
                    </span>
                    {selecionado.iptuProgressivo && (
                      <div className="text-xs text-orange-600 font-medium mt-1">
                        🔺 IPTU Progressivo (Lei 10.257/2001)
                        {selecionado.anoProgressivo && ` desde ${selecionado.anoProgressivo}`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Dados fiscais */}
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-400">Área Terreno</div>
                    <div className="font-semibold text-gray-700">{Number(selecionado.areaTerreno ?? 0).toFixed(0)} m²</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-400">Área Construída</div>
                    <div className="font-semibold text-gray-700">{Number(selecionado.areaConstrucao ?? 0).toFixed(0)} m²</div>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-2">
                    <div className="text-gray-400">Valor Venal</div>
                    <div className="font-bold text-indigo-700">{fmtMoeda(Number(selecionado.valorVenal ?? 0))}</div>
                  </div>
                  <div className={`rounded-lg p-2 ${selecionado.iptuCalculado ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <div className="text-gray-400">IPTU Anual</div>
                    <div className={`font-bold ${selecionado.iptuCalculado ? 'text-green-700' : 'text-gray-400'}`}>
                      {selecionado.iptuCalculado ? fmtMoeda(selecionado.iptuCalculado) : (selecionado.isento ? 'ISENTO' : '—')}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-400">Alíquota</div>
                    <div className={`font-bold ${Number(selecionado.aliquotaEfetiva ?? 0) >= 4 ? 'text-orange-600' : 'text-gray-700'}`}>
                      {selecionado.aliquotaEfetiva ? `${Number(selecionado.aliquotaEfetiva).toFixed(2)}%` : `${Number(selecionado.aliquotaIPTU ?? 0).toFixed(2)}%`}
                      {selecionado.ehProgressivo && <span className="text-orange-500"> 🔺</span>}
                    </div>
                  </div>
                  {selecionado.reducaoFiscal && Number(selecionado.reducaoFiscal) > 0 && (
                    <div className="bg-blue-50 rounded-lg p-2">
                      <div className="text-gray-400">Redução</div>
                      <div className="font-semibold text-blue-600">{Number(selecionado.reducaoFiscal).toFixed(0)}%</div>
                    </div>
                  )}
                  {selecionado.contribuinte && (
                    <div className="bg-gray-50 rounded-lg p-2 col-span-2">
                      <div className="text-gray-400">Proprietário</div>
                      <div className="font-medium text-gray-700 truncate">{nomeContrib(selecionado.contribuinte)}</div>
                      <div className="text-gray-400">{selecionado.contribuinte.inscricaoMunicipal}</div>
                    </div>
                  )}
                </div>

                {totalAbertoIm > 0 && (
                  <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-sm text-yellow-700 font-medium">⚠ IPTU em aberto</span>
                    <span className="font-bold text-yellow-800">{fmtMoeda(totalAbertoIm)}</span>
                  </div>
                )}
              </div>

              {/* Histórico lançamentos IPTU */}
              <div className="p-5">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                  Histórico de IPTU ({lancamentos.length})
                </h3>
                {lancamentos.length === 0 ? (
                  <div className="text-center text-gray-300 py-6 text-sm">Nenhum lançamento encontrado</div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {lancamentos.map(l => (
                      <div key={l.id}
                        className={`border rounded-xl p-3 ${l.vencido ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-gray-700">IPTU {l.exercicio}</span>
                            {l.vencido && <span className="text-red-500 font-medium text-xs">VENCIDO</span>}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${LANC_COR[l.situacao] ?? 'bg-gray-100 text-gray-500'}`}>{l.situacao}</span>
                        </div>
                        <div className="flex items-end justify-between">
                          <span className="text-xs text-gray-400">Venc: {fmtData(l.vencimento)}</span>
                          <div className="text-right">
                            <div className="font-bold text-gray-800">{fmtMoeda(Number(l.valorSaldo))}</div>
                            {Number(l.valorPago) > 0 && <div className="text-xs text-green-600">Pago: {fmtMoeda(Number(l.valorPago))}</div>}
                          </div>
                        </div>
                        {l.situacao === 'ABERTO' && (
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => { setModalPagar(l); setFormPag(p => ({ ...p, valorPago: String(Number(l.valorSaldo)) })) }}
                              className="px-2 py-1 rounded-lg bg-green-50 text-green-700 text-xs hover:bg-green-100">
                              💰 Pagar
                            </button>
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

      {/* Modal Novo Imóvel */}
      {modalNovo && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-6 overflow-y-auto pb-10">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4">
            <div className="p-5 border-b flex justify-between">
              <h2 className="text-lg font-bold text-gray-900">Cadastrar Imóvel</h2>
              <button onClick={() => setModalNovo(false)} className="text-gray-400">✕</button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              {/* Buscar proprietário */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Proprietário (contribuinte)</label>
                <div className="flex gap-2">
                  <input value={form.contribuinteBusca}
                    onChange={e => { setForm(f => ({ ...f, contribuinteBusca: e.target.value })); setContribuintesEncontrados([]) }}
                    onKeyDown={e => e.key === 'Enter' && buscarContribuinte()}
                    placeholder="CPF, CNPJ, nome ou inscrição…"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  <button onClick={buscarContribuinte}
                    className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200">
                    Buscar
                  </button>
                </div>
                {contribuintesEncontrados.length > 0 && (
                  <div className="mt-1 border border-gray-200 rounded-lg divide-y max-h-32 overflow-y-auto">
                    {contribuintesEncontrados.map(c => (
                      <button key={c.id} onClick={() => {
                        setForm(f => ({ ...f, contribuinteId: c.id, contribuinteBusca: c.nomeFantasia ?? c.razaoSocial ?? c.nomeCompleto ?? c.inscricaoMunicipal }))
                        setContribuintesEncontrados([])
                      }} className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-xs text-gray-700">
                        <span className="font-mono text-gray-400 mr-2">{c.inscricaoMunicipal}</span>
                        {c.nomeFantasia ?? c.razaoSocial ?? c.nomeCompleto}
                      </button>
                    ))}
                  </div>
                )}
                {form.contribuinteId && !contribuintesEncontrados.length && form.contribuinteBusca && (
                  <div className="mt-1 text-xs text-green-600">✓ Proprietário selecionado: {form.contribuinteBusca}</div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Imóvel</label>
                <select value={form.tipoImovel} onChange={e => setForm(f => ({ ...f, tipoImovel: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {Object.keys(TIPO_ICON).map(t => <option key={t} value={t}>{TIPO_ICON[t]} {t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Setor</label>
                  <input value={form.setor} onChange={e => setForm(f => ({ ...f, setor: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quadra</label>
                  <input value={form.quadra} onChange={e => setForm(f => ({ ...f, quadra: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lote</label>
                  <input value={form.lote} onChange={e => setForm(f => ({ ...f, lote: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Logradouro</label>
                <input value={form.logradouro} onChange={e => setForm(f => ({ ...f, logradouro: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Número</label>
                  <input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bairro</label>
                  <input value={form.bairro} onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CEP</label>
                  <input value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Área Terreno (m²)</label>
                    <input type="number" value={form.areaTerreno} onChange={e => setForm(f => ({ ...f, areaTerreno: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Área Construída (m²)</label>
                    <input type="number" value={form.areaConstrucao} onChange={e => setForm(f => ({ ...f, areaConstrucao: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">V. Venal Terreno (R$)</label>
                    <input type="number" value={form.valorVenalTerreno} onChange={e => setForm(f => ({ ...f, valorVenalTerreno: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">V. Venal Construção (R$)</label>
                    <input type="number" value={form.valorVenalConstrucao} onChange={e => setForm(f => ({ ...f, valorVenalConstrucao: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Alíquota IPTU (%)</label>
                <input type="number" step="0.1" min="0.1" max="15" value={form.aliquotaIPTU}
                  onChange={e => setForm(f => ({ ...f, aliquotaIPTU: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Redução Fiscal (%)</label>
                <input type="number" step="1" min="0" max="100" value={form.reducaoFiscal}
                  onChange={e => setForm(f => ({ ...f, reducaoFiscal: e.target.value }))}
                  placeholder="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>

              <div className="col-span-2 flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={form.isento}
                    onChange={e => setForm(f => ({ ...f, isento: e.target.checked }))} />
                  Imóvel Isento
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={form.iptuProgressivo}
                    onChange={e => setForm(f => ({ ...f, iptuProgressivo: e.target.checked }))} />
                  IPTU Progressivo (Art.182 CF / Lei 10.257)
                </label>
              </div>
              {form.isento && (
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Motivo da Isenção</label>
                  <input value={form.motivoIsencao} onChange={e => setForm(f => ({ ...f, motivoIsencao: e.target.value }))}
                    placeholder="Lei municipal / fundamento legal" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              )}
              {form.iptuProgressivo && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ano início progressividade</label>
                  <input type="number" value={form.anoProgressivo}
                    onChange={e => setForm(f => ({ ...f, anoProgressivo: e.target.value }))}
                    placeholder={String(new Date().getFullYear())} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              )}

              {/* Preview cálculo */}
              {valorVenalTotal > 0 && !form.isento && (
                <div className="col-span-2 bg-indigo-50 rounded-xl p-4">
                  <div className="text-xs font-semibold text-indigo-700 mb-2">Prévia do cálculo IPTU</div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <div className="text-gray-500">Valor Venal Total</div>
                      <div className="font-bold text-gray-800">{fmtMoeda(valorVenalTotal)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Alíquota</div>
                      <div className="font-bold text-gray-800">{form.aliquotaIPTU}%</div>
                    </div>
                    <div>
                      <div className="text-gray-500">IPTU Anual Estimado</div>
                      <div className="font-bold text-indigo-700 text-base">{fmtMoeda(iptuPreview)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => setModalNovo(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">Cancelar</button>
              <button onClick={cadastrarImovel}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
                Cadastrar Imóvel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lançar Exercício */}
      {modalLancar && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="p-5 border-b flex justify-between">
              <h2 className="text-lg font-bold text-gray-900">Lançar IPTU — Exercício</h2>
              <button onClick={() => setModalLancar(false)} className="text-gray-400">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-orange-50 rounded-lg p-3 text-xs text-orange-700">
                ⚠ Lança IPTU para TODOS os imóveis ativos não isentos do município. Verifica duplicidade automática.
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Exercício (ano)</label>
                <input type="number" value={formLancar.exercicio}
                  onChange={e => setFormLancar(f => ({ ...f, exercicio: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Número de Parcelas</label>
                <select value={formLancar.parcelas} onChange={e => setFormLancar(f => ({ ...f, parcelas: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {[1,2,3,4,5,6,7,8,9,10,12].map(n => (
                    <option key={n} value={n}>{n}x — Venc. dia 10 de cada mês</option>
                  ))}
                </select>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                Imóveis com IPTU progressivo terão alíquota majorada automaticamente conforme anos de notificação (máx. 15% — Art.182 §4° CF)
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => setModalLancar(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">Cancelar</button>
              <button onClick={lancarExercicio}
                className="px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700">
                📋 Lançar IPTU {formLancar.exercicio}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pagar */}
      {modalPagar && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="p-5 border-b flex justify-between">
              <h2 className="text-lg font-bold text-gray-900">Pagamento IPTU {modalPagar.exercicio}</h2>
              <button onClick={() => setModalPagar(null)} className="text-gray-400">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                Saldo: <span className="font-bold text-gray-800 text-sm">{fmtMoeda(Number(modalPagar.valorSaldo))}</span>
                {modalPagar.vencido && <span className="ml-2 text-red-500">· Acréscimos por mora aplicáveis</span>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Valor Pago (R$) *</label>
                <input type="number" value={formPag.valorPago}
                  onChange={e => setFormPag(p => ({ ...p, valorPago: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Forma de Pagamento</label>
                <select value={formPag.formaPagamento} onChange={e => setFormPag(p => ({ ...p, formaPagamento: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="PIX">Pix</option>
                  <option value="BOLETO">Boleto</option>
                  <option value="DINHEIRO">Dinheiro (Caixa)</option>
                  <option value="CARTAO">Cartão</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Autenticação</label>
                <input value={formPag.autenticacao} onChange={e => setFormPag(p => ({ ...p, autenticacao: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => setModalPagar(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">Cancelar</button>
              <button onClick={registrarPagamento}
                className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700">
                💰 Registrar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
