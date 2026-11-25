'use client'

import { useState, useEffect } from 'react'
import {
  Building2, Users, Plus, Search, ChevronRight,
  Wallet, GraduationCap, Stethoscope, HardHat, Car,
  Megaphone, Leaf, Heart, Trophy, Scale, ShieldCheck,
  FolderOpen, Package, Edit2, CheckCircle2, XCircle,
  Loader2, AlertCircle, BarChart3,
} from 'lucide-react'
import Link from 'next/link'

interface Secretaria {
  id: string
  nome: string
  sigla: string
  descricao: string | null
  cor: string
  icone: string
  ativo: boolean | number
  ordem: number
  totalServidores: number
}

interface PageData {
  secretarias: Secretaria[]
  stats: { totalSecretarias: number; ativas: number; inativas: number }
  servidoresPorSecretaria: { secretaria: string; total: number }[]
}

const ICON_MAP: Record<string, any> = {
  Building2, Wallet, GraduationCap, Stethoscope, HardHat, Car,
  Megaphone, Leaf, Heart, Trophy, Scale, ShieldCheck,
  FolderOpen, Package, Users, BarChart3,
}

// Mapa de módulos ERP para cada secretaria
const MODULOS: Record<string, { label: string; href: string }[]> = {
  SEMAD:    [{ label: 'Servidores', href: '/gestao/semad/servidores' }, { label: 'Folha', href: '/gestao/folha' }],
  SEFIN:    [{ label: 'Finanças', href: '/gestao/sefin' }, { label: 'Licitações', href: '/gestao/licitacoes' }],
  SEMSA:    [{ label: 'Saúde', href: '/gestao/saude' }, { label: 'ESF', href: '/gestao/saude/esf' }],
  SEDUC:    [{ label: 'Educação', href: '/gestao/educacao' }, { label: 'Escolas', href: '/gestao/educacao/escolas' }],
  SEMOSP:   [{ label: 'Obras', href: '/gestao/obras' }],
  SECOM:    [{ label: 'Comunicação', href: '/gestao/comunicacao/noticias' }, { label: 'Agenda', href: '/gestao/comunicacao/agenda' }],
  SEFROTA:  [{ label: 'Frota', href: '/gestao/frota' }],
  SEMMA:    [{ label: 'Meio Ambiente', href: '/gestao/semma' }],
  SEMAS:    [{ label: 'Assistência', href: '/gestao/assistencia' }],
  SEESPT:   [{ label: 'Esporte', href: '/gestao/esporte' }],
  PROCURAD: [{ label: 'Jurídico', href: '/gestao/juridico' }],
  CONTROLE: [{ label: 'Auditoria', href: '/gestao/auditoria' }],
  GABINETE: [{ label: 'Painel', href: '/admin' }],
}

function IconeSecretaria({ icone, cor, size = 20 }: { icone: string; cor: string; size?: number }) {
  const Ico = ICON_MAP[icone] ?? Building2
  return (
    <div
      className="flex items-center justify-center rounded-xl"
      style={{ width: size + 16, height: size + 16, backgroundColor: cor + '22', color: cor }}
    >
      <Ico size={size} />
    </div>
  )
}

export default function SecretariasPage() {
  const [data, setData] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState({ nome: '', sigla: '', descricao: '', cor: '#4f46e5', icone: 'Building2' })
  const [salvando, setSalvando] = useState(false)

  function carregar() {
    setLoading(true)
    fetch('/api/admin/secretarias')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setErro(e.message); setLoading(false) })
  }

  useEffect(() => { carregar() }, [])

  async function handleSalvar() {
    setSalvando(true)
    try {
      const r = await fetch('/api/admin/secretarias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.erro || 'Erro ao salvar')
      setModalAberto(false)
      setForm({ nome: '', sigla: '', descricao: '', cor: '#4f46e5', icone: 'Building2' })
      carregar()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSalvando(false)
    }
  }

  async function toggleAtivo(sec: Secretaria) {
    await fetch('/api/admin/secretarias', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sec.id, ativo: !sec.ativo }),
    })
    carregar()
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
  if (!data) return null

  const { secretarias, stats } = data
  const filtradas = secretarias.filter(s =>
    !busca || s.nome.toLowerCase().includes(busca.toLowerCase()) || s.sigla.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 size={28} className="text-indigo-600" />
            Secretarias Municipais
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gestão das secretarias e órgãos da prefeitura</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          <Plus size={16} />
          Nova Secretaria
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total de Secretarias', valor: stats.totalSecretarias, cor: 'indigo' },
          { label: 'Ativas', valor: stats.ativas, cor: 'green' },
          { label: 'Inativas', valor: stats.inativas, cor: 'gray' },
        ].map(k => (
          <div key={k.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">{k.label}</p>
            <p className={`text-3xl font-bold mt-1 text-${k.cor}-600`}>{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar secretaria..."
          className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>

      {/* Grid de secretarias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtradas.map(sec => {
          const modulos = MODULOS[sec.sigla] ?? []
          return (
            <div
              key={sec.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-5 transition-all ${
                sec.ativo ? 'border-gray-100 dark:border-gray-700' : 'border-dashed border-gray-200 dark:border-gray-600 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <IconeSecretaria icone={sec.icone} cor={sec.cor} size={22} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: sec.cor }}
                      >
                        {sec.sigla}
                      </span>
                      {!sec.ativo && (
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full">
                          Inativa
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mt-1 text-sm leading-tight">
                      {sec.nome}
                    </h3>
                    {sec.descricao && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{sec.descricao}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleAtivo(sec)}
                  title={sec.ativo ? 'Desativar' : 'Ativar'}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded"
                >
                  {sec.ativo
                    ? <CheckCircle2 size={18} className="text-green-500" />
                    : <XCircle size={18} />}
                </button>
              </div>

              {/* Contador de servidores */}
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  {Number(sec.totalServidores)} servidores em lotação
                </span>
              </div>

              {/* Módulos vinculados */}
              {modulos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {modulos.map(m => (
                    <Link
                      key={m.href}
                      href={m.href}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-600 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      {m.label}
                      <ChevronRight size={10} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filtradas.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Building2 size={48} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma secretaria encontrada</p>
        </div>
      )}

      {/* Modal nova secretaria */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Nova Secretaria</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Nome *</label>
                <input
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Secretaria Municipal de..."
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Sigla *</label>
                <input
                  value={form.sigla}
                  onChange={e => setForm(f => ({ ...f, sigla: e.target.value.toUpperCase() }))}
                  className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="SEMAD"
                  maxLength={15}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                  placeholder="Atribuições desta secretaria..."
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Cor</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={form.cor}
                    onChange={e => setForm(f => ({ ...f, cor: e.target.value }))}
                    className="w-10 h-10 rounded cursor-pointer border border-gray-200"
                  />
                  <span className="text-sm text-gray-500">{form.cor}</span>
                </div>
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
                disabled={salvando || !form.nome || !form.sigla}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {salvando && <Loader2 size={14} className="animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
