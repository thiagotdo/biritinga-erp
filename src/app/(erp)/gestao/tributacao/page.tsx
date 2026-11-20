'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Users, FileText, AlertCircle, ChevronRight, Loader2, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function TributacaoDashboard() {
  const [kpis, setKpis] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/tributacao/contribuinte').then(r => r.json()),
      fetch('/api/tributacao/debito').then(r => r.json()),
      fetch('/api/tributacao/parcelamento').then(r => r.json()),
    ]).then(([contrib, debito, parcela]) => {
      setKpis({
        contribuintes: contrib.total ?? contrib.contribuintes?.length ?? 0,
        debitosAbertos: debito.debitos?.length ?? 0,
        parcelamentosAtivos: parcela.parcelamentos?.length ?? 0,
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const atalhos = [
    { href: '/gestao/tributacao/contribuinte', label: 'Contribuintes', Icon: Users },
    { href: '/gestao/tributacao/iptu', label: 'IPTU', Icon: FileText },
    { href: '/gestao/tributacao/iss', label: 'ISS', Icon: FileText },
    { href: '/gestao/tributacao/divida', label: 'Dívida Ativa', Icon: AlertCircle },
    { href: '/gestao/tributacao/contribuintes', label: 'Gestão de Débitos', Icon: DollarSign },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
    </div>
  )

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel Tributação</h1>
        <p className="text-gray-500 mt-1">Gestão de tributos, contribuintes e arrecadação</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center gap-2 mb-2 text-blue-700">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium">Contribuintes Cadastrados</span>
          </div>
          <div className="text-3xl font-bold text-blue-800">{(kpis?.contribuintes ?? 0).toLocaleString('pt-BR')}</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-center gap-2 mb-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Débitos em Aberto</span>
          </div>
          <div className="text-3xl font-bold text-red-800">{(kpis?.debitosAbertos ?? 0).toLocaleString('pt-BR')}</div>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
          <div className="flex items-center gap-2 mb-2 text-yellow-700">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Parcelamentos Ativos</span>
          </div>
          <div className="text-3xl font-bold text-yellow-800">{(kpis?.parcelamentosAtivos ?? 0).toLocaleString('pt-BR')}</div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Acesso Rápido</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
