'use client'
import { useState, useEffect, useCallback } from 'react'

type Manifestacao = {
  id: string; protocolo: string; tipo: string; situacao: string; assunto: string
  secretariaDestino?: string; prioridade: string; prazoResposta: string; prorrogado: boolean
  anonima: boolean; nomeManifestante?: string; lai: boolean; avaliado: boolean; satisfacao?: string
  criadoEm: string; atrasada: boolean; vencendoBreve: boolean; diasRestantes: number
}
type ManifDetalhe = Manifestacao & {
  descricao: string; cpfManifestante?: string; emailManifestante?: string
  telefoneManifestante?: string; atribuidoA?: string
  movimentacoes: MovRow[]; respostas: RespRow[]
}
type MovRow  = { id: string; situacaoDe: string; situacaoPara: string; motivo?: string; criadoEm: string }
type RespRow = { id: string; texto: string; tipo: string; remetente?: string; publica: boolean; criadoEm: string }
type KPIs = { total: number; recebidas: number; emAnalise: number; aguardando: number; respondidas: number; encerradas: number; vencendo48h: number; atrasadas: number }

const TIPO_ICON: Record<string, string> = {
  RECLAMACAO:         '😠', SUGESTAO:           '💡', ELOGIO:             '👏',
  DENUNCIA:           '🚨', SOLICITACAO_INFO:   '📋', SOLICITACAO_SERVICO: '🔧',
}
const TIPO_COR: Record<string, string> = {
  RECLAMACAO:         'text-red-600',
  SUGESTAO:           'text-blue-600',
  ELOGIO:             'text-green-600',
  DENUNCIA:           'text-purple-600',
  SOLICITACAO_INFO:   'text-indigo-600',
  SOLICITACAO_SERVICO: 'text-orange-600',
}
const SIT_COR: Record<string, string> = {
  RECEBIDA:        'bg-blue-100 text-blue-700',
  EM_ANALISE:      'bg-yellow-100 text-yellow-700',
  AGUARDANDO_RESP: 'bg-orange-100 text-orange-700',
  RESPONDIDA:      'bg-indigo-100 text-indigo-700',
  ENCERRADA:       'bg-green-100 text-green-700',
  ARQUIVADA:       'bg-gray-100 text-gray-400',
  DEVOLVIDA:       'bg-red-100 text-red-500',
}
const PRIOR_COR: Record<string, string> = {
  BAIXA: 'text-gray-400', NORMAL: 'text-blue-500', ALTA: 'text-orange-500', URGENTE: 'text-red-600',
}
const SAT_ICON: Record<string, string> = {
  MUITO_SATISFEITO: '😄', SATISFEITO: '🙂', NEUTRO: '😐', INSATISFEITO: '😕', MUITO_INSATISFEITO: '😠',
}

