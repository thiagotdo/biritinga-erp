'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Search, FilePlus2, ChevronLeft, ChevronRight,
  Loader2, ArrowRightLeft, FileText, X, CheckCircle,
  Clock, Archive, AlertTriangle, Send
} from 'lucide-react'

const fmtData = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'
const fmtDH   = (d: string) => d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'

const STATUS_COR: Record<string, string> = {
  ABERTO:      'bg-blue-100 text-blue-800',
  EM_ANALISE:  'bg-yellow-100 text-yellow-800',
  DEFERIDO:    'bg-green-100 text-green-800',
  INDEFERIDO:  'bg-red-100 text-red-800',
  CANCELADO:   'bg-orange-100 text-orange-800',
  ARQUIVADO:   'bg-gray-100 text-gray-700',
}
const STATUS_LABEL: Record<string, string> = {
  ABERTO:'Aberto', EM_ANALISE:'Em Análise', DEFERIDO:'Deferido',
  INDEFERIDO:'Indeferido', CANCELADO:'Cancelado', ARQUIVADO:'Arquivado',
}
const TIPO_LABEL: Record<string, string> = {
  REQUERIMENTO:'Requerimento', OFICIO:'Ofício', MEMORANDO:'Memorando',
  PROCESSO:'Processo', RECURSO:'Recurso', CONTRATO:'Contrato',
  CONVENIO:'Convênio', OUTRO:'Outro',
}

