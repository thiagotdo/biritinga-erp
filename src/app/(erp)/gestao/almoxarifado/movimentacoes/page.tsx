'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, ArrowDownToLine, ArrowUpFromLine, RefreshCw, Loader2 } from 'lucide-react'

const fmtData = (d: string) => d ? new Date(d).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' }) : '—'

const TIPO_LABEL: Record<string,string> = {
  ENTRADA:'Entrada', SAIDA:'Saída', AJUSTE:'Ajuste', DEVOLUCAO:'Devolução'
}
const TIPO_COR: Record<string,string> = {
  ENTRADA:'bg-green-100 text-green-800',
  SAIDA:'bg-orange-100 text-orange-800',
  AJUSTE:'bg-blue-100 text-blue-800',
  DEVOLUCAO:'bg-purple-100 text-purple-800',
}
const TIPO_ICON: Record<string, any> = {
  ENTRADA: ArrowDownToLine, SAIDA: ArrowUpFromLine,
  AJUSTE: RefreshCw, DEVOLUCAO: RefreshCw,
}

export default function MovimentacoesPage() {
  const [movs, setMovs]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro]   = useState('')

  useEffect(() => {
    setLoading(true)
    const qs = filtro ? `tipo=${filtro}` : ''
    fetch(`/api/almoxarifado/movimentacao?${qs}`)
      .then(r => r.json())
      .then(d => { setMovs(d.movimentacoes ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filtro])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/gestao/almoxarifado" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <Package className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Movimentações de Estoque</h1>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {['', 'ENTRADA', 'SAIDA', 'AJUSTE', 'DEVOLUCAO'].map(t => (
          <button
            key={t}
            onClick={() => setFiltro(t)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filtro === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {t ? TIPO_LABEL[t] : 'Todos'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>
      ) : movs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <RefreshCw className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhuma movimentação registrada</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Item</th>
                <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase">Qtd</th>
                <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Anterior</th>
                <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Posterior</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Motivo/Setor</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {movs.map((m: any) => {
                const Icon = TIPO_ICON[m.tipo] ?? RefreshCw
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_COR[m.tipo] ?? 'bg-gray-100 text-gray-700'}`}>
                        <Icon className="w-3 h-3" />
                        {TIPO_LABEL[m.tipo] ?? m.tipo}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-gray-900 truncate max-w-xs">{m.itemNome}</div>
                      {m.fornecedor && <div className="text-xs text-gray-400">{m.fornecedor}</div>}
                      {m.numeroNF && <div className="text-xs text-gray-400">NF: {m.numeroNF}</div>}
                    </td>
                    <td className="p-3 text-right font-semibold">
                      {Number(m.quantidade).toLocaleString('pt-BR',{maximumFractionDigits:3})} <span className="text-gray-400 font-normal text-xs">{m.unidade}</span>
                    </td>
                    <td className="p-3 text-right text-gray-500 hidden md:table-cell text-xs">
                      {Number(m.quantidadeAnterior).toLocaleString('pt-BR',{maximumFractionDigits:3})}
                    </td>
                    <td className="p-3 text-right font-medium text-gray-700 hidden md:table-cell text-xs">
                      {Number(m.quantidadePosterior).toLocaleString('pt-BR',{maximumFractionDigits:3})}
                    </td>
                    <td className="p-3 text-gray-500 text-xs hidden lg:table-cell">
                      {m.motivo || m.setor || m.solicitante || '—'}
                    </td>
                    <td className="p-3 text-xs text-gray-400 whitespace-nowrap">{fmtData(m.dataMovimento)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
