'use client'
import { useState, useEffect, useCallback } from 'react'

// ─── Agenda de Atendimentos SUAS ──────────────────────────────────────────────
// Visualização diária e mensal dos atendimentos do CRAS/CREAS

type Unidade = { id: string; nome: string; tipo: string }
type Atendimento = {
  id: string; tipo: string; situacao: string
  dataAtendimento: string; duracaoMinutos?: number; tecnicoNome?: string
  objetivo?: string; descricao?: string; encaminhamentos?: string
  familia: { responsavelNome: string; numeroProntuario: string }
  unidade: { nome: string }
}
type KPIs = {
  hoje_agendados: number; hoje_realizados: number; faltasHoje: number
  mes_total: number; mes_realizados: number; taxaPresenca: string; ano_realizados: number
}

const TIPO_LABEL: Record<string, string> = {
  RECEPCAO_TRIAGEM: 'Recepção',
  ATENDIMENTO_INDIVIDUAL: 'Individual',
  ATENDIMENTO_FAMILIAR: 'Familiar',
  VISITA_DOMICILIAR: 'Visita Dom.',
  REUNIAO_GRUPO: 'Reunião/Grupo',
  OFICINA: 'Oficina',
  ENCAMINHAMENTO: 'Encaminhamento',
  ACOMPANHAMENTO: 'Acompanhamento',
  CADASTRO_ATUALIZAÇÃO: 'Cadastro/Atualiz.',
}

const SITUACAO_COR: Record<string, string> = {
  AGENDADO:    'bg-blue-100 text-blue-700',
  REALIZADO:   'bg-green-100 text-green-700',
  FALTOU:      'bg-red-100 text-red-700',
  CANCELADO:   'bg-gray-100 text-gray-600',
  TRANSFERIDO: 'bg-yellow-100 text-yellow-700',
}

function dataHoje() {
  return new Date().toISOString().split('T')[0]
}

function CardAtendimento({ at, onAcao }: {
  at: Atendimento; onAcao: (id: string, acao: string, dados?: any) => void
}) {
  const [expandido, setExpandido] = useState(false)
  const [relato, setRelato] = useState('')
  const [encam, setEncam] = useState('')

  const hora = new Date(at.dataAtendimento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`bg-white rounded-xl border p-4 ${at.situacao === 'REALIZADO' ? 'border-green-200' : at.situacao === 'FALTOU' ? 'border-red-200' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 truncate">{at.familia.responsavelNome}</span>
            <span className="text-xs text-gray-400">{at.familia.numeroProntuario}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-gray-500">🕐 {hora}</span>
            <span className="text-xs text-indigo-600">{TIPO_LABEL[at.tipo] ?? at.tipo}</span>
            {at.tecnicoNome && <span className="text-xs text-gray-400">👤 {at.tecnicoNome}</span>}
          </div>
          {at.objetivo && <div className="text-xs text-gray-500 mt-1 line-clamp-1">{at.objetivo}</div>}
        </div>
        <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${SITUACAO_COR[at.situacao] ?? 'bg-gray-100 text-gray-600'}`}>
          {at.situacao}
        </span>
      </div>

      {/* Ações */}
      {at.situacao === 'AGENDADO' && (
        <div className="mt-3 flex gap-2">
          <button onClick={() => setExpandido(!expandido)}
            className="flex-1 py-1.5 text-xs font-medium border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50">
            {expandido ? 'Fechar' : 'Registrar Atendimento'}
          </button>
          <button onClick={() => onAcao(at.id, 'FALTOU')}
            className="px-3 py-1.5 text-xs font-medium border border-red-300 text-red-600 rounded-lg hover:bg-red-50">
            Faltou
          </button>
          <button onClick={() => onAcao(at.id, 'CANCELADO')}
            className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
        </div>
      )}

      {/* Formulário de registro rápido */}
      {expandido && at.situacao === 'AGENDADO' && (
        <div className="mt-3 pt-3 border-t space-y-2">
          <textarea value={relato} onChange={e => setRelato(e.target.value)} rows={2} placeholder="Relato do atendimento..."
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500" />
          <input type="text" value={encam} onChange={e => setEncam(e.target.value)} placeholder="Encaminhamentos..."
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500" />
          <button onClick={() => onAcao(at.id, 'REALIZADO', { descricao: relato, encaminhamentos: encam })}
            className="w-full py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700">
            ✓ Confirmar Realizado
          </button>
        </div>
      )}

      {/* Detalhe se realizado */}
      {at.situacao === 'REALIZADO' && at.descricao && (
        <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2 line-clamp-2">{at.descricao}</div>
      )}
    </div>
  )
}

