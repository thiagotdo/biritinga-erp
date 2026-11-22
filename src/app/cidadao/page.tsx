'use client'
import { useState } from 'react'

type Aba = 'esic' | 'ouvidoria' | 'consulta'

const COR = '#1B5E20'
const COR2 = '#2E7D32'

export default function CidadaoPage() {
  const [aba, setAba] = useState<Aba>('esic')
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [enviando, setEnviando] = useState(false)

  // e-SIC
  const [esic, setEsic] = useState({
    nomeRequerente: '', emailRequerente: '', telefoneRequerente: '',
    cpfCnpjRequerente: '', assunto: '', descricaoPedido: '',
    formaEntrega: 'EMAIL', tipoSolicitante: 'PESSOA_FISICA',
  })

  // Ouvidoria
  const [ouv, setOuv] = useState({
    tipo: 'RECLAMACAO', assunto: '', descricao: '',
    nomeManifestante: '', emailManifestante: '', telefoneManifestante: '',
    anonimo: false, secretariaDestinataria: '',
  })

  // Consulta
  const [protocolo, setProtocolo] = useState('')
  const [consultaResult, setConsultaResult] = useState<any>(null)

  async function enviarEsic(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true); setMsg(null)
    const r = await fetch('/api/cidadao/esic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(esic),
    })
    const d = await r.json()
    setEnviando(false)
    if (r.ok) {
      setMsg({ tipo: 'ok', texto: d.mensagem })
      setEsic({ nomeRequerente: '', emailRequerente: '', telefoneRequerente: '', cpfCnpjRequerente: '', assunto: '', descricaoPedido: '', formaEntrega: 'EMAIL', tipoSolicitante: 'PESSOA_FISICA' })
    } else setMsg({ tipo: 'erro', texto: d.erro ?? 'Erro ao enviar pedido' })
  }

  async function enviarOuvidoria(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true); setMsg(null)
    const r = await fetch('/api/cidadao/ouvidoria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ouv),
    })
    const d = await r.json()
    setEnviando(false)
    if (r.ok) {
      setMsg({ tipo: 'ok', texto: d.mensagem })
      setOuv({ tipo: 'RECLAMACAO', assunto: '', descricao: '', nomeManifestante: '', emailManifestante: '', telefoneManifestante: '', anonimo: false, secretariaDestinataria: '' })
    } else setMsg({ tipo: 'erro', texto: d.erro ?? 'Erro ao enviar manifestação' })
  }

  async function consultar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true); setMsg(null); setConsultaResult(null)
    const r = await fetch(`/api/cidadao/consulta?protocolo=${encodeURIComponent(protocolo)}`)
    const d = await r.json()
    setEnviando(false)
    if (r.ok) setConsultaResult(d)
    else setMsg({ tipo: 'erro', texto: d.erro ?? 'Protocolo não encontrado' })
  }

  const inp = (style?: React.CSSProperties) => ({
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #DDD',
    borderRadius: 8,
    fontSize: 14,
    boxSizing: 'border-box' as const,
    ...style,
  })
  const lbl = { fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 5 } as const

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7F5', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ background: COR, color: '#fff', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <img src="/brasao.png" alt="Brasão" style={{ height: 56, width: 56, objectFit: 'contain' }} />
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Prefeitura Municipal de Biritinga</div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>Portal do Cidadão — Atendimento Online</div>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: 24 }}>

        {/* Introdução */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, marginBottom: 20, border: '1px solid #E5E7EB' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 20, color: COR }}>🏛️ Portal do Cidadão</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#555', lineHeight: 1.6 }}>
            Registre pedidos de acesso à informação (e-SIC), manifestações na Ouvidoria e acompanhe o status pelo número de protocolo.
            Seus direitos são garantidos pela <strong>Lei 12.527/2011</strong> (Lei de Acesso à Informação) e <strong>Lei 13.460/2017</strong>.
          </p>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {([
            { id: 'esic' as Aba, label: '📋 e-SIC', desc: 'Pedido de Informação' },
            { id: 'ouvidoria' as Aba, label: '📢 Ouvidoria', desc: 'Manifestação' },
            { id: 'consulta' as Aba, label: '🔍 Consultar', desc: 'Status do Protocolo' },
          ]).map(({ id, label, desc }) => (
            <button key={id} onClick={() => { setAba(id); setMsg(null); setConsultaResult(null) }}
              style={{
                flex: 1, padding: '12px 8px', border: 'none', borderRadius: 10, cursor: 'pointer',
                background: aba === id ? COR : '#fff', color: aba === id ? '#fff' : '#555',
                fontWeight: aba === id ? 700 : 500, fontSize: 13,
                boxShadow: aba === id ? '0 2px 8px rgba(27,94,32,.3)' : '0 1px 3px rgba(0,0,0,.08)',
              }}>
              <div>{label}</div>
              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{desc}</div>
            </button>
          ))}
        </div>

        {/* Mensagem */}
        {msg && (
          <div style={{
            padding: '14px 18px', borderRadius: 10, marginBottom: 18, fontSize: 14,
            background: msg.tipo === 'ok' ? '#E8F5E9' : '#FFEBEE',
            color: msg.tipo === 'ok' ? '#1B5E20' : '#B71C1C',
            border: `1px solid ${msg.tipo === 'ok' ? '#A5D6A7' : '#FFCDD2'}`,
          }}>
            {msg.tipo === 'ok' ? '✅ ' : '❌ '}{msg.texto}
          </div>
        )}

        {/* e-SIC */}
        {aba === 'esic' && (
          <form onSubmit={enviarEsic} style={{ background: '#fff', borderRadius: 10, padding: 24, border: '1px solid #E5E7EB' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 18, color: COR }}>📋 Pedido de Acesso à Informação — e-SIC</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#777' }}>
              Art. 10 Lei 12.527/2011. Prazo de resposta: <strong>20 dias úteis</strong> (prorrogável por mais 10 com justificativa).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>Nome Completo</label>
                <input style={inp()} value={esic.nomeRequerente} onChange={e => setEsic(p => ({ ...p, nomeRequerente: e.target.value }))} placeholder="Seu nome (opcional)" />
              </div>
              <div>
                <label style={lbl}>CPF/CNPJ</label>
                <input style={inp()} value={esic.cpfCnpjRequerente} onChange={e => setEsic(p => ({ ...p, cpfCnpjRequerente: e.target.value }))} placeholder="Opcional" />
              </div>
              <div>
                <label style={lbl}>E-mail</label>
                <input type="email" style={inp()} value={esic.emailRequerente} onChange={e => setEsic(p => ({ ...p, emailRequerente: e.target.value }))} placeholder="Para receber a resposta" />
              </div>
              <div>
                <label style={lbl}>Telefone</label>
                <input style={inp()} value={esic.telefoneRequerente} onChange={e => setEsic(p => ({ ...p, telefoneRequerente: e.target.value }))} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label style={lbl}>Forma de Entrega da Resposta</label>
                <select style={inp()} value={esic.formaEntrega} onChange={e => setEsic(p => ({ ...p, formaEntrega: e.target.value }))}>
                  <option value="EMAIL">E-mail</option>
                  <option value="CORREIOS">Correios</option>
                  <option value="PESSOALMENTE">Pessoalmente</option>
                  <option value="PORTAL">Portal</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Tipo de Solicitante</label>
                <select style={inp()} value={esic.tipoSolicitante} onChange={e => setEsic(p => ({ ...p, tipoSolicitante: e.target.value }))}>
                  <option value="PESSOA_FISICA">Pessoa Física</option>
                  <option value="PESSOA_JURIDICA">Pessoa Jurídica</option>
                  <option value="ENTIDADE">Entidade / Associação</option>
                  <option value="JORNALISTA">Jornalista / Imprensa</option>
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Assunto do Pedido *</label>
                <input style={inp()} required value={esic.assunto} onChange={e => setEsic(p => ({ ...p, assunto: e.target.value }))} placeholder="Ex: Contratos, despesas, dados de servidor..." />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Descrição do Pedido *</label>
                <textarea style={inp({ minHeight: 120, resize: 'vertical' })} required value={esic.descricaoPedido} onChange={e => setEsic(p => ({ ...p, descricaoPedido: e.target.value }))} placeholder="Descreva com detalhes as informações que você precisa..." />
              </div>
            </div>

            <button type="submit" disabled={enviando}
              style={{ marginTop: 20, background: COR, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: enviando ? 0.7 : 1 }}>
              {enviando ? 'Enviando...' : '📤 Enviar Pedido'}
            </button>
          </form>
        )}

        {/* Ouvidoria */}
        {aba === 'ouvidoria' && (
          <form onSubmit={enviarOuvidoria} style={{ background: '#fff', borderRadius: 10, padding: 24, border: '1px solid #E5E7EB' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 18, color: COR }}>📢 Ouvidoria Municipal</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#777' }}>
              Lei 13.460/2017. Registre reclamações, sugestões, denúncias, elogios ou solicitações.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>Tipo de Manifestação *</label>
                <select style={inp()} value={ouv.tipo} onChange={e => setOuv(p => ({ ...p, tipo: e.target.value }))}>
                  <option value="RECLAMACAO">Reclamação</option>
                  <option value="DENUNCIA">Denúncia</option>
                  <option value="SUGESTAO">Sugestão</option>
                  <option value="ELOGIO">Elogio</option>
                  <option value="SOLICITACAO_INFO">Solicitação de Informação</option>
                  <option value="SOLICITACAO_SERVICO">Solicitação de Serviço</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Secretaria / Órgão</label>
                <select style={inp()} value={ouv.secretariaDestinataria} onChange={e => setOuv(p => ({ ...p, secretariaDestinataria: e.target.value }))}>
                  <option value="">Não sei informar</option>
                  <option value="Secretaria de Saúde">Saúde</option>
                  <option value="Secretaria de Educação">Educação</option>
                  <option value="Secretaria de Obras">Obras e Infraestrutura</option>
                  <option value="Secretaria de Assistência Social">Assistência Social</option>
                  <option value="Secretaria de Finanças">Finanças</option>
                  <option value="Gabinete do Prefeito">Gabinete / Outros</option>
                </select>
              </div>

              <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="anonimo" checked={ouv.anonimo} onChange={e => setOuv(p => ({ ...p, anonimo: e.target.checked }))} />
                <label htmlFor="anonimo" style={{ fontSize: 13, color: '#555' }}>
                  🔒 Enviar anonimamente (seus dados não serão registrados)
                </label>
              </div>

              {!ouv.anonimo && (
                <>
                  <div>
                    <label style={lbl}>Nome</label>
                    <input style={inp()} value={ouv.nomeManifestante} onChange={e => setOuv(p => ({ ...p, nomeManifestante: e.target.value }))} />
                  </div>
                  <div>
                    <label style={lbl}>E-mail</label>
                    <input type="email" style={inp()} value={ouv.emailManifestante} onChange={e => setOuv(p => ({ ...p, emailManifestante: e.target.value }))} />
                  </div>
                  <div>
                    <label style={lbl}>Telefone</label>
                    <input style={inp()} value={ouv.telefoneManifestante} onChange={e => setOuv(p => ({ ...p, telefoneManifestante: e.target.value }))} />
                  </div>
                </>
              )}

              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Assunto *</label>
                <input style={inp()} required value={ouv.assunto} onChange={e => setOuv(p => ({ ...p, assunto: e.target.value }))} placeholder="Resumo da sua manifestação" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Descrição *</label>
                <textarea style={inp({ minHeight: 120, resize: 'vertical' })} required value={ouv.descricao} onChange={e => setOuv(p => ({ ...p, descricao: e.target.value }))} placeholder="Descreva detalhadamente sua manifestação..." />
              </div>
            </div>

            <button type="submit" disabled={enviando}
              style={{ marginTop: 20, background: COR, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: enviando ? 0.7 : 1 }}>
              {enviando ? 'Enviando...' : '📢 Enviar Manifestação'}
            </button>
          </form>
        )}

        {/* Consulta */}
        {aba === 'consulta' && (
          <div style={{ background: '#fff', borderRadius: 10, padding: 24, border: '1px solid #E5E7EB' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 18, color: COR }}>🔍 Consultar Status do Protocolo</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#777' }}>
              Informe o número do protocolo recebido ao registrar seu pedido ou manifestação.
            </p>

            <form onSubmit={consultar} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <input style={inp({ flex: 1 })} value={protocolo} onChange={e => setProtocolo(e.target.value.toUpperCase())}
                placeholder="Ex: SIC-2025-0001 ou OUV-2025-00001" />
              <button type="submit" disabled={enviando}
                style={{ background: COR, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {enviando ? '...' : '🔍 Consultar'}
              </button>
            </form>

            {consultaResult && (
              <div style={{ background: '#F9FAFB', borderRadius: 8, padding: 20, border: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
                      {consultaResult.tipo === 'ESIC' ? '📋 e-SIC — Pedido de Acesso à Informação' : '📢 Ouvidoria — Manifestação'}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: COR }}>{consultaResult.protocolo}</div>
                  </div>
                  <div style={{
                    background: consultaResult.situacao.includes('RESPONDID') || consultaResult.situacao === 'ENCERRADA' ? '#D1FAE5' : '#EFF6FF',
                    color: consultaResult.situacao.includes('RESPONDID') || consultaResult.situacao === 'ENCERRADA' ? '#065F46' : '#1D4ED8',
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  }}>{consultaResult.situacao.replace(/_/g, ' ')}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {[
                    { label: 'Assunto', value: consultaResult.assunto },
                    { label: 'Situação', value: consultaResult.situacao.replace(/_/g, ' ') },
                    { label: 'Registrado em', value: new Date(consultaResult.dataProtocolo || consultaResult.dataRecebimento).toLocaleDateString('pt-BR') },
                    { label: 'Prazo de Resposta', value: new Date(consultaResult.dataLimiteResposta).toLocaleDateString('pt-BR') },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontSize: 11, color: '#888' }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{value}</div>
                    </div>
                  ))}
                </div>

                {consultaResult.textoResposta && (
                  <div style={{ background: '#fff', borderRadius: 8, padding: 14, border: '1px solid #A5D6A7', marginTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: COR, marginBottom: 6 }}>✅ RESPOSTA</div>
                    <div style={{ fontSize: 13, color: '#333', lineHeight: 1.6 }}>{consultaResult.textoResposta}</div>
                  </div>
                )}

                {consultaResult.tramitacoes?.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 8 }}>Histórico de Tramitação</div>
                    {consultaResult.tramitacoes.map((t: any, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 2, background: '#E5E7EB', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 12, color: '#777' }}>{new Date(t.criadoEm).toLocaleDateString('pt-BR')}{t.setorDestino ? ` — ${t.setorDestino}` : ''}</div>
                          <div style={{ fontSize: 13, color: '#333' }}>{t.despacho}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Rodapé */}
        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: '#AAA' }}>
          <p>Prefeitura Municipal de Biritinga — Bahia · CNPJ 14.105.183/0001-77</p>
          <p>e-SIC: <a href="mailto:esic@biritinga.ba.gov.br" style={{ color: COR2 }}>esic@biritinga.ba.gov.br</a> ·
            Ouvidoria: <a href="mailto:ouvidoria@biritinga.ba.gov.br" style={{ color: COR2 }}>ouvidoria@biritinga.ba.gov.br</a> ·
            Telefone: 0800 071 0162</p>
        </div>
      </div>
    </div>
  )
}
