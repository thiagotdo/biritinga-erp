'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Handshake, Search, Loader2, Building2, Calendar } from 'lucide-react'
import Link from 'next/link'

const fmtMoeda = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })
const fmtData  = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

const STATUS_COR: Record<string,string> = {
  VIGENTE:'bg-green-100 text-green-800',
  EM_EXECUCAO:'bg-blue-100 text-blue-800',
  CELEBRADO:'bg-indigo-100 text-indigo-800',
  CONCLUIDO:'bg-gray-100 text-gray-700',
  SUSPENSO:'bg-yellow-100 text-yellow-800',
  RESCINDIDO:'bg-red-200 text-red-900',
}
const STATUS_LABEL: Record<string,string> = {
  VIGENTE:'Vigente', EM_EXECUCAO:'Em Execução', CELEBRADO:'Celebrado',
  CONCLUIDO:'Concluído', SUSPENSO:'Suspenso', RESCINDIDO:'Rescindido'
}

function ConveniosListaInner() {
  const sp = useSearchParams()
  const statusFiltro = sp.get('status') ?? ''

  const [items, setItems] = useState<any[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async () => {
    setLoading(true)
    const qs = statusFiltro ? `status=${statusFiltro}` : ''
    const r = await fetch(`/api/convenios/convenio?${qs}`)
    const d = await r.json()
    setItems(d.convenios ?? [])
    setLoading(false)
  }, [statusFiltro])

  useEffect(() => { carregar() }, [carregar])

  const filtrados = busca.length >= 2
    ? items.filter(c =>
        c.objeto?.toLowerCase().includes(busca.toLowerCase()) ||
        c.concedente?.toLowerCase().includes(busca.toLowerCase()) ||
        c.numero?.includes(busca))
    : items

  const vencendo = (c: any) => (c.status === 'VIGENTE' || c.status === 'EM_EXECUCAO') && c.dataFim &&
    new Date(c.dataFim) <= new Date(Date.now() + 30*24*60*60*1000)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/gestao/convenios" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <Handshake className="w-4 h-4" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">
            {statusFiltro ? `Convênios — ${STATUS_LABEL[statusFiltro] ?? statusFiltro}`
              : 'Todos os Convênios'}
          </h1>
        </div>
        <Link href="/gestao/convenios/novo"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
          + Novo
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Buscar por objeto, concedente ou número..."
          value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8 text-indigo-600" /></div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Handshake className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum convênio encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((c: any) => (
            <div key={c.id} className={`bg-white rounded-xl border shadow-sm p-4 ${vencendo(c) ? 'border-orange-300' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-mono font-semibold text-indigo-600">{c.numero}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COR[c.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                    {vencendo(c) && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                        Vence em breve
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">{c.objeto}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{c.concedente}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtData(c.dataInicio)} → {fmtData(c.dataFim)}</span>
                  </div>
                  {c.programaFederal && <p className="text-xs text-indigo-500 mt-1">Programa: {c.programaFederal}</p>}
                  {c.secretariaExecutora && <p className="text-xs text-gray-400 mt-0.5">Exec.: {c.secretariaExecutora}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-bold text-indigo-700">{fmtMoeda(Number(c.valorTotal))}</p>
                  <p className="text-xs text-gray-400">Repasse: {fmtMoeda(Number(c.valorRepasse))}</p>
                  {Number(c.valorDesembolsado) > 0 && (
                    <p className="text-xs text-green-600 mt-0.5">
                      Desembolsado: {fmtMoeda(Number(c.valorDesembolsado))}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ConveniosLista() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8 text-indigo-600" /></div>}>
      <ConveniosListaInner />
    </Suspense>
  )
}
