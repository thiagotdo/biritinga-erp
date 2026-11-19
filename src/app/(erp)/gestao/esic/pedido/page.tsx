'use client'

import { useEffect, useState } from 'react'
import {
  FileText, Clock, CheckCircle, XCircle, AlertTriangle,
  Plus, Search, ChevronDown, ChevronUp, Send, RefreshCw,
  MessageSquare, Flag, Ban, ArrowRightCircle,
} from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Situacao =
  | 'RECEBIDO' | 'EM_TRAMITACAO' | 'AGUARDANDO_SETOR' | 'RESPONDIDO'
  | 'RESPONDIDO_TARDIO' | 'PRORROGADO' | 'INDEFERIDO'
  | 'PARCIALMENTE_ATENDIDO' | 'RECURSO_ABERTO' | 'ENCERRADO'

interface Pedido {
  id: string
  protocolo: string
  assunto: string
  descricaoPedido: string
  situacao: Situacao
  tipoSolicitante: string
  nomeRequerente: string | null
  emailRequerente: string | null
  setorDestinatario: string | null
  formaEntrega: string
  dataProtocolo: string
  dataLimiteResposta: string
  dataProrrogacaoFim: string | null
  dataResposta: string | null
  prorrogado: boolean
  textoResposta: string | null
  motivoIndeferimento: string | null
  fundamentoLegal: string | null
  diasResposta: number | null
  dentroDoPrazo: boolean | null
  tematico: string | null
  atrasado?: boolean
  diasRestantes?: number
  _count?: { recursos: number }
  tramitacoes?: Tramitacao[]
  recursos?: Recurso[]
}

interface Tramitacao {
  id: string
  despacho: string
  setorOrigem: string | null
  setorDestino: string | null
  criadoEm: string
}

interface Recurso {
  id: string
  numero: string
  instancia: string
  situacao: string
  motivoRecurso: string
  dataLimiteDecisao: string
  dataDecisao: string | null
  textoDecisao: string | null
}

interface KPIs {
  total: number
  pendentes: number
  respondidos: number
  indeferidos: number
  atrasados: number
  vencendoHoje: number
}

// ─── Mapas de exibição ────────────────────────────────────────────────────────

const SIT: Record<Situacao, { label: string; cor: string; bg: string; icone: React.ReactNode }> = {
  RECEBIDO:             { label: 'Recebido',          cor: 'text-blue-700',   bg: 'bg-blue-50',   icone: <FileText size={12}/> },
  EM_TRAMITACAO:        { label: 'Em Tramitação',     cor: 'text-indigo-700', bg: 'bg-indigo-50', icone: <ArrowRightCircle size={12}/> },
  AGUARDANDO_SETOR:     { label: 'Aguard. Setor',     cor: 'text-yellow-700', bg: 'bg-yellow-50', icone: <Clock size={12}/> },
  RESPONDIDO:           { label: 'Respondido',        cor: 'text-green-700',  bg: 'bg-green-50',  icone: <CheckCircle size={12}/> },
  RESPONDIDO_TARDIO:    { label: 'Resp. Tardio',      cor: 'text-orange-700', bg: 'bg-orange-50', icone: <CheckCircle size={12}/> },
  PRORROGADO:           { label: 'Prorrogado',        cor: 'text-purple-700', bg: 'bg-purple-50', icone: <RefreshCw size={12}/> },
  INDEFERIDO:           { label: 'Indeferido',        cor: 'text-red-700',    bg: 'bg-red-50',    icone: <XCircle size={12}/> },
  PARCIALMENTE_ATENDIDO:{ label: 'Parcial',           cor: 'text-teal-700',   bg: 'bg-teal-50',   icone: <CheckCircle size={12}/> },
  RECURSO_ABERTO:       { label: 'Recurso',           cor: 'text-rose-700',   bg: 'bg-rose-50',   icone: <Flag size={12}/> },
  ENCERRADO:            { label: 'Encerrado',         cor: 'text-slate-600',  bg: 'bg-slate-100', icone: <Ban size={12}/> },
}

