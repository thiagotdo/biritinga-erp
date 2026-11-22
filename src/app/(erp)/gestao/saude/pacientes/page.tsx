'use client'

import { useState, useEffect, useCallback } from 'react'

interface Paciente {
  id: string
  nomeCompleto: string
  nomeSocial?: string
  dataNascimento: string
  sexo: string
  cpf?: string
  cns?: string
  telefoneCelular?: string
  bairro?: string
  equipeESF?: string
  grupoRisco?: string
  situacao: string
  idade: number
  microareaAgente?: string
}

interface Atendimento {
  id: string
  numero: string
  tipo: string
  dataHora: string
  situacao: string
  cid10Principal?: string
  conduta?: string
  profissional?: { nomeCompleto: string; especialidade: string }
}

const SIT_COR: Record<string, string> = {
  ATIVO:       'bg-green-100 text-green-800',
  INATIVO:     'bg-gray-100 text-gray-700',
  OBITO:       'bg-red-100 text-red-700',
  TRANSFERIDO: 'bg-blue-100 text-blue-800',
}

const SEXO_ICON: Record<string, string> = { MASCULINO: '♂', FEMININO: '♀', INDETERMINADO: '⚥' }

const TIPO_ATD_LABEL: Record<string, string> = {
  CONSULTA: 'Consulta', RETORNO: 'Retorno', URGENCIA_EMERGENCIA: 'Urgência/Emergência',
  VISITA_DOMICILIAR: 'Visita Domiciliar', PROCEDIMENTO: 'Procedimento', EXAME: 'Exame',
  VACINACAO: 'Vacinação', PRE_NATAL: 'Pré-natal', PUERICULTURA: 'Puericultura',
  PLANEJAMENTO_FAMILIAR: 'Planejamento Familiar', SAUDE_MENTAL: 'Saúde Mental',
}

const SIT_ATD_COR: Record<string, string> = {
  AGENDADO: 'bg-blue-100 text-blue-800', EM_ESPERA: 'bg-yellow-100 text-yellow-800',
  EM_ATENDIMENTO: 'bg-orange-100 text-orange-800', CONCLUIDO: 'bg-green-100 text-green-800',
  FALTOU: 'bg-red-100 text-red-700', CANCELADO: 'bg-gray-100 text-gray-600',
}

