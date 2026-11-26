'use client'

import { useState, useEffect } from 'react'
import {
  Scale, Search, Eye, CheckCircle2, AlertCircle, Clock,
  XCircle, FileText, Loader2, RefreshCw, Calendar,
  ChevronRight, MessageSquare, Flag, AlertTriangle,
  BookOpen, UserCheck, Mail,
} from 'lucide-react'

interface Solicitacao {
  id: string
  protocolo: string
  nome: string
  email: string
  orgao: string
  assunto: string
  tipo: string
  status: string
  prioridade: string
  canal: string
  dataAbertura: string
  prazoResposta: string
  prorrogadoAte: string | null
  dataResposta: string | null
  respondidoPor: string | null
}

interface Resumo { status: string; qtd: number; atrasados: number }

const STATUS_CFG: Record<string, { label: string; cls: string; Icon: any }> = {
  RECEBIDO:               { label: 'Recebido',          cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',     Icon: FileText },
  EM_ANALISE:             { label: 'Em análise',         cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300', Icon: Search },
  AGUARDANDO_COMPLEMENTO: { label: 'Ag. complemento',   cls: 'bg-orange-100 text-orange-700',                                        Icon: AlertCircle },
  RESPONDIDO:             { label: 'Respondido',         cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',  Icon: CheckCircle2 },
  PRORROGADO:             { label: 'Prorrogado',         cls: 'bg-yellow-100 text-yellow-700',                                        Icon: Clock },
  NEGADO:                 { label: 'Negado',             cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',         Icon: XCircle },
  RECURSO_ABERTO:         { label: 'Recurso aberto',     cls: 'bg-purple-100 text-purple-700',                                        Icon: Flag },
  ARQUIVADO:              { label: 'Arquivado',          cls: 'bg-gray-100 text-gray-500',                                            Icon: BookOpen },
}

const STATUS_ABERTOS = ['RECEBIDO', 'EM_ANALISE', 'AGUARDANDO_COMPLEMENTO', 'PRORROGADO', 'RECURSO_ABERTO']

export default function SicAdminPage() {
  const [solic, setSolic] = useState<Solicitacao[]>([])
  const [resumo, setResumo] = useState<Resumo[]>([])
  const [total, setTotal] = useState(0)
  const [prazoMedio, setPrazoMedio] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusSel, setStatusSel] = useState('TODOS')
  const [busca, setBusca] = useState('')
  const [detalhe, setDetalhe] = useState<string | null>(null)
  const [detalheData, setDetalheData] = useState<any>(null)
  const [resposta, setResposta] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  function carregar() {
    setLoading(true)
    const params = new URLSearchParams({ status: statusSel, ...(busca && { busca }) })
    fetch(`/api/sic/solicitacao?${params}`)
      .then(r => r.json())
      .then(d => {
        setSolic(d.solicitacoes ?? [])
        setTotal(d.total ?? 0)
        setResumo(d.resumo ?? [])
        setPrazoMedio(d.estatisticas?.prazoMedioResposta ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [statusSel])

  async function abrirDetalhe(id: string) {
    setDetalhe(id)
    const sol = solic.find(s => s.id === id)
    if (sol) {
      // Buscar detalhes completos pelo protocolo
      const r = await fetch(`/api/sic/solicitacao?protocolo=${sol.protocolo}`)
      const d = await r.json()
      setDetalheData(d.solicitacao)
      setResposta(d.solicitacao?.resposta ?? '')
    }
  }

  async function responder(id: string, novoStatus: string) {
    if (novoStatus === 'RESPONDIDO' && !resposta.trim()) {
      alert('Digite o texto da resposta')
      return
    }
    setSalvando(true)
    try {
      const r = await fetch('/api/sic/solicitacao', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: novoStatus, resposta: resposta || undefined }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.erro)
      setMsg('Atualizado com sucesso!')
      setTimeout(() => setMsg(null), 3000)
      setDetalhe(null)
      setDetalheData(null)
      carregar()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSalvando(false)
    }
  }

  async function prorrogar(id: string) {
    if (!confirm('Prorrogar prazo de resposta em 10 dias úteis?')) return
    await fetch('/api/sic/solicitacao', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, prorrogar: true }),
    })
    setMsg('Prazo prorrogado!')
    setTimeout(() => setMsg(null), 3000)
    setDetalhe(null)
    carregar()
  }

  const totalAbertos  = resumo.filter(r => STATUS_ABERTOS.includes(r.status)).reduce((a,r) => a + Number(r.qtd), 0)
  const totalResp     = resumo.find(r => r.status === 'RESPONDIDO')?.qtd ?? 0
  const totalAtrasados = resumo.reduce((a,r) => a + Number(r.atrasados), 0)
  const totalNegados  = resumo.find(r => r.status === 'NEGADO')?.qtd ?? 0

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Scale size={28} className="text-purple-600" />
          SIC — Serviço de Informação ao Cidadão
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Lei nº 12.527/2011 — Lei de Acesso à Informação · Prazo legal: 20 dias úteis + 10 prorrogáveis
        </p>
      </div>

      {msg && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 border border-green-200 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg text-sm">
          <CheckCircle2 size={16} /> {msg}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Em aberto',    valor: totalAbertos,  cor: 'blue',   icon: Clock },
          { label: 'Respondidos',  valor: totalResp,     cor: 'green',  icon: CheckCircle2 },
          { label: 'Atrasados',    valor: totalAtrasados,cor: 'red',    icon: AlertTriangle },
          { label: 'Negados',      valor: totalNegados,  cor: 'orange', icon: XCircle },
          { label: 'Prazo médio (dias)', valor: prazoMedio !== null ? `${prazoMedio}d` : '—', cor: 'purple', icon: Calendar },
        ].map(k => {
          const Icon = k.icon
          return (
            <div key={k.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={`text-${k.cor}-500`} />
                <p className="text-xs text-gray-500 dark:text-gray-400">{k.label}</p>
              </div>
              <p className={`text-2xl font-bold text-${k.cor}-600`}>{k.valor}</p>
            </div>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && carregar()}
            placeholder="Buscar por nome, protocolo, assunto..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
        <select
          value={statusSel}
          onChange={e => setStatusSel(e.target.value)}
          className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 outline-none"
        >
          <option value="TODOS">Todos os status</option>
          <option value="RECEBIDO">Recebidos</option>
          <option value="EM_ANALISE">Em análise</option>
          <option value="PRORROGADO">Prorrogados</option>
          <option value="RESPONDIDO">Respondidos</option>
          <option value="NEGADO">Negados</option>
          <option value="ARQUIVADO">Arquivados</option>
        </select>
        <span className="text-sm text-gray-400">{total} pedido(s)</span>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-purple-600" size={36} />
        </div>
      ) : (
        <div className="space-y-2">
          {solic.map(s => {
            const st = STATUS_CFG[s.status] ?? STATUS_CFG.RECEBIDO
            const StIcon = st.Icon
            const hoje = new Date()
            const prazo = new Date(s.prorrogadoAte || s.prazoResposta)
            const atrasado = !s.dataResposta && prazo < hoje
            const diasRestantes = Math.ceil((prazo.getTime() - hoje.getTime()) / 86400000)

            return (
              <div
                key={s.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-4 flex gap-4 cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 transition-colors ${
                  atrasado ? 'border-red-200 dark:border-red-800' : 'border-gray-100 dark:border-gray-700'
                }`}
                onClick={() => abrirDetalhe(s.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-purple-600">{s.protocolo}</span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>
                      <StIcon size={11} /> {st.label}
                    </span>
                    {atrasado && (
                      <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <AlertTriangle size={10} /> ATRASADO
                      </span>
                    )}
                    {!s.dataResposta && !atrasado && diasRestantes <= 5 && (
                      <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                        {diasRestantes}d restantes
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mt-1 text-sm truncate">{s.assunto}</h3>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-400 flex-wrap">
                    <span>{s.nome}</span>
                    <span>{s.orgao}</span>
                    <span>Prazo: {new Date(s.prazoResposta + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    {s.prorrogadoAte && (
                      <span className="text-yellow-600">Prorrogado até: {new Date(s.prorrogadoAte + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 flex-shrink-0 self-center" />
              </div>
            )
          })}

          {solic.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Scale size={48} className="mx-auto mb-3 opacity-30" />
              <p>Nenhum pedido encontrado</p>
            </div>
          )}
        </div>
      )}

      {/* Modal detalhe/resposta */}
      {detalhe && detalheData && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {detalheData.protocolo}
              </h2>
              <button
                onClick={() => { setDetalhe(null); setDetalheData(null) }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-2">
                <p><span className="font-medium text-gray-500">Solicitante:</span> {detalheData.nome}</p>
                <p><span className="font-medium text-gray-500">E-mail:</span> {detalheData.email}</p>
                <p><span className="font-medium text-gray-500">Órgão solicitado:</span> {detalheData.orgao}</p>
                <p><span className="font-medium text-gray-500">Canal:</span> {detalheData.canal}</p>
                <p><span className="font-medium text-gray-500">Abertura:</span> {new Date(detalheData.dataAbertura).toLocaleDateString('pt-BR')}</p>
                <p><span className="font-medium text-gray-500">Prazo:</span> {new Date(detalheData.prazoResposta + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
              </div>

              <div>
                <p className="font-medium text-gray-700 dark:text-gray-200 mb-1">Assunto</p>
                <p className="text-gray-600 dark:text-gray-300">{detalheData.assunto}</p>
              </div>

              <div>
                <p className="font-medium text-gray-700 dark:text-gray-200 mb-1">Descrição</p>
                <p className="text-gray-600 dark:text-gray-300 text-xs bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">{detalheData.descricao}</p>
              </div>

              {detalheData.resposta && (
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400 mb-1 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Resposta enviada — {detalheData.respondidoPor}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 text-xs bg-green-50 dark:bg-green-900/20 rounded-lg p-3">{detalheData.resposta}</p>
                </div>
              )}

              {/* Área de resposta (apenas para não respondidos) */}
              {!['RESPONDIDO','ARQUIVADO','NEGADO'].includes(detalheData.status) && (
                <div>
                  <label className="font-medium text-gray-700 dark:text-gray-200 mb-1 block">
                    Resposta ao solicitante
                  </label>
                  <textarea
                    value={resposta}
                    onChange={e => setResposta(e.target.value)}
                    rows={5}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Digite a resposta ao pedido de informação..."
                  />
                </div>
              )}
            </div>

            {/* Botões de ação */}
            {!['RESPONDIDO','ARQUIVADO'].includes(detalheData.status) && (
              <div className="flex flex-wrap gap-2 mt-5">
                <button
                  onClick={() => responder(detalhe, 'EM_ANALISE')}
                  disabled={salvando}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  Colocar Em análise
                </button>
                <button
                  onClick={() => prorrogar(detalhe)}
                  className="px-3 py-2 border border-yellow-400 text-yellow-700 rounded-lg text-xs font-medium hover:bg-yellow-50"
                >
                  Prorrogar 10 dias
                </button>
                <button
                  onClick={() => responder(detalhe, 'RESPONDIDO')}
                  disabled={salvando || !resposta.trim()}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {salvando ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                  Responder e fechar
                </button>
                <button
                  onClick={() => responder(detalhe, 'NEGADO')}
                  disabled={salvando}
                  className="px-3 py-2 border border-red-300 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50"
                >
                  Negar (com fundamento)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
