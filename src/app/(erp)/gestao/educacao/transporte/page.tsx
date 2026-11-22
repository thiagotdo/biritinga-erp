'use client'
import { useEffect, useState } from 'react'
import { Bus, Users, AlertTriangle, CheckCircle, Plus, ChevronRight, XCircle } from 'lucide-react'

type Veiculo = {
  id: string; placa: string; tipo: string; marca: string; modelo: string
  capacidade: number; motorista: string; monitorNome: string; rota: string
  aptoTransporte: boolean; ativo: boolean
  vencimentoCNH: string | null; vencimentoCRLV: string | null; vencimentoVistoria: string | null
  alertas: { cnh: boolean; crlv: boolean; vistoria: boolean }
}

type KPIs = { totalVeiculos: number; ativos: number; totalAlunos: number; inaptos: number; vencendo: number }

const TIPO_LABEL: Record<string, string> = {
  MICRO_ONIBUS: 'Micro-ônibus', ONIBUS: 'Ônibus', VAN: 'Van',
  KOMBI: 'Kombi', CAMINHONETE: 'Caminhonete',
}

function diasAte(d: string | null) {
  if (!d) return null
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

function BadgeApto({ apto }: { apto: boolean }) {
  return apto
    ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5"><CheckCircle size={11} /> Apto</span>
    : <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5"><XCircle size={11} /> Inapto</span>
}

function KpiCard({ icon: Icon, label, value, cor = '' }: { icon: any; label: string; value: number; cor?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${cor || 'text-gray-800'}`}>{value}</p>
        </div>
        <div className="p-2 rounded-lg bg-blue-50"><Icon size={20} className="text-blue-600" strokeWidth={1.5} /></div>
      </div>
    </div>
  )
}

export default function TransporteEscolarPage() {
  const [kpis, setKpis]       = useState<KPIs | null>(null)
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [rotas, setRotas]     = useState<any[]>([])
  const [selecionado, setSelecionado] = useState<Veiculo | null>(null)
  const [alunosVeiculo, setAlunosVeiculo] = useState<any[]>([])
  const [modal, setModal]     = useState<'veiculo' | null>(null)
  const [form, setForm]       = useState<any>({})
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg]         = useState('')
  const [rotaFiltro, setRotaFiltro] = useState('')

  async function carregar() {
    const [rDash, rList] = await Promise.all([
      fetch('/api/educacao/transporte?relatorio=DASHBOARD').then(r => r.json()),
      fetch('/api/educacao/transporte').then(r => r.json()),
    ])
    setKpis(rDash.kpis)
    setRotas(rDash.rotas ?? [])
    setVeiculos(rList.veiculos ?? [])
  }

  useEffect(() => { carregar() }, [])

  async function selecionarVeiculo(v: Veiculo) {
    setSelecionado(v)
    const r = await fetch(`/api/educacao/transporte?id=${v.id}`).then(r => r.json())
    setAlunosVeiculo(r.alunos ?? [])
  }

  async function salvar() {
    setSalvando(true)
    const r = await fetch('/api/educacao/transporte', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSalvando(false)
    if (r.ok) { setMsg('Veículo cadastrado!'); setModal(null); setForm({}); carregar() }
    else { const d = await r.json(); setMsg(d.erro) }
  }

  const veiculosFiltrados = rotaFiltro ? veiculos.filter(v => v.rota === rotaFiltro) : veiculos

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>🚌 Transporte Escolar</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Art. 136 CTB · Resolução CONTRAN 912/2022</p>
        </div>
        <button onClick={() => setModal('veiculo')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--cor-primaria)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Novo Veículo
        </button>
      </div>

      {msg && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 14 }}>{msg}</div>}

      {/* KPIs */}
      {kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          <KpiCard icon={Bus}           label="Total Veículos"    value={kpis.totalVeiculos} />
          <KpiCard icon={CheckCircle}   label="Em Operação"       value={kpis.ativos} cor="text-green-700" />
          <KpiCard icon={Users}         label="Alunos Atendidos"  value={kpis.totalAlunos} />
          <KpiCard icon={XCircle}       label="Inaptos (CTB)"     value={kpis.inaptos} cor="text-red-600" />
          <KpiCard icon={AlertTriangle} label="Doc. Vencendo"     value={kpis.vencendo} cor="text-amber-600" />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selecionado ? '1fr 380px' : '1fr', gap: 20 }}>
        {/* Lista de veículos */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {/* Filtro rota */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={rotaFiltro} onChange={e => setRotaFiltro(e.target.value)}
              style={{ fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', flex: 1 }}>
              <option value="">Todas as rotas</option>
              {rotas.map((r: any) => (
                <option key={r.rota} value={r.rota}>{r.rota} ({r.alunos} alunos)</option>
              ))}
            </select>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Placa / Tipo', 'Rota', 'Motorista', 'Alunos', 'Status / Docs', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {veiculosFiltrados.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Nenhum veículo cadastrado</td></tr>
              ) : veiculosFiltrados.map(v => (
                <tr key={v.id} onClick={() => selecionarVeiculo(v)}
                  style={{ borderTop: '1px solid #f1f5f9', cursor: 'pointer', background: selecionado?.id === v.id ? '#eff6ff' : undefined }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{v.placa}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{TIPO_LABEL[v.tipo] ?? v.tipo}</div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{v.rota ?? '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{v.motorista ?? '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#475569', textAlign: 'center' }}>{v.capacidade}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ marginBottom: 4 }}><BadgeApto apto={v.aptoTransporte} /></div>
                    {(v.alertas?.cnh || v.alertas?.crlv || v.alertas?.vistoria) && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {v.alertas?.cnh     && <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', borderRadius: 4, padding: '1px 6px' }}>CNH</span>}
                        {v.alertas?.crlv    && <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', borderRadius: 4, padding: '1px 6px' }}>CRLV</span>}
                        {v.alertas?.vistoria && <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', borderRadius: 4, padding: '1px 6px' }}>Vistoria</span>}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}><ChevronRight size={14} color="#94a3b8" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detalhe veículo */}
        {selecionado && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#1e293b' }}>{selecionado.placa}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{TIPO_LABEL[selecionado.tipo] ?? selecionado.tipo} · Rota: {selecionado.rota ?? '—'}</div>
              </div>
              <button onClick={() => setSelecionado(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16, fontSize: 13 }}>
              <div><span style={{ color: '#94a3b8' }}>Motorista</span><div style={{ fontWeight: 600 }}>{selecionado.motorista ?? '—'}</div></div>
              <div><span style={{ color: '#94a3b8' }}>Monitor</span><div style={{ fontWeight: 600 }}>{selecionado.monitorNome ?? '—'}</div></div>
              <div><span style={{ color: '#94a3b8' }}>Capacidade</span><div style={{ fontWeight: 600 }}>{selecionado.capacidade} alunos</div></div>
              <div><span style={{ color: '#94a3b8' }}>Aptidão CTB</span><div style={{ marginTop: 2 }}><BadgeApto apto={selecionado.aptoTransporte} /></div></div>
            </div>

            {/* Docs vencimento */}
            {[
              { label: 'Vencimento CNH', val: selecionado.vencimentoCNH },
              { label: 'Vencimento CRLV', val: selecionado.vencimentoCRLV },
              { label: 'Próx. Vistoria', val: selecionado.vencimentoVistoria },
            ].map(({ label, val }) => {
              if (!val) return null
              const dias = diasAte(val)
              const cor  = dias !== null && dias <= 0 ? '#dc2626' : dias !== null && dias <= 30 ? '#d97706' : '#16a34a'
              return (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: cor }}>
                    {new Date(val).toLocaleDateString('pt-BR')}
                    {dias !== null && dias <= 30 && ` (${dias}d)`}
                  </span>
                </div>
              )
            })}

            {/* Alunos */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 10 }}>
                Alunos ({alunosVeiculo.length})
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {alunosVeiculo.length === 0
                  ? <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 20 }}>Nenhum aluno vinculado</div>
                  : alunosVeiculo.map((a: any) => (
                    <div key={a.alunoId} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
                      <div style={{ fontWeight: 600 }}>{a.alunoNome}</div>
                      <div style={{ color: '#64748b' }}>{a.escolaNome} · {a.serie} · {a.pontoEmbarque ?? 'Embarque não definido'}</div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal novo veículo */}
      {modal === 'veiculo' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 800 }}>Cadastrar Veículo</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { key: 'placa', label: 'Placa *', placeholder: 'ABC-1234' },
                { key: 'tipo', label: 'Tipo', type: 'select', options: Object.entries(TIPO_LABEL) },
                { key: 'marca', label: 'Marca' },
                { key: 'modelo', label: 'Modelo' },
                { key: 'capacidade', label: 'Capacidade', placeholder: '20' },
                { key: 'rota', label: 'Rota', placeholder: 'Ex: Zona Rural Norte' },
                { key: 'motorista', label: 'Motorista', span: 2 },
                { key: 'monitorNome', label: 'Monitor', span: 2 },
                { key: 'vencimentoCNH', label: 'Venc. CNH', type: 'date' },
                { key: 'vencimentoCRLV', label: 'Venc. CRLV', type: 'date' },
                { key: 'vencimentoVistoria', label: 'Próx. Vistoria', type: 'date', span: 2 },
              ].map(({ key, label, placeholder, type, options, span }) => (
                <div key={key} style={{ gridColumn: span === 2 ? '1 / -1' : undefined }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>{label}</label>
                  {type === 'select' ? (
                    <select value={form[key] ?? ''} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 14 }}>
                      <option value="">—</option>
                      {options?.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  ) : (
                    <input type={type ?? 'text'} value={form[key] ?? ''} placeholder={placeholder}
                      onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' }} />
                  )}
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="apto" checked={form.aptoTransporte ?? false}
                  onChange={e => setForm((f: any) => ({ ...f, aptoTransporte: e.target.checked }))} />
                <label htmlFor="apto" style={{ fontSize: 13, color: '#475569' }}>Apto para transporte escolar (Art. 136 CTB)</label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => { setModal(null); setForm({}) }}
                style={{ padding: '8px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando}
                style={{ padding: '8px 20px', background: 'var(--cor-primaria)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                {salvando ? 'Salvando…' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
