'use client'

import { useEffect, useState } from 'react'
import {
  Eye, Download, Plus, CheckCircle, XCircle, AlertTriangle,
  Globe, FileText, RefreshCw, Archive, ExternalLink, Search,
} from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Situacao = 'RASCUNHO' | 'PUBLICADO' | 'DESATUALIZADO' | 'ARQUIVADO'
type Tipo = string

interface Transparencia {
  id: string
  tipo: Tipo
  situacao: Situacao
  titulo: string
  descricao: string
  conteudo: string | null
  urlExterna: string | null
  urlArquivo: string | null
  periodoCoberto: string | null
  periodicidade: string | null
  palavrasChave: string | null
  secretaria: string | null
  publicadoEm: string | null
  dataUltimaAtualizacao: string | null
  dataProximaAtualizacao: string | null
  visualizacoes: number
  downloads: number
}

interface ChecklistItem {
  tipo: string
  periodicidade: string
  fundamento: string
  publicado: boolean
  desatualizado: boolean
  dataUltimaAtualizacao: string | null
  status: 'OK' | 'DESATUALIZADO' | 'NAO_PUBLICADO'
}

interface Conformidade {
  total: number
  ok: number
  desatualizado: number
  naoPub: number
  percentual: number
}

// ─── Mapas ────────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<string, string> = {
  ESTRUTURA_ORGANIZACIONAL:      'Estrutura Organizacional',
  ACOES_PROGRAMAS:               'Ações e Programas',
  LICITACOES_CONTRATOS:          'Licitações e Contratos',
  REPASSES_TRANSFERENCIAS:       'Repasses e Transferências',
  RECEITAS_DESPESAS:             'Receitas e Despesas',
  OBRAS_PUBLICAS:                'Obras Públicas',
  SERVIDORES:                    'Servidores',
  RESPOSTAS_PERGUNTAS_FREQUENTES:'Perguntas Frequentes',
  DIARIO_OFICIAL:                'Diário Oficial',
  RELATORIO_GESTAO:              'Relatório de Gestão',
  CONTAS_PUBLICAS:               'Contas Públicas',
  NOTA_IMPRENSA:                 'Nota à Imprensa',
}

const SIT_META: Record<Situacao, { label: string; cor: string; bg: string }> = {
  RASCUNHO:     { label: 'Rascunho',     cor: 'text-slate-600',  bg: 'bg-slate-100'  },
  PUBLICADO:    { label: 'Publicado',    cor: 'text-green-700',  bg: 'bg-green-50'   },
  DESATUALIZADO:{ label: 'Desatualizado',cor: 'text-orange-700', bg: 'bg-orange-50'  },
  ARQUIVADO:    { label: 'Arquivado',    cor: 'text-slate-400',  bg: 'bg-slate-50'   },
}

// ─── Painel Conformidade Art. 8 ───────────────────────────────────────────────

