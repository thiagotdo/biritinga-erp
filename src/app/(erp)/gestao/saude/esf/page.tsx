'use client'
import { useState, useEffect, useCallback } from 'react'

// ─── ESF - Estratégia Saúde da Família ───────────────────────────────────────
// Portaria GM/MS 2.436/2017 - PNAB
// Meta: 100% das famílias visitadas mensalmente pelos ACS
// Parâmetro: 1 ACS → máx. 750 famílias

interface Equipe { id: string; nome: string; area?: string; ativo: boolean; familiasTotal?: number; populacaoTotal?: number; unidade: { nome: string }; totalACS: number; totalMembros: number }
interface VisitaMes { id: string; acsNome: string; microarea: string; mes: string; familiasCadastradas: number; familiasVisitadas: number; gestantesAcomp: number; criancasAcomp: number; hipertensosAcomp: number; diabeticosAcomp: number }

interface Dash {
  kpis: { totalEquipes: number; totalFamilias: number; totalPopulacao: number; totalPacientes: number; pctCobertura: string; visitasMes: number }
  equipes: Equipe[]
  visitasMes: VisitaMes[]
}

const fmtNum = (v: number) => v.toLocaleString('pt-BR')

export default function ESFPage() {
  const [dash, setDash] = useState<Dash | null>(null)
  const [mesSel, setMesSel] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [modal, setModal] = useState<'equipe' | 'visita' | null>(null)
  const [form, setForm]   = useState<Record<string, any>>({})
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const r = await fetch(`/api/saude/esf?relatorio=DASHBOARD&mes=${mesSel}`)
    if (r.ok) setDash(await r.json())
  }, [mesSel])

  useEffect(() => { load() }, [load])

  const salvar = async (recurso?: string) => {
    setSalvando(true)
    const payload = recurso
      ? { _recurso: recurso, ...form, familiasCadastradas: Number(form.familiasCadastradas), familiasVisitadas: Number(form.familiasVisitadas), gestantesAcomp: Number(form.gestantesAcomp ?? 0), criancasAcomp: Number(form.criancasAcomp ?? 0), hipertensosAcomp: Number(form.hipertensosAcomp ?? 0), diabeticosAcomp: Number(form.diabeticosAcomp ?? 0), mes: form.mes ?? mesSel }
      : { ...form, populacaoTotal: Number(form.populacaoTotal), familiasTotal: Number(form.familiasTotal) }
    const r = await fetch('/api/saude/esf', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSalvando(false)
    if (r.ok) { setMsg('Salvo com sucesso!'); setModal(null); setForm({}); load() }
    else { const d = await r.json(); setMsg(JSON.stringify(d.erro)) }
  }

  const pct = Number(dash?.kpis.pctCobertura ?? 0)
  const corPct = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>🏥 Estratégia Saúde da Família</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>PNAB - Portaria GM/MS 2.436/2017 · Cobertura e visitas ACS</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="month" value={mesSel} onChange={e => setMesSel(e.target.value)}
            style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontWeight: 700 }} />
          <button onClick={() => setModal('equipe')} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>+ Equipe</button>
          <button onClick={() => setModal('visita')} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>+ Visitas ACS</button>
        </div>
      </div>

      {msg && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14, color: '#16a34a' }}>{msg}</div>}

      {dash && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { l: 'Equipes', v: dash.kpis.totalEquipes, c: '#3b82f6', i: '👥' },
              { l: 'Famílias', v: fmtNum(dash.kpis.totalFamilias), c: '#8b5cf6', i: '🏠' },
              { l: 'População', v: fmtNum(dash.kpis.totalPopulacao), c: '#1d4ed8', i: '👥' },
              { l: 'Pacientes', v: fmtNum(dash.kpis.totalPacientes), c: '#475569', i: '📋' },
              { l: `Visitas (${mesSel})`, v: fmtNum(dash.kpis.visitasMes), c: '#10b981', i: '🚶' },
              { l: '% Cobertura', v: `${dash.kpis.pctCobertura}%`, c: corPct, i: '📊' },
            ].map(k => (
              <div key={k.l} style={{ background: '#fff', borderRadius: 10, padding: 12, boxShadow: '0 2px 6px rgba(0,0,0,.04)', borderLeft: `4px solid ${k.c}`, textAlign: 'center' }}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{k.i}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: k.c }}>{k.v}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>{k.l}</div>
              </div>
            ))}
          </div>

          {/* Cobertura visual */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>Meta de Cobertura - {mesSel}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: corPct }}>{pct}%</span>
            </div>
            <div style={{ background: '#f1f5f9', borderRadius: 8, height: 24, overflow: 'hidden' }}>
              <div style={{ background: corPct, height: 24, width: `${Math.min(100, pct)}%`, borderRadius: 8, transition: 'width .5s', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 10 }}>
                {pct > 15 && <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>{pct}%</span>}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
              <span>0%</span><span>Meta: 100%</span><span>Alerta: {pct < 60 ? '⚠️ Baixa cobertura' : pct < 80 ? '🟡 Regular' : '✅ Boa'}</span>
            </div>
          </div>

          {/* Equipes */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Equipes ESF Ativas</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {dash.equipes.map(e => (
                <div key={e.id} style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,.04)' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>{e.nome}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>📍 {e.unidade.nome}{e.area ? ` · ${e.area}` : ''}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#3b82f6' }}>{fmtNum(e.familiasTotal ?? 0)}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>Famílias</div>
                    </div>
                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>{e.totalACS}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>ACS</div>
                    </div>
                  </div>
                </div>
              ))}
              {dash.equipes.length === 0 && <div style={{ color: '#94a3b8', fontSize: 14, padding: 20 }}>Nenhuma equipe cadastrada.</div>}
            </div>
          </div>

          {/* Visitas do mês */}
          {dash.visitasMes.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#374151' }}>Visitas ACS - {mesSel}</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['ACS', 'Microárea', 'Cadastradas', 'Visitadas', '% Cob.', 'Gestantes', 'Crianças', 'Hiperten.', 'Diabéticos'].map(h => (
                        <th key={h} style={{ padding: '8px', textAlign: h === 'ACS' || h === 'Microárea' ? 'left' : 'center', borderBottom: '2px solid #e2e8f0', fontSize: 11, textTransform: 'uppercase', color: '#475569' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dash.visitasMes.map(v => {
                      const pctV = v.familiasCadastradas > 0 ? (v.familiasVisitadas / v.familiasCadastradas * 100) : 0
                      return (
                        <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px', fontWeight: 600 }}>{v.acsNome}</td>
                          <td style={{ padding: '8px', color: '#64748b' }}>{v.microarea}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>{v.familiasCadastradas}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>{v.familiasVisitadas}</td>
                          <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: pctV >= 100 ? '#22c55e' : pctV >= 70 ? '#f59e0b' : '#ef4444' }}>{pctV.toFixed(0)}%</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>{v.gestantesAcomp}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>{v.criancasAcomp}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>{v.hipertensosAcomp}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>{v.diabeticosAcomp}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal nova equipe */}
      {modal === 'equipe' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 480, maxWidth: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 800 }}>👥 Nova Equipe ESF</h2>

            <div style={{ marginBottom: 16 }}>
              <label style={lblS}>Nome da Equipe *</label>
              <input value={form.nome ?? ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={inpS} placeholder="ex: Equipe Verde" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Unidade (ID) *</label>
                <input value={form.unidadeId ?? ''} onChange={e => setForm(f => ({ ...f, unidadeId: e.target.value }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>INE</label>
                <input value={form.ine ?? ''} onChange={e => setForm(f => ({ ...f, ine: e.target.value }))} style={inpS} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={lblS}>Total de Famílias</label>
                <input type="number" value={form.familiasTotal ?? ''} onChange={e => setForm(f => ({ ...f, familiasTotal: e.target.value }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>População Total</label>
                <input type="number" value={form.populacaoTotal ?? ''} onChange={e => setForm(f => ({ ...f, populacaoTotal: e.target.value }))} style={inpS} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => salvar()} disabled={salvando}
                style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                {salvando ? 'Salvando…' : '💾 Criar Equipe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal visita ACS */}
      {modal === 'visita' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 540, maxWidth: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 800 }}>🚶 Registrar Visitas ACS</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Equipe (ID) *</label>
                <input value={form.equipeId ?? ''} onChange={e => setForm(f => ({ ...f, equipeId: e.target.value }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>Mês *</label>
                <input type="month" value={form.mes ?? mesSel} onChange={e => setForm(f => ({ ...f, mes: e.target.value }))} style={inpS} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Nome do ACS *</label>
                <input value={form.acsNome ?? ''} onChange={e => setForm(f => ({ ...f, acsNome: e.target.value }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>Microárea *</label>
                <input value={form.microarea ?? ''} onChange={e => setForm(f => ({ ...f, microarea: e.target.value }))} style={inpS} placeholder="ex: 01" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Famílias Cadastradas *</label>
                <input type="number" value={form.familiasCadastradas ?? ''} onChange={e => setForm(f => ({ ...f, familiasCadastradas: e.target.value }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>Famílias Visitadas *</label>
                <input type="number" value={form.familiasVisitadas ?? ''} onChange={e => setForm(f => ({ ...f, familiasVisitadas: e.target.value }))} style={inpS} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={lblS}>Hipertensos</label>
                <input type="number" value={form.hipertensosAcomp ?? ''} onChange={e => setForm(f => ({ ...f, hipertensosAcomp: e.target.value }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>Diabéticos</label>
                <input type="number" value={form.diabeticosAcomp ?? ''} onChange={e => setForm(f => ({ ...f, diabeticosAcomp: e.target.value }))} style={inpS} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => salvar('VISITA')} disabled={salvando}
                style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                {salvando ? 'Salvando…' : '💾 Registrar Visitas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const lblS: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }
const inpS: React.CSSProperties = { width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }
