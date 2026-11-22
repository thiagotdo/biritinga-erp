'use client'
import { useEffect, useState } from 'react'
import { AlertTriangle, Shield, Users, Phone, Send } from 'lucide-react'

type AlunoRisco = {
  alunoId: string; nome: string; responsavel: string; telefoneResponsavel: string
  escolaNome: string; serie: string; turmaNome: string
  totalAulas: number; presencas: number; faltas: number; pctFreq: number
}

function NivelBadge({ pct }: { pct: number }) {
  if (pct < 50) return <span style={{ background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>CRÍTICO - ECA Art. 56</span>
  if (pct < 75) return <span style={{ background: '#d97706', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>RISCO - LDB 75%</span>
  return null
}

function BarFreq({ pct }: { pct: number }) {
  const cor = pct < 50 ? '#dc2626' : pct < 75 ? '#d97706' : '#16a34a'
  return (
    <div style={{ width: '100%', background: '#f1f5f9', borderRadius: 100, height: 6, marginTop: 4 }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: 6, borderRadius: 100, background: cor }} />
    </div>
  )
}

export default function ConselhTutelarPage() {
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear())
  const [nivel, setNivel]         = useState('RISCO')
  const [kpis, setKpis]           = useState<any>(null)
  const [alunos, setAlunos]       = useState<AlunoRisco[]>([])
  const [loading, setLoading]     = useState(true)
  const [encaminhando, setEncaminhando] = useState<string | null>(null)
  const [msg, setMsg]             = useState('')

  async function carregar() {
    setLoading(true)
    const [rDash, rList] = await Promise.all([
      fetch(`/api/educacao/conselho-tutelar?relatorio=DASHBOARD&anoLetivo=${anoLetivo}`).then(r => r.json()),
      fetch(`/api/educacao/conselho-tutelar?anoLetivo=${anoLetivo}&nivel=${nivel}`).then(r => r.json()),
    ])
    setKpis(rDash.kpis)
    setAlunos(rList.alunos ?? [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [anoLetivo, nivel])

  async function encaminhar(aluno: AlunoRisco) {
    setEncaminhando(aluno.alunoId)
    await fetch('/api/educacao/conselho-tutelar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alunoId: aluno.alunoId, alunoNome: aluno.nome,
        pctFreq: aluno.pctFreq, anoLetivo,
        observacao: `Frequência ${aluno.pctFreq}% - ${aluno.faltas} faltas em ${aluno.totalAulas} aulas`,
      }),
    })
    setEncaminhando(null)
    setMsg(`Encaminhamento de ${aluno.nome} registrado com sucesso.`)
    setTimeout(() => setMsg(''), 5000)
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>🛡️ Conselho Tutelar</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>ECA Art. 56 · LDB Art. 24 - Monitoramento de frequência escolar</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={anoLetivo} onChange={e => setAnoLetivo(Number(e.target.value))}
            style={{ fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
            {[new Date().getFullYear(), new Date().getFullYear() - 1].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={nivel} onChange={e => setNivel(e.target.value)}
            style={{ fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
            <option value="RISCO">Freq {'<'} 75% (Risco)</option>
            <option value="CRITICO">Freq {'<'} 50% (Crítico)</option>
          </select>
        </div>
      </div>

      {msg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 14 }}>
          ✓ {msg}
        </div>
      )}

      {/* KPIs */}
      {kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Em Risco (< 75%)', value: kpis.emRisco, cor: '#d97706', icon: AlertTriangle },
            { label: 'Situação Crítica (< 50%)', value: kpis.criticos, cor: '#dc2626', icon: AlertTriangle },
            { label: 'Encaminhados ao CT', value: kpis.encaminhados, cor: '#7c3aed', icon: Shield },
          ].map(({ label, value, cor, icon: Icon }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ background: cor + '15', borderRadius: 10, padding: 10 }}>
                <Icon size={22} style={{ color: cor }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: cor }}>{value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lei */}
      <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#78350f', display: 'flex', gap: 10 }}>
        <AlertTriangle size={16} style={{ marginTop: 1, flexShrink: 0 }} />
        <div>
          <strong>ECA Art. 56:</strong> Os dirigentes de estabelecimentos de ensino fundamental comunicarão ao Conselho Tutelar os casos de falta injustificada e de evasão escolar, reiteração de condutas que provoquem mau trato ou superação do limite de faltas previsto na lei de diretrizes e bases.
          <strong style={{ marginLeft: 4 }}>Limite LDB: 25% de faltas (mín. 75% de frequência).</strong>
        </div>
      </div>

      {/* Lista alunos */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} /> Alunos {nivel === 'CRITICO' ? 'em situação crítica' : 'em risco'} ({alunos.length})
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Carregando…</div>
        ) : alunos.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <Shield size={40} style={{ color: '#bbf7d0', marginBottom: 12 }} />
            <div style={{ color: '#16a34a', fontWeight: 600 }}>Nenhum aluno em situação de risco</div>
            <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>Todos os alunos estão com frequência adequada</div>
          </div>
        ) : (
          <div>
            {alunos.map(a => (
              <div key={a.alunoId} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{a.nome}</span>
                    <NivelBadge pct={a.pctFreq} />
                  </div>
                  <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>
                    {a.escolaNome} · {a.turmaNome} · {a.serie}
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: '#94a3b8' }}>Faltas: <strong style={{ color: '#dc2626' }}>{a.faltas}</strong></span>
                    <span style={{ color: '#94a3b8' }}>Presenças: <strong>{a.presencas}</strong></span>
                    <span style={{ color: '#94a3b8' }}>Total aulas: <strong>{a.totalAulas}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <BarFreq pct={a.pctFreq} />
                    <span style={{ fontSize: 14, fontWeight: 800, color: a.pctFreq < 50 ? '#dc2626' : '#d97706', minWidth: 42, textAlign: 'right' }}>{a.pctFreq}%</span>
                  </div>
                  {a.responsavel && (
                    <div style={{ marginTop: 6, fontSize: 12, color: '#64748b', display: 'flex', gap: 12 }}>
                      <span>👤 {a.responsavel}</span>
                      {a.telefoneResponsavel && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={12} />{a.telefoneResponsavel}</span>}
                    </div>
                  )}
                </div>
                <button onClick={() => encaminhar(a)} disabled={encaminhando === a.alunoId}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, cursor: 'pointer', color: '#dc2626', fontSize: 12, fontWeight: 600, minWidth: 90 }}>
                  <Send size={16} />
                  {encaminhando === a.alunoId ? 'Enviando…' : 'Encaminhar CT'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
