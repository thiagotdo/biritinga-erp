'use client'

import { useState, useEffect } from 'react'
import {
  Users, UserCheck, UserX, Briefcase, Calendar,
  TrendingUp, AlertCircle, ChevronRight, Building2,
  Clock, Award, Cake, ArrowUpRight, FileText,
  UserMinus, Shield, BarChart3,
} from 'lucide-react'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface KpiDashboard {
  ativos: number
  inativos: number
  emFerias: number
  afastados: number
  admissoesEsteMes: number
  feriasPendentes: number
  vagasDisponiveis: number
}

interface DistCargo {
  cargo: string
  total: number
  pct: number
}

interface Aniversariante {
  id: string
  nome: string
  dataNascimento: string
  cargo: string
  unidade: string
  diasRestantes: number
}

interface FeriasVencida {
  id: string
  nome: string
  matricula: string
  cargo: string
  exercicio: number
}

interface AfastamentoAlerta {
  id: string
  nome: string
  tipo: string
  dataFim: string
  diasRestantes: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function diasParaAniversario(nascimento: string): number {
  const hoje = new Date()
  const nasc = new Date(nascimento)
  const proximo = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate())
  if (proximo < hoje) proximo.setFullYear(hoje.getFullYear() + 1)
  return Math.ceil((proximo.getTime() - hoje.getTime()) / 86400000)
}

// ─── Mocks ───────────────────────────────────────────────────────────────────

const KPI_MOCK: KpiDashboard = {
  ativos: 342,
  inativos: 18,
  emFerias: 24,
  afastados: 11,
  admissoesEsteMes: 3,
  feriasPendentes: 7,
  vagasDisponiveis: 29,
}

const DIST_CARGOS_MOCK: DistCargo[] = [
  { cargo: 'Professor', total: 108, pct: 32 },
  { cargo: 'Agente de Saúde', total: 54, pct: 16 },
  { cargo: 'Assistente Administrativo', total: 47, pct: 14 },
  { cargo: 'Motorista', total: 31, pct: 9 },
  { cargo: 'Outros', total: 102, pct: 30 },
]

const ANIVERSARIANTES_MOCK: Aniversariante[] = [
  { id: '1', nome: 'Ana Carla Lima', dataNascimento: '1988-11-15', cargo: 'Professora', unidade: 'SEC', diasRestantes: 2 },
  { id: '2', nome: 'Pedro Vieira', dataNascimento: '1975-11-18', cargo: 'Motorista', unidade: 'SEMOB', diasRestantes: 5 },
  { id: '3', nome: 'Joana Silva', dataNascimento: '1990-11-20', cargo: 'Assistente Adm.', unidade: 'SEMAD', diasRestantes: 7 },
]

const FERIAS_VENCIDAS_MOCK: FeriasVencida[] = [
  { id: '1', nome: 'Carlos Mendes', matricula: '00123', cargo: 'Ag. Administrativo', exercicio: 2024 },
  { id: '2', nome: 'Marta Souza', matricula: '00287', cargo: 'Professora', exercicio: 2024 },
  { id: '3', nome: 'Rui Ferreira', matricula: '00351', cargo: 'Vigia', exercicio: 2023 },
]

const AFASTAMENTOS_MOCK: AfastamentoAlerta[] = [
  { id: '1', nome: 'Luísa Araújo', tipo: 'LICENCA_MEDICA', dataFim: '2026-11-20', diasRestantes: 7 },
  { id: '2', nome: 'Fabrício Nunes', tipo: 'CAPACITACAO', dataFim: '2026-11-25', diasRestantes: 12 },
]

