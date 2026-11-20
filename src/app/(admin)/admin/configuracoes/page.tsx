'use client'
import { useEffect, useState, useRef } from 'react'
import {
  Palette, Building2, Image, Globe, Save, RefreshCw,
  CheckCircle, AlertCircle, Landmark, Upload, Eye, Trash2, Settings,
} from 'lucide-react'

type Config = {
  id?:           string
  nome?:         string
  uf?:           string
  ibge?:         string
  cnpj?:         string
  dominio?:      string
  logoUrl?:      string
  brasaoUrl?:    string
  favicon?:      string
  corPrimaria?:  string
  corSecundaria?:string
  corAcento?:    string
  plano?:        string
}

type Aba = 'identidade' | 'cores' | 'imagens'

// Paletas predefinidas
const PALETAS = [
  { nome:'Verde Floresta',  primaria:'#1B5E20', secundaria:'#2E7D32', acento:'#F9A825' },
  { nome:'Azul Governo',    primaria:'#0D47A1', secundaria:'#1565C0', acento:'#FFA000' },
  { nome:'Azul Royal',      primaria:'#1A237E', secundaria:'#283593', acento:'#E91E63' },
  { nome:'Bordô Nobre',     primaria:'#4A148C', secundaria:'#6A1B9A', acento:'#FF6F00' },
  { nome:'Teal Moderno',    primaria:'#004D40', secundaria:'#00695C', acento:'#FFAB00' },
  { nome:'Cinza Profissional', primaria:'#212121', secundaria:'#424242', acento:'#1976D2' },
  { nome:'Terra Baiana',    primaria:'#4E342E', secundaria:'#5D4037', acento:'#FDD835' },
  { nome:'Vermelho Cívico', primaria:'#B71C1C', secundaria:'#C62828', acento:'#FFC107' },
]

