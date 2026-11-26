'use client'

import { useState, useEffect } from 'react'
import {
  Leaf, AlertTriangle, FileCheck, CheckCircle2, Clock,
  XCircle, Loader2, AlertCircle, TrendingUp
} from 'lucide-react'

const fmtData = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'
const fmtMoeda = (v: number) =>
  v ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'

const LIC_STATUS_COR: Record<string,string> = {
  SOLICITADA:  'bg-blue-100 text-blue-800',
  EM_ANALISE:  'bg-yellow-100 text-yellow-800',
  VISTORIA:    'bg-orange-100 text-orange-800',
  APROVADA:    'bg-green-100 text-green-800',
  INDEFERIDA:  'bg-red-100 text-red-800',
  VENCIDA:     'bg-gray-100 text-gray-700',
  CANCELADA:   'bg-gray-100 text-gray-700',
}
const LIC_TIPO_LABEL: Record<string,string> = {
  LP:'Licença Prévia (LP)', LI:'Licença de Instalação (LI)',
  LO:'Licença de Operação (LO)', LAC:'Licença Ambiental Combinada',
  ASV:'Autorizações de Supressão', OTRO:'Outro'
}

const FISC_STATUS_COR: Record<string,string> = {
  ABERTA:     'bg-red-100 text-red-800',
  EM_ANALISE: 'bg-yellow-100 text-yellow-800',
  CONCLUIDA:  'bg-green-100 text-green-800',
  ARQUIVADA:  'bg-gray-100 text-gray-700',
}
const FISC_TIPO_LABEL: Record<string,string> = {
  AUTO_INFRACAO:'Auto de Infração', NOTIFICACAO:'Notificação',
  EMBARGO:'Embargo', VISTORIA:'Vistoria', DENUNCIA:'Denúncia', OUTRO:'Outro'
}

type Aba = 'licencas' | 'fiscalizacao'

