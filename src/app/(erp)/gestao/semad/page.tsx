'use client'

import { useState, useEffect } from 'react'
import {
  Users, UserCheck, UserX, Briefcase, Calendar,
  AlertCircle, ChevronRight, Building2,
  Clock, BarChart3, Loader2,
} from 'lucide-react'
import Link from 'next/link'

interface DashboardData {
  kpis: {
    totalServidores: number
    ativos: number
    emFerias: number
    afastados: number
    efetivos: number
    comissionados: number
    pcd: number
    totalCargos: number
    feriasAtivas: number
    folhaBruto: number
    folhaLiquido: number
    folhaStatus: string | null
  }
  secretarias: { secretaria: string; total: number }[]
}

export default function SemadDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/semad/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setErro(e.message); setLoading(false) })
  }, [])

  const fmtMoeda = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
    </div>
  )
  if (erro || !data) return (
    <div className="p-8 text-red-600">Erro ao carregar dashboard: {erro}</div>
  )

  const { kpis, secretarias } = data

  const cards = [
    { label: 'Total de Servidores', value: kpis.totalServidores, Icon: Users, cor: 'blue' },
    { label: 'Ativos', value: kpis.ativos, Icon: UserCheck, cor: 'green' },
    { label: 'Em Férias', value: kpis.emFerias, Icon: Calendar, cor: 'yellow' },
    { label: 'Afastados', value: kpis.afastados, Icon: UserX, cor: 'red' },
    { label: 'Efetivos', value: kpis.efetivos, Icon: Building2, cor: 'indigo' },
    { label: 'Comissionados', value: kpis.comissionados, Icon: Briefcase, cor: 'purple' },
    { label: 'Cargos Ativos', value: kpis.totalCargos, Icon: BarChart3, cor: 'teal' },
    { label: 'Férias no Mês', value: kpis.feriasAtivas, Icon: Clock, cor: 'orange' },
  ]

  const corMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
  }

  const atalhos = [
    { href: '/gestao/semad/servidores', label: 'Servidores', Icon: Users },
    { href: '/gestao/semad/cargos', label: 'Cargos', Icon: Briefcase },
    { href: '/gestao/semad/ferias', label: 'Férias', Icon: Calendar },
    { href: '/gestao/semad/frequencia', label: 'Frequência', Icon: Clock },
    { href: '/gestao/semad/contrato', label: 'Contratos', Icon: AlertCircle },
    { href: '/gestao/folha', label: 'Folha de Pagamento', Icon: BarChart3 },
  ]

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel SEMAD</h1>
        <p className="text-gray-500 mt-1">Secretaria Municipal de Administração</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map(({ label, value, Icon, cor }) => (
          <div key={label} className={`rounded-xl border p-4 ${corMap[cor]}`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4" />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <div className="text-2xl font-bold">{value.toLocaleString('pt-BR')}</div>
          </div>
        ))}
      </div>

      {/* Folha do Mês */}
      {kpis.folhaBruto > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Folha de Pagamento - Mês Atual</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500">Total Bruto</div>
              <div className="text-lg font-bold text-gray-900">{fmtMoeda(kpis.folhaBruto)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Líquido</div>
              <div className="text-lg font-bold text-green-700">{fmtMoeda(kpis.folhaLiquido)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Status</div>
              <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
                kpis.folhaStatus === 'FECHADA' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>{kpis.folhaStatus ?? 'EM ABERTO'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Distribuição por Secretaria */}
      {secretarias.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Distribuição por Secretaria</h2>
          <div className="space-y-2">
            {secretarias.map(s => (
              <div key={s.secretaria} className="flex items-center gap-3">
                <div className="text-xs text-gray-600 w-32 truncate">{s.secretaria}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.round((s.total / kpis.totalServidores) * 100)}%` }}
                  />
                </div>
                <div className="text-xs font-medium text-gray-700 w-8 text-right">{s.total}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Atalhos */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Acesso Rápido</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {atalhos.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700"
            >
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
