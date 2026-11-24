'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plane, Search, Loader2, MapPin, Clock, CheckCircle2, X } from 'lucide-react'
import Link from 'next/link'

const fmtData = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'
const fmtMoeda = (v: number) => Number(v).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })

const STATUS_COR: Record<string,string> = {
  SOLICITADA:'bg-blue-100 text-blue-800', APROVADA:'bg-green-100 text-green-800',
  EM_ANDAMENTO:'bg-yellow-100 text-yellow-800', CONCLUIDA:'bg-gray-100 text-gray-700',
  CANCELADA:'bg-red-100 text-red-800',
}
const STATUS_LABEL: Record<string,string> = {
  SOLICITADA:'Solicitada', APROVADA:'Aprovada', EM_ANDAMENTO:'Em Andamento',
  CONCLUIDA:'Concluída', CANCELADA:'Cancelada'
}
const TRANSPORTE_LABEL: Record<string,string> = {
  VEICULO_PROPRIO:'Veículo Próprio', VEICULO_OFICIAL:'Veículo Oficial',
  ONIBUS:'Ônibus', AVIAO:'Avião', OUTRO:'Outro'
}

export default function ViagensLista() {
  const sp = useSearchParams()
  const statusFiltro = sp.get('status') ?? ''

  const [items, setItems] = useState<any[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    const qs = statusFiltro ? `status=${statusFiltro}` : ''
    const r = await fetch(`/api/diarias/viagem?${qs}`)
    const d = await r.json()
    setItems(d.viagens ?? [])
    setLoading(false)
  }, [statusFiltro])

  useEffect(() => { carregar() }, [carregar])

  const aprovar = async (id: string, numero: string) => {
    const r = await fetch('/api/diarias/viagem', {
      method: 'PATCH', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ id, status: 'APROVADA', autorizadoPor: 'Prefeito Municipal' })
    })
    if (r.ok) { setMsg(`Viagem ${numero} aprovada.`); carregar() }
  }

  const avancarStatus = async (id: string, numero: string, novoStatus: string) => {
    const r = await fetch('/api/diarias/viagem', {
      method: 'PATCH', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ id, status: novoStatus })
    })
    if (r.ok) { setMsg(`Viagem ${numero} atualizada.`); carregar() }
  }

  const filtrados = busca.length >= 2
    ? items.filter(v =>
        v.servidorNome?.toLowerCase().includes(busca.toLowerCase()) ||
        v.destino?.toLowerCase().includes(busca.toLowerCase()) ||
        v.numero?.includes(busca))
    : items

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/gestao/diarias" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <Plane className="w-4 h-4" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">
            {statusFiltro ? `Viagens — ${STATUS_LABEL[statusFiltro] ?? statusFiltro}` : 'Todas as Viagens'}
          </h1>
        </div>
        <Link href="/gestao/diarias/viagens/nova"
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm font-medium">
          + Nova Viagem
        </Link>
      </div>

      {msg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          {msg}
          <button onClick={() => setMsg('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="Buscar por servidor, destino ou número..."
          value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8 text-sky-600" /></div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Plane className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhuma viagem encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((v: any) => (
            <div key={v.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-mono font-semibold text-sky-600">{v.numero}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COR[v.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABEL[v.status] ?? v.status}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {TRANSPORTE_LABEL[v.meioDTransporte] ?? v.meioDTransporte}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{v.servidorNome}</p>
                  {v.servidorCargo && <p className="text-xs text-gray-500">{v.servidorCargo}</p>}
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{v.destino}{v.estadoDestino ? ` - ${v.estadoDestino}` : ''}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtData(v.dataPartida)} → {fmtData(v.dataRetorno)}</span>
                  </div>
                  {v.objetivo && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{v.objetivo}</p>
                  )}
                  {v.autorizado === 1 && v.autorizadoPor && (
                    <p className="text-xs text-green-600 mt-1">✓ Autorizado por {v.autorizadoPor}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-bold text-sky-700">{fmtMoeda(Number(v.valorTotal))}</p>
                  <p className="text-xs text-gray-400">{v.quantidadeDiarias}x {fmtMoeda(Number(v.valorDiaria))}</p>
                  {v.adiantamento > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Adiant.: {fmtMoeda(Number(v.adiantamento))}
                    </p>
                  )}
                  <div className="flex flex-col gap-1 mt-2">
                    {v.status === 'SOLICITADA' && (
                      <button onClick={() => aprovar(v.id, v.numero)}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 font-medium">
                        Aprovar
                      </button>
                    )}
                    {v.status === 'APROVADA' && (
                      <button onClick={() => avancarStatus(v.id, v.numero, 'EM_ANDAMENTO')}
                        className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-lg hover:bg-yellow-200 font-medium">
                        Iniciar Viagem
                      </button>
                    )}
                    {v.status === 'EM_ANDAMENTO' && (
                      <button onClick={() => avancarStatus(v.id, v.numero, 'CONCLUIDA')}
                        className="px-3 py-1 bg-sky-100 text-sky-800 text-xs rounded-lg hover:bg-sky-200 font-medium">
                        Concluir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
