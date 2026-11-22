'use client'
import { useState, useEffect, useCallback } from 'react'

// ─── Agenda de Consultas - SUS ────────────────────────────────────────────────
// Portaria GM/MS 1.820/2009 - Carta de Direitos dos Usuários do SUS
// PNAB Portaria 2.436/2017 - Atenção Básica

const TIPO_LABEL: Record<string, string> = {
  CONSULTA_MEDICA: '👨‍⚕️ Consulta Médica', CONSULTA_ENFERMAGEM: '🩺 Enfermagem',
  CONSULTA_ODONTOLOGICA: '🦷 Odontológica', PROCEDIMENTO: '💉 Procedimento',
  VACINACAO: '💊 Vacinação', CURATIVOS: '🩹 Curativos', VISITA_DOMICILIAR: '🏠 Visita Dom.',
  PRE_NATAL: '🤰 Pré-Natal', PUERICULTURA: '👶 Puericultura', HIPERTENSAO_DIABETES: '💓 HiperDia',
  SAUDE_MENTAL: '🧠 Saúde Mental', URGENCIA_EMERGENCIA: '🚨 Urgência',
}
const SIT_COR: Record<string, string> = {
  AGENDADO: '#3b82f6', CONFIRMADO: '#22c55e', ATENDIDO: '#10b981',
  FALTOU: '#f59e0b', CANCELADO: '#ef4444', REMARCADO: '#8b5cf6',
}

interface AgendItem {
  id: string; paciente: { nome: string }; profissional?: { nome: string; tipo: string }; unidade: { nome: string }
  tipoAtendimento: string; dataAgendamento: string; horaAgendamento: string; situacao: string; observacao?: string
}

interface Dash {
  kpis: { totalHoje: number; confirmadosHoje: number; faltasHoje: number; pctFalta: string; semanaTotal: number }
  agendaSemana: AgendItem[]
  porTipo: Array<{ tipo: string; count: number }>
  porUnidade: Array<{ unidade: string; count: number }>
}

