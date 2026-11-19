'use client'

import { useState, useEffect, useCallback } from 'react'
import { PlusCircle, Search, ChevronDown, X, Eye, CheckCircle, DollarSign, Ban } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface EmpenhoResumo {
  id: string
  numero: string
  situacao: string
  modalidade: string
  credorNome: string
  credorCpfCnpj: string
  valorOriginal: number
  valorLiquidado: number
  valorPago: number
  valorAnulado: number
  competencia: string
  dataEmissao: string
  dataVencimento?: string
  descricao: string
  contratoNumero?: string
  processoNumero?: string
  dotacao: { codigo: string; descricao: string; secretaria?: string }
}

interface Resumo {
  totalEmitido: number
  totalLiquidado: number
  totalPago: number
  totalEmpenhos: number
  porSituacao: Array<{ situacao: string; total: number; valor: number }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const SITUACAO_INFO: Record<string, { label: string; cor: string; bg: string }> = {
  EMITIDO:     { label: 'Emitido',     cor: 'text-amber-700',   bg: 'bg-amber-50' },
  LIQUIDADO:   { label: 'Liquidado',   cor: 'text-blue-700',    bg: 'bg-blue-50' },
  PAGO:        { label: 'Pago',        cor: 'text-emerald-700', bg: 'bg-emerald-50' },
  ANULADO:     { label: 'Anulado',     cor: 'text-red-600',     bg: 'bg-red-50' },
  INSCRITO_RP: { label: 'Restos a Pagar', cor: 'text-purple-700', bg: 'bg-purple-50' },
}

function competenciaLabel(c: string) {
  const [ano, mes] = c.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${nomes[Number(mes)-1]}/${ano}`
}

// ─── Modal emitir empenho ─────────────────────────────────────────────────────

function ModalEmpenho({ onClose, onSalvar }: { onClose: () => void; onSalvar: () => void }) {
  const hoje = new Date()
  const [form, setForm] = useState({
    dotacaoId: '', modalidade: 'ORDINARIO', credorNome: '', credorCpfCnpj: '',
    credorBanco: '', credorAgencia: '', credorConta: '', credorPix: '',
    valorOriginal: '', contratoNumero: '', licitacaoNumero: '', processoNumero: '',
    notaFiscal: '', descricao: '', dataVencimento: '',
    competencia: `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}`,
    observacoes: '',
  })
  const [dotacoes, setDotacoes] = useState<any[]>([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    // Carrega dotações vigentes
    fetch(`/api/sefin/orcamento?exercicio=${hoje.getFullYear()}`)
      .then(r => r.json())
      .then(d => setDotacoes(d.dotacoes ?? []))
  }, [])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({...f, [k]: e.target.value}))

  async function salvar() {
    setSalvando(true); setErro('')
    try {
      const r = await fetch('/api/sefin/empenho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, valorOriginal: Number(form.valorOriginal) }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.erro ?? 'Erro') }
      onSalvar()
    } catch (e: any) { setErro(e.message) }
    setSalvando(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-slate-800">Emitir Empenho</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dotação</label>
            <select value={form.dotacaoId} onChange={set('dotacaoId')}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Selecionar dotação…</option>
              {dotacoes.map((d: any) => (
                <option key={d.id} value={d.id}>{d.codigo} — {d.descricao} ({moeda(d.valorAtual - d.valorEmpenhado)} disponível)</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Modalidade</label>
              <select value={form.modalidade} onChange={set('modalidade')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['ORDINARIO','ESTIMATIVA','GLOBAL'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Competência</label>
              <input type="month" value={form.competencia} onChange={set('competencia')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Credor</label>
              <input type="text" value={form.credorNome} onChange={set('credorNome')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CPF / CNPJ</label>
              <input type="text" value={form.credorCpfCnpj} onChange={set('credorCpfCnpj')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Banco</label>
              <input type="text" value={form.credorBanco} onChange={set('credorBanco')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Agência</label>
              <input type="text" value={form.credorAgencia} onChange={set('credorAgencia')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Conta</label>
              <input type="text" value={form.credorConta} onChange={set('credorConta')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">PIX</label>
            <input type="text" value={form.credorPix} onChange={set('credorPix')}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
              <input type="number" value={form.valorOriginal} onChange={set('valorOriginal')} placeholder="0.00"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vencimento</label>
              <input type="date" value={form.dataVencimento} onChange={set('dataVencimento')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[['Contrato', 'contratoNumero'], ['Licitação', 'licitacaoNumero'], ['Processo', 'processoNumero']].map(([l, k]) => (
              <div key={k}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{l}</label>
                <input type="text" value={(form as any)[k]} onChange={set(k)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição do objeto *</label>
            <textarea value={form.descricao} onChange={set('descricao')} rows={2} placeholder="Descrição detalhada do bem/serviço contratado"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
          </div>
          {erro && <p className="text-red-600 text-sm">{erro}</p>}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {salvando ? 'Emitindo…' : 'Emitir Empenho'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal tramitar ───────────────────────────────────────────────────────────

function ModalTramitar({ empenho, onClose, onSalvar }: { empenho: EmpenhoResumo; onClose: () => void; onSalvar: () => void }) {
  const [acao, setAcao]   = useState<'LIQUIDAR'|'PAGAR'|'ANULAR'>('LIQUIDAR')
  const [form, setForm]   = useState({ valor: '', notaFiscal: '', dataDocumento: '', tipoPagamento: 'PIX', autenticacao: '', motivoAnulacao: '', descricao: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]   = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({...f, [k]: e.target.value}))

  const acoesDisponiveis: Array<'LIQUIDAR'|'PAGAR'|'ANULAR'> = empenho.situacao === 'EMITIDO'
    ? ['LIQUIDAR','ANULAR']
    : empenho.situacao === 'LIQUIDADO'
    ? ['PAGAR','ANULAR']
    : ['ANULAR']

  async function tramitar() {
    setSalvando(true); setErro('')
    try {
      const r = await fetch('/api/sefin/empenho', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: empenho.id, acao, ...form, valor: Number(form.valor) }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.erro ?? 'Erro') }
      onSalvar()
    } catch (e: any) { setErro(e.message) }
    setSalvando(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-slate-800">Tramitar · {empenho.numero}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Ação</label>
            <div className="flex gap-2">
              {acoesDisponiveis.map(a => (
                <button key={a} onClick={() => setAcao(a)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${acao === a ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'}`}>
                  {a === 'LIQUIDAR' ? 'Liquidar' : a === 'PAGAR' ? 'Pagar' : 'Anular'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
            <input type="number" value={form.valor} onChange={set('valor')} placeholder="0.00"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          {acao === 'LIQUIDAR' && <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nota Fiscal</label>
              <input type="text" value={form.notaFiscal} onChange={set('notaFiscal')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data do Documento</label>
              <input type="date" value={form.dataDocumento} onChange={set('dataDocumento')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </>}
          {acao === 'PAGAR' && <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Pagamento</label>
              <select value={form.tipoPagamento} onChange={set('tipoPagamento')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['PIX','TRANSFERENCIA_BANCARIA','BOLETO','CHEQUE','DINHEIRO'].map(t => (
                  <option key={t} value={t}>{t.replace(/_/g,' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Autenticação</label>
              <input type="text" value={form.autenticacao} onChange={set('autenticacao')} placeholder="ID da transação / TED"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </>}
          {acao === 'ANULAR' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Motivo da Anulação</label>
              <textarea value={form.motivoAnulacao} onChange={set('motivoAnulacao')} rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
            </div>
          )}
          {erro && <p className="text-red-600 text-sm">{erro}</p>}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button onClick={tramitar} disabled={salvando} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {salvando ? 'Salvando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Painel de empenho ────────────────────────────────────────────────────────

function PainelEmpenho({ empenho, onFechar, onAtualizar }: { empenho: EmpenhoResumo; onFechar: () => void; onAtualizar: () => void }) {
  const [detalhe, setDetalhe]       = useState<any>(null)
  const [showTramitar, setShowTramitar] = useState(false)
  const sit = SITUACAO_INFO[empenho.situacao]

  useEffect(() => {
    fetch(`/api/sefin/empenho?id=${empenho.id}`).then(r => r.json()).then(d => setDetalhe(d.empenho))
  }, [empenho.id])

  const saldoLiquidar = empenho.valorOriginal - empenho.valorLiquidado - empenho.valorAnulado
  const saldoPagar    = empenho.valorLiquidado - empenho.valorPago
  const podeTramitar  = !['PAGO','ANULADO'].includes(empenho.situacao)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onFechar}/>
      <aside className="fixed right-0 top-0 h-full w-96 z-50 bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex justify-between items-start">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">{empenho.dotacao?.secretaria ?? '—'}</p>
            <h2 className="font-bold text-slate-800">{empenho.numero}</h2>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sit.bg} ${sit.cor}`}>{sit.label}</span>
          </div>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 mt-1"><X size={18}/></button>
        </div>

        <div className="p-4 space-y-5">
          {/* Credor */}
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Credor</p>
            <p className="font-medium text-slate-800">{empenho.credorNome}</p>
            <p className="text-sm text-slate-500">{empenho.credorCpfCnpj}</p>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Valor Original',    valor: empenho.valorOriginal,  cor: 'text-slate-700' },
              { label: 'A Liquidar',        valor: saldoLiquidar,          cor: 'text-amber-700'  },
              { label: 'Liquidado',         valor: empenho.valorLiquidado, cor: 'text-blue-700'   },
              { label: 'Pago',              valor: empenho.valorPago,      cor: 'text-emerald-700' },
            ].map(item => (
              <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-0.5">{item.label}</p>
                <p className={`text-sm font-bold ${item.cor}`}>{moeda(item.valor)}</p>
              </div>
            ))}
          </div>

          {/* Referências */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Referências</p>
            <div className="text-sm space-y-1">
              {empenho.contratoNumero && <div className="flex justify-between"><span className="text-slate-500">Contrato</span><span className="font-medium">{empenho.contratoNumero}</span></div>}
              {empenho.processoNumero && <div className="flex justify-between"><span className="text-slate-500">Processo</span><span className="font-medium">{empenho.processoNumero}</span></div>}
              <div className="flex justify-between"><span className="text-slate-500">Competência</span><span>{competenciaLabel(empenho.competencia)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Modalidade</span><span>{empenho.modalidade}</span></div>
            </div>
          </div>

          {/* Histórico de liquidações */}
          {detalhe?.liquidacoes?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Liquidações</p>
              {detalhe.liquidacoes.map((l: any) => (
                <div key={l.id} className="flex justify-between text-sm py-1 border-b border-slate-50">
                  <span className="text-slate-600">{l.tipo} · {l.notaFiscal ?? '—'}</span>
                  <span className="font-medium text-blue-700">{moeda(Number(l.valor))}</span>
                </div>
              ))}
            </div>
          )}

          {/* Histórico de pagamentos */}
          {detalhe?.pagamentos?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Pagamentos</p>
              {detalhe.pagamentos.map((p: any) => (
                <div key={p.id} className="flex justify-between text-sm py-1 border-b border-slate-50">
                  <span className="text-slate-600">{p.tipo} · {p.autenticacao ?? '—'}</span>
                  <span className="font-medium text-emerald-700">{moeda(Number(p.valor))}</span>
                </div>
              ))}
            </div>
          )}

          {/* Descrição */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Descrição</p>
            <p className="text-sm text-slate-700">{empenho.descricao}</p>
          </div>

          {/* Ações */}
          {podeTramitar && (
            <button onClick={() => setShowTramitar(true)}
              className="w-full py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Tramitar Empenho
            </button>
          )}
        </div>
      </aside>

      {showTramitar && (
        <ModalTramitar empenho={empenho} onClose={() => setShowTramitar(false)}
          onSalvar={() => { setShowTramitar(false); onAtualizar() }}/>
      )}
    </>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function EmpenhoPage() {
  const [empenhos, setEmpenhos]       = useState<EmpenhoResumo[]>([])
  const [resumo, setResumo]           = useState<Resumo | null>(null)
  const [empenhoSel, setEmpenhoSel]   = useState<EmpenhoResumo | null>(null)
  const [showModal, setShowModal]     = useState(false)
  const [busca, setBusca]             = useState('')
  const [filtroSit, setFiltroSit]     = useState('')
  const [competencia, setCompetencia] = useState(() => {
    const h = new Date()
    return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}`
  })
  const [carregando, setCarregando]   = useState(true)
  const [pagina, setPagina]           = useState(1)
  const [total, setTotal]             = useState(0)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const params = new URLSearchParams({ pagina: String(pagina), porPagina: '20' })
    if (busca)      params.set('busca', busca)
    if (filtroSit)  params.set('situacao', filtroSit)
    if (competencia) params.set('competencia', competencia)
    const r = await fetch(`/api/sefin/empenho?${params}`)
    const d = await r.json()
    setEmpenhos(d.empenhos ?? [])
    setResumo(d.resumo ?? null)
    setTotal(d.total ?? 0)
    setCarregando(false)
  }, [busca, filtroSit, competencia, pagina])

  useEffect(() => { carregar() }, [carregar])

  return (
    <div className="p-6 space-y-6">
      {/* Título */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Empenhos</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestão da despesa — três estágios (Art. 58-64 Lei 4.320/64)</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm">
          <PlusCircle size={16}/> Novo Empenho
        </button>
      </div>

      {/* KPIs */}
      {resumo && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Empenhos', valor: resumo.totalEmpenhos, tipo: 'num', cor: 'text-slate-800' },
            { label: 'Valor Emitido',  valor: resumo.totalEmitido,  tipo: 'moeda', cor: 'text-amber-700' },
            { label: 'Liquidado',      valor: resumo.totalLiquidado,tipo: 'moeda', cor: 'text-blue-700' },
            { label: 'Pago',           valor: resumo.totalPago,     tipo: 'moeda', cor: 'text-emerald-700' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
              <p className={`text-lg font-bold ${kpi.cor}`}>
                {kpi.tipo === 'moeda' ? moeda(kpi.valor as number) : kpi.valor}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 shadow-sm">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1) }}
            placeholder="Buscar por número, credor, processo…"
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <input type="month" value={competencia} onChange={e => { setCompetencia(e.target.value); setPagina(1) }}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        <select value={filtroSit} onChange={e => { setFiltroSit(e.target.value); setPagina(1) }}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todas situações</option>
          {Object.entries(SITUACAO_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Número','Credor','Dotação','Valor','Liquidado','Pago','Situação',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {carregando ? (
                <tr><td colSpan={8} className="py-10 text-center text-slate-400">Carregando…</td></tr>
              ) : empenhos.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center text-slate-400">Nenhum empenho encontrado</td></tr>
              ) : empenhos.map(e => {
                const sit = SITUACAO_INFO[e.situacao]
                return (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">{e.numero}</td>
                    <td className="px-4 py-3 max-w-48">
                      <p className="font-medium text-slate-800 truncate">{e.credorNome}</p>
                      <p className="text-xs text-slate-400">{e.credorCpfCnpj}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-36 truncate">{e.dotacao?.descricao}</td>
                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap">{moeda(e.valorOriginal)}</td>
                    <td className="px-4 py-3 text-right text-blue-700 whitespace-nowrap">{moeda(e.valorLiquidado)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 whitespace-nowrap">{moeda(e.valorPago)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sit.bg} ${sit.cor}`}>{sit.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setEmpenhoSel(e)} className="text-slate-400 hover:text-blue-600">
                        <Eye size={15}/>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {total > 20 && (
          <div className="border-t border-slate-100 px-4 py-3 flex justify-between items-center">
            <span className="text-xs text-slate-500">{total} empenhos</span>
            <div className="flex gap-2">
              <button onClick={() => setPagina(p => Math.max(1, p-1))} disabled={pagina===1}
                className="px-3 py-1 text-xs border rounded hover:bg-slate-50 disabled:opacity-40">Anterior</button>
              <span className="px-3 py-1 text-xs text-slate-600">Pág {pagina}</span>
              <button onClick={() => setPagina(p => p+1)} disabled={pagina * 20 >= total}
                className="px-3 py-1 text-xs border rounded hover:bg-slate-50 disabled:opacity-40">Próxima</button>
            </div>
          </div>
        )}
      </div>

      {empenhoSel && (
        <PainelEmpenho empenho={empenhoSel} onFechar={() => setEmpenhoSel(null)}
          onAtualizar={() => { carregar(); setEmpenhoSel(null) }}/>
      )}
      {showModal && (
        <ModalEmpenho onClose={() => setShowModal(false)} onSalvar={() => { setShowModal(false); carregar() }}/>
      )}
    </div>
  )
}