const TIPO_AFASTAMENTO_LABEL: Record<string, string> = {
  FERIAS: 'Férias',
  LICENCA_MEDICA: 'Lic. Médica',
  LICENCA_MATERNIDADE: 'Lic. Maternidade',
  LICENCA_PATERNIDADE: 'Lic. Paternidade',
  CAPACITACAO: 'Capacitação',
  MANDATO_SINDICAL: 'Mandato Sindical',
  ACIDENTE_TRABALHO: 'Acidente de Trabalho',
  CEDENCIA: 'Cedência',
  PROCESSO_ADMINISTRATIVO: 'Proc. Administrativo',
  ELEICAO: 'Eleição',
  OUTROS: 'Outros',
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  href,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  sub?: string
  color: string
  href?: string
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow ${href ? 'cursor-pointer' : ''}`}
      onClick={() => href && (window.location.href = href)}
    >
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DashboardSemad() {
  const [kpi, setKpi] = useState<KpiDashboard>(KPI_MOCK)
  const [distCargos] = useState<DistCargo[]>(DIST_CARGOS_MOCK)
  const [aniversariantes] = useState<Aniversariante[]>(ANIVERSARIANTES_MOCK)
  const [feriasVencidas] = useState<FeriasVencida[]>(FERIAS_VENCIDAS_MOCK)
  const [afastamentos] = useState<AfastamentoAlerta[]>(AFASTAMENTOS_MOCK)

  // Em produção: fetch('/api/semad/dashboard/kpi') etc.

  const totalAtivos = kpi.ativos + kpi.emFerias + kpi.afastados

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-600" />
            Administração Municipal
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gestão de Recursos Humanos — SEMAD</p>
        </div>
        <div className="flex gap-2">
          <a href="/gestao/semad/servidores/novo" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
            <Users className="w-4 h-4" /> Novo Servidor
          </a>
        </div>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={UserCheck}  label="Servidores Ativos"    value={kpi.ativos}            sub={`${totalAtivos} no quadro total`} color="bg-indigo-500" href="/gestao/semad/servidores?situacao=ATIVO" />
        <KpiCard icon={Calendar}   label="Em Férias"            value={kpi.emFerias}           sub="período corrente"                 color="bg-sky-500"    href="/gestao/semad/ferias?status=EM_GOZO" />
        <KpiCard icon={UserMinus}  label="Afastados"            value={kpi.afastados}          sub="licenças e afastamentos"          color="bg-amber-500"  href="/gestao/semad/servidores?situacao=AFASTADO" />
        <KpiCard icon={Briefcase}  label="Vagas Disponíveis"    value={kpi.vagasDisponiveis}   sub="quadro de vagas 2026"             color="bg-emerald-500" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard icon={TrendingUp} label="Admissões este mês"   value={kpi.admissoesEsteMes}   color="bg-violet-500" href="/gestao/semad/servidores?admissaoMes=1" />
        <KpiCard icon={Clock}      label="Férias Pendentes"     value={kpi.feriasPendentes}    sub="aguardando aprovação"             color="bg-orange-500" href="/gestao/semad/ferias?status=SOLICITADA" />
        <KpiCard icon={UserX}      label="Inativos / Exonerados" value={kpi.inativos}          color="bg-slate-400" href="/gestao/semad/servidores?situacao=INATIVO" />
      </div>

      {/* Linha central: distribuição de cargos + aniversariantes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Distribuição por cargo */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" /> Distribuição por Cargo
            </h2>
            <a href="/gestao/semad/cargos" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              Ver cargos <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          <div className="space-y-3">
            {distCargos.map((item) => (
              <div key={item.cargo}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">{item.cargo}</span>
                  <span className="text-slate-500 font-medium">{item.total} ({item.pct}%)</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Aniversariantes da semana */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Cake className="w-4 h-4 text-pink-500" /> Aniversariantes da Semana
            </h2>
            <span className="text-xs text-slate-400">{aniversariantes.length} servidores</span>
          </div>
          {aniversariantes.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Nenhum aniversariante nos próximos 7 dias</p>
          ) : (
            <div className="space-y-3">
              {aniversariantes.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-pink-50 border border-pink-100">
                  <div className="w-9 h-9 rounded-full bg-pink-200 flex items-center justify-center text-pink-700 font-bold text-sm">
                    {a.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{a.nome}</p>
                    <p className="text-xs text-slate-500">{a.cargo} · {a.unidade}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-pink-600">
                      {a.diasRestantes === 0 ? 'Hoje!' : a.diasRestantes === 1 ? 'Amanhã' : `em ${a.diasRestantes}d`}
                    </p>
                    <p className="text-xs text-slate-400">{new Date(a.dataNascimento).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Linha inferior: férias vencidas + afastamentos próximos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Férias vencidas */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500" /> Férias Vencidas / Pendentes
            </h2>
            <a href="/gestao/semad/ferias?vencidas=true" className="text-xs text-orange-600 hover:underline flex items-center gap-1">
              Ver todas <ChevronRight className="w-3 h-3" />
            </a>
          </div>
          {feriasVencidas.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Nenhum servidor com férias vencidas</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {feriasVencidas.map((f) => (
                <div key={f.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{f.nome}</p>
                    <p className="text-xs text-slate-500">Mat. {f.matricula} · {f.cargo}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                    Exercício {f.exercicio}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Afastamentos próximos do fim */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-500" /> Afastamentos — Próximo Retorno
            </h2>
            <a href="/gestao/semad/servidores?situacao=AFASTADO" className="text-xs text-sky-600 hover:underline flex items-center gap-1">
              Ver todos <ChevronRight className="w-3 h-3" />
            </a>
          </div>
          {afastamentos.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Nenhum afastamento próximo do fim</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {afastamentos.map((af) => (
                <div key={af.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{af.nome}</p>
                    <p className="text-xs text-slate-500">{TIPO_AFASTAMENTO_LABEL[af.tipo] ?? af.tipo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-700">Retorno: {formatDate(af.dataFim)}</p>
                    <p className={`text-xs font-semibold ${af.diasRestantes <= 3 ? 'text-red-600' : 'text-sky-600'}`}>
                      em {af.diasRestantes} dias
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Acesso rápido */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Acesso Rápido</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Servidores', icon: Users, href: '/gestao/semad/servidores', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
            { label: 'Cargos', icon: Award, href: '/gestao/semad/cargos', color: 'bg-violet-50 border-violet-200 text-violet-700' },
            { label: 'Férias', icon: Calendar, href: '/gestao/semad/ferias', color: 'bg-sky-50 border-sky-200 text-sky-700' },
            { label: 'Frequência', icon: FileText, href: '/gestao/semad/frequencia', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          ].map(({ label, icon: Icon, href, color }) => (
            <a
              key={label}
              href={href}
              className={`flex items-center gap-3 p-4 rounded-xl border ${color} hover:opacity-80 transition-opacity`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium text-sm">{label}</span>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </a>
          ))}
        </div>
      </div>

    </div>
  )
}
