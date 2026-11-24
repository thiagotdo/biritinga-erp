'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  MessageSquare, Plus, Clock, CheckCircle2, AlertCircle,
  Megaphone, FileQuestion, Loader2, TrendingUp, Shield
} from 'lucide-react'

const fmtData = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

const STATUS_COR: Record<string,string> = {
  RECEBIDA:   'bg-blue-100 text-blue-800',
  EM_ANALISE: 'bg-yellow-100 text-yellow-800',
  RESPONDIDA: 'bg-green-100 text-green-800',
  ENCERRADA:  'bg-gray-100 text-gray-700',
  CANCELADA:  'bg-red-100 text-red-800',
}
const STATUS_LABEL: Record<string,string> = {
  RECEBIDA:'Recebida', EM_ANALISE:'Em Análise', RESPONDIDA:'Respondida', ENCERRADA:'Encerrada', CANCELADA:'Cancelada'
}
const TIPO_LABEL: Record<string,string> = {
  RECLAMACAO:'Reclamação', SUGESTAO:'Sugestão', ELOGIO:'Elogio',
  DENUNCIA:'Denúncia', SOLICITACAO_LAI:'Solicitação LAI', PEDIDO_INFORMACAO:'Pedido de Informação'
}
const TIPO_COR: Record<string,string> = {
  RECLAMACAO:'text-red-700', SUGESTAO:'text-blue-700', ELOGIO:'text-green-700',
  DENUNCIA:'text-purple-700', SOLICITACAO_LAI:'text-orange-700', PEDIDO_INFORMACAO:'text-teal-700'
}

export default function OuvidoriaDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ouvidoria/manifestacao?stats=1')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const totalPorStatus = (s: string) =>
    stats?.porStatus?.find((x: any) => x.status === s)?.total ?? 0
  const total = stats?.porStatus?.reduce((a: number, x: any) => a + Number(x.total), 0) ?? 0

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin w-8 h-8 text-purple-600" />
    </div>
  )

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-purple-600" />
            Ouvidoria Municipal
          </h1>
          <p className="text-gray-500 mt-1">Manifestações, reclamações, sugestões e transparência (LAI)</p>
        </div>
        <Link
          href="/gestao/ouvidoria/nova"
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Nova Manifestação
        </Link>
      </div>

      {/* Alerta prazo */}
      {stats?.vencendo > 0 && (
        <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-800">
              {stats.vencendo} manifestação(ões) com prazo vencendo nos próximos 3 dias
            </p>
            <Link href="/gestao/ouvidoria/manifestacoes" className="text-xs text-orange-700 underline">Ver todas →</Link>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:'Total',      value: total,                       Icon: MessageSquare, cor:'text-purple-600' },
          { label:'Recebidas',  value: totalPorStatus('RECEBIDA'),  Icon: Clock,         cor:'text-blue-600'   },
          { label:'Em Análise', value: totalPorStatus('EM_ANALISE'),Icon: TrendingUp,    cor:'text-yellow-600' },
          { label:'Respondidas',value: totalPorStatus('RESPONDIDA'),Icon: CheckCircle2,  cor:'text-green-600'  },
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

      {/* Atalhos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { href:'/gestao/ouvidoria/manifestacoes',               label:'Todas as Manifestações', Icon: MessageSquare, cor:'bg-purple-50 border-purple-200 text-purple-700' },
          { href:'/gestao/ouvidoria/manifestacoes?tipo=RECLAMACAO',label:'Reclamações',            Icon: Megaphone,     cor:'bg-red-50 border-red-200 text-red-700'           },
          { href:'/gestao/ouvidoria/manifestacoes?tipo=SOLICITACAO_LAI', label:'Pedidos LAI',    Icon: FileQuestion,  cor:'bg-orange-50 border-orange-200 text-orange-700'   },
          { href:'/gestao/ouvidoria/manifestacoes?tipo=DENUNCIA',  label:'Denúncias',             Icon: Shield,        cor:'bg-blue-50 border-blue-200 text-blue-700'         },
          { href:'/gestao/ouvidoria/manifestacoes?status=EM_ANALISE', label:'Em Análise',        Icon: TrendingUp,    cor:'bg-yellow-50 border-yellow-200 text-yellow-700'   },
          { href:'/gestao/ouvidoria/nova',                         label:'Nova Manifestação',     Icon: Plus,          cor:'bg-green-50 border-green-200 text-green-700'      },
        ].map(({ href, label, Icon, cor }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-3 p-4 rounded-xl border ${cor} hover:opacity-80 transition-opacity`}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        ))}
      </div>

      {/* Por tipo */}
      {stats?.porTipo?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Manifestações por Tipo</h2>
          <div className="space-y-2">
            {stats.porTipo.map((t: any) => (
              <div key={t.tipo} className="flex items-center gap-3">
                <span className={`text-xs font-medium w-44 truncate ${TIPO_COR[t.tipo] ?? 'text-gray-600'}`}>
                  {TIPO_LABEL[t.tipo] ?? t.tipo}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full"
                    style={{ width: total > 0 ? `${(Number(t.total)/total)*100}%` : '0%' }} />
                </div>
                <span className="text-sm font-semibold text-gray-700 w-8 text-right">{Number(t.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recentes */}
      {stats?.recentes?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Manifestações Recentes</h2>
            <Link href="/gestao/ouvidoria/manifestacoes" className="text-xs text-purple-600 hover:underline">Ver todas →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentes.map((m: any) => (
              <Link key={m.id} href={`/gestao/ouvidoria/manifestacoes?id=${m.id}`}
                className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono font-semibold text-purple-600">{m.numero}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COR[m.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABEL[m.status] ?? m.status}
                    </span>
                    <span className={`text-xs font-medium ${TIPO_COR[m.tipo] ?? 'text-gray-600'}`}>
                      {TIPO_LABEL[m.tipo] ?? m.tipo}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 font-medium truncate">{m.assunto}</p>
                  {!m.anonimo && m.nomeRequerente && (
                    <p className="text-xs text-gray-400 truncate">{m.nomeRequerente}</p>
                  )}
                  {m.anonimo && <p className="text-xs text-gray-400 italic">Anônimo</p>}
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap">{fmtData(m.criadoEm)}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!total && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma manifestação registrada</p>
          <Link href="/gestao/ouvidoria/nova"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
            <Plus className="w-4 h-4" />
            Registrar primeira manifestação
          </Link>
        </div>
      )}
    </div>
  )
}
