'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Plane, Plus, DollarSign, Users, CheckCircle2, Clock,
  TrendingUp, MapPin, Loader2
} from 'lucide-react'

const fmtData = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'
const fmtMoeda = (v: number) => Number(v).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })

const STATUS_COR: Record<string,string> = {
  SOLICITADA:   'bg-blue-100 text-blue-800',
  APROVADA:     'bg-green-100 text-green-800',
  EM_ANDAMENTO: 'bg-yellow-100 text-yellow-800',
  CONCLUIDA:    'bg-gray-100 text-gray-700',
  CANCELADA:    'bg-red-100 text-red-800',
}
const STATUS_LABEL: Record<string,string> = {
  SOLICITADA:'Solicitada', APROVADA:'Aprovada', EM_ANDAMENTO:'Em Andamento',
  CONCLUIDA:'Concluída', CANCELADA:'Cancelada'
}

export default function DiariasDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/diarias/viagem?stats=1')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const contarStatus = (s: string) =>
    stats?.porStatus?.find((x: any) => x.status === s)?.total ?? 0
  const total = stats?.porStatus?.reduce((a: number, x: any) => a + Number(x.total), 0) ?? 0

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin w-8 h-8 text-sky-600" />
    </div>
  )

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Plane className="w-6 h-6 text-sky-600" />
            Diárias e Viagens
          </h1>
          <p className="text-gray-500 mt-1">Controle de deslocamentos e diárias dos servidores</p>
        </div>
        <Link
          href="/gestao/diarias/viagens/nova"
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Nova Viagem
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:'Total', value: total, Icon: Plane, cor:'text-sky-600' },
          { label:'Solicitadas', value: contarStatus('SOLICITADA'), Icon: Clock, cor:'text-blue-600' },
          { label:'Aprovadas', value: contarStatus('APROVADA'), Icon: CheckCircle2, cor:'text-green-600' },
          { label:'Concluídas', value: contarStatus('CONCLUIDA'), Icon: TrendingUp, cor:'text-gray-600' },
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

      {/* Total gasto */}
      {stats?.totalGasto > 0 && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-sky-100 rounded-lg">
            <DollarSign className="w-6 h-6 text-sky-700" />
          </div>
          <div>
            <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Total pago em diárias (viagens concluídas)</p>
            <p className="text-2xl font-bold text-sky-900">{fmtMoeda(stats.totalGasto)}</p>
          </div>
        </div>
      )}

      {/* Atalhos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { href:'/gestao/diarias/viagens',                    label:'Todas as Viagens',       Icon: Plane,       cor:'bg-sky-50 border-sky-200 text-sky-700' },
          { href:'/gestao/diarias/viagens?status=SOLICITADA',  label:'Aguardando Aprovação',    Icon: Clock,       cor:'bg-blue-50 border-blue-200 text-blue-700' },
          { href:'/gestao/diarias/viagens?status=APROVADA',    label:'Aprovadas',               Icon: CheckCircle2,cor:'bg-green-50 border-green-200 text-green-700' },
          { href:'/gestao/diarias/viagens?status=EM_ANDAMENTO',label:'Em Andamento',            Icon: MapPin,      cor:'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { href:'/gestao/diarias/viagens?status=CONCLUIDA',   label:'Concluídas',              Icon: TrendingUp,  cor:'bg-gray-50 border-gray-200 text-gray-700' },
          { href:'/gestao/diarias/viagens/nova',               label:'Nova Viagem',             Icon: Plus,        cor:'bg-emerald-50 border-emerald-200 text-emerald-700' },
        ].map(({ href, label, Icon, cor }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-3 p-4 rounded-xl border ${cor} hover:opacity-80 transition-opacity`}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        ))}
      </div>

      {/* Viagens recentes */}
      {stats?.recentes?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-600" />
              Viagens Recentes
            </h2>
            <Link href="/gestao/diarias/viagens" className="text-xs text-sky-600 hover:underline">Ver todas →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentes.map((v: any) => (
              <div key={v.id} className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-xs font-mono font-semibold text-sky-600">{v.numero}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COR[v.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABEL[v.status] ?? v.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 truncate">{v.servidorNome}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{v.destino}</span>
                    <span>{fmtData(v.dataPartida)} → {fmtData(v.dataRetorno)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-sky-700">{fmtMoeda(Number(v.valorTotal))}</p>
                  <p className="text-xs text-gray-400">{v.quantidadeDiarias} diária(s)</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!total && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Plane className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma viagem registrada</p>
          <Link href="/gestao/diarias/viagens/nova"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm font-medium">
            <Plus className="w-4 h-4" />
            Registrar primeira viagem
          </Link>
        </div>
      )}
    </div>
  )
}
