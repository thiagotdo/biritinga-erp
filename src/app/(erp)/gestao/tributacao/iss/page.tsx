'use client'

import { useEffect, useState } from 'react'
import { Plus, FileText, TrendingUp, BarChart2 } from 'lucide-react'

type SituacaoISS = 'RASCUNHO' | 'EMITIDO' | 'PAGO' | 'VENCIDO' | 'CANCELADO' | 'INSCRITO_DA' | 'PARCELADO'

const SIT: Record<SituacaoISS, { label: string; cor: string; bg: string }> = {
  RASCUNHO:   { label: 'Rascunho',     cor: 'text-slate-500', bg: 'bg-slate-50'   },
  EMITIDO:    { label: 'Emitido',      cor: 'text-blue-700',  bg: 'bg-blue-50'    },
  PAGO:       { label: 'Pago',         cor: 'text-green-700', bg: 'bg-green-100'  },
  VENCIDO:    { label: 'Vencido',      cor: 'text-orange-700',bg: 'bg-orange-50'  },
  CANCELADO:  { label: 'Cancelado',    cor: 'text-slate-400', bg: 'bg-slate-50'   },
  INSCRITO_DA:{ label: 'Dívida Ativa', cor: 'text-red-700',   bg: 'bg-red-50'     },
  PARCELADO:  { label: 'Parcelado',    cor: 'text-purple-700',bg: 'bg-purple-50'  },
}

