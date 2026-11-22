'use client'
import { useState, useEffect, useCallback } from 'react'
import { UtensilsCrossed, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react'

type CardapioItem = {
  id: string; diaSemana: number; turno: string; categoria: string; descricao: string; calorias: number
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIAS_UTEIS = [1, 2, 3, 4, 5]
const TURNO_LABEL: Record<string, string> = {
  MATUTINO: 'Manhã', VESPERTINO: 'Tarde', INTEGRAL: 'Integral',
}
const CATEGORIA_LABEL: Record<string, string> = {
  CAFE_DA_MANHA: 'Café da Manhã', ALMOCO: 'Almoço',
  LANCHE_TARDE: 'Lanche Tarde', JANTAR: 'Jantar',
}

function getSegunda(d: Date): string {
  const dia = d.getDay()
  const diff = d.getDate() - dia + (dia === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}

function ModalItem({ semana, onSalvar, onClose }: {
  semana: string; onSalvar: (d: any) => void; onClose: () => void
}) {
  const [form, setForm] = useState({
    diaSemana: 1, turno: 'MATUTINO',
    categoria: 'CAFE_DA_MANHA', descricao: '', calorias: '',
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Adicionar Item ao Cardápio</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Dia da Semana</label>
              <select value={form.diaSemana} onChange={e => set('diaSemana', +e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none">
                {DIAS_UTEIS.map(d => <option key={d} value={d}>{DIAS[d]}-feira</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Turno</label>
              <select value={form.turno} onChange={e => set('turno', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none">
                {Object.entries(TURNO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Categoria</label>
            <select value={form.categoria} onChange={e => set('categoria', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none">
              {Object.entries(CATEGORIA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Descrição *</label>
            <textarea value={form.descricao} onChange={e => set('descricao', e.target.value)}
              rows={3}
              placeholder="Ex: Arroz, feijão, frango grelhado, salada de alface..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Calorias (kcal)</label>
            <input type="number" min={0} value={form.calorias} onChange={e => set('calorias', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none" />
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancelar</button>
          <button
            onClick={() => { if (form.descricao) onSalvar({ ...form, semana }) }}
            disabled={!form.descricao}
            className="px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ background: 'var(--cor-primaria)' }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MerendaPage() {
  const hoje = new Date()
  const [semana, setSemana] = useState(getSegunda(hoje))
  const [dias, setDias] = useState<Record<number, CardapioItem[]>>({})
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [modal, setModal] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true); setErro('')
    try {
      const r = await fetch(`/api/educacao/merenda?semana=${semana}`)
      const d = await r.json()
      if (d.erro) throw new Error(d.erro)
      const diasData: Record<number, CardapioItem[]> = {}
      DIAS_UTEIS.forEach(d => { diasData[d] = [] })
      Object.entries(d.dias ?? {}).forEach(([k, v]) => { diasData[Number(k)] = v as CardapioItem[] })
      setDias(diasData)
    } catch (e: any) { setErro(e.message) }
    finally { setLoading(false) }
  }, [semana])

  useEffect(() => { carregar() }, [carregar])

  function navSemana(delta: number) {
    const d = new Date(semana + 'T12:00:00')
    d.setDate(d.getDate() + delta * 7)
    setSemana(d.toISOString().split('T')[0])
  }

  async function salvar(dados: any) {
    try {
      const r = await fetch('/api/educacao/merenda', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      })
      const d = await r.json()
      if (d.erro) throw new Error(d.erro)
      setModal(false); carregar()
    } catch (e: any) { alert(e.message) }
  }

  const dataFim = new Date(semana + 'T12:00:00')
  dataFim.setDate(dataFim.getDate() + 4)
  const semanaLabel = `${new Date(semana + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${dataFim.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      {modal && <ModalItem semana={semana} onSalvar={salvar} onClose={() => setModal(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <a href="/gestao/educacao" className="hover:underline">Educação</a>
            <span>›</span><span>Merenda</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Cardápio da Merenda</h1>
          <p className="text-sm text-gray-500">Programação semanal - {semanaLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg">
            <button onClick={() => navSemana(-1)} className="p-2 hover:bg-gray-50"><ChevronLeft size={16} /></button>
            <span className="px-3 text-sm font-medium text-gray-700">{semanaLabel}</span>
            <button onClick={() => navSemana(1)} className="p-2 hover:bg-gray-50"><ChevronRight size={16} /></button>
          </div>
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm"
            style={{ background: 'var(--cor-primaria)' }}
          >
            <Plus size={16} /> Adicionar
          </button>
        </div>
      </div>

      {erro && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{erro}</div>}

      {loading ? (
        <div className="grid grid-cols-5 gap-3">
          {DIAS_UTEIS.map(d => (
            <div key={d} className="bg-white rounded-xl border border-gray-100 p-4 h-48 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {DIAS_UTEIS.map(d => {
            const itens = dias[d] ?? []
            return (
              <div key={d} className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100" style={{ background: 'var(--cor-primaria)08' }}>
                  <p className="font-semibold text-sm text-gray-800">{DIAS[d]}-feira</p>
                </div>
                <div className="p-3 space-y-2 min-h-[120px]">
                  {!itens.length ? (
                    <p className="text-xs text-gray-300 text-center pt-4">Sem cardápio</p>
                  ) : itens.map(item => (
                    <div key={item.id} className="p-2 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-xs font-medium" style={{ color: 'var(--cor-primaria)' }}>
                          {CATEGORIA_LABEL[item.categoria] ?? item.categoria}
                        </span>
                        {item.calorias > 0 && (
                          <span className="text-xs text-gray-400 ml-auto">{item.calorias} kcal</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{item.descricao}</p>
                      <p className="text-xs text-gray-400 mt-1">{TURNO_LABEL[item.turno] ?? item.turno}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
