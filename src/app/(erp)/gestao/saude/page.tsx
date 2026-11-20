'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Heart, Users, Calendar, Stethoscope,
  Syringe, Pill, AlertTriangle, ArrowUpRight,
  Bell, Activity, ClipboardList, Building2,
  UserCheck, Package,
} from 'lucide-react'

type Kpis = {
  totalPacientes: number
  pacientesAtivos: number
  atendimentosMes: number
  atendimentosHoje: number
  agendamentosHoje: number
  agendPendentes: number
  agendAtendidos: number
  agendFaltas: number
  totalUnidades: number
  totalProfissionais: number
  vacinasMes: number
  notificacoesAtivas: number
  estoqueCritico: number
}

type DashData = {
  kpis: Kpis
  tiposAtendimento: { tipo: string; total: number }[]
  unidadesTop: { nome: string; atendimentos: number }[]
  cidsFrequentes: { cid10: string; total: number }[]
}

const TIPO_LABEL: Record<string, string> = {
  CONSULTA: 'Consulta', EXAME: 'Exame', VACINA: 'Vacina',
  RETORNO: 'Retorno', URGENCIA: 'Urgência', OUTRO: 'Outro',
}

const ACESSO_RAPIDO = [
  { label: 'Pacientes',    href: '/gestao/saude/pacientes',    Icon: Users,       cor: 'bg-red-500'    },
  { label: 'Agendamentos', href: '/gestao/saude/agendamentos', Icon: Calendar,    cor: 'bg-blue-500'   },
  { label: 'Consultas',    href: '/gestao/saude/atendimentos', Icon: Stethoscope, cor: 'bg-indigo-500' },
  { label: 'Vacinação',    href: '/gestao/saude/vacinacao',    Icon: Syringe,     cor: 'bg-green-500'  },
  { label: 'Farmácia',     href: '/gestao/saude/farmacia',     Icon: Pill,        cor: 'bg-purple-500' },
  { label: 'Estoque',      href: '/gestao/saude/estoque',      Icon: Package,     cor: 'bg-orange-500' },
  { label: 'Vigilância',   href: '/gestao/saude/vigilancia',   Icon: Activity,    cor: 'bg-pink-500'   },
  { label: 'ESF',          href: '/gestao/saude/esf',          Icon: Building2,   cor: 'bg-teal-500'   },
]

function fmt(n: number) {
  return n.toLocaleString('pt-BR')
}

