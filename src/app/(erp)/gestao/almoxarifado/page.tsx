'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Package, PackagePlus, ArrowDownToLine, ArrowUpFromLine,
  AlertTriangle, Boxes, Loader2, TrendingDown, ClipboardList
} from 'lucide-react'

const fmtQtd = (n: any, unidade = 'UN') =>
  `${Number(n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} ${unidade}`

const CAT_LABEL: Record<string, string> = {
  MATERIAL_CONSUMO: 'Material de Consumo',
  MATERIAL_PERMANENTE: 'Material Permanente',
  MEDICAMENTO: 'Medicamento',
  LIMPEZA: 'Limpeza/Higiene',
  ESCRITORIO: 'Escritório',
  INFORMATICA: 'Informática',
  OUTRO: 'Outro',
}

const CAT_COR: Record<string, string> = {
  MATERIAL_CONSUMO: 'bg-blue-100 text-blue-800',
  MATERIAL_PERMANENTE: 'bg-purple-100 text-purple-800',
  MEDICAMENTO: 'bg-red-100 text-red-800',
  LIMPEZA: 'bg-green-100 text-green-800',
  ESCRITORIO: 'bg-yellow-100 text-yellow-800',
  INFORMATICA: 'bg-indigo-100 text-indigo-800',
  OUTRO: 'bg-gray-100 text-gray-700',
}

export default function AlmoxarifadoDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/almoxarifado/item?stats=1')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const atalhos = [
    { href: '/gestao/almoxarifado/estoque',       label: 'Estoque de Itens',  Icon: Boxes,          cor: 'bg-blue-50 border-blue-200 text-blue-700'   },
    { href: '/gestao/almoxarifado/movimentacoes', label: 'Movimentações',     Icon: ClipboardList,  cor: 'bg-green-50 border-green-200 text-green-700' },
    { href: '/gestao/almoxarifado/estoque?acao=entrada', label: 'Dar Entrada', Icon: ArrowDownToLine, cor: 'bg-teal-50 border-teal-200 text-teal-700' },
    { href: '/gestao/almoxarifado/estoque?acao=saida',   label: 'Dar Saída',   Icon: ArrowUpFromLine, cor: 'bg-orange-50 border-orange-200 text-orange-700' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
    </div>
  )

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            Almoxarifado
          </h1>
          <p className="text-gray-500 mt-1">Controle de estoque, entradas e saídas de materiais</p>
        </div>
        <Link
          href="/gestao/almoxarifado/estoque?acao=novo"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <PackagePlus className="w-4 h-4" />
          Novo Item
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total de Itens',  value: stats?.totalItens   ?? 0, Icon: Boxes,         cor: 'text-blue-600'  },
          { label: 'Baixo Estoque',   value: stats?.baixoEstoque ?? 0, Icon: TrendingDown,  cor: 'text-yellow-600', alerta: (stats?.baixoEstoque ?? 0) > 0 },
          { label: 'Sem Estoque',     value: stats?.semEstoque   ?? 0, Icon: AlertTriangle, cor: 'text-red-600',    alerta: (stats?.semEstoque ?? 0) > 0 },
        ].map(({ label, value, Icon, cor, alerta }) => (
          <div key={label} className={`rounded-xl border p-4 shadow-sm ${alerta ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
            <div className={`flex items-center gap-2 mb-1 ${cor}`}>
              <Icon className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{Number(value).toLocaleString('pt-BR')}</p>
          </div>
        ))}
      </div>

      {/* Atalhos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {atalhos.map(({ href, label, Icon, cor }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${cor} hover:opacity-80 transition-opacity`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium text-center">{label}</span>
          </Link>
        ))}
      </div>

      {/* Por categoria */}
      {stats?.porCategoria?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Distribuição por Categoria</h2>
          <div className="space-y-2">
            {stats.porCategoria.map((c: any) => (
              <div key={c.categoria} className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-40 text-center truncate ${CAT_COR[c.categoria] ?? 'bg-gray-100 text-gray-700'}`}>
                  {CAT_LABEL[c.categoria] ?? c.categoria}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full"
                    style={{ width: stats?.totalItens > 0 ? `${(Number(c.total) / stats.totalItens) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700 w-8 text-right">{Number(c.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {!stats?.totalItens && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum item cadastrado ainda</p>
          <p className="text-sm text-gray-400 mt-1">Comece cadastrando os materiais do almoxarifado</p>
          <Link
            href="/gestao/almoxarifado/estoque?acao=novo"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <PackagePlus className="w-4 h-4" />
            Cadastrar primeiro item
          </Link>
        </div>
      )}
    </div>
  )
}
