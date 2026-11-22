'use client'
import { useState, useEffect } from 'react'
import AdminShell from '@/components/AdminShell'
import Link from 'next/link'
import { BarChart2, FileText, DollarSign, TrendingUp, Eye, AlertTriangle } from 'lucide-react'

// ─── Painel Admin — Transparência (LAI 12.527/2011) ──────────────────────────

type DashTransparencia = {
  publicacoes: { total: number; publicadas: number; pendentes: number; vencidas: number }
  despesas: { total: number; valorTotal: number }
  receitas: { total: number; valorTotal: number }
  recentePublicacoes: Array<{ id: string; titulo: string; tipo: string; status: string; criadoEm: string }>
}

const fmtMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData  = (d: string) => new Date(d).toLocaleDateString('pt-BR')

const STATUS_COR: Record<string, string> = {
  PUBLICADO: 'bg-green-100 text-green-700',
  RASCUNHO:  'bg-gray-100 text-gray-600',
  REVISAO:   'bg-yellow-100 text-yellow-700',
  ARQUIVADO: 'bg-slate-100 text-slate-600',
}

const atalhos = [
  { href: '/gestao/transparencia/publicacoes', label: 'Publicações',  Icon: FileText,    cor: 'bg-blue-50   border-blue-200   text-blue-700'   },
  { href: '/gestao/transparencia/despesas',    label: 'Despesas',     Icon: DollarSign,  cor: 'bg-red-50    border-red-200    text-red-700'    },
  { href: '/gestao/transparencia/receitas',    label: 'Receitas',     Icon: TrendingUp,  cor: 'bg-green-50  border-green-200  text-green-700'  },
  { href: '/gestao/esic/transparencia',        label: 'Portal e-SIC', Icon: Eye,         cor: 'bg-purple-50 border-purple-200 text-purple-700' },
]

export default function TransparenciaAdminPage() {
  const [data, setData]       = useState<DashTransparencia | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Carregar dados de cada endpoint em paralelo
    Promise.allSettled([
      fetch('/api/transparencia/publicacao').then(r => r.json()),
      fetch('/api/transparencia/despesa').then(r => r.json()),
      fetch('/api/transparencia/receita').then(r => r.json()),
    ]).then(([pub, desp, rec]) => {
      const pubData  = pub.status  === 'fulfilled' ? pub.value  : null
      const despData = desp.status === 'fulfilled' ? desp.value : null
      const recData  = rec.status  === 'fulfilled' ? rec.value  : null

      const publicacoes = pubData?.publicacoes ?? pubData?.dados ?? []
      const despesas    = despData?.despesas ?? despData?.dados ?? []
      const receitas    = recData?.receitas ?? recData?.dados ?? []

      setData({
        publicacoes: {
          total:     publicacoes.length,
          publicadas: publicacoes.filter((p: any) => p.status === 'PUBLICADO').length,
          pendentes:  publicacoes.filter((p: any) => p.status === 'RASCUNHO' || p.status === 'REVISAO').length,
          vencidas:   0,
        },
        despesas: {
          total:      despesas.length,
          valorTotal: despesas.reduce((s: number, d: any) => s + (Number(d.valor) || 0), 0),
        },
        receitas: {
          total:      receitas.length,
          valorTotal: receitas.reduce((s: number, r: any) => s + (Number(r.valor) || 0), 0),
        },
        recentePublicacoes: publicacoes.slice(0, 5),
      })
    }).finally(() => setLoading(false))
  }, [])

  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        {/* Cabeçalho */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transparência Municipal</h1>
          <p className="text-sm text-gray-500 mt-1">
            Lei 12.527/2011 (LAI) · LC 131/2009 (Transparência Fiscal) · Decreto 7.185/2010
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Carregando…</div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs text-gray-500">Publicações</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{data?.publicacoes.total ?? 0}</p>
                <p className="text-xs text-green-600 mt-1">{data?.publicacoes.publicadas ?? 0} publicadas</p>
              </div>
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-xs text-gray-500">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-700 mt-1">{data?.publicacoes.pendentes ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">aguardando publicação</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs text-gray-500">Total Despesas</p>
                <p className="text-xl font-bold text-red-700 mt-1">{fmtMoeda(data?.despesas.valorTotal ?? 0)}</p>
                <p className="text-xs text-gray-500 mt-1">{data?.despesas.total ?? 0} registros</p>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-xs text-gray-500">Total Receitas</p>
                <p className="text-xl font-bold text-green-700 mt-1">{fmtMoeda(data?.receitas.valorTotal ?? 0)}</p>
                <p className="text-xs text-gray-500 mt-1">{data?.receitas.total ?? 0} registros</p>
              </div>
            </div>

            {/* Atalhos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {atalhos.map(({ href, label, Icon, cor }) => (
                <Link
                  key={label}
                  href={href}
                  className={`flex flex-col items-center gap-3 p-5 rounded-xl border text-center hover:shadow-sm transition-shadow ${cor}`}
                >
                  <Icon className="w-7 h-7" />
                  <span className="text-sm font-medium">{label}</span>
                </Link>
              ))}
            </div>

            {/* Publicações recentes */}
            {data && data.recentePublicacoes.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-800">Publicações Recentes</h2>
                  <Link href="/gestao/transparencia/publicacoes" className="text-sm text-blue-600 hover:underline">
                    Ver todas →
                  </Link>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Título','Tipo','Status','Data'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.recentePublicacoes.map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{p.titulo}</td>
                        <td className="px-4 py-3 text-gray-600">{p.tipo}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COR[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{fmtData(p.criadoEm)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Alerta obrigações */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <div className="flex gap-3 items-start">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-800">Obrigações de Transparência Ativa</p>
                  <ul className="text-sm text-amber-700 mt-2 space-y-1">
                    <li>• Receitas e despesas devem ser publicadas em tempo real (LC 131/2009)</li>
                    <li>• Portal de Transparência deve estar acessível 24h/dia</li>
                    <li>• Dados de servidores, contratos e licitações são de publicação obrigatória</li>
                    <li>• Relatório de gestão fiscal (RREO/RGF) — prazo bimestral/quadrimestral</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  )
}
