'use client'

import { useState, useEffect } from 'react'
import { Package, DollarSign, BarChart3, ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function PatrimonioDashboard() {
  const [inv, setInv] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/patrimonio/inventario')
      .then(r => r.json())
      .then(d => { setInv(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const fmtMoeda = (v: number) =>
    v ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'

  const atalhos = [
    { href: '/gestao/patrimonio/bens', label: 'Bens Patrimoniais', Icon: Package },
    { href: '/gestao/patrimonio/inventario', label: 'Inventário', Icon: BarChart3 },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
    </div>
  )

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel Patrimônio</h1>
        <p className="text-gray-500 mt-1">Gestão de bens patrimoniais do município</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center gap-2 mb-2 text-blue-700">
            <Package className="w-4 h-4" />
            <span className="text-xs font-medium">Total de Bens</span>
          </div>
          <div className="text-3xl font-bold text-blue-800">{(inv?.totais?.total ?? 0).toLocaleString('pt-BR')}</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <div className="flex items-center gap-2 mb-2 text-green-700">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium">Valor de Aquisição</span>
          </div>
          <div className="text-xl font-bold text-green-800">{fmtMoeda(inv?.totais?.valorAquisicao ?? 0)}</div>
        </div>
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
          <div className="flex items-center gap-2 mb-2 text-purple-700">
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs font-medium">Valor Atual</span>
          </div>
          <div className="text-xl font-bold text-purple-800">{fmtMoeda(inv?.totais?.valorTotal ?? 0)}</div>
        </div>
      </div>

      {inv?.categorias?.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Por Categoria</h2>
          <div className="divide-y divide-gray-100">
            {inv.categorias.map((c: any) => (
              <div key={c.categoria ?? 'sem-categoria'} className="py-2 flex items-center justify-between text-sm">
                <div className="font-medium text-gray-800">{c.categoria ?? 'Sem categoria'}</div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-500">{c.total} bens</span>
                  <span className="font-medium text-gray-700">{fmtMoeda(c.valorTotal)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Acesso Rápido</h2>
        <div className="grid grid-cols-2 gap-2">
          {atalhos.map(({ href, label, Icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700">
              <Icon className="w-4 h-4 text-blue-600" />
              {label}
              <ChevronRight className="w-3 h-3 ml-auto text-gray-400" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