const fmtD = (s: string) => new Date(s).toLocaleDateString('pt-BR')
const fmtDH = (s: string) => new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [kpis, setKpis] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [busca, setBusca] = useState('')
  const [filtroSit, setFiltroSit] = useState('')

  const [pacSel, setPacSel] = useState<Paciente | null>(null)
  const [atdsSel, setAtdsSel] = useState<Atendimento[]>([])
  const [vacinacoes, setVacinacoes] = useState<any[]>([])

  const [modalCad, setModalCad] = useState(false)
  const [modalAtd, setModalAtd] = useState(false)
  const [formPac, setFormPac] = useState<any>({ sexo: 'MASCULINO' })
  const [formAtd, setFormAtd] = useState<any>({ tipo: 'CONSULTA' })
  const [profissionais, setProfissionais] = useState<any[]>([])
  const [estabelecimentos, setEstabelecimentos] = useState<any[]>([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [dashR, pacsR] = await Promise.all([
        fetch('/api/saude/paciente?relatorio=DASHBOARD'),
        fetch('/api/saude/paciente'),
      ])
      const dash = await dashR.json()
      const pacs = await pacsR.json()
      setKpis(dash.kpis)
      setPacientes(pacs.pacientes ?? [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const selecionarPac = async (p: Paciente) => {
    setPacSel(p)
    const r = await fetch(`/api/saude/paciente?id=${p.id}`)
    const d = await r.json()
    setAtdsSel(d.paciente?.atendimentos ?? [])
    setVacinacoes(d.vacinacoes ?? [])
  }

  const abrirModalAtd = async () => {
    setFormAtd({ tipo: 'CONSULTA', pacienteId: pacSel?.id, dataHora: new Date().toISOString().slice(0,16) })
    if (profissionais.length === 0) {
      const r = await fetch('/api/saude/estabelecimento?recurso=profissionais')
      const d = await r.json()
      setProfissionais(d.profissionais ?? [])
    }
    if (estabelecimentos.length === 0) {
      const r = await fetch('/api/saude/estabelecimento')
      const d = await r.json()
      setEstabelecimentos(d.estabelecimentos ?? [])
    }
    setModalAtd(true)
  }

  const pacsFiltrados = pacientes.filter(p => {
    if (filtroSit && p.situacao !== filtroSit) return false
    if (busca && !p.nomeCompleto.toLowerCase().includes(busca.toLowerCase())
      && !(p.cpf ?? '').includes(busca.replace(/\D/g,''))
      && !(p.cns ?? '').includes(busca)) return false
    return true
  })

  const salvarPaciente = async () => {
    setSalvando(true); setErro('')
    try {
      const r = await fetch('/api/saude/paciente', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formPac),
      })
      const d = await r.json()
      if (!r.ok) { setErro(d.erro?.fieldErrors ? JSON.stringify(d.erro.fieldErrors) : d.erro); return }
      setModalCad(false)
      carregar()
    } finally { setSalvando(false) }
  }

  const salvarAtendimento = async () => {
    setSalvando(true); setErro('')
    try {
      const r = await fetch('/api/saude/atendimento', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formAtd),
      })
      const d = await r.json()
      if (!r.ok) { setErro(d.erro?.fieldErrors ? JSON.stringify(d.erro.fieldErrors) : d.erro); return }
      setModalAtd(false)
      if (pacSel) selecionarPac(pacSel)
    } finally { setSalvando(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center"><div className="text-4xl mb-2">🏥</div><p className="text-gray-500">Carregando...</p></div>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cadastro de pacientes SUS e histórico de atendimentos</p>
        </div>
        <button onClick={() => { setFormPac({ sexo: 'MASCULINO' }); setModalCad(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Cadastrar Paciente
        </button>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Cadastrados', valor: kpis.total, icon: '👥' },
            { label: 'Ativos', valor: kpis.ativos, icon: '✅' },
            { label: 'Óbitos', valor: kpis.obitos, icon: '🕊️' },
            { label: 'Transferidos', valor: kpis.transferidos, icon: '🔁' },
            { label: 'Atend./Mês', valor: kpis.atendMes, icon: '📋' },
            { label: 'Agendados', valor: kpis.agendados, icon: '📅' },
            { label: 'Vacinas/Mês', valor: kpis.vacMes, icon: '💉' },
            { label: 'Gestantes Ativas', valor: kpis.gestantes, icon: '🤱' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm text-center">
              <div className="text-xl mb-0.5">{k.icon}</div>
              <div className="text-xl font-bold text-gray-900">{k.valor}</div>
              <div className="text-xs text-gray-500">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-100 flex gap-3 flex-wrap">
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, CPF ou CNS..."
              className="flex-1 min-w-48 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            <select value={filtroSit} onChange={e => setFiltroSit(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Todas situações</option>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
              <option value="OBITO">Óbito</option>
              <option value="TRANSFERIDO">Transferido</option>
            </select>
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Paciente</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Idade/Sexo</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Equipe/Área</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Situação</th>
                </tr>
              </thead>
              <tbody>
                {pacsFiltrados.map(p => (
                  <tr key={p.id} onClick={() => selecionarPac(p)}
                    className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${pacSel?.id === p.id ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">{p.nomeSocial ?? p.nomeCompleto}</div>
                      {p.nomeSocial && <div className="text-xs text-gray-400">{p.nomeCompleto}</div>}
                      <div className="text-xs text-gray-400">{p.cpf ? `CPF: ${p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')}` : p.cns ? `CNS: ${p.cns}` : 'Sem doc.'}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-700">{p.idade} anos</div>
                      <div className="text-xs text-gray-400">{SEXO_ICON[p.sexo]} {p.sexo}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-sm text-gray-700">{p.equipeESF ?? '—'}</div>
                      <div className="text-xs text-gray-400">{p.microareaAgente ? `Área: ${p.microareaAgente}` : p.bairro ?? ''}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SIT_COR[p.situacao] ?? 'bg-gray-100'}`}>
                        {p.situacao}
                      </span>
                      {p.grupoRisco && (
                        <div className="text-xs text-orange-600 mt-0.5">⚠️ {p.grupoRisco}</div>
                      )}
                    </td>
                  </tr>
                ))}
                {pacsFiltrados.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Nenhum paciente encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detalhe */}
        <div className="space-y-4">
          {pacSel ? (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{pacSel.nomeSocial ?? pacSel.nomeCompleto}</h3>
                    {pacSel.nomeSocial && <p className="text-xs text-gray-400">{pacSel.nomeCompleto}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SIT_COR[pacSel.situacao] ?? 'bg-gray-100'}`}>{pacSel.situacao}</span>
                      <span className="text-xs text-gray-500">{pacSel.idade} anos · {SEXO_ICON[pacSel.sexo]} {pacSel.sexo}</span>
                    </div>
                  </div>
                  <button onClick={abrirModalAtd}
                    className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                    + Agendar
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ['Nascimento', fmtD(pacSel.dataNascimento)],
                    ['CPF', pacSel.cpf ?? '—'],
                    ['CNS', pacSel.cns ?? '—'],
                    ['Celular', pacSel.telefoneCelular ?? '—'],
                    ['Equipe ESF', pacSel.equipeESF ?? '—'],
                    ['Microárea', pacSel.microareaAgente ?? '—'],
                    ['Bairro', pacSel.bairro ?? '—'],
                    ['Grupo de Risco', pacSel.grupoRisco ?? '—'],
                  ].map(([l,v]) => (
                    <div key={l}><div className="text-gray-400">{l}</div><div className="font-medium text-gray-800">{v}</div></div>
                  ))}
                </div>
              </div>

              {/* Histórico atendimentos */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-3 border-b border-gray-100 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">Atendimentos</span>
                  <span className="text-xs text-gray-400">{atdsSel.length} registros</span>
                </div>
                <div className="max-h-56 overflow-auto">
                  {atdsSel.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-4">Sem atendimentos registrados</p>
                  ) : atdsSel.map(a => (
                    <div key={a.id} className="border-b border-gray-50 px-3 py-2.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{TIPO_ATD_LABEL[a.tipo] ?? a.tipo}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${SIT_ATD_COR[a.situacao] ?? 'bg-gray-100'}`}>{a.situacao}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{fmtDH(a.dataHora)}</div>
                      {a.cid10Principal && <div className="text-xs text-blue-600 mt-0.5">CID-10: {a.cid10Principal}</div>}
                      {a.profissional && <div className="text-xs text-gray-500">{a.profissional.nomeCompleto}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Vacinações */}
              {vacinacoes.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-3 border-b border-gray-100">
                    <span className="text-sm font-semibold text-gray-700">💉 Histórico de Vacinação</span>
                  </div>
                  <div className="max-h-40 overflow-auto">
                    {vacinacoes.map(v => (
                      <div key={v.id} className="border-b border-gray-50 px-3 py-2 text-xs">
                        <div className="font-medium text-gray-900">{v.imunobiologico} {v.dose && `— ${v.dose}`}</div>
                        <div className="text-gray-400">{fmtD(v.dataAplicacao)} {v.lote && `· Lote: ${v.lote}`}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
              <div className="text-4xl mb-2">👥</div>
              <p className="text-gray-400 text-sm">Selecione um paciente para ver o prontuário</p>
            </div>
          )}
        </div>
      </div>

      {/* ══ MODAL: Cadastrar Paciente ═══════════════════════════════════════════ */}
      {modalCad && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Cadastrar Paciente SUS</h2>
              <button onClick={() => setModalCad(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {erro && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{erro}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nome Completo *</label>
                  <input value={formPac.nomeCompleto ?? ''} onChange={e => setFormPac((p: any) => ({ ...p, nomeCompleto: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nome Social</label>
                  <input value={formPac.nomeSocial ?? ''} onChange={e => setFormPac((p: any) => ({ ...p, nomeSocial: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nome da Mãe</label>
                  <input value={formPac.nomeMae ?? ''} onChange={e => setFormPac((p: any) => ({ ...p, nomeMae: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Data de Nascimento *</label>
                  <input type="date" value={formPac.dataNascimento ?? ''} onChange={e => setFormPac((p: any) => ({ ...p, dataNascimento: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Sexo Biológico *</label>
                  <select value={formPac.sexo ?? 'MASCULINO'} onChange={e => setFormPac((p: any) => ({ ...p, sexo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMININO">Feminino</option>
                    <option value="INDETERMINADO">Indeterminado</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">CPF</label>
                  <input value={formPac.cpf ?? ''} onChange={e => setFormPac((p: any) => ({ ...p, cpf: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="000.000.000-00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">CNS</label>
                  <input value={formPac.cns ?? ''} onChange={e => setFormPac((p: any) => ({ ...p, cns: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Cartão SUS" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Celular</label>
                  <input value={formPac.telefoneCelular ?? ''} onChange={e => setFormPac((p: any) => ({ ...p, telefoneCelular: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="(75) 99999-0000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Bairro</label>
                  <input value={formPac.bairro ?? ''} onChange={e => setFormPac((p: any) => ({ ...p, bairro: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Zona</label>
                  <select value={formPac.zona ?? ''} onChange={e => setFormPac((p: any) => ({ ...p, zona: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Selecione</option>
                    <option value="URBANA">Urbana</option>
                    <option value="RURAL">Rural</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Equipe ESF</label>
                  <input value={formPac.equipeESF ?? ''} onChange={e => setFormPac((p: any) => ({ ...p, equipeESF: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: ESF I" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Microárea / ACS</label>
                  <input value={formPac.microareaAgente ?? ''} onChange={e => setFormPac((p: any) => ({ ...p, microareaAgente: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Área 01" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Grupo de Risco</label>
                <input value={formPac.grupoRisco ?? ''} onChange={e => setFormPac((p: any) => ({ ...p, grupoRisco: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: HAS, DM, Gestante..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Alergias</label>
                <textarea value={formPac.alergias ?? ''} onChange={e => setFormPac((p: any) => ({ ...p, alergias: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Alergias a medicamentos, alimentos, etc." />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setModalCad(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={salvarPaciente} disabled={salvando}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {salvando ? 'Salvando...' : 'Cadastrar Paciente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Agendar Atendimento ══════════════════════════════════════════ */}
      {modalAtd && pacSel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Agendar Atendimento</h2>
              <button onClick={() => setModalAtd(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {erro && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{erro}</div>}
              <p className="text-sm font-medium text-gray-700">Paciente: {pacSel.nomeCompleto}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Atendimento *</label>
                  <select value={formAtd.tipo} onChange={e => setFormAtd((p: any) => ({ ...p, tipo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {Object.entries(TIPO_ATD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Data e Hora *</label>
                  <input type="datetime-local" value={formAtd.dataHora ?? ''} onChange={e => setFormAtd((p: any) => ({ ...p, dataHora: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Profissional</label>
                <select value={formAtd.profissionalId ?? ''} onChange={e => setFormAtd((p: any) => ({ ...p, profissionalId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Selecione (opcional)</option>
                  {profissionais.map(p => <option key={p.id} value={p.id}>{p.nomeCompleto} - {p.especialidade}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Estabelecimento</label>
                <select value={formAtd.estabelecimentoId ?? ''} onChange={e => setFormAtd((p: any) => ({ ...p, estabelecimentoId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Selecione (opcional)</option>
                  {estabelecimentos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Queixa Principal</label>
                <textarea value={formAtd.queixaPrincipal ?? ''} onChange={e => setFormAtd((p: any) => ({ ...p, queixaPrincipal: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setModalAtd(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={salvarAtendimento} disabled={salvando}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {salvando ? 'Agendando...' : '📅 Agendar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
