'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MessageSquare, Loader2, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function NovaManifestacaoPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    tipo: 'RECLAMACAO',
    assunto: '',
    descricao: '',
    categoria: '',
    nomeRequerente: '',
    cpfRequerente: '',
    emailRequerente: '',
    telefoneRequerente: '',
    anonimo: false,
    sigiloso: false,
    setorResponsavel: 'Ouvidoria',
  })
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso]   = useState('')
  const [erro, setErro]         = useState('')

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))
  const FB = (k: string) => () => setForm(f => ({ ...f, [k]: !(f as any)[k] }))

  const salvar = async () => {
    if (!form.assunto.trim()) { setErro('O assunto é obrigatório.'); return }
    setSalvando(true)
    setErro('')
    const r = await fetch('/api/ouvidoria/manifestacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const d = await r.json()
    setSalvando(false)
    if (r.ok) {
      setSucesso(`Manifestação ${d.numero} registrada com sucesso!`)
      setTimeout(() => router.push('/gestao/ouvidoria/manifestacoes'), 2200)
    } else {
      setErro(d.erro ?? 'Erro ao registrar manifestação')
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
        <Link href="/gestao/ouvidoria" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-600" />
            Nova Manifestação
          </h1>
          <p className="text-sm text-gray-500">Registrar reclamação, sugestão, denúncia ou pedido de informação</p>
        </div>
      </div>

      {erro && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{erro}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">

        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Manifestação</label>
          <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-purple-500"
            value={form.tipo} onChange={F('tipo')}>
            <option value="RECLAMACAO">Reclamação</option>
            <option value="SUGESTAO">Sugestão</option>
            <option value="ELOGIO">Elogio</option>
            <option value="DENUNCIA">Denúncia</option>
            <option value="SOLICITACAO_LAI">Solicitação LAI (Lei de Acesso à Informação)</option>
            <option value="PEDIDO_INFORMACAO">Pedido de Informação</option>
          </select>
        </div>

        {/* Assunto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assunto / Descrição resumida <span className="text-red-500">*</span>
          </label>
          <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-500 outline-none"
            placeholder="Ex: Problema no calçamento da Rua Principal"
            value={form.assunto} onChange={F('assunto')} />
        </div>

        {/* Detalhes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Detalhamento</label>
          <textarea className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-500 outline-none resize-none"
            rows={4} placeholder="Descreva com mais detalhes a manifestação..."
            value={form.descricao} onChange={F('descricao')} />
        </div>

        {/* Setor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Setor Responsável</label>
          <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-purple-500"
            value={form.setorResponsavel} onChange={F('setorResponsavel')}>
            <option>Ouvidoria</option>
            <option>Secretaria de Administração</option>
            <option>Secretaria de Obras</option>
            <option>Secretaria de Saúde</option>
            <option>Secretaria de Educação</option>
            <option>Secretaria de Finanças</option>
            <option>Secretaria de Meio Ambiente</option>
            <option>Secretaria de Assistência Social</option>
          </select>
        </div>

        {/* Anônimo / Sigiloso */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.anonimo} onChange={FB('anonimo')}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
            <span className="text-sm text-gray-700">Manifestação Anônima</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.sigiloso} onChange={FB('sigiloso')}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
            <span className="text-sm text-gray-700">Sigiloso</span>
          </label>
        </div>

        {/* Dados do requerente */}
        {!form.anonimo && (
          <div className="border-t border-gray-100 pt-4 space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Dados do Requerente</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome Completo</label>
                <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-500 outline-none"
                  placeholder="Nome do cidadão ou responsável"
                  value={form.nomeRequerente} onChange={F('nomeRequerente')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">CPF</label>
                <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-500 outline-none"
                  placeholder="000.000.000-00"
                  value={form.cpfRequerente} onChange={F('cpfRequerente')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
                <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-500 outline-none"
                  placeholder="(75) 9 0000-0000"
                  value={form.telefoneRequerente} onChange={F('telefoneRequerente')} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
                <input type="email" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-purple-500 outline-none"
                  placeholder="email@exemplo.com"
                  value={form.emailRequerente} onChange={F('emailRequerente')} />
              </div>
            </div>
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-3 pt-2">
          <button onClick={salvar} disabled={salvando || !form.assunto.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            Registrar Manifestação
          </button>
          <Link href="/gestao/ouvidoria"
            className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
            Cancelar
          </Link>
        </div>
      </div>

      <div className="mt-4 p-3 bg-purple-50 border border-purple-100 rounded-lg">
        <p className="text-xs text-purple-700">
          O prazo padrão para resposta é de <strong>20 dias úteis</strong>. Manifestações sigilosas têm seus dados protegidos.
          O número de protocolo é gerado automaticamente.
        </p>
      </div>
    </div>
  )
}
