'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Megaphone, Inbox, Building2, Eye, EyeOff, Lock, Loader } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm]       = useState({ email: '', senha: '' })
  const [erro, setErro]       = useState('')
  const [carregando, setCarregando] = useState(false)
  const [senhaVis, setSenhaVis]     = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await r.json()
      if (!r.ok) { setErro(data.erro ?? 'Credenciais inválidas'); setCarregando(false); return }

      // Redirecionar por perfil
      const perfil    = data.usuario?.perfil ?? ''
      const secretaria = data.usuario?.secretaria ?? ''

      if (perfil === 'SUPER_ADMIN' || perfil === 'ADMIN_MUNICIPIO') {
        router.push('/admin')
      } else if (perfil === 'GESTOR' && secretaria?.toUpperCase().includes('COMUNICACAO')) {
        router.push('/admin/comunicacao')
      } else if (perfil === 'OPERADOR' || perfil === 'GESTOR') {
        // Redirecionar para a secretaria do usuário
        const slug = slugSecretaria(secretaria)
        router.push(`/admin/secretaria/${slug}`)
      } else if (perfil === 'VISUALIZADOR') {
        router.push('/admin/ouvidoria')
      } else {
        router.push('/admin')
      }
    } catch {
      setErro('Falha de conexão. Tente novamente.')
      setCarregando(false)
    }
  }

  function slugSecretaria(s: string) {
    return s?.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      || 'inicio'
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', fontFamily: "'Inter', 'Segoe UI', sans-serif",
      background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 40%, #1565C0 100%)',
    }}>
      {/* Painel esquerdo - identidade */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '40px 60px', color: '#fff',
      }}>
        {/* Brasão */}
        <div style={{
          width: 120, height: 120, marginBottom: 24,
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.35))',
        }}>
          <Image src="/brasao.png" alt="Brasão de Biritinga" width={120} height={120}
            style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
        </div>

        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, textAlign: 'center', letterSpacing: '-0.5px' }}>
          Prefeitura Municipal
        </h1>
        <h2 style={{ margin: '0 0 32px', fontSize: 20, fontWeight: 400, opacity: 0.85, textAlign: 'center' }}>
          de Biritinga - Bahia
        </h2>

        <div style={{ width: 60, height: 3, background: '#F9A825', borderRadius: 2, marginBottom: 32 }} />

        <p style={{ fontSize: 15, opacity: 0.8, textAlign: 'center', maxWidth: 320, lineHeight: 1.6, margin: 0 }}>
          Painel de Gestão Municipal - acesso exclusivo para servidores e gestores autorizados.
        </p>

        {/* Perfis disponíveis */}
        <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%', maxWidth: 360 }}>
          {[
            { Icon: ShieldCheck, label: 'Administrador', desc: 'Acesso total' },
            { Icon: Megaphone, label: 'Comunicação', desc: 'Notícias e mídia' },
            { Icon: Inbox, label: 'Ouvidoria', desc: 'Demandas cidadãs' },
            { Icon: Building2, label: 'Secretaria', desc: 'Módulo da área' },
          ].map(p => (
            <div key={p.label} style={{
              background: 'rgba(255,255,255,0.1)', borderRadius: 10,
              padding: '10px 14px', border: '1px solid rgba(255,255,255,0.15)',
            }}>
              <div style={{ marginBottom: 2 }}><p.Icon size={20} color="#fff" strokeWidth={1.5} /></div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{p.label}</div>
              <div style={{ fontSize: 10, opacity: 0.7 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Painel direito - formulário */}
      <div style={{
        width: 480, background: '#fff', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '48px 56px',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800, color: '#1B5E20' }}>Acesso ao Sistema</h2>
          <p style={{ margin: '0 0 36px', color: '#888', fontSize: 14 }}>
            Entre com suas credenciais institucionais
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* E-mail */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>
                E-mail institucional
              </label>
              <input
                type="email" required autoComplete="email"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="usuario@biritinga.ba.gov.br"
                style={{
                  width: '100%', border: '2px solid #E0E0E0', borderRadius: 10,
                  padding: '12px 16px', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = '#2E7D32')}
                onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
              />
            </div>

            {/* Senha */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={senhaVis ? 'text' : 'password'} required autoComplete="current-password"
                  value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                  placeholder="••••••••"
                  style={{
                    width: '100%', border: '2px solid #E0E0E0', borderRadius: 10,
                    padding: '12px 48px 12px 16px', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#2E7D32')}
                  onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
                />
                <button type="button" onClick={() => setSenhaVis(v => !v)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 18,
                  }}>
                  {senhaVis ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                </button>
              </div>
              <div style={{ textAlign: 'right', marginTop: 6 }}>
                <a href="/login/recuperar" style={{ fontSize: 12, color: '#1565C0', textDecoration: 'none' }}>
                  Esqueci minha senha
                </a>
              </div>
            </div>

            {/* Erro */}
            {erro && (
              <div style={{
                background: '#FFF3F3', border: '1px solid #FFCDD2', borderRadius: 8,
                padding: '10px 14px', fontSize: 13, color: '#C62828', display: 'flex', gap: 8, alignItems: 'center',
              }}>
                ⚠️ {erro}
              </div>
            )}

            {/* Botão */}
            <button type="submit" disabled={carregando}
              style={{
                background: carregando ? '#A5D6A7' : 'linear-gradient(135deg, #2E7D32, #1B5E20)',
                color: '#fff', border: 'none', borderRadius: 10, padding: '14px 0',
                fontSize: 15, fontWeight: 700, cursor: carregando ? 'default' : 'pointer',
                width: '100%', letterSpacing: '0.3px',
                boxShadow: carregando ? 'none' : '0 4px 16px rgba(27,94,32,0.3)',
                transition: 'all 0.2s',
              }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {carregando ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Lock size={16} />}
                {carregando ? 'Autenticando...' : 'Entrar no Sistema'}
              </span>
            </button>
          </form>

          {/* Rodapé */}
          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <a href="/" style={{ fontSize: 12, color: '#999', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              ← Voltar ao Portal da Prefeitura
            </a>
          </div>
        </div>

        {/* Aviso de segurança */}
        <div style={{
          position: 'absolute', bottom: 24,
          fontSize: 11, color: '#BBB', textAlign: 'center', maxWidth: 360,
        }}>
          🔒 Conexão segura - LGPD compliant · Prefeitura Municipal de Biritinga/BA
        </div>
      </div>
    </div>
  )
}
