'use client'

import { useState } from 'react'
import {
  Pill, Plus, X, Search, AlertTriangle,
  TrendingDown, Package, CheckCircle,
  Clock, ArrowDown, ArrowUp, Filter,
  Calendar, FileText,
} from 'lucide-react'

type StatusEstoque = 'DISPONIVEL' | 'BAIXO_ESTOQUE' | 'INDISPONIVEL' | 'VENCIDO'
type TabEstoque = 'estoque' | 'dispensacao' | 'movimentacao'

interface Medicamento {
  id: string
  nome: string
  concentracao: string
  forma: string
  lote: string
  dataValidade: string
  qtAtual: number
  qtMinima: number
  status: StatusEstoque
  unidade: string
  controlado: boolean
  diasValidade: number
}

const STATUS_INFO: Record<StatusEstoque, { label: string; cor: string; bg: string; icone: React.ReactNode }> = {
  DISPONIVEL:   { label: 'Disponível',    cor: 'text-green-700',  bg: 'bg-green-100',  icone: <CheckCircle className="w-3.5 h-3.5" /> },
  BAIXO_ESTOQUE:{ label: 'Baixo Estoque', cor: 'text-orange-700', bg: 'bg-orange-100', icone: <TrendingDown className="w-3.5 h-3.5" /> },
  INDISPONIVEL: { label: 'Indisponível',  cor: 'text-red-700',    bg: 'bg-red-100',    icone: <X className="w-3.5 h-3.5" /> },
  VENCIDO:      { label: 'Vencido',       cor: 'text-gray-700',   bg: 'bg-gray-200',   icone: <AlertTriangle className="w-3.5 h-3.5" /> },
}

const MOCK_ESTOQUE: Medicamento[] = [
  { id: '1', nome: 'Losartana Potássica', concentracao: '50mg', forma: 'Comprimido', lote: 'LOT001', dataValidade: '28/02/2027', qtAtual: 5000, qtMinima: 500, status: 'DISPONIVEL', unidade: 'Farmácia Central', controlado: false, diasValidade: 107 },
  { id: '2', nome: 'Metformina', concentracao: '850mg', forma: 'Comprimido', lote: 'LOT002', dataValidade: '30/06/2027', qtAtual: 3200, qtMinima: 300, status: 'DISPONIVEL', unidade: 'Farmácia Central', controlado: false, diasValidade: 229 },
  { id: '3', nome: 'Hidroclorotiazida', concentracao: '25mg', forma: 'Comprimido', lote: 'LOT003', dataValidade: '31/03/2027', qtAtual: 150, qtMinima: 200, status: 'BAIXO_ESTOQUE', unidade: 'Farmácia Central', controlado: false, diasValidade: 138 },
  { id: '4', nome: 'Amoxicilina', concentracao: '500mg', forma: 'Cápsula', lote: 'LOT004', dataValidade: '15/11/2026', qtAtual: 80, qtMinima: 150, status: 'BAIXO_ESTOQUE', unidade: 'UBS Centro', controlado: false, diasValidade: 2 },
  { id: '5', nome: 'Ibuprofeno', concentracao: '600mg', forma: 'Comprimido', lote: 'LOT005', dataValidade: '10/11/2026', qtAtual: 0, qtMinima: 100, status: 'VENCIDO', unidade: 'UPA Municipal', controlado: false, diasValidade: -3 },
  { id: '6', nome: 'Clonazepam', concentracao: '2mg', forma: 'Comprimido', lote: 'LOT006', dataValidade: '31/12/2027', qtAtual: 500, qtMinima: 100, status: 'DISPONIVEL', unidade: 'CAPS João da Cruz', controlado: true, diasValidade: 413 },
  { id: '7', nome: 'Sulfato Ferroso', concentracao: '40mg', forma: 'Comprimido', lote: 'LOT007', dataValidade: '28/02/2027', qtAtual: 0, qtMinima: 200, status: 'INDISPONIVEL', unidade: 'UBS Centro', controlado: false, diasValidade: 107 },
  { id: '8', nome: 'Paracetamol', concentracao: '500mg', forma: 'Comprimido', lote: 'LOT008', dataValidade: '30/09/2027', qtAtual: 8000, qtMinima: 500, status: 'DISPONIVEL', unidade: 'Farmácia Central', controlado: false, diasValidade: 320 },
  { id: '9', nome: 'Atorvastatina', concentracao: '20mg', forma: 'Comprimido', lote: 'LOT009', dataValidade: '31/08/2027', qtAtual: 1200, qtMinima: 200, status: 'DISPONIVEL', unidade: 'Farmácia Central', controlado: false, diasValidade: 290 },
]

