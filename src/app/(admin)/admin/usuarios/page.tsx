'use client'
import { useState, useEffect, useCallback } from 'react'

type Usuario = {
  id: string; nome: string; email: string; cpf?: string
  perfil: string; secretaria?: string; cargo?: string
  ativo: boolean; ultimoLogin?: string; mfaAtivado: boolean; criadoEm: string
}

const PERFIS = [
  { value: 'SUPER_ADMIN',      label: 'Super Admin',       cor: '#C62828', emoji: '👑' },
  { value: 'ADMIN_MUNICIPIO',  label: 'Administrador',     cor: '#6A1B9A', emoji: '🛡️' },
  { value: 'GESTOR',           label: 'Gestor',            cor: '#1565C0', emoji: '👔' },
  { value: 'OPERADOR',         label: 'Operador',          cor: '#00695C', emoji: '🔧' },
  { value: 'VISUALIZADOR',     label: 'Visualizador',      cor: '#555',    emoji: '👁️' },
]

const SECRETARIAS = [
  'SECOM','SEMSA','SEDUC','SEFIN','SEMAD','SEMMA','SEMOB','SEMAS',
  'SECULT','SETUR','SEMED','OUVIDORIA','TRIBUTOS',
]

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [total, setTotal]       = useState(0)
  const [busca, setBusca]       = useState('')
  const [filtroPerfil, setFiltroPerfil] = useState('')
  const [selecionado, setSelecionado]   = useState<Usuario | null>(null)
  const [showModal, setShowModal]       = useState(false)
  const [form, setForm]                 = useState<any>({ perfil: 'OPERADOR', ativo: true })
  const [salvando, setSalvando]         = useState(false)
  const [senhaTemp, setSenhaTemp]       = useState('')
  const [loading, setLoading]           = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (busca)        qs.set('busca', busca)
    if (filtroPerfil) qs.set('perfil', filtroPerfil)
    const r = await fetch(`/api/admin/usuarios?${qs}`).then(r => r.json())
    setUsuarios(r.usuarios ?? [])
    setTotal(r.total ?? 0)
    setLoading(false)
  }, [busca, filtroPerfil])

  useEffect(() => { carregar() }, [carregar])

  async function salvar() {
    setSalvando(true)
    setSenhaTemp('')
    const metodo = form.id ? 'PATCH' : 'POST'
    const r = await fetch('/api/admin/usuarios', {
      method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
    }).then(r => r.json())
    setSalvando(false)
    if (r.senhaTemporaria) { setSenhaTemp(r.senhaTemporaria); carregar(); return }
    if (r.usuario) { setShowModal(false); carregar() }
    else alert(JSON.stringify(r.erro))
  }

  async function toggleAtivo(u: Usuario) {
    await fetch('/api/admin/usuarios', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, ativo: !u.ativo })
    })
    carregar()
  }

  const perfilInfo = (p: string) => PERFIS.find(x => x.value === p) ?? { label: p, cor: '#999', emoji: '?' }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter,sans-serif', background: '#F4F6F8' }}>
      {/* Lista */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: '#fff', padding: '20px 28px', borderBottom: '1px solid #E0E0E0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1B5E20' }}>👥 Usuários</h1>
              <p style={{ margin: '4px 0 0', color: '#888', fontSize: 13 }}>{total} usuários cadastrados</p>
            </div>
            <button onClick={() => { setForm({ perfil: 'OPERADOR', ativo: true }); setSenhaTemp(''); setShowModal(true) }}
              style={{ background: '#2E7D32', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 700 }}>
              + Novo Usuário
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou e-mail..."
              style={{ flex: 1, border: '1px solid #DDD', borderRadius: 8, padding: '8px 12px', fontSize: 13 }} />
            <select value={filtroPerfil} onChange={e => setFiltroPerfil(e.target.value)}
              style={{ border: '1px solid #DDD', borderRadius: 8, padding: '8px 10px', fontSize: 13, background: '#fff' }}>
              <option value="">Todos os perfis</option>
              {PERFIS.map(p => <option key={p.value} value={p.value}>{p.emoji} {p.label}</option>)}
            </select>
          </div>
        </div>

        {/* Tabela */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F9FBF9', borderBottom: '2px solid #E0E0E0' }}>
                  {['Usuário', 'Perfil', 'Secretaria', 'Último Login', 'MFA', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#999' }}>Carregando...</td></tr>
                ) : usuarios.map(u => {
                  const pi = perfilInfo(u.perfil)
                  return (
                    <tr key={u.id} onClick={() => setSelecionado(selecionado?.id === u.id ? null : u)}
                      style={{ borderBottom: '1px solid #F5F5F5', cursor: 'pointer', background: selecionado?.id === u.id ? '#F0FFF0' : '#fff' }}
                      onMouseOver={e => { if (selecionado?.id !== u.id) e.currentTarget.style.background = '#FAFAFA' }}
                      onMouseOut={e => { if (selecionado?.id !== u.id) e.currentTarget.style.background = '#fff' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, background: '#E8F5E9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#2E7D32', fontSize: 14 }}>
                            {u.nome.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#1A1A1A' }}>{u.nome}</div>
                            <div style={{ fontSize: 11, color: '#999' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: pi.cor + '15', color: pi.cor, borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 700 }}>
                          {pi.emoji} {pi.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#666', fontSize: 12 }}>{u.secretaria ?? '—'}</td>
                      <td style={{ padding: '12px 16px', color: '#888', fontSize: 11 }}>
                        {u.ultimoLogin ? new Date(u.ultimoLogin).toLocaleDateString('pt-BR') : 'Nunca'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ color: u.mfaAtivado ? '#2E7D32' : '#999', fontSize: 12 }}>{u.mfaAtivado ? '🔒 Ativo' : '—'}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: u.ativo ? '#E8F5E9' : '#FFEBEE', color: u.ativo ? '#2E7D32' : '#C62828', borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>
                          {u.ativo ? '● Ativo' : '● Inativo'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={e => { e.stopPropagation(); setForm({ ...u }); setSenhaTemp(''); setShowModal(true) }}
                            style={{ background: '#F5F5F5', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}>✏️</button>
                          <button onClick={e => { e.stopPropagation(); toggleAtivo(u) }}
                            style={{ background: u.ativo ? '#FFF3F3' : '#F0FFF0', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}>
                            {u.ativo ? '🚫' : '✅'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal criação/edição */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{form.id ? 'Editar Usuário' : 'Novo Usuário'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Senha temporária gerada */}
            {senhaTemp && (
              <div style={{ background: '#F0FFF0', border: '2px solid #A5D6A7', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: '#1B5E20', marginBottom: 6 }}>✅ Usuário criado com sucesso!</div>
                <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>Senha temporária (anote — só será exibida uma vez):</div>
                <div style={{ background: '#fff', border: '1px solid #C8E6C9', borderRadius: 6, padding: '10px 14px', fontFamily: 'monospace', fontSize: 15, fontWeight: 700, letterSpacing: '2px', color: '#1B5E20' }}>
                  {senhaTemp}
                </div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>O usuário deverá trocar a senha no primeiro acesso.</div>
                <button onClick={() => setShowModal(false)}
                  style={{ marginTop: 12, background: '#2E7D32', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  Fechar
                </button>
              </div>
            )}

            {!senhaTemp && (
              <>
                <div style={{ display: 'grid', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Nome completo *</label>
                      <input value={form.nome ?? ''} onChange={e => setForm((f: any) => ({ ...f, nome: e.target.value }))}
                        style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>E-mail *</label>
                      <input type="email" value={form.email ?? ''} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))}
                        style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Perfil *</label>
                      <select value={form.perfil ?? 'OPERADOR'} onChange={e => setForm((f: any) => ({ ...f, perfil: e.target.value }))}
                        style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '10px 10px', fontSize: 13 }}>
                        {PERFIS.map(p => <option key={p.value} value={p.value}>{p.emoji} {p.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Secretaria</label>
                      <select value={form.secretaria ?? ''} onChange={e => setForm((f: any) => ({ ...f, secretaria: e.target.value || null }))}
                        style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '10px 10px', fontSize: 13 }}>
                        <option value="">Nenhuma</option>
                        {SECRETARIAS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>CPF</label>
                      <input value={form.cpf ?? ''} onChange={e => setForm((f: any) => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00"
                        style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Cargo</label>
                      <input value={form.cargo ?? ''} onChange={e => setForm((f: any) => ({ ...f, cargo: e.target.value }))}
                        style={{ width: '100%', border: '1px solid #DDD', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  {form.id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input type="checkbox" id="ativo" checked={form.ativo ?? true} onChange={e => setForm((f: any) => ({ ...f, ativo: e.target.checked }))} />
                      <label htmlFor="ativo" style={{ fontSize: 13, color: '#555' }}>Usuário ativo</label>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button onClick={() => setShowModal(false)} style={{ flex: 1, background: '#F5F5F5', border: 'none', borderRadius: 8, padding: '12px 0', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
                  <button onClick={salvar} disabled={salvando}
                    style={{ flex: 2, background: '#2E7D32', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', cursor: 'pointer', fontWeight: 700 }}>
                    {salvando ? 'Salvando...' : (form.id ? 'Salvar Alterações' : 'Criar Usuário')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
