'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Download } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface FluxoMes { competencia: string; receitas: number; despesas: number; saldo: number }
interface ExecucaoSecretaria {
  secretaria: string
  valorAtual: number
  valorEmpenhado: number
  valorLiquidado: number
  valorPago: number
  dotacoes: any[]
}
interface LRFPessoal {
  relatorio: string; periodo: string; exercicio: number
  rcl: number; despesaPessoal: number
  percentual: string; limiteLegal: number; limiteAlerta: number
  situacao: 'REGULAR' | 'ALERTA' | 'ACIMA_LIMITE'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct   = (v: string | number) => `${Number(v).toFixed(2)}%`

function mesLabel(c: string) {
  const [ano, mes] = c.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${nomes[Number(mes)-1]}/${ano.slice(2)}`
}

function BarraLRF({ percentual, limite, alerta }: { percentual: number; limite: number; alerta: number }) {
  const pctAlerta = (alerta / limite) * 100
  const pctAtual  = Math.min((percentual / limite) * 100, 110)
  const cor = percentual > limite ? 'bg-red-500' : percentual > alerta ? 'bg-amber-400' : 'bg-emerald-500'

  return (
    <div className="relative h-6 bg-slate-100 rounded-lg overflow-hidden">
      {/* Marcador alerta */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400/70 z-10" style={{ left: `${pctAlerta}%` }}/>
      {/* Marcador limite */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-red-400/70 z-10" style={{ left: '100%' }}/>
      {/* Barra atual */}
      <div className={`h-full ${cor} rounded-lg transition-all`} style={{ width: `${Math.min(pctAtual, 100)}%` }}/>
      {/* Texto % */}
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
        {pct(percentual)}
      </span>
    </div>
  )
}

// ─── Fluxo de caixa visual ────────────────────────────────────────────────────

function GraficoFluxo({ fluxo }: { fluxo: FluxoMes[] }) {
  const max = Math.max(...fluxo.flatMap(m => [m.receitas, m.despesas]), 1)

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-3">
        <div className="flex items-center gap-1 text-xs text-slate-600"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>Receitas</div>
        <div className="flex items-center gap-1 text-xs text-slate-600"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/>Despesas</div>
        <div className="flex items-center gap-1 text-xs text-slate-600"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"/>Saldo</div>
      </div>
      <div className="flex gap-1 items-end h-32">
        {fluxo.map((m, i) => {
          const hRec = (m.receitas / max) * 100
          const hDes = (m.despesas / max) * 100
          const saldoPos = m.saldo >= 0
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              <div className="flex items-end gap-0.5 h-24 w-full">
                <div className="flex-1 bg-emerald-400 rounded-t transition-all" style={{ height: `${hRec}%` }}/>
                <div className="flex-1 bg-red-400 rounded-t transition-all" style={{ height: `${hDes}%` }}/>
              </div>
              {/* Indicador saldo */}
              <div className={`w-2 h-2 rounded-full ${saldoPos ? 'bg-blue-400' : 'bg-orange-400'}`}/>
              <span className="text-[10px] text-slate-400 mt-0.5">{mesLabel(m.competencia)}</span>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 bg-slate-800 text-white text-xs rounded-lg p-2 hidden group-hover:block z-10 whitespace-nowrap shadow-lg">
                <p className="text-emerald-300">Rec: {moeda(m.receitas)}</p>
                <p className="text-red-300">Des: {moeda(m.despesas)}</p>
                <p className={saldoPos ? 'text-blue-300' : 'text-orange-300'}>Saldo: {moeda(m.saldo)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

type Aba = 'execucao' | 'receita' | 'lrf_pessoal' | 'fluxo'

export default function BalancetePage() {
  const [aba, setAba]           = useState<Aba>('execucao')
  const [exercicio, setExercicio] = useState(new Date().getFullYear())
  const [dados, setDados]       = useState<any>(null)
  const [carregando, setCarregando] = useState(false)

  const ABAS: Array<{ id: Aba; label: string; relatorio: string }> = [
    { id: 'execucao',    label: 'Execução Orçamentária', relatorio: 'EXECUCAO'    },
    { id: 'receita',     label: 'Receitas',              relatorio: 'RECEITA'     },
    { id: 'lrf_pessoal', label: 'LRF — Despesa Pessoal', relatorio: 'LRF_PESSOAL' },
    { id: 'fluxo',       label: 'Fluxo de Caixa',        relatorio: 'FLUXO'       },
  ]

  const carregar = useCallback(async () => {
    setCarregando(true)
    const rel = ABAS.find(a => a.id === aba)?.relatorio ?? 'EXECUCAO'
    const r = await fetch(`/api/sefin/balancete?relatorio=${rel}&exercicio=${exercicio}`)
    const d = await r.json()
    setDados(d)
    setCarregando(false)
  }, [aba, exercicio])

  useEffect(() => { carregar() }, [carregar])

  return (
    <div className="p-6 space-y-6">
      {/* Título */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Balancete e Relatórios</h1>
          <p className="text-slate-500 text-sm mt-0.5">Transparência fiscal · LRF · Execução orçamentária</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="number" value={exercicio} onChange={e => setExercicio(Number(e.target.value))} min={2020} max={2099}
            className="border rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${aba === a.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
            {a.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {carregando ? (
        <div className="text-center py-16 text-slate-400">Carregando relatório…</div>
      ) : !dados || dados.erro ? (
        <div className="text-center py-16 text-slate-400">{dados?.erro ?? 'Nenhum dado'}</div>
      ) : (
        <>
          {/* ── EXECUÇÃO ── */}
          {aba === 'execucao' && dados.porSecretaria && (
            <div className="space-y-4">
              {/* KPIs */}
              <div className="grid grid-cols-5 gap-4">
                {[
                  { label: 'Orçado',         valor: dados.total.valorAtual,     cor: 'text-slate-800' },
                  { label: 'Empenhado',       valor: dados.total.valorEmpenhado, cor: 'text-amber-700'  },
                  { label: 'Liquidado',       valor: dados.total.valorLiquidado, cor: 'text-blue-700'   },
                  { label: 'Pago',            valor: dados.total.valorPago,      cor: 'text-emerald-700' },
                  { label: '% Execução',      valor: null, pct: dados.percentualExecucao, cor: 'text-purple-700' },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
                    <p className={`text-base font-bold ${kpi.cor}`}>
                      {kpi.pct !== undefined ? `${kpi.pct}%` : moeda(kpi.valor as number)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Tabela por secretaria */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-700">Por Secretaria</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {['Secretaria','Orçado','Empenhado','Pago','% Exec'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {dados.porSecretaria.map((s: ExecucaoSecretaria) => {
                        const percPago = s.valorAtual > 0 ? ((s.valorPago / s.valorAtual) * 100).toFixed(1) : '0.0'
                        return (
                          <tr key={s.secretaria} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-800">{s.secretaria}</td>
                            <td className="px-4 py-3 text-right whitespace-nowrap text-slate-700">{moeda(s.valorAtual)}</td>
                            <td className="px-4 py-3 text-right whitespace-nowrap text-amber-700">{moeda(s.valorEmpenhado)}</td>
                            <td className="px-4 py-3 text-right whitespace-nowrap text-emerald-700">{moeda(s.valorPago)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-16">
                                  <div className="h-full bg-emerald-400 rounded-full"
                                    style={{ width: `${Math.min(Number(percPago), 100)}%` }}/>
                                </div>
                                <span className="text-xs text-slate-500 w-10 text-right">{percPago}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── RECEITA ── */}
          {aba === 'receita' && dados.linhas && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border p-4 shadow-sm">
                  <p className="text-xs text-slate-500 mb-1">Previsto</p>
                  <p className="text-lg font-bold text-slate-800">{moeda(dados.total.valorPrevisto)}</p>
                </div>
                <div className="bg-white rounded-xl border p-4 shadow-sm">
                  <p className="text-xs text-slate-500 mb-1">Arrecadado</p>
                  <p className="text-lg font-bold text-emerald-700">{moeda(dados.total.arrecadado)}</p>
                </div>
                <div className="bg-white rounded-xl border p-4 shadow-sm">
                  <p className="text-xs text-slate-500 mb-1">Déficit / Superávit</p>
                  <p className={`text-lg font-bold ${dados.total.arrecadado >= dados.total.valorPrevisto ? 'text-emerald-700' : 'text-red-600'}`}>
                    {moeda(dados.total.arrecadado - dados.total.valorPrevisto)}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Código','Descrição','Natureza','Previsto','Arrecadado','%'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {dados.linhas.map((l: any) => (
                      <tr key={l.codigo} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{l.codigo}</td>
                        <td className="px-4 py-3 text-slate-700">{l.descricao}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{l.natureza.replace(/_/g,' ')}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">{moeda(l.valorPrevisto)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap text-emerald-700">{moeda(l.arrecadado)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full min-w-12">
                              <div className={`h-full rounded-full ${Number(l.percArrecadado) >= 100 ? 'bg-emerald-500' : 'bg-blue-400'}`}
                                style={{ width: `${Math.min(Number(l.percArrecadado), 100)}%` }}/>
                            </div>
                            <span className="text-xs text-slate-500">{l.percArrecadado}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── LRF PESSOAL ── */}
          {aba === 'lrf_pessoal' && dados.rcl !== undefined && (() => {
            const lrf = dados as LRFPessoal
            const sit = lrf.situacao
            const corSit = sit === 'ACIMA_LIMITE' ? 'text-red-600 bg-red-50 border-red-200' : sit === 'ALERTA' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
            const icone = sit === 'ACIMA_LIMITE' ? <AlertTriangle size={20}/> : sit === 'ALERTA' ? <AlertTriangle size={20}/> : <CheckCircle size={20}/>
            return (
              <div className="space-y-5">
                {/* Status card */}
                <div className={`rounded-xl border p-5 flex items-start gap-4 ${corSit}`}>
                  {icone}
                  <div>
                    <h3 className="font-bold text-base">
                      {sit === 'REGULAR' ? 'Dentro do limite legal' : sit === 'ALERTA' ? 'Zona de alerta LRF' : 'Acima do limite legal!'}
                    </h3>
                    <p className="text-sm mt-0.5">
                      Período: {lrf.periodo} · {pct(lrf.percentual)} da RCL · Limite: {lrf.limiteLegal}%
                    </p>
                  </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border p-5 shadow-sm">
                    <p className="text-xs text-slate-500 mb-1">RCL (12 meses)</p>
                    <p className="text-lg font-bold text-slate-800">{moeda(lrf.rcl)}</p>
                  </div>
                  <div className="bg-white rounded-xl border p-5 shadow-sm">
                    <p className="text-xs text-slate-500 mb-1">Desp. Pessoal</p>
                    <p className="text-lg font-bold text-slate-800">{moeda(lrf.despesaPessoal)}</p>
                  </div>
                  <div className="bg-white rounded-xl border p-5 shadow-sm">
                    <p className="text-xs text-slate-500 mb-1">% da RCL</p>
                    <p className={`text-lg font-bold ${sit === 'REGULAR' ? 'text-emerald-700' : sit === 'ALERTA' ? 'text-amber-700' : 'text-red-600'}`}>
                      {pct(lrf.percentual)}
                    </p>
                  </div>
                </div>

                {/* Termômetro */}
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <div className="flex justify-between text-xs text-slate-500 mb-2">
                    <span>0%</span>
                    <span className="text-amber-600">{lrf.limiteAlerta}% (alerta)</span>
                    <span className="text-red-600">{lrf.limiteLegal}% (limite)</span>
                  </div>
                  <BarraLRF percentual={Number(lrf.percentual)} limite={lrf.limiteLegal} alerta={lrf.limiteAlerta}/>
                  <div className="flex justify-between text-xs mt-2 text-slate-500">
                    <span>Art. 20, III, b LRF — Municípios: {lrf.limiteLegal}%</span>
                    <span>Art. 22 — Alerta: {lrf.limiteAlerta}%</span>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* ── FLUXO DE CAIXA ── */}
          {aba === 'fluxo' && dados.fluxo && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-700">Fluxo Mensal — {exercicio}</h3>
                </div>
                <GraficoFluxo fluxo={dados.fluxo}/>
              </div>

              {/* Tabela */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Mês','Receitas','Despesas','Saldo'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {dados.fluxo.map((m: FluxoMes) => (
                      <tr key={m.competencia} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-700">{mesLabel(m.competencia)}</td>
                        <td className="px-4 py-3 text-right text-emerald-700 whitespace-nowrap">{moeda(m.receitas)}</td>
                        <td className="px-4 py-3 text-right text-red-500 whitespace-nowrap">{moeda(m.despesas)}</td>
                        <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${m.saldo >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
                          {moeda(m.saldo)}
                        </td>
                      </tr>
                    ))}
                    {/* Total */}
                    <tr className="bg-slate-50 font-semibold">
                      <td className="px-4 py-3 text-slate-700">Total</td>
                      <td className="px-4 py-3 text-right text-emerald-700">{moeda(dados.fluxo.reduce((s: number, m: FluxoMes) => s + m.receitas, 0))}</td>
                      <td className="px-4 py-3 text-right text-red-500">{moeda(dados.fluxo.reduce((s: number, m: FluxoMes) => s + m.despesas, 0))}</td>
                      <td className={`px-4 py-3 text-right ${dados.fluxo.reduce((s: number, m: FluxoMes) => s + m.saldo, 0) >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
                        {moeda(dados.fluxo.reduce((s: number, m: FluxoMes) => s + m.saldo, 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
