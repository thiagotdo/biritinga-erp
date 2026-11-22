'use client'
import { useState, useEffect, useCallback } from 'react'
import { Users, Plus, Search, ChevronLeft, ChevronRight, X, Heart, BookOpen } from 'lucide-react'

type Aluno = {
  id: string; nome: string; cpf: string
  dataNascimento: string; sexo: string
  nee: boolean | number; ativo: boolean | number
  responsavel: string; telefoneResponsavel: string
  bairro: string
}

function idade(dn: string) {
  if (!dn) return '—'
  const d = new Date(dn), hoje = new Date()
  let anos = hoje.getFullYear() - d.getFullYear()
  if (hoje.getMonth() < d.getMonth() || (hoje.getMonth() === d.getMonth() && hoje.getDate() < d.getDate())) anos--
  return `${anos} anos`
}

function ModalAluno({ onSalvar, onClose }: { onSalvar: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    nome: '', nomeMae: '', nomePai: '', cpf: '',
    dataNascimento: '', sexo: '', zona: 'URBANA',
    logradouro: '', bairro: '',
    responsavel: '', telefoneResponsavel: '',
    nee: false, laudoNEE: '',
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Novo Aluno</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs font-medium text-gray-600">Nome completo *</label>
            <input value={form.nome} onChange={e => set('nome', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">CPF</label>
              <input value={form.cpf} onChange={e => set('cpf', e.target.value)}
                placeholder="000.000.000-00"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">NIS (Bolsa Família)</label>
              <input value={form.nis} onChange={e => set('nis', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600">Data de Nascimento</label>
              <input type="date" value={form.dataNascimento} onChange={e => set('dataNascimento', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Sexo</label>
              <select value={form.sexo} onChange={e => set('sexo', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none">
                <option value="">—</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Nome da Mãe</label>
              <input value={form.nomeMae} onChange={e => set('nomeMae', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Nome do Pai</label>
              <input value={form.nomePai} onChange={e => set('nomePai', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Responsável</label>
              <input value={form.responsavelNome} onChange={e => set('responsavelNome', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Telefone Responsável</label>
              <input value={form.responsavelTelefone} onChange={e => set('responsavelTelefone', e.target.value)}
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
              <label className="text-xs font-medium text-gray-600">CEP</label>
              <input value={form.cep} onChange={e => set('cep', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.nee} onChange={e => set('nee', e.target.checked)}
                className="rounded" />
              <span className="text-sm text-gray-700">NEE (Necessidades Educacionais Especiais)</span>
            </label>
          </div>
          {form.nee && (
            <div>
              <label className="text-xs font-medium text-gray-600">Laudo / CID</label>
              <input value={form.laudoNEE} onChange={e => set('laudoNEE', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
            </div>
          )}
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancelar</button>
          <button
            onClick={() => { if (form.nome) onSalvar(form) }}
            disabled={!form.nome}
            className="px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ background: 'var(--cor-primaria)' }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AlunosPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(false)
  const [page, setPage] = useState(1)
  const [buscado, setBuscado] = useState(false)
  const PER = 20

  const buscar = useCallback(async (termo: string) => {
    if (!termo || termo.length < 3) return
    setLoading(true); setErro(''); setBuscado(true)
    try {
      const r = await fetch(`/api/educacao/aluno?busca=${encodeURIComponent(termo)}`)
      const d = await r.json()
      if (d.erro) throw new Error(d.erro)
      setAlunos(d.alunos ?? [])
      setPage(1)
    } catch (e: any) { setErro(e.message) }
    finally { setLoading(false) }
  }, [])

  const paged = alunos.slice((page - 1) * PER, page * PER)
  const pages = Math.ceil(alunos.length / PER)

  async function salvar(dados: any) {
    try {
      const r = await fetch('/api/educacao/aluno', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      })
      const d = await r.json()
      if (d.erro) throw new Error(d.erro)
      setModal(false)
      if (q) buscar(q)
    } catch (e: any) { alert(e.message) }
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      {modal && <ModalAluno onSalvar={salvar} onClose={() => setModal(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <a href="/gestao/educacao" className="hover:underline">Educação</a>
            <span>›</span><span>Alunos</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Alunos</h1>
          <p className="text-sm text-gray-500">
            {buscado ? `${alunos.length} resultado(s)` : 'Busque por nome ou CPF'}
          </p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm"
          style={{ background: 'var(--cor-primaria)' }}
        >
          <Plus size={16} /> Novo Aluno
        </button>
      </div>

      {/* Busca */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscar(q)}
            placeholder="Buscar por nome ou CPF (mín. 3 caracteres)..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button
          onClick={() => buscar(q)}
          disabled={q.length < 3}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-40"
          style={{ background: 'var(--cor-primaria)' }}
        >
          Buscar
        </button>
      </div>

      {erro && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{erro}</div>}

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Buscando...</div>
        ) : !buscado ? (
          <div className="py-16 text-center">
            <Users size={32} className="mx-auto text-gray-300 mb-2" strokeWidth={1.5} />
            <p className="text-gray-400 text-sm">Digite pelo menos 3 caracteres e pressione Buscar</p>
          </div>
        ) : !paged.length ? (
          <div className="py-16 text-center">
            <Users size={32} className="mx-auto text-gray-300 mb-2" strokeWidth={1.5} />
            <p className="text-gray-400 text-sm">Nenhum aluno encontrado</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Idade</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Responsável</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Situação</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{a.nome}</p>
                    {a.cpf && <p className="text-xs text-gray-400">CPF: {a.cpf}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{idade(a.dataNascimento)}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-gray-700 text-xs">{a.responsavel ?? '—'}</p>
                    {a.telefoneResponsavel && <p className="text-gray-400 text-xs">{a.telefoneResponsavel}</p>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      a.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>{a.ativo ? 'ATIVO' : 'INATIVO'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-center">
                      {(a.nee === 1 || a.nee === true) && (
                        <span title="NEE" className="p-1 rounded bg-purple-50"><Heart size={12} className="text-purple-600" /></span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{alunos.length} resultados</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              <ChevronLeft size={14} />
            </button>
            <span className="px-2">{page} / {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
