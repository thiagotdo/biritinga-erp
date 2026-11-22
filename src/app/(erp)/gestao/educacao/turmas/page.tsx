'use client'
import { useState, useEffect } from 'react'
import { BookOpen, Plus, Users, ChevronRight } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Escola = { id: string; nome: string; zona: string }
type Turma = {
  id: string; codigo: string; etapa: string; serie: string | null; turno: string
  ano: number; capacidade: number; escolaNome: string
  totalMatriculas: number; vagasDisponiveis: number; lotado: boolean
  _count: { matriculas: number }
}
type AlunoMatriculado = {
  matriculaId: string; numeroChamada: number | null; situacao: string
  alunoId: string; nome: string; nee: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TURNO_LABEL: Record<string, string> = {
  MATUTINO: 'Matutino', VESPERTINO: 'Vespertino', NOTURNO: 'Noturno', INTEGRAL: 'Integral',
}
const ETAPA_LABEL: Record<string, string> = {
  CRECHE: 'Creche', PRE_ESCOLA: 'Pré-Escola',
  FUNDAMENTAL_I: 'Fund. I', FUNDAMENTAL_II: 'Fund. II',
  EJA_FUNDAMENTAL: 'EJA Fund.', EJA_MEDIO: 'EJA Médio', AEE: 'AEE',
}

// ─── Modal Nova Turma ─────────────────────────────────────────────────────────
function ModalTurma({ escolas, onSalvar, onClose }: {
  escolas: Escola[]; onSalvar: (d: any) => void; onClose: () => void
}) {
  const [form, setForm] = useState({
    escolaId: '', codigo: '', etapa: 'FUNDAMENTAL_I', serie: '',
    turno: 'MATUTINO', ano: new Date().getFullYear(), capacidade: 30, sala: '',
  })
  const f = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b">
          <h2 className="text-lg font-bold text-gray-800">Nova Turma</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Escola *</label>
            <select value={form.escolaId} onChange={e => f('escolaId', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              style={{ '--tw-ring-color': 'var(--cor-primaria)' } as any}>
              <option value="">Selecione...</option>
              {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código da Turma *</label>
              <input type="text" value={form.codigo} onChange={e => f('codigo', e.target.value.toUpperCase())}
                placeholder="Ex: 1A, 2B, EJA1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Série / Período</label>
              <input type="text" value={form.serie} onChange={e => f('serie', e.target.value)}
                placeholder="Ex: 1º Ano, 5º Ano"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Etapa *</label>
              <select value={form.etapa} onChange={e => f('etapa', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                {Object.entries(ETAPA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Turno *</label>
              <select value={form.turno} onChange={e => f('turno', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                {Object.entries(TURNO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano Letivo</label>
              <input type="number" value={form.ano} onChange={e => f('ano', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacidade</label>
              <input type="number" value={form.capacidade} onChange={e => f('capacidade', Number(e.target.value))} min={1} max={60}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sala</label>
              <input type="text" value={form.sala} onChange={e => f('sala', e.target.value)} placeholder="01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
          </div>
        </div>
        <div className="p-6 border-t flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={() => onSalvar(form)} disabled={!form.escolaId || !form.codigo || !form.etapa}
            className="px-6 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
            style={{ background: 'var(--cor-primaria)' }}>
            Criar Turma
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Painel Aluno ─────────────────────────────────────────────────────────────
function ItemAluno({ aluno }: { aluno: AlunoMatriculado }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
        {aluno.numeroChamada ?? '—'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-800 truncate">{aluno.nome}</span>
          {aluno.nee && (
            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">NEE</span>
          )}
        </div>
        <span className="text-xs text-gray-400">{aluno.situacao}</span>
      </div>
    </div>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function TurmasPage() {
  const anoAtual = new Date().getFullYear()
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaDetalhe, setTurmaDetalhe] = useState<(Turma & { matriculas: AlunoMatriculado[] }) | null>(null)
  const [escolaFiltro, setEscolaFiltro] = useState('')
  const [anoFiltro, setAnoFiltro] = useState(anoAtual)
  const [modalTurma, setModalTurma] = useState(false)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregarDados() }, [])
  useEffect(() => { carregarTurmas() }, [escolaFiltro, anoFiltro])

  async function carregarDados() {
    const r = await fetch('/api/educacao/escola')
    const d = await r.json()
    setEscolas(d.escolas ?? [])
  }

  async function carregarTurmas() {
    setLoading(true)
    const params = new URLSearchParams({ ano: String(anoFiltro) })
    if (escolaFiltro) params.set('escolaId', escolaFiltro)
    const r = await fetch(`/api/educacao/turma?${params}`)
    const d = await r.json()
    setTurmas(d.turmas ?? [])
    setLoading(false)
  }

  async function abrirTurma(id: string) {
    const r = await fetch(`/api/educacao/turma?id=${id}`)
    const d = await r.json()
    if (d.turma) setTurmaDetalhe(d.turma)
  }

  async function criarTurma(dados: any) {
    const r = await fetch('/api/educacao/turma', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    setMsg('Turma criada com sucesso!')
    setModalTurma(false)
    carregarTurmas()
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div className="p-6 max-w-6xl space-y-5">
      {modalTurma && <ModalTurma escolas={escolas} onSalvar={criarTurma} onClose={() => setModalTurma(false)} />}

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <a href="/gestao/educacao" className="hover:underline">Educação</a>
            <span>›</span><span>Turmas</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Turmas</h1>
          <p className="text-sm text-gray-500">Gestão de turmas da rede municipal · LDB 9.394/1996</p>
        </div>
        <button onClick={() => setModalTurma(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-sm"
          style={{ background: 'var(--cor-primaria)' }}>
          <Plus size={16} /> Nova Turma
        </button>
      </div>

      {msg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{msg}</div>
      )}

      {/* Filtros */}
      <div className="flex gap-3">
        <select value={escolaFiltro} onChange={e => setEscolaFiltro(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="">Todas as escolas</option>
          {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <select value={anoFiltro} onChange={e => setAnoFiltro(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
          {[anoAtual, anoAtual - 1, anoAtual - 2].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="ml-auto text-sm text-gray-500 self-center">{turmas.length} turmas</span>
      </div>

      {/* Layout 2 colunas */}
      <div className="grid grid-cols-5 gap-6">
        {/* Lista de turmas */}
        <div className="col-span-2 space-y-2">
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm">Carregando...</div>
          ) : turmas.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
              <BookOpen size={32} className="mx-auto mb-2 text-gray-300" strokeWidth={1.5} />
              <p className="text-gray-400 text-sm">Nenhuma turma encontrada</p>
            </div>
          ) : turmas.map(t => (
            <button key={t.id} onClick={() => abrirTurma(t.id)}
              className={`w-full text-left bg-white rounded-xl border p-4 hover:shadow-sm transition-all ${
                turmaDetalhe?.id === t.id ? 'border-2 shadow-sm' : 'border-gray-100'
              }`}
              style={turmaDetalhe?.id === t.id ? { borderColor: 'var(--cor-primaria)' } : {}}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-gray-900 text-sm">
                    {t.serie ?? t.codigo} - {TURNO_LABEL[t.turno]}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{t.escolaNome}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--cor-primaria)' }}>
                    {ETAPA_LABEL[t.etapa] ?? t.etapa}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-lg font-bold ${t.lotado ? 'text-red-600' : 'text-gray-700'}`}>
                    {t._count?.matriculas ?? t.totalMatriculas}/{t.capacidade}
                  </div>
                  {t.lotado
                    ? <div className="text-xs text-red-500 font-medium">LOTADA</div>
                    : <div className="text-xs text-gray-400">{t.vagasDisponiveis} vagas</div>
                  }
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Painel detalhe */}
        <div className="col-span-3">
          {!turmaDetalhe ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <ChevronRight size={32} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 text-sm">Selecione uma turma para ver os alunos</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="p-5 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {turmaDetalhe.serie ?? turmaDetalhe.codigo} - {TURNO_LABEL[turmaDetalhe.turno]}
                    </h2>
                    <div className="text-sm text-gray-500 mt-0.5">{turmaDetalhe.escolaNome}</div>
                    <div className="flex gap-3 mt-2 text-xs text-gray-400">
                      <span>{ETAPA_LABEL[turmaDetalhe.etapa] ?? turmaDetalhe.etapa}</span>
                      <span>·</span>
                      <span>Código: {turmaDetalhe.codigo}</span>
                      <span>·</span>
                      <span>Sala {turmaDetalhe.sala || '—'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-700">
                      {turmaDetalhe.matriculas?.length ?? 0}
                    </div>
                    <div className="text-xs text-gray-400">alunos</div>
                  </div>
                </div>
              </div>

              {/* Lista de alunos */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">
                    <Users size={14} className="inline mr-1" />
                    Alunos Matriculados
                  </h3>
                  <span className="text-xs text-gray-400">
                    {turmaDetalhe.vagasDisponiveis} vagas disponíveis
                  </span>
                </div>
                {(turmaDetalhe.matriculas ?? []).length === 0 ? (
                  <div className="text-center text-gray-400 py-8 text-sm">Nenhum aluno matriculado</div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {(turmaDetalhe.matriculas ?? []).map((a, i) => (
                      <ItemAluno key={a.matriculaId ?? i} aluno={a} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