export default function SaudeDashboardPage() {
  const [dados, setDados] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    fetch('/api/saude/dashboard')
      .then(r => r.json())
      .then(d => {
        if (d.erro) throw new Error(d.erro)
        setDados(d)
      })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  }, [])

  const k = dados?.kpis

  const KPIs = [
    { label: 'Pacientes Cadastrados', valor: fmt(k?.totalPacientes ?? 0), detalhe: `${fmt(k?.pacientesAtivos ?? 0)} ativos`, Icon: Users,       cor: 'bg-red-50 text-red-600'     },
    { label: 'Atendimentos Hoje',     valor: fmt(k?.atendimentosHoje ?? 0),detalhe: `${fmt(k?.atendimentosMes ?? 0)} no mês`, Icon: Stethoscope, cor: 'bg-blue-50 text-blue-600'   },
    { label: 'Agendamentos Hoje',     valor: fmt(k?.agendamentosHoje ?? 0),detalhe: `${fmt(k?.agendPendentes ?? 0)} pendentes`, Icon: Calendar,  cor: 'bg-indigo-50 text-indigo-600'},
    { label: 'Vacinas Mês',           valor: fmt(k?.vacinasMes ?? 0),      detalhe: 'aplicações registradas', Icon: Syringe,  cor: 'bg-green-50 text-green-600'  },
    { label: 'Profissionais Ativos',  valor: fmt(k?.totalProfissionais ?? 0),detalhe: `em ${fmt(k?.totalUnidades ?? 0)} unidades`, Icon: UserCheck,cor: 'bg-cyan-50 text-cyan-600'  },
    { label: 'Estoque Crítico',       valor: fmt(k?.estoqueCritico ?? 0),  detalhe: 'medicamentos em falta', Icon: Pill,      cor: 'bg-orange-50 text-orange-600'},
    { label: 'Notif. Epidemiológicas',valor: fmt(k?.notificacoesAtivas ?? 0),detalhe: 'ativas / em investigação', Icon: Activity,cor: 'bg-pink-50 text-pink-600'  },
    { label: 'Faltas Hoje',           valor: fmt(k?.agendFaltas ?? 0),     detalhe: `de ${fmt(k?.agendamentosHoje ?? 0)} agendados`, Icon: ClipboardList, cor: 'bg-amber-50 text-amber-600'},
  ]

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <Heart className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Secretaria de Saúde</h1>
            <p className="text-sm text-gray-500">SEMSA — Gestão Municipal de Saúde</p>
          </div>
        </div>
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{erro}</div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIs.map(kpi => {
          const Icon = kpi.Icon
          return (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${kpi.cor}`}>
                <Icon className="w-4 h-4" />
              </div>
              {loading ? (
                <div className="h-7 w-16 bg-gray-100 rounded animate-pulse mb-1" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{kpi.valor}</p>
              )}
              <p className="text-xs font-medium text-gray-700 mt-0.5">{kpi.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{kpi.detalhe}</p>
            </div>
          )
        })}
      </div>

      {/* Acesso rápido */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
        {ACESSO_RAPIDO.map(item => {
          const Icon = item.Icon
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col items-center gap-2 bg-white rounded-xl border border-gray-100 shadow-sm p-3 hover:shadow-md transition-shadow group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.cor} group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-gray-600 font-medium text-center">{item.label}</span>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alertas */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-500" />
              Alertas de Saúde
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              [1,2,3].map(i => (
                <div key={i} className="p-3 flex gap-3">
                  <div className="w-4 h-4 rounded bg-gray-100 animate-pulse shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
                    <div className="h-2.5 bg-gray-100 rounded animate-pulse w-2/3" />
                  </div>
                </div>
              ))
            ) : (
              <>
                {(k?.estoqueCritico ?? 0) > 0 && (
                  <div className="flex gap-3 p-3 hover:bg-gray-50">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-800">{k!.estoqueCritico} medicamentos com estoque crítico</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Farmácia — Estoque</p>
                    </div>
                  </div>
                )}
                {(k?.notificacoesAtivas ?? 0) > 0 && (
                  <div className="flex gap-3 p-3 hover:bg-gray-50">
                    <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-800">{k!.notificacoesAtivas} notificação(ões) epidemiológica(s) ativa(s)</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Vigilância Epidemiológica</p>
                    </div>
                  </div>
                )}
                {(k?.agendFaltas ?? 0) > 0 && (
                  <div className="flex gap-3 p-3 hover:bg-gray-50">
                    <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-800">{k!.agendFaltas} falta(s) hoje nos agendamentos</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Agendamentos</p>
                    </div>
                  </div>
                )}
                {(k?.estoqueCritico ?? 0) === 0 && (k?.notificacoesAtivas ?? 0) === 0 && (k?.agendFaltas ?? 0) === 0 && (
                  <div className="p-6 text-center">
                    <Heart className="w-8 h-8 mx-auto text-green-300 mb-2" strokeWidth={1.5} />
                    <p className="text-sm text-gray-400">Sem alertas no momento</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Atendimentos por tipo */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Atendimentos por Tipo</h2>
            <span className="text-xs text-gray-400">mês atual</span>
          </div>
          <div className="p-4 space-y-3">
            {loading ? (
              [1,2,3,4].map(i => (
                <div key={i} className="space-y-1">
                  <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
                  <div className="h-2 w-full bg-gray-100 rounded animate-pulse" />
                </div>
              ))
            ) : dados?.tiposAtendimento?.length ? (
              (() => {
                const maxVal = Math.max(...dados.tiposAtendimento.map(t => t.total), 1)
                return dados.tiposAtendimento.map(t => (
                  <div key={t.tipo}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-gray-700">{TIPO_LABEL[t.tipo] ?? t.tipo}</p>
                      <span className="text-xs font-bold text-gray-900">{fmt(t.total)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-red-500"
                        style={{ width: `${(t.total / maxVal) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              })()
            ) : (
              <div className="py-8 text-center">
                <Stethoscope className="w-8 h-8 mx-auto text-gray-200 mb-2" strokeWidth={1.5} />
                <p className="text-xs text-gray-400">Nenhum atendimento registrado este mês</p>
              </div>
            )}
          </div>
        </div>

        {/* Top unidades */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Unidades — Mês</h2>
            <Link href="/gestao/saude/unidades" className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1">
              Ver todas <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              [1,2,3,4,5].map(i => (
                <div key={i} className="p-3 flex gap-3">
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                    <div className="h-2 bg-gray-100 rounded animate-pulse w-full" />
                  </div>
                  <div className="h-6 w-8 bg-gray-100 rounded animate-pulse" />
                </div>
              ))
            ) : dados?.unidadesTop?.length ? (
              (() => {
                const maxAt = Math.max(...dados.unidadesTop.map(u => u.atendimentos), 1)
                return dados.unidadesTop.map((u, i) => (
                  <div key={i} className="p-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium text-gray-800 truncate max-w-[160px]">{u.nome}</p>
                      <span className="text-xs font-bold text-red-600">{fmt(u.atendimentos)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-red-400"
                        style={{ width: `${(u.atendimentos / maxAt) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              })()
            ) : (
              <div className="py-8 text-center">
                <Building2 className="w-8 h-8 mx-auto text-gray-200 mb-2" strokeWidth={1.5} />
                <p className="text-xs text-gray-400">Nenhum dado de unidades disponível</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
