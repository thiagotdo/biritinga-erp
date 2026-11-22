'use client'
import { useEffect, useState } from 'react'
import { Search, BookOpen, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

type Aluno = { id: string; nome: string; dataNascimento: string; nomeMae: string; nomePai: string }
type Matricula = { id: string; turmaNome: string; serie: string; turno: string; anoLetivo: number; escolaNome: string; situacao: string; numeroChamada: number }
type Disciplina = { disciplina: string; bimestres: Record<string, { nota: number; recuperacao: number | null }>; mediaFinal: number | null; situacao: string | null }
type Frequencia = { totalAulas: number; presencas: number; faltas: number; faltasJustificadas: number; percentual: number; aprovado: boolean; emRisco: boolean; reprovadoFreq: boolean }

const SIT_COR: Record<string, string> = {
  APROVADO: '#16a34a', REPROVADO: '#dc2626', RECUPERACAO: '#d97706', EM_CURSO: '#2563eb',
}

function nota(n: number | null | undefined) {
  if (n == null) return <span style={{ color: '#94a3b8' }}>—</span>
  const cor = n >= 7 ? '#16a34a' : n >= 5 ? '#d97706' : '#dc2626'
  return <span style={{ fontWeight: 700, color: cor }}>{Number(n).toFixed(1)}</span>
}

export default function BoletimPage() {
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear())
  const [busca, setBusca]         = useState('')
  const [alunos, setAlunos]       = useState<any[]>([])
  const [buscando, setBuscando]   = useState(false)
  const [selecionado, setSelecionado] = useState<{ aluno: Aluno; matricula: Matricula; disciplinas: Disciplina[]; frequencia: Frequencia } | null>(null)
  const [carregandoBoletim, setCarregandoBoletim] = useState(false)

  async function buscarAlunos(e: React.FormEvent) {
    e.preventDefault()
    if (!busca.trim()) return
    setBuscando(true)
    const r = await fetch(`/api/educacao/aluno?busca=${encodeURIComponent(busca)}&anoLetivo=${anoLetivo}`).then(r => r.json())
    setAlunos(r.alunos ?? [])
    setBuscando(false)
  }

  async function abrirBoletim(alunoId: string) {
    setCarregandoBoletim(true)
    const r = await fetch(`/api/educacao/boletim?alunoId=${alunoId}&anoLetivo=${anoLetivo}`).then(r => r.json())
    setSelecionado(r)
    setCarregandoBoletim(false)
  }

  const freq = selecionado?.frequencia
  const freqCor = freq ? (freq.reprovadoFreq ? '#dc2626' : freq.emRisco ? '#d97706' : '#16a34a') : '#64748b'

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>📋 Boletim Online</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>LDB 9.394/96 Art. 24 - avaliação contínua e cumulativa</p>
        </div>
        <select value={anoLetivo} onChange={e => setAnoLetivo(Number(e.target.value))}
          style={{ fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
          {[anoLetivo + 1, anoLetivo, anoLetivo - 1].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Busca */}
      <form onSubmit={buscarAlunos} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar aluno por nome, CPF ou matrícula…"
            style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px 10px 36px', fontSize: 14, boxSizing: 'border-box' }} />
        </div>
        <button type="submit" disabled={buscando}
          style={{ padding: '10px 20px', background: 'var(--cor-primaria)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          {buscando ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: selecionado ? '300px 1fr' : '1fr', gap: 20 }}>
        {/* Lista alunos */}
        {(alunos.length > 0 || !selecionado) && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {alunos.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                <BookOpen size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                <div>Busque um aluno pelo nome para ver o boletim</div>
              </div>
            ) : alunos.map((a: any) => (
              <div key={a.id} onClick={() => abrirBoletim(a.id)}
                style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                         background: selecionado?.aluno?.id === a.id ? '#eff6ff' : undefined,
                         display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{a.nome}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{a.turma ?? '—'} · {a.escola ?? '—'}</div>
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Nº {a.numeroChamada ?? '—'}</div>
              </div>
            ))}
          </div>
        )}

        {/* Boletim */}
        {carregandoBoletim && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 60, textAlign: 'center', color: '#94a3b8' }}>
            Carregando boletim…
          </div>
        )}

        {selecionado && !carregandoBoletim && (
          <div>
            {/* Cabeçalho aluno */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: '#1e293b' }}>{selecionado.aluno?.nome}</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                    {selecionado.matricula?.escolaNome} · {selecionado.matricula?.turmaNome} · {selecionado.matricula?.turno}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Ano Letivo {anoLetivo} · Chamada nº {selecionado.matricula?.numeroChamada ?? '—'}</div>
                </div>
                <button onClick={() => setSelecionado(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18 }}>✕</button>
              </div>

              {/* Frequência */}
              {freq && (
                <div style={{ marginTop: 16, background: freq.reprovadoFreq ? '#fef2f2' : freq.emRisco ? '#fffbeb' : '#f0fdf4', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {freq.reprovadoFreq ? <AlertTriangle size={16} color="var(--cor-primaria)" /> : <CheckCircle size={16} color="var(--cor-primaria)" />}
                      Frequência
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: freqCor }}>{freq.percentual}%</div>
                  </div>
                  <div style={{ background: '#e2e8f0', borderRadius: 100, height: 6 }}>
                    <div style={{ height: 6, borderRadius: 100, background: freqCor, width: `${Math.min(freq.percentual, 100)}%`, transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: '#64748b' }}>
                    <span>Total aulas: <strong>{freq.totalAulas}</strong></span>
                    <span>Presenças: <strong>{freq.presencas}</strong></span>
                    <span>Faltas: <strong style={{ color: freq.faltas > 0 ? '#dc2626' : undefined }}>{freq.faltas}</strong></span>
                    <span>Justificadas: <strong>{freq.faltasJustificadas}</strong></span>
                  </div>
                  {freq.reprovadoFreq && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626', fontWeight: 600 }}>⚠ Reprovado por frequência - mínimo LDB: 75%</div>
                  )}
                  {freq.emRisco && !freq.reprovadoFreq && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#d97706', fontWeight: 600 }}>⚠ Em risco - frequência abaixo de 75%</div>
                  )}
                </div>
              )}
            </div>

            {/* Notas */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                Notas por Disciplina
              </div>
              {selecionado.disciplinas?.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Nenhuma nota lançada para este ano</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Disciplina', '1º Bim', '2º Bim', '3º Bim', '4º Bim', 'Recup.', 'Média Final', 'Situação'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Disciplina' ? 'left' : 'center', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selecionado.disciplinas.map(d => (
                      <tr key={d.disciplina} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{d.disciplina}</td>
                        {[1, 2, 3, 4].map(b => (
                          <td key={b} style={{ padding: '10px 12px', textAlign: 'center' }}>{nota(d.bimestres?.[`b${b}`]?.nota)}</td>
                        ))}
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>{nota(d.bimestres?.b1?.recuperacao ?? null)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>{nota(d.mediaFinal)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {d.situacao ? (
                            <span style={{ fontSize: 11, fontWeight: 700, color: SIT_COR[d.situacao] ?? '#475569', background: (SIT_COR[d.situacao] ?? '#475569') + '15', padding: '2px 8px', borderRadius: 20 }}>
                              {d.situacao}
                            </span>
                          ) : <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