const MOVIMENTACOES = [
  { id: '1', med: 'Losartana 50mg', tipo: 'SAIDA_DISPENSACAO', qtd: 30, antes: 5030, depois: 5000, usuario: 'Farm. Roberto', data: '13/11 09:15', paciente: 'Maria G. Santos' },
  { id: '2', med: 'Metformina 850mg', tipo: 'ENTRADA', qtd: 1000, antes: 2200, depois: 3200, usuario: 'Farm. Roberto', data: '13/11 08:00' },
  { id: '3', med: 'Paracetamol 500mg', tipo: 'SAIDA_DISPENSACAO', qtd: 20, antes: 8020, depois: 8000, usuario: 'Enf. Clara', data: '12/11 16:40', paciente: 'Pedro Alves' },
  { id: '4', med: 'Amoxicilina 500mg', tipo: 'SAIDA_DISPENSACAO', qtd: 20, antes: 100, depois: 80, usuario: 'Enf. Clara', data: '12/11 11:20', paciente: 'Julia Matos' },
]

export default function EstoquePage() {
  const [aba, setAba] = useState<TabEstoque>('estoque')
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<StatusEstoque | ''>('')
  const [modalEntrada, setModalEntrada] = useState(false)
  const [modalDispensacao, setModalDispensacao] = useState(false)

  const filtrados = MOCK_ESTOQUE.filter(m => {
    const matchBusca = !busca || m.nome.toLowerCase().includes(busca.toLowerCase())
    const matchStatus = !filtroStatus || m.status === filtroStatus
    return matchBusca && matchStatus
  })

  const alertas = MOCK_ESTOQUE.filter(m => m.status !== 'DISPONIVEL').length
  const vencendo15 = MOCK_ESTOQUE.filter(m => m.diasValidade > 0 && m.diasValidade <= 15).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
            <Pill className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Estoque de Medicamentos</h1>
            <p className="text-xs text-gray-500">Farmácia Municipal — Gestão de estoque</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModalDispensacao(true)} className="flex items-center gap-1.5 text-sm border border-purple-300 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-50">
            <ArrowDown className="w-4 h-4" /> Dispensar
          </button>
          <button onClick={() => setModalEntrada(true)} className="flex items-center gap-1.5 text-sm bg-purple-600 text-white px-4 py-1.5 rounded-lg hover:bg-purple-700">
            <ArrowUp className="w-4 h-4" /> Entrada
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Medicamentos', valor: MOCK_ESTOQUE.length.toString(), sub: 'cadastrados', cor: 'text-gray-800' },
          { label: 'Alertas', valor: alertas.toString(), sub: 'itens críticos', cor: 'text-red-600' },
          { label: 'Vencendo em 15d', valor: vencendo15.toString(), sub: 'itens', cor: 'text-orange-600' },
          { label: 'Dispensados Mês', valor: '3.472', sub: 'unidades', cor: 'text-purple-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className={`text-2xl font-bold ${k.cor}`}>{k.valor}</p>
            <p className="text-xs font-medium text-gray-700 mt-0.5">{k.label}</p>
            <p className="text-xs text-gray-400">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Alertas críticos */}
      {MOCK_ESTOQUE.filter(m => m.status === 'VENCIDO' || m.diasValidade <= 15).length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-red-800 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Itens que requerem atenção imediata
          </p>
          <div className="space-y-1">
            {MOCK_ESTOQUE.filter(m => m.status === 'VENCIDO' || m.diasValidade <= 15).map(m => (
              <div key={m.id} className="flex items-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-full ${m.status === 'VENCIDO' ? 'bg-red-500' : 'bg-orange-400'}`} />
                <span className="text-gray-800">{m.nome} {m.concentracao} — {m.unidade}</span>
                {m.status === 'VENCIDO' ? (
                  <span className="text-red-600 font-medium">VENCIDO</span>
                ) : (
                  <span className="text-orange-600 font-medium">vence em {m.diasValidade} dia(s)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Abas + tabela */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-4">
          <div className="flex">
            {(['estoque', 'dispensacao', 'movimentacao'] as TabEstoque[]).map(t => (
              <button key={t} onClick={() => setAba(t)}
                className={`text-sm py-3 px-4 border-b-2 transition-colors ${aba === t ? 'border-purple-500 text-purple-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {t === 'estoque' ? 'Estoque' : t === 'dispensacao' ? 'Dispensações' : 'Movimentações'}
              </button>
            ))}
          </div>
        </div>

        {aba === 'estoque' && (
          <div className="p-4">
            {/* Filtros */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar medicamento..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
              </div>
              <div className="flex gap-1.5">
                {(['', 'DISPONIVEL', 'BAIXO_ESTOQUE', 'INDISPONIVEL', 'VENCIDO'] as (StatusEstoque | '')[]).map(s => {
                  const info = s ? STATUS_INFO[s] : null
                  return (
                    <button key={s || 'todos'} onClick={() => setFiltroStatus(s)}
                      className={`text-xs px-2 py-1.5 rounded-lg border transition-colors ${filtroStatus === s ? (s ? `${info!.bg} ${info!.cor} border-transparent` : 'bg-gray-900 text-white border-transparent') : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {s ? info!.label : 'Todos'}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500">Medicamento</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Estoque</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Mínimo</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Lote / Validade</th>
                    <th className="text-left py-2 pl-3 text-xs font-semibold text-gray-500">Unidade</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtrados.map(m => {
                    const si = STATUS_INFO[m.status]
                    const pctEstoque = m.qtMinima > 0 ? Math.min(100, (m.qtAtual / (m.qtMinima * 2)) * 100) : 100
                    return (
                      <tr key={m.id} className={`hover:bg-gray-50 ${m.status === 'VENCIDO' ? 'opacity-60' : ''}`}>
                        <td className="py-3 pr-4">
                          <p className="font-medium text-gray-900">{m.nome} {m.concentracao}
                            {m.controlado && <span className="ml-1 text-[10px] bg-orange-100 text-orange-700 px-1 rounded">C</span>}
                          </p>
                          <p className="text-xs text-gray-400">{m.forma}</p>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <p className={`font-bold ${m.qtAtual === 0 ? 'text-red-600' : m.qtAtual <= m.qtMinima ? 'text-orange-600' : 'text-gray-900'}`}>
                            {m.qtAtual.toLocaleString('pt-BR')}
                          </p>
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full mx-auto mt-1 overflow-hidden">
                            <div className={`h-full rounded-full ${pctEstoque <= 25 ? 'bg-red-500' : pctEstoque <= 50 ? 'bg-orange-400' : 'bg-green-500'}`} style={{ width: `${pctEstoque}%` }} />
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center text-xs text-gray-500">{m.qtMinima.toLocaleString('pt-BR')}</td>
                        <td className="py-3 px-3 text-center text-xs">
                          <p className="text-gray-700">{m.lote}</p>
                          <p className={`${m.diasValidade <= 15 ? 'text-red-600 font-medium' : m.diasValidade <= 60 ? 'text-orange-500' : 'text-gray-400'}`}>
                            {m.dataValidade}
                          </p>
                        </td>
                        <td className="py-3 pl-3 text-xs text-gray-600">{m.unidade}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${si.bg} ${si.cor}`}>
                            {si.icone}{si.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {aba === 'movimentacao' && (
          <div className="p-4 space-y-2">
            {MOVIMENTACOES.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.tipo === 'ENTRADA' ? 'bg-green-100' : 'bg-red-50'}`}>
                  {m.tipo === 'ENTRADA' ? <ArrowUp className="w-4 h-4 text-green-600" /> : <ArrowDown className="w-4 h-4 text-red-500" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{m.med}</p>
                  <p className="text-xs text-gray-400">{m.tipo === 'ENTRADA' ? 'Entrada' : `Dispensado para ${m.paciente}`} · {m.usuario} · {m.data}</p>
                </div>
                <div className="text-right text-xs">
                  <p className={`font-bold ${m.tipo === 'ENTRADA' ? 'text-green-600' : 'text-red-500'}`}>
                    {m.tipo === 'ENTRADA' ? '+' : '-'}{m.qtd}
                  </p>
                  <p className="text-gray-400">{m.antes} → {m.depois}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {aba === 'dispensacao' && (
          <div className="p-4 text-center py-16 text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Use o botão "Dispensar" para registrar uma saída</p>
          </div>
        )}
      </div>

      {/* Modal Entrada */}
      {modalEntrada && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><ArrowUp className="w-4 h-4 text-green-600" /> Entrada de Estoque</h2>
              <button onClick={() => setModalEntrada(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Medicamento *</label>
                <select className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
                  {MOCK_ESTOQUE.map(m => <option key={m.id}>{m.nome} {m.concentracao}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Quantidade *</label>
                  <input type="number" className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" placeholder="0" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Lote *</label>
                  <input className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" placeholder="Nº do lote" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Data de Validade *</label>
                  <input type="date" className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Fabricante</label>
                  <input className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" placeholder="Fabricante" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Unidade Destino *</label>
                  <select className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
                    <option>Farmácia Central</option><option>UBS Centro</option><option>USF Bairro Novo</option><option>UPA Municipal</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Estoque Mínimo</label>
                  <input type="number" className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" placeholder="100" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 pt-0">
              <button onClick={() => setModalEntrada(false)} className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button className="text-sm px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700">Registrar Entrada</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dispensação */}
      {modalDispensacao && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><ArrowDown className="w-4 h-4 text-purple-600" /> Dispensação</h2>
              <button onClick={() => setModalDispensacao(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Paciente *</label>
                <div className="relative mt-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="Buscar paciente..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Medicamento *</label>
                  <select className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
                    {MOCK_ESTOQUE.filter(m => m.status === 'DISPONIVEL' || m.status === 'BAIXO_ESTOQUE').map(m => (
                      <option key={m.id}>{m.nome} {m.concentracao} (saldo: {m.qtAtual})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Quantidade *</label>
                  <input type="number" min="1" className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" placeholder="0" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600">Observações</label>
                  <input className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" placeholder="Prescrição, posologia..." />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 pt-0">
              <button onClick={() => setModalDispensacao(false)} className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button className="text-sm px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700">Dispensar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
