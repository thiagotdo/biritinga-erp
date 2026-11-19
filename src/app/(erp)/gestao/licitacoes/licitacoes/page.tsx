'use client'
import { useState, useEffect, useCallback } from 'react'

// ─── Licitações — Gestão ─────────────────────────────────────────────────────
// Lei 14.133/2021 — Nova Lei de Licitações
// Art. 17 — publicidade obrigatória no PNCP

interface Licitacao {
  id: string
  numero: string
  modalidade: string
  forma: string
  situacao: string
  objeto: string
  justificativa?: string
  fundamentacao?: string
  valorEstimado: number
  valorHomologado?: number
  exercicio: number
  dataPublicacao?: string
  dataAbertura?: string
  dataHomologacao?: string
  urlEdital?: string
  urlAta?: string
  pncpNumero?: string
  pregoeiro?: string
  comissao?: string
  dotacaoOrcamentaria?: string
  _count?: { itens: number; propostas: number; contrato: number }
}

interface DashData {
  kpis: { total: number; valorHomologado: number }
  porSituacao: Array<{ situacao: string; _count: { _all: number } }>
  porModalidade: Array<{ modalidade: string; count: number; valorTotal: number }>
  aVencer: Array<{ id: string; numero: string; objeto: string; modalidade: string; dataAbertura: string; valorEstimado: number }>
}

