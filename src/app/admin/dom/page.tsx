'use client'

import { useState, useEffect } from 'react'
import {
  Newspaper, Search, Plus, Eye, FileText, Calendar,
  Tag, ChevronRight, Loader2, AlertCircle, CheckCircle2,
  BookOpen, Filter, Download, ExternalLink,
} from 'lucide-react'
import Link from 'next/link'

interface Edicao {
  id: string
  numero: number
  ano: number
  data: string
  edicao: string
  titulo: string
  sumario: string | null
  status: string
  secretaria: string | null
  categorias: string | null
  publicadoEm: string | null
  pdfUrl: string | null
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  RASCUNHO:    { label: 'Rascunho',    cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  PUBLICADO:   { label: 'Publicado',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  RETIFICADO:  { label: 'Retificado',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  CANCELADO:   { label: 'Cancelado',   cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
}

export default function DOMPage() {
  const [edicoes, setEdicoes] = useState<Edicao[]>([])
  const [anos, setAnos] = useState<number[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [anoSel, setAnoSel] = useState(2026)
  const [statusSel, setStatusSel] = useState('TODOS')
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState({
    numero: '', data: '', edicao: 'ORDINARIA', titulo: '', sumario: '', conteudo: '', secretaria: '', categorias: '',
  })
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  function carregar() {
    setLoading(true)
    const params = new URLSearchParams({
      ano: String(anoSel),
      status: statusSel,
      ...(busca && { busca }),
    })
    fetch(`/api/dom/diario?${params}`)
      .then(r => r.json())
      .then(d => {
        setEdicoes(d.edicoes ?? [])
        setTotal(d.total ?? 0)
        if (d.anos?.length) setAnos(d.anos)
        setLoading(false)
      })
      .catch(e => { setErro(e.message); setLoading(false) })
  }

  useEffect(() => { carregar() }, [anoSel, statusSel])

  async function handleSalvar() {
    if (!form.numero || !form.data || !form.titulo || !form.conteudo) {
      alert('Preencha número, data, título e conteúdo')
      return
    }
    setSalvando(true)
    try {
      const r = await fetch('/api/dom/diario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.erro || 'Erro ao salvar')
      setModalAberto(false)
      setMsg('Edição criada com sucesso!')
      setTimeout(() => setMsg(null), 3000)
      carregar()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSalvando(false)
    }
  }

  async function publicar(id: string) {
    if (!confirm('Publicar esta edição do DOM?')) return
    await fetch('/api/dom/diario', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, publicar: true }),
    })
    setMsg('DOM publicado!')
    setTimeout(() => setMsg(null), 3000)
    carregar()
  }

  const anoAtual = new Date().getFullYear()
  const anosDisp = anos.length ? anos : [anoAtual, anoAtual - 1]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-indigo-600" size={36} />
    </div>
  )

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Newspaper size={28} className="text-indigo-600" />
            Diário Oficial do Município
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} edição(ões) em {anoSel} · Publicação de atos administrativos municipais
          </p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          <Plus size={16} />
          Nova Edição
        </button>
      </div>

      {msg && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">
          <CheckCircle2 size={16} /> {msg}
        </div>
      )}

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total publicadas', valor: edicoes.filter(e => e.status === 'PUBLICADO').length, cor: 'green' },
          { label: 'Rascunhos', valor: edicoes.filter(e => e.status === 'RASCUNHO').length, cor: 'yellow' },
          { label: 'Retificadas', valor: edicoes.filter(e => e.status === 'RETIFICADO').length, cor: 'blue' },
          { label: 'Total do ano', valor: total, cor: 'indigo' },
        ].map(k => (
          <div key={k.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 text-${k.cor}-600`}>{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && carregar()}
            placeholder="Buscar por título, sumário..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <select
          value={anoSel}
          onChange={e => setAnoSel(Number(e.target.value))}
          className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 outline-none"
        >
          {anosDisp.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={statusSel}
          onChange={e => setStatusSel(e.target.value)}
          className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 outline-none"
        >
          <option value="TODOS">Todos os status</option>
          <option value="PUBLICADO">Publicados</option>
          <option value="RASCUNHO">Rascunhos</option>
          <option value="RETIFICADO">Retificados</option>
        </select>
      </div>

      {/* Lista de edições */}
      {erro && (
        <div className="flex items-center gap-2 text-red-600 p-4">
          <AlertCircle size={18} /> {erro}
        </div>
      )}

      <div className="space-y-3">
        {edicoes.map(e => {
          const st = STATUS_LABEL[e.status] ?? { label: e.status, cls: 'bg-gray-100 text-gray-600' }
          const dataFmt = new Date(e.data + 'T12:00:00').toLocaleDateString('pt-BR')
          const cats = e.categorias ? e.categorias.split(',').map(c => c.trim()) : []
          return (
            <div key={e.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex gap-4">
              {/* Número */}
              <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex flex-col items-center justify-center border border-indigo-100 dark:border-indigo-800">
                <span className="text-xs text-indigo-500 font-medium">Nº</span>
                <span className="text-xl font-bold text-indigo-700 dark:text-indigo-300 leading-tight">{e.numero}</span>
                <span className="text-xs text-indigo-400">{e.edicao === 'EXTRAORDINARIA' ? 'EXTRA' : ''}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar size={11} /> {dataFmt}
                  </span>
                  {e.secretaria && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full">
                      {e.secretaria}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mt-1 text-sm">{e.titulo}</h3>
                {e.sumario && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{e.sumario}</p>
                )}
                {cats.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {cats.map(c => (
                      <span key={c} className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="flex-shrink-0 flex flex-col gap-2 items-end justify-center">
                {e.status === 'RASCUNHO' && (
                  <button
                    onClick={() => publicar(e.id)}
                    className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
                  >
                    <CheckCircle2 size={12} /> Publicar
                  </button>
                )}
                <Link
                  href={`/gestao/dom/${e.id}`}
                  className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1"
                >
                  <Eye size={12} /> Ver
                </Link>
                {e.pdfUrl && (
                  <a
                    href={e.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1"
                  >
                    <Download size={12} /> PDF
                  </a>
                )}
              </div>
            </div>
          )
        })}

        {edicoes.length === 0 && !loading && (
          <div className="text-center py-16 text-gray-400">
            <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
            <p>Nenhuma edição encontrada para {anoSel}</p>
          </div>
        )}
      </div>

      {/* Modal nova edição */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Nova Edição do DOM</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Número *</label>
                <input
                  type="number"
                  value={form.numero}
                  onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="23"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Data *</label>
                <input
                  type="date"
                  value={form.data}
                  onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Tipo de Edição</label>
                <select
                  value={form.edicao}
                  onChange={e => setForm(f => ({ ...f, edicao: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none"
                >
                  <option value="ORDINARIA">Ordinária</option>
                  <option value="EXTRAORDINARIA">Extraordinária</option>
                  <option value="SUPLEMENTO">Suplemento</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Secretaria</label>
                <input
                  value={form.secretaria}
                  onChange={e => setForm(f => ({ ...f, secretaria: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="GABINETE"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Título *</label>
                <input
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Diário Oficial nº 023/2026"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Sumário (índice dos atos)</label>
                <input
                  value={form.sumario}
                  onChange={e => setForm(f => ({ ...f, sumario: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Decreto 008/2026 - ...; Portaria 014/2026 - ..."
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Categorias (separadas por vírgula)</label>
                <input
                  value={form.categorias}
                  onChange={e => setForm(f => ({ ...f, categorias: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Decreto, Portaria, Licitação"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Conteúdo completo * <span className="text-xs text-gray-400">(aceita HTML)</span>
                </label>
                <textarea
                  value={form.conteudo}
                  onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
                  rows={8}
                  className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  placeholder="<h2>DECRETOS</h2>&#10;<p><b>DECRETO Nº 008/2026</b> — ...</p>"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalAberto(false)}
                className="flex-1 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                disabled={salvando}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {salvando && <Loader2 size={14} className="animate-spin" />}
                Salvar como Rascunho
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