export default function ConfiguracoesPage() {
  const [config, setConfig]   = useState<Config>({})
  const [rascunho, setRascunho] = useState<Config>({})
  const [aba, setAba]         = useState<Aba>('identidade')
  const [salvando, setSalvando] = useState(false)
  const [status, setStatus]   = useState<{ tipo: 'ok'|'erro'; msg: string } | null>(null)
  const [carregando, setCarregando] = useState(true)
  const logoRef   = useRef<HTMLInputElement>(null)
  const brasaoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/admin/configuracoes')
      .then(r => r.ok ? r.json() : {})
      .then(data => {
        setConfig(data)
        setRascunho(data)
        setCarregando(false)
      })
  }, [])

  // Preview ao vivo das cores
  useEffect(() => {
    if (rascunho.corPrimaria) {
      document.documentElement.style.setProperty('--cor-primaria', rascunho.corPrimaria)
      document.documentElement.style.setProperty('--cor-secundaria', rascunho.corSecundaria ?? rascunho.corPrimaria)
    }
    if (rascunho.corAcento) {
      document.documentElement.style.setProperty('--cor-acento', rascunho.corAcento)
    }
  }, [rascunho.corPrimaria, rascunho.corSecundaria, rascunho.corAcento])

  function atualizar(key: keyof Config, value: string) {
    setRascunho(prev => ({ ...prev, [key]: value }))
  }

  function aplicarPaleta(p: typeof PALETAS[0]) {
    setRascunho(prev => ({ ...prev, corPrimaria: p.primaria, corSecundaria: p.secundaria, corAcento: p.acento }))
  }

  async function salvar() {
    setSalvando(true)
    setStatus(null)
    try {
      const r = await fetch('/api/admin/configuracoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rascunho),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.erro ?? 'Erro ao salvar')
      setConfig(data.municipio ?? rascunho)
      setRascunho(data.municipio ?? rascunho)
      setStatus({ tipo:'ok', msg:'Configurações salvas com sucesso!' })
    } catch (e: any) {
      setStatus({ tipo:'erro', msg: e.message })
    } finally {
      setSalvando(false)
      setTimeout(() => setStatus(null), 4000)
    }
  }

  function descartar() {
    setRascunho(config)
    document.documentElement.style.setProperty('--cor-primaria', config.corPrimaria ?? '#1B5E20')
    document.documentElement.style.setProperty('--cor-acento',   config.corAcento   ?? '#F9A825')
  }

  const temAlteracao = JSON.stringify(rascunho) !== JSON.stringify(config)

  if (carregando) return (
    <div style={{ padding:40, textAlign:'center', color:'#9E9E9E', fontSize:14 }}>
      <RefreshCw size={24} style={{ animation:'spin 0.8s linear infinite', marginBottom:12, display:'block', margin:'0 auto 12px' }} />
      Carregando configurações…
    </div>
  )

  return (
    <div style={{ padding:'28px 32px', fontFamily:'Inter,sans-serif', maxWidth:860 }}>

      {/* Cabeçalho */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <div>
          <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:'#1A1A1A', display:'flex', alignItems:'center', gap:8 }}>
            <Settings size={20} strokeWidth={1.5} color='var(--cor-primaria)' />
            Configurações do Sistema
          </h1>
          <p style={{ margin:'4px 0 0', color:'#9E9E9E', fontSize:13 }}>
            Personalize a identidade visual e dados do município
          </p>
        </div>

        {/* Botões de ação */}
        <div style={{ display:'flex', gap:8 }}>
          {temAlteracao && (
            <button onClick={descartar}
              style={{ padding:'8px 16px', background:'#F5F5F5', border:'1px solid #E0E0E0', borderRadius:8, fontSize:13, cursor:'pointer', color:'#616161', fontWeight:500 }}>
              Descartar
            </button>
          )}
          <button onClick={salvar} disabled={salvando || !temAlteracao}
            style={{
              padding:'8px 20px', background: temAlteracao ? 'var(--cor-primaria)' : '#BDBDBD',
              border:'none', borderRadius:8, fontSize:13, cursor: temAlteracao ? 'pointer' : 'default',
              color:'#fff', fontWeight:600,
              display:'flex', alignItems:'center', gap:6,
              opacity: salvando ? 0.7 : 1,
            }}>
            {salvando ? <RefreshCw size={14} style={{ animation:'spin 0.6s linear infinite' }} /> : <Save size={14} strokeWidth={2} />}
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Feedback */}
      {status && (
        <div style={{
          marginBottom:20, padding:'10px 16px', borderRadius:8,
          background: status.tipo === 'ok' ? '#E8F5E9' : '#FFEBEE',
          color:       status.tipo === 'ok' ? '#2E7D32' : '#C62828',
          display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:500,
        }}>
          {status.tipo === 'ok'
            ? <CheckCircle size={15} strokeWidth={2} />
            : <AlertCircle size={15} strokeWidth={2} />}
          {status.msg}
        </div>
      )}

      {/* Abas */}
      <div style={{ display:'flex', gap:0, marginBottom:24, borderBottom:'2px solid #EEEEEE' }}>
        {([
          { id:'identidade', label:'Identidade',    Icon:Building2 },
          { id:'cores',      label:'Paleta de Cores', Icon:Palette  },
          { id:'imagens',    label:'Logo & Brasão',  Icon:Image    },
        ] as { id:Aba; label:string; Icon:any }[]).map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setAba(id)}
            style={{
              padding:'10px 20px', background:'transparent', border:'none',
              borderBottom: aba === id ? '2px solid var(--cor-primaria)' : '2px solid transparent',
              marginBottom:'-2px',
              color: aba === id ? 'var(--cor-primaria)' : '#9E9E9E',
              fontWeight: aba === id ? 700 : 500, fontSize:13, cursor:'pointer',
              display:'flex', alignItems:'center', gap:6,
            }}>
            <Icon size={14} strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Aba Identidade ─────────────────────────────────────────────────── */}
      {aba === 'identidade' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {[
            { key:'nome',    label:'Nome do Município', placeholder:'Biritinga', full:true },
            { key:'uf',      label:'UF', placeholder:'BA', full:false },
            { key:'ibge',    label:'Código IBGE', placeholder:'2903953', full:false },
            { key:'cnpj',    label:'CNPJ', placeholder:'00.000.000/0001-00', full:true },
            { key:'dominio', label:'Domínio', placeholder:'biritinga.ba.gov.br', full:true },
          ].map(({ key, label, placeholder, full }) => (
            <div key={key} style={{ gridColumn: full ? '1 / -1' : undefined }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#616161', marginBottom:6 }}>{label}</label>
              <input
                value={(rascunho as any)[key] ?? ''}
                onChange={e => atualizar(key as keyof Config, e.target.value)}
                placeholder={placeholder}
                style={{
                  width:'100%', padding:'9px 12px', border:'1.5px solid #E0E0E0', borderRadius:8,
                  fontSize:13, background:'#FAFAFA', outline:'none',
                  transition:'border-color 0.15s',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--cor-primaria)')}
                onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Aba Cores ──────────────────────────────────────────────────────── */}
      {aba === 'cores' && (
        <div>
          {/* Paletas rápidas */}
          <div style={{ marginBottom:28 }}>
            <h3 style={{ margin:'0 0 12px', fontSize:13, fontWeight:700, color:'#424242', display:'flex', alignItems:'center', gap:6 }}>
              <Palette size={14} strokeWidth={1.5} />
              Paletas Prontas
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
              {PALETAS.map(p => (
                <button key={p.nome} onClick={() => aplicarPaleta(p)}
                  style={{
                    padding:'10px 12px', border:'2px solid', borderRadius:10, cursor:'pointer',
                    background:'#fff', textAlign:'left',
                    borderColor:
                      rascunho.corPrimaria === p.primaria && rascunho.corAcento === p.acento
                        ? p.primaria : '#E0E0E0',
                    transition:'border-color 0.15s',
                  }}>
                  {/* Preview de cores */}
                  <div style={{ display:'flex', gap:4, marginBottom:7 }}>
                    <div style={{ width:22, height:22, borderRadius:6, background:p.primaria }} />
                    <div style={{ width:22, height:22, borderRadius:6, background:p.secundaria }} />
                    <div style={{ width:22, height:22, borderRadius:6, background:p.acento }} />
                  </div>
                  <div style={{ fontSize:11, fontWeight:600, color:'#424242' }}>{p.nome}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Cores personalizadas */}
          <h3 style={{ margin:'0 0 14px', fontSize:13, fontWeight:700, color:'#424242' }}>
            Personalizar Cores
          </h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
            {[
              { key:'corPrimaria',   label:'Cor Primária',   desc:'Sidebar, botões principais' },
              { key:'corSecundaria', label:'Cor Secundária', desc:'Hover, variações de fundo'  },
              { key:'corAcento',     label:'Cor de Acento',  desc:'Destaques, item ativo'      },
            ].map(({ key, label, desc }) => (
              <div key={key}>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#616161', marginBottom:4 }}>{label}</label>
                <div style={{ fontSize:11, color:'#BDBDBD', marginBottom:8 }}>{desc}</div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <input
                    type="color"
                    value={(rascunho as any)[key] ?? '#000000'}
                    onChange={e => atualizar(key as keyof Config, e.target.value)}
                    style={{ width:40, height:40, border:'none', cursor:'pointer', borderRadius:8, padding:2, background:'transparent' }}
                  />
                  <input
                    type="text"
                    value={(rascunho as any)[key] ?? ''}
                    onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) atualizar(key as keyof Config, e.target.value) }}
                    style={{ flex:1, padding:'8px 10px', border:'1.5px solid #E0E0E0', borderRadius:7, fontSize:13, fontFamily:'monospace' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Preview da sidebar */}
          <div style={{ marginTop:28 }}>
            <h3 style={{ margin:'0 0 12px', fontSize:13, fontWeight:700, color:'#424242', display:'flex', alignItems:'center', gap:6 }}>
              <Eye size={14} strokeWidth={1.5} />
              Preview da Sidebar
            </h3>
            <div style={{
              width:200, background:rascunho.corPrimaria ?? '#1B5E20', borderRadius:12,
              overflow:'hidden', boxShadow:'0 4px 16px rgba(0,0,0,0.15)',
            }}>
              {/* Header */}
              <div style={{ padding:'14px 14px 10px', borderBottom:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:28, height:28, borderRadius:6, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Landmark size={14} color='rgba(255,255,255,0.8)' strokeWidth={1.5} />
                </div>
                <div>
                  <div style={{ color:'rgba(255,255,255,0.5)', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>Prefeitura de</div>
                  <div style={{ color: rascunho.corAcento ?? '#F9A825', fontSize:11, fontWeight:800 }}>
                    {rascunho.nome ?? 'Biritinga'}/{rascunho.uf ?? 'BA'}
                  </div>
                </div>
              </div>
              {/* Nav itens */}
              {[
                { label:'Visão Geral', ativo:true },
                { label:'Usuários',   ativo:false },
                { label:'Configurações', ativo:false },
              ].map(({ label, ativo }) => (
                <div key={label} style={{
                  padding:'8px 14px', fontSize:11, fontWeight: ativo ? 600 : 400,
                  color: ativo ? rascunho.corAcento ?? '#F9A825' : 'rgba(255,255,255,0.7)',
                  background: ativo ? 'rgba(255,255,255,0.08)' : 'transparent',
                  borderLeft: ativo ? `2px solid ${rascunho.corAcento ?? '#F9A825'}` : '2px solid transparent',
                  display:'flex', alignItems:'center', gap:8,
                }}>
                  <div style={{ width:7, height:7, borderRadius:2, border:`1.5px solid ${ativo ? (rascunho.corAcento ?? '#F9A825') : 'rgba(255,255,255,0.4)'}` }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Aba Imagens ────────────────────────────────────────────────────── */}
      {aba === 'imagens' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
          {[
            { key:'logoUrl',   label:'Logo',   desc:'Exibido no portal público e emails. Recomendado: PNG 200×80px.' },
            { key:'brasaoUrl', label:'Brasão', desc:'Exibido na sidebar do painel. Recomendado: PNG 200×200px quadrado.' },
            { key:'favicon',   label:'Favicon', desc:'Ícone da aba do navegador. Recomendado: ICO ou PNG 32×32px.' },
          ].map(({ key, label, desc }) => {
            const url = (rascunho as any)[key] as string | undefined
            return (
              <div key={key} style={{ gridColumn: key === 'favicon' ? '1 / -1' : undefined, maxWidth: key === 'favicon' ? 360 : undefined }}>
                <label style={{ display:'block', fontSize:13, fontWeight:700, color:'#424242', marginBottom:4 }}>
                  {label}
                </label>
                <p style={{ margin:'0 0 12px', fontSize:12, color:'#9E9E9E' }}>{desc}</p>

                {/* Preview */}
                <div style={{
                  width:'100%', height: key === 'brasaoUrl' ? 140 : 80,
                  border:'2px dashed #E0E0E0', borderRadius:10,
                  background:'#FAFAFA', display:'flex', alignItems:'center', justifyContent:'center',
                  marginBottom:10, overflow:'hidden',
                }}>
                  {url
                    ? <img src={url} alt={label} style={{ maxWidth:'90%', maxHeight:'90%', objectFit:'contain' }} />
                    : <div style={{ textAlign:'center', color:'#BDBDBD' }}>
                        <Image size={28} strokeWidth={1} style={{ display:'block', margin:'0 auto 6px' }} />
                        <div style={{ fontSize:11 }}>Sem imagem</div>
                      </div>
                  }
                </div>

                {/* URL input */}
                <div style={{ display:'flex', gap:8 }}>
                  <input
                    value={url ?? ''}
                    onChange={e => atualizar(key as keyof Config, e.target.value)}
                    placeholder={`https://.../${key === 'logoUrl' ? 'logo.png' : key === 'brasaoUrl' ? 'brasao.png' : 'favicon.ico'}`}
                    style={{
                      flex:1, padding:'8px 12px', border:'1.5px solid #E0E0E0', borderRadius:7,
                      fontSize:12, background:'#FAFAFA', outline:'none',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--cor-primaria)')}
                    onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
                  />
                  {url && (
                    <button onClick={() => atualizar(key as keyof Config, '')}
                      style={{ padding:'8px 10px', background:'#FFEBEE', border:'1px solid #FFCDD2', borderRadius:7, cursor:'pointer', display:'flex', alignItems:'center' }}>
                      <Trash2 size={14} color='#C62828' strokeWidth={1.5} />
                    </button>
                  )}
                </div>
                <p style={{ margin:'6px 0 0', fontSize:11, color:'#BDBDBD' }}>
                  Cole a URL pública da imagem. Para fazer upload, use o gerenciador de arquivos do cPanel e copie o link.
                </p>
              </div>
            )
          })}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
