'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Handshake, Plus, DollarSign, CheckCircle2, Clock,
  TrendingUp, Building2, Loader2, AlertCircle, PlayCircle
} from 'lucide-react'

const fmtMoeda = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })
const fmtData  = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

const STATUS_COR: Record<string,string> = {
  VIGENTE:'bg-green-100 text-green-800',
  EM_EXECUCAO:'bg-blue-100 text-blue-800',
  CELEBRADO:'bg-indigo-100 text-indigo-800',
  CONCLUIDO:'bg-gray-100 text-gray-700',
  SUSPENSO:'bg-yellow-100 text-yellow-800',
  RESCINDIDO:'bg-red-200 text-red-900',
}
const STATUS_LABEL: Record<string,string> = {
  VIGENTE:'Vigente', EM_EXECUCAO:'Em Execução', CELEBRADO:'Celebrado',
  CONCLUIDO:'Concluído', SUSPENSO:'Suspenso', RESCINDIDO:'Rescindido'
}

export default function ConveniosDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/convenios/convenio?stats=1')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const contarStatus = (s: string) =>
    stats?.porStatus?.find((x: any) => x.status === s)?.total ?? 0
  const total = stats?.porStatus?.reduce((a: number, x: any) => a + Number(x.total), 0) ?? 0
  const totais = stats?.totais ?? {}

  const vigentes   = Number(contarStatus('VIGENTE')) + Number(contarStatus('EM_EXECUCAO'))
  const celebrados = Number(contarStatus('CELEBRADO'))
  const concluidos = Number(contarStatus('CONCLUIDO'))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin w-8 h-8 text-indigo-600" />
    </div>
  )

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Handshake className="w-6 h-6 text-indigo-600" />
            Convênios e Parcerias
          </h1>
          <p className="text-gray-500 mt-1">Gestão de convênios federais, estaduais e intergovernamentais</p>
        </div>
        <Link href="/gestao/convenios/novo"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" />
          Novo Convênio
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:'Total', value: total,     Icon: Handshake,    cor:'text-indigo-600' },
          { label:'Em Execução / Vigentes', value: vigentes,  Icon: PlayCircle,  cor:'text-blue-600' },
          { label:'Celebrados', value: celebrados, Icon: CheckCircle2, cor:'text-indigo-600' },
          { label:'Concluídos', value: concluidos, Icon: TrendingUp,   cor:'text-gray-600' },
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

      {/* Valores totais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label:'Valor Total dos Convênios', value: totais.totalValor,       cor:'text-indigo-700', bg:'bg-indigo-50 border-indigo-200' },
          { label:'Total Repasse (Externo)',   value: totais.totalRepasse,     cor:'text-green-700',  bg:'bg-green-50 border-green-200' },
          { label:'Total Desembolsado',        value: totais.totalDesembolsado,cor:'text-orange-700', bg:'bg-orange-50 border-orange-200' },
        ].map(({ label, value, cor, bg }) => (
          <div key={label} className={`${bg} border rounded-xl p-4 flex items-center gap-4`}>
            <DollarSign className={`w-6 h-6 ${cor} flex-shrink-0`} />
            <div>
              <p className={`text-xs font-medium uppercase tracking-wide ${cor}`}>{label}</p>
              <p className={`text-xl font-bold ${cor}`}>{fmtMoeda(Number(value ?? 0))}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Atalhos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { href:'/gestao/convenios/lista',                      label:'Todos os Convênios',  Icon: Handshake,    cor:'bg-indigo-50 border-indigo-200 text-indigo-700' },
          { href:'/gestao/convenios/lista?status=EM_EXECUCAO',   label:'Em Execução',         Icon: PlayCircle,   cor:'bg-blue-50 border-blue-200 text-blue-700' },
          { href:'/gestao/convenios/lista?status=VIGENTE',       label:'Vigentes',            Icon: CheckCircle2, cor:'bg-green-50 border-green-200 text-green-700' },
          { href:'/gestao/convenios/lista?status=CELEBRADO',     label:'Celebrados',          Icon: Building2,    cor:'bg-purple-50 border-purple-200 text-purple-700' },
          { href:'/gestao/convenios/lista?status=CONCLUIDO',     label:'Concluídos',          Icon: TrendingUp,   cor:'bg-gray-50 border-gray-200 text-gray-700' },
          { href:'/gestao/convenios/novo',                       label:'Novo Convênio',       Icon: Plus,         cor:'bg-emerald-50 border-emerald-200 text-emerald-700' },
        ].map(({ href, label, Icon, cor }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-3 p-4 rounded-xl border ${cor} hover:opacity-80 transition-opacity`}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        ))}
      </div>

      {/* Por status */}
      {stats?.porStatus?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-indigo-600" />
            Por Situação
          </h2>
          <div className="space-y-2">
            {stats.porStatus.map((t: any) => {
              const pct = total > 0 ? Math.round(Number(t.total) / total * 100) : 0
              return (
                <div key={t.status} className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 w-28 text-center ${STATUS_COR[t.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width:`${pct}%` }} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 w-6 text-right">{t.total}</span>
                  <span className="text-xs text-gray-400 w-32 text-right">{fmtMoeda(Number(t.totalValor))}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recentes */}
      {stats?.recentes?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Convênios Recentes
            </h2>
            <Link href="/gestao/convenios/lista" className="text-xs text-indigo-600 hover:underline">Ver todos →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentes.map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-xs font-mono font-semibold text-indigo-600">{c.numero}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COR[c.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 truncate">{c.objeto}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.concedente}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-indigo-700">{fmtMoeda(Number(c.valorTotal))}</p>
                  <p className="text-xs text-gray-400">até {fmtData(c.dataFim)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!total && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Handshake className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum convênio registrado</p>
          <Link href="/gestao/convenios/novo"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
            <Plus className="w-4 h-4" />
            Registrar primeiro convênio
          </Link>
        </div>
      )}
    </div>
  )
}