function ProcessosContent() {
  const sp = useSearchParams()
  const [protocolos, setProtocolos] = useState<any[]>([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [pages, setPages]           = useState(1)
  const [loading, setLoading]       = useState(true)
  const [busca, setBusca]           = useState('')
  const [filtStatus, setFiltStatus] = useState(sp.get('status') ?? '')
  const [sel, setSel]               = useState<any>(null)
  const [tramitacoes, setTramitacoes] = useState<any[]>([])
  const [tramitando, setTramitando]   = useState(false)
  const [formTram, setFormTram]       = useState({ setorDestinoNome: '', despacho: '', acao: 'TRAMITACAO' })
  const [salvando, setSalvando]       = useState(false)
  const [msg, setMsg]                 = useState('')

  const idParam = sp.get('id')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (busca)       params.set('busca', busca)
    if (filtStatus)  params.set('status', filtStatus)
    const r = await fetch(`/api/protocolo/v2?${params}`)
    const d = await r.json()
    setProtocolos(d.protocolos ?? [])
    setTotal(d.total ?? 0)
    setPages(d.pages ?? 1)
    setLoading(false)
  }, [page, busca, filtStatus])

  useEffect(() => { load() }, [load])

  const abrirDetalhe = async (id: string) => {
    const r = await fetch(`/api/protocolo/v2?id=${id}`)
    const d = await r.json()
    setSel(d.protocolo)
    setTramitacoes(d.tramitacoes ?? [])
  }

  useEffect(() => {
    if (idParam) abrirDetalhe(idParam)
  }, [idParam])

  const tramitar = async () => {
    if (!sel || !formTram.setorDestinoNome) return
    setSalvando(true)
    const r = await fetch('/api/protocolo/v2', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: sel.id,
        status: 'EM_ANALISE',
        setorDestinoNome: formTram.setorDestinoNome,
        despacho: formTram.despacho,
        acao: formTram.acao,
      })
    })
    setSalvando(false)
    if (r.ok) {
      setMsg('Tramitação registrada!')
      setTramitando(false)
      setFormTram({ setorDestinoNome: '', despacho: '', acao: 'TRAMITACAO' })
      abrirDetalhe(sel.id)
      load()
    }
  }

  const encerrar = async (acao: 'DEFERIDO' | 'INDEFERIDO' | 'ARQUIVADO' | 'CANCELADO') => {
    if (!sel) return
    setSalvando(true)
    const labels: Record<string,string> = { DEFERIDO:'deferido', INDEFERIDO:'indeferido', ARQUIVADO:'arquivado', CANCELADO:'cancelado' }
    const r = await fetch('/api/protocolo/v2', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sel.id, status: acao, acao, despacho: `Processo ${labels[acao]}` })
    })
    setSalvando(false)
    if (r.ok) {
      const msgs: Record<string,string> = { DEFERIDO:'Processo deferido!', INDEFERIDO:'Processo indeferido!', ARQUIVADO:'Processo arquivado!', CANCELADO:'Processo cancelado!' }
      setMsg(msgs[acao] ?? 'Concluído!')
      setSel((prev: any) => prev ? { ...prev, status: acao } : null)
      load()
    }
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Lista */}
      <div className="w-full lg:w-96 flex flex-col border-r border-gray-200 bg-white overflow-hidden">
        {/* Topo */}
        <div className="p-3 border-b border-gray-100 space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
              Processos ({total})
            </h1>
            <Link href="/gestao/protocolo/novo"
              className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
              <FilePlus2 className="w-3 h-3" /> Novo
            </Link>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
            <input
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="Buscar por número, assunto ou interessado..."
              value={busca}
              onChange={e => { setBusca(e.target.value); setPage(1) }}
            />
          </div>
          <select
            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-500"
            value={filtStatus}
            onChange={e => { setFiltStatus(e.target.value); setPage(1) }}
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {/* Lista de processos */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="animate-spin w-5 h-5 text-blue-600" />
            </div>
          ) : protocolos.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Nenhum processo encontrado</p>
            </div>
          ) : protocolos.map((p: any) => (
            <button
              key={p.id}
              onClick={() => abrirDetalhe(p.id)}
              className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors ${sel?.id === p.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-mono font-bold text-blue-600">{p.numero}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COR[p.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>
              </div>
              <p className="text-xs text-gray-800 font-medium truncate">{p.assunto}</p>
              {p.interessado && <p className="text-xs text-gray-400 truncate">{p.interessado}</p>}
              <p className="text-xs text-gray-400 mt-0.5">{fmtData(p.criadoEm)}</p>
            </button>
          ))}
        </div>

        {/* Paginação */}
        {pages > 1 && (
          <div className="flex items-center justify-between p-2 border-t border-gray-100">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-500">Pág. {page}/{pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Detalhe */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {sel ? (
          <div className="max-w-2xl mx-auto p-6 space-y-4">
            {msg && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                {msg}
                <button onClick={() => setMsg('')} className="ml-auto"><X className="w-3 h-3" /></button>
              </div>
            )}

            {/* Cabeçalho */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono font-bold text-blue-600">{sel.numero}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COR[sel.status] ?? 'bg-gray-100'}`}>
                      {STATUS_LABEL[sel.status] ?? sel.status}
                    </span>
                    {sel.prioridade === 'URGENTE' && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Urgente
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">{sel.assunto}</h2>
                  {sel.interessado && <p className="text-sm text-gray-500 mt-1">Interessado: <strong>{sel.interessado}</strong></p>}
                  {sel.setorAtualNome && <p className="text-sm text-gray-500">Setor atual: <strong>{sel.setorAtualNome}</strong></p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3 text-xs text-gray-600">
                <div><span className="font-medium">Tipo:</span> {TIPO_LABEL[sel.tipo] ?? sel.tipo}</div>
                <div><span className="font-medium">Abertura:</span> {fmtData(sel.dataAbertura ?? sel.criadoEm)}</div>
                {sel.prazo && <div><span className="font-medium">Prazo:</span> {fmtData(sel.prazo)}</div>}
                {sel.origem && <div><span className="font-medium">Origem:</span> {sel.origem}</div>}
              </div>
              {sel.observacoes && (
                <p className="mt-3 text-xs text-gray-600 bg-gray-50 rounded p-2">{sel.observacoes}</p>
              )}
            </div>

            {/* Ações */}
            {!['DEFERIDO','INDEFERIDO','ARQUIVADO','CANCELADO'].includes(sel.status) && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setTramitando(!tramitando)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Send className="w-4 h-4" /> Tramitar
                </button>
                <button
                  onClick={() => encerrar('DEFERIDO')}
                  disabled={salvando}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" /> Deferir
                </button>
                <button
                  onClick={() => encerrar('INDEFERIDO')}
                  disabled={salvando}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> Indeferir
                </button>
                <button
                  onClick={() => encerrar('ARQUIVADO')}
                  disabled={salvando}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
                >
                  <Archive className="w-4 h-4" /> Arquivar
                </button>
              </div>
            )}

            {/* Formulário de tramitação */}
            {tramitando && (
              <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-gray-800">Registrar Tramitação</h3>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Setor de Destino *</label>
                  <input
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="Ex: Secretaria de Finanças"
                    value={formTram.setorDestinoNome}
                    onChange={e => setFormTram(f => ({ ...f, setorDestinoNome: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Despacho / Observação</label>
                  <textarea
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                    rows={3}
                    placeholder="Informe o despacho ou instrução..."
                    value={formTram.despacho}
                    onChange={e => setFormTram(f => ({ ...f, despacho: e.target.value }))}
                  />
                </div>
                <select
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                  value={formTram.acao}
                  onChange={e => setFormTram(f => ({ ...f, acao: e.target.value }))}
                >
                  <option value="TRAMITACAO">Tramitação Normal</option>
                  <option value="DESPACHO">Despacho</option>
                  <option value="RETORNO">Retorno</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={tramitar}
                    disabled={salvando || !formTram.setorDestinoNome}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Confirmar
                  </button>
                  <button onClick={() => setTramitando(false)}
                    className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Histórico de tramitações */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  Histórico de Tramitações ({tramitacoes.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-50">
                {tramitacoes.length === 0 ? (
                  <p className="text-xs text-gray-400 p-4 text-center">Nenhuma movimentação registrada</p>
                ) : tramitacoes.map((t: any, i: number) => (
                  <div key={t.id} className="p-3 flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                        t.acao === 'ABERTURA' ? 'bg-blue-500' :
                        t.acao === 'ENCERRAMENTO' || t.acao === 'ARQUIVAMENTO' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}>
                        {i + 1}
                      </div>
                      {i < tramitacoes.length - 1 && <div className="w-0.5 h-full bg-gray-100 mt-1" />}
                    </div>
                    <div className="flex-1 min-w-0 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700">
                          {t.acao === 'ABERTURA' ? 'Abertura' :
                           t.acao === 'TRAMITACAO' ? 'Tramitação' :
                           t.acao === 'DESPACHO' ? 'Despacho' :
                           t.acao === 'RETORNO' ? 'Retorno' :
                           t.acao === 'ENCERRAMENTO' ? 'Encerramento' : t.acao}
                        </span>
                        <span className="text-xs text-gray-400">{fmtDH(t.dataHora ?? t.criadoEm)}</span>
                      </div>
                      {t.setorDestinoNome && (
                        <p className="text-xs text-gray-600">→ {t.setorDestinoNome}</p>
                      )}
                      {t.despacho && (
                        <p className="text-xs text-gray-500 mt-0.5 italic">"{t.despacho}"</p>
                      )}
                      {t.usuarioNome && (
                        <p className="text-xs text-gray-400">{t.usuarioNome}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <ArrowRightLeft className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">Selecione um processo para ver os detalhes</p>
            <Link href="/gestao/protocolo/novo"
              className="mt-3 text-xs text-blue-600 hover:underline flex items-center gap-1">
              <FilePlus2 className="w-3 h-3" /> Ou crie um novo protocolo
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProcessosPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>}>
      <ProcessosContent />
    </Suspense>
  )
}
