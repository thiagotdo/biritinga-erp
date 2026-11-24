'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  MessageSquare, Search, X, Loader2, CheckCircle2,
  Clock, AlertCircle, Send
} from 'lucide-react'
import Link from 'next/link'

const fmtData = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

const STATUS_COR: Record<string,string> = {
  RECEBIDA:'bg-blue-100 text-blue-800', EM_ANALISE:'bg-yellow-100 text-yellow-800',
  RESPONDIDA:'bg-green-100 text-green-800', ENCERRADA:'bg-gray-100 text-gray-700',
  CANCELADA:'bg-red-100 text-red-800',
}
const STATUS_LABEL: Record<string,string> = {
  RECEBIDA:'Recebida', EM_ANALISE:'Em Análise', RESPONDIDA:'Respondida', ENCERRADA:'Encerrada', CANCELADA:'Cancelada'
}
const TIPO_LABEL: Record<string,string> = {
  RECLAMACAO:'Reclamação', SUGESTAO:'Sugestão', ELOGIO:'Elogio',
  DENUNCIA:'Denúncia', SOLICITACAO_LAI:'Solicitação LAI', PEDIDO_INFORMACAO:'Pedido de Info.'
}

export default function ManifestacoesList() {
  const sp = useSearchParams()
  const statusFiltro = sp.get('status') ?? ''
  const tipoFiltro   = sp.get('tipo') ?? ''

  const [items, setItems]     = useState<any[]>([])
  const [busca, setBusca]     = useState('')
  const [loading, setLoading] = useState(true)
  const [sel, setSel]         = useState<any>(null)
  const [modal, setModal]     = useState<'responder'|'encerrar'|null>(null)
  const [resposta, setResposta] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg]         = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    const qs = busca.length >= 2 ? `busca=${encodeURIComponent(busca)}`
              : statusFiltro ? `status=${statusFiltro}`
              : tipoFiltro ? `tipo=${tipoFiltro}` : ''
    const r = await fetch(`/api/ouvidoria/manifestacao?${qs}`)
    const d = await r.json()
    setItems(d.manifestacoes ?? [])
    setLoading(false)
  }, [busca, statusFiltro, tipoFiltro])

  useEffect(() => { carregar() }, [carregar])

  const responder = async () => {
    if (!sel || !resposta.trim()) return
    setSalvando(true)
    const r = await fetch('/api/ouvidoria/manifestacao', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id: sel.id, status:'RESPONDIDA', resposta })
    })
    setSalvando(false)
    if (r.ok) {
      setMsg(`Manifestação ${sel.numero} respondida com sucesso.`)
      setModal(null); setSel(null); setResposta('')
      carregar()
    }
  }

  const encerrar = async (id: string, numero: string, status: string) => {
    const r = await fetch('/api/ouvidoria/manifestacao', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id, status })
    })
    if (r.ok) { setMsg(`Manifestação ${numero} atualizada.`); carregar() }
  }

  const isAtiva = (s: string) => !['RESPONDIDA','ENCERRADA','CANCELADA'].includes(s)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/gestao/ouvidoria" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <MessageSquare className="w-4 h-4" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">
            {statusFiltro ? `Manifestações — ${STATUS_LABEL[statusFiltro] ?? statusFiltro}`
              : tipoFiltro ? `Manifestações — ${TIPO_LABEL[tipoFiltro] ?? tipoFiltro}`
              : 'Todas as Manifestações'}
          </h1>
        </div>
        <Link href="/gestao/ouvidoria/nova"
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
          + Nova
        </Link>
      </div>

      {msg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          {msg}
          <button onClick={() => setMsg('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-purple-500"
          placeholder="Buscar por número ou assunto..."
          value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8 text-purple-600" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhuma manifestação encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((m: any) => {
            const vencendo = m.prazo && isAtiva(m.status) &&
              new Date(m.prazo) <= new Date(Date.now() + 3*24*60*60*1000)
            return (
              <div key={m.id} className={`bg-white rounded-xl border shadow-sm p-4 ${vencendo ? 'border-orange-300' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono font-semibold text-purple-600">{m.numero}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COR[m.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABEL[m.status] ?? m.status}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                        {TIPO_LABEL[m.tipo] ?? m.tipo}
                      </span>
                      {m.sigiloso === 1 && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Sigiloso</span>}
                      {vencendo && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertCircle className="w-3 h-3" />Prazo próximo</span>}
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">{m.assunto}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      {m.anonimo ? <span className="italic">Anônimo</span> : m.nomeRequerente && <span>{m.nomeRequerente}</span>}
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Aberto em {fmtData(m.criadoEm)}</span>
                      {m.prazo && <span>Prazo: {fmtData(m.prazo)}</span>}
                      {m.setorResponsavel && <span>Setor: {m.setorResponsavel}</span>}
                    </div>
                    {m.descricao && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">{m.descricao}</p>
                    )}
                    {m.resposta && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded-lg">
                        <p className="text-xs font-medium text-green-700 mb-0.5">Resposta:</p>
                        <p className="text-xs text-green-800">{m.resposta}</p>
                      </div>
                    )}
                  </div>
                  {isAtiva(m.status) && (
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => { setSel(m); setResposta(''); setModal('responder') }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium"
                      >
                        <Send className="w-3 h-3" />Responder
                      </button>
                      {m.status === 'RECEBIDA' && (
                        <button
                          onClick={() => encerrar(m.id, m.numero, 'EM_ANALISE')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 text-xs font-medium"
                        >
                          Em Análise
                        </button>
                      )}
                      <button
                        onClick={() => encerrar(m.id, m.numero, 'ENCERRADA')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs font-medium"
                      >
                        Encerrar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Responder */}
      {modal === 'responder' && sel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Responder Manifestação</h2>
              <button onClick={() => { setModal(null); setSel(null) }}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-mono text-purple-600">{sel.numero}</p>
              <p className="text-sm font-medium text-gray-900">{sel.assunto}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Resposta Oficial *</label>
                <textarea
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                  rows={5}
                  placeholder="Redija a resposta oficial à manifestação..."
                  value={resposta}
                  onChange={e => setResposta(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={responder} disabled={salvando || !resposta.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium">
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar Resposta
                </button>
                <button onClick={() => { setModal(null); setSel(null) }}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
