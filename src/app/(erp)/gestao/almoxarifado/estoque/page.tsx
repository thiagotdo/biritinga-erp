'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Package, PackagePlus, ArrowDownToLine, ArrowUpFromLine, Search,
  AlertTriangle, X, Loader2, CheckCircle, ChevronDown
} from 'lucide-react'
import Link from 'next/link'

const CAT_LABEL: Record<string,string> = {
  MATERIAL_CONSUMO:'Material de Consumo', MATERIAL_PERMANENTE:'Material Permanente',
  MEDICAMENTO:'Medicamento', LIMPEZA:'Limpeza/Higiene',
  ESCRITORIO:'Escritório', INFORMATICA:'Informática', OUTRO:'Outro',
}

export default function EstoquePage() {
  const sp = useSearchParams()
  const acaoInicial = sp.get('acao') // 'novo' | 'entrada' | 'saida'

  const [itens, setItens]       = useState<any[]>([])
  const [busca, setBusca]       = useState('')
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState<'novo'|'entrada'|'saida'|null>(acaoInicial as any ?? null)
  const [itemSel, setItemSel]   = useState<any>(null)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg]           = useState('')
  const [filtroCat, setFiltroCat] = useState('')

  const [formNovo, setFormNovo] = useState({
    nome:'', codigo:'', categoria:'MATERIAL_CONSUMO', unidade:'UN',
    quantidadeAtual:'0', quantidadeMinima:'0', localizacao:'', descricao:''
  })
  const [formMov, setFormMov] = useState({
    quantidade:'', motivo:'', fornecedor:'', numeroNF:'', setor:'', solicitante:'', observacoes:''
  })

  const carregar = useCallback(async () => {
    setLoading(true)
    const qs = busca.length >= 2 ? `busca=${encodeURIComponent(busca)}`
              : filtroCat ? `categoria=${filtroCat}` : ''
    const r = await fetch(`/api/almoxarifado/item?${qs}`)
    const d = await r.json()
    setItens(d.itens ?? [])
    setLoading(false)
  }, [busca, filtroCat])

  useEffect(() => { carregar() }, [carregar])

  const salvarNovo = async () => {
    if (!formNovo.nome.trim()) return
    setSalvando(true)
    const r = await fetch('/api/almoxarifado/item', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        ...formNovo,
        quantidadeAtual: parseFloat(formNovo.quantidadeAtual) || 0,
        quantidadeMinima: parseFloat(formNovo.quantidadeMinima) || 0,
      })
    })
    const d = await r.json()
    setSalvando(false)
    if (r.ok) {
      setMsg(`Item "${formNovo.nome}" cadastrado! Código: ${d.codigo}`)
      setModal(null)
      carregar()
    } else alert(d.erro)
  }

  const salvarMov = async () => {
    if (!itemSel || !formMov.quantidade) return
    setSalvando(true)
    const r = await fetch('/api/almoxarifado/movimentacao', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        itemId: itemSel.id,
        tipo: modal === 'entrada' ? 'ENTRADA' : 'SAIDA',
        quantidade: parseFloat(formMov.quantidade),
        ...formMov,
      })
    })
    const d = await r.json()
    setSalvando(false)
    if (r.ok) {
      setMsg(`${modal === 'entrada' ? 'Entrada' : 'Saída'} registrada! Novo estoque: ${d.quantidadePosterior} ${itemSel.unidade}`)
      setModal(null)
      setItemSel(null)
      carregar()
    } else alert(d.erro)
  }

  const abrirMov = (item: any, tipo: 'entrada'|'saida') => {
    setItemSel(item)
    setFormMov({ quantidade:'', motivo:'', fornecedor:'', numeroNF:'', setor:'', solicitante:'', observacoes:'' })
    setModal(tipo)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/gestao/almoxarifado" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <Package className="w-4 h-4" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Estoque de Materiais</h1>
        </div>
        <button
          onClick={() => { setModal('novo'); setFormNovo({nome:'',codigo:'',categoria:'MATERIAL_CONSUMO',unidade:'UN',quantidadeAtual:'0',quantidadeMinima:'0',localizacao:'',descricao:''}) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <PackagePlus className="w-4 h-4" />
          Novo Item
        </button>
      </div>

      {msg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {msg}
          <button onClick={() => setMsg('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Buscar por nome ou código..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
        <select
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
          value={filtroCat}
          onChange={e => setFiltroCat(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {Object.entries(CAT_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>
      ) : itens.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum item encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Código</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Item</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Categoria</th>
                <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase">Estoque</th>
                <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase">Mínimo</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {itens.map((item: any) => {
                const critico = Number(item.quantidadeAtual) <= Number(item.quantidadeMinima)
                const zerado  = Number(item.quantidadeAtual) === 0
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs text-gray-500">{item.codigo}</td>
                    <td className="p-3">
                      <div className="font-medium text-gray-900">{item.nome}</div>
                      {item.localizacao && <div className="text-xs text-gray-400">{item.localizacao}</div>}
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                        {CAT_LABEL[item.categoria] ?? item.categoria}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`font-semibold ${zerado ? 'text-red-600' : critico ? 'text-yellow-600' : 'text-green-700'}`}>
                        {Number(item.quantidadeAtual).toLocaleString('pt-BR', {maximumFractionDigits:3})}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">{item.unidade}</span>
                      {critico && <AlertTriangle className="inline w-3 h-3 text-yellow-500 ml-1" />}
                    </td>
                    <td className="p-3 text-right text-gray-500 text-xs">
                      {Number(item.quantidadeMinima).toLocaleString('pt-BR',{maximumFractionDigits:3})} {item.unidade}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => abrirMov(item, 'entrada')}
                          className="p-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100"
                          title="Dar entrada"
                        >
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => abrirMov(item, 'saida')}
                          className="p-1.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100"
                          title="Dar saída"
                        >
                          <ArrowUpFromLine className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Novo Item */}
      {modal === 'novo' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Cadastrar Item</h2>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nome do Item *</label>
                  <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                    value={formNovo.nome} onChange={e => setFormNovo(f => ({...f,nome:e.target.value}))} placeholder="Ex: Papel A4 75g 500 folhas" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Código (opcional)</label>
                  <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                    value={formNovo.codigo} onChange={e => setFormNovo(f => ({...f,codigo:e.target.value}))} placeholder="Auto" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Unidade</label>
                  <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                    value={formNovo.unidade} onChange={e => setFormNovo(f => ({...f,unidade:e.target.value}))}>
                    {['UN','KG','L','M','CX','PCT','RL','PAR','JG','FLS','RS','DZ','TB'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
                  <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                    value={formNovo.categoria} onChange={e => setFormNovo(f => ({...f,categoria:e.target.value}))}>
                    {Object.entries(CAT_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Qtd. Inicial</label>
                  <input type="number" min="0" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                    value={formNovo.quantidadeAtual} onChange={e => setFormNovo(f => ({...f,quantidadeAtual:e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Estoque Mínimo</label>
                  <input type="number" min="0" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                    value={formNovo.quantidadeMinima} onChange={e => setFormNovo(f => ({...f,quantidadeMinima:e.target.value}))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Localização no Almoxarifado</label>
                  <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                    value={formNovo.localizacao} onChange={e => setFormNovo(f => ({...f,localizacao:e.target.value}))} placeholder="Ex: Prateleira A, Box 3" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={salvarNovo} disabled={salvando || !formNovo.nome.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackagePlus className="w-4 h-4" />}
                  Cadastrar Item
                </button>
                <button onClick={() => setModal(null)} className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Movimentação */}
      {(modal === 'entrada' || modal === 'saida') && itemSel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {modal === 'entrada' ? <ArrowDownToLine className="w-5 h-5 text-green-600" /> : <ArrowUpFromLine className="w-5 h-5 text-orange-600" />}
                {modal === 'entrada' ? 'Dar Entrada' : 'Dar Saída'}
              </h2>
              <button onClick={() => { setModal(null); setItemSel(null) }}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">{itemSel.nome}</p>
              <p className="text-xs text-gray-500">
                Estoque atual: <strong>{Number(itemSel.quantidadeAtual).toLocaleString('pt-BR',{maximumFractionDigits:3})} {itemSel.unidade}</strong>
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade *</label>
                <input type="number" min="0.001" step="0.001"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                  value={formMov.quantidade} onChange={e => setFormMov(f => ({...f,quantidade:e.target.value}))}
                  placeholder={`Ex: 10 (${itemSel.unidade})`} />
              </div>
              {modal === 'entrada' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fornecedor</label>
                    <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                      value={formMov.fornecedor} onChange={e => setFormMov(f => ({...f,fornecedor:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nº Nota Fiscal</label>
                    <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                      value={formMov.numeroNF} onChange={e => setFormMov(f => ({...f,numeroNF:e.target.value}))} />
                  </div>
                </div>
              )}
              {modal === 'saida' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Setor Solicitante</label>
                    <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                      value={formMov.setor} onChange={e => setFormMov(f => ({...f,setor:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Responsável</label>
                    <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                      value={formMov.solicitante} onChange={e => setFormMov(f => ({...f,solicitante:e.target.value}))} />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Motivo</label>
                <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                  value={formMov.motivo} onChange={e => setFormMov(f => ({...f,motivo:e.target.value}))}
                  placeholder={modal === 'entrada' ? 'Ex: Compra direta, licitação...' : 'Ex: Uso administrativo, serviço...'} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={salvarMov} disabled={salvando || !formMov.quantidade}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-lg disabled:opacity-50 text-sm font-medium ${modal==='entrada' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : (modal==='entrada' ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />)}
                  Confirmar {modal === 'entrada' ? 'Entrada' : 'Saída'}
                </button>
                <button onClick={() => { setModal(null); setItemSel(null) }} className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
