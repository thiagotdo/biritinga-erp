'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FilePlus2, Loader2, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function NovoProtocoloPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    assunto: '',
    tipo: 'PROCESSO',
    prioridade: 'NORMAL',
    origem: '',
    interessado: '',
    cpfCnpjInteressado: '',
    setorOrigemNome: 'Protocolo Geral',
    observacoes: '',
    prazo: '',
  })
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso]   = useState('')
  const [erro, setErro]         = useState('')

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const salvar = async () => {
    if (!form.assunto.trim()) { setErro('O assunto é obrigatório.'); return }
    setSalvando(true)
    setErro('')
    const r = await fetch('/api/protocolo/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const d = await r.json()
    setSalvando(false)
    if (r.ok) {
      setSucesso(`Protocolo ${d.numero} aberto com sucesso!`)
      setTimeout(() => router.push('/gestao/protocolo/processos'), 2000)
    } else {
      setErro(d.erro ?? 'Erro ao criar protocolo')
    }
  }

  if (sucesso) return (
    <div className="max-w-lg mx-auto p-6 mt-16 text-center">
      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
      <h2 className="text-lg font-semibold text-gray-900">{sucesso}</h2>
      <p className="text-sm text-gray-500 mt-1">Redirecionando...</p>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/gestao/protocolo"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FilePlus2 className="w-5 h-5 text-blue-600" />
            Novo Protocolo
          </h1>
          <p className="text-sm text-gray-500">Abertura de processo eletrônico</p>
        </div>
      </div>

      {erro && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{erro}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        {/* Assunto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assunto / Objeto <span className="text-red-500">*</span>
          </label>
          <textarea
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
            rows={3}
            placeholder="Descreva o assunto do protocolo..."
            value={form.assunto}
            onChange={F('assunto')}
          />
        </div>

        {/* Tipo e Prioridade */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
              value={form.tipo}
              onChange={F('tipo')}
            >
              <option value="PROCESSO">Processo</option>
              <option value="REQUERIMENTO">Requerimento</option>
              <option value="OFICIO">Ofício</option>
              <option value="MEMORANDO">Memorando</option>
              <option value="RECURSO">Recurso</option>
              <option value="CONTRATO">Contrato</option>
              <option value="CONVENIO">Convênio</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
            <select
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
              value={form.prioridade}
              onChange={F('prioridade')}
            >
              <option value="NORMAL">Normal</option>
              <option value="URGENTE">Urgente</option>
              <option value="MUITO_URGENTE">Muito Urgente</option>
            </select>
          </div>
        </div>

        {/* Interessado */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Interessado</label>
            <input
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="Cidadão ou empresa..."
              value={form.interessado}
              onChange={F('interessado')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CPF / CNPJ</label>
            <input
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="000.000.000-00"
              value={form.cpfCnpjInteressado}
              onChange={F('cpfCnpjInteressado')}
            />
          </div>
        </div>

        {/* Setor e Origem */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Setor de Abertura</label>
            <input
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="Protocolo Geral"
              value={form.setorOrigemNome}
              onChange={F('setorOrigemNome')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
            <select
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
              value={form.origem}
              onChange={F('origem')}
            >
              <option value="">Selecione...</option>
              <option value="PRESENCIAL">Presencial</option>
              <option value="ONLINE">Online</option>
              <option value="CORREIO">Correio</option>
              <option value="EMAIL">E-mail</option>
              <option value="INTERNO">Interno</option>
              <option value="EXTERNO">Externo</option>
            </select>
          </div>
        </div>

        {/* Prazo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prazo (opcional)</label>
          <input
            type="date"
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none"
            value={form.prazo}
            onChange={F('prazo')}
          />
        </div>

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
          <textarea
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
            rows={2}
            placeholder="Informações adicionais..."
            value={form.observacoes}
            onChange={F('observacoes')}
          />
        </div>

        {/* Botões */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={salvar}
            disabled={salvando || !form.assunto.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus2 className="w-4 h-4" />}
            Abrir Protocolo
          </button>
          <Link href="/gestao/protocolo"
            className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
            Cancelar
          </Link>
        </div>
      </div>

      {/* Informação */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
        <p className="text-xs text-blue-700">
          O número do protocolo será gerado automaticamente no formato <strong>AAAA/NNNNN</strong>.
          Após a abertura, você poderá registrar tramitações e despachos.
        </p>
      </div>
    </div>
  )
}
