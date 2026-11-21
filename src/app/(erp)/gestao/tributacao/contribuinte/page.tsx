'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, User, Building2, AlertTriangle } from 'lucide-react'

type Situacao = 'ATIVO' | 'INATIVO' | 'SUSPENSO' | 'FALECIDO' | 'BAIXADO'
type TipoPessoa = 'FISICA' | 'JURIDICA'

interface Contribuinte {
  id: string; codigo: string; tipoPessoa: TipoPessoa
  nome: string; razaoSocial: string | null; nomeFantasia: string | null
  cpf: string | null; cnpj: string | null; inscricaoMunicipal: string | null
  email: string | null; telefone: string | null; celular: string | null
  logradouro: string | null; bairro: string | null; cidade: string | null; uf: string | null
  situacao: Situacao
  _count?: { imoveis: number; dividasAtivas: number }
}

const SIT: Record<Situacao, { label: string; cor: string; bg: string }> = {
  ATIVO:    { label: 'Ativo',    cor: 'text-green-700', bg: 'bg-green-50'  },
  INATIVO:  { label: 'Inativo',  cor: 'text-slate-500', bg: 'bg-slate-100' },
  SUSPENSO: { label: 'Suspenso', cor: 'text-orange-700',bg: 'bg-orange-50' },
  FALECIDO: { label: 'Falecido', cor: 'text-slate-400', bg: 'bg-slate-50'  },
  BAIXADO:  { label: 'Baixado',  cor: 'text-red-500',   bg: 'bg-red-50'    },
}

