'use client'

import Link from 'next/link'
import {
  Heart, Users, Calendar, Stethoscope,
  Syringe, Pill, AlertTriangle, TrendingUp,
  TrendingDown, ArrowUpRight, Bell, Activity,
  ClipboardList, Truck,
} from 'lucide-react'

const KPIs = [
  { label: 'Pacientes Cadastrados', valor: '12.847', variacao: '+84', positivo: true, icon: Users, cor: 'bg-red-50 text-red-600' },
  { label: 'Consultas Hoje', valor: '143', detalhe: '28 aguardando', icon: Stethoscope, cor: 'bg-blue-50 text-blue-600' },
  { label: 'Agendamentos Semana', valor: '612', detalhe: '94 confirmados', icon: Calendar, cor: 'bg-indigo-50 text-indigo-600' },
  { label: 'Vacinas Mês', valor: '1.238', variacao: '+15,2%', positivo: true, icon: Syringe, cor: 'bg-green-50 text-green-600' },
  { label: 'Medicamentos Dispensados', valor: '3.472', detalhe: 'mês atual', icon: Pill, cor: 'bg-purple-50 text-purple-600' },
  { label: 'Alertas Estoque', valor: '7', detalhe: 'Baixo ou vencido', icon: AlertTriangle, cor: 'bg-orange-50 text-orange-600' },
  { label: 'Notificações Epidemiol.', valor: '3', detalhe: 'Em investigação', icon: Activity, cor: 'bg-pink-50 text-pink-600' },
  { label: 'Gestantes Acomp.', valor: '84', variacao: '+3', positivo: true, icon: Heart, cor: 'bg-rose-50 text-rose-600' },
]

const ALERTAS = [
  { tipo: 'urgente', msg: '7 medicamentos com estoque crítico ou vencendo em 15 dias', local: 'Farmácia Básica Central' },
  { tipo: 'urgente', msg: 'Notificação suspeita de dengue sem desfecho — 3 casos', local: 'Vigilância Epidemiológica' },
  { tipo: 'alerta', msg: 'Campanha Influenza: 68% da meta atingida (restam 12 dias)', local: 'SEMSA' },
  { tipo: 'alerta', msg: '14 gestantes sem consulta de pré-natal no último mês', local: 'ESF — UBS Centro' },
  { tipo: 'info', msg: 'Relatório SIAB enviado ao DATASUS', local: 'Sistema' },
]

const ACESSO_RAPIDO = [
  { label: 'Pacientes', href: '/gestao/saude/pacientes', icon: Users, cor: 'bg-red-500' },
  { label: 'Agendamentos', href: '/gestao/saude/agendamentos', icon: Calendar, cor: 'bg-blue-500' },
  { label: 'Consultas', href: '/gestao/saude/consultas', icon: Stethoscope, cor: 'bg-indigo-500' },
  { label: 'Vacinação', href: '/gestao/saude/vacinacao', icon: Syringe, cor: 'bg-green-500' },
  { label: 'Estoque', href: '/gestao/saude/estoque', icon: Pill, cor: 'bg-purple-500' },
  { label: 'Vigilância', href: '/gestao/saude/vigilancia', icon: Activity, cor: 'bg-orange-500' },
  { label: 'Relatórios', href: '/gestao/saude/relatorios', icon: ClipboardList, cor: 'bg-cyan-500' },
  { label: 'Transporte', href: '/gestao/saude/transporte', icon: Truck, cor: 'bg-teal-500' },
]

const UNIDADES_RESUMO = [
  { nome: 'UBS Centro', tipo: 'UBS', consultas: 48, agendados: 62, ocupacao: 77, alertas: 1 },
  { nome: 'USF Bairro Novo', tipo: 'USF', consultas: 31, agendados: 40, ocupacao: 78, alertas: 0 },
  { nome: 'UPA Municipal', tipo: 'UPA', consultas: 64, agendados: 90, ocupacao: 71, alertas: 2 },
  { nome: 'CAPS João da Cruz', tipo: 'CAPS', consultas: 18, agendados: 22, ocupacao: 82, alertas: 0 },
]

