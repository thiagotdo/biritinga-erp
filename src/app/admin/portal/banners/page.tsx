'use client'

import { useState, useEffect } from 'react'
import {
  ImageIcon, Plus, Trash2, Edit2, ArrowUp, ArrowDown,
  Eye, EyeOff, Loader2, AlertCircle, ExternalLink, Upload,
  CheckCircle2, Globe,
} from 'lucide-react'
import Image from 'next/image'

interface Banner {
  id: string
  titulo: string
  subtitulo: string | null
  descricao: string | null
  imageUrl: string
  linkUrl: string | null
  linkTexto: string | null
  ordem: number
  ativo: boolean | number
}

const EMPTY_FORM = {
  titulo: '',
  subtitulo: '',
  descricao: '',
  imageUrl: '',
  linkUrl: '',
  linkTexto: '',
  ordem: 99,
}

const ERP_URL = 'https://erp.biritinga.ba.gov.br'

export default function BannersPortalPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Banner | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  function carregar() {
    setLoading(true)
    fetch('/api/admin/banners?ativo=false')
      .then(r => r.json())
      .then(d => { setBanners(d.banners ?? []); setLoading(false) })
      .catch(e => { setErro(e.message); setLoading(false) })
  }

  useEffect(() => { carregar() }, [])

  function abrirNovo() {
    setEditando(null)
    setForm({ ...EMPTY_FORM })
    setModalAberto(true)
  }

  function abrirEdicao(b: Banner) {
    setEditando(b)
    setForm({
      titulo: b.titulo,
      subtitulo: b.subtitulo ?? '',
      descricao: b.descricao ?? '',
      imageUrl: b.imageUrl,
      linkUrl: b.linkUrl ?? '',
      linkTexto: b.linkTexto ?? '',
      ordem: b.ordem,
    })
    setModalAberto(true)
  }

  async function handleSalvar() {
    if (!form.titulo || !form.imageUrl) {
      alert('Preencha o título e a URL da imagem')
      return
    }
    setSalvando(true)
    try {
      const payload = {
        titulo: form.titulo,
        subtitulo: form.subtitulo || null,
        descricao: form.descricao || null,
        imageUrl: form.imageUrl,
        linkUrl: form.linkUrl || null,
        linkTexto: form.linkTexto || null,
        ordem: Number(form.ordem),
      }
      const r = editando
        ? await fetch('/api/admin/banners', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editando.id, ...payload }),
          })
        : await fetch('/api/admin/banners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      const d = await r.json()
      if (!r.ok) throw new Error(d.erro || 'Erro ao salvar')
      setModalAberto(false)
      setMsg(editando ? 'Banner atualizado!' : 'Banner criado!')
      setTimeout(() => setMsg(null), 3000)
      carregar()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSalvando(false)
    }
  }

  async function toggleAtivo(b: Banner) {
    await fetch('/api/admin/banners', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: b.id, ativo: !b.ativo }),
    })
    carregar()
  }

  async function moverOrdem(b: Banner, dir: 'up' | 'down') {
    const novaOrdem = dir === 'up' ? Math.max(0, b.ordem - 1) : b.ordem + 1
    await fetch('/api/admin/banners', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: b.id, ordem: novaOrdem }),
    })
    carregar()
  }

  async function remover(b: Banner) {
    if (!confirm(`Remover banner "${b.titulo}"?`)) return
    await fetch(`/api/admin/banners?id=${b.id}`, { method: 'DELETE' })
    carregar()
  }

  function resolveImg(url: string) {
    if (!url) return ''
    if (url.startsWith('http')) return url
    return `${ERP_URL}${url}`
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-indigo-600" size={36} />
    </div>
  )

  if (erro) return (
    <div className="flex items-center gap-3 text-red-600 p-8">
      <AlertCircle size={20} />
      <span>Erro: {erro}</span>
    </div>
  )

  const ativos = banners.filter(b => b.ativo)
  const inativos = banners.filter(b => !b.ativo)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ImageIcon size={28} className="text-indigo-600" />
            Carrossel do Portal Público
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie as imagens exibidas no banner da página inicial do portal
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://biritinga.ba.gov.br"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 border border-indigo-200 rounded-lg px-3 py-2"
          >
            <Globe size={14} />
            Ver Portal
            <ExternalLink size={12} />
          </a>
          <button
            onClick={abrirNovo}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            <Plus size={16} />
            Novo Banner
          </button>
        </div>
      </div>

      {/* Toast */}
      {msg && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">
          <CheckCircle2 size={16} />
          {msg}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total de Banners', valor: banners.length, cor: 'indigo' },
          { label: 'Ativos no Portal', valor: ativos.length, cor: 'green' },
          { label: 'Inativos', valor: inativos.length, cor: 'gray' },
        ].map(k => (
          <div key={k.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">{k.label}</p>
            <p className={`text-3xl font-bold mt-1 text-${k.cor}-600`}>{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Preview do carrossel */}
      {ativos.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Preview — banner atual no portal
          </h2>
          <div className="relative rounded-lg overflow-hidden h-48 bg-gray-900">
            <img
              src={resolveImg(ativos[0].imageUrl)}
              alt={ativos[0].titulo}
              className="w-full h-full object-cover opacity-80"
              onError={(e: any) => { e.target.style.display = 'none' }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex flex-col justify-end p-6">
              <p className="text-white font-bold text-xl">{ativos[0].titulo}</p>
              {ativos[0].subtitulo && (
                <p className="text-gray-200 text-sm mt-1">{ativos[0].subtitulo}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lista de banners ativos */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <Eye size={15} className="text-green-500" /> Banners ativos ({ativos.length})
        </h2>
        <div className="space-y-3">
          {ativos.map((b, i) => (
            <BannerCard
              key={b.id}
              banner={b}
              isFirst={i === 0}
              isLast={i === ativos.length - 1}
              onEdit={() => abrirEdicao(b)}
              onToggle={() => toggleAtivo(b)}
              onMover={(dir) => moverOrdem(b, dir)}
              onRemover={() => remover(b)}
              resolveImg={resolveImg}
            />
          ))}
          {ativos.length === 0 && (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              <ImageIcon size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum banner ativo. Crie ou ative um banner.</p>
            </div>
          )}
        </div>
      </div>

      {/* Banners inativos */}
      {inativos.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
            <EyeOff size={15} /> Inativos ({inativos.length})
          </h2>
          <div className="space-y-3 opacity-60">
            {inativos.map((b) => (
              <BannerCard
                key={b.id}
                banner={b}
                isFirst={false}
                isLast={false}
                onEdit={() => abrirEdicao(b)}
                onToggle={() => toggleAtivo(b)}
                onMover={() => {}}
                onRemover={() => remover(b)}
                resolveImg={resolveImg}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              {editando ? 'Editar Banner' : 'Novo Banner'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Título *</label>
                <input
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Bem-vindo a Biritinga"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Subtítulo</label>
                <input
                  value={form.subtitulo}
                  onChange={e => setForm(f => ({ ...f, subtitulo: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Uma cidade que cresce com você"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  URL da Imagem *
                </label>
                <input
                  value={form.imageUrl}
                  onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  placeholder="/banner-vista-aerea.jpg ou https://..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  Use /nome-arquivo.jpg para imagens na pasta public/ do ERP
                </p>
                {form.imageUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden h-24 bg-gray-100 dark:bg-gray-700">
                    <img
                      src={resolveImg(form.imageUrl)}
                      alt="preview"
                      className="w-full h-full object-cover"
                      onError={(e: any) => { e.target.style.opacity = '0.3' }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Link (opcional)</label>
                <input
                  value={form.linkUrl}
                  onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://biritinga.ba.gov.br/..."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Texto do botão</label>
                <input
                  value={form.linkTexto}
                  onChange={e => setForm(f => ({ ...f, linkTexto: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Saiba mais"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Ordem</label>
                <input
                  type="number"
                  value={form.ordem}
                  onChange={e => setForm(f => ({ ...f, ordem: Number(e.target.value) }))}
                  className="mt-1 w-24 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  min={0}
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
                {editando ? 'Atualizar' : 'Criar Banner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BannerCard({
  banner, isFirst, isLast, onEdit, onToggle, onMover, onRemover, resolveImg
}: {
  banner: Banner
  isFirst: boolean
  isLast: boolean
  onEdit: () => void
  onToggle: () => void
  onMover: (dir: 'up' | 'down') => void
  onRemover: () => void
  resolveImg: (url: string) => string
}) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border ${banner.ativo ? 'border-gray-100 dark:border-gray-700' : 'border-dashed border-gray-200 dark:border-gray-600'} shadow-sm overflow-hidden`}>
      <div className="flex gap-0">
        {/* Thumbnail */}
        <div className="w-28 h-20 flex-shrink-0 bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
          {banner.imageUrl ? (
            <img
              src={resolveImg(banner.imageUrl)}
              alt={banner.titulo}
              className="w-full h-full object-cover"
              onError={(e: any) => { e.target.style.display = 'none' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon size={24} className="text-gray-300" />
            </div>
          )}
          {/* Badge de ordem */}
          <span className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
            #{banner.ordem}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{banner.titulo}</p>
              {banner.subtitulo && (
                <p className="text-xs text-gray-500 truncate mt-0.5">{banner.subtitulo}</p>
              )}
              {banner.linkUrl && (
                <p className="text-xs text-indigo-500 truncate mt-0.5 flex items-center gap-1">
                  <ExternalLink size={10} />
                  {banner.linkUrl}
                </p>
              )}
            </div>
            {/* Ações */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => onMover('up')} disabled={isFirst} title="Subir"
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 text-gray-400">
                <ArrowUp size={14} />
              </button>
              <button onClick={() => onMover('down')} disabled={isLast} title="Descer"
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 text-gray-400">
                <ArrowDown size={14} />
              </button>
              <button onClick={onEdit} title="Editar"
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600">
                <Edit2 size={14} />
              </button>
              <button onClick={onToggle} title={banner.ativo ? 'Desativar' : 'Ativar'}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                {banner.ativo
                  ? <Eye size={14} className="text-green-500" />
                  : <EyeOff size={14} className="text-gray-400" />}
              </button>
              <button onClick={onRemover} title="Remover"
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
