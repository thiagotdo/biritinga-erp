'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Scale, FileText } from 'lucide-react'

type SituacaoDA = 'ATIVA' | 'EM_EXECUCAO' | 'PARCELADA' | 'QUITADA' | 'CANCELADA' | 'PRESCRITA'

const SIT: Record<SituacaoDA, { label: string; cor: string; bg: string }> = {
  ATIVA:       { label: 'Ativa',       cor: 'text-red-700',    bg: 'bg-red-50'    },
  EM_EXECUCAO: { label: 'Em Execução', cor: 'text-orange-700', bg: 'bg-orange-50' },
  PARCELADA:   { label: 'Parcelada',   cor: 'text-purple-700', bg: 'bg-purple-50' },
  QUITADA:     { label: 'Quitada',     cor: 'text-green-700',  bg: 'bg-green-100' },
  CANCELADA:   { label: 'Cancelada',   cor: 'text-slate-400',  bg: 'bg-slate-50'  },
  PRESCRITA:   { label: 'Prescrita',   cor: 'text-slate-500',  bg: 'bg-slate-100' },
}

function ChipSit({ sit }: { sit: SituacaoDA }) {
  const s = SIT[sit]; return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.cor} ${s.bg}`}>{s.label}</span>
}

function moeda(v: number) { return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }

// ─── Modal parcelamento ───────────────────────────────────────────────────────

function ModalParcelamento({ divida, onFechar, onSalvar }: { divida: any; onFechar: () => void; onSalvar: (d: any) => void }) {
  const [form, setForm] = useState({ valorEntrada: '0', totalParcelas: '12', diaVencimento: '10', gerarDAMs: true })

  const saldo = divida.valorAtualizado ?? divida.valorTotal
  const entrada = Number(form.valorEntrada) || 0
  const parcelas = Number(form.totalParcelas) || 1
  const saldoApos = saldo - entrada
  const juros = saldoApos * 0.01 * parcelas
  const valorParcela = parcelas > 0 ? (saldoApos + juros) / parcelas : 0

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Parcelamento da Dívida</h2>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <div className="p-6 space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex justify-between">
            <span className="text-sm text-red-700">{divida.numero}</span>
            <span className="text-sm font-bold text-red-800">{moeda(saldo)}</span>
          </div>
          <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
            Juros: 1% a.m. simples sobre o saldo parcelado
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Entrada</label>
              <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.valorEntrada} onChange={e => setForm(f => ({ ...f, valorEntrada: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Total de Parcelas</label>
              <input type="number" min={1} max={60} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.totalParcelas} onChange={e => setForm(f => ({ ...f, totalParcelas: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Dia de Vencimento (1–28)</label>
            <input type="number" min={1} max={28} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
              value={form.diaVencimento} onChange={e => setForm(f => ({ ...f, diaVencimento: e.target.value }))} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded text-indigo-600"
              checked={form.gerarDAMs} onChange={e => setForm(f => ({ ...f, gerarDAMs: e.target.checked }))} />
            <span className="text-sm text-slate-600">Gerar DAMs para cada parcela</span>
          </label>

          {valorParcela > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
              <div className="flex justify-between text-sm">
                <span className="text-indigo-700">Valor por parcela:</span>
                <span className="font-bold text-indigo-800">{moeda(valorParcela)}</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-slate-500">Juros total ({form.totalParcelas}x): {moeda(juros)}</span>
                <span className="text-slate-500">Total: {moeda(saldoApos + juros)}</span>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onFechar} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
          <button onClick={() => onSalvar({
            contribuinteId: divida.contribuinteId,
            dividaAtivaId: divida.id,
            valorOriginal: saldo,
            valorEntrada: Number(form.valorEntrada),
            totalParcelas: Number(form.totalParcelas),
            diaVencimento: Number(form.diaVencimento),
            gerarDAMs: form.gerarDAMs,
          })}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
            Confirmar Parcelamento
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Painel dívida ────────────────────────────────────────────────────────────

function PainelDivida({ divida, onAcao, onParcelar }: { divida: any; onAcao: (a: string, e?: any) => void; onParcelar: () => void }) {
  const [acao, setAcao] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})

  const acoes: Record<SituacaoDA, string[]> = {
    ATIVA:       ['AJUIZAR', 'PARCELAR', 'QUITAR', 'CANCELAR', 'PRESCREVER'],
    EM_EXECUCAO: ['QUITAR', 'PARCELAR'],
    PARCELADA:   ['QUITAR'],
    QUITADA:     [],
    CANCELADA:   [],
    PRESCRITA:   [],
  }

  async function enviar() { await onAcao(acao!, form); setAcao(null); setForm({}) }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-bold text-slate-500">{divida.numero}</span>
              <ChipSit sit={divida.situacao}/>
            </div>
            <p className="text-sm font-semibold text-slate-800">{divida.contribuinte?.nome ?? divida.contribuinte?.razaoSocial}</p>
            <p className="text-xs text-slate-500">CPF/CNPJ: {divida.contribuinte?.cpf ?? divida.contribuinte?.cnpj}</p>
            <p className="text-xs text-slate-400">Inscrito em: {new Date(divida.dataInscricao).toLocaleDateString('pt-BR')}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Valor Atualizado</p>
            <p className="text-xl font-bold text-red-700">{moeda(divida.valorAtualizado ?? divida.valorTotal)}</p>
            <p className="text-xs text-slate-400">Juros acum.: {moeda(divida.jurosAtual ?? 0)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 rounded-lg p-3">
          <div><p className="text-slate-400">Principal</p><p className="font-semibold">{moeda(divida.valorOriginal)}</p></div>
          <div><p className="text-slate-400">Multa (20%)</p><p className="font-semibold text-orange-600">{moeda(divida.valorMulta)}</p></div>
          <div><p className="text-slate-400">Total Inscrito</p><p className="font-semibold">{moeda(divida.valorTotal)}</p></div>
        </div>

        {/* Lançamento de origem */}
        {divida.lancamentoIPTU && (
          <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs">
            <span className="text-amber-700 font-semibold">IPTU:</span>
            <span className="text-amber-600 ml-1">{divida.lancamentoIPTU.numero} · {divida.lancamentoIPTU.imovel?.inscricaoCadastral}</span>
          </div>
        )}
        {divida.lancamentoISS && (
          <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs">
            <span className="text-blue-700 font-semibold">ISS:</span>
            <span className="text-blue-600 ml-1">{divida.lancamentoISS.numero}</span>
          </div>
        )}

        {divida.dataAjuizamento && (
          <div className="mt-2 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 text-xs text-orange-700">
            ⚖️ Ajuizado em {new Date(divida.dataAjuizamento).toLocaleDateString('pt-BR')} · Lei 6.830/1980
          </div>
        )}

        {(acoes[divida.situacao as SituacaoDA] ?? []).length > 0 && !acao && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {(acoes[divida.situacao as SituacaoDA] ?? []).map(a => (
              <button key={a}
                onClick={() => a === 'PARCELAR' ? onParcelar() : setAcao(a)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg text-white ${
                  a === 'AJUIZAR'   ? 'bg-orange-600 hover:bg-orange-700' :
                  a === 'PARCELAR'  ? 'bg-purple-600 hover:bg-purple-700' :
                  a === 'QUITAR'    ? 'bg-green-600 hover:bg-green-700' :
                  a === 'CANCELAR'  ? 'bg-red-500 hover:bg-red-600' :
                  a === 'PRESCREVER'? 'bg-slate-500 hover:bg-slate-600' :
                  'bg-slate-500 hover:bg-slate-600'
                }`}>
                {a === 'AJUIZAR' ? '⚖️ Ajuizar' : a === 'PARCELAR' ? '📋 Parcelar' :
                 a === 'QUITAR' ? '✅ Quitar' : a === 'CANCELAR' ? 'Cancelar' :
                 a === 'PRESCREVER' ? 'Prescrever' : a}
              </button>
            ))}
          </div>
        )}

        {acao && (
          <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
            {(acao === 'CANCELAR' || acao === 'PRESCREVER') && (
              <div>
                <label className="text-xs text-slate-500">Motivo/Fundamento</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-0.5"
                  value={form.motivo ?? ''} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} />
              </div>
            )}
            {acao === 'QUITAR' && (
              <div className="text-xs text-slate-500 bg-green-50 rounded-lg px-3 py-2">
                Confirma quitação integral de {moeda(divida.valorAtualizado ?? divida.valorTotal)}?
              </div>
            )}
            {acao === 'AJUIZAR' && (
              <div className="text-xs text-orange-700 bg-orange-50 rounded-lg px-3 py-2">
                Encaminhará para execução fiscal - Lei 6.830/1980
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setAcao(null); setForm({}) }} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
              <button onClick={enviar} className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">Confirmar</button>
            </div>
          </div>
        )}
      </div>

      {/* Histórico movimentações */}
      {divida.movimentacoes?.length > 0 && (
        <div className="p-4 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Histórico</p>
          <div className="space-y-1.5">
            {divida.movimentacoes.map((m: any, i: number) => (
              <div key={i} className="flex items-start gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-slate-300 mt-0.5 shrink-0"/>
                <div>
                  <span className="font-semibold text-slate-700">{m.tipo}</span>
                  <span className="text-slate-500 ml-2">{m.descricao}</span>
                  <span className="text-slate-400 ml-2">{new Date(m.criadoEm).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parcelamentos ativos */}
      {divida.parcelamentos?.length > 0 && (
        <div className="p-4 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Parcelamentos Ativos</p>
          {divida.parcelamentos.map((p: any) => (
            <div key={p.id} className="bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 text-xs">
              <div className="flex justify-between">
                <span className="font-mono font-semibold text-purple-700">{p.numero}</span>
                <span className="text-purple-600">{p.parcelasPagas}/{p.totalParcelas} pagas</span>
              </div>
              <div className="flex justify-between mt-1 text-slate-500">
                <span>Parcela: {moeda(p.valorParcela)}</span>
                <span>Total: {moeda(p.valorTotal)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DividaAtivaPage() {
  const [dividas, setDividas] = useState<any[]>([])
  const [kpis, setKpis] = useState<any>(null)
  const [porSituacao, setPorSituacao] = useState<any[]>([])
  const [selecionado, setSelecionado] = useState<any>(null)
  const [busca, setBusca] = useState('')
  const [filtroSit, setFiltroSit] = useState('')
  const [modalParc, setModalParc] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 4000) }

  async function carregar() {
    setCarregando(true)
    const p = new URLSearchParams()
    if (filtroSit) p.set('situacao', filtroSit)
    if (busca) p.set('busca', busca)
    const [resL, resDash] = await Promise.all([
      fetch(`/api/tributacao/divida?${p}`).then(r => r.json()),
      fetch('/api/tributacao/divida?relatorio=DASHBOARD').then(r => r.json()),
    ])
    setDividas(resL.dividas ?? [])
    setKpis(resDash.kpis ?? null)
    setPorSituacao(resDash.porSituacao ?? [])
    setCarregando(false)
  }

  async function carregarDetalhe(id: string) {
    const res = await fetch(`/api/tributacao/divida?id=${id}`).then(r => r.json())
    setSelecionado(res.divida)
  }

  async function executarAcao(acao: string, extras?: any) {
    if (!selecionado) return
    const res = await fetch('/api/tributacao/divida', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selecionado.id, acao, ...extras }),
    })
    if (res.ok) { showToast('✅ Ação realizada com sucesso'); carregarDetalhe(selecionado.id); carregar() }
  }

  async function salvarParcelamento(d: any) {
    setModalParc(false)
    const res = await fetch('/api/tributacao/parcelamento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d),
    })
    const json = await res.json()
    if (res.ok) {
      showToast(`✅ Parcelamento criado - ${json.parcelamento.numero}`)
      selecionado && carregarDetalhe(selecionado.id)
      carregar()
    }
  }

  useEffect(() => { carregar() }, [filtroSit])

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {toast && <div className="fixed top-5 right-5 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">{toast}</div>}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dívida Ativa</h1>
            <p className="text-sm text-slate-500 mt-0.5">CTN Art. 174 · Prescrição 5 anos · Execução Fiscal Lei 6.830/1980</p>
          </div>
        </div>

        {kpis && (
          <div className="grid grid-cols-5 gap-3 mb-5">
            {[
              { label: 'Dívida Total Ativa', val: moeda(kpis.totalAtiva), cor: 'bg-red-50 border border-red-200', big: true },
              { label: 'Qtd. Dívidas',       val: kpis.quantidadeAtiva,   cor: 'bg-white border border-slate-200' },
              { label: 'Em Execução',        val: kpis.emExecucao,        cor: kpis.emExecucao > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-white border border-slate-200' },
              { label: 'Parceladas',         val: kpis.parceladas,        cor: 'bg-purple-50 border border-purple-200' },
              { label: 'Quitadas (ano)',     val: kpis.quitadasAno,       cor: 'bg-green-50 border border-green-200' },
            ].map(({ label, val, cor }) => (
              <div key={label} className={`${cor} rounded-xl p-3 text-center`}>
                <p className="text-lg font-bold text-slate-800">{val}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {porSituacao.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Distribuição por Situação</p>
            <div className="flex gap-3 flex-wrap">
              {porSituacao.map(s => (
                <div key={s.situacao} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                  <ChipSit sit={s.situacao as SituacaoDA}/>
                  <span className="text-sm font-bold text-slate-700">{s.quantidade}</span>
                  <span className="text-xs text-slate-400">{moeda(s.valor)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <input className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 pl-9"
              placeholder="Buscar por CDA, nome, CPF/CNPJ..."
              value={busca} onChange={e => setBusca(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && carregar()}/>
            <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
          </div>
          <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
            value={filtroSit} onChange={e => setFiltroSit(e.target.value)}>
            <option value="">Todas situações</option>
            {(Object.entries(SIT) as [SituacaoDA, any][]).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
          </select>
          <button onClick={carregar} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700">Buscar</button>
        </div>

        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-5 space-y-2">
            {carregando ? <div className="text-center py-12 text-slate-400">Carregando…</div>
            : dividas.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Scale size={28} className="mx-auto mb-2 opacity-30"/>
                <p>Nenhuma dívida encontrada.</p>
              </div>
            ) : dividas.map(d => (
              <button key={d.id} onClick={() => { setSelecionado(null); carregarDetalhe(d.id) }}
                className={`w-full text-left bg-white border rounded-xl p-3 hover:shadow-sm transition-all ${
                  selecionado?.id === d.id ? 'border-red-400 ring-2 ring-red-100' :
                  d.situacao === 'EM_EXECUCAO' ? 'border-orange-300' :
                  d.situacao === 'ATIVA' ? 'border-red-200' : 'border-slate-200'
                }`}>
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <ChipSit sit={d.situacao}/>
                      <span className="font-mono text-xs text-slate-400">{d.numero}</span>
                      {d._count?.parcelamentos > 0 && (
                        <span className="text-xs text-purple-600">📋 Parcelado</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 truncate">{d.contribuinte?.nome ?? d.contribuinte?.razaoSocial}</p>
                    <p className="text-xs text-slate-400">{new Date(d.dataInscricao).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-red-700">{moeda(d.valorTotal)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="col-span-7">
            {selecionado ? (
              <PainelDivida
                divida={selecionado}
                onAcao={executarAcao}
                onParcelar={() => setModalParc(true)}
              />
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl flex items-center justify-center h-64 text-slate-400">
                <div className="text-center"><Scale size={28} className="mx-auto mb-2 opacity-30"/><p className="text-sm">Selecione uma dívida</p></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {modalParc && selecionado && (
        <ModalParcelamento divida={selecionado} onFechar={() => setModalParc(false)} onSalvar={salvarParcelamento}/>
      )}
    </div>
  )
}