function ModalNovaManif({ onSalvar, onClose }: { onSalvar: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    tipo: 'RECLAMACAO', assunto: '', descricao: '',
    secretariaDestino: '', prioridade: 'NORMAL', anonima: 'false',
    nomeManifestante: '', cpfManifestante: '', emailManifestante: '',
    telefoneManifestante: '', lai: 'false',
  })
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const anonima = form.anonima === 'true'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b">
          <h2 className="text-lg font-bold text-gray-800">Nova Manifestação</h2>
          <p className="text-xs text-gray-400 mt-0.5">Lei 13.460/2017 · LAI 12.527/2011</p>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo *</label>
              <select value={form.tipo} onChange={e => f('tipo', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                {Object.entries(TIPO_ICON).map(([k, v]) => (
                  <option key={k} value={k}>{v} {k.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Prioridade</label>
              <select value={form.prioridade} onChange={e => f('prioridade', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="BAIXA">Baixa</option>
                <option value="NORMAL">Normal</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Secretaria Destino</label>
              <input type="text" value={form.secretariaDestino} onChange={e => f('secretariaDestino', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Assunto *</label>
            <input type="text" value={form.assunto} onChange={e => f('assunto', e.target.value)}
              placeholder="Resumo da manifestação"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Descrição *</label>
            <textarea value={form.descricao} onChange={e => f('descricao', e.target.value)} rows={4}
              placeholder="Descreva detalhadamente a manifestação…"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div className="border-t pt-3">
            <div className="flex items-center gap-4 mb-3">
              <label className="text-xs font-medium text-gray-500">Identificação</label>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="checkbox" checked={anonima} onChange={e => f('anonima', e.target.checked.toString())}
                  className="rounded" />
                <span className="text-xs">Anônima / Confidencial</span>
              </label>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="checkbox" checked={form.lai === 'true'} onChange={e => f('lai', e.target.checked.toString())}
                  className="rounded" />
                <span className="text-xs">📋 Solicitação LAI</span>
              </label>
            </div>
            {!anonima && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nome do Manifestante *</label>
                  <input type="text" value={form.nomeManifestante} onChange={e => f('nomeManifestante', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">CPF</label>
                  <input type="text" value={form.cpfManifestante} onChange={e => f('cpfManifestante', e.target.value)} placeholder="000.000.000-00"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">E-mail</label>
                  <input type="email" value={form.emailManifestante} onChange={e => f('emailManifestante', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Telefone</label>
                  <input type="tel" value={form.telefoneManifestante} onChange={e => f('telefoneManifestante', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
          <button onClick={() => onSalvar({ ...form, anonima: form.anonima === 'true', lai: form.lai === 'true', secretariaDestino: form.secretariaDestino || undefined, cpfManifestante: form.cpfManifestante || undefined, emailManifestante: form.emailManifestante || undefined })}
            disabled={!form.assunto || !form.descricao || (!anonima && !form.nomeManifestante)}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            Registrar Manifestação
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalResposta({ manif, onSalvar, onClose }: { manif: ManifDetalhe; onSalvar: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({ texto: '', tipo: 'OFICIAL', remetente: '', publica: 'true' })
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="p-5 border-b">
          <h2 className="font-bold">Responder Manifestação</h2>
          <div className="text-xs text-gray-400 mt-0.5 font-mono">{manif.protocolo}</div>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Resposta</label>
              <select value={form.tipo} onChange={e => f('tipo', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="OFICIAL">Oficial (pública)</option>
                <option value="COMPLEMENTO">Complemento</option>
                <option value="INTERNO">Nota Interna</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Remetente</label>
              <input type="text" value={form.remetente} onChange={e => f('remetente', e.target.value)}
                placeholder="Secretaria, ouvidor…"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Texto da Resposta *</label>
            <textarea value={form.texto} onChange={e => f('texto', e.target.value)} rows={5}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          {form.tipo !== 'INTERNO' && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.publica === 'true'} onChange={e => f('publica', e.target.checked.toString())}
                className="rounded" />
              <span className="text-xs text-gray-600">Visível ao manifestante</span>
            </label>
          )}
          {form.tipo === 'OFICIAL' && (
            <div className="bg-indigo-50 rounded p-2 text-xs text-indigo-600">
              A resposta oficial moverá a manifestação para RESPONDIDA.
            </div>
          )}
        </div>
        <div className="p-5 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
          <button onClick={() => onSalvar({ texto: form.texto, tipo: form.tipo, remetente: form.remetente || undefined, publica: form.publica === 'true' })}
            disabled={!form.texto}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            Enviar Resposta
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ManifestacaoPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [porTipo, setPorTipo] = useState<any[]>([])
  const [mediaSatisfacao, setMediaSatisfacao] = useState<string | null>(null)
  const [manifestacoes, setManifestacoes] = useState<Manifestacao[]>([])
  const [detalhe, setDetalhe] = useState<ManifDetalhe | null>(null)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState('')
  const [filtroVencendo, setFiltroVencendo] = useState(false)
  const [busca, setBusca] = useState('')
  const [modalNova, setModalNova] = useState(false)
  const [modalResposta, setModalResposta] = useState(false)
  const [msg, setMsg] = useState('')

  const carregar = useCallback(async () => {
    const params = new URLSearchParams()
    if (filtroTipo)      params.set('tipo', filtroTipo)
    if (filtroSituacao)  params.set('situacao', filtroSituacao)
    if (busca)           params.set('busca', busca)
    if (filtroVencendo)  params.set('vencendo', 'true')
    const [kR, mR] = await Promise.all([
      fetch('/api/ouvidoria/manifestacao?relatorio=DASHBOARD'),
      fetch(`/api/ouvidoria/manifestacao?${params}`),
    ])
    const [kD, mD] = await Promise.all([kR.json(), mR.json()])
    setKpis(kD.kpis)
    setPorTipo(kD.porTipo ?? [])
    setMediaSatisfacao(kD.mediaSatisfacao)
    setManifestacoes(mD.manifestacoes ?? [])
  }, [filtroTipo, filtroSituacao, busca, filtroVencendo])

  useEffect(() => { carregar() }, [carregar])

  async function abrirDetalhe(id: string) {
    const r = await fetch(`/api/ouvidoria/manifestacao?id=${id}`)
    const d = await r.json()
    if (d.manifestacao) setDetalhe(d.manifestacao)
  }

  async function registrar(dados: any) {
    const r = await fetch('/api/ouvidoria/manifestacao', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    setMsg(`Manifestação registrada - Protocolo: ${d.protocolo}`)
    setModalNova(false)
    carregar()
    abrirDetalhe(d.manifestacao.id)
    setTimeout(() => setMsg(''), 6000)
  }

  async function acaoManifestacao(acao: string, dados?: any) {
    if (!detalhe) return
    const r = await fetch('/api/ouvidoria/manifestacao', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: detalhe.id, acao, ...dados }),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    setMsg('Situação atualizada!')
    carregar()
    abrirDetalhe(detalhe.id)
    setTimeout(() => setMsg(''), 3000)
  }

  async function responder(dados: any) {
    if (!detalhe) return
    const r = await fetch('/api/ouvidoria/resposta', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manifestacaoId: detalhe.id, ...dados }),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    setMsg('Resposta registrada!')
    setModalResposta(false)
    carregar()
    abrirDetalhe(detalhe.id)
    setTimeout(() => setMsg(''), 3000)
  }

  const fmtData = (v: string) => new Date(v).toLocaleDateString('pt-BR')
  const fmtDataHora = (v: string) => new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

  const TRANSICOES_DISPONIVEIS: Record<string, string[]> = {
    RECEBIDA:       ['EM_ANALISE'],
    EM_ANALISE:     ['AGUARDANDO_RESP', 'DEVOLVIDA'],
    AGUARDANDO_RESP: ['EM_ANALISE'],
    RESPONDIDA:     ['ENCERRADA'],
    DEVOLVIDA:      ['EM_ANALISE'],
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ouvidoria Municipal</h1>
            <p className="text-sm text-gray-500 mt-0.5">Lei 13.460/2017 · LAI 12.527/2011 · Prazo LAI: 20 dias úteis</p>
          </div>
          <button onClick={() => setModalNova(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
            + Nova Manifestação
          </button>
        </div>
      </div>

      {msg && (
        <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{msg}</div>
      )}

      {/* KPIs */}
      {kpis && (
        <div className="px-6 py-4 grid grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { label: 'Total',         valor: kpis.total,       cor: 'text-gray-800' },
            { label: 'Novas',         valor: kpis.recebidas,   cor: 'text-blue-600' },
            { label: 'Em Análise',    valor: kpis.emAnalise,   cor: 'text-yellow-600' },
            { label: 'Aguardando',    valor: kpis.aguardando,  cor: 'text-orange-600' },
            { label: 'Respondidas',   valor: kpis.respondidas, cor: 'text-indigo-600' },
            { label: 'Encerradas',    valor: kpis.encerradas,  cor: 'text-green-600' },
            { label: '⚠ Vencendo 48h', valor: kpis.vencendo48h, cor: 'text-orange-600' },
            { label: '🔴 Atrasadas',  valor: kpis.atrasadas,   cor: 'text-red-600' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <div className={`text-sm font-bold ${k.cor}`}>{k.valor}</div>
              <div className="text-xs text-gray-400 mt-0.5 leading-tight">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="px-6 pb-4 flex gap-3 flex-wrap">
        <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Protocolo, assunto, manifestante…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-52" />
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todos os tipos</option>
          {Object.entries(TIPO_ICON).map(([k, v]) => <option key={k} value={k}>{v} {k.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={filtroSituacao} onChange={e => setFiltroSituacao(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todas as situações</option>
          {Object.keys(SIT_COR).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm cursor-pointer self-center">
          <input type="checkbox" checked={filtroVencendo} onChange={e => setFiltroVencendo(e.target.checked)} className="rounded" />
          <span className="text-xs text-orange-600 font-medium">⚠ Só a vencer</span>
        </label>
        {mediaSatisfacao && (
          <div className="ml-auto bg-green-50 rounded-lg px-3 py-1 text-sm text-green-700 self-center">
            😊 Satisfação média: <strong>{mediaSatisfacao}/5</strong>
          </div>
        )}
        <span className="text-sm text-gray-400 self-center">{manifestacoes.length} manifestações</span>
      </div>

      {/* Layout 2 colunas */}
      <div className="px-6 pb-8 grid grid-cols-5 gap-6">
        {/* Lista */}
        <div className="col-span-2 space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
          {manifestacoes.map(m => (
            <button key={m.id} onClick={() => abrirDetalhe(m.id)}
              className={`w-full text-left bg-white rounded-xl border p-4 hover:border-indigo-400 transition-all ${
                detalhe?.id === m.id ? 'border-indigo-500 ring-1 ring-indigo-200' :
                m.atrasada ? 'border-red-300' : m.vencendoBreve ? 'border-orange-300' : 'border-gray-200'
              }`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-base">{TIPO_ICON[m.tipo] ?? '📄'}</span>
                    <span className="font-mono text-xs text-indigo-600">{m.protocolo}</span>
                    {m.lai && <span className="text-xs bg-indigo-100 text-indigo-600 px-1 rounded">LAI</span>}
                    {m.anonima && <span className="text-xs text-gray-400">🔒</span>}
                  </div>
                  <div className="font-semibold text-sm text-gray-900 leading-tight truncate">{m.assunto}</div>
                  <div className={`text-xs font-medium ${TIPO_COR[m.tipo]}`}>{m.tipo.replace(/_/g, ' ')}</div>
                  {m.nomeManifestante && <div className="text-xs text-gray-400">{m.nomeManifestante}</div>}
                  <div className="text-xs text-gray-300 mt-0.5">{fmtData(m.criadoEm)}</div>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${SIT_COR[m.situacao]}`}>
                    {m.situacao.replace(/_/g, ' ')}
                  </span>
                  <span className={`text-xs font-medium ${PRIOR_COR[m.prioridade]}`}>● {m.prioridade}</span>
                  {m.atrasada ? (
                    <span className="text-xs text-red-600 font-medium">🔴 {Math.abs(m.diasRestantes)}d atrasado</span>
                  ) : m.vencendoBreve ? (
                    <span className="text-xs text-orange-500 font-medium">⚠ {m.diasRestantes}d restantes</span>
                  ) : (
                    <span className="text-xs text-gray-300">{m.diasRestantes}d restantes</span>
                  )}
                  {m.avaliado && m.satisfacao && <span className="text-sm">{SAT_ICON[m.satisfacao]}</span>}
                </div>
              </div>
            </button>
          ))}
          {manifestacoes.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <div className="text-4xl mb-2">📣</div>
              <div>Nenhuma manifestação encontrada</div>
            </div>
          )}
        </div>

        {/* Painel detalhe */}
        <div className="col-span-3">
          {!detalhe ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <div className="text-5xl mb-3">📣</div>
              <div>Selecione uma manifestação</div>
              {porTipo.length > 0 && (
                <div className="mt-8 text-left max-w-xs mx-auto">
                  <div className="text-sm font-semibold text-gray-600 mb-3 text-center">Por Tipo</div>
                  <div className="space-y-1.5">
                    {porTipo.map((t: any) => (
                      <div key={t.tipo} className="flex items-center gap-2 text-xs">
                        <span>{TIPO_ICON[t.tipo] ?? '📄'}</span>
                        <span className="text-gray-600 flex-1">{t.tipo.replace(/_/g, ' ')}</span>
                        <span className="font-medium">{t._count.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-5 border-b">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{TIPO_ICON[detalhe.tipo] ?? '📄'}</span>
                      <div>
                        <div className="font-mono text-sm text-indigo-600">{detalhe.protocolo}</div>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">{detalhe.assunto}</h2>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium ${TIPO_COR[detalhe.tipo]}`}>{detalhe.tipo.replace(/_/g, ' ')}</span>
                      {detalhe.lai && <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">📋 LAI</span>}
                      {detalhe.anonima && <span className="text-xs text-gray-400">🔒 Anônima</span>}
                      <span className={`text-xs font-medium ${PRIOR_COR[detalhe.prioridade]}`}>● {detalhe.prioridade}</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${SIT_COR[detalhe.situacao]}`}>
                    {detalhe.situacao.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Prazo */}
                <div className={`rounded-lg p-2 mb-3 text-xs flex items-center justify-between ${
                  detalhe.atrasada ? 'bg-red-50 text-red-700' :
                  detalhe.vencendoBreve ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-600'
                }`}>
                  <span>⏱ Prazo: {fmtData(detalhe.prazoResposta)}{detalhe.prorrogado ? ' (prorrogado)' : ''}</span>
                  <span className="font-semibold">
                    {detalhe.atrasada ? `🔴 ${Math.abs(detalhe.diasRestantes)}d atrasado` :
                     `${detalhe.diasRestantes}d restantes`}
                  </span>
                </div>

                {/* Descrição */}
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 mb-3 max-h-28 overflow-y-auto">
                  {detalhe.descricao}
                </div>

                {/* Manifestante */}
                {!detalhe.anonima && detalhe.nomeManifestante && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                    <div>Manifestante: <span className="text-gray-700">{detalhe.nomeManifestante}</span></div>
                    {detalhe.emailManifestante && <div>E-mail: <span className="text-gray-700">{detalhe.emailManifestante}</span></div>}
                    {detalhe.telefoneManifestante && <div>Telefone: <span className="text-gray-700">{detalhe.telefoneManifestante}</span></div>}
                    {detalhe.secretariaDestino && <div>Destinado a: <span className="text-gray-700">{detalhe.secretariaDestino}</span></div>}
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setModalResposta(true)}
                    className="px-3 py-1.5 text-xs bg-indigo-100 text-indigo-700 rounded-lg font-medium hover:bg-indigo-200">
                    💬 Responder
                  </button>
                  {(TRANSICOES_DISPONIVEIS[detalhe.situacao] ?? []).map(acao => (
                    <button key={acao} onClick={() => acaoManifestacao(acao)}
                      className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
                      {acao.replace(/_/g, ' ')}
                    </button>
                  ))}
                  {!detalhe.prorrogado && !['ENCERRADA','ARQUIVADA'].includes(detalhe.situacao) && (
                    <button onClick={() => acaoManifestacao('PRORROGAR')}
                      className="px-3 py-1.5 text-xs bg-yellow-100 text-yellow-700 rounded-lg font-medium hover:bg-yellow-200">
                      ⏳ Prorrogar
                    </button>
                  )}
                  {detalhe.situacao === 'RESPONDIDA' && !detalhe.avaliado && (
                    <button onClick={() => acaoManifestacao('AVALIAR', { satisfacao: 'SATISFEITO' })}
                      className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200">
                      ✓ Encerrar (satisfeito)
                    </button>
                  )}
                </div>
              </div>

              {/* Histórico e Respostas */}
              <div className="p-5 grid grid-cols-2 gap-5 max-h-64 overflow-y-auto">
                <div>
                  <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Histórico</h3>
                  <div className="space-y-1.5">
                    <div className="text-xs bg-gray-50 rounded-lg px-3 py-2">
                      <div className="text-indigo-600 font-medium">RECEBIDA</div>
                      <div className="text-gray-400">{fmtDataHora(detalhe.criadoEm)}</div>
                    </div>
                    {detalhe.movimentacoes.map(m => (
                      <div key={m.id} className="text-xs bg-gray-50 rounded-lg px-3 py-2">
                        <div className="text-indigo-600 font-medium">{m.situacaoDe} → {m.situacaoPara}</div>
                        {m.motivo && <div className="text-gray-500">{m.motivo}</div>}
                        <div className="text-gray-300">{fmtDataHora(m.criadoEm)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Respostas</h3>
                  {detalhe.respostas.length === 0 ? (
                    <div className="text-xs text-gray-300 text-center py-3">Sem respostas ainda</div>
                  ) : (
                    <div className="space-y-1.5">
                      {detalhe.respostas.map(r => (
                        <div key={r.id} className={`text-xs rounded-lg px-3 py-2 ${r.tipo === 'INTERNO' ? 'bg-yellow-50' : 'bg-indigo-50'}`}>
                          <div className="flex justify-between items-start mb-0.5">
                            <span className={`font-medium ${r.tipo === 'OFICIAL' ? 'text-indigo-600' : r.tipo === 'INTERNO' ? 'text-yellow-600' : 'text-gray-600'}`}>
                              {r.tipo}{r.remetente ? ` · ${r.remetente}` : ''}
                            </span>
                            {!r.publica && <span className="text-gray-400">🔒</span>}
                          </div>
                          <div className="text-gray-700 leading-relaxed">{r.texto.substring(0, 150)}{r.texto.length > 150 ? '…' : ''}</div>
                          <div className="text-gray-300 mt-0.5">{fmtDataHora(r.criadoEm)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalNova && <ModalNovaManif onSalvar={registrar} onClose={() => setModalNova(false)} />}
      {modalResposta && detalhe && (
        <ModalResposta manif={detalhe} onSalvar={responder} onClose={() => setModalResposta(false)} />
      )}
    </div>
  )
}
