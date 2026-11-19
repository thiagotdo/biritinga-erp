'use client'
import { useState, useEffect, useCallback } from 'react'

interface ItemEstoque {
  id: string; principioAtivo: string; nomeComercial?: string
  apresentacao: string; controlado: boolean; tarja: string
  quantidadeAtual: number; quantidadeMinima: number; unidadeMedida: string
  lote?: string; dataValidade?: string; situacao: string
  unidade: { nome: string }
  alertas: { abaixoMinimo: boolean; aVencer: boolean; vencido: boolean }
  movimentacoes?: any[]
}

interface KPIs {
  totalItens: number; emFalta: number; aVencer: number; controlados: number; abaixoMinimo: number
}

const TARJA: Record<string, { label: string; cor: string }> = {
  BRANCA:   { label: 'Tarja Branca',   cor: 'bg-gray-100 text-gray-700' },
  VERMELHA: { label: 'Tarja Vermelha', cor: 'bg-red-100 text-red-700' },
  PRETA:    { label: 'Tarja Preta',    cor: 'bg-gray-800 text-white' },
}

function DATA(s?: string) {
  return s ? new Date(s).toLocaleDateString('pt-BR') : '—'
}

function diasParaVencer(s?: string) {
  if (!s) return null
  const diff = new Date(s).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

// ─── Modal Dispensar ─────────────────────────────────────────────────────────
function ModalDispensar({ item, onClose, onSalvo }: { item: ItemEstoque; onClose: () => void; onSalvo: () => void }) {
  const [form, setForm] = useState({ quantidade: '1', pacienteNome: '', pacienteCpf: '', observacao: '' })
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function dispensar() {
    setErro(''); setCarregando(true)
    try {
      const r = await fetch('/api/saude/farmacia', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, acao: 'DISPENSAR', ...form, quantidade: Number(form.quantidade) }),
      })
      const j = await r.json()
      if (!r.ok) { setErro(j.erro || 'Erro'); return }
      onSalvo()
    } finally { setCarregando(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="p-6 border-b">
          <h2 className="font-semibold text-lg">Dispensar Medicamento</h2>
          <p className="text-sm text-gray-500 mt-1">{item.principioAtivo} {item.apresentacao}</p>
          <p className="text-xs text-gray-400">Estoque: {item.quantidadeAtual} {item.unidadeMedida}</p>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade *</label>
            <input type="number" min="1" max={item.quantidadeAtual}
              value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm font-semibold" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome do Paciente</label>
            <input value={form.pacienteNome} onChange={e => setForm(f => ({ ...f, pacienteNome: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">CPF do Paciente</label>
            <input value={form.pacienteCpf} onChange={e => setForm(f => ({ ...f, pacienteCpf: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observação</label>
            <input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          {erro && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{erro}</div>}
        </div>
        <div className="p-6 border-t flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
          <button onClick={dispensar} disabled={carregando || !form.quantidade || Number(form.quantidade) < 1}
            className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {carregando ? 'Dispensando…' : 'Confirmar Dispensação'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Entrada ────────────────────────────────────────────────────────────
function ModalEntrada({ item, onClose, onSalvo }: { item: ItemEstoque; onClose: () => void; onSalvo: () => void }) {
  const [form, setForm] = useState({ quantidade: '', lote: '', dataValidade: '', fornecedor: '', observacao: '' })
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function entrar() {
    setErro(''); setCarregando(true)
    try {
      const r = await fetch('/api/saude/farmacia', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, acao: 'ENTRADA', quantidade: Number(form.quantidade), lote: form.lote || undefined, dataValidade: form.dataValidade || undefined, fornecedor: form.fornecedor || undefined, observacao: form.observacao || undefined }),
      })
      const j = await r.json()
      if (!r.ok) { setErro(j.erro || 'Erro'); return }
      onSalvo()
    } finally { setCarregando(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="p-6 border-b"><h2 className="font-semibold text-lg">Registrar Entrada</h2>
          <p className="text-sm text-gray-500">{item.principioAtivo}</p></div>
        <div className="p-6 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade *</label>
            <input type="number" min="1" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm font-semibold" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Lote</label>
              <input value={form.lote} onChange={e => setForm(f => ({ ...f, lote: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Validade</label>
              <input type="date" value={form.dataValidade} onChange={e => setForm(f => ({ ...f, dataValidade: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fornecedor</label>
            <input value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          {erro && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{erro}</div>}
        </div>
        <div className="p-6 border-t flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
          <button onClick={entrar} disabled={carregando || !form.quantidade}
            className="px-6 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            {carregando ? 'Salvando…' : 'Confirmar Entrada'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Cadastro ───────────────────────────────────────────────────────────
function ModalCadastro({ unidades, onClose, onSalvo }: { unidades: any[]; onClose: () => void; onSalvo: () => void }) {
  const [form, setForm] = useState({
    unidadeId: '', principioAtivo: '', nomeComercial: '', apresentacao: '',
    controlado: false, tarja: 'BRANCA', quantidadeAtual: '0', quantidadeMinima: '10',
    unidadeMedida: 'UNIDADE', lote: '', dataValidade: '', fornecedor: '',
  })
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar() {
    setErro(''); setCarregando(true)
    try {
      const r = await fetch('/api/saude/farmacia', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, quantidadeAtual: Number(form.quantidadeAtual), quantidadeMinima: Number(form.quantidadeMinima) }),
      })
      const j = await r.json()
      if (!r.ok) { setErro(j.erro?.formErrors?.[0] || j.erro || 'Erro'); return }
      onSalvo()
    } finally { setCarregando(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b"><h2 className="font-semibold text-lg">Cadastrar Medicamento</h2></div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Unidade *</label>
            <select value={form.unidadeId} onChange={e => setForm(f => ({ ...f, unidadeId: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Selecione...</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Princípio Ativo *</label>
              <input value={form.principioAtivo} onChange={e => setForm(f => ({ ...f, principioAtivo: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Amoxicilina" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome Comercial</label>
              <input value={form.nomeComercial} onChange={e => setForm(f => ({ ...f, nomeComercial: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Amoxil" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Apresentação *</label>
              <input value={form.apresentacao} onChange={e => setForm(f => ({ ...f, apresentacao: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Cápsula 500mg" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tarja</label>
              <select value={form.tarja} onChange={e => setForm(f => ({ ...f, tarja: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {Object.entries(TARJA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.controlado} onChange={e => setForm(f => ({ ...f, controlado: e.target.checked }))}
                className="rounded" />
              Medicamento Controlado
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Qtd. Inicial</label>
              <input type="number" min="0" value={form.quantidadeAtual}
                onChange={e => setForm(f => ({ ...f, quantidadeAtual: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Qtd. Mínima</label>
              <input type="number" min="0" value={form.quantidadeMinima}
                onChange={e => setForm(f => ({ ...f, quantidadeMinima: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unidade</label>
              <select value={form.unidadeMedida} onChange={e => setForm(f => ({ ...f, unidadeMedida: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {['UNIDADE','CAIXA','FRASCO','AMPOLA','BISNAGA','TUBO'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Lote</label>
              <input value={form.lote} onChange={e => setForm(f => ({ ...f, lote: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Validade</label>
              <input type="date" value={form.dataValidade} onChange={e => setForm(f => ({ ...f, dataValidade: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          {erro && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{erro}</div>}
        </div>
        <div className="p-6 border-t flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
          <button onClick={salvar} disabled={carregando || !form.unidadeId || !form.principioAtivo || !form.apresentacao}
            className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {carregando ? 'Salvando…' : 'Cadastrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function FarmaciaPage() {
  const [estoque, setEstoque] = useState<ItemEstoque[]>([])
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [selecionado, setSelecionado] = useState<ItemEstoque | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [modal, setModal] = useState<'cadastro'|'dispensar'|'entrada'|null>(null)
  const [busca, setBusca] = useState('')
  const [filtroAlerta, setFiltroAlerta] = useState('')
  const [unidades, setUnidades] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/saude/unidade').then(r => r.json()).then(j => setUnidades(j.unidades || []))
  }, [])

  const carregar = useCallback(async () => {
    setCarregando(true)
    const params = new URLSearchParams()
    if (busca) params.set('busca', busca)
    const [rEs, rKpi] = await Promise.all([
      fetch(`/api/saude/farmacia?${params}`),
      fetch('/api/saude/farmacia?relatorio=DASHBOARD'),
    ])
    const jEs = await rEs.json()
    const jKpi = await rKpi.json()
    setEstoque(jEs.estoque || [])
    setKpis(jKpi.kpis)
    setCarregando(false)
  }, [busca])

  useEffect(() => { carregar() }, [carregar])

  async function selecionarItem(item: ItemEstoque) {
    const r = await fetch(`/api/saude/farmacia?id=${item.id}`)
    const j = await r.json()
    setSelecionado(j.item)
  }

  const filtrado = filtroAlerta
    ? estoque.filter(i =>
        filtroAlerta === 'falta' ? i.alertas.abaixoMinimo :
        filtroAlerta === 'vencer' ? i.alertas.aVencer :
        filtroAlerta === 'vencido' ? i.alertas.vencido :
        filtroAlerta === 'controlado' ? i.controlado : true
      )
    : estoque

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Farmácia Básica</h1>
          <p className="text-sm text-gray-500 mt-0.5">RDC ANVISA 44/2009 — Dispensação de Medicamentos</p>
        </div>
        <button onClick={() => setModal('cadastro')}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          + Cadastrar Medicamento
        </button>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Total Itens',    valor: kpis.totalItens,   cor: 'text-gray-800',  bg: 'bg-gray-50' },
            { label: 'Em Falta',       valor: kpis.emFalta,      cor: 'text-red-700',   bg: 'bg-red-50' },
            { label: 'Abaixo Mínimo',  valor: kpis.abaixoMinimo, cor: 'text-orange-700', bg: 'bg-orange-50' },
            { label: 'A Vencer 60d',   valor: kpis.aVencer,      cor: 'text-yellow-700', bg: 'bg-yellow-50' },
            { label: 'Controlados',    valor: kpis.controlados,  cor: 'text-purple-700', bg: 'bg-purple-50' },
          ].map(k => (
            <div key={k.label} className={`${k.bg} rounded-xl p-4`}>
              <p className="text-xs text-gray-500 mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.cor}`}>{k.valor}</p>
            </div>
          ))}
        </div>
      )}

      {kpis && (kpis.emFalta > 0 || kpis.abaixoMinimo > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          🚨 <strong>{kpis.emFalta} medicamento(s) em falta</strong> e <strong>{kpis.abaixoMinimo} abaixo do estoque mínimo</strong>. Providencie reposição.
        </div>
      )}

      <div className="grid grid-cols-5 gap-6">
        {/* Lista */}
        <div className="col-span-2 space-y-3">
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar medicamento..."
              className="w-full border rounded-lg px-3 py-2 text-sm" />
            <select value={filtroAlerta} onChange={e => setFiltroAlerta(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Todos</option>
              <option value="falta">🔴 Em falta / Abaixo mínimo</option>
              <option value="vencer">🟡 A vencer em 60 dias</option>
              <option value="vencido">⚫ Vencidos</option>
              <option value="controlado">💜 Controlados</option>
            </select>
          </div>

          {carregando ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">Carregando…</div>
          ) : filtrado.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
              <p className="text-3xl mb-2">💊</p>
              <p>Nenhum medicamento encontrado</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-420px)] overflow-y-auto pr-1">
              {filtrado.map(item => {
                const ativo = selecionado?.id === item.id
                const diasValidade = diasParaVencer(item.dataValidade)
                return (
                  <button key={item.id} onClick={() => selecionarItem(item)}
                    className={`w-full text-left bg-white rounded-xl border p-4 hover:border-blue-300 transition-colors
                      ${ativo ? 'border-blue-500 ring-1 ring-blue-200' : ''}
                      ${item.alertas.vencido ? 'border-red-300 bg-red-50' : item.alertas.abaixoMinimo ? 'border-orange-200' : ''}`}>
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold text-sm text-gray-800 truncate">{item.principioAtivo}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TARJA[item.tarja]?.cor || 'bg-gray-100'}`}>
                        {item.tarja}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{item.apresentacao}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-sm font-bold ${item.quantidadeAtual <= item.quantidadeMinima ? 'text-red-700' : 'text-green-700'}`}>
                        {item.quantidadeAtual} {item.unidadeMedida}
                      </span>
                      <div className="flex gap-1">
                        {item.controlado && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Ctrl</span>}
                        {item.alertas.abaixoMinimo && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">⚠ Min</span>}
                        {item.alertas.aVencer && diasValidade !== null && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">⏰ {diasValidade}d</span>
                        )}
                        {item.alertas.vencido && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">VENCIDO</span>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Painel detalhe */}
        <div className="col-span-3">
          {selecionado ? (
            <div className="bg-white rounded-xl border shadow-sm space-y-0">
              <div className="p-5 border-b flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TARJA[selecionado.tarja]?.cor || ''}`}>
                      {TARJA[selecionado.tarja]?.label}
                    </span>
                    {selecionado.controlado && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Controlado</span>}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{selecionado.principioAtivo}</h2>
                  {selecionado.nomeComercial && <p className="text-sm text-gray-500">{selecionado.nomeComercial}</p>}
                  <p className="text-sm text-gray-600 mt-0.5">{selecionado.apresentacao}</p>
                </div>
                <div className="text-right">
                  <p className={`text-3xl font-bold ${selecionado.quantidadeAtual <= selecionado.quantidadeMinima ? 'text-red-700' : 'text-green-700'}`}>
                    {selecionado.quantidadeAtual}
                  </p>
                  <p className="text-xs text-gray-500">{selecionado.unidadeMedida}(s) disponível</p>
                  <p className="text-xs text-gray-400">Mínimo: {selecionado.quantidadeMinima}</p>
                </div>
              </div>

              <div className="p-5 border-b grid grid-cols-3 gap-4 text-sm bg-gray-50">
                <div><span className="text-xs text-gray-400 block">Unidade</span>{selecionado.unidade.nome}</div>
                <div><span className="text-xs text-gray-400 block">Lote</span>{selecionado.lote || '—'}</div>
                <div>
                  <span className="text-xs text-gray-400 block">Validade</span>
                  <span className={selecionado.alertas.vencido ? 'text-red-700 font-semibold' : selecionado.alertas.aVencer ? 'text-yellow-700' : ''}>
                    {DATA(selecionado.dataValidade)}
                    {selecionado.alertas.aVencer && !selecionado.alertas.vencido && (
                      <span className="text-xs text-yellow-600 ml-1">({diasParaVencer(selecionado.dataValidade)}d)</span>
                    )}
                    {selecionado.alertas.vencido && <span className="text-xs ml-1">⚠ VENCIDO</span>}
                  </span>
                </div>
              </div>

              {/* Movimentações */}
              {selecionado.movimentacoes && selecionado.movimentacoes.length > 0 && (
                <div className="p-5 border-b">
                  <p className="text-xs font-semibold text-gray-500 mb-3">ÚLTIMAS MOVIMENTAÇÕES</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selecionado.movimentacoes.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            m.tipo === 'ENTRADA' ? 'bg-green-100 text-green-700' :
                            m.tipo === 'SAIDA'   ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>{m.tipo}</span>
                          <span className="text-gray-600">{m.tipo === 'ENTRADA' ? '+' : m.tipo === 'SAIDA' ? '-' : '±'}{Math.abs(m.quantidade)}</span>
                          {m.pacienteNome && <span className="text-gray-400 text-xs">{m.pacienteNome}</span>}
                        </div>
                        <div className="text-right">
                          <span className="font-medium">→ {m.saldoApos}</span>
                          <p className="text-xs text-gray-400">{new Date(m.criadoEm).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="p-5 flex gap-2">
                <button onClick={() => setModal('dispensar')}
                  disabled={selecionado.quantidadeAtual === 0}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
                  💊 Dispensar
                </button>
                <button onClick={() => setModal('entrada')}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                  📦 Registrar Entrada
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border p-16 text-center text-gray-400">
              <p className="text-4xl mb-3">💊</p>
              <p>Selecione um medicamento para ver detalhes</p>
            </div>
          )}
        </div>
      </div>

      {modal === 'cadastro' && (
        <ModalCadastro unidades={unidades} onClose={() => setModal(null)} onSalvo={() => { setModal(null); carregar() }} />
      )}
      {modal === 'dispensar' && selecionado && (
        <ModalDispensar item={selecionado} onClose={() => setModal(null)}
          onSalvo={() => { setModal(null); carregar(); selecionarItem(selecionado) }} />
      )}
      {modal === 'entrada' && selecionado && (
        <ModalEntrada item={selecionado} onClose={() => setModal(null)}
          onSalvo={() => { setModal(null); carregar(); selecionarItem(selecionado) }} />
      )}
    </div>
  )
}