const ACOES: Record<Situacao, string[]> = {
  RECEBIDO:             ['ENCAMINHAR_SETOR', 'PRORROGAR', 'RESPONDER', 'INDEFERIR'],
  EM_TRAMITACAO:        ['ENCAMINHAR_SETOR', 'PRORROGAR', 'RESPONDER', 'INDEFERIR'],
  AGUARDANDO_SETOR:     ['RESPONDER', 'ATENDER_PARCIALMENTE', 'INDEFERIR', 'PRORROGAR'],
  PRORROGADO:           ['RESPONDER', 'ATENDER_PARCIALMENTE', 'INDEFERIR'],
  RESPONDIDO:           ['ENCERRAR'],
  RESPONDIDO_TARDIO:    ['ENCERRAR'],
  PARCIALMENTE_ATENDIDO:['ENCERRAR'],
  INDEFERIDO:           [],
  RECURSO_ABERTO:       ['RESPONDER'],
  ENCERRADO:            [],
}

const ACOES_LABEL: Record<string, { label: string; cor: string }> = {
  ENCAMINHAR_SETOR:    { label: 'Encaminhar Setor',  cor: 'bg-indigo-600 hover:bg-indigo-700' },
  PRORROGAR:           { label: 'Prorrogar 10 dias', cor: 'bg-purple-600 hover:bg-purple-700' },
  RESPONDER:           { label: 'Responder',         cor: 'bg-green-600 hover:bg-green-700'  },
  INDEFERIR:           { label: 'Indeferir',         cor: 'bg-red-600 hover:bg-red-700'      },
  ATENDER_PARCIALMENTE:{ label: 'Atend. Parcial',    cor: 'bg-teal-600 hover:bg-teal-700'    },
  ENCERRAR:            { label: 'Encerrar',          cor: 'bg-slate-600 hover:bg-slate-700'  },
}

const INSTANCIAS_LABEL: Record<string, string> = {
  PRIMEIRA_INSTANCIA: '1ª Instância (10 dias)',
  SEGUNDA_INSTANCIA:  '2ª Instância (5 dias)',
  TERCEIRA_INSTANCIA: '3ª Instância / CGU (5 dias)',
  CGM_TCM:            'CGM / TCM (15 dias)',
}

const MOTIVOS_INDEFERIMENTO = [
  { value: 'INFORMACAO_SIGILOSA_GRAU_1', label: 'Informação Sigilosa — Reservada (Art. 23 LAI)' },
  { value: 'INFORMACAO_SIGILOSA_GRAU_2', label: 'Informação Sigilosa — Secreta (Art. 23 LAI)' },
  { value: 'INFORMACAO_SIGILOSA_GRAU_3', label: 'Informação Sigilosa — Ultrassecreta (Art. 23 LAI)' },
  { value: 'DADO_PESSOAL',               label: 'Dado Pessoal — Privacidade (Art. 31 LAI)' },
  { value: 'SEGREDO_INDUSTRIA',          label: 'Segredo Industrial/Comercial' },
  { value: 'PEDIDO_GENERICO',            label: 'Pedido Genérico (Art. 13 Decreto 7.724)' },
  { value: 'TRABALHO_PRODUCAO',          label: 'Exige análise/produção de dados inexistentes' },
  { value: 'INFORMACAO_INEXISTENTE',     label: 'Informação inexistente no órgão' },
  { value: 'INFORMACAO_PUBLICA',         label: 'Informação já disponível ao público' },
  { value: 'OUTRO',                      label: 'Outro motivo' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ChipSit({ sit }: { sit: Situacao }) {
  const s = SIT[sit]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cor} ${s.bg}`}>
      {s.icone}{s.label}
    </span>
  )
}

function PrazoBar({ pedido }: { pedido: Pedido }) {
  const criado  = new Date(pedido.dataProtocolo).getTime()
  const limite  = new Date(pedido.dataLimiteResposta).getTime()
  const agora   = Date.now()
  const total   = limite - criado
  const decorrido = Math.min(agora - criado, total)
  const perc    = Math.round((decorrido / total) * 100)
  const cor     = pedido.atrasado ? 'bg-red-500' : perc > 75 ? 'bg-orange-400' : 'bg-green-500'

  return (
    <div className="mt-1">
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div className={`${cor} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(perc, 100)}%` }} />
      </div>
      <p className={`text-xs mt-0.5 ${pedido.atrasado ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
        {pedido.atrasado
          ? `⚠ Atrasado ${Math.abs(pedido.diasRestantes ?? 0)} dias`
          : pedido.diasRestantes !== undefined && pedido.diasRestantes >= 0
            ? `${pedido.diasRestantes} dias restantes`
            : ''}
      </p>
    </div>
  )
}

