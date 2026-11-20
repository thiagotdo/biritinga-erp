'use client'
import { useEffect, useState } from 'react'
import {
  TrendingUp, TrendingDown, Wallet, BarChart2, FileText,
  AlertTriangle, ChevronRight, RefreshCw, CalendarDays,
  ArrowUpRight, ArrowDownRight, CircleDollarSign,
} from 'lucide-react'
import Link from 'next/link'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface KPI {
  orcamentoTotal:      number
  totalEmpenhado:      number
  totalPago:           number
  totalReceita:        number
  receitaPrevista:     number
  percentualEmpenhado: string
  percentualReceita:   string
}
interface MensalRow { mes: string; tipo: 'receita' | 'despesa'; valor: number }
interface UnidadeRow { unidade: string; sigla: string; orcado: number; empenhado: number; pago: number }
interface EmpenhoRow { id: string; numero: string; dataEmissao: string; valor: number; status: string; descricao: string; fornecedorNome?: string }
interface DashData {
  kpi: KPI
  mensal:          MensalRow[]
  porUnidade:      UnidadeRow[]
  ultimosEmpenhos: EmpenhoRow[]
  alertas:         { dotacoesAcima90pct: number }
  exercicio:       number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })

const brlM = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2).replace('.', ',')} mi`
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(1).replace('.', ',')} mil`
  return brl(v)
}

const statusColor: Record<string, string> = {
  EMITIDO:   'bg-blue-100 text-blue-800',
  LIQUIDADO: 'bg-yellow-100 text-yellow-800',
  PAGO:      'bg-green-100 text-green-800',
  ANULADO:   'bg-red-100 text-red-800',
  CANCELADO: 'bg-gray-100 text-gray-600',
}

// ─── Barra de progresso ───────────────────────────────────────────────────────
function ProgressBar({ value, max, color = 'var(--cor-primaria)' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 4, transition: 'width .4s' }} />
    </div>
  )
}

