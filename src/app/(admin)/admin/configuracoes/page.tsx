'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Palette, Building2, Image, Globe, Save, RefreshCw,
  CheckCircle, AlertCircle, Landmark, Upload, Eye, Trash2, Settings,
  X, ZoomIn,
} from 'lucide-react'

// ─── Redimensionamento via Canvas (client-side) ───────────────────────────────
async function redimensionarImagem(
  file: File,
  maxW: number,
  maxH: number,
  qualidade = 0.88,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img')
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width: w, height: h } = img
      // Manter proporção dentro de maxW x maxH
      const ratio = Math.min(maxW / w, maxH / h, 1) // nunca amplia
      w = Math.round(w * ratio)
      h = Math.round(h * ratio)

      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Falha ao converter imagem')),
        file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        qualidade,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Falha ao carregar imagem')) }
    img.src = url
  })
}

// Configurações por slot
const SLOTS = {
  logoUrl:   { label: 'Logo',    maxW: 400, maxH: 160, q: 0.88, formato: 'PNG/JPG até 400×160px', aspect: '5:2',  bg: '#F9FAFB' },
  brasaoUrl: { label: 'Brasão',  maxW: 300, maxH: 300, q: 0.90, formato: 'PNG/JPG até 300×300px', aspect: '1:1',  bg: '#F9FAFB' },
  favicon:   { label: 'Favicon', maxW: 64,  maxH: 64,  q: 0.90, formato: 'PNG/ICO 64×64px',       aspect: '1:1',  bg: '#F9FAFB' },
}

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
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'idle'|'loading'|'ok'|'erro'>>({})
  const [uploadMsg, setUploadMsg] = useState<Record<string, string>>({})
  const [drag, setDrag]       = useState<Record<string, boolean>>({})
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  async function fazerUpload(key: string, file: File) {
    const slot = SLOTS[key as keyof typeof SLOTS]
    if (!slot) return

    setUploadStatus(s => ({ ...s, [key]: 'loading' }))
    setUploadMsg(s => ({ ...s, [key]: 'Redimensionando…' }))

    try {
      // Redimensionar no browser antes de enviar
      let blob: Blob
      if (file.type === 'image/svg+xml' || file.type === 'image/x-icon') {
        blob = file
      } else {
        blob = await redimensionarImagem(file, slot.maxW, slot.maxH, slot.q)
      }

      setUploadMsg(s => ({ ...s, [key]: 'Enviando…' }))
      const form = new FormData()
      form.append('file', blob, file.name)
      form.append('tipo', key.replace('Url', '').replace('Url', ''))

      const r = await fetch('/api/admin/upload', { method: 'POST', body: form })
      const d = await r.json()

      if (!r.ok) throw new Error(d.erro ?? 'Erro no upload')

      setRascunho(prev => ({ ...prev, [key]: d.url }))
      setUploadStatus(s => ({ ...s, [key]: 'ok' }))
      setUploadMsg(s => ({ ...s, [key]: `✓ Redimensionado para ${slot.maxW}×${slot.maxH}px` }))
      setTimeout(() => setUploadStatus(s => ({ ...s, [key]: 'idle' })), 3000)
    } catch (e: any) {
      setUploadStatus(s => ({ ...s, [key]: 'erro' }))
      setUploadMsg(s => ({ ...s, [key]: e.message }))
    }
  }

  function onDropFile(key: string, e: React.DragEvent) {
    e.preventDefault()
    setDrag(d => ({ ...d, [key]: false }))
    const file = e.dataTransfer.files[0]
    if (file) fazerUpload(key, file)
  }

  function onSelectFile(key: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) fazerUpload(key, file)
    e.target.value = '' // reset para permitir re-upload do mesmo arquivo
  }

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
          {(Object.entries(SLOTS) as [string, typeof SLOTS[keyof typeof SLOTS]][]).map(([key, slot]) => {
            const url      = (rascunho as any)[key] as string | undefined
            const st       = uploadStatus[key] ?? 'idle'
            const msg      = uploadMsg[key] ?? ''
            const isDrag   = drag[key] ?? false
            const isSquare = slot.aspect === '1:1'

            return (
              <div key={key} style={{ gridColumn: key === 'favicon' ? '1 / -1' : undefined, maxWidth: key === 'favicon' ? 380 : undefined }}>
                {/* Título */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                  <label style={{ fontSize:13, fontWeight:700, color:'#424242' }}>{slot.label}</label>
                  <span style={{ fontSize:11, color:'#BDBDBD', background:'#F5F5F5', padding:'2px 8px', borderRadius:20 }}>
                    {slot.formato}
                  </span>
                </div>

                {/* Área de drag-and-drop */}
                <div
                  onDragOver={e => { e.preventDefault(); setDrag(d => ({ ...d, [key]: true })) }}
                  onDragLeave={() => setDrag(d => ({ ...d, [key]: false }))}
                  onDrop={e => onDropFile(key, e)}
                  onClick={() => fileRefs.current[key]?.click()}
                  style={{
                    width:'100%', height: isSquare ? 160 : 100,
                    border:`2px dashed ${isDrag ? 'var(--cor-primaria)' : '#E0E0E0'}`,
                    borderRadius:12,
                    background: isDrag ? 'var(--cor-primaria-light)' : slot.bg,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    marginBottom:10, overflow:'hidden',
                    cursor:'pointer', transition:'all 0.18s', position:'relative',
                  }}
                >
                  {st === 'loading' ? (
                    <div style={{ textAlign:'center', color:'var(--cor-primaria)' }}>
                      <RefreshCw size={24} style={{ animation:'spin 0.7s linear infinite', display:'block', margin:'0 auto 6px' }} />
                      <div style={{ fontSize:12 }}>{msg}</div>
                    </div>
                  ) : url ? (
                    <>
                      <img src={url} alt={slot.label}
                        style={{ maxWidth:'92%', maxHeight:'92%', objectFit:'contain', borderRadius:4 }} />
                      {/* Overlay ao hover */}
                      <div style={{
                        position:'absolute', inset:0, background:'rgba(0,0,0,0.45)',
                        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6,
                        opacity:0, transition:'opacity 0.18s', borderRadius:10,
                      }}
                        onMouseOver={e => (e.currentTarget.style.opacity = '1')}
                        onMouseOut={e => (e.currentTarget.style.opacity = '0')}
                      >
                        <Upload size={22} color='#fff' strokeWidth={1.5} />
                        <span style={{ color:'#fff', fontSize:12, fontWeight:600 }}>Trocar imagem</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign:'center', color: isDrag ? 'var(--cor-primaria)' : '#BDBDBD', userSelect:'none' }}>
                      <Upload size={28} strokeWidth={1} style={{ display:'block', margin:'0 auto 8px' }} />
                      <div style={{ fontSize:12, fontWeight:600 }}>
                        {isDrag ? 'Solte para fazer upload' : 'Clique ou arraste a imagem'}
                      </div>
                      <div style={{ fontSize:11, marginTop:3 }}>{slot.formato}</div>
                    </div>
                  )}
                </div>

                {/* Input oculto */}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
                  style={{ display:'none' }}
                  ref={el => { fileRefs.current[key] = el }}
                  onChange={e => onSelectFile(key, e)}
                />

                {/* Status de upload */}
                {st === 'ok' && (
                  <div style={{ fontSize:12, color:'#2E7D32', display:'flex', alignItems:'center', gap:5, marginBottom:8 }}>
                    <CheckCircle size={13} strokeWidth={2} /> {msg}
                  </div>
                )}
                {st === 'erro' && (
                  <div style={{ fontSize:12, color:'#C62828', display:'flex', alignItems:'center', gap:5, marginBottom:8 }}>
                    <AlertCircle size={13} strokeWidth={2} /> {msg}
                  </div>
                )}

                {/* URL manual + remover */}
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <input
                    value={url?.startsWith('data:') ? '(imagem enviada)' : (url ?? '')}
                    readOnly={url?.startsWith('data:')}
                    onChange={e => !url?.startsWith('data:') && atualizar(key as keyof Config, e.target.value)}
                    placeholder="Ou cole uma URL pública…"
                    style={{
                      flex:1, padding:'7px 11px', border:'1.5px solid #E0E0E0', borderRadius:7,
                      fontSize:12, background: url?.startsWith('data:') ? '#F5F5F5' : '#FAFAFA',
                      outline:'none', color: url?.startsWith('data:') ? '#9E9E9E' : '#1A1A1A',
                    }}
                    onFocus={e => { if (!url?.startsWith('data:')) e.target.style.borderColor = 'var(--cor-primaria)' }}
                    onBlur={e => (e.target.style.borderColor = '#E0E0E0')}
                  />
                  {url && (
                    <button
                      onClick={() => { atualizar(key as keyof Config, ''); setUploadStatus(s => ({ ...s, [key]: 'idle' })); setUploadMsg(s => ({ ...s, [key]: '' })) }}
                      title="Remover imagem"
                      style={{ padding:'7px 10px', background:'#FFEBEE', border:'1px solid #FFCDD2', borderRadius:7, cursor:'pointer', display:'flex', alignItems:'center' }}>
                      <Trash2 size={14} color='#C62828' strokeWidth={1.5} />
                    </button>
                  )}
                </div>
                <p style={{ margin:'5px 0 0', fontSize:11, color:'#BDBDBD' }}>
                  A imagem é redimensionada automaticamente para {slot.maxW}×{slot.maxH}px antes de ser salva.
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
