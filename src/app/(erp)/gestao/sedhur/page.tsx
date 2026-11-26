'use client'

import { useState, useEffect } from 'react'
import { Home, Users, TrendingUp, AlertCircle, Loader2 } from 'lucide-react'

const fmtData = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'
const fmtMoeda = (v: number) =>
  v ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'

const STATUS_COR: Record<string,string> = {
  INSCRITO:       'bg-blue-100 text-blue-800',
  EM_ANALISE:     'bg-yellow-100 text-yellow-800',
  HABILITADO:     'bg-green-100 text-green-800',
  NAO_HABILITADO: 'bg-red-100 text-red-800',
  CONTEMPLADO:    'bg-purple-100 text-purple-800',
  CONCLUIDO:      'bg-gray-100 text-gray-700',
}
const PROGRAMA_COR: Record<string,string> = {
  MCMV:            'bg-blue-50 border-blue-200 text-blue-700',
  REGULARIZACAO:   'bg-green-50 border-green-200 text-green-700',
  MELHORIAS:       'bg-orange-50 border-orange-200 text-orange-700',
  URBANIZACAO:     'bg-purple-50 border-purple-200 text-purple-700',
  OUTRO:           'bg-gray-50 border-gray-200 text-gray-700',
}
const MORADIA_LABEL: Record<string,string> = {
  ALUGUEL:'Aluguel', CEDIDA:'Cedida', PROPRIA_IRREGULAR:'Própria Irregular',
  SEM_MORADIA:'Sem Moradia', AREA_RISCO:'Área de Risco', OUTRO:'Outro'
}

export default function SedhurPage() {
  const [candidatos, setCandidatos] = useState<any[]>([])
  const [porStatus, setPorStatus]   = useState<any[]>([])
  const [porPrograma, setPorPrograma] = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('TODOS')
  const [filtroPrograma, setFiltroPrograma] = useState('TODOS')

  useEffect(() => {
    fetch('/api/sedhur/candidato?porPagina=100')
      .then(r => r.json())
      .then(d => {
        setCandidatos(d.candidatos ?? [])
        setPorStatus(d.porStatus ?? [])
        setPorPrograma(d.porPrograma ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const total = porStatus.reduce((a: number, x: any) => a + Number(x.qtd), 0)
  const qtd = (s: string) => Number(porStatus.find((x: any) => x.status === s)?.qtd ?? 0)
  const qtdProg = (p: string) => Number(porPrograma.find((x: any) => x.programa === p)?.qtd ?? 0)

  let lista = candidatos
  if (filtroStatus !== 'TODOS') lista = lista.filter((c: any) => c.status === filtroStatus)
  if (filtroPrograma !== 'TODOS') lista = lista.filter((c: any) => c.programa === filtroPrograma)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin w-8 h-8 text-sky-600" />
    </div>
  )

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-sky-100 rounded-xl">
          <Home className="w-7 h-7 text-sky-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SEDHUR — Habitação e Urbanismo</h1>
          <p className="text-gray-500 mt-1">Programas habitacionais, regularização fundiária e cadastro de beneficiários</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-xs text-gray-500">Total Inscritos</p>
          <p className="text-2xl font-bold text-sky-700 mt-1">{total}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs text-gray-500">Habilitados</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{qtd('HABILITADO')}</p>
        </div>
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
          <p className="text-xs text-gray-500">Contemplados</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">{qtd('CONTEMPLADO')}</p>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-xs text-gray-500">Em Análise</p>
          <p className="text-2xl font-bold text-yellow-700 mt-1">{qtd('EM_ANALISE')}</p>
        </div>
      </div>

      {/* Programas */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Por Programa</h2>
        <div className="flex flex-wrap gap-3">
          {porPrograma.map((p: any) => (
            <div key={p.programa} className={`rounded-lg border px-4 py-2 ${PROGRAMA_COR[p.programa] ?? 'bg-gray-50 border-gray-200 text-gray-700'}`}>
              <p className="text-xs font-medium">{p.programa?.replace('_',' ')}</p>
              <p className="text-lg font-bold">{Number(p.qtd)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap gap-2">
          {['TODOS','INSCRITO','EM_ANALISE','HABILITADO','NAO_HABILITADO','CONTEMPLADO','CONCLUIDO'].map(s => (
            <button key={s} onClick={() => setFiltroStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                ${filtroStatus === s ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-gray-600 border-gray-300 hover:border-sky-400'}`}>
              {s === 'TODOS' ? 'Todos Status' : s.replace('_',' ')}
              {s !== 'TODOS' && ` (${qtd(s)})`}
            </button>
          ))}
        </div>
        <select
          value={filtroPrograma}
          onChange={e => setFiltroPrograma(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1 bg-white"
        >
          <option value="TODOS">Todos Programas</option>
          {['MCMV','REGULARIZACAO','MELHORIAS','URBANIZACAO','OUTRO'].map(p => (
            <option key={p} value={p}>{p.replace('_',' ')} ({qtdProg(p)})</option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Protocolo</th>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">CPF</th>
              <th className="px-4 py-3 text-left">Bairro</th>
              <th className="px-4 py-3 text-right">Renda</th>
              <th className="px-4 py-3 text-left">Moradia</th>
              <th className="px-4 py-3 text-left">Programa</th>
              <th className="px-4 py-3 text-right">Pts</th>
              <th className="px-4 py-3 text-left">Inscrição</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lista.map((c: any) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-medium text-sky-700">{c.protocolo}</td>
                <td className="px-4 py-3 font-medium">{c.nome}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.cpf}</td>
                <td className="px-4 py-3 text-gray-500">{c.bairro ?? '—'}</td>
                <td className="px-4 py-3 text-right text-gray-600">{c.renda ? fmtMoeda(Number(c.renda)) : '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{MORADIA_LABEL[c.situacaoMoradia] ?? c.situacaoMoradia}</td>
                <td className="px-4 py-3 text-xs font-medium text-sky-700">{c.programa?.replace('_',' ')}</td>
                <td className="px-4 py-3 text-right font-bold text-purple-700">{c.pontuacao ?? 0}</td>
                <td className="px-4 py-3 text-gray-500">{fmtData(c.dataInscricao)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COR[c.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {c.status?.replace('_',' ')}
                  </span>
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr><td colSpan={10} className="text-center text-gray-400 py-8">Nenhum candidato encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