export default function SemmaPage() {
  const [aba, setAba]           = useState<Aba>('licencas')
  const [licencas, setLicencas] = useState<any[]>([])
  const [resLic, setResLic]     = useState<any[]>([])
  const [venc90, setVenc90]     = useState(0)
  const [fiscs, setFiscs]       = useState<any[]>([])
  const [resFisc, setResFisc]   = useState<any[]>([])
  const [totalMultas, setTotalMultas] = useState(0)
  const [loading, setLoading]   = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('TODOS')

  useEffect(() => {
    Promise.all([
      fetch('/api/semma/licenca?porPagina=50').then(r => r.json()).catch(() => ({})),
      fetch('/api/semma/fiscalizacao?porPagina=50').then(r => r.json()).catch(() => ({})),
    ]).then(([ld, fd]) => {
      setLicencas(ld.licencas ?? [])
      setResLic(ld.resumo ?? [])
      setVenc90(Number(ld.vencendoEm90Dias ?? 0))
      setFiscs(fd.fiscalizacoes ?? [])
      setResFisc(fd.resumo ?? [])
      setTotalMultas(Number(fd.totalMultas ?? 0))
      setLoading(false)
    })
  }, [])

  const totalLic = resLic.reduce((a: number, x: any) => a + Number(x.qtd), 0)
  const totalFisc = resFisc.reduce((a: number, x: any) => a + Number(x.qtd), 0)
  const qtdLic = (s: string) => Number(resLic.find((x: any) => x.status === s)?.qtd ?? 0)
  const qtdFisc = (s: string) => Number(resFisc.find((x: any) => x.status === s)?.qtd ?? 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin w-8 h-8 text-green-600" />
    </div>
  )

  const licFiltradas = filtroStatus === 'TODOS'
    ? licencas
    : licencas.filter((l: any) => l.status === filtroStatus)

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-green-100 rounded-xl">
          <Leaf className="w-7 h-7 text-green-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel SEMMA</h1>
          <p className="text-gray-500 mt-1">Secretaria de Meio Ambiente — licenças ambientais e fiscalização</p>
        </div>
      </div>

      {/* Alerta vencimento */}
      {venc90 > 0 && (
        <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <p className="text-sm text-orange-800">
            <strong>{venc90} licença{venc90 > 1 ? 's' : ''}</strong> vence{venc90 > 1 ? 'm' : ''} nos próximos 90 dias — acione o processo de renovação.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs text-gray-500">Total Licenças</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{totalLic}</p>
        </div>
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
          <p className="text-xs text-gray-500">Aprovadas</p>
          <p className="text-2xl font-bold text-teal-700 mt-1">{qtdLic('APROVADA')}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs text-gray-500">Fiscalizações</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{totalFisc}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs text-gray-500">Total em Multas</p>
          <p className="text-xl font-bold text-red-700 mt-1">{fmtMoeda(totalMultas)}</p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['licencas','fiscalizacao'] as Aba[]).map(a => (
          <button
            key={a}
            onClick={() => { setAba(a); setFiltroStatus('TODOS') }}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors
              ${aba === a
                ? 'border-green-600 text-green-700 bg-green-50'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {a === 'licencas' ? `🌿 Licenças (${totalLic})` : `🔍 Fiscalização (${totalFisc})`}
          </button>
        ))}
      </div>

      {/* ABA: Licenças */}
      {aba === 'licencas' && (
        <div className="space-y-4">
          {/* Pills de status */}
          <div className="flex flex-wrap gap-2">
            {['TODOS','SOLICITADA','EM_ANALISE','VISTORIA','APROVADA','INDEFERIDA','VENCIDA'].map(s => (
              <button key={s} onClick={() => setFiltroStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                  ${filtroStatus === s ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'}`}>
                {s === 'TODOS' ? 'Todos' : s.replace('_',' ')}
                {s !== 'TODOS' && ` (${qtdLic(s)})`}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Número</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Requerente</th>
                  <th className="px-4 py-3 text-left">Atividade</th>
                  <th className="px-4 py-3 text-left">Vencimento</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {licFiltradas.map((l: any) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-green-700">{l.numero}</td>
                    <td className="px-4 py-3 text-gray-600">{LIC_TIPO_LABEL[l.tipo] ?? l.tipo}</td>
                    <td className="px-4 py-3 font-medium">{l.requerente}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{l.atividade}</td>
                    <td className="px-4 py-3 text-gray-500">{l.dataVencimento ? fmtData(l.dataVencimento) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LIC_STATUS_COR[l.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {l.status?.replace('_',' ')}
                      </span>
                    </td>
                  </tr>
                ))}
                {licFiltradas.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-8">Nenhuma licença encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA: Fiscalização */}
      {aba === 'fiscalizacao' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {['TODOS','ABERTA','EM_ANALISE','CONCLUIDA','ARQUIVADA'].map(s => (
              <button key={s} onClick={() => setFiltroStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                  ${filtroStatus === s ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'}`}>
                {s === 'TODOS' ? 'Todos' : s.replace('_',' ')}
                {s !== 'TODOS' && ` (${qtdFisc(s)})`}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Número</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Autuado</th>
                  <th className="px-4 py-3 text-left">Local</th>
                  <th className="px-4 py-3 text-left">Multa</th>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(filtroStatus === 'TODOS' ? fiscs : fiscs.filter((f: any) => f.status === filtroStatus)).map((f: any) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-orange-700">{f.numero}</td>
                    <td className="px-4 py-3 text-gray-600">{FISC_TIPO_LABEL[f.tipo] ?? f.tipo}</td>
                    <td className="px-4 py-3 font-medium">{f.autuado ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{f.local ?? '—'}</td>
                    <td className="px-4 py-3 text-red-600 font-medium">
                      {f.valorMulta ? fmtMoeda(Number(f.valorMulta)) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{fmtData(f.dataOcorrencia)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${FISC_STATUS_COR[f.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {f.status?.replace('_',' ')}
                      </span>
                    </td>
                  </tr>
                ))}
                {fiscs.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-gray-400 py-8">Nenhuma fiscalização encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bases Legais */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-3">Bases Legais</h2>
        <ul className="text-sm text-gray-600 space-y-1.5 columns-2">
          <li>• <strong>Lei 6.938/81</strong> — Política Nacional do Meio Ambiente</li>
          <li>• <strong>Res. CONAMA 237/97</strong> — Licenciamento ambiental</li>
          <li>• <strong>Lei 12.651/12</strong> — Código Florestal</li>
          <li>• <strong>Lei 9.433/97</strong> — Recursos Hídricos</li>
          <li>• <strong>Lei 9.605/98</strong> — Crimes Ambientais</li>
          <li>• <strong>Lei 12.305/10</strong> — Resíduos Sólidos</li>
        </ul>
      </div>
    </div>
  )
}
