'use client'

import { useState, useEffect, useCallback } from 'react'
import { PlusCircle, Search, Eye, X, ChevronRight, Users, Package, FileText } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Licitacao {
  id: string; numero: string; situacao: string; modalidade: string
  tipoObjeto: string; criterio: string; objeto: string
  valorEstimado?: number; valorHomologado?: number
  dataPublicacao?: string; dataAbertura?: string; dataHomologacao?: string
  processoNumero?: string; pregoeiro?: string; criadoEm: string
  _count: { lotes: number; participantes: number; contratos: number }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const moeda = (v?: number | null) => v != null ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'
const dataFmt = (d?: string | null) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

const SIT: Record<string, { label: string; cor: string; bg: string }> = {
  RASCUNHO:     { label: 'Rascunho',      cor: 'text-slate-600',   bg: 'bg-slate-100' },
  PUBLICADA:    { label: 'Publicada',     cor: 'text-blue-700',    bg: 'bg-blue-50'   },
  EM_ANDAMENTO: { label: 'Em Andamento',  cor: 'text-amber-700',   bg: 'bg-amber-50'  },
  JULGAMENTO:   { label: 'Julgamento',    cor: 'text-purple-700',  bg: 'bg-purple-50' },
  HOMOLOGADA:   { label: 'Homologada',    cor: 'text-emerald-700', bg: 'bg-emerald-50'},
  ADJUDICADA:   { label: 'Adjudicada',    cor: 'text-teal-700',    bg: 'bg-teal-50'   },
  CONTRATADA:   { label: 'Contratada',    cor: 'text-green-700',   bg: 'bg-green-50'  },
  DESERTA:      { label: 'Deserta',       cor: 'text-orange-600',  bg: 'bg-orange-50' },
  FRACASSADA:   { label: 'Fracassada',    cor: 'text-red-600',     bg: 'bg-red-50'    },
  REVOGADA:     { label: 'Revogada',      cor: 'text-red-700',     bg: 'bg-red-50'    },
  ANULADA:      { label: 'Anulada',       cor: 'text-red-800',     bg: 'bg-red-100'   },
}

const MODAL_LABEL: Record<string, string> = {
  PREGAO_ELETRONICO:   'Pregão Eletrônico',
  PREGAO_PRESENCIAL:   'Pregão Presencial',
  CONCORRENCIA:        'Concorrência',
  CONCURSO:            'Concurso',
  LEILAO:              'Leilão',
  DISPENSA_LICITACAO:  'Dispensa',
  INEXIGIBILIDADE:     'Inexigibilidade',
  CHAMAMENTO_PUBLICO:  'Chamamento Público',
  REGISTRO_PRECOS:     'Registro de Preços',
}

const ACOES_TRANSICAO: Record<string, { acao: string; label: string; cor: string }[]> = {
  RASCUNHO:     [{ acao: 'PUBLICAR',     label: 'Publicar',          cor: 'bg-blue-600 hover:bg-blue-700' }],
  PUBLICADA:    [{ acao: 'INICIAR',      label: 'Iniciar Sessão',    cor: 'bg-amber-600 hover:bg-amber-700' }],
  EM_ANDAMENTO: [
    { acao: 'JULGAR',            label: 'Receber Propostas', cor: 'bg-purple-600 hover:bg-purple-700' },
    { acao: 'DECLARAR_DESERTA',  label: 'Declarar Deserta',  cor: 'bg-orange-600 hover:bg-orange-700' },
  ],
  JULGAMENTO:   [
    { acao: 'CLASSIFICAR',       label: 'Classificar',       cor: 'bg-slate-600 hover:bg-slate-700' },
    { acao: 'HOMOLOGAR',         label: 'Homologar',         cor: 'bg-emerald-600 hover:bg-emerald-700' },
    { acao: 'DECLARAR_FRACASSADA',label:'Declarar Fracassada',cor:'bg-red-600 hover:bg-red-700' },
  ],
  HOMOLOGADA:   [{ acao: 'ADJUDICAR',    label: 'Adjudicar',         cor: 'bg-teal-600 hover:bg-teal-700' }],
  ADJUDICADA:   [{ acao: 'CONTRATAR',    label: 'Formalizar Contrato',cor:'bg-green-600 hover:bg-green-700' }],
}

// ─── Modal criar licitação ─────────────────────────────────────────────────────

function ModalNovaLicitacao({ onClose, onSalvar }: { onClose: () => void; onSalvar: () => void }) {
  const [form, setForm] = useState({
    modalidade: 'PREGAO_ELETRONICO', criterio: 'MENOR_PRECO',
    tipoObjeto: 'COMPRAS', objeto: '', valorEstimado: '',
    dataAbertura: '', processoNumero: '', fundamentoLegal: '',
    pregoeiro: '', observacoes: '',
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({...f, [k]: e.target.value}))

  async function salvar() {
    setSalvando(true); setErro('')
    try {
      const r = await fetch('/api/semad/licitacao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'LICITACAO', ...form, valorEstimado: form.valorEstimado ? Number(form.valorEstimado) : undefined }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.erro ?? 'Erro') }
      onSalvar()
    } catch (e: any) { setErro(e.message) }
    setSalvando(false)
  }

  const isDispensa = ['DISPENSA_LICITACAO','INEXIGIBILIDADE'].includes(form.modalidade)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-slate-800">Nova Licitação / Contratação</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Modalidade</label>
              <select value={form.modalidade} onChange={set('modalidade')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(MODAL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Critério de Julgamento</label>
              <select value={form.criterio} onChange={set('criterio')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['MENOR_PRECO','MAIOR_DESCONTO','MELHOR_TECNICA','TECNICA_E_PRECO','MAIOR_LANCE'].map(c => (
                  <option key={c} value={c}>{c.replace(/_/g,' ')}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Objeto</label>
              <select value={form.tipoObjeto} onChange={set('tipoObjeto')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['OBRAS','SERVICOS_ENGENHARIA','SERVICOS_COMUNS','COMPRAS','LOCACAO_IMOVEIS','CONCESSAO','ALIENACAO'].map(t => (
                  <option key={t} value={t}>{t.replace(/_/g,' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor Estimado (R$)</label>
              <input type="number" value={form.valorEstimado} onChange={set('valorEstimado')} placeholder="0.00"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Objeto *</label>
            <textarea value={form.objeto} onChange={set('objeto')} rows={3}
              placeholder="Descrição do objeto da licitação…"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data de Abertura</label>
              <input type="datetime-local" value={form.dataAbertura} onChange={set('dataAbertura')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Processo Administrativo</label>
              <input type="text" value={form.processoNumero} onChange={set('processoNumero')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDispensa ? 'text-red-700' : 'text-slate-700'}`}>
              Fundamentação Legal{isDispensa && ' *'}
            </label>
            <input type="text" value={form.fundamentoLegal} onChange={set('fundamentoLegal')}
              placeholder={isDispensa ? 'Ex: Art. 75, II, Lei 14.133/2021' : 'Art. 29, IV, Lei 14.133/2021'}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${isDispensa ? 'border-red-300 focus:ring-red-500' : 'focus:ring-blue-500'}`}/>
            {isDispensa && <p className="text-xs text-red-600 mt-1">Obrigatório para dispensa / inexigibilidade</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pregoeiro / Responsável</label>
            <input type="text" value={form.pregoeiro} onChange={set('pregoeiro')}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          {erro && <p className="text-red-600 text-sm">{erro}</p>}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {salvando ? 'Criando…' : 'Criar Licitação'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Painel de licitação ──────────────────────────────────────────────────────

function PainelLicitacao({ id, onFechar, onAtualizar }: { id: string; onFechar: () => void; onAtualizar: () => void }) {
  const [lic, setLic] = useState<any>(null)
  const [atuando, setAtuando] = useState(false)

  useEffect(() => {
    fetch(`/api/semad/licitacao?id=${id}`).then(r => r.json()).then(d => setLic(d.licitacao))
  }, [id])

  async function agir(acao: string, extra: Record<string,any> = {}) {
    setAtuando(true)
    await fetch('/api/semad/licitacao', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, acao, ...extra }),
    })
    const r = await fetch(`/api/semad/licitacao?id=${id}`)
    const d = await r.json()
    setLic(d.licitacao)
    setAtuando(false)
    onAtualizar()
  }

  if (!lic) return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onFechar}/>
      <aside className="fixed right-0 top-0 h-full w-96 z-50 bg-white shadow-2xl flex items-center justify-center">
        <p className="text-slate-400 text-sm">Carregando…</p>
      </aside>
    </>
  )

  const sit = SIT[lic.situacao] ?? SIT['RASCUNHO']
  const acoes = ACOES_TRANSICAO[lic.situacao] ?? []

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onFechar}/>
      <aside className="fixed right-0 top-0 h-full w-[480px] z-50 bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-bold text-slate-800">{lic.numero}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sit.bg} ${sit.cor}`}>{sit.label}</span>
            </div>
            <p className="text-xs text-slate-500">{MODAL_LABEL[lic.modalidade]}</p>
          </div>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
        </div>
        <div className="p-4 space-y-5">
          {/* Objeto */}
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Objeto</p>
            <p className="text-sm text-slate-700">{lic.objeto}</p>
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { l: 'Valor Estimado',   v: moeda(lic.valorEstimado) },
              { l: 'Valor Homologado', v: moeda(lic.valorHomologado) },
              { l: 'Data Abertura',    v: dataFmt(lic.dataAbertura) },
              { l: 'Homologação',      v: dataFmt(lic.dataHomologacao) },
              { l: 'Critério',         v: lic.criterio.replace(/_/g,' ') },
              { l: 'Processo',         v: lic.processoNumero ?? '—' },
            ].map(item => (
              <div key={item.l} className="bg-slate-50 rounded p-2">
                <p className="text-xs text-slate-400">{item.l}</p>
                <p className="font-medium text-slate-700 text-xs">{item.v}</p>
              </div>
            ))}
          </div>

          {/* Lotes */}
          {lic.lotes?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Lotes ({lic.lotes.length})</p>
              {lic.lotes.map((l: any) => (
                <div key={l.id} className="flex justify-between text-sm py-2 border-b border-slate-50">
                  <span className="text-slate-700">{l.numero}. {l.descricao}</span>
                  <span className="text-slate-500 ml-2 whitespace-nowrap">{l.quantidade} {l.unidade}</span>
                </div>
              ))}
            </div>
          )}

          {/* Participantes */}
          {lic.participantes?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Participantes ({lic.participantes.length})</p>
              {lic.participantes.map((p: any) => (
                <div key={p.id} className="flex items-start justify-between py-2 border-b border-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{p.nomeEmpresa}</p>
                    <p className="text-xs text-slate-400">{p.cnpj}</p>
                  </div>
                  <div className="text-right ml-3">
                    {p.classificacao && <p className="text-xs font-bold text-emerald-700">{p.classificacao}º</p>}
                    {p.valorProposta && <p className="text-xs text-slate-600">{moeda(p.valorProposta)}</p>}
                    <span className={`text-xs px-1 rounded ${p.habilitado ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                      {p.habilitado ? 'Habilitado' : 'Inabilitado'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Ações */}
          {acoes.length > 0 && (
            <div className="space-y-2 pt-2">
              {acoes.map(a => (
                <button key={a.acao} onClick={() => agir(a.acao)} disabled={atuando}
                  className={`w-full py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${a.cor}`}>
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function LicitacaoPage() {
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([])
  const [resumo, setResumo]         = useState<any>(null)
  const [selId, setSelId]           = useState<string | null>(null)
  const [showModal, setShowModal]   = useState(false)
  const [busca, setBusca]           = useState('')
  const [filtroSit, setFiltroSit]   = useState('')
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const p = new URLSearchParams()
    if (busca)     p.set('busca', busca)
    if (filtroSit) p.set('situacao', filtroSit)
    const r = await fetch(`/api/semad/licitacao?${p}`)
    const d = await r.json()
    setLicitacoes(d.licitacoes ?? [])
    setResumo(d.resumo ?? null)
    setCarregando(false)
  }, [busca, filtroSit])

  useEffect(() => { carregar() }, [carregar])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Licitações</h1>
          <p className="text-slate-500 text-sm mt-0.5">Lei 14.133/2021 - Nova Lei de Licitações e Contratos</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm">
          <PlusCircle size={16}/> Nova Licitação
        </button>
      </div>

      {/* KPIs por situação */}
      {resumo && (
        <div className="flex gap-2 flex-wrap">
          {resumo.porSituacao.filter((s: any) => s.total > 0).map((s: any) => {
            const sit = SIT[s.situacao] ?? { label: s.situacao, cor: 'text-slate-600', bg: 'bg-slate-100' }
            return (
              <button key={s.situacao} onClick={() => setFiltroSit(filtroSit === s.situacao ? '' : s.situacao)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filtroSit === s.situacao ? 'ring-2 ring-offset-1 ring-blue-500' : ''} ${sit.bg} ${sit.cor} border-current/20`}>
                {sit.label} · {s.total}
              </button>
            )
          })}
        </div>
      )}

      {/* Busca */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por número, objeto, processo…"
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Número','Modalidade','Objeto','Valor Est.','Abertura','Lotes','Participantes','Situação',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {carregando ? (
              <tr><td colSpan={9} className="py-10 text-center text-slate-400">Carregando…</td></tr>
            ) : licitacoes.length === 0 ? (
              <tr><td colSpan={9} className="py-10 text-center text-slate-400">Nenhuma licitação encontrada</td></tr>
            ) : licitacoes.map(l => {
              const sit = SIT[l.situacao] ?? SIT['RASCUNHO']
              return (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">{l.numero}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{MODAL_LABEL[l.modalidade]}</td>
                  <td className="px-4 py-3 text-slate-700 max-w-56 truncate">{l.objeto}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap text-slate-700">{moeda(l.valorEstimado)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{dataFmt(l.dataAbertura)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{l._count.lotes}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{l._count.participantes}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sit.bg} ${sit.cor}`}>{sit.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelId(l.id)} className="text-slate-400 hover:text-blue-600"><Eye size={15}/></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selId && (
        <PainelLicitacao id={selId} onFechar={() => setSelId(null)} onAtualizar={carregar}/>
      )}
      {showModal && (
        <ModalNovaLicitacao onClose={() => setShowModal(false)} onSalvar={() => { setShowModal(false); carregar() }}/>
      )}
    </div>
  )
}
