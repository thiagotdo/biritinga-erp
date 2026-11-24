'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Handshake, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

const STATUS_OPTIONS = [
  { v:'CELEBRADO', l:'Celebrado (assinado, não iniciado)' },
  { v:'VIGENTE', l:'Vigente' },
  { v:'EM_EXECUCAO', l:'Em Execução' },
]

const SECRETARIAS = [
  'SEMOSP', 'SMS', 'SEMED', 'SEMAD', 'SEFIN', 'SECOM',
  'Secretaria de Esporte', 'SEAGRI Municipal', 'Gabinete',
]

export default function NovoConvenio() {
  const router = useRouter()
  const [form, setForm] = useState({
    objeto:'', concedente:'', orgaoConcedente:'',
    programaFederal:'', processoSEI:'',
    valorTotal:'0', valorRepasse:'0', valorContrapartida:'0',
    dataAssinatura:'', dataInicio:'', dataFim:'',
    status:'CELEBRADO', secretariaExecutora:'', observacoes:'',
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true); setErro(''); setSucesso('')
    try {
      const r = await fetch('/api/convenios/convenio', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          ...form,
          valorTotal: Number(form.valorTotal),
          valorRepasse: Number(form.valorRepasse),
          valorContrapartida: Number(form.valorContrapartida),
        })
      })
      const d = await r.json()
      if (!r.ok) { setErro(d.erro ?? 'Erro ao salvar'); setSalvando(false); return }
      setSucesso(`Convênio ${d.numero} registrado com sucesso!`)
      setTimeout(() => router.push('/gestao/convenios/lista'), 1500)
    } catch (err: any) {
      setErro(err.message)
      setSalvando(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/gestao/convenios" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Handshake className="w-5 h-5 text-indigo-600" />
            Novo Convênio
          </h1>
          <p className="text-sm text-gray-500">Registre um convênio ou parceria institucional</p>
        </div>
      </div>

      {sucesso && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle2 className="w-4 h-4" /> {sucesso}
        </div>
      )}
      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{erro}</div>
      )}

      <form onSubmit={salvar} className="space-y-6">
        {/* Objeto */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Objeto</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Objeto / Descrição *</label>
            <textarea required rows={3} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              placeholder="Descreva o objeto do convênio..."
              value={form.objeto} onChange={e => set('objeto', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Situação</label>
              <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Secretaria Executora</label>
              <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                value={form.secretariaExecutora} onChange={e => set('secretariaExecutora', e.target.value)}>
                <option value="">Selecione...</option>
                {SECRETARIAS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Concedente */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Concedente</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Concedente *</label>
              <input required className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Ex.: Ministério da Saúde"
                value={form.concedente} onChange={e => set('concedente', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Órgão Concedente (Sigla)</label>
              <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Ex.: FNS, FNDE, SESAB"
                value={form.orgaoConcedente} onChange={e => set('orgaoConcedente', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Programa Federal / Estadual</label>
              <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Ex.: PAC 2026, ProInfância, Requalifica UBS..."
                value={form.programaFederal} onChange={e => set('programaFederal', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Processo SEI / SIAFI</label>
              <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500"
                value={form.processoSEI} onChange={e => set('processoSEI', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Valores */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Valores (R$)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { k:'valorTotal',        l:'Valor Total' },
              { k:'valorRepasse',      l:'Repasse Externo' },
              { k:'valorContrapartida',l:'Contrapartida Municipal' },
            ].map(({ k, l }) => (
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input type="number" min="0" step="0.01" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500"
                  value={(form as any)[k]} onChange={e => set(k, e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        {/* Datas */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Datas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { k:'dataAssinatura', l:'Data de Assinatura', req:false },
              { k:'dataInicio',     l:'Início da Vigência', req:true  },
              { k:'dataFim',        l:'Fim da Vigência',    req:true  },
            ].map(({ k, l, req }) => (
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}{req ? ' *' : ''}</label>
                <input required={req} type="date" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500"
                  value={(form as any)[k]} onChange={e => set(k, e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        {/* Observações */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
          <textarea rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={salvando}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-medium">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Handshake className="w-4 h-4" />}
            {salvando ? 'Registrando...' : 'Registrar Convênio'}
          </button>
          <Link href="/gestao/convenios"
            className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm flex items-center">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