const VACINACAO_CAMPANHAS = [
  { nome: 'Influenza 2026', aplicadas: 3240, meta: 4800, pct: 68 },
  { nome: 'COVID-19 Reforço', aplicadas: 1890, meta: 2500, pct: 76 },
  { nome: 'HPV — Adolescentes', aplicadas: 342, meta: 600, pct: 57 },
]

export default function SaudeDashboardPage() {
  return (
    <div className="space-y-6">
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
        <button className="text-sm bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-700 transition-colors">
          Relatório Mensal
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIs.map(kpi => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${kpi.cor}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{kpi.valor}</p>
              <p className="text-xs font-medium text-gray-700 mt-0.5">{kpi.label}</p>
              {kpi.variacao ? (
                <p className={`text-xs mt-0.5 flex items-center gap-0.5 ${kpi.positivo ? 'text-green-600' : 'text-red-500'}`}>
                  {kpi.positivo ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {kpi.variacao}
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-0.5">{kpi.detalhe}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Acesso rápido */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
        {ACESSO_RAPIDO.map(item => {
          const Icon = item.icon
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
            {ALERTAS.map((a, i) => (
              <div key={i} className="flex gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                <div className="mt-0.5 shrink-0">
                  <AlertTriangle className={`w-4 h-4 ${a.tipo === 'urgente' ? 'text-red-500' : a.tipo === 'alerta' ? 'text-orange-400' : 'text-blue-400'}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-800 leading-snug">{a.msg}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{a.local}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unidades de Saúde */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Unidades — Hoje</h2>
            <Link href="/gestao/saude/unidades" className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1">
              Ver todas <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {UNIDADES_RESUMO.map(u => (
              <div key={u.nome} className="p-3 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <p className="text-xs font-medium text-gray-800">{u.nome}</p>
                    <p className="text-[10px] text-gray-400">{u.tipo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-700"><strong>{u.consultas}</strong> realizadas</p>
                    <p className="text-[10px] text-gray-400">{u.agendados} agendados</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${u.ocupacao >= 90 ? 'bg-red-500' : u.ocupacao >= 75 ? 'bg-orange-400' : 'bg-green-500'}`}
                      style={{ width: `${u.ocupacao}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{u.ocupacao}%</span>
                  {u.alertas > 0 && (
                    <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded">{u.alertas}⚠</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Campanhas de Vacinação */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Syringe className="w-4 h-4 text-green-600" />
              Campanhas Ativas
            </h2>
            <Link href="/gestao/saude/vacinacao" className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1">
              Ver todas <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="p-4 space-y-4">
            {VACINACAO_CAMPANHAS.map(c => (
              <div key={c.nome}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-gray-800">{c.nome}</p>
                  <span className={`text-xs font-bold ${c.pct >= 80 ? 'text-green-600' : c.pct >= 60 ? 'text-orange-500' : 'text-red-500'}`}>
                    {c.pct}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${c.pct >= 80 ? 'bg-green-500' : c.pct >= 60 ? 'bg-orange-400' : 'bg-red-500'}`}
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {c.aplicadas.toLocaleString('pt-BR')} / {c.meta.toLocaleString('pt-BR')} doses
                </p>
              </div>
            ))}
          </div>

          {/* Mini resumo epidemiológico */}
          <div className="mx-4 mb-4 p-3 bg-orange-50 rounded-xl border border-orange-100">
            <p className="text-xs font-semibold text-orange-800 mb-1.5">Vigilância Epidemiológica</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Dengue', casos: 3, cor: 'text-red-600' },
                { label: 'Influenza', casos: 12, cor: 'text-orange-600' },
                { label: 'Covid-19', casos: 2, cor: 'text-blue-600' },
              ].map(d => (
                <div key={d.label}>
                  <p className={`text-lg font-bold ${d.cor}`}>{d.casos}</p>
                  <p className="text-[9px] text-gray-500">{d.label}</p>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-orange-600 mt-1.5 text-center">casos ativos — semana epidemiológica 46</p>
          </div>
        </div>
      </div>
    </div>
  )
}
