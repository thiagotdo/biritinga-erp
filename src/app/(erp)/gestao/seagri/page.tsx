'use client'

import { useState, useEffect } from 'react'
import { Wheat, MapPin, Users, Sprout, TrendingUp, Loader2 } from 'lucide-react'

const fmtData = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'
const fmtHa   = (v: number) => v ? `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ha` : '—'

const TIPO_PROP_LABEL: Record<string,string> = {
  PEQUENA:'Pequena Propriedade', MEDIA:'Média Propriedade',
  GRANDE:'Grande Propriedade', QUILOMBOLA:'Quilombola',
  ASSENTAMENTO:'Assentamento', OUTRO:'Outro'
}
const TIPO_ATER_COR: Record<string,string> = {
  VISITA:'bg-blue-100 text-blue-800', CURSO:'bg-green-100 text-green-800',
  PALESTRA:'bg-teal-100 text-teal-800', MUTIRAO:'bg-orange-100 text-orange-800',
  DISTRIBUICAO_INSUMOS:'bg-purple-100 text-purple-800', OUTRO:'bg-gray-100 text-gray-700'
}
type Aba = 'propriedades' | 'ater'

export default function SeagriPage() {
  const [aba, setAba]           = useState<Aba>('propriedades')
  const [props, setProps]       = useState<any[]>([])
  const [porTipo, setPorTipo]   = useState<any[]>([])
  const [areas, setAreas]       = useState<any>(null)
  const [aters, setAters]       = useState<any[]>([])
  const [aterTipos, setAterTipos] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/seagri/propriedade?porPagina=100').then(r => r.json()).catch(() => ({})),
      fetch('/api/seagri/assistencia?porPagina=100').then(r => r.json()).catch(() => ({})),
    ]).then(([pd, ad]) => {
      setProps(pd.propriedades ?? [])
      setPorTipo(pd.porTipo ?? [])
      setAreas(pd.areas)
      setAters(ad.atendimentos ?? [])
      setAterTipos(ad.porTipo ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin w-8 h-8 text-lime-600" />
    </div>
  )

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-lime-100 rounded-xl">
          <Wheat className="w-7 h-7 text-lime-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SEAGRI — Secretaria de Agricultura</h1>
          <p className="text-gray-500 mt-1">Propriedades rurais, assistência técnica e fomento agropecuário</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-lime-200 bg-lime-50 p-4">
          <p className="text-xs text-gray-500">Propriedades</p>
          <p className="text-2xl font-bold text-lime-700 mt-1">{props.length}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs text-gray-500">Área Total</p>
          <p className="text-xl font-bold text-green-700 mt-1">{fmtHa(Number(areas?.totalArea ?? 0))}</p>
        </div>
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
          <p className="text-xs text-gray-500">Área Agricultável</p>
          <p className="text-xl font-bold text-teal-700 mt-1">{fmtHa(Number(areas?.totalAgricultavel ?? 0))}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs text-gray-500">Atendimentos ATER</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{aters.length}</p>
        </div>
      </div>

      {/* Por tipo de propriedade */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {porTipo.map((t: any) => (
          <div key={t.tipo} className="rounded-lg border border-gray-200 bg-white p-4 flex items-center gap-3">
            <Sprout className="w-5 h-5 text-lime-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">{TIPO_PROP_LABEL[t.tipo] ?? t.tipo}</p>
              <p className="font-bold text-lime-700">{Number(t.qtd)} prop · {fmtHa(Number(t.totalHa))}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['propriedades','ater'] as Aba[]).map(a => (
          <button key={a} onClick={() => setAba(a)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors
              ${aba === a ? 'border-lime-600 text-lime-700 bg-lime-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {a === 'propriedades' ? `🌾 Propriedades (${props.length})` : `🛠 ATER / Assistência (${aters.length})`}
          </button>
        ))}
      </div>

      {/* ABA: Propriedades */}
      {aba === 'propriedades' && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Comunidade</th>
                <th className="px-4 py-3 text-right">Área Total</th>
                <th className="px-4 py-3 text-right">Agricultável</th>
                <th className="px-4 py-3 text-left">Culturas</th>
                <th className="px-4 py-3 text-left">Irrigação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {props.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.nome}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{TIPO_PROP_LABEL[p.tipo] ?? p.tipo}</td>
                  <td className="px-4 py-3 text-gray-500">{p.comunidade ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmtHa(Number(p.areaTotal))}</td>
                  <td className="px-4 py-3 text-right text-green-700">{p.areaAgricultavel ? fmtHa(Number(p.areaAgricultavel)) : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{p.principaisCulturas ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.sistemaIrrigacao ?? '—'}</td>
                </tr>
              ))}
              {props.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray-400 py-8">Nenhuma propriedade cadastrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ABA: ATER */}
      {aba === 'ater' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {aterTipos.map((t: any) => (
              <span key={t.tipo} className={`px-3 py-1 rounded-full text-xs font-medium ${TIPO_ATER_COR[t.tipo] ?? 'bg-gray-100 text-gray-700'}`}>
                {t.tipo.replace('_',' ')} ({Number(t.qtd)})
              </span>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Beneficiário</th>
                  <th className="px-4 py-3 text-left">Técnico</th>
                  <th className="px-4 py-3 text-left">Propriedade</th>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {aters.map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_ATER_COR[a.tipo] ?? 'bg-gray-100 text-gray-700'}`}>
                        {a.tipo?.replace('_',' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{a.beneficiario ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{a.tecnico ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{a.propriedadeNome ?? '—'}{a.comunidade ? ` · ${a.comunidade}` : ''}</td>
                    <td className="px-4 py-3 text-gray-500">{fmtData(a.dataAtendimento)}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{a.resultado ?? '—'}</td>
                  </tr>
                ))}
                {aters.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-8">Nenhum atendimento registrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
