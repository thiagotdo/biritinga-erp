'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowRightLeft, FilePlus2, Clock, CheckCircle,
  FileText, Loader2, TrendingUp, Archive
} from 'lucide-react'

const fmtData = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

const STATUS_COR: Record<string, string> = {
  ABERTO:     'bg-blue-100 text-blue-800',
  EM_ANALISE: 'bg-yellow-100 text-yellow-800',
  DEFERIDO:   'bg-green-100 text-green-800',
  INDEFERIDO: 'bg-red-100 text-red-800',
  CANCELADO:  'bg-orange-100 text-orange-800',
  ARQUIVADO:  'bg-gray-100 text-gray-700',
}

const STATUS_LABEL: Record<string, string> = {
  ABERTO:     'Aberto',
  EM_ANALISE: 'Em Análise',
  DEFERIDO:   'Deferido',
  INDEFERIDO: 'Indeferido',
  CANCELADO:  'Cancelado',
  ARQUIVADO:  'Arquivado',
}

export default function ProtocoloDashboard() {
  const [stats, setStats]     = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/protocolo/v2?stats=1')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const totalPorStatus = (s: string) =>
    stats?.totais?.find((t: any) => t.status === s)?.total ?? 0

  const total = stats?.totais?.reduce((a: number, t: any) => a + Number(t.total), 0) ?? 0

  const atalhos = [
    { href: '/gestao/protocolo/processos',    label: 'Todos os Processos', Icon: FileText,       cor: 'bg-blue-50 border-blue-200 text-blue-700'   },
    { href: '/gestao/protocolo/novo',         label: 'Novo Protocolo',     Icon: FilePlus2,      cor: 'bg-green-50 border-green-200 text-green-700' },
    { href: '/gestao/protocolo/processos?status=EM_ANALISE', label: 'Em Análise', Icon: ArrowRightLeft, cor: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
    { href: '/gestao/protocolo/processos?status=ARQUIVADO',  label: 'Arquivados',  Icon: Archive,        cor: 'bg-gray-50 border-gray-200 text-gray-700'         },
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
            <ArrowRightLeft className="w-6 h-6 text-blue-600" />
            Protocolo Eletrônico
          </h1>
          <p className="text-gray-500 mt-1">Tramitação de processos e documentos administrativos</p>
        </div>
        <Link
          href="/gestao/protocolo/novo"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <FilePlus2 className="w-4 h-4" />
          Novo Protocolo
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total',      value: total,                          Icon: FileText,       cor: 'text-blue-600'   },
          { label: 'Abertos',    value: totalPorStatus('ABERTO'),       Icon: FilePlus2,      cor: 'text-blue-500'   },
          { label: 'Em Análise', value: totalPorStatus('EM_ANALISE'),   Icon: ArrowRightLeft, cor: 'text-yellow-600' },
          { label: 'Deferidos',  value: totalPorStatus('DEFERIDO'),     Icon: CheckCircle,    cor: 'text-green-600'  },
        ].map(({ label, value, Icon, cor }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
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

      {/* Recentes */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Protocolos Recentes</h2>
          <Link href="/gestao/protocolo/processos" className="text-xs text-blue-600 hover:underline">
            Ver todos →
          </Link>
        </div>
        {stats?.recentes?.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {stats.recentes.map((p: any) => (
              <Link
                key={p.id}
                href={`/gestao/protocolo/processos?id=${p.id}`}
                className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono font-semibold text-blue-600">{p.numero}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COR[p.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                    {p.prioridade === 'URGENTE' && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">Urgente</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 font-medium truncate">{p.assunto}</p>
                  {p.interessado && (
                    <p className="text-xs text-gray-500 truncate">{p.interessado}</p>
                  )}
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap">
                  {fmtData(p.criadoEm)}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">
            <Archive className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum protocolo cadastrado</p>
            <Link href="/gestao/protocolo/novo" className="text-xs text-blue-600 mt-1 inline-block hover:underline">
              Criar primeiro protocolo →
            </Link>
          </div>
        )}
      </div>

      {/* Resumo por status */}
      {stats?.totais?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            Situação dos Processos
          </h2>
          <div className="space-y-2">
            {stats.totais.map((t: any) => (
              <div key={t.status} className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-28 text-center ${STATUS_COR[t.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {STATUS_LABEL[t.status] ?? t.status}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full"
                    style={{ width: total > 0 ? `${(Number(t.total) / total) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700 w-8 text-right">{Number(t.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
