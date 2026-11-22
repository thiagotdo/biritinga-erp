'use client'
import { useState, useEffect, useCallback } from 'react'
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react'

// ─── Demandas da Ouvidoria (Admin) ────────────────────────────────────────────

type Manifestacao = {
  id: string; protocolo: string; tipo: string; situacao: string; assunto: string
  secretariaDestino?: string; prioridade: string; prazoResposta: string
  prorrogado: boolean; anonima: boolean; nomeManifestante?: string
  lai: boolean; criadoEm: string; atrasada?: boolean; vencendoBreve?: boolean
  diasRestantes?: number
}

const SIT_COR: Record<string, string> = {
  RECEBIDA:        'bg-blue-100 text-blue-700',
  EM_ANALISE:      'bg-yellow-100 text-yellow-700',
  AGUARDANDO_RESP: 'bg-orange-100 text-orange-700',
  RESPONDIDA:      'bg-teal-100 text-teal-700',
  DEVOLVIDA:       'bg-gray-100 text-gray-700',
  ENCERRADA:       'bg-green-100 text-green-700',
  ARQUIVADA:       'bg-slate-100 text-slate-700',
}

const TIPO_LABEL: Record<string, string> = {
  RECLAMACAO: 'Reclamação', SUGESTAO: 'Sugestão', ELOGIO: 'Elogio',
  DENUNCIA: 'Denúncia', SOLICITACAO_INFO: 'Sol. Info', SOLICITACAO_SERVICO: 'Sol. Serviço',
}

const PRIO_COR: Record<string, string> = {
  BAIXA: 'text-gray-500', NORMAL: 'text-blue-600', ALTA: 'text-orange-600', URGENTE: 'text-red-600',
}

export default function OuvidoriaDemandasPage() {
  const [dados, setDados]       = useState<Manifestacao[]>([])
  const [loading, setLoading]   = useState(true)
  const [situacao, setSituacao] = useState('')
  const [tipo, setTipo]         = useState('')
  const [busca, setBusca]       = useState('')
  const [vencendo, setVencendo] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (situacao) p.set('situacao', situacao)
      if (tipo)     p.set('tipo', tipo)
      if (busca)    p.set('busca', busca)
      if (vencendo) p.set('vencendo', 'true')
      const r = await fetch(`/api/ouvidoria/manifestacao?${p}`)
      const d = await r.json()
      setDados(d.manifestacoes ?? [])
    } finally {
      setLoading(false)
    }
  }, [situacao, tipo, busca, vencendo])

  useEffect(() => { carregar() }, [carregar])

  const fmtData = (d: string) => new Date(d).toLocaleDateString('pt-BR')

  return (
<>
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demandas - Ouvidoria</h1>
          <p className="text-sm text-gray-500 mt-1">Gestão das manifestações dos cidadãos</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
          <input
            className="border border-gray-300 rounded px-3 py-2 text-sm flex-1 min-w-48"
            placeholder="Protocolo, assunto ou cidadão…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && carregar()}
          />
          <select className="border border-gray-300 rounded px-3 py-2 text-sm" value={situacao} onChange={e => setSituacao(e.target.value)}>
            <option value="">Todas situações</option>
            <option value="RECEBIDA">Recebida</option>
            <option value="EM_ANALISE">Em Análise</option>
            <option value="AGUARDANDO_RESP">Aguardando Resposta</option>
            <option value="RESPONDIDA">Respondida</option>
            <option value="ENCERRADA">Encerrada</option>
            <option value="ARQUIVADA">Arquivada</option>
          </select>
          <select className="border border-gray-300 rounded px-3 py-2 text-sm" value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="">Todos os tipos</option>
            <option value="RECLAMACAO">Reclamação</option>
            <option value="SUGESTAO">Sugestão</option>
            <option value="ELOGIO">Elogio</option>
            <option value="DENUNCIA">Denúncia</option>
            <option value="SOLICITACAO_INFO">Solicitação de Info (LAI)</option>
            <option value="SOLICITACAO_SERVICO">Solicitação de Serviço</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-orange-700 font-medium cursor-pointer">
            <input type="checkbox" checked={vencendo} onChange={e => setVencendo(e.target.checked)} />
            <AlertTriangle className="w-4 h-4" /> Vencendo
          </label>
          <button onClick={carregar} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Filtrar</button>
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Carregando demandas…</div>
        ) : dados.length === 0 ? (
          <div className="text-center py-16 text-gray-400">Nenhuma manifestação encontrada.</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Protocolo','Tipo','Situação','Cidadão','Assunto','Prazo','Prioridade'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dados.map(m => (
                  <tr key={m.id} className={`hover:bg-gray-50 ${m.atrasada ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-blue-600">
                      {m.protocolo}
                      {m.lai && <span className="ml-1 text-purple-600 text-xs">[LAI]</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{TIPO_LABEL[m.tipo] ?? m.tipo}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${SIT_COR[m.situacao] ?? 'bg-gray-100 text-gray-700'}`}>
                        {m.situacao.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {m.anonima ? <em className="text-gray-400">Anônimo</em> : (m.nomeManifestante || '—')}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-48 truncate">{m.assunto}</td>
                    <td className="px-4 py-3">
                      <div className={`text-sm ${m.atrasada ? 'text-red-600 font-semibold' : m.vencendoBreve ? 'text-orange-600 font-medium' : 'text-gray-600'}`}>
                        {fmtData(m.prazoResposta)}
                      </div>
                      {m.diasRestantes !== undefined && (
                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          {m.atrasada ? <AlertTriangle className="w-3 h-3 text-red-500" /> : <Clock className="w-3 h-3" />}
                          {m.atrasada ? `${Math.abs(m.diasRestantes)}d atrasado` : `${m.diasRestantes}d restantes`}
                        </div>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium ${PRIO_COR[m.prioridade] ?? 'text-gray-600'}`}>
                      {m.prioridade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
</>
  )
}
