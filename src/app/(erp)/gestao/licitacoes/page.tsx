'use client'

import { useState, useEffect } from 'react'
import { FileText, DollarSign, CheckCircle, Clock, ChevronRight, Loader2, Building2 } from 'lucide-react'
import Link from 'next/link'

export default function LicitacoesDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/licitacoes/licitacao').then(r => r.json()),
      fetch('/api/licitacoes/contrato').then(r => r.json()),
    ]).then(([lic, cont]) => {
      setData({
        totalLicitacoes: lic.total ?? lic.licitacoes?.length ?? 0,
        licitacoes: lic.licitacoes?.slice(0, 5) ?? [],
        totalContratos: cont.contratos?.length ?? 0,
        contratos: cont.contratos?.slice(0, 5) ?? [],
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const fmtMoeda = (v: number) =>
    v ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'

  const atalhos = [
    { href: '/gestao/licitacoes/licitacoes', label: 'Licitações', Icon: FileText },
    { href: '/gestao/licitacoes/contratos', label: 'Contratos', Icon: CheckCircle },
    { href: '/gestao/licitacoes/processos', label: 'Processos', Icon: Clock },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
    </div>
  )

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel Licitações</h1>
        <p className="text-gray-500 mt-1">Processos licitatórios e contratos administrativos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center gap-2 mb-2 text-blue-700">
            <FileText className="w-4 h-4" />
            <span className="text-xs font-medium">Total de Licitações</span>
          </div>
          <div className="text-3xl font-bold text-blue-800">{(data?.totalLicitacoes ?? 0).toLocaleString('pt-BR')}</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <div className="flex items-center gap-2 mb-2 text-green-700">
            <Building2 className="w-4 h-4" />
            <span className="text-xs font-medium">Contratos Vigentes</span>
          </div>
          <div className="text-3xl font-bold text-green-800">{(data?.totalContratos ?? 0).toLocaleString('pt-BR')}</div>
        </div>
      </div>

      {/* Últimas licitações */}
      {data?.licitacoes?.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Últimas Licitações</h2>
          <div className="divide-y divide-gray-100">
            {data.licitacoes.map((l: any) => (
              <div key={l.id} className="py-2 flex items-start justify-between text-sm">
                <div>
                  <div className="font-medium text-gray-800">{l.numero}</div>
                  <div className="text-gray-500 text-xs truncate max-w-xs">{l.objeto}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    l.status === 'CONCLUIDA' ? 'bg-green-100 text-green-700' :
                    l.status === 'EM_ANDAMENTO' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{l.status}</span>
                  <span className="text-xs text-gray-400">{fmtMoeda(l.valorEstimado)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Últimos contratos vigentes */}
      {data?.contratos?.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Contratos Vigentes</h2>
          <div className="divide-y divide-gray-100">
            {data.contratos.map((c: any) => (
              <div key={c.id} className="py-2 flex items-start justify-between text-sm">
                <div>
                  <div className="font-medium text-gray-800">{c.numero}</div>
                  <div className="text-gray-500 text-xs">{c.contratadoNome}</div>
                </div>
                <div className="text-xs font-medium text-gray-700">{fmtMoeda(c.valorTotal)}</div>
              </div>
            ))}
          </div>
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