export default function AgendaPage() {
  const [dash, setDash]     = useState<Dash | null>(null)
  const [dataSel, setDataSel] = useState(new Date().toISOString().split('T')[0])
  const [agends, setAgends] = useState<AgendItem[]>([])
  const [modal, setModal]   = useState(false)
  const [form, setForm]     = useState<Record<string, any>>({})
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg]       = useState('')
  const [diaAtual, setDiaAtual] = useState(new Date().toISOString().split('T')[0])

  const load = useCallback(async () => {
    const [rd, ra] = await Promise.all([
      fetch('/api/saude/agendamento?relatorio=DASHBOARD'),
      fetch(`/api/saude/agendamento?data=${dataSel}`),
    ])
    if (rd.ok) setDash(await rd.json())
    if (ra.ok) { const d = await ra.json(); setAgends(d.agendamentos ?? []) }
  }, [dataSel])

  useEffect(() => { load() }, [load])

  const salvar = async () => {
    setSalvando(true)
    const r = await fetch('/api/saude/agendamento', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSalvando(false)
    if (r.ok) { setMsg('Agendado!'); setModal(false); setForm({}); load() }
    else { const d = await r.json(); setMsg(JSON.stringify(d.erro)) }
  }

  const alterarSit = async (id: string, situacao: string) => {
    await fetch('/api/saude/agendamento', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, situacao }),
    })
    load()
  }

  // Dias da semana para visualização
  const semana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })

  return (
    <div style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>📅 Agenda de Saúde</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>SUS - Portaria GM/MS 1.820/2009</p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          + Novo Agendamento
        </button>
      </div>

      {msg && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14, color: '#16a34a' }}>{msg}</div>}

      {dash && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { l: 'Hoje', v: dash.kpis.totalHoje, c: '#3b82f6', i: '📅' },
            { l: 'Confirmados', v: dash.kpis.confirmadosHoje, c: '#22c55e', i: '✅' },
            { l: 'Faltas', v: dash.kpis.faltasHoje, c: dash.kpis.faltasHoje > 0 ? '#f59e0b' : '#94a3b8', i: '⚠️' },
            { l: '% Falta', v: `${dash.kpis.pctFalta}%`, c: parseInt(dash.kpis.pctFalta) > 20 ? '#ef4444' : '#22c55e', i: '📊' },
            { l: 'Semana', v: dash.kpis.semanaTotal, c: '#8b5cf6', i: '🗓️' },
          ].map(k => (
            <div key={k.l} style={{ background: '#fff', borderRadius: 10, padding: 14, boxShadow: '0 2px 6px rgba(0,0,0,.04)', borderLeft: `4px solid ${k.c}`, textAlign: 'center' }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{k.i}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: k.c }}>{k.v}</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>{k.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Seletor de dias */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {semana.map(d => {
          const dt = new Date(d + 'T12:00:00')
          const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
          const count = dash?.agendaSemana.filter(a => a.dataAgendamento.startsWith(d)).length ?? 0
          return (
            <button key={d} onClick={() => setDataSel(d)}
              style={{ minWidth: 70, padding: '10px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'center',
                background: dataSel === d ? '#10b981' : d === diaAtual ? '#ecfdf5' : '#fff',
                color: dataSel === d ? '#fff' : '#374151',
                boxShadow: '0 1px 4px rgba(0,0,0,.06)', }}>
              <div style={{ fontSize: 10, fontWeight: 600, opacity: .8 }}>{diasSemana[dt.getDay()]}</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{dt.getDate()}</div>
              {count > 0 && <div style={{ fontSize: 10, background: dataSel === d ? 'rgba(255,255,255,.3)' : '#d1fae5', color: dataSel === d ? '#fff' : '#065f46', borderRadius: 10, padding: '1px 5px', marginTop: 2 }}>{count}</div>}
            </button>
          )
        })}
      </div>

      {/* Lista do dia selecionado */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#374151' }}>
          Agendamentos - {new Date(dataSel + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
        </h3>
        {agends.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 14 }}>Nenhum agendamento para este dia.</div>}
        {agends.map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '8px 10px', textAlign: 'center', minWidth: 52 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>{a.horaAgendamento}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{a.paciente.nome}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {TIPO_LABEL[a.tipoAtendimento] ?? a.tipoAtendimento}
                {a.profissional && ` · ${a.profissional.nome}`}
                {' · '}{a.unidade.nome}
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, background: (SIT_COR[a.situacao] ?? '#94a3b8') + '20', color: SIT_COR[a.situacao] ?? '#94a3b8', padding: '3px 10px', borderRadius: 20 }}>
              {a.situacao}
            </span>
            {a.situacao === 'AGENDADO' && (
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => alterarSit(a.id, 'CONFIRMADO')} style={btnPeqS('#22c55e')}>✓</button>
                <button onClick={() => alterarSit(a.id, 'FALTOU')} style={btnPeqS('#f59e0b')}>✗</button>
                <button onClick={() => alterarSit(a.id, 'CANCELADO')} style={btnPeqS('#ef4444')}>✕</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal novo agendamento */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 540, maxWidth: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 800 }}>📅 Novo Agendamento</h2>

            <div style={{ marginBottom: 16 }}>
              <label style={lblS}>Paciente (ID) *</label>
              <input value={form.pacienteId ?? ''} onChange={e => setForm(f => ({ ...f, pacienteId: e.target.value }))} style={inpS} placeholder="ID do paciente" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Unidade *</label>
                <input value={form.unidadeId ?? ''} onChange={e => setForm(f => ({ ...f, unidadeId: e.target.value }))} style={inpS} placeholder="ID da unidade" />
              </div>
              <div>
                <label style={lblS}>Profissional</label>
                <input value={form.profissionalId ?? ''} onChange={e => setForm(f => ({ ...f, profissionalId: e.target.value }))} style={inpS} placeholder="ID do profissional" />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lblS}>Tipo de Atendimento *</label>
              <select value={form.tipoAtendimento ?? ''} onChange={e => setForm(f => ({ ...f, tipoAtendimento: e.target.value }))} style={inpS}>
                <option value="">Selecione…</option>
                {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Data *</label>
                <input type="date" value={form.dataAgendamento ?? dataSel} onChange={e => setForm(f => ({ ...f, dataAgendamento: e.target.value }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>Hora *</label>
                <input type="time" value={form.horaAgendamento ?? ''} onChange={e => setForm(f => ({ ...f, horaAgendamento: e.target.value }))} style={inpS} />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={lblS}>Observação</label>
              <input value={form.observacao ?? ''} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} style={inpS} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando}
                style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                {salvando ? 'Salvando…' : '💾 Agendar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const btnPeqS = (cor: string): React.CSSProperties => ({
  background: cor, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, fontWeight: 700,
})
const lblS: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }
const inpS: React.CSSProperties = { width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }
