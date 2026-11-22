'use client'
import { useState, useEffect, useCallback } from 'react'

// ─── Contratos de Obras Públicas ─────────────────────────────────────────────
// Lei 14.133/2021 — Arts. 92–165 (contratos vinculados a obras)
// Art. 117 — fiscalização obrigatória pelo gestor/fiscal designado

interface ContratoObra {
  id: string
  numero: string
  situacao: string
  contratadaNome: string
  contratadaCNPJ: string
  objeto: string
  valorOriginal: number
  valorAtual: number
  valorExecutado: number
  dataAssinatura?: string
  dataInicio?: string
  dataFim?: string
  fiscalNome?: string
  gestorNome?: string
  urlContrato?: string
  obra?: { id: string; numero: string; titulo: string; situacao: string }
  _count?: { aditivos: number; medicoes: number }
}

const SIT_COR: Record<string, string> = {
  MINUTA:              'bg-gray-100 text-gray-700',
  ASSINADO:            'bg-blue-100 text-blue-700',
  EM_EXECUCAO:         'bg-green-100 text-green-700',
  SUSPENSO:            'bg-yellow-100 text-yellow-700',
  RESCINDIDO_ADMIN:    'bg-red-100 text-red-700',
  RESCINDIDO_AMIGAVEL: 'bg-orange-100 text-orange-700',
  CONCLUIDO:           'bg-teal-100 text-teal-700',
  EXPIRADO:            'bg-slate-100 text-slate-700',
}

const fmtMoeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fmtData = (d?: string) =>
  d ? new Date(d).toLocaleDateString('pt-BR') : '—'

const diasRestantes = (fim?: string) => {
  if (!fim) return null
  return Math.ceil((new Date(fim).getTime() - Date.now()) / 86400000)
}

export default function ContratosObrasPage() {
  const [contratos, setContratos] = useState<ContratoObra[]>([])
  const [busca, setBusca]         = useState('')
  const [situacao, setSituacao]   = useState('')
  const [loading, setLoading]     = useState(true)
  const [erro, setErro]           = useState<string | null>(null)
  const [selecionado, setSelecionado] = useState<ContratoObra | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const params = new URLSearchParams({ tipo: 'OBRA' })
      if (situacao) params.set('situacao', situacao)
      if (busca)    params.set('busca', busca)
      const r = await fetch(`/api/obras/contrato?${params}`)
      if (!r.ok) throw new Error(await r.text())
      const data = await r.json()
      setContratos(data.contratos ?? [])
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }, [situacao, busca])

  useEffect(() => { carregar() }, [carregar])

  const kpis = {
    total:     contratos.length,
    ativos:    contratos.filter(c => c.situacao === 'EM_EXECUCAO').length,
    valorTotal: contratos.reduce((s, c) => s + (c.valorAtual ?? 0), 0),
    executado:  contratos.reduce((s, c) => s + (c.valorExecutado ?? 0), 0),
    vencendo:   contratos.filter(c => {
      const d = diasRestantes(c.dataFim)
      return d !== null && d >= 0 && d <= 30
    }).length,
  }

  const percExec = kpis.valorTotal > 0
    ? ((kpis.executado / kpis.valorTotal) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratos de Obras</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestão de contratos vinculados a obras públicas — Lei 14.133/2021
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total',         value: kpis.total,            color: 'text-gray-800'   },
          { label: 'Em Execução',   value: kpis.ativos,           color: 'text-green-700'  },
          { label: 'Valor Total',   value: fmtMoeda(kpis.valorTotal), color: 'text-blue-700'   },
          { label: 'Executado',     value: `${percExec}%`,        color: 'text-teal-700'   },
          { label: 'Vcto ≤30 dias', value: kpis.vencendo,         color: 'text-orange-700' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap gap-3">
        <input
          className="border border-gray-300 rounded px-3 py-2 text-sm flex-1 min-w-48"
          placeholder="Buscar por número, contratada, objeto…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && carregar()}
        />
        <select
          className="border border-gray-300 rounded px-3 py-2 text-sm"
          value={situacao}
          onChange={e => setSituacao(e.target.value)}
        >
          <option value="">Todas as situações</option>
          <option value="MINUTA">Minuta</option>
          <option value="ASSINADO">Assinado</option>
          <option value="EM_EXECUCAO">Em Execução</option>
          <option value="SUSPENSO">Suspenso</option>
          <option value="CONCLUIDO">Concluído</option>
          <option value="EXPIRADO">Expirado</option>
          <option value="RESCINDIDO_ADMIN">Rescindido (Admin)</option>
          <option value="RESCINDIDO_AMIGAVEL">Rescindido (Amigável)</option>
        </select>
        <button
          onClick={carregar}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          Filtrar
        </button>
      </div>

      {/* Erro */}
      {erro && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700">
          {erro}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando contratos…</div>
      ) : contratos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          Nenhum contrato de obra encontrado.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Número','Situação','Contratada','Obra','Valor Atual','Vcto','Exec.',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contratos.map(c => {
                const dias = diasRestantes(c.dataFim)
                const percLocal = c.valorAtual > 0
                  ? ((c.valorExecutado / c.valorAtual) * 100).toFixed(0)
                  : '0'
                const alertaVcto = dias !== null && dias >= 0 && dias <= 30
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-blue-600">{c.numero}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${SIT_COR[c.situacao] ?? 'bg-gray-100 text-gray-700'}`}>
                        {c.situacao.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 truncate max-w-48">{c.contratadaNome}</div>
                      <div className="text-xs text-gray-400">{c.contratadaCNPJ}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-40 truncate">
                      {c.obra?.titulo ?? c.objeto}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{fmtMoeda(c.valorAtual)}</td>
                    <td className={`px-4 py-3 text-sm ${alertaVcto ? 'text-orange-600 font-medium' : 'text-gray-600'}`}>
                      {fmtData(c.dataFim)}
                      {dias !== null && (
                        <div className="text-xs">
                          {dias < 0 ? `${Math.abs(dias)}d vencido` : `${dias}d`}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, Number(percLocal))}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">{percLocal}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelecionado(c)}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Detalhar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de detalhe */}
      {selecionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Contrato {selecionado.numero}</h2>
                <span className={`text-xs px-2 py-1 rounded-full font-medium mt-1 inline-block ${SIT_COR[selecionado.situacao] ?? 'bg-gray-100 text-gray-700'}`}>
                  {selecionado.situacao.replace(/_/g, ' ')}
                </span>
              </div>
              <button onClick={() => setSelecionado(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-1">Objeto</p>
                <p className="text-gray-900">{selecionado.objeto}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Contratada</p>
                  <p className="font-medium">{selecionado.contratadaNome}</p>
                  <p className="text-gray-400 text-xs">{selecionado.contratadaCNPJ}</p>
                </div>
                {selecionado.obra && (
                  <div>
                    <p className="text-xs text-gray-500">Obra vinculada</p>
                    <p className="font-medium">{selecionado.obra.titulo}</p>
                    <p className="text-gray-400 text-xs">{selecionado.obra.numero}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Valor Original</p>
                  <p className="font-medium">{fmtMoeda(selecionado.valorOriginal)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Valor Atual</p>
                  <p className="font-medium text-blue-700">{fmtMoeda(selecionado.valorAtual)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Executado</p>
                  <p className="font-medium text-green-700">{fmtMoeda(selecionado.valorExecutado)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Assinatura</p>
                  <p>{fmtData(selecionado.dataAssinatura)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Início</p>
                  <p>{fmtData(selecionado.dataInicio)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Vencimento</p>
                  <p className={
                    diasRestantes(selecionado.dataFim) !== null && diasRestantes(selecionado.dataFim)! <= 30
                      ? 'text-orange-600 font-medium'
                      : ''
                  }>
                    {fmtData(selecionado.dataFim)}
                  </p>
                </div>
              </div>

              {(selecionado.fiscalNome || selecionado.gestorNome) && (
                <div className="grid grid-cols-2 gap-4">
                  {selecionado.fiscalNome && (
                    <div>
                      <p className="text-xs text-gray-500">Fiscal (Art. 117)</p>
                      <p className="font-medium">{selecionado.fiscalNome}</p>
                    </div>
                  )}
                  {selecionado.gestorNome && (
                    <div>
                      <p className="text-xs text-gray-500">Gestor</p>
                      <p className="font-medium">{selecionado.gestorNome}</p>
                    </div>
                  )}
                </div>
              )}

              {selecionado._count && (
                <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded p-3">
                  <div>
                    <p className="text-xs text-gray-500">Aditivos</p>
                    <p className="font-bold text-lg">{selecionado._count.aditivos}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Medições</p>
                    <p className="font-bold text-lg">{selecionado._count.medicoes}</p>
                  </div>
                </div>
              )}

              {selecionado.urlContrato && (
                <a
                  href={selecionado.urlContrato}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-blue-600 hover:underline text-sm"
                >
                  📄 Acessar documento do contrato
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
