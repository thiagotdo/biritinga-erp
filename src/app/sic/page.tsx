'use client'

import { useState } from 'react'
import { Scale, Search, FileText, CheckCircle2, AlertCircle, Clock, Loader2, ChevronDown } from 'lucide-react'

type Aba = 'novo' | 'consultar'

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  RECEBIDO:               { label: 'Recebido — aguardando análise', cls: 'text-blue-700 bg-blue-50 border-blue-200' },
  EM_ANALISE:             { label: 'Em análise',                    cls: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  AGUARDANDO_COMPLEMENTO: { label: 'Aguardando complemento do solicitante', cls: 'text-orange-700 bg-orange-50 border-orange-200' },
  RESPONDIDO:             { label: 'Respondido',                    cls: 'text-green-700 bg-green-50 border-green-200' },
  PRORROGADO:             { label: 'Prazo prorrogado',              cls: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  NEGADO:                 { label: 'Negado',                        cls: 'text-red-700 bg-red-50 border-red-200' },
  RECURSO_ABERTO:         { label: 'Recurso aberto',                cls: 'text-purple-700 bg-purple-50 border-purple-200' },
  ARQUIVADO:              { label: 'Arquivado',                     cls: 'text-gray-600 bg-gray-50 border-gray-200' },
}

export default function SicPublicoPage() {
  const [aba, setAba] = useState<Aba>('novo')

  // Novo pedido
  const [form, setForm] = useState({
    nome: '', cpf: '', email: '', telefone: '', orgao: '', assunto: '', descricao: '', tipo: 'PEDIDO_INFORMACAO',
  })
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState<{ protocolo: string; prazoResposta: string; mensagem: string } | null>(null)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)

  // Consulta
  const [consultaProtocolo, setConsultaProtocolo] = useState('')
  const [consultando, setConsultando] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [erroConsulta, setErroConsulta] = useState<string | null>(null)

  async function enviarPedido() {
    if (!form.nome || !form.assunto || !form.descricao) {
      setErroEnvio('Preencha nome, assunto e descrição')
      return
    }
    setEnviando(true)
    setErroEnvio(null)
    try {
      const r = await fetch('/api/sic/solicitacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, canal: 'PORTAL' }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.erro)
      setSucesso(d)
    } catch (e: any) {
      setErroEnvio(e.message)
    } finally {
      setEnviando(false)
    }
  }

  async function consultarProtocolo() {
    if (!consultaProtocolo.trim()) return
    setConsultando(true)
    setErroConsulta(null)
    setResultado(null)
    try {
      const prot = consultaProtocolo.trim().toUpperCase()
      const r = await fetch(`/api/sic/solicitacao?protocolo=${encodeURIComponent(prot)}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.erro)
      setResultado(d.solicitacao)
    } catch (e: any) {
      setErroConsulta(e.message)
    } finally {
      setConsultando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Cabeçalho */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Scale size={24} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                e-SIC — Serviço de Informação ao Cidadão
              </h1>
              <p className="text-sm text-gray-500">Prefeitura Municipal de Biritinga — Lei nº 12.527/2011</p>
            </div>
          </div>
        </div>

        {/* Abas */}
        <div className="max-w-3xl mx-auto px-4 flex gap-1 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => setAba('novo')}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
              aba === 'novo'
                ? 'border-purple-600 text-purple-700 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Novo pedido
          </button>
          <button
            onClick={() => setAba('consultar')}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
              aba === 'consultar'
                ? 'border-purple-600 text-purple-700 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Consultar pedido
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* ABA: Novo pedido */}
        {aba === 'novo' && (
          <>
            {sucesso ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-green-200 dark:border-green-800 p-8 text-center">
                <CheckCircle2 size={56} className="mx-auto text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">Pedido registrado!</h2>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4 my-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Número do protocolo:</p>
                  <p className="text-2xl font-mono font-bold text-green-700 dark:text-green-400">{sucesso.protocolo}</p>
                  <p className="text-sm text-gray-500 mt-1">Prazo de resposta: {new Date(sucesso.prazoResposta + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{sucesso.mensagem}</p>
                <p className="text-xs text-gray-400 mt-3">Guarde o número do protocolo para consultar o andamento</p>
                <button
                  onClick={() => { setSucesso(null); setForm({ nome:'',cpf:'',email:'',telefone:'',orgao:'',assunto:'',descricao:'',tipo:'PEDIDO_INFORMACAO' }) }}
                  className="mt-5 px-6 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                >
                  Novo pedido
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Registrar pedido de informação</h2>
                  <p className="text-sm text-gray-500">
                    Qualquer pessoa pode solicitar informações públicas à Prefeitura. O prazo de resposta é de até 20 dias úteis,
                    prorrogável por mais 10 dias.
                  </p>
                </div>

                {erroEnvio && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                    <AlertCircle size={16} /> {erroEnvio}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Nome completo *</label>
                    <input
                      value={form.nome} onChange={e => setForm(f => ({...f, nome: e.target.value}))}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Seu nome"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">CPF</label>
                    <input
                      value={form.cpf} onChange={e => setForm(f => ({...f, cpf: e.target.value}))}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">E-mail</label>
                    <input
                      type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="seuemail@exemplo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Telefone</label>
                    <input
                      value={form.telefone} onChange={e => setForm(f => ({...f, telefone: e.target.value}))}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="(75) 9 0000-0000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Secretaria / Órgão solicitado</label>
                  <select
                    value={form.orgao} onChange={e => setForm(f => ({...f, orgao: e.target.value}))}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none"
                  >
                    <option value="">Não sei / Qualquer órgão</option>
                    <option value="GABINETE">Gabinete do Prefeito</option>
                    <option value="SEFIN - Finanças">SEFIN — Secretaria de Finanças</option>
                    <option value="SEMSA - Saúde">SEMSA — Secretaria de Saúde</option>
                    <option value="SEDUC - Educação">SEDUC — Secretaria de Educação</option>
                    <option value="SEMOSP - Obras">SEMOSP — Secretaria de Obras</option>
                    <option value="SEMAD - Administração">SEMAD — Secretaria de Administração</option>
                    <option value="CPL - Licitações">CPL — Comissão de Licitações</option>
                    <option value="SEFROTA - Frota">SEFROTA — Gestão de Frota</option>
                    <option value="Ouvidoria">Ouvidoria Municipal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Assunto / Título da solicitação *</label>
                  <input
                    value={form.assunto} onChange={e => setForm(f => ({...f, assunto: e.target.value}))}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Ex.: Extrato de execução orçamentária 2025"
                    maxLength={300}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Descrição detalhada *</label>
                  <textarea
                    value={form.descricao} onChange={e => setForm(f => ({...f, descricao: e.target.value}))}
                    rows={5}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Descreva com detalhes a informação que você está solicitando..."
                  />
                </div>

                <button
                  onClick={enviarPedido}
                  disabled={enviando}
                  className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {enviando ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                  Enviar pedido de informação
                </button>

                <p className="text-xs text-gray-400 text-center">
                  Conforme a Lei nº 12.527/2011, o pedido de informação não exige justificativa.
                  As informações pessoais são protegidas e usadas apenas para comunicação do resultado.
                </p>
              </div>
            )}
          </>
        )}

        {/* ABA: Consultar */}
        {aba === 'consultar' && (
          <div className="space-y-5">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Consultar andamento</h2>
              <div className="flex gap-3">
                <input
                  value={consultaProtocolo}
                  onChange={e => setConsultaProtocolo(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && consultarProtocolo()}
                  placeholder="Ex.: SIC-2026/00001"
                  className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
                <button
                  onClick={consultarProtocolo}
                  disabled={consultando}
                  className="px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {consultando ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  Consultar
                </button>
              </div>
              {erroConsulta && (
                <p className="mt-3 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} /> {erroConsulta}
                </p>
              )}
            </div>

            {resultado && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-xs text-gray-400">Protocolo</p>
                    <p className="text-xl font-mono font-bold text-purple-700 dark:text-purple-400">{resultado.protocolo}</p>
                  </div>
                  {STATUS_LABEL[resultado.status] && (
                    <span className={`text-sm px-4 py-1.5 rounded-full border font-medium ${STATUS_LABEL[resultado.status].cls}`}>
                      {STATUS_LABEL[resultado.status].label}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400">Solicitante</p>
                    <p className="font-medium text-gray-700 dark:text-gray-200">{resultado.nome}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Abertura</p>
                    <p className="font-medium text-gray-700 dark:text-gray-200">
                      {new Date(resultado.dataAbertura).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Órgão</p>
                    <p className="font-medium text-gray-700 dark:text-gray-200">{resultado.orgao || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Prazo legal</p>
                    <p className="font-medium text-gray-700 dark:text-gray-200">
                      {resultado.prorrogadoAte
                        ? `${new Date(resultado.prorrogadoAte + 'T12:00:00').toLocaleDateString('pt-BR')} (prorrogado)`
                        : new Date(resultado.prazoResposta + 'T12:00:00').toLocaleDateString('pt-BR')
                      }
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-gray-400 text-sm">Assunto</p>
                  <p className="font-medium text-gray-700 dark:text-gray-200">{resultado.assunto}</p>
                </div>

                {resultado.resposta && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                      <CheckCircle2 size={14} />
                      Resposta do município — {resultado.respondidoPor}
                      {resultado.dataResposta && (
                        <span className="font-normal text-green-500 ml-1">
                          em {new Date(resultado.dataResposta).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-200">{resultado.resposta}</p>
                  </div>
                )}

                {resultado.fundamentoLegal && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <p className="text-sm font-medium text-red-700 mb-1">Fundamento da negativa</p>
                    <p className="text-sm text-gray-600">{resultado.fundamentoLegal}</p>
                  </div>
                )}
              </div>
            )}

            {/* Info sobre prazos */}
            <div className="bg-purple-50 dark:bg-purple-900/10 rounded-xl p-4 text-xs text-purple-700 dark:text-purple-400 space-y-1">
              <p className="font-semibold">Seus direitos conforme a LAI</p>
              <p>• Prazo de resposta: até 20 dias úteis a partir do recebimento</p>
              <p>• Prorrogação de até 10 dias úteis, mediante justificativa</p>
              <p>• Negativa deve ser fundamentada em lei; cabe recurso em 10 dias</p>
              <p>• Informações pessoais não precisam ser fornecidas para fazer o pedido</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
