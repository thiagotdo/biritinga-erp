'use client'

import { useState, useEffect, useCallback } from 'react'
import { PlusCircle, Search, Eye, X, AlertTriangle, TrendingDown, Package } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Bem {
  id: string; tombamento: string; descricao: string
  classificacao: string; situacao: string
  secretaria?: string; setor?: string; responsavel?: string
  valorAquisicao?: number; valorAtual?: number; taxaDepreciacao?: number
  dataAquisicao?: string; dataUltimaDepreciacao?: string
  marca?: string; modelo?: string; serie?: string
  criadoEm: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const moeda = (v?: number | null) => v != null
  ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'
const dataFmt = (d?: string | null) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

const SIT: Record<string, { label: string; cor: string; bg: string }> = {
  ATIVO:               { label: 'Ativo',              cor: 'text-emerald-700', bg: 'bg-emerald-50'  },
  EM_MANUTENCAO:       { label: 'Em Manutenção',      cor: 'text-amber-700',   bg: 'bg-amber-50'    },
  CEDIDO:              { label: 'Cedido',             cor: 'text-blue-700',    bg: 'bg-blue-50'     },
  BAIXADO:             { label: 'Baixado',            cor: 'text-red-700',     bg: 'bg-red-50'      },
  PERDIDO_FURTADO:     { label: 'Perdido/Furtado',   cor: 'text-red-800',     bg: 'bg-red-100'     },
  INVENTARIO_PENDENTE: { label: 'Inv. Pendente',     cor: 'text-orange-600',  bg: 'bg-orange-50'   },
}

const CLASS_LABEL: Record<string, string> = {
  BENS_MOVEIS_INFORMATICA:           'Informática',
  BENS_MOVEIS_MOVEIS_UTENSILIOS:     'Móveis e Utensílios',
  BENS_MOVEIS_MAQUINAS_EQUIPAMENTOS: 'Máq. e Equipamentos',
  BENS_MOVEIS_VEICULOS:              'Veículos',
  BENS_IMOVEIS_TERRENOS:             'Terrenos',
  BENS_IMOVEIS_PREDIOS:              'Prédios',
  BENS_IMOVEIS_OBRAS_ANDAMENTO:      'Obras em Andamento',
  BENS_INTANGIVEIS_SOFTWARE:         'Software',
  BENS_INTANGIVEIS_OUTROS:           'Intangíveis',
}

// ─── Modal novo bem ───────────────────────────────────────────────────────────

function ModalNovoBem({ onClose, onSalvar }: { onClose: () => void; onSalvar: () => void }) {
  const [form, setForm] = useState({
    descricao: '', classificacao: 'BENS_MOVEIS_INFORMATICA',
    marca: '', modelo: '', serie: '', cor: '',
    secretaria: '', setor: '', responsavel: '',
    valorAquisicao: '', dataAquisicao: '',
    fornecedorNome: '', notaFiscal: '', processoNumero: '',
    observacoes: '',
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({...f, [k]: e.target.value}))

  async function salvar() {
    setSalvando(true); setErro('')
    try {
      const r = await fetch('/api/semad/patrimonio', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'BEM', ...form, valorAquisicao: form.valorAquisicao ? Number(form.valorAquisicao) : undefined }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.erro ?? 'Erro ao registrar bem') }
      onSalvar()
    } catch (e: any) { setErro(e.message) }
    setSalvando(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-slate-800">Tombamento de Bem Patrimonial</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição *</label>
            <input type="text" value={form.descricao} onChange={set('descricao')}
              placeholder="Ex: Notebook Dell Latitude 5420"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Classificação MCASP *</label>
              <select value={form.classificacao} onChange={set('classificacao')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(CLASS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor de Aquisição (R$)</label>
              <input type="number" value={form.valorAquisicao} onChange={set('valorAquisicao')} placeholder="0.00"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Marca</label>
              <input type="text" value={form.marca} onChange={set('marca')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Modelo</label>
              <input type="text" value={form.modelo} onChange={set('modelo')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Série / Patrimônio</label>
              <input type="text" value={form.serie} onChange={set('serie')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Secretaria</label>
              <input type="text" value={form.secretaria} onChange={set('secretaria')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Setor</label>
              <input type="text" value={form.setor} onChange={set('setor')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Responsável</label>
              <input type="text" value={form.responsavel} onChange={set('responsavel')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data de Aquisição</label>
              <input type="date" value={form.dataAquisicao} onChange={set('dataAquisicao')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nota Fiscal</label>
              <input type="text" value={form.notaFiscal} onChange={set('notaFiscal')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
          {erro && <p className="text-red-600 text-sm">{erro}</p>}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button onClick={salvar} disabled={salvando}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {salvando ? 'Registrando…' : 'Tombar Bem'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Painel do bem ────────────────────────────────────────────────────────────

function PainelBem({ id, onFechar, onAtualizar }: { id: string; onFechar: () => void; onAtualizar: () => void }) {
  const [bem, setBem]         = useState<any>(null)
  const [abaAtiva, setAbaAtiva] = useState<'info'|'movimentacoes'|'manutencoes'>('info')
  const [atuando, setAtuando] = useState(false)

  const [formTransf, setFormTransf] = useState({ destinoSetor: '', destinoResponsavel: '', justificativa: '' })
  const [formBaixa, setFormBaixa] = useState({ motivoBaixa: 'ALIENACAO_VENDA', valorBaixa: '', justificativa: '', documentoAutorizacao: '' })
  const [formManut, setFormManut] = useState({ tipo: 'CORRETIVA', descricao: '', fornecedorNome: '', valorManutencao: '', dataInicio: '' })
  const [erroAcao, setErroAcao] = useState('')
  const [confirmBaixa, setConfirmBaixa] = useState(false)

  const carregar = useCallback(() => {
    fetch(`/api/semad/patrimonio?id=${id}`).then(r => r.json()).then(d => setBem(d.bem))
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  async function agir(acao: string, body: Record<string,any>) {
    setAtuando(true); setErroAcao('')
    try {
      const r = await fetch('/api/semad/patrimonio', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, acao, ...body }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.erro ?? 'Erro') }
      carregar(); onAtualizar()
    } catch (e: any) { setErroAcao(e.message) }
    setAtuando(false)
  }

  async function adicionarManutencao() {
    setErroAcao('')
    try {
      const r = await fetch('/api/semad/patrimonio', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bemId: id, ...formManut, tipo: 'MANUTENCAO', valorManutencao: formManut.valorManutencao ? Number(formManut.valorManutencao) : undefined }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.erro ?? 'Erro') }
      setFormManut({ tipo: 'CORRETIVA', descricao: '', fornecedorNome: '', valorManutencao: '', dataInicio: '' })
      carregar(); onAtualizar()
    } catch (e: any) { setErroAcao(e.message) }
  }

  if (!bem) return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onFechar}/>
      <aside className="fixed right-0 top-0 h-full w-[500px] z-50 bg-white shadow-2xl flex items-center justify-center">
        <p className="text-slate-400 text-sm">Carregando…</p>
      </aside>
    </>
  )

  const sit = SIT[bem.situacao] ?? SIT['ATIVO']
  const deprecAcum = bem.valorAquisicao && bem.valorAtual ? Number(bem.valorAquisicao) - Number(bem.valorAtual) : 0
  const percDeprec = bem.valorAquisicao > 0 ? (deprecAcum / Number(bem.valorAquisicao)) * 100 : 0

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onFechar}/>
      <aside className="fixed right-0 top-0 h-full w-[520px] z-50 bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 p-4 z-10">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono text-sm font-bold text-slate-700">{bem.tombamento}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sit.bg} ${sit.cor}`}>{sit.label}</span>
              </div>
              <p className="text-sm font-medium text-slate-800">{bem.descricao}</p>
              <p className="text-xs text-slate-400">{CLASS_LABEL[bem.classificacao]}</p>
            </div>
            <button onClick={onFechar} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
          </div>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {(['info','movimentacoes','manutencoes'] as const).map(a => (
              <button key={a} onClick={() => setAbaAtiva(a)}
                className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${abaAtiva===a ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {a === 'movimentacoes' ? 'Movimentações' : a === 'manutencoes' ? 'Manutenções' : 'Info'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* ABA INFO */}
          {abaAtiva === 'info' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { l: 'Valor Aquisição', v: moeda(bem.valorAquisicao) },
                  { l: 'Valor Atual',     v: moeda(bem.valorAtual)     },
                  { l: 'Depr. Acumulada',v: moeda(deprecAcum)         },
                  { l: 'Taxa Depr. / ano',v: `${((Number(bem.taxaDepreciacao) ?? 0)*100).toFixed(1)}%` },
                  { l: 'Aquisição',       v: dataFmt(bem.dataAquisicao) },
                  { l: 'Última Depr.',    v: dataFmt(bem.dataUltimaDepreciacao) },
                  { l: 'Secretaria',      v: bem.secretaria ?? '—' },
                  { l: 'Responsável',     v: bem.responsavel ?? '—' },
                  { l: 'Marca / Modelo',  v: [bem.marca, bem.modelo].filter(Boolean).join(' / ') || '—' },
                  { l: 'Série',           v: bem.serie ?? '—' },
                ].map(item => (
                  <div key={item.l} className="bg-slate-50 rounded p-2">
                    <p className="text-xs text-slate-400">{item.l}</p>
                    <p className="font-medium text-slate-700 text-xs">{item.v}</p>
                  </div>
                ))}
              </div>

              {/* Barra depreciação */}
              {bem.valorAquisicao > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span className="flex items-center gap-1"><TrendingDown size={11}/> Depreciação acumulada</span>
                    <span>{percDeprec.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-400 rounded-full transition-all" style={{width:`${percDeprec}%`}}/>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                    <span>{moeda(bem.valorAtual)} atual</span>
                    <span>{moeda(bem.valorAquisicao * 0.1)} residual mín.</span>
                  </div>
                </div>
              )}

              {/* Ações */}
              {bem.situacao !== 'BAIXADO' && (
                <div className="space-y-3 pt-2">
                  {/* Depreciar */}
                  <button onClick={() => agir('DEPRECIAR', {})} disabled={atuando}
                    className="w-full py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 disabled:opacity-50">
                    Calcular Depreciação (MCASP)
                  </button>

                  {/* Transferir */}
                  {bem.situacao === 'ATIVO' && (
                    <div className="border border-dashed border-slate-300 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-semibold text-slate-600">Transferir para</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" value={formTransf.destinoSetor}
                          onChange={e => setFormTransf(f => ({...f, destinoSetor: e.target.value}))}
                          placeholder="Setor destino"
                          className="border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        <input type="text" value={formTransf.destinoResponsavel}
                          onChange={e => setFormTransf(f => ({...f, destinoResponsavel: e.target.value}))}
                          placeholder="Responsável"
                          className="border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                      </div>
                      <button onClick={() => agir('TRANSFERIR', formTransf)} disabled={atuando}
                        className="w-full py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        Registrar Transferência
                      </button>
                    </div>
                  )}

                  {/* Baixar */}
                  {bem.situacao === 'ATIVO' && (
                    <div className="border border-dashed border-red-200 rounded-lg p-3 space-y-2">
                      {!confirmBaixa ? (
                        <button onClick={() => setConfirmBaixa(true)}
                          className="w-full py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                          Baixar Bem
                        </button>
                      ) : (
                        <>
                          <p className="text-xs font-semibold text-red-700">⚠ Confirmar Baixa</p>
                          <select value={formBaixa.motivoBaixa}
                            onChange={e => setFormBaixa(f => ({...f, motivoBaixa: e.target.value}))}
                            className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-500">
                            {['ALIENACAO_VENDA','ALIENACAO_DOACAO','PERMUTA','SINISTRO','SUCATA','EXTRAVIO'].map(m => (
                              <option key={m} value={m}>{m.replace(/_/g,' ')}</option>
                            ))}
                          </select>
                          <input type="number" value={formBaixa.valorBaixa}
                            onChange={e => setFormBaixa(f => ({...f, valorBaixa: e.target.value}))}
                            placeholder="Valor baixa (R$)"
                            className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"/>
                          <input type="text" value={formBaixa.documentoAutorizacao}
                            onChange={e => setFormBaixa(f => ({...f, documentoAutorizacao: e.target.value}))}
                            placeholder="Documento de autorização"
                            className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"/>
                          <textarea value={formBaixa.justificativa}
                            onChange={e => setFormBaixa(f => ({...f, justificativa: e.target.value}))}
                            placeholder="Justificativa…" rows={2}
                            className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"/>
                          <div className="flex gap-2">
                            <button onClick={() => setConfirmBaixa(false)}
                              className="flex-1 py-1.5 text-xs text-slate-600 border rounded-lg hover:bg-slate-50">Cancelar</button>
                            <button onClick={() => agir('BAIXAR', { ...formBaixa, valorBaixa: formBaixa.valorBaixa ? Number(formBaixa.valorBaixa) : undefined })}
                              disabled={atuando}
                              className="flex-1 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                              Confirmar Baixa
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {erroAcao && <p className="text-red-600 text-xs">{erroAcao}</p>}
                </div>
              )}
            </>
          )}

          {/* ABA MOVIMENTAÇÕES */}
          {abaAtiva === 'movimentacoes' && (
            <div className="space-y-2">
              {bem.movimentacoes?.length > 0 ? bem.movimentacoes.map((m: any) => (
                <div key={m.id} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex justify-between mb-0.5">
                    <span className="text-xs font-semibold text-slate-600">{m.tipo.replace(/_/g,' ')}</span>
                    <span className="text-xs text-slate-400">{dataFmt(m.dataMovimentacao)}</span>
                  </div>
                  {m.destinoSetor && <p className="text-xs text-slate-600">→ {m.destinoSetor} · {m.destinoResponsavel}</p>}
                  {m.motivoBaixa && <p className="text-xs text-red-600">{m.motivoBaixa.replace(/_/g,' ')}</p>}
                  {m.justificativa && <p className="text-xs text-slate-400">{m.justificativa}</p>}
                </div>
              )) : <p className="text-sm text-slate-400 text-center py-4">Nenhuma movimentação</p>}
            </div>
          )}

          {/* ABA MANUTENÇÕES */}
          {abaAtiva === 'manutencoes' && (
            <>
              <div className="space-y-2">
                {bem.manutencoes?.length > 0 ? bem.manutencoes.map((m: any) => (
                  <div key={m.id} className={`rounded-lg p-3 ${m.concluida ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-xs font-semibold text-slate-700">{m.tipo} · {m.fornecedorNome ?? '—'}</span>
                      <span className={`text-xs ${m.concluida ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {m.concluida ? 'Concluída' : 'Em andamento'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{m.descricao}</p>
                    {m.valorManutencao && <p className="text-xs font-medium text-slate-700 mt-0.5">{moeda(m.valorManutencao)}</p>}
                    <p className="text-xs text-slate-400 mt-0.5">{dataFmt(m.dataInicio)} {m.dataConclusao ? `→ ${dataFmt(m.dataConclusao)}` : ''}</p>
                  </div>
                )) : <p className="text-sm text-slate-400 text-center py-4">Nenhuma manutenção</p>}
              </div>

              {/* Formulário nova manutenção */}
              <div className="border border-dashed border-slate-300 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-600">Registrar Manutenção</p>
                <select value={formManut.tipo} onChange={e => setFormManut(f => ({...f, tipo: e.target.value}))}
                  className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {['PREVENTIVA','CORRETIVA','GARANTIA'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <textarea value={formManut.descricao} onChange={e => setFormManut(f => ({...f, descricao: e.target.value}))}
                  placeholder="Descrição do serviço…" rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={formManut.fornecedorNome}
                    onChange={e => setFormManut(f => ({...f, fornecedorNome: e.target.value}))}
                    placeholder="Fornecedor"
                    className="border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  <input type="number" value={formManut.valorManutencao}
                    onChange={e => setFormManut(f => ({...f, valorManutencao: e.target.value}))}
                    placeholder="Valor (R$)"
                    className="border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  <input type="date" value={formManut.dataInicio}
                    onChange={e => setFormManut(f => ({...f, dataInicio: e.target.value}))}
                    className="border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                {erroAcao && <p className="text-red-600 text-xs">{erroAcao}</p>}
                <button onClick={adicionarManutencao}
                  className="w-full py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Registrar
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PatrimonioPage() {
  const [bens, setBens]           = useState<Bem[]>([])
  const [kpis, setKpis]           = useState<any>(null)
  const [selId, setSelId]         = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [busca, setBusca]         = useState('')
  const [filtroSit, setFiltroSit] = useState('')
  const [filtroClass, setFiltroClass] = useState('')
  const [abaKpi, setAbaKpi]       = useState<'sit'|'class'|'secret'>('sit')
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const p = new URLSearchParams()
    if (busca)       p.set('busca', busca)
    if (filtroSit)   p.set('situacao', filtroSit)
    if (filtroClass) p.set('classificacao', filtroClass)
    const r = await fetch(`/api/semad/patrimonio?${p}`)
    const d = await r.json()
    setBens(d.bens ?? [])
    setKpis(d.kpis ?? null)
    setCarregando(false)
  }, [busca, filtroSit, filtroClass])

  useEffect(() => { carregar() }, [carregar])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patrimônio</h1>
          <p className="text-slate-500 text-sm mt-0.5">Tombamento, depreciação e inventário — MCASP 10.ª ed.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm">
          <PlusCircle size={16}/> Tombar Bem
        </button>
      </div>

      {/* KPIs */}
      {kpis && (
        <>
          <div className="grid grid-cols-4 gap-3">
            {[
              { l: 'Total de Bens',         v: kpis.totalBens,                   cor: 'text-slate-700' },
              { l: 'Valor Original',        v: moeda(kpis.valorTotalAquisicao),  cor: 'text-blue-700'  },
              { l: 'Valor Atual',           v: moeda(kpis.valorTotalAtual),      cor: 'text-teal-700'  },
              { l: 'Deprec. Acumulada',     v: moeda(kpis.depreciacaoAcumulada), cor: 'text-orange-700'},
            ].map(k => (
              <div key={k.l} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs text-slate-400">{k.l}</p>
                <p className={`text-lg font-bold mt-0.5 ${k.cor}`}>{k.v}</p>
              </div>
            ))}
          </div>

          {/* Tabs de breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit mb-4">
              {[['sit','Por Situação'],['class','Por Classificação'],['secret','Por Secretaria']].map(([k, l]) => (
                <button key={k} onClick={() => setAbaKpi(k as any)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${abaKpi===k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {l}
                </button>
              ))}
            </div>
            {abaKpi === 'sit' && kpis.porSituacao && (
              <div className="grid grid-cols-3 gap-2">
                {kpis.porSituacao.map((s: any) => {
                  const sit = SIT[s.situacao] ?? { label: s.situacao, cor: 'text-slate-600', bg: 'bg-slate-100' }
                  return (
                    <div key={s.situacao} className={`rounded-lg p-3 ${sit.bg}`}>
                      <p className={`text-xs font-semibold ${sit.cor}`}>{sit.label}</p>
                      <p className={`text-xl font-bold ${sit.cor}`}>{s.total}</p>
                      <p className={`text-xs ${sit.cor} opacity-80`}>{moeda(s.valorAtual)}</p>
                    </div>
                  )
                })}
              </div>
            )}
            {abaKpi === 'class' && kpis.porClassificacao && (
              <div className="space-y-2">
                {kpis.porClassificacao.filter((c: any) => c.total > 0).map((c: any) => (
                  <div key={c.classificacao} className="flex items-center gap-3">
                    <div className="w-32 text-xs text-slate-600 truncate">{CLASS_LABEL[c.classificacao]}</div>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full"
                        style={{width:`${kpis.totalBens > 0 ? (c.total/kpis.totalBens)*100 : 0}%`}}/>
                    </div>
                    <span className="text-xs text-slate-500 w-6 text-right">{c.total}</span>
                    <span className="text-xs text-slate-400 w-28 text-right">{moeda(c.valorAtual)}</span>
                  </div>
                ))}
              </div>
            )}
            {abaKpi === 'secret' && kpis.porSecretaria && (
              <div className="space-y-2">
                {kpis.porSecretaria.map((s: any) => (
                  <div key={s.secretaria} className="flex items-center justify-between py-1.5 border-b border-slate-50">
                    <span className="text-xs text-slate-700">{s.secretaria ?? 'Sem secretaria'}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-400">{s.total} bens</span>
                      <span className="text-xs font-medium text-slate-600">{moeda(s.valorAtual)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por tombamento, descrição, série, responsável…"
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <select value={filtroSit} onChange={e => setFiltroSit(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Situação</option>
          {Object.entries(SIT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filtroClass} onChange={e => setFiltroClass(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Classificação</option>
          {Object.entries(CLASS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Tombamento','Descrição','Classificação','Localização','Val. Aquisição','Val. Atual','Deprec.','Situação',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {carregando ? (
              <tr><td colSpan={9} className="py-10 text-center text-slate-400">Carregando…</td></tr>
            ) : bens.length === 0 ? (
              <tr><td colSpan={9} className="py-10 text-center text-slate-400">Nenhum bem encontrado</td></tr>
            ) : bens.map(b => {
              const sit = SIT[b.situacao] ?? SIT['ATIVO']
              const deprec = b.valorAquisicao && b.valorAtual
                ? ((Number(b.valorAquisicao) - Number(b.valorAtual)) / Number(b.valorAquisicao) * 100).toFixed(0)
                : null
              return (
                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">{b.tombamento}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700 font-medium text-xs truncate max-w-40">{b.descricao}</p>
                    {b.marca && <p className="text-slate-400 text-xs">{b.marca} {b.modelo}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{CLASS_LABEL[b.classificacao]}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {b.secretaria && <p>{b.secretaria}</p>}
                    {b.responsavel && <p className="text-slate-400">{b.responsavel}</p>}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-slate-700 whitespace-nowrap">{moeda(b.valorAquisicao)}</td>
                  <td className="px-4 py-3 text-right text-xs text-slate-700 whitespace-nowrap">{moeda(b.valorAtual)}</td>
                  <td className="px-4 py-3 text-right">
                    {deprec !== null && (
                      <span className={`text-xs font-medium ${Number(deprec) > 50 ? 'text-red-600' : Number(deprec) > 25 ? 'text-orange-500' : 'text-slate-500'}`}>
                        {deprec}%
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sit.bg} ${sit.cor}`}>{sit.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelId(b.id)} className="text-slate-400 hover:text-blue-600"><Eye size={15}/></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selId && <PainelBem id={selId} onFechar={() => setSelId(null)} onAtualizar={carregar}/>}
      {showModal && <ModalNovoBem onClose={() => setShowModal(false)} onSalvar={() => { setShowModal(false); carregar() }}/>}
    </div>
  )
}
