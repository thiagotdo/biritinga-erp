'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { Building2, Car, Armchair, Monitor, Refrigerator, Wrench, Settings2, Palette, Beef, HardDrive, Package, ClipboardList } from 'lucide-react'

const CAT_ICON_MAP: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>> = {
  IMOVEL: Building2, VEICULO: Car, MOVEL: Armchair, EQUIPAMENTO: Monitor,
  ELETRODOMESTICO: Refrigerator, FERRAMENTA: Wrench, MAQUINA: Settings2,
  OBRA_ARTE: Palette, SEMOVENTE: Beef, INTANGIVEL: HardDrive, OUTRO: Package,
}
function CatIcon({ cat, size = 16 }: { cat: string; size?: number }) {
  const Icon = CAT_ICON_MAP[cat] ?? Package
  return <Icon size={size} strokeWidth={1.5} style={{ color: 'var(--cor-primaria)' }} />
}

type Inventario = {
  id: string; ano: number; descricao?: string; situacao: string
  dataInicio: string; dataFim?: string; responsavel: string
  totalBens?: number; bensConfirmados?: number; bensNaoEncontrados?: number
}
type Stats = { total: number; conferidos: number; encontrados: number; naoEncontrados: number; pendentes: number }
type ItemBem = {
  id: string; encontrado: boolean | null
  estadoEncontrado?: string; localEncontrado?: string
  responsavelEncontrado?: string; observacoes?: string
  conferidoEm?: string; conferidoPor?: string
  bem: { numeroPlaqueta: string; descricao: string; categoria: string; secretaria: string; local?: string; valorAtual: number; estado: string }
}

const SIT_COR: Record<string, string> = {
  ABERTO:       'bg-blue-100 text-blue-700',
  EM_ANDAMENTO: 'bg-yellow-100 text-yellow-700',
  CONCLUIDO:    'bg-green-100 text-green-700',
  CANCELADO:    'bg-gray-100 text-gray-400',
}

// CAT_ICON replaced by CatIcon component above

