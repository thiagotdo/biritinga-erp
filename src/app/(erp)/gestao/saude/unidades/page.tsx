'use client'
import { useState, useEffect, useCallback } from 'react'
import { Building2, Plus, Search, X, Phone, Mail, User } from 'lucide-react'

type Unidade = {
  id: string; nome: string; tipo: string; cnes: string
  bairro: string; telefone: string; responsavel: string
  totalProfissionais: number; ativo: number
}

const TIPO_LABEL: Record<string, string> = {
  UBS: 'UBS', CAPS: 'CAPS', CEO: 'CEO', HOSPITAL: 'Hospital',
  LABORATORIO: 'Laboratório', OUTRO: 'Outro',
}
const TIPO_COR: Record<string, string> = {
  UBS: 'bg-blue-50 text-blue-700', CAPS: 'bg-purple-50 text-purple-700',
  HOSPITAL: 'bg-red-50 text-red-700', CEO: 'bg-green-50 text-green-700',
  LABORATORIO: 'bg-cyan-50 text-cyan-700', OUTRO: 'bg-gray-50 text-gray-600',
}

function ModalUnidade({ onSalvar, onClose }: { onSalvar: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    nome: '', tipo: 'UBS', cnes: '', bairro: '', logradouro: '',
    numero: '', cep: '', telefone: '', email: '', responsavel: '', horario: '',
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Nova Unidade de Saúde</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs font-medium text-gray-600">Nome *</label>
            <input value={form.nome} onChange={e => set('nome', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Tipo</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none">
                {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Código CNES</label>
              <input value={form.cnes} onChange={e => set('cnes', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Responsável</label>
            <input value={form.responsavel} onChange={e => set('responsavel', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Telefone</label>
              <input value={form.telefone} onChange={e => set('telefone', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">E-mail</label>
              <input value={form.email} onChange={e => set('email', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Bairro</label>
              <input value={form.bairro} onChange={e => set('bairro', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Horário</label>
              <input value={form.horario} onChange={e => set('horario', e.target.value)}
                placeholder="Ex: Seg–Sex 7h–17h"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancelar</button>
          <button
            onClick={() => { if (form.nome) onSalvar(form) }}
            disabled={!form.nome}
            className="px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 bg-red-600 hover:bg-red-700"
          >Salvar</button>
        </div>
      </div>
    </div>
  )
}

export default function UnidadesSaudePage() {
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true); setErro('')
    try {
      const r = await fetch('/api/saude/unidade')
      const d = await r.json()
      if (d.erro) throw new Error(d.erro)
      setUnidades(d.unidades ?? [])
    } catch (e: any) { setErro(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const filtradas = unidades.filter(u =>
    !q || u.nome.toLowerCase().includes(q.toLowerCase()) ||
    (u.bairro ?? '').toLowerCase().includes(q.toLowerCase()) ||
    (u.cnes ?? '').includes(q)
  )

  async function salvar(dados: any) {
    try {
      const r = await fetch('/api/saude/unidade', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      })
      const d = await r.json()
      if (d.erro) throw new Error(d.erro)
      setModal(false); carregar()
    } catch (e: any) { alert(e.message) }
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      {modal && <ModalUnidade onSalvar={salvar} onClose={() => setModal(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <a href="/gestao/saude" className="hover:underline">Saúde</a>
            <span>›</span><span>Unidades</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Unidades de Saúde</h1>
          <p className="text-sm text-gray-500">{filtradas.length} unidade(s)</p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm bg-red-600 hover:bg-red-700"
        >
          <Plus size={16} /> Nova Unidade
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nome, bairro ou CNES..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
      </div>

      {erro && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{erro}</div>}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Carregando...</div>
        ) : !filtradas.length ? (
          <div className="py-16 text-center">
            <Building2 size={32} className="mx-auto text-gray-300 mb-2" strokeWidth={1.5} />
            <p className="text-gray-400 text-sm">Nenhuma unidade cadastrada</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtradas.map(u => (
              <div key={u.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_COR[u.tipo] ?? 'bg-gray-50 text-gray-600'}`}>
                        {TIPO_LABEL[u.tipo] ?? u.tipo}
                      </span>
                      {u.cnes && <span className="text-xs text-gray-400">CNES: {u.cnes}</span>}
                      {!u.ativo && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">Inativa</span>}
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{u.nome}</p>
                    {u.bairro && <p className="text-xs text-gray-500">{u.bairro}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-gray-900">{u.totalProfissionais ?? 0}</p>
                    <p className="text-xs text-gray-400">profissionais</p>
                  </div>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  {u.responsavel && (
                    <span className="flex items-center gap-1"><User size={11} />{u.responsavel}</span>
                  )}
                  {u.telefone && (
                    <span className="flex items-center gap-1"><Phone size={11} />{u.telefone}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
