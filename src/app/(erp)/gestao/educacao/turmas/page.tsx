'use client'
import { useState, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Escola = { id: string; nome: string; tipo: string; _count: { turmas: number } }
type Turma = {
  id: string; serie: string; segmento: string; turma: string; turno: string
  anoLetivo: number; capacidade: number; professorNome?: string
  escola: { nome: string }; _count: { matriculas: number }
  vagasDisponiveis: number; lotado: boolean
}
type Aluno = {
  id: string; matriculaId: string; numero: string
  aluno: { nome: string; pcd: boolean; bolsaFamilia: boolean }
  percentualFreq: number; mediaGeral: number | null; situacao: string; resultadoFinal: string
}
type KPIs = {
  totalMatriculas: number; ativas: number; transferidas: number
  evadidas: number; pcd: number; bolsaFamilia: number; emRisco: number; freqMedia: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TURNO_LABEL: Record<string, string> = {
  MATUTINO: 'Matutino', VESPERTINO: 'Vespertino', NOTURNO: 'Noturno', INTEGRAL: 'Integral',
}
const corResultado = (r: string) =>
  r === 'APROVADO' || r === 'APROVADO_CONSELHO' ? 'text-green-600'
  : r === 'REPROVADO' ? 'text-red-600'
  : r === 'EM_PROGRESSO' ? 'text-blue-600'
  : 'text-gray-500'

// ─── Modal Turma ─────────────────────────────────────────────────────────────
function ModalTurma({ escolas, onSalvar, onClose }: {
  escolas: Escola[]; onSalvar: (d: any) => void; onClose: () => void
}) {
  const [form, setForm] = useState({
    escolaId: '', serie: '', segmento: 'EF1', turma: 'A',
    turno: 'MATUTINO', anoLetivo: new Date().getFullYear(),
    professorNome: '', capacidade: 30,
  })
  const f = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b"><h2 className="text-lg font-bold text-gray-800">Nova Turma</h2></div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Escola *</label>
            <select value={form.escolaId} onChange={e => f('escolaId', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
              <option value="">Selecione...</option>
              {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Série *</label>
              <input type="text" value={form.serie} onChange={e => f('serie', e.target.value)} placeholder="1, 2… EJA"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Turma *</label>
              <input type="text" value={form.turma} onChange={e => f('turma', e.target.value.toUpperCase())} placeholder="A"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacidade</label>
              <input type="number" value={form.capacidade} onChange={e => f('capacidade', Number(e.target.value))} min={1} max={60}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Segmento</label>
              <select value={form.segmento} onChange={e => f('segmento', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                <option value="EI">EI — Educação Infantil</option>
                <option value="EF1">EF1 — 1º ao 5º Ano</option>
                <option value="EF2">EF2 — 6º ao 9º Ano</option>
                <option value="EJA">EJA</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Turno</label>
              <select value={form.turno} onChange={e => f('turno', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                {Object.entries(TURNO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Professor(a)</label>
            <input type="text" value={form.professorNome} onChange={e => f('professorNome', e.target.value)}
              placeholder="Nome do professor responsável"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div className="p-6 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button onClick={() => onSalvar(form)} disabled={!form.escolaId || !form.serie || !form.turma}
            className="px-6 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            Criar Turma
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Painel Aluno ─────────────────────────────────────────────────────────────
function PainelAluno({ aluno }: { aluno: Aluno }) {
  const freqPerigo = aluno.percentualFreq < 75
  const freqAtencao = aluno.percentualFreq < 85 && aluno.percentualFreq >= 75
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-800 truncate">{aluno.aluno.nome}</span>
          {aluno.aluno.pcd && (
            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">PcD</span>
          )}
          {aluno.aluno.bolsaFamilia && (
            <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">BF</span>
          )}
        </div>
        <span className="text-xs text-gray-400">{aluno.numero}</span>
      </div>
      <div className="text-right">
        <div className={`text-sm font-semibold ${freqPerigo ? 'text-red-600' : freqAtencao ? 'text-yellow-600' : 'text-green-600'}`}>
          {aluno.percentualFreq.toFixed(0)}%
        </div>
        <div className="text-xs text-gray-400">freq.</div>
      </div>
      <div className="text-right">
        <div className={`text-sm font-semibold ${corResultado(aluno.resultadoFinal)}`}>
          {aluno.mediaGeral !== null ? Number(aluno.mediaGeral).toFixed(1) : '—'}
        </div>
        <div className="text-xs text-gray-400">média</div>
      </div>
    </div>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function TurmasPage() {
  const anoAtual = new Date().getFullYear()
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [turmaDetalhe, setTurmaDetalhe] = useState<(Turma & { matriculas: Aluno[] }) | null>(null)
  const [escolaFiltro, setEscolaFiltro] = useState('')
  const [anoFiltro, setAnoFiltro] = useState(anoAtual)
  const [modalTurma, setModalTurma] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { carregarDados() }, [])
  useEffect(() => { carregarTurmas() }, [escolaFiltro, anoFiltro])

  async function carregarDados() {
    const [kR, eR] = await Promise.all([
      fetch(`/api/educacao/matricula?relatorio=DASHBOARD&anoLetivo=${anoAtual}`),
      fetch('/api/educacao/escola'),
    ])
    const [kD, eD] = await Promise.all([kR.json(), eR.json()])
    setKpis(kD.kpis)
    setEscolas(eD.escolas ?? [])
  }

  async function carregarTurmas() {
    const params = new URLSearchParams({ anoLetivo: String(anoFiltro) })
    if (escolaFiltro) params.set('escolaId', escolaFiltro)
    const r = await fetch(`/api/educacao/turma?${params}`)
    const d = await r.json()
    setTurmas(d.turmas ?? [])
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
    setMsg('Turma criada!')
    setModalTurma(false)
    carregarTurmas()
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Educação — Turmas</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gestão de matrículas da rede municipal · LDB 9.394/1996</p>
          </div>
          <button onClick={() => setModalTurma(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
            + Nova Turma
          </button>
        </div>
      </div>

      {msg && (
        <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{msg}</div>
      )}

      {/* KPIs */}
      {kpis && (
        <div className="px-6 py-4 grid grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Total', valor: kpis.totalMatriculas, cor: 'text-gray-800' },
            { label: 'Ativas', valor: kpis.ativas, cor: 'text-green-600' },
            { label: 'Transferidas', valor: kpis.transferidas, cor: 'text-yellow-600' },
            { label: 'Evadidas', valor: kpis.evadidas, cor: 'text-red-600' },
            { label: 'PcD', valor: kpis.pcd, cor: 'text-purple-600' },
            { label: 'Bolsa Família', valor: kpis.bolsaFamilia, cor: 'text-orange-600' },
            { label: 'Em Risco (<75%)', valor: kpis.emRisco, cor: 'text-red-700' },
            { label: 'Freq. Média', valor: `${kpis.freqMedia}%`, cor: 'text-indigo-600' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className={`text-2xl font-bold ${k.cor}`}>{k.valor}</div>
              <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="px-6 pb-4 flex gap-3">
        <select value={escolaFiltro} onChange={e => setEscolaFiltro(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
          <option value="">Todas as escolas</option>
          {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <select value={anoFiltro} onChange={e => setAnoFiltro(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
          {[anoAtual, anoAtual - 1].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="ml-auto text-sm text-gray-500 self-center">{turmas.length} turmas</span>
      </div>

      {/* Layout 2 colunas */}
      <div className="px-6 pb-8 grid grid-cols-5 gap-6">
        {/* Lista de turmas */}
        <div className="col-span-2 space-y-2">
          {turmas.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <div className="text-4xl mb-2">🏫</div>
              <div>Nenhuma turma encontrada</div>
            </div>
          ) : turmas.map(t => (
            <button key={t.id} onClick={() => abrirTurma(t.id)}
              className={`w-full text-left bg-white rounded-xl border p-4 hover:border-indigo-400 hover:shadow-sm transition-all ${turmaDetalhe?.id === t.id ? 'border-indigo-500 ring-1 ring-indigo-200' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-gray-900 text-sm">
                    {t.serie}º Ano {t.turma} — {TURNO_LABEL[t.turno]}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{t.escola.nome}</div>
                  {t.professorNome && (
                    <div className="text-xs text-gray-400 mt-1">👤 {t.professorNome}</div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-lg font-bold ${t.lotado ? 'text-red-600' : 'text-green-600'}`}>
                    {t._count.matriculas}/{t.capacidade}
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
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <div className="text-5xl mb-3">👈</div>
              <div>Selecione uma turma para ver os alunos</div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-5 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {turmaDetalhe.serie}º Ano {turmaDetalhe.turma} — {TURNO_LABEL[turmaDetalhe.turno]}
                    </h2>
                    <div className="text-sm text-gray-500 mt-0.5">{turmaDetalhe.escola.nome}</div>
                    {turmaDetalhe.professorNome && (
                      <div className="text-sm text-gray-400 mt-1">Professor(a): {turmaDetalhe.professorNome}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-700">
                      {turmaDetalhe._count?.matriculas ?? turmaDetalhe.matriculas?.length ?? 0}
                    </div>
                    <div className="text-xs text-gray-400">alunos</div>
                  </div>
                </div>
              </div>

              {/* Lista de alunos */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Lista de Alunos</h3>
                  <div className="flex gap-3 text-xs text-gray-400">
                    <span>Frequência</span>
                    <span>Média</span>
                  </div>
                </div>
                {(turmaDetalhe.matriculas ?? []).length === 0 ? (
                  <div className="text-center text-gray-400 py-6 text-sm">Nenhum aluno matriculado</div>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto pr-1">
                    {(turmaDetalhe.matriculas ?? []).map(a => (
                      <PainelAluno key={a.matriculaId ?? a.id} aluno={a} />
                    ))}
                  </div>
                )}

                {/* Alertas de risco */}
                {(() => {
                  const emRisco = (turmaDetalhe.matriculas ?? []).filter((a: Aluno) => a.percentualFreq < 75)
                  return emRisco.length > 0 ? (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-sm font-medium text-red-800 mb-1">
                        ⚠️ {emRisco.length} aluno{emRisco.length > 1 ? 's' : ''} em risco de reprovação por frequência (LDB Art. 24)
                      </div>
                      <div className="text-xs text-red-600">{emRisco.map((a: Aluno) => a.aluno.nome).join(', ')}</div>
                    </div>
                  ) : null
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {modalTurma && (
        <ModalTurma escolas={escolas} onSalvar={criarTurma} onClose={() => setModalTurma(false)} />
      )}
    </div>
  )
}
