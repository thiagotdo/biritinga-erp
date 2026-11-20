'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  GraduationCap, School, Users, BookOpen, AlertTriangle,
  TrendingUp, UserCheck, UserX, Heart, RefreshCw,
  ChevronRight, BarChart2,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
type KPIs = {
  totalMatriculas: number; ativas: number; transferidas: number
  evadidas: number; emRisco: number; pcd: number; bolsaFamilia: number; freqMedia: string
}
type Escola = { id: string; nome: string; tipo: string; totalTurmas: number }
type DashData = { kpis: KPIs; escolas: Escola[]; totalEscolas: number }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('pt-BR')

function KpiCard({
  icon: Icon, label, value, sub, cor = 'text-gray-700',
}: {
  icon: any; label: string; value: string | number; sub?: string; cor?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${cor}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className="p-2 rounded-lg" style={{ background: 'var(--cor-primaria)15' }}>
          <Icon size={20} style={{ color: 'var(--cor-primaria)' }} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  )
}

function BarFreq({ pct }: { pct: number }) {
  const cor = pct >= 90 ? '#16a34a' : pct >= 75 ? '#d97706' : '#dc2626'
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
      <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: cor }} />
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function EducacaoDashboard() {
  const [ano, setAno] = useState(new Date().getFullYear())
  const [dash, setDash] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true); setErro('')
    try {
      const [rKpi, rEscolas] = await Promise.all([
        fetch(`/api/educacao/matricula?relatorio=DASHBOARD&anoLetivo=${ano}`),
        fetch('/api/educacao/escola'),
      ])
      const dKpi    = await rKpi.json()
      const dEscola = await rEscolas.json()

      if (dKpi.erro) throw new Error(dKpi.erro)

      setDash({
        kpis: dKpi.kpis,
        escolas: dEscola.escolas ?? [],
        totalEscolas: dEscola.total ?? 0,
      })
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }, [ano])

  useEffect(() => { carregar() }, [carregar])

  const kpis = dash?.kpis
  const freqPct = kpis ? parseFloat(kpis.freqMedia) : 0

  return (
    <div className="p-6 space-y-6 max-w-7xl">

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">SEDUC — Secretaria de Educação</h1>
          <p className="text-sm text-gray-500">Gestão escolar e acompanhamento pedagógico</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={ano}
            onChange={e => setAno(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': 'var(--cor-primaria)' } as any}
          >
            {[ano + 1, ano, ano - 1, ano - 2].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button
            onClick={carregar}
            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {erro}
        </div>
      )}

      {/* KPIs */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 h-24 animate-pulse" />
          ))}
        </div>
      ) : kpis ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={Users}       label="Total Matrículas"  value={fmt(kpis.totalMatriculas)} sub={`Ano ${ano}`} />
          <KpiCard icon={UserCheck}   label="Ativas"            value={fmt(kpis.ativas)}          cor="text-green-700" />
          <KpiCard icon={UserX}       label="Evadidas"          value={fmt(kpis.evadidas)}        cor="text-red-600" />
          <KpiCard icon={TrendingUp}  label="Transferidas"      value={fmt(kpis.transferidas)}    cor="text-blue-600" />
          <KpiCard icon={AlertTriangle} label="Em Risco (Freq)" value={fmt(kpis.emRisco)}         cor="text-amber-600" sub="Freq. < 75%" />
          <KpiCard icon={Heart}       label="PCD"               value={fmt(kpis.pcd)}             sub="Necessidades esp." />
          <KpiCard icon={BookOpen}    label="Bolsa Família"     value={fmt(kpis.bolsaFamilia)}    cor="text-indigo-600" />
          <KpiCard icon={School}      label="Escolas"           value={fmt(dash?.totalEscolas ?? 0)} />
        </div>
      ) : null}

      {/* Frequência Média */}
      {kpis && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Frequência Média Geral</h2>
            <span className={`text-lg font-bold ${
              freqPct >= 90 ? 'text-green-600' : freqPct >= 75 ? 'text-amber-600' : 'text-red-600'
            }`}>{kpis.freqMedia}%</span>
          </div>
          <BarFreq pct={freqPct} />
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />≥ 90% Regular</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />75–90% Atenção</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" />&lt; 75% Risco (LDB)</span>
          </div>
        </div>
      )}

      {/* Escolas */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Unidades Escolares</h2>
          <a href="/gestao/educacao/escolas" className="text-xs flex items-center gap-1 hover:underline" style={{ color: 'var(--cor-primaria)' }}>
            Ver todas <ChevronRight size={12} />
          </a>
        </div>

        {!dash?.escolas.length ? (
          <div className="py-10 text-center text-gray-400 text-sm">Nenhuma escola cadastrada</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {dash.escolas.slice(0, 8).map(e => (
              <a
                key={e.id}
                href={`/gestao/educacao/escolas?id=${e.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg" style={{ background: 'var(--cor-primaria)15' }}>
                    <School size={16} style={{ color: 'var(--cor-primaria)' }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{e.nome}</p>
                    <p className="text-xs text-gray-400">{e.tipo ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">{e.totalTurmas ?? 0} turmas</span>
                  <ChevronRight size={14} className="text-gray-300" />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Acesso rápido */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Acesso Rápido</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { href: '/gestao/educacao/escolas',   Icon: School,        label: 'Escolas' },
            { href: '/gestao/educacao/alunos',     Icon: Users,         label: 'Alunos' },
            { href: '/gestao/educacao/turmas',     Icon: BookOpen,      label: 'Turmas' },
            { href: '/gestao/educacao/diario',     Icon: BarChart2,     label: 'Diário' },
            { href: '/gestao/educacao/merenda',    Icon: GraduationCap, label: 'Merenda' },
          ].map(({ href, Icon, label }) => (
            <a
              key={href} href={href}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <Icon size={22} style={{ color: 'var(--cor-primaria)' }} strokeWidth={1.5} />
              <span className="text-xs font-medium text-gray-700">{label}</span>
            </a>
          ))}
        </div>
      </div>

    </div>
  )
}