function ChipSit({ sit }: { sit: Situacao }) {
  const s = SIT[sit]; return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.cor} ${s.bg}`}>{s.label}</span>
}

function formatDoc(c: Contribuinte) {
  if (c.tipoPessoa === 'FISICA' && c.cpf) return `CPF: ${c.cpf}`
  if (c.tipoPessoa === 'JURIDICA' && c.cnpj) return `CNPJ: ${c.cnpj}`
  return c.tipoPessoa === 'FISICA' ? 'Pessoa Física' : 'Pessoa Jurídica'
}

// ─── Painel contribuinte ───────────────────────────────────────────────────────

function PainelContribuinte({ ct, onAcao }: { ct: any; onAcao: (acao: string) => void }) {
  const nome = ct.tipoPessoa === 'JURIDICA' ? (ct.razaoSocial ?? ct.nome) : ct.nome

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-bold text-slate-500">{ct.codigo}</span>
              <ChipSit sit={ct.situacao}/>
              {ct._count?.dividasAtivas > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  <AlertTriangle size={10}/> {ct._count.dividasAtivas} dívida{ct._count.dividasAtivas > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-lg font-semibold text-slate-800">{nome}</p>
            {ct.nomeFantasia && <p className="text-xs text-slate-400">Nome fantasia: {ct.nomeFantasia}</p>}
            <p className="text-sm text-slate-500 mt-0.5">{formatDoc(ct)}</p>
            {ct.inscricaoMunicipal && <p className="text-xs text-slate-400">IM: {ct.inscricaoMunicipal}</p>}
          </div>
          <div className="text-right text-xs text-slate-500 space-y-0.5">
            {ct._count?.imoveis > 0 && <p>{ct._count.imoveis} imóvel(is)</p>}
          </div>
        </div>

        <div className="flex gap-2 mt-3 flex-wrap">
          {ct.situacao === 'ATIVO' && <>
            <button onClick={() => onAcao('INATIVAR')}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Inativar</button>
            <button onClick={() => onAcao('SUSPENDER')}
              className="px-3 py-1.5 text-xs font-medium text-orange-700 border border-orange-200 bg-orange-50 rounded-lg hover:bg-orange-100">Suspender</button>
          </>}
          {ct.situacao !== 'ATIVO' && (
            <button onClick={() => onAcao('REATIVAR')}
              className="px-3 py-1.5 text-xs font-medium text-green-700 border border-green-200 bg-green-50 rounded-lg hover:bg-green-100">Reativar</button>
          )}
        </div>
      </div>

      <div className="p-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Contato</p>
          <div className="text-xs text-slate-600 space-y-0.5">
            {ct.email    && <p>✉ {ct.email}</p>}
            {ct.telefone && <p>☎ {ct.telefone}</p>}
            {ct.celular  && <p>📱 {ct.celular}</p>}
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Endereço</p>
          <div className="text-xs text-slate-600 space-y-0.5">
            {ct.logradouro && <p>{ct.logradouro}{ct.numero ? `, ${ct.numero}` : ''}</p>}
            {ct.bairro && <p>{ct.bairro}</p>}
            {ct.cidade && <p>{ct.cidade}/{ct.uf}</p>}
          </div>
        </div>
      </div>

      {ct.imoveis?.length > 0 && (
        <div className="border-t border-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Imóveis ({ct.imoveis.length})</p>
          <div className="space-y-1.5">
            {ct.imoveis.slice(0, 5).map((im: any) => (
              <div key={im.id} className="flex justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                <span className="font-medium text-slate-700">{im.inscricaoCadastral}</span>
                <span className="text-slate-500">{im.logradouro}</span>
                <span className="text-slate-400">{im.bairro}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ct.dividasAtivas?.length > 0 && (
        <div className="border-t border-slate-100 p-4">
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Dívida Ativa</p>
          <div className="space-y-1.5">
            {ct.dividasAtivas.map((da: any) => (
              <div key={da.id} className="flex justify-between text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <span className="font-mono font-medium text-red-700">{da.numero}</span>
                <span className="text-red-600 font-semibold">R$ {da.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span className="text-red-500">{da.situacao}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Modal novo contribuinte ──────────────────────────────────────────────────

function ModalNovoContribuinte({ onFechar, onSalvar }: { onFechar: () => void; onSalvar: (d: any) => void }) {
  const [tipo, setTipo] = useState<TipoPessoa>('FISICA')
  const [form, setForm] = useState({
    nome: '', razaoSocial: '', nomeFantasia: '', cpf: '', cnpj: '',
    rg: '', inscricaoMunicipal: '', inscricaoEstadual: '', cnae: '',
    email: '', telefone: '', celular: '',
    cep: '', logradouro: '', numero: '', complemento: '',
    bairro: '', cidade: '', uf: '',
    observacoes: '',
  })
  const F = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const valido = tipo === 'FISICA' ? form.nome.length >= 3 : (form.razaoSocial.length >= 3 || form.nome.length >= 3)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Novo Contribuinte</h2>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Tipo */}
          <div className="flex border border-slate-200 rounded-xl p-1 bg-slate-50 gap-1">
            {(['FISICA', 'JURIDICA'] as TipoPessoa[]).map(t => (
              <button key={t} onClick={() => setTipo(t)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  tipo === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                {t === 'FISICA' ? '👤 Pessoa Física' : '🏢 Pessoa Jurídica'}
              </button>
            ))}
          </div>

          {tipo === 'FISICA' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600">Nome Completo *</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                  value={form.nome} onChange={e => F('nome', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">CPF</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                  value={form.cpf} onChange={e => F('cpf', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">RG</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                  value={form.rg} onChange={e => F('rg', e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600">Razão Social *</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                  value={form.razaoSocial} onChange={e => F('razaoSocial', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Nome Fantasia</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                  value={form.nomeFantasia} onChange={e => F('nomeFantasia', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">CNPJ</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                  value={form.cnpj} onChange={e => F('cnpj', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Inscrição Municipal</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                  value={form.inscricaoMunicipal} onChange={e => F('inscricaoMunicipal', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">CNAE</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                  placeholder="Ex: 6201-5/00"
                  value={form.cnae} onChange={e => F('cnae', e.target.value)} />
              </div>
            </div>
          )}

          {/* Contato */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">E-mail</label>
              <input type="email" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.email} onChange={e => F('email', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Telefone</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.telefone} onChange={e => F('telefone', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Celular</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.celular} onChange={e => F('celular', e.target.value)} />
            </div>
          </div>

          {/* Endereço */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">CEP</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.cep} onChange={e => F('cep', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-600">Logradouro</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.logradouro} onChange={e => F('logradouro', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Número</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.numero} onChange={e => F('numero', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Bairro</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.bairro} onChange={e => F('bairro', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Cidade</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                value={form.cidade} onChange={e => F('cidade', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onFechar} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
          <button onClick={() => onSalvar({ tipoPessoa: tipo, ...form, nome: tipo === 'FISICA' ? form.nome : (form.razaoSocial || form.nome) })}
            disabled={!valido}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">
            Cadastrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ContribuintePage() {
  const [contribuintes, setContribuintes] = useState<Contribuinte[]>([])
  const [kpis, setKpis] = useState<any>(null)
  const [selecionado, setSelecionado] = useState<any>(null)
  const [busca, setBusca] = useState('')
  const [filtroSit, setFiltroSit] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [modal, setModal] = useState(false)
  const [carregando, setCarregando] = useState(true)

  async function carregar() {
    setCarregando(true)
    const p = new URLSearchParams()
    if (busca) p.set('busca', busca)
    if (filtroSit) p.set('situacao', filtroSit)
    if (filtroTipo) p.set('tipo', filtroTipo)
    const [resC, resDash] = await Promise.all([
      fetch(`/api/tributacao/contribuinte?${p}`).then(r => r.json()),
      fetch('/api/tributacao/contribuinte?relatorio=DASHBOARD').then(r => r.json()),
    ])
    setContribuintes(resC.contribuintes ?? [])
    setKpis(resDash.kpis ?? null)
    setCarregando(false)
  }

  async function carregarDetalhe(id: string) {
    const res = await fetch(`/api/tributacao/contribuinte?id=${id}`).then(r => r.json())
    setSelecionado(res.contribuinte)
  }

  async function executarAcao(acao: string) {
    if (!selecionado) return
    await fetch('/api/tributacao/contribuinte', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selecionado.id, acao }),
    })
    carregarDetalhe(selecionado.id)
    carregar()
  }

  async function salvarContribuinte(d: any) {
    const res = await fetch('/api/tributacao/contribuinte', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d),
    })
    setModal(false)
    if (res.ok) carregar()
  }

  useEffect(() => { carregar() }, [busca, filtroSit, filtroTipo])

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Cadastro de Contribuintes</h1>
            <p className="text-sm text-slate-500 mt-0.5">Gestão de contribuintes municipais — IPTU, ISS e Dívida Ativa</p>
          </div>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 shadow-sm">
            <Plus size={16}/> Novo Contribuinte
          </button>
        </div>

        {kpis && (
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Contribuintes Ativos', val: kpis.totalContribuintes, cor: 'bg-white border border-slate-200' },
              { label: 'Imóveis Cadastrados',  val: kpis.totalImoveis,       cor: 'bg-white border border-slate-200' },
              { label: 'Pessoas Jurídicas',    val: kpis.pjAtivas,           cor: 'bg-white border border-slate-200' },
              { label: 'Com Dívida Ativa',     val: kpis.inadimplentes,      cor: kpis.inadimplentes > 0 ? 'bg-red-50 border border-red-200' : 'bg-white border border-slate-200' },
            ].map(({ label, val, cor }) => (
              <div key={label} className={`${cor} rounded-xl p-4 text-center`}>
                <p className="text-3xl font-bold text-slate-800">{val}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-300 focus:outline-none"
              placeholder="Nome, CPF, CNPJ, código..." value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
            value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="">Todos os tipos</option>
            <option value="FISICA">Pessoa Física</option>
            <option value="JURIDICA">Pessoa Jurídica</option>
          </select>
          <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
            value={filtroSit} onChange={e => setFiltroSit(e.target.value)}>
            <option value="">Todas situações</option>
            {(Object.entries(SIT) as [Situacao, any][]).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-5 space-y-2">
            {carregando ? <div className="text-center py-12 text-slate-400">Carregando…</div>
            : contribuintes.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <User size={28} className="mx-auto mb-2 opacity-30"/>
                <p>Nenhum contribuinte encontrado.</p>
              </div>
            ) : contribuintes.map(c => (
              <button key={c.id} onClick={() => { setSelecionado(null); carregarDetalhe(c.id) }}
                className={`w-full text-left bg-white border rounded-xl p-3 hover:shadow-sm transition-all ${
                  selecionado?.id === c.id ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'
                }`}>
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-500">{c.codigo}</span>
                      <ChipSit sit={c.situacao}/>
                      {c.tipoPessoa === 'JURIDICA'
                        ? <Building2 size={12} className="text-slate-400"/>
                        : <User size={12} className="text-slate-400"/>}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {c.tipoPessoa === 'JURIDICA' ? (c.razaoSocial ?? c.nome) : c.nome}
                    </p>
                    <p className="text-xs text-slate-500">{formatDoc(c)}</p>
                    {c.bairro && <p className="text-xs text-slate-400">{c.bairro}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    {(c._count?.dividasAtivas ?? 0) > 0 && (
                      <span className="text-xs text-red-500 font-medium">{c._count?.dividasAtivas} DA</span>
                    )}
                    {(c._count?.imoveis ?? 0) > 0 && (
                      <p className="text-xs text-slate-400">{c._count?.imoveis} imóv.</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="col-span-7">
            {selecionado ? (
              <PainelContribuinte ct={selecionado} onAcao={executarAcao}/>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl flex items-center justify-center h-64 text-slate-400">
                <div className="text-center">
                  <User size={28} className="mx-auto mb-2 opacity-30"/>
                  <p className="text-sm">Selecione um contribuinte</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {modal && <ModalNovoContribuinte onFechar={() => setModal(false)} onSalvar={salvarContribuinte}/>}
    </div>
  )
}
