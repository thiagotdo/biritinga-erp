'use client'

import { useState, useEffect } from 'react'
import { Scale, Clock, CheckCircle2, AlertCircle, FileText, Loader2 } from 'lucide-react'

const fmtData = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

const STATUS_COR: Record<string,string> = {
  PENDENTE:   'bg-yellow-100 text-yellow-800',
  EM_ANALISE: 'bg-blue-100 text-blue-800',
  EMITIDO:    'bg-green-100 text-green-800',
  DEVOLVIDO:  'bg-orange-100 text-orange-800',
  ARQUIVADO:  'bg-gray-100 text-gray-700',
}

const TIPO_LABEL: Record<string,string> = {
  CONTRATO:'Contrato', CONVENIO:'Convênio', LICITACAO:'Licitação',
  ADMINISTRATIVO:'Administrativo', PESSOAL:'Pessoal', TRIBUTARIO:'Tributário',
  JUDICIAL:'Judicial', LEGISLATIVO:'Legislativo', OUTRO:'Outro'
}
const CLASSI_COR: Record<string,string> = {
  FAVORAVEL:'text-green-700', CONTRARIO:'text-red-700',
  CONDICIONAL:'text-orange-700', INFORMATIVO:'text-blue-700'
}

export default function PgmPage() {
  const [pareceres, setPareceres] = useState<any[]>([])
  const [resumo, setResumo]       = useState<any[]>([])
  const [classiData, setClassi]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('TODOS')

  useEffect(() => {
    fetch('/api/pgm/parecer?porPagina=100')
      .then(r => r.json())
      .then(d => {
        setPareceres(d.pareceres ?? [])
        setResumo(d.resumo ?? [])
        setClassi(d.porClassificacao ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const total = resumo.reduce((a: number, x: any) => a + Number(x.qtd), 0)
  const qtd = (s: string) => Number(resumo.find((x: any) => x.status === s)?.qtd ?? 0)

  const pareceresFiltrados = filtroStatus === 'TODOS'
    ? pareceres
    : pareceres.filter((p: any) => p.status === filtroStatus)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin w-8 h-8 text-indigo-600" />
    </div>
  )

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-indigo-100 rounded-xl">
          <Scale className="w-7 h-7 text-indigo-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Procuradoria Geral do Município</h1>
          <p className="text-gray-500 mt-1">Pareceres jurídicos, assessoria legal e contencioso municipal</p>
        </div>
      </div>

      {/* Alerta: pendentes com prazo próximo */}
      {qtd('PENDENTE') > 0 && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            <strong>{qtd('PENDENTE')} parecer{qtd('PENDENTE') > 1 ? 'es' : ''}</strong> aguardam análise.
            {qtd('EM_ANALISE') > 0 && ` Outros ${qtd('EM_ANALISE')} em análise.`}
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-xs text-gray-500">Total Pareceres</p>
          <p className="text-2xl font-bold text-indigo-700 mt-1">{total}</p>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-xs text-gray-500">Pendentes</p>
          <p className="text-2xl font-bold text-yellow-700 mt-1">{qtd('PENDENTE')}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs text-gray-500">Em Análise</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{qtd('EM_ANALISE')}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs text-gray-500">Emitidos</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{qtd('EMITIDO')}</p>
        </div>
      </div>

      {/* Classificações */}
      {classiData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {classiData.map((c: any) => (
            <div key={c.classificacao} className="rounded-lg border border-gray-200 bg-white p-3 flex items-center gap-3">
              <FileText className={`w-5 h-5 ${CLASSI_COR[c.classificacao] ?? 'text-gray-500'}`} />
              <div>
                <p className="text-xs text-gray-500">{c.classificacao}</p>
                <p className={`font-bold text-sm ${CLASSI_COR[c.classificacao] ?? 'text-gray-700'}`}>{Number(c.qtd)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {['TODOS','PENDENTE','EM_ANALISE','EMITIDO','DEVOLVIDO','ARQUIVADO'].map(s => (
          <button key={s} onClick={() => setFiltroStatus(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
              ${filtroStatus === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}>
            {s === 'TODOS' ? 'Todos' : s.replace('_',' ')}
            {s !== 'TODOS' && ` (${qtd(s)})`}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Número</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Assunto</th>
              <th className="px-4 py-3 text-left">Solicitante</th>
              <th className="px-4 py-3 text-left">Solicitação</th>
              <th className="px-4 py-3 text-left">Prazo</th>
              <th className="px-4 py-3 text-left">Classificação</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pareceresFiltrados.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-medium text-indigo-700">{p.numero}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{TIPO_LABEL[p.tipo] ?? p.tipo}</td>
                <td className="px-4 py-3 font-medium max-w-[220px] truncate">{p.assunto}</td>
                <td className="px-4 py-3 text-gray-500">{p.solicitante}</td>
                <td className="px-4 py-3 text-gray-500">{fmtData(p.dataSolicitacao)}</td>
                <td className="px-4 py-3 text-gray-500">{p.prazoResposta ? fmtData(p.prazoResposta) : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${CLASSI_COR[p.classificacao] ?? 'text-gray-600'}`}>
                    {p.classificacao ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COR[p.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {p.status?.replace('_',' ')}
                  </span>
                </td>
              </tr>
            ))}
            {pareceresFiltrados.length === 0 && (
              <tr><td colSpan={8} className="text-center text-gray-400 py-8">Nenhum parecer encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bases legais */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-3">Bases Legais</h2>
        <ul className="text-sm text-gray-600 space-y-1.5 columns-2">
          <li>• <strong>LC 101/00</strong> — Lei de Responsabilidade Fiscal</li>
          <li>• <strong>Lei 8.666/93</strong> — Lei de Licitações (revogada)</li>
          <li>• <strong>Lei 14.133/21</strong> — Nova Lei de Licitações</li>
          <li>• <strong>Lei 9.784/99</strong> — Processo Administrativo Federal</li>
          <li>• <strong>Lei Orgânica Municipal</strong> — Biritinga</li>
          <li>• <strong>CF/88, Art. 131–132</strong> — Advocacia Pública</li>
        </ul>
      </div>
    </div>
  )
}