function ChipSit({ sit }: { sit: SituacaoISS }) {
  const s = SIT[sit]; return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.cor} ${s.bg}`}>{s.label}</span>
}

function moeda(v: number) { return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }

// ─── Gráfico mensal simples ───────────────────────────────────────────────────

function GraficoMensal({ dados }: { dados: { mes: string; valor: number }[] }) {
  if (!dados?.length) return null
  const max = Math.max(...dados.map(d => d.valor), 1)
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Arrecadação ISS — 12 meses</p>
      <div className="flex items-end gap-1 h-20">
        {dados.map((d, i) => {
          const h = Math.round((d.valor / max) * 100)
          const mesIdx = Number(d.mes.split('-')[1]) - 1
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-indigo-100 rounded-t-sm relative group" style={{ height: `${h}%`, minHeight: '2px' }}>
                <div className="w-full h-full bg-indigo-500 rounded-t-sm"/>
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                  {moeda(d.valor)}
                </div>
              </div>
              <span className="text-xs text-slate-400 leading-none">{meses[mesIdx]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Modal novo ISS ───────────────────────────────────────────────────────────

function ModalNovoISS({ onFechar, onSalvar }: { onFechar: () => void; onSalvar: (d: any) => void }) {
  const hoje = new Date().toISOString().split('T')[0]
  const anoMes = hoje.slice(0, 7)
  const [form, setForm] = useState({
    contribuinteId: '', competencia: anoMes, descricaoServico: '', cnae: '',
    baseCalculo: '', deducoes: '0', aliquota: '0.03', dataVencimento: hoje,
  })
  const [buscaContrib, setBuscaContrib] = useState('')
  const [contribs, setContribs] = useState<any[]>([])
  const [contribSel, setContribSel] = useState<any>(null)

  async function buscarContrib(q: string) {
    if (q.length < 2) return
    const res = await fetch(`/api/tributacao/contribuinte?busca=${encodeURIComponent(q)}`).then(r => r.json())
    setContribs(res.contribuintes ?? [])
  }

  const base = Number(form.baseCalculo) || 0
  const ded = Number(form.deducoes) || 0
  const aliq = Number(form.aliquota) || 0
  const iss = (base - ded) * aliq

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-slate-800">Novo Lançamento ISS</h2>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-xs text-blue-700">
            LC 116/2003 · Alíquota mín. 2% · máx. 5%
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Contribuinte (Prestador) *</label>
            {contribSel ? (
              <div className="mt-1 flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-indigo-800">{contribSel.nome ?? contribSel.razaoSocial}</span>
                <button onClick={() => { setContribSel(null); setForm(f => ({ ...f, contribuinteId: '' })) }} className="text-indigo-400 hover:text-indigo-600 text-xs">trocar</button>
              </div>
            ) : (
              <div className="relative mt-1">
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                  placeholder="Buscar por nome, CNPJ..."
                  value={buscaContrib} onChange={e => { setBuscaContrib(e.target.value); buscarContrib(e.target.value) }}/>
                {contribs.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto mt-1">
                    {contribs.map(c => (
                      <button key={c.id} onClick={() => { setContribSel(c); setForm(f => ({ ...f, contribuinteId: c.id })); setContribs([]) }}
                        className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm">
                        <span className="font-medium">{c.nome ?? c.razaoSocial}</span>
                        <span className="text-slate-400 text-xs ml-2">{c.cpf ?? c.cnpj}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Competência *</label>
              <input type="month" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.competencia} onChange={e => setForm(f => ({ ...f, competencia: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Vencimento *</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.dataVencimento} onChange={e => setForm(f => ({ ...f, dataVencimento: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Descrição do Serviço *</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
              value={form.descricaoServico} onChange={e => setForm(f => ({ ...f, descricaoServico: e.target.value }))} />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">CNAE</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
              placeholder="Ex: 7020-4/00" value={form.cnae} onChange={e => setForm(f => ({ ...f, cnae: e.target.value }))} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Base de Cálculo *</label>
              <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.baseCalculo} onChange={e => setForm(f => ({ ...f, baseCalculo: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Deduções</label>
              <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.deducoes} onChange={e => setForm(f => ({ ...f, deducoes: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Alíquota</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.aliquota} onChange={e => setForm(f => ({ ...f, aliquota: e.target.value }))}>
                <option value="0.02">2%</option>
                <option value="0.025">2,5%</option>
                <option value="0.03">3%</option>
                <option value="0.035">3,5%</option>
                <option value="0.04">4%</option>
                <option value="0.045">4,5%</option>
                <option value="0.05">5%</option>
              </select>
            </div>
          </div>

          {iss > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-indigo-700">Valor do ISS calculado:</span>
              <span className="text-lg font-bold text-indigo-800">{moeda(iss)}</span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button onClick={onFechar} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
          <button onClick={() => onSalvar({ ...form, baseCalculo: Number(form.baseCalculo), deducoes: Number(form.deducoes), aliquota: Number(form.aliquota) })}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
            Lançar ISS
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Painel lançamento ────────────────────────────────────────────────────────

function PainelISS({ lanc, onAcao }: { lanc: any; onAcao: (acao: string, extras?: any) => void }) {
  const [acao, setAcao] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})

  const acoes: Record<SituacaoISS, string[]> = {
    RASCUNHO:   ['EMITIR', 'CANCELAR'],
    EMITIDO:    ['REGISTRAR_PAGAMENTO', 'INSCREVER_DA', 'CANCELAR'],
    PAGO:       [],
    VENCIDO:    ['REGISTRAR_PAGAMENTO', 'INSCREVER_DA'],
    CANCELADO:  [],
    INSCRITO_DA:[],
    PARCELADO:  [],
  }

  async function enviar() { await onAcao(acao!, form); setAcao(null); setForm({}) }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-bold text-slate-500">{lanc.numero}</span>
              <ChipSit sit={lanc.situacao}/>
              <span className="text-xs text-slate-400">Competência {lanc.competencia}</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">{lanc.contribuinte?.nome ?? lanc.contribuinte?.razaoSocial}</p>
            <p className="text-xs text-slate-500">{lanc.descricaoServico}</p>
            {lanc.cnae && <p className="text-xs text-slate-400">CNAE: {lanc.cnae}</p>}
          </div>
          <div className="text-right text-sm shrink-0">
            <p className="text-xs text-slate-400">Valor ISS</p>
            <p className="text-xl font-bold text-slate-800">{moeda(lanc.valorISS)}</p>
            {lanc.valorPago > 0 && <p className="text-xs text-green-600">Pago: {moeda(lanc.valorPago)}</p>}
            <p className="text-xs text-slate-400 mt-1">Venc: {new Date(lanc.dataVencimento).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-3">
          <div><p className="text-slate-400">Base Cálculo</p><p className="font-semibold">{moeda(lanc.baseCalculo)}</p></div>
          <div><p className="text-slate-400">Alíquota</p><p className="font-semibold">{(lanc.aliquota * 100).toFixed(1)}%</p></div>
          <div><p className="text-slate-400">Deduções</p><p className="font-semibold">{moeda(lanc.deducoes ?? 0)}</p></div>
        </div>

        {(acoes[lanc.situacao] ?? []).length > 0 && !acao && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {(acoes[lanc.situacao] ?? []).map(a => (
              <button key={a} onClick={() => setAcao(a)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg text-white ${
                  a === 'CANCELAR' ? 'bg-red-500 hover:bg-red-600' :
                  a === 'INSCREVER_DA' ? 'bg-orange-600 hover:bg-orange-700' :
                  a === 'REGISTRAR_PAGAMENTO' ? 'bg-green-600 hover:bg-green-700' :
                  'bg-indigo-500 hover:bg-indigo-600'
                }`}>
                {a === 'EMITIR' ? 'Emitir' : a === 'REGISTRAR_PAGAMENTO' ? '💰 Registrar Pagamento' :
                 a === 'INSCREVER_DA' ? 'Inscrever em DA' : a === 'CANCELAR' ? 'Cancelar' : a}
              </button>
            ))}
          </div>
        )}

        {acao && (
          <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
            {acao === 'REGISTRAR_PAGAMENTO' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500">Valor Pago</label>
                  <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-0.5"
                    value={form.valorPago ?? ''} onChange={e => setForm(f => ({ ...f, valorPago: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Data Pagamento</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-0.5"
                    value={form.dataPagamento ?? new Date().toISOString().split('T')[0]}
                    onChange={e => setForm(f => ({ ...f, dataPagamento: e.target.value }))} />
                </div>
              </div>
            )}
            {(acao === 'CANCELAR') && (
              <div>
                <label className="text-xs text-slate-500">Motivo</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-0.5"
                  value={form.motivo ?? ''} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} />
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setAcao(null); setForm({}) }} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
              <button onClick={enviar} className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">Confirmar</button>
            </div>
          </div>
        )}
      </div>

      {lanc.dams?.length > 0 && (
        <div className="p-4 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">DAMs Vinculados</p>
          {lanc.dams.map((dam: any) => (
            <div key={dam.id} className="flex justify-between text-xs bg-slate-50 rounded px-3 py-2 mb-1">
              <span className="font-mono font-semibold">{dam.numero}</span>
              <span className="text-slate-400">{new Date(dam.dataVencimento).toLocaleDateString('pt-BR')}</span>
              <span className={dam.situacao === 'PAGO' ? 'text-green-600' : dam.situacao === 'VENCIDO' ? 'text-red-500' : 'text-orange-500'}>{dam.situacao}</span>
              <span>{moeda(dam.valorTotal)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ISSPage() {
  const [lancamentos, setLancamentos] = useState<any[]>([])
  const [kpis, setKpis] = useState<any>(null)
  const [grafico, setGrafico] = useState<any[]>([])
  const [selecionado, setSelecionado] = useState<any>(null)
  const [filtroSit, setFiltroSit] = useState('')
  const [filtromes, setFiltromes] = useState('')
  const [modal, setModal] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 4000) }

  async function carregar() {
    setCarregando(true)
    const p = new URLSearchParams()
    if (filtroSit) p.set('situacao', filtroSit)
    if (filtromes) p.set('mes', filtromes)
    const [resL, resDash] = await Promise.all([
      fetch(`/api/tributacao/iss?${p}`).then(r => r.json()),
      fetch('/api/tributacao/iss?relatorio=DASHBOARD').then(r => r.json()),
    ])
    setLancamentos(resL.lancamentos ?? [])
    setKpis(resDash.kpis ?? null)
    setGrafico(resDash.porCompetencia ?? [])
    setCarregando(false)
  }

  async function carregarDetalhe(id: string) {
    const res = await fetch(`/api/tributacao/iss?id=${id}`).then(r => r.json())
    setSelecionado(res.lancamento)
  }

  async function executarAcao(acao: string, extras?: any) {
    if (!selecionado) return
    const res = await fetch('/api/tributacao/iss', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selecionado.id, acao, ...extras }),
    })
    if (res.ok) { showToast('✅ Ação realizada com sucesso'); carregarDetalhe(selecionado.id); carregar() }
  }

  async function salvarNovoISS(d: any) {
    setModal(false)
    const res = await fetch('/api/tributacao/iss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d),
    })
    if (res.ok) { showToast('✅ Lançamento ISS criado'); carregar() }
  }

  useEffect(() => { carregar() }, [filtroSit, filtromes])

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {toast && <div className="fixed top-5 right-5 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">{toast}</div>}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">ISS</h1>
            <p className="text-sm text-slate-500 mt-0.5">Imposto Sobre Serviços · LC 116/2003 · Alíquota 2%–5%</p>
          </div>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 shadow-sm">
            <Plus size={16}/> Novo Lançamento ISS
          </button>
        </div>

        {kpis && (
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Emitidos Mês',   val: kpis.totalMes,        cor: 'bg-white border border-slate-200' },
              { label: 'Arrecadado Mês', val: moeda(kpis.arrecadadoMes), cor: 'bg-green-50 border border-green-200' },
              { label: 'Vencidos',       val: moeda(kpis.vencidoTotal), cor: kpis.vencidoTotal > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-white border border-slate-200' },
              { label: 'Emitidos Mês',   val: kpis.emitidosMes,     cor: 'bg-white border border-slate-200' },
            ].map(({ label, val, cor }, i) => (
              <div key={i} className={`${cor} rounded-xl p-3 text-center`}>
                <p className="text-lg font-bold text-slate-800">{val}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {grafico.length > 0 && <GraficoMensal dados={grafico}/>}

        <div className="flex gap-3 mb-5 flex-wrap">
          <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
            value={filtroSit} onChange={e => setFiltroSit(e.target.value)}>
            <option value="">Todas situações</option>
            {(Object.entries(SIT) as [SituacaoISS, any][]).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
          </select>
          <input type="month" className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
            value={filtromes} onChange={e => setFiltromes(e.target.value)} placeholder="Competência"/>
        </div>

        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-5 space-y-2">
            {carregando ? <div className="text-center py-12 text-slate-400">Carregando…</div>
            : lancamentos.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FileText size={28} className="mx-auto mb-2 opacity-30"/>
                <p>Nenhum lançamento encontrado.</p>
              </div>
            ) : lancamentos.map(l => (
              <button key={l.id} onClick={() => { setSelecionado(null); carregarDetalhe(l.id) }}
                className={`w-full text-left bg-white border rounded-xl p-3 hover:shadow-sm transition-all ${
                  selecionado?.id === l.id ? 'border-indigo-400 ring-2 ring-indigo-100' :
                  l.situacao === 'VENCIDO' ? 'border-orange-200' :
                  l.situacao === 'INSCRITO_DA' ? 'border-red-200' : 'border-slate-200'
                }`}>
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <ChipSit sit={l.situacao}/>
                      <span className="font-mono text-xs text-slate-400">{l.numero}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 truncate">{l.contribuinte?.nome ?? l.contribuinte?.razaoSocial}</p>
                    <p className="text-xs text-slate-500 truncate">{l.descricaoServico}</p>
                    <p className="text-xs text-slate-400">Competência {l.competencia}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-800">{moeda(l.valorISS)}</p>
                    {l.valorPago > 0 && <p className="text-xs text-green-600">{moeda(l.valorPago)}</p>}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="col-span-7">
            {selecionado ? (
              <PainelISS lanc={selecionado} onAcao={executarAcao}/>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl flex items-center justify-center h-64 text-slate-400">
                <div className="text-center"><FileText size={28} className="mx-auto mb-2 opacity-30"/><p className="text-sm">Selecione um lançamento</p></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {modal && <ModalNovoISS onFechar={() => setModal(false)} onSalvar={salvarNovoISS}/>}
    </div>
  )
}
