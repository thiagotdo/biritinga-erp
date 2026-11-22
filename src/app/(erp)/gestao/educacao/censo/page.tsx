'use client'
import { useEffect, useState } from 'react'
import { BarChart2, Users, School, BookOpen, AlertCircle } from 'lucide-react'

type Resumo = {
  totalMatriculas: number; ativas: number; transferidas: number; evadidas: number; concluidas: number
  nee: number; rural: number; urbana: number; masculino: number; feminino: number
}

type Escola = { id: string; nome: string; tipo: string; inep: string; totalTurmas: number; totalAlunos: number }
type SerieRow = { serie: string; etapa: string; alunos: number; turmas: number }
type EtapaRow = { etapa: string; modalidade: string; turmas: number; vagas: number }

function KpiCard({ label, value, sub, cor = '#1e293b' }: { label: string; value: number | string; sub?: string; cor?: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: cor, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

const ETAPA_LABEL: Record<string, string> = {
  CRECHE: 'Creche', PRE_ESCOLA: 'Pré-Escola', FUNDAMENTAL_ANOS_INICIAIS: 'Fund. I',
  FUNDAMENTAL_ANOS_FINAIS: 'Fund. II', MEDIO: 'E. Médio', EJA: 'EJA', ESPECIAL: 'Especial',
}

export default function CensoEscolarPage() {
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear())
  const [dados, setDados]         = useState<{ resumo: Resumo; escolas: Escola[]; porSerie: SerieRow[]; porEtapa: EtapaRow[] } | null>(null)
  const [loading, setLoading]     = useState(true)

  async function carregar() {
    setLoading(true)
    const r = await fetch(`/api/educacao/censo?anoLetivo=${anoLetivo}`).then(r => r.json())
    setDados(r)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [anoLetivo])

  const res = dados?.resumo

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>📊 Censo Escolar</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>INEP/MEC · EducaCenso · Portaria MEC 264/2007</p>
        </div>
        <select value={anoLetivo} onChange={e => setAnoLetivo(Number(e.target.value))}
          style={{ fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
          {[anoLetivo + 1, anoLetivo, anoLetivo - 1, anoLetivo - 2].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {Array.from({ length: 10 }).map((_, i) => <div key={i} style={{ background: '#f1f5f9', borderRadius: 10, height: 80, animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : res ? (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
            <KpiCard label="Total Matrículas"  value={res.totalMatriculas.toLocaleString('pt-BR')} />
            <KpiCard label="Ativas"            value={res.ativas.toLocaleString('pt-BR')}       cor="#16a34a" />
            <KpiCard label="Transferidas"      value={res.transferidas.toLocaleString('pt-BR')} cor="#2563eb" />
            <KpiCard label="Evadidas"          value={res.evadidas.toLocaleString('pt-BR')}     cor="#dc2626" />
            <KpiCard label="Concluídas"        value={res.concluidas.toLocaleString('pt-BR')}   cor="#7c3aed" />
            <KpiCard label="NEE"               value={res.nee.toLocaleString('pt-BR')} sub="Necessidades Esp." />
            <KpiCard label="Zona Rural"        value={res.rural.toLocaleString('pt-BR')}        cor="#d97706" />
            <KpiCard label="Zona Urbana"       value={res.urbana.toLocaleString('pt-BR')} />
            <KpiCard label="Masculino"         value={res.masculino.toLocaleString('pt-BR')} />
            <KpiCard label="Feminino"          value={res.feminino.toLocaleString('pt-BR')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Por série */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                Alunos por Série / Etapa
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Etapa', 'Série', 'Turmas', 'Alunos'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(dados?.porSerie ?? []).map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #f8fafc' }}>
                      <td style={{ padding: '8px 12px', color: '#475569' }}>{ETAPA_LABEL[r.etapa] ?? r.etapa}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{r.serie}</td>
                      <td style={{ padding: '8px 12px', color: '#475569' }}>{r.turmas}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: '#1e293b' }}>{Number(r.alunos).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Por etapa */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                Turmas por Etapa / Modalidade
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Etapa', 'Modalidade', 'Turmas', 'Vagas'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(dados?.porEtapa ?? []).map((r: any, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #f8fafc' }}>
                      <td style={{ padding: '8px 12px' }}>{ETAPA_LABEL[r.etapa] ?? r.etapa}</td>
                      <td style={{ padding: '8px 12px', color: '#475569' }}>{r.modalidade}</td>
                      <td style={{ padding: '8px 12px' }}>{r.turmas}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700 }}>{r.vagas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Escolas */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 14, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <School size={16} /> Escolas ({dados?.escolas.length ?? 0})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Escola', 'Tipo', 'Cód. INEP', 'Turmas', 'Alunos Ativos'].map(h => (
                    <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(dados?.escolas ?? []).map(e => (
                  <tr key={e.id} style={{ borderTop: '1px solid #f8fafc' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: '#1e293b' }}>{e.nome}</td>
                    <td style={{ padding: '10px 16px', color: '#475569' }}>{e.tipo}</td>
                    <td style={{ padding: '10px 16px', color: '#94a3b8', fontFamily: 'monospace' }}>{e.inep ?? '—'}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>{Number(e.totalTurmas ?? 0)}</td>
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: '#1e293b', textAlign: 'center' }}>{Number(e.totalAlunos ?? 0).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Aviso INEP */}
          <div style={{ marginTop: 16, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: '#1d4ed8' }}>
            <AlertCircle size={16} style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <strong>Envio ao INEP:</strong> O preenchimento definitivo do Censo Escolar deve ser feito diretamente no sistema <strong>Educacenso</strong> (educacenso.inep.gov.br) em até 60 dias após a data de referência (último dia letivo do ano). Este relatório serve como conferência prévia dos dados.
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: 60 }}>Sem dados para o ano {anoLetivo}</div>
      )}
    </div>
  )
}
