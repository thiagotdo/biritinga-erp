'use client'

import { useState, useEffect } from 'react'
import {
  Globe2, Search, RefreshCw, CheckCircle2, AlertCircle,
  Clock, XCircle, FileText, Loader2, ExternalLink,
  TrendingUp, Building2, Scale, Info,
} from 'lucide-react'

interface Envio {
  id: string
  tipo: string
  referenciaId: string
  numeroReferencia: string
  status: string
  pncpId: string | null
  pncpUrl: string | null
  tentativas: number
  ultimaTentativaEm: string | null
  enviadoEm: string | null
  erroMensagem: string | null
  criadoEm: string
}

interface Resumo {
  status: string
  tipo: string
  qtd: number
}

const STATUS_CFG: Record<string, { label: string; cls: string; Icon: any }> = {
  ENVIADO:    { label: 'Enviado',    cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',  Icon: CheckCircle2 },
  PENDENTE:   { label: 'Pendente',   cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', Icon: Clock },
  ERRO:       { label: 'Erro',       cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',          Icon: XCircle },
  RETIFICADO: { label: 'Retificado', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',      Icon: RefreshCw },
  CANCELADO:  { label: 'Cancelado',  cls: 'bg-gray-100 text-gray-500',                                            Icon: XCircle },
}

const TIPO_LABEL: Record<string, string> = {
  LICITACAO: 'Licitação',
  CONTRATO: 'Contrato',
  ATA: 'Ata',
  DISPENSA: 'Dispensa',
  INEXIGIBILIDADE: 'Inexigibilidade',
}

export default function PncpPage() {
  const [envios, setEnvios] = useState<Envio[]>([])
  const [resumo, setResumo] = useState<Resumo[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sincronizando, setSincronizando] = useState<string | null>(null)
  const [tipoSel, setTipoSel] = useState('TODOS')
  const [statusSel, setStatusSel] = useState('TODOS')
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  function carregar() {
    setLoading(true)
    const params = new URLSearchParams({ tipo: tipoSel, status: statusSel })
    fetch(`/api/pncp/sincronizar?${params}`)
      .then(r => r.json())
      .then(d => {
        setEnvios(d.envios ?? [])
        setTotal(d.total ?? 0)
        setResumo(d.resumo ?? [])
        setLoading(false)
      })
      .catch(e => { setErro(e.message); setLoading(false) })
  }

  useEffect(() => { carregar() }, [tipoSel, statusSel])

  async function sincronizar(referenciaId: string, tipo: string) {
    setSincronizando(referenciaId)
    try {
      const r = await fetch('/api/pncp/sincronizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenciaId, tipo }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.erro)
      setMsg(`Enviado ao PNCP: ${d.pncpId}`)
      setTimeout(() => setMsg(null), 4000)
      carregar()
    } catch (e: any) {
      setErro(e.message)
      setTimeout(() => setErro(null), 5000)
    } finally {
      setSincronizando(null)
    }
  }

  // Totais do resumo
  const totalEnviados  = resumo.filter(r => r.status === 'ENVIADO').reduce((a, r) => a + Number(r.qtd), 0)
  const totalPendentes = resumo.filter(r => r.status === 'PENDENTE').reduce((a, r) => a + Number(r.qtd), 0)
  const totalErros     = resumo.filter(r => r.status === 'ERRO').reduce((a, r) => a + Number(r.qtd), 0)
  const totalLics      = resumo.filter(r => r.tipo === 'LICITACAO').reduce((a, r) => a + Number(r.qtd), 0)
  const totalContratos = resumo.filter(r => r.tipo === 'CONTRATO').reduce((a, r) => a + Number(r.qtd), 0)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Globe2 size={28} className="text-blue-600" />
            PNCP — Portal Nacional de Contratações Públicas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Integração obrigatória — Lei 14.133/2021 · CNPJ 14.192.898/0001-42 · IBGE 2902005
          </p>
        </div>
        <button
          onClick={carregar}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      {/* Aviso sandbox */}
      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <Info size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Ambiente de Homologação (sandbox)</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
            Integração conectada ao ambiente de treinamento do PNCP (<code>treina.pncp.gov.br</code>).
            Para ativação em produção, cadastre o município em <strong>pncp.gov.br</strong> e configure as credenciais
            no painel de Configurações do ERP.
          </p>
        </div>
      </div>

      {/* Alertas */}
      {msg && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 border border-green-200 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg text-sm">
          <CheckCircle2 size={16} /> {msg}
        </div>
      )}
      {erro && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/30 border border-red-200 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
          <AlertCircle size={16} /> {erro}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total enviados', valor: totalEnviados,  cor: 'green',  icon: CheckCircle2 },
          { label: 'Pendentes',      valor: totalPendentes, cor: 'yellow', icon: Clock },
          { label: 'Com erro',       valor: totalErros,     cor: 'red',    icon: AlertCircle },
          { label: 'Licitações',     valor: totalLics,      cor: 'indigo', icon: Scale },
          { label: 'Contratos',      valor: totalContratos, cor: 'purple', icon: FileText },
        ].map(k => {
          const Icon = k.icon
          return (
            <div key={k.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={`text-${k.cor}-500`} />
                <p className="text-xs text-gray-500 dark:text-gray-400">{k.label}</p>
              </div>
              <p className={`text-2xl font-bold text-${k.cor}-600`}>{k.valor}</p>
            </div>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={tipoSel}
          onChange={e => setTipoSel(e.target.value)}
          className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 outline-none"
        >
          <option value="TODOS">Todos os tipos</option>
          <option value="LICITACAO">Licitações</option>
          <option value="CONTRATO">Contratos</option>
          <option value="DISPENSA">Dispensas</option>
          <option value="INEXIGIBILIDADE">Inexigibilidades</option>
        </select>
        <select
          value={statusSel}
          onChange={e => setStatusSel(e.target.value)}
          className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 outline-none"
        >
          <option value="TODOS">Todos os status</option>
          <option value="ENVIADO">Enviados</option>
          <option value="PENDENTE">Pendentes</option>
          <option value="ERRO">Com erro</option>
        </select>
        <span className="text-sm text-gray-400">{total} registro(s)</span>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-blue-600" size={36} />
        </div>
      ) : (
        <div className="space-y-2">
          {envios.map(envio => {
            const st = STATUS_CFG[envio.status] ?? STATUS_CFG.PENDENTE
            const StIcon = st.Icon
            const dataFmt = envio.enviadoEm
              ? new Date(envio.enviadoEm).toLocaleDateString('pt-BR')
              : '—'
            return (
              <div key={envio.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex items-center gap-4">
                {/* Tipo */}
                <div className="flex-shrink-0 w-20 text-center">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                    {TIPO_LABEL[envio.tipo] ?? envio.tipo}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>
                      <StIcon size={11} /> {st.label}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {envio.numeroReferencia || '—'}
                    </span>
                    {envio.pncpId && (
                      <span className="text-xs text-gray-400 font-mono">{envio.pncpId}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                    <span>Enviado: {dataFmt}</span>
                    <span>Tentativas: {envio.tentativas}</span>
                    {envio.erroMensagem && (
                      <span className="text-red-500 truncate max-w-xs">{envio.erroMensagem}</span>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex-shrink-0 flex gap-2 items-center">
                  {envio.pncpUrl && (
                    <a
                      href={envio.pncpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1"
                    >
                      <ExternalLink size={12} /> PNCP
                    </a>
                  )}
                  {(envio.status === 'PENDENTE' || envio.status === 'ERRO') && (
                    <button
                      onClick={() => sincronizar(envio.referenciaId, envio.tipo)}
                      disabled={sincronizando === envio.referenciaId}
                      className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {sincronizando === envio.referenciaId
                        ? <Loader2 size={12} className="animate-spin" />
                        : <RefreshCw size={12} />}
                      Enviar
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {envios.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Globe2 size={48} className="mx-auto mb-3 opacity-30" />
              <p>Nenhum envio encontrado</p>
            </div>
          )}
        </div>
      )}

      {/* Rodapé informativo */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-xs text-gray-400 space-y-1">
        <p className="font-medium text-gray-500 dark:text-gray-300">Referências legais</p>
        <p>• Lei nº 14.133/2021 — Nova Lei de Licitações e Contratos Administrativos</p>
        <p>• Art. 174 — Obrigatoriedade de integração com o PNCP a partir de 1º/4/2023 para municípios &gt; 20.000 hab.</p>
        <p>• Instrução Normativa SEGES/ME nº 78/2022 — Padrões de integração</p>
        <p>• Documentação técnica: <a href="https://pncp.gov.br/app/api" target="_blank" rel="noopener noreferrer" className="underline">pncp.gov.br/app/api</a></p>
      </div>
    </div>
  )
}
