'use client'
import { useState, useEffect } from 'react'
import AdminShell from '@/components/AdminShell'
import Link from 'next/link'
import { Inbox, Clock, CheckCircle, AlertTriangle, TrendingUp, BarChart2 } from 'lucide-react'

// ─── Dashboard Ouvidoria (Admin) ──────────────────────────────────────────────

type DashData = {
  kpis: {
    total: number; recebidas: number; emAnalise: number; aguardando: number
    respondidas: number; encerradas: number; vencendo48h: number; atrasadas: number
  }
  porTipo: Array<{ tipo: string; _count: { id: number } }>
  porSecretaria: Array<{ secretariaDestino: string; _count: { id: number } }>
  mediaSatisfacao: string | null
}

const TIPO_LABEL: Record<string, string> = {
  RECLAMACAO: 'Reclamação', SUGESTAO: 'Sugestão', ELOGIO: 'Elogio',
  DENUNCIA: 'Denúncia', SOLICITACAO_INFO: 'Solicit. Info', SOLICITACAO_SERVICO: 'Solicit. Serviço',
}

export default function OuvidoriaAdminPage() {
  const [data, setData]       = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ouvidoria/manifestacao?relatorio=DASHBOARD')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }, [])

  const kpiCards = data ? [
    { label: 'Total',          value: data.kpis.total,       bg: 'bg-gray-50   border-gray-200',   cor: 'text-gray-800'   },
    { label: 'Recebidas',      value: data.kpis.recebidas,   bg: 'bg-blue-50   border-blue-200',   cor: 'text-blue-700'   },
    { label: 'Em Análise',     value: data.kpis.emAnalise,   bg: 'bg-yellow-50 border-yellow-200', cor: 'text-yellow-700' },
    { label: 'Respondidas',    value: data.kpis.respondidas, bg: 'bg-teal-50   border-teal-200',   cor: 'text-teal-700'   },
    { label: 'Vencendo (48h)', value: data.kpis.vencendo48h, bg: 'bg-orange-50 border-orange-200', cor: 'text-orange-700' },
    { label: 'Atrasadas',      value: data.kpis.atrasadas,   bg: 'bg-red-50    border-red-200',    cor: 'text-red-700'    },
  ] : []

  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ouvidoria Municipal</h1>
            <p className="text-sm text-gray-500 mt-1">Lei 13.460/2017 · LAI 12.527/2011</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/ouvidoria/demandas" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2">
              <Inbox className="w-4 h-4" /> Demandas
            </Link>
            <Link href="/admin/ouvidoria/relatorios" className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2">
              <BarChart2 className="w-4 h-4" /> Relatórios
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Carregando…</div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {kpiCards.map(k => (
                <div key={k.label} className={`rounded-xl border p-4 ${k.bg}`}>
                  <p className="text-xs text-gray-500">{k.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${k.cor}`}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Satisfação e por tipo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Por tipo */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" /> Por Tipo
                </h2>
                {data?.porTipo && data.porTipo.length > 0 ? (
                  <div className="space-y-2">
                    {data.porTipo.map((t: any) => (
                      <div key={t.tipo} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{TIPO_LABEL[t.tipo] ?? t.tipo}</span>
                        <span className="font-semibold text-gray-900">
                          {t._count?.id ?? t['_count(id)'] ?? 0}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Sem dados</p>
                )}
              </div>

              {/* Satisfação */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" /> Satisfação Média
                </h2>
                {data?.mediaSatisfacao ? (
                  <div className="flex items-center gap-4 mt-4">
                    <span className="text-5xl font-bold text-green-600">{data.mediaSatisfacao}</span>
                    <div>
                      <p className="text-sm text-gray-500">em 5.0</p>
                      <p className="text-xs text-gray-400 mt-1">baseado nas avaliações dos cidadãos</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 mt-2">Nenhuma avaliação registrada</p>
                )}
              </div>
            </div>

            {/* Alertas */}
            {data && data.kpis.atrasadas > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 items-start">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-800">
                    {data.kpis.atrasadas} manifestação(ões) com prazo vencido
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    Responda imediatamente para evitar irregularidade perante a LAI.{' '}
                    <Link href="/admin/ouvidoria/demandas" className="underline">Ver demandas →</Link>
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminShell>
  )
}