const MODAL_LABEL: Record<string, string> = {
  CONCORRENCIA: 'Concorrência', CONCURSO: 'Concurso', LEILAO: 'Leilão',
  PREGAO: 'Pregão', DIALOGO_COMPETITIVO: 'Diálogo Competitivo',
  DISPENSA: 'Dispensa', INEXIGIBILIDADE: 'Inexigibilidade', RDC: 'RDC', CREDENCIAMENTO: 'Credenciamento',
}
const SIT_COR: Record<string, string> = {
  RASCUNHO: '#94a3b8', PUBLICADA: '#3b82f6', EM_PRAZO: '#8b5cf6',
  EM_JULGAMENTO: '#f59e0b', HOMOLOGADA: '#22c55e', ADJUDICADA: '#10b981',
  DESERTA: '#f97316', FRACASSADA: '#ef4444', REVOGADA: '#dc2626', ANULADA: '#7f1d1d',
}
const FLUXO = ['PUBLICADA', 'EM_PRAZO', 'EM_JULGAMENTO', 'ADJUDICADA', 'HOMOLOGADA']
const fmtMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function LicitacoesPage() {
  const [dash, setDash]   = useState<DashData | null>(null)
  const [lics, setLics]   = useState<Licitacao[]>([])
  const [sel, setSel]     = useState<Licitacao | null>(null)
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState<Record<string, any>>({ exercicio: new Date().getFullYear() })
  const [filtSit, setFiltSit]   = useState('')
  const [filtMod, setFiltMod]   = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg]           = useState('')

  const load = useCallback(async () => {
    const [rd, rl] = await Promise.all([
      fetch('/api/licitacoes/licitacao?relatorio=DASHBOARD'),
      fetch('/api/licitacoes/licitacao'),
    ])
    if (rd.ok) setDash(await rd.json())
    if (rl.ok) { const d = await rl.json(); setLics(d.licitacoes ?? []) }
  }, [])

  useEffect(() => { load() }, [load])

  const salvar = async () => {
    setSalvando(true)
    const r = await fetch('/api/licitacoes/licitacao', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, valorEstimado: Number(form.valorEstimado), exercicio: Number(form.exercicio) }),
    })
    setSalvando(false)
    if (r.ok) { const d = await r.json(); setMsg(`Licitação ${d.numero} criada!`); setModal(false); setForm({ exercicio: new Date().getFullYear() }); load() }
    else { const d = await r.json(); setMsg(JSON.stringify(d.erro)) }
  }

  const acao = async (id: string, acaoNome: string, dados: Record<string, any> = {}) => {
    await fetch('/api/licitacoes/licitacao', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, acao: acaoNome, ...dados }),
    })
    setSel(null); load()
  }

  const licsFilt = lics.filter(l =>
    (!filtSit || l.situacao === filtSit) &&
    (!filtMod || l.modalidade === filtMod)
  )

  return (
    <div style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>🏷️ Licitações</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Lei 14.133/2021 — Nova Lei de Licitações e Contratos Administrativos</p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          + Nova Licitação
        </button>
      </div>

      {msg && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14, color: '#16a34a' }}>{msg}</div>}

      {dash && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Total Licitações', valor: dash.kpis.total, raw: true, cor: '#3b82f6', icon: '🏷️' },
              { label: 'Valor Homologado', valor: fmtMoeda(Number(dash.kpis.valorHomologado)), cor: '#22c55e', icon: '✅' },
              { label: 'Em Andamento', valor: dash.porSituacao.filter(s => ['PUBLICADA','EM_PRAZO','EM_JULGAMENTO'].includes(s.situacao)).reduce((n, s) => n + s._count._all, 0), raw: true, cor: '#8b5cf6', icon: '⚙️' },
              { label: 'Abertura Próxima', valor: dash.aVencer.length, raw: true, cor: '#f59e0b', icon: '⏰' },
            ].map(k => (
              <div key={k.label} style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,.05)', borderLeft: `4px solid ${k.cor}` }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{k.icon}</div>
                <div style={{ fontSize: k.raw ? 28 : 18, fontWeight: 800, color: k.cor }}>{k.valor}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Alertas de abertura próxima */}
          {dash.aVencer.length > 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#78350f' }}>⏰ Abertura de Propostas Próxima</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dash.aVencer.map(l => {
                  const dias = Math.ceil((new Date(l.dataAbertura).getTime() - Date.now()) / 86400000)
                  return (
                    <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ fontFamily: 'monospace', color: '#3b82f6', marginRight: 10 }}>{l.numero}</span>
                      <span style={{ flex: 1, color: '#374151' }}>{l.objeto.slice(0, 60)}</span>
                      <span style={{ color: dias <= 7 ? '#dc2626' : '#78350f', fontWeight: 600, marginLeft: 10 }}>em {dias} dia{dias !== 1 ? 's' : ''}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Distribuição por modalidade */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.05)', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Por Modalidade</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dash.porModalidade.map(m => (
                  <div key={m.modalidade} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#374151' }}>{MODAL_LABEL[m.modalidade] ?? m.modalidade}</span>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span style={{ color: '#94a3b8' }}>{m.count}×</span>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{fmtMoeda(m.valorTotal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.05)', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Por Situação</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dash.porSituacao.map(s => (
                  <div key={s.situacao} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: SIT_COR[s.situacao] ?? '#94a3b8', display: 'inline-block' }} />
                      {s.situacao.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontWeight: 700, color: SIT_COR[s.situacao] ?? '#94a3b8' }}>{s._count._all}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Lista + detalhe */}
      <div style={{ display: 'grid', gridTemplateColumns: sel ? '1fr 440px' : '1fr', gap: 20 }}>
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <select value={filtSit} onChange={e => setFiltSit(e.target.value)}
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14 }}>
              <option value="">Todas as situações</option>
              {Object.keys(SIT_COR).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <select value={filtMod} onChange={e => setFiltMod(e.target.value)}
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14 }}>
              <option value="">Todas as modalidades</option>
              {Object.entries(MODAL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {licsFilt.map(l => (
              <div key={l.id} onClick={() => setSel(sel?.id === l.id ? null : l)}
                style={{ background: '#fff', borderRadius: 10, padding: 16, cursor: 'pointer',
                  border: sel?.id === l.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 800, color: '#3b82f6' }}>{l.numero}</span>
                    <span style={{ fontSize: 12, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 20 }}>{MODAL_LABEL[l.modalidade] ?? l.modalidade}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, background: (SIT_COR[l.situacao] ?? '#94a3b8') + '20', color: SIT_COR[l.situacao] ?? '#94a3b8', padding: '3px 10px', borderRadius: 20 }}>
                    {l.situacao.replace(/_/g, ' ')}
                  </span>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: 13, color: '#1e293b', lineHeight: 1.5 }}>{l.objeto}</p>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
                  <span>💰 {fmtMoeda(l.valorEstimado)}</span>
                  {l.valorHomologado && <span style={{ color: '#22c55e' }}>✅ {fmtMoeda(l.valorHomologado)}</span>}
                  {l.dataAbertura && <span>📅 Abertura: {new Date(l.dataAbertura).toLocaleDateString('pt-BR')}</span>}
                  {l._count?.propostas ? <span>📋 {l._count.propostas} proposta(s)</span> : null}
                </div>
              </div>
            ))}
            {licsFilt.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 14 }}>Nenhuma licitação encontrada.</div>}
          </div>
        </div>

        {/* Detalhe */}
        {sel && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,.06)', border: '1px solid #e2e8f0', height: 'fit-content', position: 'sticky', top: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 800, color: '#3b82f6' }}>{sel.numero}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{MODAL_LABEL[sel.modalidade]} · {sel.forma?.replace(/_/g, ' ')}</div>
              </div>
              <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button>
            </div>

            {/* Fluxo visual */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
              {FLUXO.map((s, i) => {
                const idx = FLUXO.indexOf(sel.situacao)
                const ativo  = i === idx
                const passado = i < idx
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <div style={{ flex: 1, height: 3, background: passado ? '#22c55e' : '#e2e8f0', borderRadius: i === 0 ? '4px 0 0 4px' : '' }} />
                    <div title={s} style={{ width: 10, height: 10, borderRadius: '50%', background: ativo ? '#3b82f6' : passado ? '#22c55e' : '#e2e8f0', flex: 'none' }} />
                    {i === FLUXO.length - 1 && <div style={{ flex: 1, height: 3, background: passado ? '#22c55e' : '#e2e8f0', borderRadius: '0 4px 4px 0' }} />}
                  </div>
                )
              })}
            </div>

            <span style={{ fontSize: 12, fontWeight: 600, background: (SIT_COR[sel.situacao] ?? '#94a3b8') + '20', color: SIT_COR[sel.situacao] ?? '#94a3b8', padding: '3px 10px', borderRadius: 20 }}>
              {sel.situacao.replace(/_/g, ' ')}
            </span>

            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, margin: '14px 0', display: 'grid', gap: 8 }}>
              <LicDetalhe icon="📋" label="Objeto" value={sel.objeto.slice(0, 100)} />
              <LicDetalhe icon="💰" label="Valor Estimado" value={fmtMoeda(sel.valorEstimado)} />
              {sel.valorHomologado && <LicDetalhe icon="✅" label="Valor Homologado" value={fmtMoeda(sel.valorHomologado)} />}
              {sel.dataAbertura && <LicDetalhe icon="📅" label="Data de Abertura" value={new Date(sel.dataAbertura).toLocaleString('pt-BR')} />}
              {sel.pregoeiro && <LicDetalhe icon="👤" label="Pregoeiro" value={sel.pregoeiro} />}
              {sel.pncpNumero && <LicDetalhe icon="🏛️" label="PNCP" value={sel.pncpNumero} />}
              {sel.dotacaoOrcamentaria && <LicDetalhe icon="📒" label="Dotação" value={sel.dotacaoOrcamentaria} />}
            </div>

            {sel.urlEdital && (
              <a href={sel.urlEdital} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', background: '#eff6ff', color: '#3b82f6', borderRadius: 8, padding: '10px 14px', textDecoration: 'none', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                📄 Baixar Edital
              </a>
            )}

            {/* Ações */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sel.situacao === 'RASCUNHO' && <BtnAcao cor="#3b82f6" onClick={() => acao(sel.id, 'PUBLICAR')}>🌐 Publicar Licitação</BtnAcao>}
              {sel.situacao === 'PUBLICADA' && <BtnAcao cor="#8b5cf6" onClick={() => acao(sel.id, 'ABRIR_PRAZO')}>📬 Abrir Prazo para Propostas</BtnAcao>}
              {sel.situacao === 'EM_PRAZO'  && <BtnAcao cor="#f59e0b" onClick={() => acao(sel.id, 'INICIAR_JULGAMENTO')}>⚖️ Iniciar Julgamento</BtnAcao>}
              {sel.situacao === 'EM_JULGAMENTO' && <>
                <BtnAcao cor="#10b981" onClick={() => acao(sel.id, 'ADJUDICAR')}>🎯 Adjudicar</BtnAcao>
                <BtnAcao cor="#f97316" onClick={() => acao(sel.id, 'DECLARAR_DESERTA')}>🚫 Declarar Deserta</BtnAcao>
                <BtnAcao cor="#ef4444" onClick={() => acao(sel.id, 'DECLARAR_FRACASSADA')}>❌ Declarar Fracassada</BtnAcao>
              </>}
              {sel.situacao === 'ADJUDICADA' && <BtnAcao cor="#22c55e" onClick={() => acao(sel.id, 'HOMOLOGAR')}>✅ Homologar</BtnAcao>}
              {!['REVOGADA', 'ANULADA', 'HOMOLOGADA'].includes(sel.situacao) && (
                <BtnAcao cor="#94a3b8" onClick={() => acao(sel.id, 'REVOGAR')}>🔴 Revogar</BtnAcao>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal nova licitação */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 660, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 800 }}>🏷️ Nova Licitação</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Modalidade *</label>
                <select value={form.modalidade ?? 'PREGAO'} onChange={e => setForm(f => ({ ...f, modalidade: e.target.value }))} style={inpS}>
                  {Object.entries(MODAL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={lblS}>Forma *</label>
                <select value={form.forma ?? 'MENOR_PRECO'} onChange={e => setForm(f => ({ ...f, forma: e.target.value }))} style={inpS}>
                  <option value="MENOR_PRECO">Menor Preço</option>
                  <option value="MAIOR_DESCONTO">Maior Desconto</option>
                  <option value="MELHOR_TECNICA">Melhor Técnica</option>
                  <option value="TECNICA_PRECO">Técnica e Preço</option>
                  <option value="MAIOR_LANCE">Maior Lance (Leilão)</option>
                  <option value="MAIOR_RETORNO">Maior Retorno</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lblS}>Objeto *</label>
              <textarea value={form.objeto ?? ''} onChange={e => setForm(f => ({ ...f, objeto: e.target.value }))} rows={3} style={{ ...inpS, resize: 'vertical' }}
                placeholder="Descrição completa do objeto da licitação…" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Valor Estimado (R$) *</label>
                <input type="number" step="0.01" value={form.valorEstimado ?? ''} onChange={e => setForm(f => ({ ...f, valorEstimado: e.target.value }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>Exercício *</label>
                <input type="number" value={form.exercicio ?? new Date().getFullYear()} onChange={e => setForm(f => ({ ...f, exercicio: e.target.value }))} style={inpS} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Data de Publicação</label>
                <input type="datetime-local" value={form.dataPublicacao ?? ''} onChange={e => setForm(f => ({ ...f, dataPublicacao: e.target.value }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>Data de Abertura das Propostas</label>
                <input type="datetime-local" value={form.dataAbertura ?? ''} onChange={e => setForm(f => ({ ...f, dataAbertura: e.target.value }))} style={inpS} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lblS}>Pregoeiro / Comissão</label>
                <input value={form.pregoeiro ?? ''} onChange={e => setForm(f => ({ ...f, pregoeiro: e.target.value }))} style={inpS} />
              </div>
              <div>
                <label style={lblS}>Número PNCP</label>
                <input value={form.pncpNumero ?? ''} onChange={e => setForm(f => ({ ...f, pncpNumero: e.target.value }))} style={inpS} placeholder="Obrigatório (Art. 17 Lei 14.133)" />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lblS}>Dotação Orçamentária</label>
              <input value={form.dotacaoOrcamentaria ?? ''} onChange={e => setForm(f => ({ ...f, dotacaoOrcamentaria: e.target.value }))} style={inpS} placeholder="ex: 02.09.123.0001.1001" />
            </div>

            {['DISPENSA', 'INEXIGIBILIDADE'].includes(form.modalidade ?? '') && (
              <div style={{ marginBottom: 16 }}>
                <label style={lblS}>Fundamentação Legal *</label>
                <input value={form.fundamentacao ?? ''} onChange={e => setForm(f => ({ ...f, fundamentacao: e.target.value }))} style={inpS} placeholder="ex: Art. 75, I da Lei 14.133/2021" />
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <label style={lblS}>URL do Edital</label>
              <input value={form.urlEdital ?? ''} onChange={e => setForm(f => ({ ...f, urlEdital: e.target.value }))} style={inpS} placeholder="https://…" />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando}
                style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                {salvando ? 'Salvando…' : '💾 Criar Licitação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LicDetalhe({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
      <span style={{ width: 18 }}>{icon}</span>
      <div>
        <span style={{ color: '#94a3b8', fontSize: 11, display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
        <span style={{ color: '#1e293b', fontWeight: 500, lineHeight: 1.4 }}>{value}</span>
      </div>
    </div>
  )
}

function BtnAcao({ cor, onClick, children }: { cor: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      style={{ background: cor, color: '#fff', border: 'none', borderRadius: 8, padding: '9px', fontWeight: 600, cursor: 'pointer', fontSize: 13, width: '100%' }}>
      {children}
    </button>
  )
}

const lblS: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }
const inpS: React.CSSProperties = { width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }
