'use client'
import { useState, useEffect } from 'react'

// ─── Diário de Classe - Frequência + Notas ────────────────────────────────────
// Lançamento de chamada diária e notas por bimestre.
// LDB Art. 24 V-a: 75% mínimo de frequência.

type Escola = { id: string; nome: string }
type Turma  = { id: string; serie: string; turma: string; turno: string; escola: { nome: string } }
type AlunoRow = {
  matriculaId: string; numero: string; aluno: string; pcd: boolean
  presente: boolean | null; justificada: boolean; aulaId: string | null
}
type Avaliacao = {
  id: string; titulo: string; tipo: string; bimestre: number
  disciplina: string; valorMaximo: number; _count: { notas: number }
}
type NotaRow = { matriculaId: string; numero: string; aluno: string; nota: { valor: number; conceito?: string } | null }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const BIMESTRE_LABEL = ['', '1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre']
const TURNO_LABEL: Record<string, string> = {
  MATUTINO: 'Mat', VESPERTINO: 'Ves', NOTURNO: 'Not', INTEGRAL: 'Int',
}

function dataHoje() {
  return new Date().toISOString().split('T')[0]
}

// ─── Aba Frequência ──────────────────────────────────────────────────────────
function AbaFrequencia({ turmaId }: { turmaId: string }) {
  const [data, setData] = useState(dataHoje())
  const [disciplina, setDisciplina] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [numeroPeriodos, setNumeroPeriodos] = useState(1)
  const [chamada, setChamada] = useState<AlunoRow[]>([])
  const [aulaId, setAulaId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (turmaId && data) carregarChamada()
  }, [turmaId, data])

  async function carregarChamada() {
    setCarregando(true)
    const r = await fetch(`/api/educacao/frequencia?turmaId=${turmaId}&data=${data}`)
    const d = await r.json()
    // Inicializar todos como presentes se ainda não foi lançada
    const rows: AlunoRow[] = (d.chamada ?? []).map((a: AlunoRow) => ({
      ...a,
      presente: a.presente ?? true,  // padrão = presente
    }))
    setChamada(rows)
    setAulaId(d.aulaId ?? null)
    setCarregando(false)
  }

  function togglePresenca(matriculaId: string) {
    setChamada(prev => prev.map(a =>
      a.matriculaId === matriculaId ? { ...a, presente: !a.presente } : a
    ))
  }

  function toggleJustificada(matriculaId: string) {
    setChamada(prev => prev.map(a =>
      a.matriculaId === matriculaId ? { ...a, justificada: !a.justificada } : a
    ))
  }

  async function salvarChamada() {
    const payload = {
      turmaId, data, numeroPeriodos, disciplina, conteudo,
      chamada: chamada.map(a => ({
        matriculaId: a.matriculaId,
        presente: a.presente ?? true,
        justificada: a.justificada,
      })),
    }
    const r = await fetch('/api/educacao/frequencia', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    setMsg('Chamada salva!')
    setAulaId(d.aulaId)
    setTimeout(() => setMsg(''), 3000)
  }

  const totalPresentes = chamada.filter(a => a.presente).length
  const totalFaltas    = chamada.filter(a => !a.presente && !a.justificada).length

  return (
    <div>
      {/* Barra de controles */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Data</label>
          <input type="date" value={data} onChange={e => setData(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Disciplina</label>
          <input type="text" value={disciplina} onChange={e => setDisciplina(e.target.value)} placeholder="Matemática…"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 w-40" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Períodos</label>
          <select value={numeroPeriodos} onChange={e => setNumeroPeriodos(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
            {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Conteúdo / Observação</label>
          <input type="text" value={conteudo} onChange={e => setConteudo(e.target.value)} placeholder="Conteúdo da aula…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      {/* Resumo do dia */}
      {chamada.length > 0 && (
        <div className="flex gap-4 mb-3 text-sm">
          <span className="text-green-600 font-semibold">✓ {totalPresentes} presentes</span>
          <span className="text-red-600 font-semibold">✗ {totalFaltas} faltas</span>
          <span className="text-yellow-600 font-semibold">J {chamada.filter(a => a.justificada).length} justificadas</span>
          {aulaId && <span className="ml-auto text-indigo-600 text-xs">Chamada registrada</span>}
        </div>
      )}

      {msg && (
        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{msg}</div>
      )}

      {/* Grade de chamada */}
      {carregando ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-12 text-xs font-semibold text-gray-500 bg-gray-50 px-4 py-2 border-b">
            <div className="col-span-1">#</div>
            <div className="col-span-7">Aluno</div>
            <div className="col-span-2 text-center">Presente</div>
            <div className="col-span-2 text-center">Justificada</div>
          </div>
          {chamada.map((a, i) => (
            <div key={a.matriculaId} className={`grid grid-cols-12 px-4 py-2.5 border-b border-gray-100 last:border-0 items-center ${!a.presente && !a.justificada ? 'bg-red-50' : ''}`}>
              <div className="col-span-1 text-xs text-gray-400">{i + 1}</div>
              <div className="col-span-7 flex items-center gap-1.5">
                <span className="text-sm text-gray-800">{a.aluno}</span>
                {a.pcd && <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded">PcD</span>}
              </div>
              <div className="col-span-2 flex justify-center">
                <button onClick={() => togglePresenca(a.matriculaId)}
                  className={`w-8 h-8 rounded-full font-bold text-sm transition-colors ${a.presente ? 'bg-green-500 text-white' : 'bg-red-200 text-red-700'}`}>
                  {a.presente ? '✓' : '✗'}
                </button>
              </div>
              <div className="col-span-2 flex justify-center">
                {!a.presente && (
                  <button onClick={() => toggleJustificada(a.matriculaId)}
                    className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${a.justificada ? 'bg-yellow-400 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    J
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {chamada.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button onClick={salvarChamada}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            {aulaId ? 'Atualizar Chamada' : 'Registrar Chamada'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Aba Notas ────────────────────────────────────────────────────────────────
function AbaNotas({ turmaId }: { turmaId: string }) {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [avaliacaoId, setAvaliacaoId] = useState('')
  const [grade, setGrade] = useState<NotaRow[]>([])
  const [valores, setValores] = useState<Record<string, string>>({})
  const [modalAvaliacao, setModalAvaliacao] = useState(false)
  const [bimestroFiltro, setBimestroFiltro] = useState(1)
  const [msg, setMsg] = useState('')
  const [formAval, setFormAval] = useState({
    tipo: 'PROVA', bimestre: 1, disciplina: '', titulo: '',
    dataAplicacao: dataHoje(), valorMaximo: 10, peso: 1,
  })

  useEffect(() => { if (turmaId) carregarAvaliacoes() }, [turmaId, bimestroFiltro])
  useEffect(() => { if (avaliacaoId) carregarGrade() }, [avaliacaoId])

  async function carregarAvaliacoes() {
    const r = await fetch(`/api/educacao/nota?turmaId=${turmaId}&bimestre=${bimestroFiltro}`)
    const d = await r.json()
    setAvaliacoes(d.avaliacoes ?? [])
    setAvaliacaoId('')
    setGrade([])
  }

  async function carregarGrade() {
    const r = await fetch(`/api/educacao/nota?avaliacaoId=${avaliacaoId}`)
    const d = await r.json()
    if (d.grade) {
      setGrade(d.grade)
      const init: Record<string, string> = {}
      for (const row of d.grade) {
        init[row.matriculaId] = row.nota ? String(row.nota.valor) : ''
      }
      setValores(init)
    }
  }

  async function criarAvaliacao() {
    const r = await fetch('/api/educacao/nota', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turmaId, ...formAval }),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    setMsg('Avaliação criada!')
    setModalAvaliacao(false)
    carregarAvaliacoes()
    setTimeout(() => setMsg(''), 3000)
  }

  async function lancarNotas() {
    const aval = avaliacoes.find(a => a.id === avaliacaoId)
    const notas = grade
      .filter(r => valores[r.matriculaId] !== '')
      .map(r => ({
        matriculaId: r.matriculaId,
        valor: Number(valores[r.matriculaId]),
      }))

    const r = await fetch('/api/educacao/nota', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'LANCAR_LOTE', avaliacaoId, notas }),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    setMsg(`${d.totalLancadas} notas lançadas!`)
    carregarGrade()
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div>
      <div className="flex gap-3 mb-4 items-center">
        <div className="flex gap-1">
          {[1, 2, 3, 4].map(b => (
            <button key={b} onClick={() => setBimestroFiltro(b)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${bimestroFiltro === b ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
              {b}º Bim
            </button>
          ))}
        </div>
        <button onClick={() => setModalAvaliacao(true)}
          className="ml-auto px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200">
          + Nova Avaliação
        </button>
      </div>

      {msg && (
        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{msg}</div>
      )}

      {/* Lista de avaliações */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {avaliacoes.map(a => (
          <button key={a.id} onClick={() => setAvaliacaoId(a.id)}
            className={`px-3 py-2 rounded-lg text-xs font-medium border ${avaliacaoId === a.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-300 text-gray-700 hover:border-indigo-400'}`}>
            <div>{a.titulo}</div>
            <div className="opacity-70">{a.disciplina} · {a.tipo} · até {a.valorMaximo}</div>
          </button>
        ))}
        {avaliacoes.length === 0 && (
          <div className="text-sm text-gray-400 py-2">Nenhuma avaliação neste bimestre</div>
        )}
      </div>

      {/* Grade de notas */}
      {grade.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-12 text-xs font-semibold text-gray-500 bg-gray-50 px-4 py-2 border-b">
            <div className="col-span-8">Aluno</div>
            <div className="col-span-4 text-center">Nota</div>
          </div>
          {grade.map((row, i) => (
            <div key={row.matriculaId} className="grid grid-cols-12 px-4 py-2 border-b border-gray-100 last:border-0 items-center">
              <div className="col-span-8 text-sm text-gray-800">{row.aluno}</div>
              <div className="col-span-4 flex justify-center">
                <input
                  type="number" min={0} max={avaliacoes.find(a => a.id === avaliacaoId)?.valorMaximo ?? 10}
                  step="0.1"
                  value={valores[row.matriculaId] ?? ''}
                  onChange={e => setValores(prev => ({ ...prev, [row.matriculaId]: e.target.value }))}
                  className="w-20 text-center border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="—"
                />
              </div>
            </div>
          ))}
          <div className="p-4 flex justify-end border-t">
            <button onClick={lancarNotas}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              Lançar Notas
            </button>
          </div>
        </div>
      )}

      {/* Modal nova avaliação */}
      {modalAvaliacao && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b"><h2 className="font-bold text-gray-800">Nova Avaliação</h2></div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Bimestre</label>
                  <select value={formAval.bimestre}
                    onChange={e => setFormAval(p => ({ ...p, bimestre: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                    {[1, 2, 3, 4].map(b => <option key={b} value={b}>{b}º</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
                  <select value={formAval.tipo}
                    onChange={e => setFormAval(p => ({ ...p, tipo: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                    {['PROVA','TRABALHO','ATIVIDADE','SIMULADO','RECUPERACAO','CONCEITUAL'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Disciplina *</label>
                <input type="text" value={formAval.disciplina} placeholder="Matemática"
                  onChange={e => setFormAval(p => ({ ...p, disciplina: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Título *</label>
                <input type="text" value={formAval.titulo} placeholder="Prova 1º Bimestre"
                  onChange={e => setFormAval(p => ({ ...p, titulo: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Data</label>
                  <input type="date" value={formAval.dataAplicacao}
                    onChange={e => setFormAval(p => ({ ...p, dataAplicacao: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Valor Max</label>
                  <input type="number" value={formAval.valorMaximo} min={1} max={100}
                    onChange={e => setFormAval(p => ({ ...p, valorMaximo: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Peso</label>
                  <input type="number" value={formAval.peso} min={0.1} max={10} step="0.1"
                    onChange={e => setFormAval(p => ({ ...p, peso: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                </div>
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => setModalAvaliacao(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700">Cancelar</button>
              <button onClick={criarAvaliacao} disabled={!formAval.disciplina || !formAval.titulo}
                className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium disabled:opacity-50">
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Página Principal Diário ──────────────────────────────────────────────────
export default function DiarioPage() {
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [turmas,  setTurmas]  = useState<Turma[]>([])
  const [turmaId, setTurmaId] = useState('')
  const [aba, setAba] = useState<'frequencia' | 'notas'>('frequencia')
  const anoAtual = new Date().getFullYear()

  useEffect(() => { fetch('/api/educacao/escola').then(r => r.json()).then(d => setEscolas(d.escolas ?? [])) }, [])

  async function carregarTurmas(escolaId: string) {
    const r = await fetch(`/api/educacao/turma?escolaId=${escolaId}&anoLetivo=${anoAtual}`)
    const d = await r.json()
    setTurmas(d.turmas ?? [])
    setTurmaId('')
  }

  const turmaSelecionada = turmas.find(t => t.id === turmaId)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diário de Classe</h1>
          <p className="text-sm text-gray-500 mt-0.5">Frequência diária e lançamento de notas · LDB Art. 24</p>
        </div>
      </div>

      {/* Seletor escola + turma */}
      <div className="px-6 py-4 bg-white border-b flex gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Escola</label>
          <select onChange={e => carregarTurmas(e.target.value)} defaultValue=""
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 w-64">
            <option value="" disabled>Selecione a escola…</option>
            {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Turma</label>
          <select value={turmaId} onChange={e => setTurmaId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 w-52">
            <option value="">Selecione a turma…</option>
            {turmas.map(t => (
              <option key={t.id} value={t.id}>
                {t.serie}º Ano {t.turma} - {TURNO_LABEL[t.turno]}
              </option>
            ))}
          </select>
        </div>
        {turmaSelecionada && (
          <div className="text-sm text-gray-500 self-center">
            {turmaSelecionada.escola.nome}
          </div>
        )}
      </div>

      {!turmaId ? (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <div className="text-5xl mb-3">📋</div>
            <div>Selecione uma escola e turma para começar</div>
          </div>
        </div>
      ) : (
        <div className="px-6 py-6">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-200 p-1 inline-flex">
            {(['frequencia', 'notas'] as const).map(tab => (
              <button key={tab} onClick={() => setAba(tab)}
                className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${aba === tab ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {tab === 'frequencia' ? '📅 Chamada' : '📊 Notas'}
              </button>
            ))}
          </div>

          {aba === 'frequencia' && <AbaFrequencia turmaId={turmaId} />}
          {aba === 'notas'      && <AbaNotas      turmaId={turmaId} />}
        </div>
      )}
    </div>
  )
}
