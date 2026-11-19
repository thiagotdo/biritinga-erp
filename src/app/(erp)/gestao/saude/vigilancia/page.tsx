'use client'

import { useState, useEffect, useCallback } from 'react'

interface EstabVigilancia {
  id: string
  codigo: string
  razaoSocial: string
  nomeFantasia?: string
  cnpj?: string
  tipoAtividade: string
  bairro?: string
  situacaoLicenca: string
  dataVencLic?: string
  grauRisco?: string
  vencendoBreve: boolean
  _count: { vistorias: number; infrações: number }
  vistorias?: Vistoria[]
  infrações?: AutoInfracao[]
}

interface Vistoria {
  id: string
  numero: string
  tipo: string
  dataVistoria: string
  resultado: string
  observacoes?: string
  autuadorNome?: string
}

interface AutoInfracao {
  id: string
  numero: string
  descricaoInfracao: string
  dispositivoLegal?: string
  valorMulta?: number
  prazoDefesa?: string
  situacao: string
  decisaoDefesa?: string
}

const SIT_COR: Record<string, string> = {
  VIGENTE: 'bg-green-100 text-green-800',
  VENCIDA: 'bg-red-100 text-red-800',
  SUSPENSA: 'bg-orange-100 text-orange-800',
  CASSADA: 'bg-gray-200 text-gray-700',
  PENDENTE_RENOVACAO: 'bg-yellow-100 text-yellow-800',
}

const RESULTADO_COR: Record<string, string> = {
  APROVADO: 'bg-green-100 text-green-800',
  APROVADO_COM_RESSALVAS: 'bg-yellow-100 text-yellow-800',
  REPROVADO: 'bg-red-100 text-red-800',
  INTERDITADO: 'bg-red-200 text-red-900',
}

const RISCO_COR: Record<string, string> = {
  BAIXO: 'bg-green-50 text-green-700',
  MEDIO: 'bg-yellow-50 text-yellow-700',
  ALTO: 'bg-orange-50 text-orange-700',
  CRITICO: 'bg-red-50 text-red-700',
}

const TIPO_ATIV_LABEL: Record<string, string> = {
  ALIMENTO: '🍔 Alimentos',
  FARMACIA_DROGARIA: '💊 Farmácia/Drogaria',
  SAUDE_SERVICOS: '🏥 Serviços de Saúde',
  COSMETICOS: '💄 Cosméticos',
  SANEANTE: '🧴 Saneantes',
  LABORATORIO: '🔬 Laboratório',
  HOSPITAL_CLINICA: '🏨 Hospital/Clínica',
  VETERINARIA: '🐾 Veterinária',
  TATUAGEM_PIERCING: '💉 Tatuagem/Piercing',
  OUTROS: '📋 Outros',
}

const fmtD = (s?: string) => s ? new Date(s).toLocaleDateString('pt-BR') : '—'
const fmtMoeda = (v?: number) => v ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'

