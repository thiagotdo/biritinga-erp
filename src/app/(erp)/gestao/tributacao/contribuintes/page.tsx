'use client'
import { useState, useEffect, useCallback } from 'react'

type Contribuinte = {
  id: string; inscricaoMunicipal: string; tipoPessoa: string; situacao: string
  cpf?: string; nomeCompleto?: string
  cnpj?: string; razaoSocial?: string; nomeFantasia?: string
  cnae?: string; listaServicoLC116?: string; regimeTributario?: string
  aliquotaISS?: number; issFixoAnual?: number
  logradouro?: string; bairro?: string; email?: string; telefone?: string
  _count: { lancamentos: number; imoveis: number }
}
type LancTrib = {
  id: string; tipoLancamento: string; competencia?: string; exercicio: number
  situacao: string; valorPrincipal: number; valorTotal: number; valorPago: number; valorSaldo: number
  vencimento: string; descricao?: string; vencido?: boolean
  acrescimos?: { multa: number; juros: number; totalAtualizado: number }
}
type Kpis = {
  total: number; ativos: number; suspensos: number; baixados: number
  fisicos: number; juridicos: number
  issAberto: number; issAbertoCount: number
  dividaAtiva: number; dividaAtivaCont: number
}

const SIT_COR: Record<string, string> = {
  ATIVO:     'bg-green-100 text-green-700',
  SUSPENSO:  'bg-orange-100 text-orange-700',
  BAIXADO:   'bg-gray-100 text-gray-400',
  CANCELADO: 'bg-red-100 text-red-500',
  INAPTO:    'bg-red-100 text-red-700',
}
const LANC_COR: Record<string, string> = {
  ABERTO:     'bg-yellow-100 text-yellow-700',
  PAGO:       'bg-green-100 text-green-700',
  PARCELADO:  'bg-blue-100 text-blue-700',
  PROTESTADO: 'bg-orange-100 text-orange-700',
  AJUIZADO:   'bg-red-100 text-red-700',
  PRESCRITO:  'bg-gray-100 text-gray-400',
  CANCELADO:  'bg-gray-100 text-gray-300',
}
const LANC_ICON: Record<string, string> = {
  ISS_FIXO: '📋', ISS_VARIAVEL: '📊', ISS_RETIDO: '🔄',
  IPTU: '🏠', ITBI: '🏘', TAXA_LIMPEZA: '🧹', TAXA_OBRAS: '🔧',
  TAXA_ALVARA: '🪪', COSIP: '💡', DIVIDA_ATIVA: '⚖',
}
const REGIME_LABEL: Record<string, string> = {
  SIMPLES_NACIONAL: 'Simples', LUCRO_PRESUMIDO: 'L. Presumido',
  LUCRO_REAL: 'L. Real', MEI: 'MEI', AUTONOMO: 'Autônomo',
}

