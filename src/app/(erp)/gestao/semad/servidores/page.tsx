'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search, Plus, Filter, ChevronRight, X, User, Briefcase,
  Phone, Mail, Building2, Calendar, FileText, Shield,
  CheckCircle, XCircle, Clock, AlertCircle,
  CreditCard, Hash, Loader2,
} from 'lucide-react'

interface Cargo { id: string; nome: string; simbolo?: string }

interface Servidor {
  id: string
  matricula: string
  nome: string
  cpf?: string
  dataNascimento?: string
  dataAdmissao?: string
  vinculo?: string
  situacao: string
  cargo?: Cargo
  cargoId?: string
  salarioBase?: number
  email?: string
  celular?: string
  bairro?: string
  pcd?: boolean
  observacoes?: string
  lotacoes?: { secretaria: string; setor?: string; funcao?: string; ativo: boolean }[]
}

const SITUACAO_COR: Record<string, string> = {
  ATIVO:       'bg-green-100 text-green-700',
  FERIAS:      'bg-yellow-100 text-yellow-700',
  AFASTADO:    'bg-orange-100 text-orange-700',
  EXONERADO:   'bg-red-100 text-red-700',
  APOSENTADO:  'bg-gray-100 text-gray-600',
}

const VINCULO_LABEL: Record<string, string> = {
  EFETIVO: 'Efetivo', COMISSIONADO: 'Comissionado', CONTRATADO: 'Contratado',
  ESTAGIARIO: 'Estagiário', CEDIDO: 'Cedido',
}