// ─── Painel de detalhe ────────────────────────────────────────────────────────

function PainelPedido({
  pedido, onAcao,
}: {
  pedido: Pedido
  onAcao: (acao: string, extras: Record<string, string>) => void
}) {
  const [aba, setAba] = useState<'info'|'tramitacao'|'recurso'>('info')
  const [acao, setAcao] = useState('')
  const [form, setForm] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)

  const acoesDisponiveis = ACOES[pedido.situacao] ?? []

  const handleAcao = async () => {
    if (!acao) return
    setSalvando(true)
    await onAcao(acao, form)
    setAcao('')
    setForm({})
    setSalvando(false)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-slate-800">{pedido.protocolo}</span>
            <ChipSit sit={pedido.situacao} />
            {pedido.prorrogado && (
              <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">Prorrogado</span>
            )}
          </div>
          <p className="text-sm text-slate-700 mt-1 font-medium">{pedido.assunto}</p>
          {pedido.tematico && (
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full mt-1 inline-block">{pedido.tematico}</span>
          )}
        </div>
        {/* Prazo legal */}
        <div className="text-right text-xs text-slate-500">
          <p>Protocolo: <span className="font-medium">{new Date(pedido.dataProtocolo).toLocaleDateString('pt-BR')}</span></p>
          <p>Prazo: <span className={`font-medium ${pedido.atrasado ? 'text-red-600' : ''}`}>
            {new Date(pedido.dataLimiteResposta).toLocaleDateString('pt-BR')}
          </span></p>
          {pedido.dataProrrogacaoFim && (
            <p className="text-purple-600">Prorr.: {new Date(pedido.dataProrrogacaoFim).toLocaleDateString('pt-BR')}</p>
          )}
        </div>
      </div>

      {/* Abas */}
      <div className="flex border-b border-slate-100 px-5 gap-4">
        {(['info','tramitacao','recurso'] as const).map(a => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`text-sm py-3 border-b-2 transition-colors ${aba === a
              ? 'border-indigo-500 text-indigo-600 font-medium'
              : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {a === 'info' ? 'Detalhes'
              : a === 'tramitacao' ? `Tramitação (${pedido.tramitacoes?.length ?? 0})`
              : `Recursos (${pedido._count?.recursos ?? pedido.recursos?.length ?? 0})`}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* Aba: Detalhes */}
        {aba === 'info' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Solicitante</p>
                <p className="font-medium text-slate-700">
                  {pedido.nomeRequerente ?? <span className="italic text-slate-400">Anônimo</span>}
                </p>
                {pedido.emailRequerente && <p className="text-slate-500">{pedido.emailRequerente}</p>}
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Setor Responsável</p>
                <p className="font-medium text-slate-700">{pedido.setorDestinatario ?? '—'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Descrição do Pedido</p>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-3">{pedido.descricaoPedido}</p>
            </div>

            {/* Resposta existente */}
            {pedido.textoResposta && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-700 font-semibold mb-1">
                  RESPOSTA — {pedido.dataResposta ? new Date(pedido.dataResposta).toLocaleDateString('pt-BR') : ''}
                  {pedido.dentroDoPrazo === false && <span className="ml-2 text-orange-600">(Fora do prazo)</span>}
                </p>
                <p className="text-sm text-slate-700">{pedido.textoResposta}</p>
              </div>
            )}

            {/* Indeferimento */}
            {pedido.situacao === 'INDEFERIDO' && pedido.motivoIndeferimento && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-700 font-semibold mb-1">INDEFERIDO</p>
                <p className="text-sm text-red-800">{MOTIVOS_INDEFERIMENTO.find(m => m.value === pedido.motivoIndeferimento)?.label}</p>
                {pedido.fundamentoLegal && (
                  <p className="text-xs text-red-600 mt-1">Fundamento: {pedido.fundamentoLegal}</p>
                )}
              </div>
            )}

            {/* Ações */}
            {acoesDisponiveis.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-500 mb-2">AÇÕES</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {acoesDisponiveis.map(a => {
                    const meta = ACOES_LABEL[a]
                    return (
                      <button
                        key={a}
                        onClick={() => setAcao(acao === a ? '' : a)}
                        className={`px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors ${meta.cor} ${acao === a ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
                      >
                        {meta.label}
                      </button>
                    )
                  })}
                </div>

                {/* Form dinâmico por ação */}
                {acao && (
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
                    {acao === 'ENCAMINHAR_SETOR' && (
                      <>
                        <div>
                          <label className="text-xs font-medium text-slate-600">Setor de Destino *</label>
                          <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                            placeholder="Ex: Secretaria de Finanças"
                            value={form.setorDestino ?? ''}
                            onChange={e => setForm(f => ({ ...f, setorDestino: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600">Despacho</label>
                          <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none resize-none" rows={2}
                            placeholder="Texto do encaminhamento"
                            value={form.despacho ?? ''}
                            onChange={e => setForm(f => ({ ...f, despacho: e.target.value }))} />
                        </div>
                      </>
                    )}

                    {acao === 'PRORROGAR' && (
                      <div>
                        <label className="text-xs font-medium text-slate-600">Motivo da Prorrogação * <span className="text-purple-600">(Art. 11 §2 Lei 12.527/2011)</span></label>
                        <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-purple-300 focus:outline-none resize-none" rows={3}
                          placeholder="Justificativa técnica para prorrogação de 10 dias úteis"
                          value={form.motivoProrrogacao ?? ''}
                          onChange={e => setForm(f => ({ ...f, motivoProrrogacao: e.target.value }))} />
                        <p className="text-xs text-purple-600 mt-1">⚠ Novo prazo: +10 dias úteis. A prorrogação deve ser comunicada ao requerente.</p>
                      </div>
                    )}

                    {(acao === 'RESPONDER' || acao === 'ATENDER_PARCIALMENTE') && (
                      <>
                        <div>
                          <label className="text-xs font-medium text-slate-600">Texto da Resposta *</label>
                          <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-green-300 focus:outline-none resize-none" rows={5}
                            placeholder="Resposta completa ao pedido de acesso à informação..."
                            value={form.textoResposta ?? ''}
                            onChange={e => setForm(f => ({ ...f, textoResposta: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-slate-600">Responsável Técnico</label>
                            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-green-300 focus:outline-none"
                              value={form.tecnicoResponsavel ?? ''}
                              onChange={e => setForm(f => ({ ...f, tecnicoResponsavel: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-600">Forma de Entrega</label>
                            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-green-300 focus:outline-none"
                              value={form.formaResposta ?? 'EMAIL'}
                              onChange={e => setForm(f => ({ ...f, formaResposta: e.target.value }))}>
                              <option value="EMAIL">E-mail</option>
                              <option value="PORTAL_ESIC">Portal e-SIC</option>
                              <option value="CORREIO">Correio</option>
                              <option value="PRESENCIAL">Presencial</option>
                            </select>
                          </div>
                        </div>
                        {acao === 'ATENDER_PARCIALMENTE' && (
                          <div>
                            <label className="text-xs font-medium text-slate-600">Motivo da parte não atendida</label>
                            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-teal-300 focus:outline-none"
                              value={form.motivoIndeferimento ?? ''}
                              onChange={e => setForm(f => ({ ...f, motivoIndeferimento: e.target.value }))}>
                              <option value="">Selecione...</option>
                              {MOTIVOS_INDEFERIMENTO.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </>
                    )}

                    {acao === 'INDEFERIR' && (
                      <>
                        <div>
                          <label className="text-xs font-medium text-slate-600">Motivo do Indeferimento *</label>
                          <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-red-300 focus:outline-none"
                            value={form.motivoIndeferimento ?? ''}
                            onChange={e => setForm(f => ({ ...f, motivoIndeferimento: e.target.value }))}>
                            <option value="">Selecione...</option>
                            {MOTIVOS_INDEFERIMENTO.map(m => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600">Fundamento Legal * <span className="text-slate-400">(ex: Art. 23, I, Lei 12.527/2011)</span></label>
                          <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-red-300 focus:outline-none"
                            value={form.fundamentoLegal ?? ''}
                            onChange={e => setForm(f => ({ ...f, fundamentoLegal: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600">Texto de Notificação ao Requerente</label>
                          <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-red-300 focus:outline-none resize-none" rows={3}
                            value={form.textoResposta ?? ''}
                            onChange={e => setForm(f => ({ ...f, textoResposta: e.target.value }))} />
                        </div>
                        <p className="text-xs text-red-600">⚠ O requerente tem direito a recurso em 10 dias após o indeferimento (Art. 15 LAI).</p>
                      </>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={() => { setAcao(''); setForm({}) }}
                        className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                        Cancelar
                      </button>
                      <button onClick={handleAcao} disabled={salvando}
                        className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">
                        {salvando ? 'Salvando…' : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Aba: Tramitação */}
        {aba === 'tramitacao' && (
          <div className="space-y-3">
            {(pedido.tramitacoes ?? []).map((t, i) => (
              <div key={t.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{i+1}</div>
                  {i < (pedido.tramitacoes ?? []).length - 1 && <div className="w-0.5 flex-1 bg-slate-200 mt-1" />}
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-400">{new Date(t.criadoEm).toLocaleDateString('pt-BR')}</span>
                    {t.setorOrigem && <span className="text-xs text-slate-500">→ {t.setorDestino}</span>}
                  </div>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{t.despacho}</p>
                </div>
              </div>
            ))}
            {(!pedido.tramitacoes || pedido.tramitacoes.length === 0) && (
              <p className="text-sm text-slate-400 text-center py-4">Nenhuma tramitação registrada.</p>
            )}
          </div>
        )}

        {/* Aba: Recursos */}
        {aba === 'recurso' && (
          <div className="space-y-4">
            {/* Form novo recurso */}
            {['INDEFERIDO','PARCIALMENTE_ATENDIDO','RESPONDIDO_TARDIO','ENCERRADO'].includes(pedido.situacao) && (
              <RecursoForm pedidoId={pedido.id} onSalvar={async (d) => {
                await onAcao('__RECURSO__', d)
              }} />
            )}

            {(pedido.recursos ?? []).map(r => (
              <div key={r.id} className={`border rounded-lg p-4 ${
                r.situacao === 'PROVIDO' ? 'border-green-200 bg-green-50' :
                r.situacao === 'IMPROVIDO' ? 'border-red-100 bg-red-50' :
                'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-semibold text-sm">{r.numero}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{INSTANCIAS_LABEL[r.instancia]}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.situacao === 'PROVIDO' ? 'bg-green-100 text-green-700' :
                      r.situacao === 'IMPROVIDO' ? 'bg-red-100 text-red-700' :
                      r.situacao === 'EM_ANALISE' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-slate-200 text-slate-600'
                    }`}>{r.situacao.replace(/_/g,' ')}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-1">Prazo decisão: {new Date(r.dataLimiteDecisao).toLocaleDateString('pt-BR')}</p>
                <p className="text-sm text-slate-700">{r.motivoRecurso}</p>
                {r.textoDecisao && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 mb-1">DECISÃO — {r.dataDecisao ? new Date(r.dataDecisao).toLocaleDateString('pt-BR') : ''}</p>
                    <p className="text-sm text-slate-700">{r.textoDecisao}</p>
                  </div>
                )}
              </div>
            ))}
            {(!pedido.recursos || pedido.recursos.length === 0) && (
              <p className="text-sm text-slate-400 text-center py-4">Nenhum recurso registrado.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Form Recurso ─────────────────────────────────────────────────────────────

function RecursoForm({
  pedidoId, onSalvar,
}: {
  pedidoId: string
  onSalvar: (dados: Record<string, string>) => Promise<void>
}) {
  const [aberto, setAberto] = useState(false)
  const [form, setForm] = useState({ instancia: 'PRIMEIRA_INSTANCIA', motivoRecurso: '', nomeRecorrente: '' })
  const [salvando, setSalvando] = useState(false)

  if (!aberto) return (
    <button onClick={() => setAberto(true)}
      className="w-full border-2 border-dashed border-indigo-300 text-indigo-600 text-sm py-3 rounded-lg hover:bg-indigo-50 flex items-center justify-center gap-2">
      <Flag size={14}/> Abrir Recurso (Art. 15 LAI)
    </button>
  )

  return (
    <div className="border border-indigo-200 rounded-lg bg-indigo-50 p-4 space-y-3">
      <p className="text-xs font-semibold text-indigo-700">NOVO RECURSO — prazo: 10 dias após o indeferimento (Art. 15 LAI)</p>
      <div>
        <label className="text-xs font-medium text-slate-600">Instância Recursal *</label>
        <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none bg-white"
          value={form.instancia}
          onChange={e => setForm(f => ({ ...f, instancia: e.target.value }))}>
          {Object.entries(INSTANCIAS_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Nome do Recorrente</label>
        <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none bg-white"
          value={form.nomeRecorrente}
          onChange={e => setForm(f => ({ ...f, nomeRecorrente: e.target.value }))} />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Motivo do Recurso *</label>
        <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none resize-none bg-white" rows={4}
          placeholder="Descreva as razões do recurso..."
          value={form.motivoRecurso}
          onChange={e => setForm(f => ({ ...f, motivoRecurso: e.target.value }))} />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={() => setAberto(false)} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 bg-white">Cancelar</button>
        <button onClick={async () => {
          setSalvando(true)
          await onSalvar({ ...form, pedidoId })
          setSalvando(false)
          setAberto(false)
          setForm({ instancia: 'PRIMEIRA_INSTANCIA', motivoRecurso: '', nomeRecorrente: '' })
        }} disabled={salvando || !form.motivoRecurso}>
          <span className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 inline-block">
            {salvando ? 'Salvando…' : 'Protocolar Recurso'}
          </span>
        </button>
      </div>
    </div>
  )
}

// ─── Modal Novo Pedido ────────────────────────────────────────────────────────

function ModalNovoPedido({ onFechar, onSalvar }: { onFechar: () => void; onSalvar: (d: Record<string,string>) => void }) {
  const [form, setForm] = useState({
    tipoSolicitante: 'PESSOA_FISICA',
    nomeRequerente: '', emailRequerente: '', telefoneRequerente: '',
    assunto: '', descricaoPedido: '', setorDestinatario: '',
    tematico: '', formaEntrega: 'EMAIL',
  })

  const F = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Novo Pedido e-SIC</h2>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <div className="p-6 space-y-4">
          {/* Tipo solicitante */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo de Solicitante</label>
            <div className="flex gap-3 mt-1">
              {['PESSOA_FISICA','PESSOA_JURIDICA','ANONIMO'].map(t => (
                <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="tipo" value={t} checked={form.tipoSolicitante === t}
                    onChange={e => F('tipoSolicitante', e.target.value)} className="accent-indigo-600"/>
                  <span className="text-sm text-slate-600">{t === 'PESSOA_FISICA' ? 'Pessoa Física' : t === 'PESSOA_JURIDICA' ? 'Pessoa Jurídica' : 'Anônimo'}</span>
                </label>
              ))}
            </div>
          </div>

          {form.tipoSolicitante !== 'ANONIMO' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600">Nome *</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                  value={form.nomeRequerente} onChange={e => F('nomeRequerente', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">E-mail</label>
                <input type="email" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                  value={form.emailRequerente} onChange={e => F('emailRequerente', e.target.value)} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600">Setor Destinatário</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                placeholder="Ex: Secretaria de Saúde"
                value={form.setorDestinatario} onChange={e => F('setorDestinatario', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Tema</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                placeholder="Ex: Saúde, Educação, Orçamento"
                value={form.tematico} onChange={e => F('tematico', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Assunto do Pedido *</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
              placeholder="Resumo em até 150 caracteres"
              value={form.assunto} onChange={e => F('assunto', e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Descrição Detalhada *</label>
            <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none resize-none" rows={5}
              placeholder="Descreva detalhadamente a informação solicitada, período de referência, formato desejado..."
              value={form.descricaoPedido} onChange={e => F('descricaoPedido', e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Forma de Entrega da Resposta</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
              value={form.formaEntrega} onChange={e => F('formaEntrega', e.target.value)}>
              <option value="EMAIL">E-mail</option>
              <option value="PORTAL_ESIC">Portal e-SIC</option>
              <option value="CORREIO">Correio</option>
              <option value="PRESENCIAL">Presencial</option>
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            <strong>Lei 12.527/2011 (LAI) — Art. 11:</strong> Prazo para resposta: <strong>20 dias úteis</strong>, prorrogável por mais 10 dias mediante justificativa.
            Em caso de indeferimento, cabe recurso em 10 dias (Art. 15).
          </div>
        </div>
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onFechar} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
          <button
            onClick={() => onSalvar(form)}
            disabled={!form.assunto || !form.descricaoPedido}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">
            Protocolar Pedido
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function PedidosSICPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [selecionado, setSelecionado] = useState<Pedido | null>(null)
  const [modalNovo, setModalNovo] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroSit, setFiltroSit] = useState('')
  const [filtroPendentes, setFiltroPendentes] = useState(false)
  const [carregando, setCarregando] = useState(true)

  async function carregar() {
    setCarregando(true)
    const params = new URLSearchParams()
    if (busca)         params.set('busca', busca)
    if (filtroSit)     params.set('situacao', filtroSit)
    if (filtroPendentes) params.set('vencendo', 'true')

    const [resPedidos, resKpis] = await Promise.all([
      fetch(`/api/esic/pedido?${params}`).then(r => r.json()),
      fetch('/api/esic/pedido?relatorio=DASHBOARD').then(r => r.json()),
    ])
    setPedidos(resPedidos.pedidos ?? [])
    setKpis(resKpis.kpis ?? null)
    setCarregando(false)
  }

  useEffect(() => { carregar() }, [busca, filtroSit, filtroPendentes])

  async function carregarDetalhe(id: string) {
    const res = await fetch(`/api/esic/pedido?id=${id}`).then(r => r.json())
    setSelecionado(res.pedido)
  }

  async function salvarNovoPedido(d: Record<string, string>) {
    await fetch('/api/esic/pedido', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'PEDIDO', ...d }),
    })
    setModalNovo(false)
    carregar()
  }

  async function executarAcao(acao: string, extras: Record<string, string>) {
    if (!selecionado) return

    if (acao === '__RECURSO__') {
      await fetch('/api/esic/pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'RECURSO', ...extras }),
      })
    } else {
      await fetch('/api/esic/pedido', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selecionado.id, acao, ...extras }),
      })
    }

    await carregarDetalhe(selecionado.id)
    carregar()
  }

  const SITS_FILTRO: Situacao[] = ['RECEBIDO','EM_TRAMITACAO','AGUARDANDO_SETOR','PRORROGADO','RESPONDIDO','INDEFERIDO','RECURSO_ABERTO','ENCERRADO']

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">e-SIC — Pedidos de Acesso</h1>
            <p className="text-sm text-slate-500 mt-0.5">Lei 12.527/2011 — Lei de Acesso à Informação</p>
          </div>
          <button onClick={() => setModalNovo(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 shadow-sm">
            <Plus size={16}/> Novo Pedido
          </button>
        </div>

        {/* KPIs */}
        {kpis && (
          <div className="grid grid-cols-6 gap-3 mb-6">
            {[
              { label: 'Total',         val: kpis.total,         cor: 'bg-white border border-slate-200' },
              { label: 'Pendentes',     val: kpis.pendentes,     cor: 'bg-indigo-50 border border-indigo-200' },
              { label: 'Respondidos',   val: kpis.respondidos,   cor: 'bg-green-50 border border-green-200' },
              { label: 'Indeferidos',   val: kpis.indeferidos,   cor: 'bg-red-50 border border-red-200' },
              { label: 'Atrasados',     val: kpis.atrasados,     cor: kpis.atrasados > 0 ? 'bg-red-100 border border-red-400' : 'bg-white border border-slate-200' },
              { label: 'Vcto 48h',      val: kpis.vencendoHoje,  cor: kpis.vencendoHoje > 0 ? 'bg-orange-50 border border-orange-300' : 'bg-white border border-slate-200' },
            ].map(({ label, val, cor }) => (
              <div key={label} className={`${cor} rounded-xl p-3 text-center`}>
                <p className="text-2xl font-bold text-slate-800">{val}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Alertas */}
        {kpis && kpis.atrasados > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-500"/>
            <span className="text-sm text-red-700 font-medium">
              {kpis.atrasados} pedido{kpis.atrasados > 1 ? 's' : ''} fora do prazo legal (Art. 11 LAI). Resposta imediata obrigatória.
            </span>
          </div>
        )}
        {kpis && kpis.vencendoHoje > 0 && (
          <div className="bg-orange-50 border border-orange-300 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
            <Clock size={18} className="text-orange-500"/>
            <span className="text-sm text-orange-700 font-medium">
              {kpis.vencendoHoje} pedido{kpis.vencendoHoje > 1 ? 's' : ''} vence{kpis.vencendoHoje > 1 ? 'm' : ''} nas próximas 48 horas.
            </span>
          </div>
        )}

        {/* Filtros */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input
              className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:outline-none bg-white"
              placeholder="Buscar por protocolo, assunto, requerente..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          <select
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-300 focus:outline-none"
            value={filtroSit}
            onChange={e => setFiltroSit(e.target.value)}
          >
            <option value="">Todas as situações</option>
            {SITS_FILTRO.map(s => (
              <option key={s} value={s}>{SIT[s].label}</option>
            ))}
          </select>
          <button
            onClick={() => setFiltroPendentes(!filtroPendentes)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-colors ${filtroPendentes ? 'bg-orange-50 border-orange-300 text-orange-700' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'}`}
          >
            <AlertTriangle size={14}/> Vencendo
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-12 gap-5">
          {/* Lista */}
          <div className="col-span-5 space-y-2">
            {carregando ? (
              <div className="text-center py-12 text-slate-400">Carregando…</div>
            ) : pedidos.length === 0 ? (
              <div className="text-center py-12 text-slate-400">Nenhum pedido encontrado.</div>
            ) : pedidos.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelecionado(null); carregarDetalhe(p.id) }}
                className={`w-full text-left bg-white border rounded-xl p-4 hover:shadow-sm transition-all ${selecionado?.id === p.id ? 'border-indigo-400 ring-2 ring-indigo-100' : p.atrasado ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-mono text-xs font-semibold text-slate-600">{p.protocolo}</span>
                  <ChipSit sit={p.situacao} />
                </div>
                <p className="text-sm font-medium text-slate-800 leading-snug mb-1">{p.assunto}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{p.nomeRequerente ?? 'Anônimo'}</span>
                  {p.setorDestinatario && <><span>·</span><span>{p.setorDestinatario}</span></>}
                  {p._count?.recursos ? <><span>·</span><Flag size={10} className="text-rose-400"/><span className="text-rose-500">{p._count.recursos} recurso{p._count.recursos > 1 ? 's' : ''}</span></> : null}
                </div>
                <PrazoBar pedido={p} />
              </button>
            ))}
          </div>

          {/* Painel detalhe */}
          <div className="col-span-7">
            {selecionado ? (
              <PainelPedido pedido={selecionado} onAcao={executarAcao} />
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl flex items-center justify-center h-64 text-slate-400">
                <div className="text-center">
                  <MessageSquare size={28} className="mx-auto mb-2 opacity-30"/>
                  <p className="text-sm">Selecione um pedido para ver detalhes</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {modalNovo && <ModalNovoPedido onFechar={() => setModalNovo(false)} onSalvar={salvarNovoPedido} />}
    </div>
  )
}