export default function ContribuintesPage() {
  const [contribuintes, setContribuintes] = useState<Contribuinte[]>([])
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [selecionado, setSelecionado] = useState<any>(null)
  const [lancamentos, setLancamentos] = useState<LancTrib[]>([])
  const [msg, setMsg] = useState('')

  // Filtros
  const [filtBusca, setFiltBusca] = useState('')
  const [filtSituacao, setFiltSituacao] = useState('')
  const [filtTipo, setFiltTipo] = useState('')

  // Modais
  const [modalNovo, setModalNovo] = useState(false)
  const [modalISS, setModalISS] = useState(false)
  const [modalPagar, setModalPagar] = useState<LancTrib | null>(null)
  const [modalParcelar, setModalParcelar] = useState<LancTrib | null>(null)

  // Forms
  const [form, setForm] = useState({
    tipoPessoa: 'JURIDICA', cpf: '', nomeCompleto: '',
    cnpj: '', razaoSocial: '', nomeFantasia: '',
    logradouro: '', numero: '', bairro: '', cep: '',
    email: '', telefone: '', responsavelNome: '',
    cnae: '', listaServicoLC116: '', regimeTributario: 'SIMPLES_NACIONAL',
    aliquotaISS: '3', issFixoAnual: '',
  })
  const [formISS, setFormISS] = useState({
    tipo: 'DES', // DES | ISS_FIXO
    competencia: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })(),
    listaServico: '', descricaoServico: '', valorServico: '', valorDeducao: '0',
    tomadorNome: '', tomadorCnpjCpf: '', retidoFonte: false, numeroNfs: '',
    // ISS Fixo
    exercicio: String(new Date().getFullYear()),
    valorAnual: '', parcelas: '12',
  })
  const [formPag, setFormPag] = useState({ valorPago: '', formaPagamento: 'PIX', autenticacao: '' })
  const [formParc, setFormParc] = useState({ parcelas: '6' })

  const carregar = useCallback(async () => {
    const params = new URLSearchParams()
    if (filtBusca)    params.set('busca',    filtBusca)
    if (filtSituacao) params.set('situacao', filtSituacao)
    if (filtTipo)     params.set('tipo',     filtTipo)

    const [r1, r2] = await Promise.all([
      fetch(`/api/tributacao/contribuinte?${params}`),
      fetch('/api/tributacao/contribuinte?relatorio=DASHBOARD'),
    ])
    const d1 = await r1.json(); const d2 = await r2.json()
    setContribuintes(d1.contribuintes ?? [])
    setKpis(d2.kpis ?? null)
  }, [filtBusca, filtSituacao, filtTipo])

  useEffect(() => { carregar() }, [carregar])

  async function abrirContribuinte(c: Contribuinte) {
    const r = await fetch(`/api/tributacao/contribuinte?id=${c.id}`)
    const d = await r.json()
    setSelecionado(d.contribuinte)
    // Busca débitos
    const r2 = await fetch(`/api/tributacao/debito?contribuinteId=${c.id}`)
    const d2 = await r2.json()
    setLancamentos(d2.lancamentos ?? [])
  }

  async function criarContribuinte() {
    const r = await fetch('/api/tributacao/contribuinte', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        aliquotaISS: parseFloat(form.aliquotaISS),
        issFixoAnual: form.issFixoAnual ? parseFloat(form.issFixoAnual) : undefined,
      }),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); setTimeout(() => setMsg(''), 5000); return }
    setMsg(`Contribuinte ${d.inscricaoMunicipal} cadastrado!`)
    setModalNovo(false)
    carregar()
    setTimeout(() => setMsg(''), 4000)
  }

  async function lancarISS() {
    if (!selecionado) return
    const r = await fetch('/api/tributacao/iss', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acao: formISS.tipo,
        contribuinteId: selecionado.id,
        competencia: formISS.competencia,
        listaServico: formISS.listaServico,
        descricaoServico: formISS.descricaoServico,
        valorServico: parseFloat(formISS.valorServico),
        valorDeducao: parseFloat(formISS.valorDeducao || '0'),
        tomadorNome: formISS.tomadorNome || undefined,
        tomadorCnpjCpf: formISS.tomadorCnpjCpf || undefined,
        retidoFonte: formISS.retidoFonte,
        numeroNfs: formISS.numeroNfs || undefined,
        // ISS Fixo
        exercicio: parseInt(formISS.exercicio),
        valorAnual: parseFloat(formISS.valorAnual),
        parcelas: parseInt(formISS.parcelas),
      }),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); setTimeout(() => setMsg(''), 5000); return }
    if (formISS.tipo === 'DES') {
      setMsg(`DES registrada - ISS: R$${Number(d.valorISS).toFixed(2)} · A recolher: R$${Number(d.issDever).toFixed(2)}`)
    } else {
      setMsg(`ISS Fixo lançado - ${d.totalParcelas} parcelas de R$${Number(d.valorParcela).toFixed(2)}`)
    }
    setModalISS(false)
    abrirContribuinte(selecionado)
    setTimeout(() => setMsg(''), 6000)
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
    setMsg(d.quitado ? '✅ Pagamento registrado - débito QUITADO!' : `💰 Pagamento registrado - Saldo restante: R$${Number(d.novoSaldo).toFixed(2)}`)
    setModalPagar(null)
    setFormPag({ valorPago: '', formaPagamento: 'PIX', autenticacao: '' })
    if (selecionado) abrirContribuinte(selecionado)
    setTimeout(() => setMsg(''), 5000)
  }

  async function parcelarDebito() {
    if (!modalParcelar) return
    const r = await fetch('/api/tributacao/debito', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'PARCELAR', lancamentoId: modalParcelar.id, parcelas: parseInt(formParc.parcelas) }),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); setTimeout(() => setMsg(''), 5000); return }
    setMsg(`Parcelamento em ${d.parcelas}x de ${fmtMoeda(d.valorParcela)}!`)
    setModalParcelar(null)
    if (selecionado) abrirContribuinte(selecionado)
    setTimeout(() => setMsg(''), 4000)
  }

  async function inscreverDivida(id: string) {
    const r = await fetch('/api/tributacao/debito', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'INSCREVER_DIVIDA', lancamentoId: id }),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); setTimeout(() => setMsg(''), 5000); return }
    setMsg(`CDA ${d.numeroCda} gerada - Dívida ativa inscrita!`)
    if (selecionado) abrirContribuinte(selecionado)
    setTimeout(() => setMsg(''), 4000)
  }

  const fmtMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtData  = (s: string)  => new Date(s).toLocaleDateString('pt-BR')
  const nomeDisplay = (c: Contribuinte) => c.tipoPessoa === 'FISICA' ? (c.nomeCompleto ?? '—') : (c.nomeFantasia ?? c.razaoSocial ?? '—')

  const totalAberto = lancamentos.filter(l => l.situacao === 'ABERTO').reduce((s, l) => s + Number(l.valorSaldo), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contribuintes - ISS Municipal</h1>
            <p className="text-sm text-gray-500 mt-0.5">LC 116/2003 · LC 157/2016 (alíquota mín. 2%) · CTN Art.121</p>
          </div>
          <button onClick={() => setModalNovo(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
            + Novo Contribuinte
          </button>
        </div>
      </div>

      {msg && <div className="mx-6 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">{msg}</div>}

      {/* KPIs */}
      {kpis && (
        <div className="px-6 py-4 grid grid-cols-5 gap-3">
          {[
            { label: 'Contribuintes Ativos', val: kpis.ativos, cor: 'text-green-700' },
            { label: 'Pessoas Físicas', val: kpis.fisicos, cor: 'text-blue-600' },
            { label: 'Pessoas Jurídicas', val: kpis.juridicos, cor: 'text-indigo-600' },
            { label: 'Suspensos', val: kpis.suspensos, cor: 'text-orange-600' },
            { label: 'Baixados', val: kpis.baixados, cor: 'text-gray-400' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className={`text-3xl font-bold ${k.cor}`}>{k.val}</div>
              <div className="text-xs text-gray-500 mt-1">{k.label}</div>
            </div>
          ))}
          <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 col-span-2">
            <div className="text-xs text-gray-500 mb-1">ISS em Aberto</div>
            <div className="text-2xl font-bold text-yellow-700">{fmtMoeda(kpis.issAberto)}</div>
            <div className="text-xs text-gray-400">{kpis.issAbertoCount} lançamentos</div>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-4 col-span-3">
            <div className="text-xs text-gray-500 mb-1">Dívida Ativa Total</div>
            <div className="text-2xl font-bold text-red-700">{fmtMoeda(kpis.dividaAtiva)}</div>
            <div className="text-xs text-gray-400">{kpis.dividaAtivaCont} CDAs inscritas</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="px-6 pb-3 flex gap-3">
        <input value={filtBusca} onChange={e => setFiltBusca(e.target.value)} placeholder="CPF, CNPJ, nome, inscrição…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 max-w-sm" />
        <select value={filtTipo} onChange={e => setFiltTipo(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todos os tipos</option>
          <option value="FISICA">Pessoa Física</option>
          <option value="JURIDICA">Pessoa Jurídica</option>
        </select>
        <select value={filtSituacao} onChange={e => setFiltSituacao(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todas situações</option>
          {Object.keys(SIT_COR).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Layout 2 colunas */}
      <div className="px-6 pb-6 grid grid-cols-5 gap-5">
        {/* Lista */}
        <div className="col-span-2 space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto">
          {contribuintes.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
              <div className="text-4xl mb-2">🧾</div>
              <div className="font-medium">Nenhum contribuinte encontrado</div>
            </div>
          )}
          {contribuintes.map(c => (
            <button key={c.id} onClick={() => abrirContribuinte(c)}
              className={`w-full text-left bg-white rounded-xl border p-4 hover:border-indigo-400 transition-all ${selecionado?.id === c.id ? 'border-indigo-500 ring-1 ring-indigo-200' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between mb-1">
                <div>
                  <span className="font-mono text-xs text-gray-400">{c.inscricaoMunicipal}</span>
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${SIT_COR[c.situacao]}`}>{c.situacao}</span>
                </div>
                <span className="text-xs text-gray-300">{c.tipoPessoa === 'FISICA' ? '👤' : '🏢'}</span>
              </div>
              <div className="font-semibold text-sm text-gray-800">{nomeDisplay(c)}</div>
              <div className="text-xs text-gray-400">{c.tipoPessoa === 'FISICA' ? c.cpf : c.cnpj}</div>
              <div className="flex justify-between items-center mt-1 text-xs">
                <div className="flex gap-2 text-gray-400">
                  {c.regimeTributario && <span className="bg-gray-50 px-1.5 py-0.5 rounded">{REGIME_LABEL[c.regimeTributario] ?? c.regimeTributario}</span>}
                  {c.listaServicoLC116 && <span className="bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">Lista {c.listaServicoLC116}</span>}
                </div>
                {c.aliquotaISS && <span className="text-indigo-600 font-medium">{Number(c.aliquotaISS).toFixed(1)}% ISS</span>}
              </div>
            </button>
          ))}
        </div>

        {/* Detalhe */}
        <div className="col-span-3">
          {!selecionado ? (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-400">
              <div className="text-6xl mb-4">🧾</div>
              <div className="text-lg font-medium">Selecione um contribuinte</div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200">
              {/* Cabeçalho */}
              <div className="p-5 border-b">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xl text-gray-900">{nomeDisplay(selecionado)}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${SIT_COR[selecionado.situacao]}`}>{selecionado.situacao}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{selecionado.inscricaoMunicipal} · {selecionado.tipoPessoa === 'FISICA' ? selecionado.cpf : selecionado.cnpj}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setModalISS(true)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100">
                      + Declarar ISS
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                  {selecionado.cnae && <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-400">CNAE </span><span className="text-gray-700">{selecionado.cnae}</span></div>}
                  {selecionado.listaServicoLC116 && <div className="bg-blue-50 rounded-lg p-2"><span className="text-gray-400">Lista LC116 </span><span className="text-blue-700">{selecionado.listaServicoLC116}</span></div>}
                  {selecionado.aliquotaISS && <div className="bg-indigo-50 rounded-lg p-2"><span className="text-gray-400">Alíquota ISS </span><span className="text-indigo-700 font-bold">{Number(selecionado.aliquotaISS).toFixed(1)}%</span></div>}
                  {selecionado.regimeTributario && <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-400">Regime </span><span className="text-gray-700">{REGIME_LABEL[selecionado.regimeTributario] ?? selecionado.regimeTributario}</span></div>}
                  {selecionado.email && <div className="bg-gray-50 rounded-lg p-2 col-span-2"><span className="text-gray-400">✉ </span><span className="text-gray-700">{selecionado.email}</span></div>}
                </div>
                {totalAberto > 0 && (
                  <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-sm text-yellow-700 font-medium">⚠ Débitos em aberto</span>
                    <span className="font-bold text-yellow-800">{fmtMoeda(totalAberto)}</span>
                  </div>
                )}
              </div>

              {/* Lançamentos */}
              <div className="p-5">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                  Lançamentos Tributários ({lancamentos.length})
                </h3>
                {lancamentos.length === 0 ? (
                  <div className="text-center text-gray-300 py-6 text-sm">Nenhum lançamento encontrado</div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {lancamentos.map(l => (
                      <div key={l.id}
                        className={`border rounded-xl p-3 ${l.vencido ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span>{LANC_ICON[l.tipoLancamento] ?? '📄'}</span>
                            <span className="font-medium text-gray-700">{l.tipoLancamento.replace('_', ' ')}</span>
                            {l.competencia && <span className="text-gray-400">{l.competencia}</span>}
                            {l.vencido && <span className="text-red-500 font-medium">VENCIDO</span>}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${LANC_COR[l.situacao]}`}>{l.situacao}</span>
                        </div>
                        <div className="flex items-end justify-between">
                          <div className="text-xs text-gray-500">
                            <span>Venc: {fmtData(l.vencimento)}</span>
                            {l.acrescimos && l.vencido && (
                              <span className="ml-2 text-red-400">+multa {fmtMoeda(l.acrescimos.multa)} +juros {fmtMoeda(l.acrescimos.juros)}</span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-800">{fmtMoeda(Number(l.valorSaldo))}</div>
                            {Number(l.valorPago) > 0 && <div className="text-xs text-green-600">Pago: {fmtMoeda(Number(l.valorPago))}</div>}
                          </div>
                        </div>
                        {l.situacao === 'ABERTO' && (
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => { setModalPagar(l); setFormPag(p => ({ ...p, valorPago: String(l.acrescimos?.totalAtualizado ?? Number(l.valorSaldo)) })) }}
                              className="px-2 py-1 rounded-lg bg-green-50 text-green-700 text-xs hover:bg-green-100">
                              💰 Pagar
                            </button>
                            {l.vencido && (
                              <>
                                <button onClick={() => setModalParcelar(l)}
                                  className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs hover:bg-blue-100">
                                  📅 Parcelar
                                </button>
                                <button onClick={() => inscreverDivida(l.id)}
                                  className="px-2 py-1 rounded-lg bg-red-50 text-red-700 text-xs hover:bg-red-100">
                                  ⚖ Dívida Ativa
                                </button>
                              </>
                            )}
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

      {/* Modal Novo Contribuinte */}
      {modalNovo && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-8 overflow-y-auto pb-10">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4">
            <div className="p-5 border-b flex justify-between">
              <h2 className="text-lg font-bold text-gray-900">Novo Contribuinte ISS</h2>
              <button onClick={() => setModalNovo(false)} className="text-gray-400">✕</button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Pessoa</label>
                <div className="flex gap-3">
                  {['JURIDICA', 'FISICA'].map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, tipoPessoa: t }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${form.tipoPessoa === t ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-300 text-gray-600'}`}>
                      {t === 'FISICA' ? '👤 Pessoa Física' : '🏢 Pessoa Jurídica'}
                    </button>
                  ))}
                </div>
              </div>
              {form.tipoPessoa === 'FISICA' ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">CPF *</label>
                    <input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nome Completo *</label>
                    <input value={form.nomeCompleto} onChange={e => setForm(f => ({ ...f, nomeCompleto: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">CNPJ *</label>
                    <input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0000-00"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Razão Social *</label>
                    <input value={form.razaoSocial} onChange={e => setForm(f => ({ ...f, razaoSocial: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nome Fantasia</label>
                    <input value={form.nomeFantasia} onChange={e => setForm(f => ({ ...f, nomeFantasia: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Regime Tributário</label>
                    <select value={form.regimeTributario} onChange={e => setForm(f => ({ ...f, regimeTributario: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="SIMPLES_NACIONAL">Simples Nacional</option>
                      <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
                      <option value="LUCRO_REAL">Lucro Real</option>
                      <option value="MEI">MEI</option>
                      <option value="AUTONOMO">Autônomo</option>
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Lista Serviço LC 116</label>
                <input value={form.listaServicoLC116} onChange={e => setForm(f => ({ ...f, listaServicoLC116: e.target.value }))}
                  placeholder="ex: 7.09, 17.06"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">CNAE Principal</label>
                <input value={form.cnae} onChange={e => setForm(f => ({ ...f, cnae: e.target.value }))}
                  placeholder="0000-0/00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Alíquota ISS (2% a 5%)</label>
                <input type="number" min="2" max="5" step="0.5" value={form.aliquotaISS}
                  onChange={e => setForm(f => ({ ...f, aliquotaISS: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ISS Fixo Anual (autônomo)</label>
                <input type="number" value={form.issFixoAnual} onChange={e => setForm(f => ({ ...f, issFixoAnual: e.target.value }))}
                  placeholder="Deixe em branco se não for ISS fixo"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
                <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
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
            </div>
            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => setModalNovo(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">Cancelar</button>
              <button onClick={criarContribuinte}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
                Cadastrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Declarar ISS */}
      {modalISS && selecionado && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-8 overflow-y-auto pb-10">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="p-5 border-b flex justify-between">
              <h2 className="text-lg font-bold text-gray-900">Declarar ISS - {selecionado.nomeFantasia ?? selecionado.razaoSocial ?? selecionado.nomeCompleto}</h2>
              <button onClick={() => setModalISS(false)} className="text-gray-400">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex gap-3">
                {['DES', 'ISS_FIXO'].map(t => (
                  <button key={t} onClick={() => setFormISS(f => ({ ...f, tipo: t }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${formISS.tipo === t ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-300 text-gray-600'}`}>
                    {t === 'DES' ? '📊 Declaração de Serviço' : '📋 ISS Fixo Anual'}
                  </button>
                ))}
              </div>
              {formISS.tipo === 'DES' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Competência *</label>
                      <input type="month" value={formISS.competencia}
                        onChange={e => setFormISS(f => ({ ...f, competencia: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nº NFS-e</label>
                      <input value={formISS.numeroNfs} onChange={e => setFormISS(f => ({ ...f, numeroNfs: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Lista de Serviço (LC 116) *</label>
                      <input value={formISS.listaServico} onChange={e => setFormISS(f => ({ ...f, listaServico: e.target.value }))}
                        placeholder="ex: 7.09" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Valor do Serviço (R$) *</label>
                      <input type="number" value={formISS.valorServico}
                        onChange={e => setFormISS(f => ({ ...f, valorServico: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Deduções (R$)</label>
                      <input type="number" value={formISS.valorDeducao}
                        onChange={e => setFormISS(f => ({ ...f, valorDeducao: e.target.value }))}
                        placeholder="0,00" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Tomador</label>
                      <input value={formISS.tomadorNome} onChange={e => setFormISS(f => ({ ...f, tomadorNome: e.target.value }))}
                        placeholder="Razão Social do tomador" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={formISS.retidoFonte}
                      onChange={e => setFormISS(f => ({ ...f, retidoFonte: e.target.checked }))} />
                    ISS retido na fonte pelo tomador (LC 116 Art.6)
                  </label>
                  {formISS.valorServico && selecionado.aliquotaISS && (
                    <div className="bg-indigo-50 rounded-lg p-3 text-xs text-indigo-700">
                      ISS estimado: {fmtMoeda(((parseFloat(formISS.valorServico) - parseFloat(formISS.valorDeducao || '0')) * Number(selecionado.aliquotaISS) / 100))} ({Number(selecionado.aliquotaISS).toFixed(1)}%)
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Exercício *</label>
                      <input type="number" value={formISS.exercicio}
                        onChange={e => setFormISS(f => ({ ...f, exercicio: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Valor Anual (R$) *</label>
                      <input type="number" value={formISS.valorAnual}
                        onChange={e => setFormISS(f => ({ ...f, valorAnual: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Parcelas</label>
                      <select value={formISS.parcelas} onChange={e => setFormISS(f => ({ ...f, parcelas: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        {[1,2,3,4,6,12].map(n => <option key={n} value={n}>{n}x</option>)}
                      </select>
                    </div>
                  </div>
                  {formISS.valorAnual && (
                    <div className="bg-indigo-50 rounded-lg p-3 text-xs text-indigo-700">
                      {formISS.parcelas}x de {fmtMoeda(parseFloat(formISS.valorAnual) / parseInt(formISS.parcelas))} · Venc. dia 20 de cada mês
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => setModalISS(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">Cancelar</button>
              <button onClick={lancarISS}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
                Declarar
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
              <h2 className="text-lg font-bold text-gray-900">Registrar Pagamento</h2>
              <button onClick={() => setModalPagar(null)} className="text-gray-400">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                <div>{modalPagar.tipoLancamento} · {modalPagar.competencia ?? modalPagar.exercicio}</div>
                <div className="font-bold text-base text-gray-800 mt-1">{fmtMoeda(Number(modalPagar.valorSaldo))}</div>
                {modalPagar.acrescimos && modalPagar.vencido && (
                  <div className="text-red-500 mt-1">Total atualizado: {fmtMoeda(modalPagar.acrescimos.totalAtualizado)}</div>
                )}
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Autenticação / Txid</label>
                <input value={formPag.autenticacao} onChange={e => setFormPag(p => ({ ...p, autenticacao: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => setModalPagar(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">Cancelar</button>
              <button onClick={registrarPagamento}
                className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700">
                💰 Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Parcelar */}
      {modalParcelar && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="p-5 border-b flex justify-between">
              <h2 className="text-lg font-bold text-gray-900">Parcelamento de Débito</h2>
              <button onClick={() => setModalParcelar(null)} className="text-gray-400">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-yellow-50 rounded-lg p-3 text-xs text-yellow-700">
                Saldo: {fmtMoeda(Number(modalParcelar.valorSaldo))} · Acréscimos serão consolidados
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Número de Parcelas</label>
                <select value={formParc.parcelas} onChange={e => setFormParc(p => ({ ...p, parcelas: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {[2,3,4,6,10,12,18,24,36,48,60].map(n => (
                    <option key={n} value={n}>{n}x ≈ {fmtMoeda(Number(modalParcelar.valorSaldo) / n)}/mês</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => setModalParcelar(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">Cancelar</button>
              <button onClick={parcelarDebito}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
                📅 Confirmar Parcelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