// ─── Gráfico mensal simples (barras SVG) ──────────────────────────────────────
function GraficoMensal({ dados }: { dados: MensalRow[] }) {
  if (!dados.length) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: '#9ca3af', fontSize: 14 }}>
      Sem dados
    </div>
  )

  // Agrupar por mês
  const meses = [...new Set(dados.map(r => r.mes))].sort().slice(-6)
  const grupos = meses.map(mes => ({
    mes,
    receita: dados.find(r => r.mes === mes && r.tipo === 'receita')?.valor ?? 0,
    despesa: dados.find(r => r.mes === mes && r.tipo === 'despesa')?.valor ?? 0,
  }))

  const maxVal = Math.max(...grupos.flatMap(g => [g.receita, g.despesa]), 1)
  const H = 120
  const nomeMes = (m: string) => {
    const [, mm] = m.split('-')
    return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(mm) - 1] ?? mm
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${grupos.length * 70} ${H + 30}`} style={{ width: '100%', minWidth: grupos.length * 70 }}>
        {grupos.map((g, i) => {
          const x     = i * 70
          const hR    = (g.receita / maxVal) * H
          const hD    = (g.despesa / maxVal) * H
          return (
            <g key={g.mes}>
              {/* Receita */}
              <rect x={x + 8}  y={H - hR} width={22} height={hR} fill="var(--cor-primaria)" rx={3} opacity={.85}>
                <title>{`Receita: ${brl(g.receita)}`}</title>
              </rect>
              {/* Despesa */}
              <rect x={x + 34} y={H - hD} width={22} height={hD} fill="var(--cor-acento)" rx={3} opacity={.85}>
                <title>{`Despesa: ${brl(g.despesa)}`}</title>
              </rect>
              {/* Rótulo mês */}
              <text x={x + 35} y={H + 16} textAnchor="middle" fontSize={10} fill="#6b7280">
                {nomeMes(g.mes)}
              </text>
            </g>
          )
        })}
      </svg>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 12, color: '#6b7280', marginTop: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--cor-primaria)', display: 'inline-block' }} /> Receita
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--cor-acento)', display: 'inline-block' }} /> Despesa
        </span>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SefinDashboard() {
  const [data, setData]       = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro]       = useState<string | null>(null)
  const [exercicio, setExercicio] = useState(new Date().getFullYear())

  async function carregar() {
    setLoading(true)
    setErro(null)
    try {
      const r = await fetch(`/api/sefin/dashboard?exercicio=${exercicio}`)
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.erro ?? `HTTP ${r.status}`)
      }
      setData(await r.json())
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [exercicio])

  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
            SEFIN — Secretaria de Finanças
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>
            Painel de execução orçamentária e financeira
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={exercicio}
            onChange={e => setExercicio(parseInt(e.target.value))}
            style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid #d1d5db',
              fontSize: 14, background: '#fff', cursor: 'pointer',
            }}
          >
            {anos.map(a => <option key={a}>{a}</option>)}
          </select>
          <button
            onClick={carregar}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8, border: '1px solid #d1d5db',
              background: '#fff', fontSize: 14, cursor: 'pointer', color: '#374151',
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Alerta de erro */}
      {erro && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10,
          padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center',
          color: '#dc2626', fontSize: 14,
        }}>
          <AlertTriangle size={16} />
          {erro.includes('Table') || erro.includes('doesn\'t exist')
            ? 'Tabelas SEFIN ainda não foram criadas. Execute /api/migrate para configurar o banco.'
            : erro}
        </div>
      )}

      {/* Alerta dotações acima de 90% */}
      {data && data.alertas.dotacoesAcima90pct > 0 && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10,
          padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center',
          color: '#92400e', fontSize: 14,
        }}>
          <AlertTriangle size={16} />
          <strong>{data.alertas.dotacoesAcima90pct}</strong>&nbsp;
          dotação(ões) com mais de 90% do saldo utilizado.
        </div>
      )}

      {/* KPI Cards */}
      {loading && !data ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{
              background: '#f3f4f6', borderRadius: 12, height: 110,
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      ) : data ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          {/* Orçamento */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0, fontWeight: 500 }}>ORÇAMENTO LOA</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '6px 0 0' }}>
                  {brlM(data.kpi.orcamentoTotal)}
                </p>
              </div>
              <div style={{ background: '#eff6ff', borderRadius: 8, padding: 8 }}>
                <BarChart2 size={20} color="#3b82f6" strokeWidth={1.5} />
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '10px 0 0' }}>Exercício {exercicio}</p>
          </div>

          {/* Empenhado */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0, fontWeight: 500 }}>EMPENHADO</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '6px 0 0' }}>
                  {brlM(data.kpi.totalEmpenhado)}
                </p>
              </div>
              <div style={{ background: '#fefce8', borderRadius: 8, padding: 8 }}>
                <FileText size={20} color="#ca8a04" strokeWidth={1.5} />
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <ProgressBar value={data.kpi.totalEmpenhado} max={data.kpi.orcamentoTotal} color="#ca8a04" />
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>
                {data.kpi.percentualEmpenhado}% do orçamento
              </p>
            </div>
          </div>

          {/* Pago */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0, fontWeight: 500 }}>PAGO</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '6px 0 0' }}>
                  {brlM(data.kpi.totalPago)}
                </p>
              </div>
              <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 8 }}>
                <Wallet size={20} color="#16a34a" strokeWidth={1.5} />
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <ProgressBar value={data.kpi.totalPago} max={data.kpi.totalEmpenhado} color="#16a34a" />
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>
                {data.kpi.totalEmpenhado > 0
                  ? ((data.kpi.totalPago / data.kpi.totalEmpenhado) * 100).toFixed(1)
                  : '0'}% do empenhado
              </p>
            </div>
          </div>

          {/* Receita arrecadada */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0, fontWeight: 500 }}>RECEITA ARRECADADA</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '6px 0 0' }}>
                  {brlM(data.kpi.totalReceita)}
                </p>
              </div>
              <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 8 }}>
                <TrendingUp size={20} color="#16a34a" strokeWidth={1.5} />
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <ProgressBar value={data.kpi.totalReceita} max={data.kpi.receitaPrevista} color="var(--cor-primaria)" />
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>
                {data.kpi.percentualReceita}% da meta
              </p>
            </div>
          </div>

          {/* Saldo */}
          <div style={{
            background: data.kpi.totalReceita >= data.kpi.totalPago ? '#f0fdf4' : '#fef2f2',
            borderRadius: 12,
            border: `1px solid ${data.kpi.totalReceita >= data.kpi.totalPago ? '#bbf7d0' : '#fca5a5'}`,
            padding: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0, fontWeight: 500 }}>SALDO FINANCEIRO</p>
                <p style={{
                  fontSize: 20, fontWeight: 700,
                  color: data.kpi.totalReceita >= data.kpi.totalPago ? '#16a34a' : '#dc2626',
                  margin: '6px 0 0',
                }}>
                  {brlM(data.kpi.totalReceita - data.kpi.totalPago)}
                </p>
              </div>
              <div style={{
                background: data.kpi.totalReceita >= data.kpi.totalPago ? '#dcfce7' : '#fee2e2',
                borderRadius: 8, padding: 8,
              }}>
                {data.kpi.totalReceita >= data.kpi.totalPago
                  ? <ArrowUpRight size={20} color="#16a34a" strokeWidth={1.5} />
                  : <ArrowDownRight size={20} color="#dc2626" strokeWidth={1.5} />
                }
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '10px 0 0' }}>Receita − Pagamentos</p>
          </div>
        </div>
      ) : null}

      {/* Grid: Gráfico + Unidades */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

          {/* Gráfico mensal */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', color: '#111827' }}>
              Receita × Despesa (últimos 6 meses)
            </h2>
            <GraficoMensal dados={data.mensal} />
          </div>

          {/* Execução por unidade */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', color: '#111827' }}>
              Execução por Unidade
            </h2>
            {data.porUnidade.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', paddingTop: 32 }}>
                Nenhuma unidade cadastrada
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {data.porUnidade.slice(0, 5).map(u => (
                  <div key={u.unidade}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 500, color: '#374151' }}>{u.sigla || u.unidade}</span>
                      <span style={{ color: '#6b7280' }}>
                        {brlM(u.empenhado)} / {brlM(u.orcado)}
                      </span>
                    </div>
                    <ProgressBar value={u.empenhado} max={u.orcado} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Últimos empenhos */}
      {data && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: '#111827' }}>
              Últimos Empenhos
            </h2>
            <Link href="/gestao/sefin/empenhos" style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 13, color: 'var(--cor-primaria)', textDecoration: 'none', fontWeight: 500,
            }}>
              Ver todos <ChevronRight size={14} />
            </Link>
          </div>

          {data.ultimosEmpenhos.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
              Nenhum empenho cadastrado
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    {['Número', 'Data', 'Fornecedor', 'Descrição', 'Valor', 'Status'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 12 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.ultimosEmpenhos.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--cor-primaria)' }}>{e.numero}</td>
                      <td style={{ padding: '10px 12px', color: '#374151' }}>
                        {new Date(e.dataEmissao).toLocaleDateString('pt-BR')}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#374151' }}>{e.fornecedorNome ?? '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#374151', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.descricao}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827' }}>{brl(e.valor)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          ...(statusColor[e.status]
                            ? {}
                            : { background: '#f3f4f6', color: '#6b7280' }),
                        }}
                          className={statusColor[e.status] ?? ''}
                        >
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Acesso rápido */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 20 }}>
        {[
          { href: '/gestao/sefin/empenhos',  icon: FileText,         label: 'Empenhos'   },
          { href: '/gestao/sefin/receitas',  icon: TrendingUp,       label: 'Receitas'   },
          { href: '/gestao/sefin/pagamentos',icon: CircleDollarSign, label: 'Pagamentos' },
          { href: '/gestao/sefin/orcamento', icon: BarChart2,        label: 'Orçamento'  },
          { href: '/gestao/sefin/fornecedores', icon: CalendarDays,  label: 'Fornecedores' },
        ].map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 8, padding: '16px 12px', background: '#fff', borderRadius: 10,
            border: '1px solid #e5e7eb', textDecoration: 'none',
            transition: 'border-color .15s, box-shadow .15s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--cor-primaria)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb' }}
          >
            <Icon size={22} color="var(--cor-primaria)" strokeWidth={1.5} />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{label}</span>
          </Link>
        ))}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.5 } }
      `}</style>
    </div>
  )
}
