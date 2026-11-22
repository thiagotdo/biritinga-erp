'use client'
import { useState, useEffect, useCallback } from 'react'

type Agendamento = {
  id: string; dataSaida: string; dataRetornoPrev: string; dataRetornoReal?: string
  destino: string; finalidade: string; solicitante: string; secretoriaSolic?: string
  situacao: string; kmPercorrido?: number; hodometroSaida?: number; hodometroRetorno?: number
  veiculo: { placa: string; modelo: string; tipo: string }
  motorista?: { nome: string }
}
type Motorista = { id: string; nome: string; categoriaCnh: string; vencimentoCnh: string; cnhVencida: boolean; cnhVencendo: boolean; situacao: string }
type Veiculo   = { id: string; placa: string; modelo: string; tipo: string; situacao: string; hodometro: number }
type KPIs = { emUso: number; agendadosHoje: number; concluidosHoje: number; totalMes: number; kmMes: number }

const TIPO_ICON: Record<string, string> = {
  CARRO: '🚗', CAMINHONETE: '🛻', VAN: '🚐', MICRO_ONIBUS: '🚌', ONIBUS: '🚌',
  CAMINHAO: '🚛', CAMINHAO_PIPA: '🚒', TRATOR: '🚜', RETROESCAVADEIRA: '🚜',
  MOTONIVELADORA: '🚧', MOTOCICLETA: '🏍️', BICICLETA_ELETRICA: '🚴', BARCO: '⛵', OUTRO: '🔧',
}
const SIT_COR: Record<string, string> = {
  AGENDADO:  'bg-blue-100 text-blue-700',
  EM_USO:    'bg-green-100 text-green-700',
  CONCLUIDO: 'bg-gray-100 text-gray-500',
  CANCELADO: 'bg-red-100 text-red-500',
}

function ModalAgendamento({
  veiculos, motoristas, onSalvar, onClose,
}: {
  veiculos: Veiculo[]; motoristas: Motorista[]
  onSalvar: (d: any) => void; onClose: () => void
}) {
  const [form, setForm] = useState({
    veiculoId: '', motoristaId: '', solicitante: '', secretoriaSolic: '',
    destino: '', finalidade: '',
    dataSaida: '', dataRetornoPrev: '',
  })
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const disponiveis = veiculos.filter(v => v.situacao === 'ATIVO')
  const motAtivos   = motoristas.filter(m => m.situacao === 'ATIVO' && !m.cnhVencida)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-5 border-b"><h2 className="font-bold text-gray-800">Novo Agendamento / Viagem</h2></div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Veículo *</label>
              <select value={form.veiculoId} onChange={e => f('veiculoId', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="">Selecionar…</option>
                {disponiveis.map(v => (
                  <option key={v.id} value={v.id}>{TIPO_ICON[v.tipo]} {v.placa} - {v.modelo}</option>
                ))}
              </select>
              {disponiveis.length === 0 && <p className="text-xs text-red-500 mt-0.5">Nenhum veículo disponível</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Motorista</label>
              <select value={form.motoristaId} onChange={e => f('motoristaId', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="">Sem motorista</option>
                {motAtivos.map(m => (
                  <option key={m.id} value={m.id}>{m.nome} ({m.categoriaCnh})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Solicitante *</label>
              <input type="text" value={form.solicitante} onChange={e => f('solicitante', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Secretaria</label>
              <input type="text" value={form.secretoriaSolic} onChange={e => f('secretoriaSolic', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Destino *</label>
            <input type="text" value={form.destino} onChange={e => f('destino', e.target.value)}
              placeholder="Cidade, endereço ou local"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Finalidade *</label>
            <textarea value={form.finalidade} onChange={e => f('finalidade', e.target.value)} rows={2}
              placeholder="Descrição do serviço / motivo da viagem"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Saída *</label>
              <input type="datetime-local" value={form.dataSaida} onChange={e => f('dataSaida', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Retorno Previsto *</label>
              <input type="datetime-local" value={form.dataRetornoPrev} onChange={e => f('dataRetornoPrev', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
          <button onClick={() => onSalvar(form)}
            disabled={!form.veiculoId || !form.solicitante || !form.destino || !form.finalidade || !form.dataSaida || !form.dataRetornoPrev}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            Agendar Viagem
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalRetorno({ agendamento, onSalvar, onClose }: { agendamento: Agendamento; onSalvar: (d: any) => void; onClose: () => void }) {
  const [hodRet, setHodRet] = useState((agendamento.hodometroSaida ?? 0).toString())
  const [obs, setObs] = useState('')
  const km = agendamento.hodometroSaida ? Number(hodRet) - agendamento.hodometroSaida : undefined

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="p-5 border-b"><h2 className="font-bold text-gray-800">Registrar Retorno</h2></div>
        <div className="p-5 space-y-3">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <div className="font-medium">{agendamento.veiculo.placa} - {agendamento.veiculo.modelo}</div>
            <div className="text-gray-500 text-xs">{agendamento.destino}</div>
            {agendamento.hodometroSaida && (
              <div className="text-xs text-gray-400 mt-0.5">Hodômetro na saída: {agendamento.hodometroSaida.toLocaleString('pt-BR')} km</div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Hodômetro no Retorno (km) *</label>
            <input type="number" value={hodRet} onChange={e => setHodRet(e.target.value)}
              min={agendamento.hodometroSaida ?? 0}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            {km !== undefined && km >= 0 && (
              <p className="text-xs text-indigo-600 mt-0.5">{km.toLocaleString('pt-BR')} km percorridos</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
          <button onClick={() => onSalvar({ hodometroRetorno: Number(hodRet), observacoes: obs })}
            disabled={!hodRet || Number(hodRet) < (agendamento.hodometroSaida ?? 0)}
            className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            Confirmar Retorno
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OperacoesPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [filtroSituacao, setFiltroSituacao] = useState('')
  const [modalAgendar, setModalAgendar] = useState(false)
  const [modalRetorno, setModalRetorno] = useState<Agendamento | null>(null)
  const [msg, setMsg] = useState('')

  const carregar = useCallback(async () => {
    const params = new URLSearchParams()
    if (filtroSituacao) params.set('situacao', filtroSituacao)
    const [kR, aR, vR, mR] = await Promise.all([
      fetch('/api/frota/agendamento?relatorio=DASHBOARD'),
      fetch(`/api/frota/agendamento?${params}`),
      fetch('/api/frota/veiculo?situacao=ATIVO'),
      fetch('/api/frota/motorista?situacao=ATIVO'),
    ])
    const [kD, aD, vD, mD] = await Promise.all([kR.json(), aR.json(), vR.json(), mR.json()])
    setKpis(kD.kpis)
    setAgendamentos(aD.agendamentos ?? [])
    setVeiculos(vD.veiculos ?? [])
    setMotoristas(mD.motoristas ?? [])
  }, [filtroSituacao])

  useEffect(() => { carregar() }, [carregar])

  async function agendar(dados: any) {
    const r = await fetch('/api/frota/agendamento', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    setMsg('Viagem agendada!')
    setModalAgendar(false)
    carregar()
    setTimeout(() => setMsg(''), 3000)
  }

  async function mudarSituacao(id: string, acao: string, extra?: object) {
    const r = await fetch('/api/frota/agendamento', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, acao, ...extra }),
    })
    const d = await r.json()
    if (!r.ok) { setMsg(d.erro ?? 'Erro'); return }
    if (d.kmPercorrido) setMsg(`Retorno registrado! ${d.kmPercorrido} km percorridos.`)
    else setMsg('Situação atualizada!')
    setModalRetorno(null)
    carregar()
    setTimeout(() => setMsg(''), 4000)
  }

  const fmtData  = (v: string) => new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  const fmtKm    = (v?: number) => v ? `${v.toLocaleString('pt-BR')} km` : '—'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Operações de Frota</h1>
            <p className="text-sm text-gray-500 mt-0.5">Agendamentos, viagens e controle de saída/retorno de veículos</p>
          </div>
          <button onClick={() => setModalAgendar(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
            + Nova Viagem
          </button>
        </div>
      </div>

      {msg && (
        <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{msg}</div>
      )}

      {/* KPIs */}
      {kpis && (
        <div className="px-6 py-4 grid grid-cols-5 gap-3">
          {[
            { label: 'Em Uso Agora',      valor: kpis.emUso,          cor: 'text-green-600' },
            { label: 'Agendados Hoje',    valor: kpis.agendadosHoje,  cor: 'text-blue-600' },
            { label: 'Concluídos Hoje',   valor: kpis.concluidosHoje, cor: 'text-gray-600' },
            { label: 'Total no Mês',      valor: kpis.totalMes,       cor: 'text-indigo-600' },
            { label: 'Km no Mês',         valor: fmtKm(kpis.kmMes),   cor: 'text-purple-600' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className={`text-2xl font-bold ${k.cor}`}>{k.valor}</div>
              <div className="text-xs text-gray-400 mt-0.5">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtro */}
      <div className="px-6 pb-4 flex gap-3">
        <select value={filtroSituacao} onChange={e => setFiltroSituacao(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Todas as situações</option>
          {['AGENDADO','EM_USO','CONCLUIDO','CANCELADO'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <span className="ml-auto text-sm text-gray-500 self-center">{agendamentos.length} registros</span>
      </div>

      {/* Lista de agendamentos */}
      <div className="px-6 pb-8 space-y-2 max-w-4xl">
        {agendamentos.map(a => (
          <div key={a.id} className={`bg-white rounded-xl border p-4 ${
            a.situacao === 'EM_USO' ? 'border-green-300 shadow-sm' : 'border-gray-200'
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="text-2xl">{TIPO_ICON[a.veiculo.tipo] ?? '🚗'}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 font-mono">{a.veiculo.placa}</span>
                    <span className="text-sm text-gray-500">{a.veiculo.modelo}</span>
                  </div>
                  <div className="text-sm font-medium text-gray-700 mt-0.5 truncate">{a.destino}</div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate">{a.finalidade}</div>
                </div>
              </div>

              <div className="flex-shrink-0 text-right">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SIT_COR[a.situacao] ?? ''}`}>
                  {a.situacao.replace(/_/g, ' ')}
                </span>
                <div className="text-xs text-gray-400 mt-1">
                  {a.motorista ? a.motorista.nome : 'Sem motorista'}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-4 text-xs text-gray-500">
              <div className="flex gap-4">
                <span>🕐 Saída: <span className="font-medium text-gray-700">{fmtData(a.dataSaida)}</span></span>
                <span>🕐 Retorno prev: <span className="font-medium text-gray-700">{fmtData(a.dataRetornoPrev)}</span></span>
                {a.dataRetornoReal && <span>✅ Retornou: <span className="font-medium text-gray-700">{fmtData(a.dataRetornoReal)}</span></span>}
                {a.kmPercorrido && <span>📍 <span className="font-medium text-indigo-600">{fmtKm(a.kmPercorrido)}</span></span>}
              </div>
              <div className="text-gray-400">{a.solicitante}{a.secretoriaSolic ? ` · ${a.secretoriaSolic}` : ''}</div>
            </div>

            {/* Ações */}
            {a.situacao === 'AGENDADO' && (
              <div className="mt-3 flex gap-2">
                <button onClick={() => mudarSituacao(a.id, 'EM_USO')}
                  className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200">
                  ▶ Registrar Saída
                </button>
                <button onClick={() => mudarSituacao(a.id, 'CANCELADO')}
                  className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100">
                  ✕ Cancelar
                </button>
              </div>
            )}
            {a.situacao === 'EM_USO' && (
              <div className="mt-3">
                <button onClick={() => setModalRetorno(a)}
                  className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                  🏁 Registrar Retorno
                </button>
              </div>
            )}
          </div>
        ))}
        {agendamentos.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            <div className="text-5xl mb-3">🚗</div>
            <div>Nenhum agendamento neste filtro</div>
          </div>
        )}
      </div>

      {modalAgendar && (
        <ModalAgendamento
          veiculos={veiculos} motoristas={motoristas}
          onSalvar={agendar} onClose={() => setModalAgendar(false)}
        />
      )}
      {modalRetorno && (
        <ModalRetorno
          agendamento={modalRetorno}
          onSalvar={(extra) => mudarSituacao(modalRetorno.id, 'CONCLUIDO', extra)}
          onClose={() => setModalRetorno(null)}
        />
      )}
    </div>
  )
}
