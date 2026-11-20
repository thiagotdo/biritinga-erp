'use client'

import { useState, useEffect } from 'react'
import { HardHat, CheckCircle, Clock, AlertCircle, ChevronRight, Loader2, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function ObrasDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/obras/obra')
      .then(r => r.json())
      .then(d => {
        const obras = d.obras ?? []
        setData({
          total: d.total ?? obras.length,
          emAndamento: obras.filter((o: any) => o.status === 'EM_ANDAMENTO').length,
          concluidas: obras.filter((o: any) => o.status === 'CONCLUIDA').length,
          planejadas: obras.filter((o: any) => o.status === 'PLANEJADA' || !o.status).length,
          obras: obras.slice(0, 6),
        })
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [])

  const fmtMoeda = (v: number) =>
    v ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'

  const atalhos = [
    { href: '/gestao/obras/obras', label: 'Obras', Icon: HardHat },
    { href: '/gestao/obras/alvaras', label: 'Alvarás', Icon: CheckCircle },
    { href: '/gestao/obras/contratos', label: 'Contratos', Icon: AlertCircle },
  ]

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      EM_ANDAMENTO: 'bg-blue-100 text-blue-700',
      CONCLUIDA: 'bg-green-100 text-green-700',
      PLANEJADA: 'bg-yellow-100 text-yellow-700',
      PARALISADA: 'bg-red-100 text-red-700',
    }
    return map[s] ?? 'bg-gray-100 text-gray-600'
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
    </div>
  )

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel Obras</h1>
        <p className="text-gray-500 mt-1">Gestão de obras, engenharia e fiscalização</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 mb-2 text-blue-700">
            <HardHat className="w-4 h-4" />
            <span className="text-xs font-medium">Total</span>
          </div>
          <div className="text-2xl font-bold text-blue-800">{data?.total ?? 0}</div>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <div className="flex items-center gap-2 mb-2 text-indigo-700">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium">Em Andamento</span>
          </div>
          <div className="text-2xl font-bold text-indigo-800">{data?.emAndamento ?? 0}</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2 mb-2 text-green-700">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Concluídas</span>
          </div>
          <div className="text-2xl font-bold text-green-800">{data?.concluidas ?? 0}</div>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center gap-2 mb-2 text-yellow-700">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Planejadas</span>
          </div>
          <div className="text-2xl font-bold text-yellow-800">{data?.planejadas ?? 0}</div>
        </div>
      </div>

      {data?.obras?.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Obras Recentes</h2>
          <div className="divide-y divide-gray-100">
            {data.obras.map((o: any) => (
              <div key={o.id} className="py-3 flex items-start justify-between text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 truncate">{o.nome}</div>
                  <div className="text-gray-500 text-xs">{o.bairro ?? o.endereco ?? '—'} · {fmtMoeda(o.valorContrato)}</div>
                  {o.percentualConcluido > 0 && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${o.percentualConcluido}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{o.percentualConcluido}%</span>
                    </div>
                  )}
                </div>
                <span className={`ml-3 text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(o.status ?? 'PLANEJADA')}`}>
                  {o.status ?? 'PLANEJADA'}
                </span>
              </div>
            ))}
          </div>
          <Link href="/gestao/obras/obras" className="text-xs text-blue-600 hover:underline mt-2 block">
            Ver todas →
          </Link>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Acesso Rápido</h2>
        <div className="grid grid-cols-3 gap-2">
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