export default function ServidoresPage() {
  const [servidores, setServidores] = useState<Servidor[]>([])
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [situacaoFiltro, setSituacaoFiltro] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [detalhe, setDetalhe] = useState<Servidor | null>(null)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nome: '', matricula: '', cpf: '', cargoId: '', vinculo: 'EFETIVO', salarioBase: '', dataAdmissao: '', email: '', celular: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const LIMIT = 20

  const carregar = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
    if (q.length >= 3) params.set('q', q)
    if (situacaoFiltro) params.set('situacao', situacaoFiltro)
    fetch(`/api/semad/servidores?${params}`)
      .then(r => r.json())
      .then(d => {
        setServidores(d.servidores ?? [])
        setTotal(d.total ?? 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [page, q, situacaoFiltro])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    fetch('/api/semad/cargos')
      .then(r => r.json())
      .then(d => setCargos(d.cargos ?? []))
      .catch(() => {})
  }, [])

  const verDetalhe = async (id: string) => {
    const r = await fetch(`/api/semad/servidores?id=${id}`)
    const d = await r.json()
    setDetalhe(d.servidor ?? null)
  }

  const salvar = async () => {
    if (!form.nome.trim() || !form.matricula || !form.cargoId)
      return setErro('Nome, matrícula e cargo são obrigatórios')
    setSalvando(true); setErro('')
    const r = await fetch('/api/semad/servidores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        salarioBase: form.salarioBase ? Number(form.salarioBase) : undefined,
        cpf: form.cpf.replace(/\D/g, ''),
      }),
    })
    const d = await r.json()
    setSalvando(false)
    if (!r.ok) return setErro(d.erro ?? 'Erro ao salvar')
    setModal(false)
    setForm({ nome: '', matricula: '', cpf: '', cargoId: '', vinculo: 'EFETIVO', salarioBase: '', dataAdmissao: '', email: '', celular: '' })
    carregar()
  }

  const fmtData = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'
  const fmtMoeda = (v?: number) => v ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Servidores</h1>
          <p className="text-gray-500 mt-1">{total > 0 ? `${total} servidores cadastrados` : 'Nenhum servidor'}</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> Novo Servidor
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Buscar por nome, matrícula ou CPF..."
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }}
          />
        </div>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          value={situacaoFiltro}
          onChange={e => { setSituacaoFiltro(e.target.value); setPage(1) }}
        >
          <option value="">Todas as situações</option>
          <option value="ATIVO">Ativo</option>
          <option value="FERIAS">Férias</option>
          <option value="AFASTADO">Afastado</option>
          <option value="EXONERADO">Exonerado</option>
          <option value="APOSENTADO">Aposentado</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="animate-spin w-6 h-6 text-blue-600" />
          </div>
        ) : servidores.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <User className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Nenhum servidor encontrado</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Matrícula</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cargo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vínculo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Situação</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {servidores.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => verDetalhe(s.id)}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.matricula}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{s.nome}</td>
                  <td className="px-4 py-3 text-gray-600">{(s as any).cargoNome ?? s.cargo?.nome ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{VINCULO_LABEL[s.vinculo ?? ''] ?? s.vinculo ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SITUACAO_COR[s.situacao] ?? 'bg-gray-100 text-gray-600'}`}>
                      {s.situacao}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm">
            <span className="text-gray-500">Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">Anterior</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50">Próximo</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal detalhe */}
      {detalhe && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetalhe(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 text-lg">{detalhe.nome}</h2>
              <button onClick={() => setDetalhe(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-500">Matrícula</span><div className="font-medium font-mono">{detalhe.matricula}</div></div>
                <div><span className="text-gray-500">Situação</span>
                  <div><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SITUACAO_COR[detalhe.situacao] ?? ''}`}>{detalhe.situacao}</span></div>
                </div>
                <div><span className="text-gray-500">Cargo</span><div className="font-medium">{(detalhe as any).cargoNome ?? detalhe.cargo?.nome ?? '—'}</div></div>
                <div><span className="text-gray-500">Vínculo</span><div className="font-medium">{VINCULO_LABEL[detalhe.vinculo ?? ''] ?? '—'}</div></div>
                <div><span className="text-gray-500">Salário Base</span><div className="font-medium">{fmtMoeda(detalhe.salarioBase)}</div></div>
                <div><span className="text-gray-500">Admissão</span><div className="font-medium">{fmtData(detalhe.dataAdmissao)}</div></div>
                {detalhe.email && <div className="col-span-2"><span className="text-gray-500">E-mail</span><div className="font-medium">{detalhe.email}</div></div>}
                {detalhe.celular && <div><span className="text-gray-500">Celular</span><div className="font-medium">{detalhe.celular}</div></div>}
                {detalhe.bairro && <div><span className="text-gray-500">Bairro</span><div className="font-medium">{detalhe.bairro}</div></div>}
              </div>
              {(detalhe as any).lotacoes?.length > 0 && (
                <div>
                  <div className="text-gray-500 mb-1">Lotação Atual</div>
                  {(detalhe as any).lotacoes.filter((l: any) => l.ativo).map((l: any, i: number) => (
                    <div key={i} className="text-sm font-medium text-gray-800">{l.secretaria}{l.setor ? ` / ${l.setor}` : ''}{l.funcao ? ` — ${l.funcao}` : ''}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal novo servidor */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Novo Servidor</h2>
              <button onClick={() => setModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              {erro && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{erro}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Nome Completo *</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Matrícula *</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={form.matricula} onChange={e => setForm(f => ({ ...f, matricula: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">CPF</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="000.000.000-00" value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Cargo *</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={form.cargoId} onChange={e => setForm(f => ({ ...f, cargoId: e.target.value }))}>
                    <option value="">Selecionar...</option>
                    {cargos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Vínculo</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={form.vinculo} onChange={e => setForm(f => ({ ...f, vinculo: e.target.value }))}>
                    <option value="EFETIVO">Efetivo</option>
                    <option value="COMISSIONADO">Comissionado</option>
                    <option value="CONTRATADO">Contratado</option>
                    <option value="ESTAGIARIO">Estagiário</option>
                    <option value="CEDIDO">Cedido</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Salário Base (R$)</label>
                  <input type="number" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={form.salarioBase} onChange={e => setForm(f => ({ ...f, salarioBase: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Data de Admissão</label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={form.dataAdmissao} onChange={e => setForm(f => ({ ...f, dataAdmissao: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">E-mail</label>
                  <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Celular</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={form.celular} onChange={e => setForm(f => ({ ...f, celular: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={salvar} disabled={salvando}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
                  Cadastrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
