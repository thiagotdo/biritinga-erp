'use client'

import { useState, useEffect } from 'react'
import { Briefcase, Trophy, Users, GraduationCap, Loader2, CheckCircle2 } from 'lucide-react'

const fmtData = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

const CURSO_STATUS_COR: Record<string,string> = {
  PLANEJADO:        'bg-gray-100 text-gray-700',
  INSCRICOES_ABERTAS:'bg-blue-100 text-blue-800',
  EM_ANDAMENTO:     'bg-yellow-100 text-yellow-800',
  CONCLUIDO:        'bg-green-100 text-green-800',
  CANCELADO:        'bg-red-100 text-red-800',
}
const ESPORTE_STATUS_COR: Record<string,string> = {
  PLANEJADO:    'bg-gray-100 text-gray-700',
  INSCRICOES:   'bg-blue-100 text-blue-800',
  EM_ANDAMENTO: 'bg-yellow-100 text-yellow-800',
  CONCLUIDO:    'bg-green-100 text-green-800',
  CANCELADO:    'bg-red-100 text-red-800',
}
const AREA_COR: Record<string,string> = {
  INFORMATICA:'bg-blue-100 text-blue-800', COSTURA:'bg-pink-100 text-pink-800',
  CULINARIA:'bg-orange-100 text-orange-800', CONSTRUCAO_CIVIL:'bg-stone-100 text-stone-800',
  ARTESANATO:'bg-purple-100 text-purple-800', COMERCIO:'bg-cyan-100 text-cyan-800',
  SAUDE:'bg-red-100 text-red-800', AGRICULTURA:'bg-lime-100 text-lime-800',
  ESPORTE:'bg-green-100 text-green-800', OUTRO:'bg-gray-100 text-gray-700'
}

type Aba = 'cursos' | 'esporte'