export default function AtendimentosPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [data, setData] = useState(dataHoje())
  const [unidadeFiltro, setUnidadeFiltro] = useState('')
  const [msg, setMsg] = useState('')

  const carregarDados = useCallback(async () => {
    const [kR, uR] = await Promise.all([
      fetch('/api/assistencia/atendimento?relatorio=DASHBOARD'),
      fetch('/api/assistencia/unidade'),
    ])
    const [kD, uD] = await Promise.all([kR.json(), uR.json()])
    setKpis(kD.kpis)
    setUnidades(uD.unidades ?? [])
  }, [])

  const carregarAtendimentos = useCallback(async () => {
    const params = new URLSearchParams({ data })
    if (unidadeFiltro) params.set('unidadeId', unidadeFiltro)
    const r = await fetch(`/api/assistencia/atendimento?${params}`)
    const d = await r.json()
    setAtendimentos(d.atendimentos ?? [])
  }, [data, unidadeFiltro])

  useEffect(() => { carregarDados() }, [carregarDados])
  useEffect(() => { carregarAtendimentos() }, [carregarAtendimentos])

  async function executarAcao(id: string, acao: string, dados: any = {}) {
    const r = await fetch('/api/assistencia/atendimento', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, acao, ...dados }),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    setMsg(`${acao === 'REALIZADO' ? '✓ Atendimento registrado' : `Status: ${acao}`}`)
    carregarAtendimentos()
    carregarDados()
    setTimeout(() => setMsg(''), 3000)
  }

  // Agrupar por unidade
  const porUnidade = atendimentos.reduce<Record<string, Atendimento[]>>((acc, at) => {
    const nome = at.unidade.nome
    if (!acc[nome]) acc[nome] = []
    acc[nome].push(at)
    return acc
  }, {})

  const realizados = atendimentos.filter(a => a.situacao === 'REALIZADO').length
  const agendados  = atendimentos.filter(a => a.situacao === 'AGENDADO').length
  const faltas     = atendimentos.filter(a => a.situacao === 'FALTOU').length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assistência Social — Atendimentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Agenda CRAS/CREAS · SUAS · Lei 12.435/2011</p>
        </div>
      </div>

      {msg && (
        <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{msg}</div>
      )}

      {/* KPIs dashboard */}
      {kpis && (
        <div className="px-6 py-4 grid grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Hoje Agend.',   valor: kpis.hoje_agendados,  cor: 'text-blue-600' },
            { label: 'Hoje Realiz.',  valor: kpis.hoje_realizados, cor: 'text-green-600' },
            { label: 'Faltas Hoje',   valor: kpis.faltasHoje,      cor: 'text-red-600' },
            { label: 'Mês Total',     valor: kpis.mes_total,       cor: 'text-gray-700' },
            { label: 'Mês Realizados', valor: kpis.mes_realizados, cor: 'text-green-600' },
            { label: 'Taxa Presença', valor: kpis.taxaPresenca,    cor: 'text-indigo-600' },
            { label: 'No Ano',        valor: kpis.ano_realizados,  cor: 'text-gray-600' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className={`text-2xl font-bold ${k.cor}`}>{k.valor}</div>
              <div className="text-xs text-gray-400 mt-0.5">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros de data */}
      <div className="px-6 pb-4 flex gap-3 items-center">
        <div className="flex gap-1">
          <button onClick={() => { const d = new Date(data); d.setDate(d.getDate()-1); setData(d.toISOString().split('T')[0]) }}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">←</button>
          <input type="date" value={data} onChange={e => setData(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
          <button onClick={() => { const d = new Date(data); d.setDate(d.getDate()+1); setData(d.toISOString().split('T')[0]) }}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">→</button>
          <button onClick={() => setData(dataHoje())}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 text-indigo-600">Hoje</button>
        </div>
        <select value={unidadeFiltro} onChange={e => setUnidadeFiltro(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
          <option value="">Todas as unidades</option>
          {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>
        <div className="ml-auto flex gap-3 text-sm">
          <span className="text-green-600 font-semibold">✓ {realizados}</span>
          <span className="text-blue-600 font-semibold">◑ {agendados}</span>
          <span className="text-red-600 font-semibold">✗ {faltas}</span>
        </div>
      </div>

      {/* Grid por unidade */}
      <div className="px-6 pb-8">
        {atendimentos.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            <div className="text-5xl mb-3">📅</div>
            <div>Nenhum atendimento nesta data</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {Object.entries(porUnidade).map(([nome, ats]) => (
              <div key={nome}>
                <div className="text-sm font-semibold text-gray-600 mb-2 flex items-center justify-between">
                  <span>{nome}</span>
                  <span className="text-xs text-gray-400">{ats.length} atend.</span>
                </div>
                <div className="space-y-3">
                  {ats.map(at => (
                    <CardAtendimento key={at.id} at={at} onAcao={executarAcao} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
