'use client'

import { useState } from 'react'
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, ChevronRight,
  BarChart3, ArrowUpRight, ArrowDownRight, Wallet, FileText,
  Building2, PieChart, Calendar, CheckCircle, Clock, Landmark,
} from 'lucide-react'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface KpiFinanceiro {
  receitaPrevista: number
  receitaArrecadada: number
  despesaEmpenhada: number
  despesaPaga: number
  saldoDisponivel: number
  saldoCaixa: number
}

interface ExecucaoUnidade {
  unidade: string
  dotacao: number
  empenhado: number
  pago: number
  pct: number
}

interface ReceitaMes {
  mes: number
  nomeMes: string
  previsto: number
  arrecadado: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtMoeda(v: number, compact = false) {
  if (compact) {
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}k`
  }
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function pct(a: number, b: number) {
  return b > 0 ? Math.min((a / b) * 100, 100) : 0
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// ─── Mock ─────────────────────────────────────────────────────────────────────

const KPI_MOCK: KpiFinanceiro = {
  receitaPrevista:   24_500_000,
  receitaArrecadada: 20_812_000,
  despesaEmpenhada:  19_430_000,
  despesaPaga:       16_980_000,
  saldoDisponivel:   5_070_000,
  saldoCaixa:        3_832_000,
}

const EXECUCAO_MOCK: ExecucaoUnidade[] = [
  { unidade: 'Secretaria de Educação',    dotacao: 8_200_000, empenhado: 7_650_000, pago: 6_800_000, pct: 93 },
  { unidade: 'Secretaria de Saúde',       dotacao: 6_400_000, empenhado: 5_900_000, pago: 5_200_000, pct: 92 },
  { unidade: 'Administração Municipal',   dotacao: 3_100_000, empenhado: 2_480_000, pago: 2_100_000, pct: 80 },
  { unidade: 'Secretaria de Obras',       dotacao: 2_800_000, empenhado: 1_960_000, pago: 1_540_000, pct: 70 },
  { unidade: 'Assistência Social',        dotacao: 2_200_000, empenhado: 1_540_000, pago: 1_340_000, pct: 70 },
  { unidade: 'Outras Secretarias',        dotacao: 1_800_000, empenhado:   900_000, pago:   700_000, pct: 50 },
]

const RECEITA_MESES_MOCK: ReceitaMes[] = MESES.slice(0, 11).map((nomeMes, i) => ({
  mes: i + 1,
  nomeMes,
  previsto:    2_040_000 + Math.random() * 400_000,
  arrecadado:  i < 10 ? 1_800_000 + Math.random() * 600_000 : 0,
}))

const ALERTAS_MOCK = [
  { tipo: 'warning', msg: 'Empenhos pendentes de liquidação: 23' },
  { tipo: 'info',    msg: 'FPM — parcela de novembro aguardada' },
  { tipo: 'danger',  msg: '5 empenhos com prazo de pagamento vencido' },
]

// ─── Página ───────────────────────────────────────────────────────────────────

export default function DashboardSefin() {
  const [kpi] = useState<KpiFinanceiro>(KPI_MOCK)
  const exercicio = new Date().getFullYear()

  const pctReceita   = pct(kpi.receitaArrecadada,  kpi.receitaPrevista)
  const pctDespesa   = pct(kpi.despesaEmpenhada,   kpi.receitaPrevista)
  const superavit    = kpi.receitaArrecadada - kpi.despesaPaga

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Landmark className="w-7 h-7 text-emerald-600" />
            Finanças Municipais
          </h1>
          <p className="text-sm text-slate-500 mt-1">Execução orçamentária {exercicio} — SEFIN</p>
        </div>
        <div className="flex gap-2">
          <a href="/gestao/sefin/empenhos/novo" className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Novo Empenho
          </a>
        </div>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Receita */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm text-slate-500"><TrendingUp className="w-4 h-4 text-emerald-500" /> Receita Arrecadada</div>
            <span className="text-xs font-semibold text-emerald-600">{pctReceita.toFixed(1)}%</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{fmtMoeda(kpi.receitaArrecadada, true)}</p>
          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pctReceita}%` }} />
          </div>
          <p className="text-xs text-slate-400 mt-1">de {fmtMoeda(kpi.receitaPrevista, true)} previstos</p>
        </div>

        {/* Despesa empenhada */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm text-slate-500"><TrendingDown className="w-4 h-4 text-red-400" /> Despesa Empenhada</div>
            <span className="text-xs font-semibold text-orange-600">{pctDespesa.toFixed(1)}%</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{fmtMoeda(kpi.despesaEmpenhada, true)}</p>
          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-orange-400 rounded-full" style={{ width: `${pctDespesa}%` }} />
          </div>
          <p className="text-xs text-slate-400 mt-1">pago: {fmtMoeda(kpi.despesaPaga, true)}</p>
        </div>

        {/* Superávit */}
        <div className={`rounded-xl border shadow-sm p-5 ${superavit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
            <Wallet className="w-4 h-4" /> Resultado do Período
          </div>
          <p className={`text-2xl font-bold ${superavit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {superavit >= 0 ? '+' : ''}{fmtMoeda(superavit, true)}
          </p>
          <p className={`text-xs mt-1 ${superavit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {superavit >= 0 ? 'Superávit' : 'Déficit'} — receita × pago
          </p>
        </div>
      </div>

      {/* KPIs secundários */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Saldo Disponível',     value: kpi.saldoDisponivel, icon: DollarSign,  cls: 'text-emerald-600', href: '/gestao/sefin/orcamento' },
          { label: 'Saldo em Caixa',        value: kpi.saldoCaixa,       icon: Wallet,       cls: 'text-sky-600',     href: undefined },
          { label: 'Dotação Total',         value: kpi.receitaPrevista,   icon: BarChart3,    cls: 'text-indigo-600',  href: '/gestao/sefin/orcamento' },
          { label: 'Pago no Exercício',     value: kpi.despesaPaga,       icon: CheckCircle,  cls: 'text-violet-600',  href: '/gestao/sefin/empenhos?status=PAGO' },
        ].map(({ label, value, icon: Icon, cls, href }) => (
          <div
            key={label}
            className={`bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm ${href ? 'cursor-pointer hover:border-emerald-200' : ''}`}
            onClick={() => href && (window.location.href = href)}
          >
            <Icon className={`w-5 h-5 ${cls} shrink-0`} />
            <div>
              <p className="text-xs text-slate-400">{label}</p>
              <p className="font-bold text-slate-800">{fmtMoeda(value, true)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Linha central: execução por unidade + alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Execução por unidade */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-500" /> Execução por Secretaria
            </h2>
            <a href="/gestao/sefin/orcamento" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
              Detalhar <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          <div className="space-y-3">
            {EXECUCAO_MOCK.map((u) => (
              <div key={u.unidade}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700 truncate max-w-[200px]">{u.unidade}</span>
                  <span className="text-slate-500 shrink-0 ml-2">{fmtMoeda(u.empenhado, true)} / {fmtMoeda(u.dotacao, true)}</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                  <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: `${pct(u.pago, u.dotacao)}%` }} />
                  <div className="h-full bg-emerald-200" style={{ width: `${pct(u.empenhado - u.pago, u.dotacao)}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                  <span>Pago: {fmtMoeda(u.pago, true)}</span>
                  <span className={u.pct >= 90 ? 'text-orange-500 font-medium' : ''}>{u.pct}% executado</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-emerald-500 inline-block" /> Pago</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-emerald-200 inline-block" /> Empenhado s/ pagar</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-slate-100 inline-block" /> Saldo</span>
          </div>
        </div>

        {/* Alertas */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-orange-500" /> Alertas
            </h2>
            <div className="space-y-2">
              {ALERTAS_MOCK.map((a, i) => (
                <div key={i} className={`flex items-start gap-2 p-2 rounded-lg text-sm ${
                  a.tipo === 'danger'  ? 'bg-red-50 text-red-700' :
                  a.tipo === 'warning' ? 'bg-amber-50 text-amber-700' :
                  'bg-sky-50 text-sky-700'
                }`}>
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{a.msg}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Acesso rápido */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 mb-3">Acesso Rápido</h2>
            <div className="space-y-1">
              {[
                { label: 'Receitas',    href: '/gestao/sefin/receitas',  icon: TrendingUp },
                { label: 'Empenhos',    href: '/gestao/sefin/empenhos',  icon: FileText },
                { label: 'Orçamento',   href: '/gestao/sefin/orcamento', icon: PieChart },
                { label: 'Transparência', href: '/transparencia/financas', icon: Landmark },
              ].map(({ label, href, icon: Icon }) => (
                <a key={label} href={href} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 text-sm text-slate-700 transition-colors">
                  <Icon className="w-4 h-4 text-emerald-500" />
                  <span>{label}</span>
                  <ChevronRight className="w-3 h-3 ml-auto text-slate-300" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Receita mensal */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-500" /> Arrecadação Mensal {exercicio}
          </h2>
          <a href="/gestao/sefin/receitas" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
            Ver detalhes <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
        <div className="flex items-end gap-2 h-32">
          {RECEITA_MESES_MOCK.map((m) => {
            const maxVal = Math.max(...RECEITA_MESES_MOCK.map(x => x.previsto))
            const hPrev = (m.previsto / maxVal) * 100
            const hArr  = (m.arrecadado / maxVal) * 100
            return (
              <div key={m.mes} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-0.5 h-24">
                  <div className="flex-1 bg-slate-100 rounded-t" style={{ height: `${hPrev}%` }} />
                  {m.arrecadado > 0 && (
                    <div className="flex-1 bg-emerald-500 rounded-t" style={{ height: `${hArr}%` }} />
                  )}
                </div>
                <span className="text-xs text-slate-400">{m.nomeMes}</span>
              </div>
            )
          })}
        </div>
        <div className="flex gap-4 mt-2 text-xs text-slate-400">
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-slate-100 inline-block" /> Previsto</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-emerald-500 inline-block" /> Arrecadado</span>
        </div>
      </div>

    </div>
  )
}