function PainelConformidade({
  checklist,
  conformidade,
  onPublicar,
}: {
  checklist: ChecklistItem[]
  conformidade: Conformidade
  onPublicar: (tipo: string) => void
}) {
  const corPercentual =
    conformidade.percentual >= 80 ? 'text-green-600' :
    conformidade.percentual >= 50 ? 'text-orange-600' : 'text-red-600'

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-800">Conformidade Art. 8 - Lei 12.527/2011</h2>
            <p className="text-xs text-slate-500 mt-0.5">Obrigações de transparência ativa</p>
          </div>
          <div className="text-right">
            <span className={`text-3xl font-bold ${corPercentual}`}>{conformidade.percentual}%</span>
            <p className="text-xs text-slate-400">{conformidade.ok}/{conformidade.total} itens OK</p>
          </div>
        </div>
        {/* Barra de progresso */}
        <div className="mt-3 w-full bg-slate-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              conformidade.percentual >= 80 ? 'bg-green-500' :
              conformidade.percentual >= 50 ? 'bg-orange-400' : 'bg-red-500'
            }`}
            style={{ width: `${conformidade.percentual}%` }}
          />
        </div>
      </div>

      <div className="divide-y divide-slate-50">
        {checklist.map(item => (
          <div key={item.tipo} className={`flex items-center gap-4 px-5 py-3 ${
            item.status === 'NAO_PUBLICADO' ? 'bg-red-50' :
            item.status === 'DESATUALIZADO' ? 'bg-orange-50' : ''
          }`}>
            {item.status === 'OK' && <CheckCircle size={16} className="text-green-500 flex-shrink-0" />}
            {item.status === 'DESATUALIZADO' && <AlertTriangle size={16} className="text-orange-500 flex-shrink-0" />}
            {item.status === 'NAO_PUBLICADO' && <XCircle size={16} className="text-red-400 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">{TIPO_LABEL[item.tipo] ?? item.tipo}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-slate-400">{item.periodicidade}</span>
                <span className="text-xs text-slate-300">·</span>
                <span className="text-xs text-slate-400">{item.fundamento}</span>
              </div>
            </div>
            {item.dataUltimaAtualizacao && (
              <span className="text-xs text-slate-400 flex-shrink-0">
                Atualizado: {new Date(item.dataUltimaAtualizacao).toLocaleDateString('pt-BR')}
              </span>
            )}
            {item.status !== 'OK' && (
              <button
                onClick={() => onPublicar(item.tipo)}
                className="flex-shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg transition-colors"
              >
                {item.status === 'NAO_PUBLICADO' ? 'Publicar' : 'Atualizar'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Modal Nova Publicação ────────────────────────────────────────────────────

function ModalNovaPublicacao({
  tipoInicial,
  onFechar,
  onSalvar,
}: {
  tipoInicial?: string
  onFechar: () => void
  onSalvar: (d: Record<string, string | boolean>) => void
}) {
  const [form, setForm] = useState({
    tipo: tipoInicial ?? 'RECEITAS_DESPESAS',
    titulo: '', descricao: '', conteudo: '',
    urlExterna: '', urlArquivo: '',
    periodoCoberto: '', periodicidade: '',
    palavrasChave: '', secretaria: '',
    dataProximaAtualizacao: '',
    publicarAgora: true,
  })

  const F = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Nova Publicação - Transparência Ativa</h2>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600">Tipo de Informação *</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.tipo} onChange={e => F('tipo', e.target.value)}>
                {Object.entries(TIPO_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Secretaria</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                placeholder="Ex: Secretaria de Finanças"
                value={form.secretaria} onChange={e => F('secretaria', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Título *</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
              value={form.titulo} onChange={e => F('titulo', e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Descrição *</label>
            <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none resize-none" rows={3}
              value={form.descricao} onChange={e => F('descricao', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600">Período Coberto</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                placeholder="Ex: Jan-Jun/2026"
                value={form.periodoCoberto} onChange={e => F('periodoCoberto', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Periodicidade</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                placeholder="Ex: Mensal, Trimestral"
                value={form.periodicidade} onChange={e => F('periodicidade', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600">URL do Documento/Arquivo</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                placeholder="https://..."
                value={form.urlArquivo} onChange={e => F('urlArquivo', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Link Externo (portal)</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                placeholder="https://..."
                value={form.urlExterna} onChange={e => F('urlExterna', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600">Palavras-chave</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                placeholder="orçamento, despesa, 2026"
                value={form.palavrasChave} onChange={e => F('palavrasChave', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Próxima Atualização</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.dataProximaAtualizacao} onChange={e => F('dataProximaAtualizacao', e.target.value)} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.publicarAgora}
              onChange={e => F('publicarAgora', e.target.checked)}
              className="accent-indigo-600 w-4 h-4" />
            <span className="text-sm text-slate-700">Publicar imediatamente</span>
          </label>
        </div>
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onFechar} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
          <button
            onClick={() => onSalvar(form as any)}
            disabled={!form.titulo || !form.descricao}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">
            {form.publicarAgora ? 'Publicar' : 'Salvar Rascunho'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Card de publicação ───────────────────────────────────────────────────────

function CardTransparencia({
  item,
  onAtualizar,
  onArquivar,
}: {
  item: Transparencia
  onAtualizar: () => void
  onArquivar: () => void
}) {
  const sit = SIT_META[item.situacao]

  return (
    <div className={`bg-white border rounded-xl p-4 shadow-sm ${
      item.situacao === 'DESATUALIZADO' ? 'border-orange-300' : 'border-slate-200'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sit.cor} ${sit.bg}`}>{sit.label}</span>
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{TIPO_LABEL[item.tipo] ?? item.tipo}</span>
          {item.secretaria && <span className="text-xs text-slate-400">{item.secretaria}</span>}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400 flex-shrink-0">
          {item.visualizacoes > 0 && (
            <span className="flex items-center gap-1"><Eye size={11}/>{item.visualizacoes}</span>
          )}
          {item.downloads > 0 && (
            <span className="flex items-center gap-1"><Download size={11}/>{item.downloads}</span>
          )}
        </div>
      </div>

      <h3 className="font-medium text-slate-800 text-sm mb-1">{item.titulo}</h3>
      <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">{item.descricao}</p>

      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-400 space-y-0.5">
          {item.periodoCoberto && <p>Período: <span className="font-medium text-slate-600">{item.periodoCoberto}</span></p>}
          {item.dataUltimaAtualizacao && (
            <p>Atualizado: <span className="text-slate-600">{new Date(item.dataUltimaAtualizacao).toLocaleDateString('pt-BR')}</span></p>
          )}
          {item.dataProximaAtualizacao && (
            <p className={new Date(item.dataProximaAtualizacao) < new Date() ? 'text-orange-600 font-medium' : ''}>
              Próx. atualiz.: {new Date(item.dataProximaAtualizacao).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {item.urlExterna && (
            <a href={item.urlExterna} target="_blank" rel="noopener noreferrer"
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
              <ExternalLink size={14}/>
            </a>
          )}
          {item.urlArquivo && (
            <a href={item.urlArquivo} target="_blank" rel="noopener noreferrer"
              className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
              <Download size={14}/>
            </a>
          )}
          {item.situacao !== 'ARQUIVADO' && (
            <>
              <button onClick={onAtualizar}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Atualizar">
                <RefreshCw size={14}/>
              </button>
              <button onClick={onArquivar}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Arquivar">
                <Archive size={14}/>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function TransparenciaPage() {
  const [items, setItems] = useState<Transparencia[]>([])
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [conformidade, setConformidade] = useState<Conformidade | null>(null)
  const [modalNovo, setModalNovo] = useState(false)
  const [tipoInicial, setTipoInicial] = useState<string | undefined>()
  const [aba, setAba] = useState<'publicacoes' | 'conformidade'>('conformidade')
  const [filtroSit, setFiltroSit] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  async function carregar() {
    setCarregando(true)
    const params = new URLSearchParams()
    if (filtroSit)  params.set('situacao', filtroSit)
    if (filtroTipo) params.set('tipo', filtroTipo)
    if (busca)      params.set('busca', busca)

    const [resItems, resConf] = await Promise.all([
      fetch(`/api/esic/transparencia?${params}`).then(r => r.json()),
      fetch('/api/esic/transparencia?relatorio=CONFORMIDADE').then(r => r.json()),
    ])
    setItems(resItems.transparencias ?? [])
    setChecklist(resConf.checklist ?? [])
    setConformidade(resConf.conformidade ?? null)
    setCarregando(false)
  }

  useEffect(() => { carregar() }, [filtroSit, filtroTipo, busca])

  async function salvarPublicacao(d: Record<string, string | boolean>) {
    await fetch('/api/esic/transparencia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d),
    })
    setModalNovo(false)
    setTipoInicial(undefined)
    carregar()
  }

  async function executarAcao(id: string, acao: string) {
    await fetch('/api/esic/transparencia', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, acao }),
    })
    carregar()
  }

  const desatualizados = checklist.filter(c => c.status !== 'OK').length

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Transparência Ativa</h1>
            <p className="text-sm text-slate-500 mt-0.5">Art. 8 Lei 12.527/2011 - Publicações obrigatórias e complementares</p>
          </div>
          <button
            onClick={() => { setTipoInicial(undefined); setModalNovo(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 shadow-sm">
            <Plus size={16}/> Nova Publicação
          </button>
        </div>

        {/* Alerta conformidade */}
        {conformidade && desatualizados > 0 && (
          <div className="bg-orange-50 border border-orange-300 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
            <AlertTriangle size={18} className="text-orange-500"/>
            <span className="text-sm text-orange-700">
              <strong>{desatualizados}</strong> item{desatualizados > 1 ? 's' : ''} pendente{desatualizados > 1 ? 's' : ''} de publicação ou atualização conforme Art. 8 LAI.
              {conformidade.percentual < 60 && <span className="ml-2 text-red-700 font-medium">⚠ Risco de irregularidade - ação imediata necessária.</span>}
            </span>
          </div>
        )}

        {/* Abas */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-5">
          {(['conformidade', 'publicacoes'] as const).map(a => (
            <button key={a} onClick={() => setAba(a)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${aba === a ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
              {a === 'conformidade' ? `Conformidade Art. 8${conformidade ? ` (${conformidade.percentual}%)` : ''}` : `Publicações (${items.length})`}
            </button>
          ))}
        </div>

        {/* Aba: Conformidade */}
        {aba === 'conformidade' && conformidade && (
          <PainelConformidade
            checklist={checklist}
            conformidade={conformidade}
            onPublicar={(tipo) => { setTipoInicial(tipo); setModalNovo(true) }}
          />
        )}

        {/* Aba: Publicações */}
        {aba === 'publicacoes' && (
          <>
            {/* Filtros */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input
                  className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                  placeholder="Buscar publicações..."
                  value={busca} onChange={e => setBusca(e.target.value)}
                />
              </div>
              <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={filtroSit} onChange={e => setFiltroSit(e.target.value)}>
                <option value="">Todas as situações</option>
                <option value="PUBLICADO">Publicados</option>
                <option value="RASCUNHO">Rascunhos</option>
                <option value="DESATUALIZADO">Desatualizados</option>
                <option value="ARQUIVADO">Arquivados</option>
              </select>
              <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                <option value="">Todos os tipos</option>
                {Object.entries(TIPO_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {carregando ? (
              <div className="text-center py-16 text-slate-400">Carregando…</div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Globe size={28} className="mx-auto mb-2 opacity-30"/>
                <p>Nenhuma publicação encontrada.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {items.map(item => (
                  <CardTransparencia
                    key={item.id}
                    item={item}
                    onAtualizar={() => executarAcao(item.id, item.situacao === 'RASCUNHO' ? 'PUBLICAR' : 'ATUALIZAR')}
                    onArquivar={() => executarAcao(item.id, 'ARQUIVAR')}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {modalNovo && (
        <ModalNovaPublicacao
          tipoInicial={tipoInicial}
          onFechar={() => { setModalNovo(false); setTipoInicial(undefined) }}
          onSalvar={salvarPublicacao}
        />
      )}
    </div>
  )
}