export default function SetrePage() {
  const [aba, setAba]           = useState<Aba>('cursos')
  const [cursos, setCursos]     = useState<any[]>([])
  const [cursoStatus, setCursoStatus] = useState<any[]>([])
  const [totalVagas, setTotalVagas]   = useState(0)
  const [totalInscritos, setTotalInscritos] = useState(0)
  const [eventos, setEventos]   = useState<any[]>([])
  const [eventoStatus, setEventoStatus]   = useState<any[]>([])
  const [totalParticipantes, setTotalParticipantes] = useState(0)
  const [loading, setLoading]   = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('TODOS')

  useEffect(() => {
    Promise.all([
      fetch('/api/setre/curso?porPagina=100').then(r => r.json()).catch(() => ({})),
      fetch('/api/setre/esporte?porPagina=100').then(r => r.json()).catch(() => ({})),
    ]).then(([cd, ed]) => {
      setCursos(cd.cursos ?? [])
      setCursoStatus(cd.porStatus ?? [])
      setTotalVagas(Number(cd.totalVagas ?? 0))
      setTotalInscritos(Number(cd.totalInscritos ?? 0))
      setEventos(ed.eventos ?? [])
      setEventoStatus(ed.porStatus ?? [])
      setTotalParticipantes(Number(ed.totalParticipantes ?? 0))
      setLoading(false)
    })
  }, [])

  const totalCursos = cursoStatus.reduce((a: number, x: any) => a + Number(x.qtd), 0)
  const totalEventos = eventoStatus.reduce((a: number, x: any) => a + Number(x.qtd), 0)
  const qtdC = (s: string) => Number(cursoStatus.find((x: any) => x.status === s)?.qtd ?? 0)
  const qtdE = (s: string) => Number(eventoStatus.find((x: any) => x.status === s)?.qtd ?? 0)

  const cursosFilt = filtroStatus === 'TODOS' ? cursos : cursos.filter((c: any) => c.status === filtroStatus)
  const eventosFilt = filtroStatus === 'TODOS' ? eventos : eventos.filter((e: any) => e.status === filtroStatus)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin w-8 h-8 text-cyan-600" />
    </div>
  )

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-cyan-100 rounded-xl">
          <Briefcase className="w-7 h-7 text-cyan-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SETRE — Trabalho, Renda e Esporte</h1>
          <p className="text-gray-500 mt-1">Cursos de capacitação profissional, geração de renda e eventos esportivos</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
          <p className="text-xs text-gray-500">Cursos</p>
          <p className="text-2xl font-bold text-cyan-700 mt-1">{totalCursos}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs text-gray-500">Vagas Oferecidas</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{totalVagas.toLocaleString('pt-BR')}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs text-gray-500">Inscritos</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{totalInscritos.toLocaleString('pt-BR')}</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-xs text-gray-500">Eventos Esportivos</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">{totalEventos}</p>
        </div>
      </div>

      {/* Meta ocupação */}
      {totalVagas > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Taxa de Ocupação das Vagas</p>
            <p className="text-sm font-bold text-cyan-700">
              {Math.round((totalInscritos / totalVagas) * 100)}%
            </p>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.round((totalInscritos / totalVagas) * 100))}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{totalInscritos} inscritos de {totalVagas} vagas</p>
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['cursos','esporte'] as Aba[]).map(a => (
          <button key={a} onClick={() => { setAba(a); setFiltroStatus('TODOS') }}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors
              ${aba === a ? 'border-cyan-600 text-cyan-700 bg-cyan-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {a === 'cursos' ? `🎓 Cursos (${totalCursos})` : `🏆 Esporte (${totalEventos})`}
          </button>
        ))}
      </div>

      {/* ABA: Cursos */}
      {aba === 'cursos' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {['TODOS','PLANEJADO','INSCRICOES_ABERTAS','EM_ANDAMENTO','CONCLUIDO','CANCELADO'].map(s => (
              <button key={s} onClick={() => setFiltroStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                  ${filtroStatus === s ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-gray-600 border-gray-300 hover:border-cyan-400'}`}>
                {s === 'TODOS' ? 'Todos' : s.replace('_',' ')}
                {s !== 'TODOS' && ` (${qtdC(s)})`}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Curso</th>
                  <th className="px-4 py-3 text-left">Área</th>
                  <th className="px-4 py-3 text-left">Instrutor</th>
                  <th className="px-4 py-3 text-left">Local</th>
                  <th className="px-4 py-3 text-right">CH</th>
                  <th className="px-4 py-3 text-right">Vagas</th>
                  <th className="px-4 py-3 text-right">Inscritos</th>
                  <th className="px-4 py-3 text-left">Início</th>
                  <th className="px-4 py-3 text-left">Parceiro</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cursosFilt.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium max-w-[180px] truncate">{c.nome}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${AREA_COR[c.area] ?? 'bg-gray-100 text-gray-700'}`}>
                        {c.area?.replace('_',' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.instrutor ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{c.local ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{c.cargaHoraria ? `${c.cargaHoraria}h` : '—'}</td>
                    <td className="px-4 py-3 text-right text-blue-700 font-medium">{c.vagas ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-green-700 font-medium">{Number(c.inscritos ?? 0)}</td>
                    <td className="px-4 py-3 text-gray-500">{fmtData(c.dataInicio)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.parceiro ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CURSO_STATUS_COR[c.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {c.status?.replace('_',' ')}
                      </span>
                    </td>
                  </tr>
                ))}
                {cursosFilt.length === 0 && (
                  <tr><td colSpan={10} className="text-center text-gray-400 py-8">Nenhum curso encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA: Esporte */}
      {aba === 'esporte' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {['TODOS','PLANEJADO','INSCRICOES','EM_ANDAMENTO','CONCLUIDO','CANCELADO'].map(s => (
              <button key={s} onClick={() => setFiltroStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                  ${filtroStatus === s ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300 hover:border-orange-400'}`}>
                {s === 'TODOS' ? 'Todos' : s.replace('_',' ')}
                {s !== 'TODOS' && ` (${qtdE(s)})`}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Evento</th>
                  <th className="px-4 py-3 text-left">Modalidade</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Local</th>
                  <th className="px-4 py-3 text-left">Início</th>
                  <th className="px-4 py-3 text-left">Fim</th>
                  <th className="px-4 py-3 text-right">Participantes</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {eventosFilt.map((e: any) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{e.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{e.modalidade?.replace('_',' ')}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{e.tipo?.replace('_',' ')}</td>
                    <td className="px-4 py-3 text-gray-500">{e.local ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{fmtData(e.dataInicio)}</td>
                    <td className="px-4 py-3 text-gray-500">{e.dataFim ? fmtData(e.dataFim) : '—'}</td>
                    <td className="px-4 py-3 text-right text-orange-700 font-medium">{e.participantes ? Number(e.participantes).toLocaleString('pt-BR') : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESPORTE_STATUS_COR[e.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {e.status?.replace('_',' ')}
                      </span>
                    </td>
                  </tr>
                ))}
                {eventosFilt.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-gray-400 py-8">Nenhum evento encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totais de participantes */}
          {totalParticipantes > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
              <Trophy className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <p className="text-sm text-orange-800">
                <strong>{totalParticipantes.toLocaleString('pt-BR')} participantes</strong> mobilizados em eventos esportivos em 2026.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
