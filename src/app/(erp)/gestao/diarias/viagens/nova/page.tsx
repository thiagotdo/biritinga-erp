'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plane, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

const TRANSPORTE_OPTIONS = [
  { v:'VEICULO_OFICIAL', l:'Veículo Oficial' },
  { v:'VEICULO_PROPRIO', l:'Veículo Próprio' },
  { v:'ONIBUS',          l:'Ônibus' },
  { v:'AVIAO',           l:'Avião' },
  { v:'OUTRO',           l:'Outro' },
]

export default function NovaViagem() {
  const router = useRouter()
  const [form, setForm] = useState({
    servidorNome: '', servidorCargo: '', servidorMatricula: '',
    destino: '', municipioDestino: '', estadoDestino: 'BA',
    objetivo: '', dataPartida: '', dataRetorno: '',
    quantidadeDiarias: '1', valorDiaria: '0',
    adiantamento: '0', meioDTransporte: 'VEICULO_OFICIAL',
    numeroEmpenho: '', observacoes: '',
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const valorTotal = Number(form.quantidadeDiarias) * Number(form.valorDiaria)
  const saldo = Number(form.adiantamento) - valorTotal

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true); setErro(''); setSucesso('')
    try {
      const r = await fetch('/api/diarias/viagem', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          ...form,
          quantidadeDiarias: Number(form.quantidadeDiarias),
          valorDiaria: Number(form.valorDiaria),
          adiantamento: Number(form.adiantamento),
        })
      })
      const d = await r.json()
      if (!r.ok) { setErro(d.erro ?? 'Erro ao salvar'); setSalvando(false); return }
      setSucesso(`Viagem ${d.numero} registrada com sucesso!`)
      setTimeout(() => router.push('/gestao/diarias/viagens'), 1500)
    } catch (err: any) {
      setErro(err.message)
      setSalvando(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/gestao/diarias/viagens" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Plane className="w-5 h-5 text-sky-600" />
            Nova Viagem / Diária
          </h1>
          <p className="text-sm text-gray-500">Registre um novo deslocamento oficial</p>
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
        {/* Servidor */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Servidor</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome do Servidor *</label>
              <input required className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-sky-500"
                value={form.servidorNome} onChange={e => set('servidorNome', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cargo / Função</label>
              <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-sky-500"
                value={form.servidorCargo} onChange={e => set('servidorCargo', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Matrícula</label>
              <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-sky-500"
                value={form.servidorMatricula} onChange={e => set('servidorMatricula', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Destino */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Destino</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Cidade de Destino *</label>
              <input required className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-sky-500"
                value={form.destino} onChange={e => set('destino', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
              <input maxLength={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-sky-500 uppercase"
                value={form.estadoDestino} onChange={e => set('estadoDestino', e.target.value.toUpperCase())} />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Objetivo da Viagem *</label>
              <textarea required rows={3} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-sky-500 resize-none"
                placeholder="Descreva o objetivo oficial da viagem..."
                value={form.objetivo} onChange={e => set('objetivo', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Datas e Diárias */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Período e Diárias</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data de Partida *</label>
              <input required type="date" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-sky-500"
                value={form.dataPartida} onChange={e => set('dataPartida', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data de Retorno *</label>
              <input required type="date" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-sky-500"
                value={form.dataRetorno} onChange={e => set('dataRetorno', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Qtd. Diárias *</label>
              <input required type="number" min="0.5" step="0.5" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-sky-500"
                value={form.quantidadeDiarias} onChange={e => set('quantidadeDiarias', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor/Diária (R$)</label>
              <input type="number" min="0" step="0.01" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-sky-500"
                value={form.valorDiaria} onChange={e => set('valorDiaria', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Adiantamento (R$)</label>
              <input type="number" min="0" step="0.01" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-sky-500"
                value={form.adiantamento} onChange={e => set('adiantamento', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Meio de Transporte</label>
              <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                value={form.meioDTransporte} onChange={e => set('meioDTransporte', e.target.value)}>
                {TRANSPORTE_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          </div>
          {/* Resumo financeiro */}
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <p className="text-xs text-sky-500 font-medium">Valor Total</p>
              <p className="font-bold text-sky-800">
                {valorTotal.toLocaleString('pt-BR', { style:'currency', currency:'BRL' })}
              </p>
            </div>
            <div>
              <p className="text-xs text-sky-500 font-medium">Adiantamento</p>
              <p className="font-bold text-sky-800">
                {Number(form.adiantamento).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })}
              </p>
            </div>
            <div>
              <p className="text-xs text-sky-500 font-medium">Saldo</p>
              <p className={`font-bold ${saldo >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {saldo.toLocaleString('pt-BR', { style:'currency', currency:'BRL' })}
              </p>
            </div>
          </div>
        </div>

        {/* Empenho / Observações */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Informações Complementares</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Número do Empenho</label>
              <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="Ex.: 2026NE0042"
                value={form.numeroEmpenho} onChange={e => set('numeroEmpenho', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
            <textarea rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-sky-500 resize-none"
              value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={salvando}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 disabled:opacity-50 font-medium">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plane className="w-4 h-4" />}
            {salvando ? 'Registrando...' : 'Registrar Viagem'}
          </button>
          <Link href="/gestao/diarias/viagens"
            className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm flex items-center">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