export default function VigilanciaPage() {
  const [estabs, setEstabs] = useState<EstabVigilancia[]>([])
  const [kpis, setKpis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selecionado, setSelecionado] = useState<EstabVigilancia | null>(null)
  const [abaDetalhe, setAbaDetalhe] = useState<'dados' | 'vistorias' | 'infracoes'>('dados')

  const [filtro, setFiltro] = useState({ busca: '', situacao: '', tipo: '' })

  const [modalNovo, setModalNovo] = useState(false)
  const [modalVistoria, setModalVistoria] = useState(false)
  const [modalAI, setModalAI] = useState(false)
  const [modalRenovar, setModalRenovar] = useState(false)
  const [form, setForm] = useState<any>({})
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [resEstabs, resKpis] = await Promise.all([
        fetch(`/api/saude/vigilancia?situacao=${filtro.situacao}&tipo=${filtro.tipo}`),
        fetch('/api/saude/vigilancia?relatorio=DASHBOARD'),
      ])
      const dEstabs = await resEstabs.json()
      const dKpis = await resKpis.json()
      setEstabs(dEstabs.estabelecimentos ?? [])
      setKpis(dKpis.kpis)
    } finally { setLoading(false) }
  }, [filtro.situacao, filtro.tipo])

  useEffect(() => { carregar() }, [carregar])

  const carregarDetalhe = async (id: string) => {
    const r = await fetch(`/api/saude/vigilancia?id=${id}`)
    const d = await r.json()
    setSelecionado(d.estabelecimento)
    setAbaDetalhe('dados')
  }

  const salvarEstab = async () => {
    setSalvando(true); setErro('')
    try {
      const r = await fetch('/api/saude/vigilancia', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) { setErro(d.erro?.fieldErrors ? JSON.stringify(d.erro.fieldErrors) : d.erro); return }
      setModalNovo(false); setForm({})
      carregar()
    } finally { setSalvando(false) }
  }

  const salvarVistoria = async () => {
    if (!selecionado) return
    setSalvando(true); setErro('')
    try {
      const r = await fetch('/api/saude/vigilancia', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _recurso: 'VISTORIA', estabelecimentoId: selecionado.id, ...form }),
      })
      const d = await r.json()
      if (!r.ok) { setErro(d.erro?.fieldErrors ? JSON.stringify(d.erro.fieldErrors) : d.erro); return }
      setModalVistoria(false); setForm({})
      carregar()
      carregarDetalhe(selecionado.id)
    } finally { setSalvando(false) }
  }

  const salvarAI = async () => {
    if (!selecionado) return
    setSalvando(true); setErro('')
    try {
      const r = await fetch('/api/saude/vigilancia', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _recurso: 'AUTO_INFRACAO', estabelecimentoId: selecionado.id, ...form }),
      })
      const d = await r.json()
      if (!r.ok) { setErro(d.erro?.fieldErrors ? JSON.stringify(d.erro.fieldErrors) : d.erro); return }
      setModalAI(false); setForm({})
      carregar()
      carregarDetalhe(selecionado.id)
    } finally { setSalvando(false) }
  }

  const renovarLicenca = async () => {
    if (!selecionado) return
    setSalvando(true)
    try {
      await fetch('/api/saude/vigilancia', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selecionado.id, acao: 'RENOVAR_LICENCA', novaVigencia: form.novaVigencia }),
      })
      setModalRenovar(false); setForm({})
      carregar()
      carregarDetalhe(selecionado.id)
    } finally { setSalvando(false) }
  }

  const estabsFiltrados = estabs.filter(e => {
    const termo = filtro.busca.toLowerCase()
    return !termo || e.razaoSocial.toLowerCase().includes(termo) || e.nomeFantasia?.toLowerCase().includes(termo) || e.cnpj?.includes(termo)
  })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center"><div className="text-4xl mb-2">🛡️</div><p className="text-gray-500">Carregando vigilância sanitária...</p></div>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vigilância Sanitária</h1>
          <p className="text-sm text-gray-500 mt-0.5">Fiscalização, licenças e autos de infração — Lei 9.782/1999</p>
        </div>
        <button onClick={() => { setForm({}); setModalNovo(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium">
          + Cadastrar Estabelecimento
        </button>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: 'Vigentes', valor: kpis.vigentes, icon: '✅', cor: 'green' },
            { label: 'Vencidas', valor: kpis.vencidas, icon: '🔴', cor: 'red' },
            { label: 'Pendentes', valor: kpis.pendentes, icon: '⏳', cor: 'yellow' },
            { label: 'Suspensas', valor: kpis.suspensas, icon: '🚫', cor: 'orange' },
            { label: 'Venc. em 30d', valor: kpis.vencendoBreve, icon: '⚠️', cor: 'amber' },
            { label: 'Infrações/ano', valor: kpis.infracoesAno, icon: '📋', cor: 'gray' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm text-center">
              <div className="text-xl mb-1">{k.icon}</div>
              <div className="text-xl font-bold text-gray-900">{k.valor}</div>
              <div className="text-xs text-gray-500">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Vistorias do ano (mini stats) */}
      {kpis && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-sm font-semibold text-gray-600 mb-3">Vistorias no ano</div>
          <div className="flex gap-6 flex-wrap">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{kpis.vistoriasAno}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-700">{kpis.aprovados}</div>
              <div className="text-xs text-gray-500">Aprovados</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-700">{kpis.reprovados}</div>
              <div className="text-xs text-gray-500">Reprovados</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-700">{kpis.interditados}</div>
              <div className="text-xs text-gray-500">Interditados</div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <input placeholder="Buscar por nome, CNPJ..."
          value={filtro.busca} onChange={e => setFiltro(p => ({ ...p, busca: e.target.value }))}
          className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
        <select value={filtro.situacao} onChange={e => setFiltro(p => ({ ...p, situacao: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none">
          <option value="">Todas situações</option>
          <option value="VIGENTE">Vigente</option>
          <option value="VENCIDA">Vencida</option>
          <option value="PENDENTE_RENOVACAO">Pendente Renovação</option>
          <option value="SUSPENSA">Suspensa</option>
          <option value="CASSADA">Cassada</option>
        </select>
        <select value={filtro.tipo} onChange={e => setFiltro(p => ({ ...p, tipo: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none">
          <option value="">Todos tipos</option>
          {Object.entries(TIPO_ATIV_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">{estabsFiltrados.length} estabelecimento{estabsFiltrados.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {estabsFiltrados.length === 0 ? (
              <p className="text-center text-gray-400 py-12">Nenhum estabelecimento encontrado</p>
            ) : estabsFiltrados.map(e => (
              <div key={e.id} onClick={() => carregarDetalhe(e.id)}
                className={`flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${selecionado?.id === e.id ? 'bg-teal-50' : ''}`}>
                <div className="text-2xl">{TIPO_ATIV_LABEL[e.tipoAtividade]?.split(' ')[0] ?? '📋'}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate flex items-center gap-2">
                    {e.nomeFantasia ?? e.razaoSocial}
                    {e.vencendoBreve && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Vence em breve</span>}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{e.razaoSocial} {e.cnpj ? `· ${e.cnpj}` : ''}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-3 mt-0.5">
                    {e.bairro && <span>{e.bairro}</span>}
                    {e.grauRisco && <span className={`px-1.5 py-0.5 rounded text-xs ${RISCO_COR[e.grauRisco] ?? ''}`}>Risco {e.grauRisco}</span>}
                    <span>🔎 {e._count.vistorias} vistorias</span>
                    {e._count.infrações > 0 && <span className="text-red-500">⚠ {e._count.infrações} AI</span>}
                    {e.dataVencLic && <span>Venc.: {fmtD(e.dataVencLic)}</span>}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${SIT_COR[e.situacaoLicenca] ?? 'bg-gray-100'}`}>
                  {e.situacaoLicenca.replace(/_/g,' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Detalhe */}
        <div>
          {selecionado ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              {/* Cabeçalho */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-mono text-gray-400">{selecionado.codigo}</span>
                    <h3 className="font-semibold text-gray-900 mt-0.5">{selecionado.nomeFantasia ?? selecionado.razaoSocial}</h3>
                    {selecionado.nomeFantasia && <p className="text-xs text-gray-500">{selecionado.razaoSocial}</p>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${SIT_COR[selecionado.situacaoLicenca] ?? 'bg-gray-100'}`}>
                    {selecionado.situacaoLicenca.replace(/_/g,' ')}
                  </span>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button onClick={() => { setForm({ tipo: 'ROTINA', resultado: 'APROVADO', dataVistoria: new Date().toISOString().slice(0,10) }); setModalVistoria(true) }}
                    className="flex-1 text-xs px-2 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium">🔎 Vistoria</button>
                  <button onClick={() => { setForm({ prazoDefesa: new Date(Date.now() + 15*24*60*60*1000).toISOString().slice(0,10) }); setModalAI(true) }}
                    className="flex-1 text-xs px-2 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium">📋 Auto</button>
                  <button onClick={() => { setForm({}); setModalRenovar(true) }}
                    className="flex-1 text-xs px-2 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium">🔄 Renovar</button>
                </div>
              </div>

              {/* Abas */}
              <div className="flex border-b border-gray-100">
                {(['dados','vistorias','infracoes'] as const).map(aba => (
                  <button key={aba} onClick={() => setAbaDetalhe(aba)}
                    className={`flex-1 text-xs py-2 font-medium transition-colors ${abaDetalhe === aba ? 'text-teal-700 border-b-2 border-teal-600' : 'text-gray-400 hover:text-gray-600'}`}>
                    {aba === 'dados' ? 'Dados' : aba === 'vistorias' ? `Vistorias (${selecionado.vistorias?.length ?? 0})` : `Infrações (${selecionado.infrações?.length ?? 0})`}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {/* Aba: Dados */}
                {abaDetalhe === 'dados' && (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-gray-400">Tipo:</span> <span className="font-medium">{TIPO_ATIV_LABEL[selecionado.tipoAtividade] ?? selecionado.tipoAtividade}</span></div>
                      <div><span className="text-gray-400">Grau Risco:</span> <span className={`font-medium px-1.5 rounded ${RISCO_COR[selecionado.grauRisco ?? ''] ?? ''}`}>{selecionado.grauRisco ?? '—'}</span></div>
                      {selecionado.cnpj && <div className="col-span-2"><span className="text-gray-400">CNPJ:</span> <span className="font-medium font-mono">{selecionado.cnpj}</span></div>}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="font-semibold text-gray-600">Licença Sanitária</div>
                      {(selecionado as any).numeroLicenca && <div><span className="text-gray-400">Nº:</span> <span className="font-medium font-mono">{(selecionado as any).numeroLicenca}</span></div>}
                      <div><span className="text-gray-400">Emissão:</span> <span className="font-medium">{fmtD((selecionado as any).dataEmissaoLic)}</span></div>
                      <div><span className="text-gray-400">Validade:</span> <span className={`font-medium ${selecionado.situacaoLicenca === 'VENCIDA' ? 'text-red-600' : ''}`}>{fmtD(selecionado.dataVencLic)}</span></div>
                    </div>
                    {(selecionado as any).responsavelTecnico && (
                      <div><span className="text-gray-400">Resp. Técnico:</span> <span className="font-medium">{(selecionado as any).responsavelTecnico}</span></div>
                    )}
                    {selecionado.bairro && (
                      <div><span className="text-gray-400">Localização:</span> <span className="font-medium">{selecionado.bairro}</span></div>
                    )}
                  </div>
                )}

                {/* Aba: Vistorias */}
                {abaDetalhe === 'vistorias' && (
                  <div className="space-y-2">
                    {!selecionado.vistorias?.length ? (
                      <p className="text-xs text-gray-400 text-center py-4">Nenhuma vistoria registrada</p>
                    ) : selecionado.vistorias.map(v => (
                      <div key={v.id} className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                        <div className="flex justify-between items-start">
                          <span className="font-mono text-gray-500">{v.numero}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RESULTADO_COR[v.resultado] ?? 'bg-gray-100'}`}>
                            {v.resultado.replace(/_/g,' ')}
                          </span>
                        </div>
                        <div className="text-gray-600">{fmtD(v.dataVistoria)} · {v.tipo.replace(/_/g,' ')}</div>
                        {v.autuadorNome && <div className="text-gray-500">Por: {v.autuadorNome}</div>}
                        {v.observacoes && <div className="text-gray-500 italic">"{v.observacoes}"</div>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Aba: Infrações */}
                {abaDetalhe === 'infracoes' && (
                  <div className="space-y-2">
                    {!selecionado.infrações?.length ? (
                      <p className="text-xs text-gray-400 text-center py-4">Nenhum auto de infração</p>
                    ) : selecionado.infrações.map(ai => (
                      <div key={ai.id} className="bg-red-50 rounded-lg p-3 text-xs space-y-1 border border-red-100">
                        <div className="flex justify-between">
                          <span className="font-mono text-red-700 font-semibold">{ai.numero}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${ai.situacao === 'JULGADO' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'}`}>
                            {ai.situacao}
                          </span>
                        </div>
                        <p className="text-gray-700">{ai.descricaoInfracao}</p>
                        {ai.dispositivoLegal && <div className="text-gray-500">Base: {ai.dispositivoLegal}</div>}
                        {ai.valorMulta && <div className="font-medium text-red-700">Multa: {fmtMoeda(ai.valorMulta)}</div>}
                        {ai.prazoDefesa && <div className="text-gray-500">Prazo defesa: {fmtD(ai.prazoDefesa)}</div>}
                        {ai.decisaoDefesa && <div className="text-gray-600 mt-1">Decisão: {ai.decisaoDefesa}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
              <div className="text-4xl mb-2">🛡️</div>
              <p className="text-gray-400 text-sm">Selecione um estabelecimento para ver detalhes</p>
            </div>
          )}
        </div>
      </div>

      {/* ══ MODAL: Cadastrar Estabelecimento ══════════════════════════════════════ */}
      {modalNovo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Cadastrar Estabelecimento</h2>
              <button onClick={() => setModalNovo(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {erro && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{erro}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Razão Social *</label>
                  <input value={form.razaoSocial ?? ''} onChange={e => setForm((p: any) => ({ ...p, razaoSocial: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nome Fantasia</label>
                  <input value={form.nomeFantasia ?? ''} onChange={e => setForm((p: any) => ({ ...p, nomeFantasia: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">CNPJ</label>
                  <input value={form.cnpj ?? ''} onChange={e => setForm((p: any) => ({ ...p, cnpj: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="00.000.000/0000-00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Atividade *</label>
                  <select value={form.tipoAtividade ?? ''} onChange={e => setForm((p: any) => ({ ...p, tipoAtividade: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                    <option value="">Selecione</option>
                    {Object.entries(TIPO_ATIV_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Grau de Risco</label>
                  <select value={form.grauRisco ?? ''} onChange={e => setForm((p: any) => ({ ...p, grauRisco: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                    <option value="">Não definido</option>
                    <option value="BAIXO">Baixo</option>
                    <option value="MEDIO">Médio</option>
                    <option value="ALTO">Alto</option>
                    <option value="CRITICO">Crítico</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Bairro</label>
                  <input value={form.bairro ?? ''} onChange={e => setForm((p: any) => ({ ...p, bairro: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Responsável Técnico</label>
                  <input value={form.responsavelTecnico ?? ''} onChange={e => setForm((p: any) => ({ ...p, responsavelTecnico: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nº Licença Sanitária</label>
                  <input value={form.numeroLicenca ?? ''} onChange={e => setForm((p: any) => ({ ...p, numeroLicenca: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Data Emissão Licença</label>
                  <input type="date" value={form.dataEmissaoLic ?? ''} onChange={e => setForm((p: any) => ({ ...p, dataEmissaoLic: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Validade Licença</label>
                  <input type="date" value={form.dataVencLic ?? ''} onChange={e => setForm((p: any) => ({ ...p, dataVencLic: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Telefone</label>
                  <input value={form.telefone ?? ''} onChange={e => setForm((p: any) => ({ ...p, telefone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
              </div>
              <p className="text-xs text-gray-400">A situação da licença será determinada automaticamente com base na validade informada.</p>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setModalNovo(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={salvarEstab} disabled={salvando || !form.razaoSocial || !form.tipoAtividade}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50">
                {salvando ? 'Salvando...' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Registrar Vistoria ══════════════════════════════════════════════ */}
      {modalVistoria && selecionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">🔎 Registrar Vistoria</h2>
              <button onClick={() => setModalVistoria(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {erro && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{erro}</div>}
              <p className="text-sm text-gray-600">Estabelecimento: <span className="font-medium">{selecionado.nomeFantasia ?? selecionado.razaoSocial}</span></p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Vistoria</label>
                  <select value={form.tipo ?? 'ROTINA'} onChange={e => setForm((p: any) => ({ ...p, tipo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="ROTINA">Rotina</option>
                    <option value="DENUNCIA">Denúncia</option>
                    <option value="RENOVACAO_LICENCA">Renovação de Licença</option>
                    <option value="ESPECIAL">Especial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Data da Vistoria *</label>
                  <input type="date" value={form.dataVistoria ?? ''} onChange={e => setForm((p: any) => ({ ...p, dataVistoria: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Resultado *</label>
                <select value={form.resultado ?? 'APROVADO'} onChange={e => setForm((p: any) => ({ ...p, resultado: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="APROVADO">Aprovado</option>
                  <option value="APROVADO_COM_RESSALVAS">Aprovado com Ressalvas</option>
                  <option value="REPROVADO">Reprovado</option>
                  <option value="INTERDITADO">Interditado ⚠️</option>
                </select>
                {form.resultado === 'INTERDITADO' && (
                  <p className="text-xs text-orange-600 mt-1">⚠ A licença será automaticamente suspensa ao registrar interdição.</p>
                )}
                {form.tipo === 'RENOVACAO_LICENCA' && form.resultado === 'APROVADO' && (
                  <p className="text-xs text-green-600 mt-1">✅ A licença será renovada automaticamente por 1 ano.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Fiscal Responsável</label>
                <input value={form.autuadorNome ?? ''} onChange={e => setForm((p: any) => ({ ...p, autuadorNome: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Observações / Laudo</label>
                <textarea value={form.observacoes ?? ''} onChange={e => setForm((p: any) => ({ ...p, observacoes: e.target.value }))}
                  rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              {form.resultado === 'REPROVADO' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Prazo para Correção</label>
                  <input type="date" value={form.prazoCorrecao ?? ''} onChange={e => setForm((p: any) => ({ ...p, prazoCorrecao: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setModalVistoria(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={salvarVistoria} disabled={salvando || !form.dataVistoria || !form.resultado}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {salvando ? 'Salvando...' : '🔎 Registrar Vistoria'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Auto de Infração ════════════════════════════════════════════════ */}
      {modalAI && selecionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">📋 Lavrar Auto de Infração</h2>
              <button onClick={() => setModalAI(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {erro && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{erro}</div>}
              <p className="text-sm text-gray-600">Estabelecimento: <span className="font-medium">{selecionado.nomeFantasia ?? selecionado.razaoSocial}</span></p>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Descrição da Infração *</label>
                <textarea value={form.descricaoInfracao ?? ''} onChange={e => setForm((p: any) => ({ ...p, descricaoInfracao: e.target.value }))}
                  rows={4} placeholder="Descreva detalhadamente a infração observada..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Dispositivo Legal Infringido</label>
                <input value={form.dispositivoLegal ?? ''} onChange={e => setForm((p: any) => ({ ...p, dispositivoLegal: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="Ex: Lei 9.782/1999, Art. 7º, inciso III" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Valor da Multa (R$)</label>
                  <input type="number" value={form.valorMulta ?? ''} onChange={e => setForm((p: any) => ({ ...p, valorMulta: e.target.value ? Number(e.target.value) : undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none" placeholder="0,00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Prazo para Defesa</label>
                  <input type="date" value={form.prazoDefesa ?? ''} onChange={e => setForm((p: any) => ({ ...p, prazoDefesa: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setModalAI(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={salvarAI} disabled={salvando || !form.descricaoInfracao || form.descricaoInfracao.length < 10}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                {salvando ? 'Lavrando...' : '📋 Lavrar Auto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Renovar Licença ═════════════════════════════════════════════════ */}
      {modalRenovar && selecionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">🔄 Renovar Licença</h2>
              <button onClick={() => setModalRenovar(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">{selecionado.nomeFantasia ?? selecionado.razaoSocial}</p>
              <p className="text-xs text-gray-500">Situação atual: <span className={`font-medium px-2 py-0.5 rounded-full ${SIT_COR[selecionado.situacaoLicenca] ?? ''}`}>{selecionado.situacaoLicenca}</span></p>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nova Validade (padrão: +1 ano)</label>
                <input type="date" value={form.novaVigencia ?? ''} onChange={e => setForm((p: any) => ({ ...p, novaVigencia: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setModalRenovar(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={renovarLicenca} disabled={salvando}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                {salvando ? 'Renovando...' : '✅ Renovar Licença'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