function BarraProgresso({ conf, total }: { conf: number; total: number }) {
  const pct = total ? Math.round((conf / total) * 100) : 0
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{pct}% conferido</span>
        <span className="text-gray-400">{conf}/{total}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : pct > 60 ? 'bg-indigo-500' : 'bg-yellow-400'}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function InventarioPage() {
  const [inventarios, setInventarios] = useState<Inventario[]>([])
  const [inventarioAtivo, setInventarioAtivo] = useState<Inventario | null>(null)
  const [itens, setItens] = useState<ItemBem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [filtroConferido, setFiltroConferido] = useState<'todos' | 'pendente' | 'encontrado' | 'nao_encontrado'>('todos')
  const [busca, setBusca] = useState('')
  const [modalNovoInv, setModalNovoInv] = useState(false)
  const [modalConferir, setModalConferir] = useState<ItemBem | null>(null)
  const [msg, setMsg] = useState('')

  const [formInv, setFormInv] = useState({ ano: new Date().getFullYear().toString(), descricao: '', responsavel: '' })
  const [formConferir, setFormConferir] = useState({ encontrado: true, estadoEncontrado: 'BOM', localEncontrado: '', responsavelEncontrado: '', observacoes: '' })

  const carregarInventarios = useCallback(async () => {
    const r = await fetch('/api/patrimonio/inventario')
    const d = await r.json()
    setInventarios(d.inventarios ?? [])
  }, [])

  useEffect(() => { carregarInventarios() }, [carregarInventarios])

  async function abrirInventario(inv: Inventario) {
    setInventarioAtivo(inv)
    setBusca('')
    setFiltroConferido('todos')
    const r = await fetch(`/api/patrimonio/inventario?id=${inv.id}`)
    const d = await r.json()
    setItens(d.inventario?.itens ?? [])
    setStats(d.stats ?? null)
  }

  async function criarInventario() {
    const r = await fetch('/api/patrimonio/inventario', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formInv, ano: Number(formInv.ano) }),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    setMsg(`Inventário ${formInv.ano} criado — ${d.totalItens} bens incluídos`)
    setModalNovoInv(false)
    carregarInventarios()
    abrirInventario(d.inventario)
    setTimeout(() => setMsg(''), 5000)
  }

  async function acaoInventario(acao: string) {
    if (!inventarioAtivo) return
    const r = await fetch('/api/patrimonio/inventario', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: inventarioAtivo.id, acao }),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    if (acao === 'CONCLUIR') {
      setMsg(`Inventário concluído! ✓ ${d.encontrados} encontrados · ✗ ${d.naoEncontrados} não encontrados`)
    } else {
      setMsg('Operação realizada!')
    }
    carregarInventarios()
    if (inventarioAtivo) {
      const r2 = await fetch(`/api/patrimonio/inventario?id=${inventarioAtivo.id}`)
      const d2 = await r2.json()
      setInventarioAtivo(d2.inventario ? { ...inventarioAtivo, situacao: d2.inventario.situacao } : null)
      setItens(d2.inventario?.itens ?? [])
      setStats(d2.stats ?? null)
    }
    setTimeout(() => setMsg(''), 6000)
  }

  async function conferirItem() {
    if (!modalConferir) return
    const r = await fetch('/api/patrimonio/inventario?acao=CONFERIR', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: modalConferir.id, ...formConferir }),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    setModalConferir(null)
    // Atualiza o item na lista local
    setItens(prev => prev.map(i => i.id === modalConferir.id
      ? { ...i, encontrado: formConferir.encontrado, estadoEncontrado: formConferir.estadoEncontrado, localEncontrado: formConferir.localEncontrado, conferidoEm: new Date().toISOString() }
      : i
    ))
    // Atualiza stats
    if (stats) {
      const foiPendente = modalConferir.encontrado === null
      setStats(prev => !prev ? prev : {
        ...prev,
        conferidos:     prev.conferidos + (foiPendente ? 1 : 0),
        encontrados:    formConferir.encontrado ? prev.encontrados + (modalConferir.encontrado !== true ? 1 : 0) : prev.encontrados - (modalConferir.encontrado === true ? 1 : 0),
        naoEncontrados: !formConferir.encontrado ? prev.naoEncontrados + (modalConferir.encontrado !== false ? 1 : 0) : prev.naoEncontrados - (modalConferir.encontrado === false ? 1 : 0),
        pendentes:      foiPendente ? prev.pendentes - 1 : prev.pendentes,
      })
    }
  }

  // Abertura modal de conferência
  function abrirConferir(item: ItemBem) {
    setFormConferir({
      encontrado: item.encontrado ?? true,
      estadoEncontrado: item.estadoEncontrado ?? 'BOM',
      localEncontrado: item.localEncontrado ?? item.bem.local ?? '',
      responsavelEncontrado: item.responsavelEncontrado ?? '',
      observacoes: item.observacoes ?? '',
    })
    setModalConferir(item)
  }

  const itensFiltrados = itens.filter(i => {
    if (filtroConferido === 'pendente'       && i.encontrado !== null) return false
    if (filtroConferido === 'encontrado'     && i.encontrado !== true)  return false
    if (filtroConferido === 'nao_encontrado' && i.encontrado !== false) return false
    if (busca) {
      const q = busca.toLowerCase()
      return i.bem.numeroPlaqueta.toLowerCase().includes(q) ||
             i.bem.descricao.toLowerCase().includes(q) ||
             i.bem.secretaria.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventário Patrimonial</h1>
            <p className="text-sm text-gray-500 mt-0.5">Decreto 93.872/1986 — inventário anual obrigatório</p>
          </div>
          <button onClick={() => setModalNovoInv(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
            + Novo Inventário
          </button>
        </div>
      </div>

      {msg && (
        <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{msg}</div>
      )}

      <div className="px-6 py-5 grid grid-cols-4 gap-5">
        {/* Lista de inventários */}
        <div className="col-span-1">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Inventários</h2>
          <div className="space-y-2">
            {inventarios.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
                Nenhum inventário criado ainda
              </div>
            )}
            {inventarios.map(inv => (
              <button key={inv.id} onClick={() => abrirInventario(inv)}
                className={`w-full text-left bg-white rounded-xl border p-4 hover:border-indigo-400 transition-all ${inventarioAtivo?.id === inv.id ? 'border-indigo-500 ring-1 ring-indigo-200' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-lg font-bold text-gray-800">{inv.ano}</div>
                    <div className="text-xs text-gray-500">{inv.responsavel}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SIT_COR[inv.situacao]}`}>
                    {inv.situacao.replace('_', ' ')}
                  </span>
                </div>
                {inv.descricao && <div className="text-xs text-gray-400 truncate mb-2">{inv.descricao}</div>}
                {inv.totalBens && (
                  <div className="text-xs text-gray-500">
                    {inv.situacao === 'CONCLUIDO' ? (
                      <span>✓ {inv.bensConfirmados} · ✗ {inv.bensNaoEncontrados} · {inv.totalBens} total</span>
                    ) : (
                      <span>{inv.totalBens} bens incluídos</span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Área de conferência */}
        <div className="col-span-3">
          {!inventarioAtivo ? (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-400">
              <ClipboardList size={56} style={{ color: 'var(--cor-primaria)', margin: '0 auto 16px' }} strokeWidth={1.5} />
              <div className="text-lg">Selecione um inventário ou crie um novo</div>
              <div className="text-sm mt-2 text-gray-300">O inventário anual é obrigatório pelo Decreto 93.872/1986</div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200">
              {/* Cabeçalho */}
              <div className="p-5 border-b">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Inventário {inventarioAtivo.ano}</h2>
                    {inventarioAtivo.descricao && <div className="text-sm text-gray-500">{inventarioAtivo.descricao}</div>}
                    <div className="text-xs text-gray-400 mt-0.5">Responsável: {inventarioAtivo.responsavel}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${SIT_COR[inventarioAtivo.situacao]}`}>
                      {inventarioAtivo.situacao.replace('_', ' ')}
                    </span>
                    {inventarioAtivo.situacao === 'ABERTO' && (
                      <button onClick={() => acaoInventario('INICIAR')}
                        className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-medium hover:bg-yellow-600">
                        ▶ Iniciar Conferência
                      </button>
                    )}
                    {inventarioAtivo.situacao === 'EM_ANDAMENTO' && (
                      <>
                        <button onClick={() => { if (confirm('Concluir inventário? Bens não encontrados serão marcados como EXTRAVIADOS.')) acaoInventario('CONCLUIR') }}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">
                          ✓ Concluir
                        </button>
                        <button onClick={() => acaoInventario('CANCELAR')}
                          className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-300">
                          Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Estatísticas */}
                {stats && (
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {[
                      { label: 'Total',         valor: stats.total,         cor: 'text-gray-800' },
                      { label: 'Conferidos',    valor: stats.conferidos,    cor: 'text-indigo-600' },
                      { label: 'Encontrados',   valor: stats.encontrados,   cor: 'text-green-600' },
                      { label: 'Não Encontrados', valor: stats.naoEncontrados, cor: 'text-red-600' },
                      { label: 'Pendentes',     valor: stats.pendentes,     cor: 'text-yellow-600' },
                    ].map(s => (
                      <div key={s.label} className="bg-gray-50 rounded-lg p-2 text-center">
                        <div className={`text-lg font-bold ${s.cor}`}>{s.valor}</div>
                        <div className="text-xs text-gray-400">{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {stats && <BarraProgresso conf={stats.conferidos} total={stats.total} />}
              </div>

              {/* Filtros */}
              <div className="p-4 border-b flex gap-3 flex-wrap">
                <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Plaqueta, descrição, secretaria…"
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-56" />
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  {(['todos','pendente','encontrado','nao_encontrado'] as const).map(f => (
                    <button key={f} onClick={() => setFiltroConferido(f)}
                      className={`px-3 py-1.5 text-xs font-medium ${filtroConferido === f ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                      {f === 'todos' ? 'Todos' : f === 'pendente' ? '⏳ Pendentes' : f === 'encontrado' ? '✓ Encontrados' : '✗ Não encontrados'}
                    </button>
                  ))}
                </div>
                <span className="ml-auto text-sm text-gray-400 self-center">{itensFiltrados.length} itens</span>
              </div>

              {/* Lista de itens */}
              <div className="divide-y divide-gray-50 max-h-[calc(100vh-440px)] overflow-y-auto">
                {itensFiltrados.length === 0 && (
                  <div className="p-10 text-center text-gray-400">Nenhum item encontrado</div>
                )}
                {itensFiltrados.map(item => (
                  <div key={item.id} className={`flex items-center gap-4 px-5 py-3 hover:bg-gray-50 ${item.encontrado === null ? '' : ''}`}>
                    {/* Status */}
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-lg">
                      {item.encontrado === null ? '⏳' : item.encontrado ? '✅' : '❌'}
                    </div>
                    {/* Info do bem */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CatIcon cat={item.bem.categoria} size={14} />
                        <span className="font-mono text-xs text-indigo-600">{item.bem.numeroPlaqueta}</span>
                        <span className="text-xs text-gray-400">{item.bem.estado}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-800 truncate">{item.bem.descricao}</div>
                      <div className="text-xs text-gray-400">{item.bem.secretaria}{item.bem.local ? ` · ${item.bem.local}` : ''}</div>
                    </div>
                    {/* Info conferência */}
                    <div className="flex-shrink-0 text-right text-xs">
                      {item.conferidoEm ? (
                        <>
                          <div className={item.encontrado ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {item.encontrado ? 'Encontrado' : 'Não encontrado'}
                          </div>
                          {item.estadoEncontrado && <div className="text-gray-400">{item.estadoEncontrado}</div>}
                          {item.localEncontrado && <div className="text-gray-400">{item.localEncontrado}</div>}
                          <div className="text-gray-300">{new Date(item.conferidoEm).toLocaleDateString('pt-BR')}</div>
                        </>
                      ) : (
                        <span className="text-gray-300">não conferido</span>
                      )}
                    </div>
                    {/* Botão conferir */}
                    {inventarioAtivo.situacao === 'EM_ANDAMENTO' && (
                      <button onClick={() => abrirConferir(item)}
                        className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors ${
                          item.encontrado === null
                            ? 'border-indigo-300 text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                            : 'border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600'
                        }`}>
                        {item.encontrado === null ? '▷ Conferir' : '↻ Corrigir'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal novo inventário */}
      {modalNovoInv && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
            <div className="p-5 border-b">
              <h2 className="font-bold text-gray-800">Novo Inventário Patrimonial</h2>
              <p className="text-xs text-gray-400 mt-0.5">Decreto 93.872/1986 — 1 inventário por ano</p>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Ano *</label>
                <input type="number" value={formInv.ano} onChange={e => setFormInv(p => ({ ...p, ano: e.target.value }))}
                  min="2000" max="2100" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Responsável *</label>
                <input type="text" value={formInv.responsavel} onChange={e => setFormInv(p => ({ ...p, responsavel: e.target.value }))}
                  placeholder="Nome do servidor responsável"
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Descrição (opcional)</label>
                <input type="text" value={formInv.descricao} onChange={e => setFormInv(p => ({ ...p, descricao: e.target.value }))}
                  placeholder="Inventário Geral, Inventário Setorial…"
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </div>
              <div className="bg-indigo-50 rounded-lg p-3 text-xs text-indigo-700">
                Serão incluídos todos os bens patrimoniais ativos no sistema. O inventário ficará em status ABERTO até ser iniciado.
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => setModalNovoInv(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
              <button onClick={criarInventario}
                disabled={!formInv.ano || !formInv.responsavel}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                Criar Inventário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal conferir item */}
      {modalConferir && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
            <div className="p-5 border-b">
              <h2 className="font-bold text-gray-800">Conferência de Bem</h2>
              <div className="text-xs text-gray-400 mt-0.5 font-mono">{modalConferir.bem.numeroPlaqueta}</div>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="font-medium">{modalConferir.bem.descricao}</div>
                <div className="text-xs text-gray-500 mt-0.5">{modalConferir.bem.secretaria}{modalConferir.bem.local ? ` · ${modalConferir.bem.local}` : ''}</div>
              </div>
              {/* Encontrado / Não encontrado */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Situação *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setFormConferir(p => ({ ...p, encontrado: true }))}
                    className={`py-2.5 rounded-lg text-sm font-medium border-2 transition-colors ${formConferir.encontrado ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}>
                    ✓ Encontrado
                  </button>
                  <button onClick={() => setFormConferir(p => ({ ...p, encontrado: false }))}
                    className={`py-2.5 rounded-lg text-sm font-medium border-2 transition-colors ${!formConferir.encontrado ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500'}`}>
                    ✗ Não encontrado
                  </button>
                </div>
              </div>
              {formConferir.encontrado && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Estado do bem</label>
                    <select value={formConferir.estadoEncontrado} onChange={e => setFormConferir(p => ({ ...p, estadoEncontrado: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                      {['OTIMO','BOM','REGULAR','RUIM','PESSIMO','IRRECUPERAVEL'].map(e => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Local encontrado</label>
                    <input type="text" value={formConferir.localEncontrado} onChange={e => setFormConferir(p => ({ ...p, localEncontrado: e.target.value }))}
                      placeholder="Sala, prédio, setor…"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Responsável encontrado</label>
                    <input type="text" value={formConferir.responsavelEncontrado} onChange={e => setFormConferir(p => ({ ...p, responsavelEncontrado: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
                <textarea value={formConferir.observacoes} onChange={e => setFormConferir(p => ({ ...p, observacoes: e.target.value }))} rows={2}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => setModalConferir(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
              <button onClick={conferirItem}
                className={`px-5 py-2 text-white rounded-lg text-sm font-medium ${formConferir.encontrado ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {formConferir.encontrado ? '✓ Confirmar Encontrado' : '✗ Registrar Não Encontrado'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
