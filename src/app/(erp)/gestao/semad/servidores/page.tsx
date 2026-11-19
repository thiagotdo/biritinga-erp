'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search, Plus, Filter, ChevronRight, X, User, Briefcase,
  Phone, Mail, Building2, Calendar, FileText, Shield,
  CheckCircle, XCircle, Clock, AlertCircle, Cake,
  MapPin, CreditCard, Hash,
} from 'lucide-react'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Cargo { id: string; nome: string; simbolo?: string }
interface Unidade { id: string; nome: string; sigla: string }
interface Lotacao { unidade: Unidade; funcao?: string }

interface Servidor {
  id: string
  matricula: string
  nome: string
  cpf: string
  situacao: string
  vinculo: string
  regime: string
  cargo?: Cargo
  cargaHoraria: number
  salarioBase?: number
  dataAdmissao: string
  emailInstitucional?: string
  celular?: string
  pcd: boolean
  foto?: string
  lotacoes: Lotacao[]
  _count: { ferias: number; afastamentos: number }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtCPF(cpf: string) {
  const c = cpf.replace(/\D/g, '')
  return c.length === 11 ? `${c.slice(0,3)}.${c.slice(3,6)}.${c.slice(6,9)}-${c.slice(9)}` : cpf
}
function fmtMoeda(v?: number) {
  if (!v) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── Info de situação ─────────────────────────────────────────────────────────

const SITUACAO_INFO: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  ATIVO:               { label: 'Ativo',          cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  FERIAS:              { label: 'Férias',          cls: 'bg-sky-100 text-sky-700',         icon: Calendar },
  AFASTADO:            { label: 'Afastado',        cls: 'bg-amber-100 text-amber-700',     icon: Clock },
  LICENCA_MEDICA:      { label: 'Lic. Médica',     cls: 'bg-orange-100 text-orange-700',   icon: AlertCircle },
  LICENCA_MATERNIDADE: { label: 'Lic. Maternidade',cls: 'bg-purple-100 text-purple-700',   icon: Clock },
  LICENCA_PATERNIDADE: { label: 'Lic. Paternidade',cls: 'bg-purple-100 text-purple-700',   icon: Clock },
  CEDIDO:              { label: 'Cedido',          cls: 'bg-blue-100 text-blue-700',       icon: ArrowRight },
  INATIVO:             { label: 'Inativo',         cls: 'bg-slate-100 text-slate-500',     icon: XCircle },
  EXONERADO:           { label: 'Exonerado',       cls: 'bg-red-100 text-red-700',         icon: XCircle },
  APOSENTADO:          { label: 'Aposentado',      cls: 'bg-indigo-100 text-indigo-700',   icon: Shield },
  FALECIDO:            { label: 'Falecido',        cls: 'bg-gray-100 text-gray-500',       icon: XCircle },
}

function ArrowRight(props: React.SVGProps<SVGSVGElement>) {
  return <ChevronRight {...props} />
}

const VINCULO_LABEL: Record<string, string> = {
  EFETIVO: 'Efetivo',
  COMISSIONADO: 'Comissionado',
  CONTRATADO_CLT: 'CLT',
  CONTRATADO_TEMPORARIO: 'Temporário',
  ESTAGIARIO: 'Estagiário',
  AGENTE_POLITICO: 'Ag. Político',
}

// ─── Mock ─────────────────────────────────────────────────────────────────────

const MOCK: Servidor[] = [
  {
    id: '1', matricula: '00123', nome: 'Ana Carla Lima Santos', cpf: '12345678901',
    situacao: 'ATIVO', vinculo: 'EFETIVO', regime: 'ESTATUTARIO',
    cargo: { id: 'c1', nome: 'Professora', simbolo: 'P-III' },
    cargaHoraria: 40, salarioBase: 3200, dataAdmissao: '2015-03-01',
    emailInstitucional: 'ana.lima@biritinga.ba.gov.br', celular: '75998001234',
    pcd: false, lotacoes: [{ unidade: { id: 'u1', nome: 'Secretaria de Educação', sigla: 'SEC' }, funcao: undefined }],
    _count: { ferias: 2, afastamentos: 0 },
  },
  {
    id: '2', matricula: '00287', nome: 'Pedro Vieira Melo', cpf: '98765432100',
    situacao: 'FERIAS', vinculo: 'EFETIVO', regime: 'ESTATUTARIO',
    cargo: { id: 'c2', nome: 'Motorista', simbolo: 'M-I' },
    cargaHoraria: 40, salarioBase: 2200, dataAdmissao: '2010-07-15',
    emailInstitucional: undefined, celular: '75999887766',
    pcd: false, lotacoes: [{ unidade: { id: 'u2', nome: 'Sec. de Obras', sigla: 'SEMOB' }, funcao: undefined }],
    _count: { ferias: 5, afastamentos: 1 },
  },
  {
    id: '3', matricula: '00351', nome: 'Joana Maria Silva', cpf: '55544433322',
    situacao: 'LICENCA_MEDICA', vinculo: 'EFETIVO', regime: 'ESTATUTARIO',
    cargo: { id: 'c3', nome: 'Assistente Administrativo', simbolo: 'AA-II' },
    cargaHoraria: 30, salarioBase: 1800, dataAdmissao: '2018-01-10',
    emailInstitucional: 'joana.silva@biritinga.ba.gov.br', celular: '75997654321',
    pcd: true, lotacoes: [{ unidade: { id: 'u3', nome: 'Administração Municipal', sigla: 'SEMAD' }, funcao: 'Recepção' }],
    _count: { ferias: 1, afastamentos: 3 },
  },
]

const SITUACOES = [
  { value: '', label: 'Todas Situações' },
  { value: 'ATIVO', label: 'Ativo' },
  { value: 'FERIAS', label: 'Férias' },
  { value: 'AFASTADO', label: 'Afastado' },
  { value: 'LICENCA_MEDICA', label: 'Lic. Médica' },
  { value: 'INATIVO', label: 'Inativo' },
  { value: 'EXONERADO', label: 'Exonerado' },
]

const VINCULOS = [
  { value: '', label: 'Todos Vínculos' },
  { value: 'EFETIVO', label: 'Efetivo' },
  { value: 'COMISSIONADO', label: 'Comissionado' },
  { value: 'CONTRATADO_CLT', label: 'CLT' },
  { value: 'CONTRATADO_TEMPORARIO', label: 'Temporário' },
  { value: 'ESTAGIARIO', label: 'Estagiário' },
]

// ─── Painel lateral ───────────────────────────────────────────────────────────

function PainelServidor({ srv, onClose }: { srv: Servidor; onClose: () => void }) {
  const [aba, setAba] = useState<'dados' | 'historico' | 'ferias'>('dados')
  const sit = SITUACAO_INFO[srv.situacao] ?? { label: srv.situacao, cls: 'bg-slate-100 text-slate-600', icon: User }
  const SitIcon = sit.icon

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-50 w-full max-w-xl bg-white h-full shadow-xl flex flex-col">

        {/* Cabeçalho painel */}
        <div className="p-5 border-b border-slate-200 bg-indigo-50 flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xl">
              {srv.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <h2 className="font-bold text-slate-900">{srv.nome}</h2>
              <p className="text-sm text-slate-500">Mat. {srv.matricula} · {srv.cargo?.nome ?? '—'}</p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${sit.cls}`}>
                <SitIcon className="w-3 h-3" /> {sit.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-slate-200">
          {[
            { id: 'dados', label: 'Dados' },
            { id: 'historico', label: 'Histórico' },
            { id: 'ferias', label: 'Férias' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setAba(t.id as typeof aba)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${aba === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {aba === 'dados' && (
            <>
              <Section title="Dados Funcionais" icon={Briefcase}>
                <Row label="Vínculo"      value={VINCULO_LABEL[srv.vinculo] ?? srv.vinculo} />
                <Row label="Regime"       value={srv.regime} />
                <Row label="Carga Horária" value={`${srv.cargaHoraria}h semanais`} />
                <Row label="Salário Base"  value={fmtMoeda(srv.salarioBase)} />
                <Row label="Admissão"     value={fmtData(srv.dataAdmissao)} />
                <Row label="PcD"          value={srv.pcd ? 'Sim' : 'Não'} />
              </Section>

              <Section title="Lotação Atual" icon={Building2}>
                {srv.lotacoes.length === 0 ? (
                  <p className="text-sm text-slate-400">Sem lotação registrada</p>
                ) : (
                  srv.lotacoes.map((l, i) => (
                    <div key={i}>
                      <Row label="Unidade" value={`${l.unidade.nome} (${l.unidade.sigla})`} />
                      {l.funcao && <Row label="Função" value={l.funcao} />}
                    </div>
                  ))
                )}
              </Section>

              <Section title="Contato" icon={Phone}>
                <Row label="E-mail Inst." value={srv.emailInstitucional ?? '—'} />
                <Row label="Celular"       value={srv.celular ?? '—'} />
              </Section>

              <Section title="Documentos" icon={CreditCard}>
                <Row label="CPF" value={fmtCPF(srv.cpf)} />
              </Section>
            </>
          )}

          {aba === 'historico' && (
            <div className="text-sm text-slate-400 py-8 text-center">
              Histórico de movimentações em breve
            </div>
          )}

          {aba === 'ferias' && (
            <div>
              <p className="text-sm text-slate-500">{srv._count.ferias} período(s) de férias registrado(s)</p>
              <div className="mt-3 text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                Ver em Gestão de Férias
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex gap-2">
          <button className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            Editar Dados
          </button>
          <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            Movimentar
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-2">
        <Icon className="w-3.5 h-3.5" /> {title}
      </h3>
      <div className="bg-slate-50 rounded-lg p-3 space-y-2">{children}</div>
    </div>
  )
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-800 font-medium text-right">{value}</span>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ServidoresPage() {
  const [servidores, setServidores] = useState<Servidor[]>(MOCK)
  const [busca, setBusca] = useState('')
  const [situacao, setSituacao] = useState('')
  const [vinculo, setVinculo] = useState('')
  const [selecionado, setSelecionado] = useState<Servidor | null>(null)

  const filtrados = servidores.filter(s => {
    if (situacao && s.situacao !== situacao) return false
    if (vinculo  && s.vinculo !== vinculo)   return false
    if (busca) {
      const q = busca.toLowerCase()
      return s.nome.toLowerCase().includes(q)
          || s.matricula.includes(q)
          || s.cpf.includes(q.replace(/\D/g,''))
    }
    return true
  })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" /> Servidores Municipais
          </h1>
          <p className="text-sm text-slate-500">{filtrados.length} servidores encontrados</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Servidor
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Buscar por nome, matrícula ou CPF…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={situacao}
          onChange={e => setSituacao(e.target.value)}
        >
          {SITUACOES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={vinculo}
          onChange={e => setVinculo(e.target.value)}
        >
          {VINCULOS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtrados.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum servidor encontrado</p>
          </div>
        ) : (
          filtrados.map(s => {
            const sit = SITUACAO_INFO[s.situacao] ?? { label: s.situacao, cls: 'bg-slate-100 text-slate-500', icon: User }
            const SitIcon = sit.icon
            const unidade = s.lotacoes[0]?.unidade
            return (
              <div
                key={s.id}
                className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => setSelecionado(s)}
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm shrink-0">
                  {s.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">{s.nome}</span>
                    {s.pcd && (
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">PcD</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{s.matricula}</span>
                    <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{s.cargo?.nome ?? '—'}</span>
                    {unidade && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{unidade.sigla}</span>}
                  </div>
                </div>

                {/* Badge situação */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sit.cls}`}>
                    <SitIcon className="w-3 h-3" /> {sit.label}
                  </span>
                  <span className="text-xs text-slate-400">{VINCULO_LABEL[s.vinculo]}</span>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </div>
            )
          })
        )}
      </div>

      {/* Painel lateral */}
      {selecionado && <PainelServidor srv={selecionado} onClose={() => setSelecionado(null)} />}
    </div>
  )
}
