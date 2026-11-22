'use client'
import { useUsuario } from '@/components/AdminShell'
import { useEffect, useState } from 'react'
import {
  Newspaper, CalendarDays, Inbox, Users,
  Search, BarChart2, UserPlus, FileText,
  Settings, Globe, Circle,
} from 'lucide-react'

type Stats = {
  noticias?: number; eventos?: number; demandas?: number
  usuarios?: number; esic?: number; transparencia?: number
}

const KPI_CONFIG = [
  { key:'noticias',      label:'Notícias',      Icon:Newspaper,    href:'/gestao/comunicacao/noticias', cor:'var(--cor-primaria)' },
  { key:'eventos',       label:'Eventos',       Icon:CalendarDays, href:'/gestao/comunicacao/agenda',   cor:'var(--cor-primaria)' },
  { key:'demandas',      label:'Demandas',      Icon:Inbox,        href:'/admin/ouvidoria',             cor:'var(--cor-primaria)' },
  { key:'usuarios',      label:'Usuários',      Icon:Users,        href:'/admin/usuarios',              cor:'var(--cor-primaria)' },
  { key:'esic',          label:'e-SIC',         Icon:Search,       href:'/gestao/esic',                 cor:'var(--cor-primaria)' },
  { key:'transparencia', label:'Transparência', Icon:BarChart2,    href:'/gestao/transparencia',        cor:'var(--cor-primaria)' },
] as const

const ACESSO_RAPIDO = [
  { label:'Nova Notícia',   Icon:Newspaper,    href:'/gestao/comunicacao/noticias' },
  { label:'Novo Evento',    Icon:CalendarDays, href:'/gestao/comunicacao/agenda'   },
  { label:'Novo Usuário',   Icon:UserPlus,     href:'/admin/usuarios'              },
  { label:'Ver Relatórios', Icon:FileText,     href:'/gestao/comunicacao/relatorios'},
  { label:'Configurações',  Icon:Settings,     href:'/admin/configuracoes'         },
  { label:'Portal Público', Icon:Globe,        href:'https://biritinga.ba.gov.br', target:'_blank' },
]

const STATUS = [
  'Portal Público (biritinga.ba.gov.br)',
  'Banco de Dados (MySQL/cPanel)',
  'API REST',
  'Portal da Transparência',
  'Ouvidoria',
  'e-SIC',
]

export default function AdminDashboard() {
  const { usuario } = useUsuario()
  const [stats, setStats] = useState<Stats>({})
  const [hora, setHora]   = useState('')

  useEffect(() => {
    const tick = () => setHora(new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }))
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.ok ? r.json() : {}).then(setStats)
  }, [])

  const saudacao = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  return (
    <div style={{ padding:'28px 32px', fontFamily:'Inter,sans-serif' }}>

      {/* Cabeçalho */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'#1A1A1A' }}>
            {saudacao()}, {usuario?.nome.split(' ')[0]}!
          </h1>
          <p style={{ margin:'4px 0 0', color:'#9E9E9E', fontSize:13 }}>
            Prefeitura Municipal de Biritinga - Painel de Gestão
          </p>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:22, fontWeight:800, color:'var(--cor-primaria)' }}>{hora}</div>
          <div style={{ fontSize:12, color:'#BDBDBD' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long' })}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
        {KPI_CONFIG.map(({ key, label, Icon, href, cor }) => (
          <a key={key} href={href}
            style={{
              background:'#fff', borderRadius:12, padding:'18px 22px',
              textDecoration:'none', display:'block',
              borderLeft:`3px solid ${cor}`,
              boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
              transition:'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseOver={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 18px rgba(0,0,0,0.09)' }}
            onMouseOut={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)' }}>
            <Icon size={20} strokeWidth={1.5} color={cor} style={{ marginBottom:8 }} />
            <div style={{ fontSize:26, fontWeight:800, color:cor, lineHeight:1 }}>
              {(stats as any)[key] ?? 0}
            </div>
            <div style={{ fontSize:12, color:'#757575', fontWeight:500, marginTop:4 }}>{label}</div>
          </a>
        ))}
      </div>

      {/* Acesso rápido + Status */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* Acesso Rápido */}
        <div style={{ background:'#fff', borderRadius:12, padding:'18px 22px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
            <Settings size={14} strokeWidth={1.5} color='var(--cor-primaria)' />
            <h3 style={{ margin:0, fontSize:13, fontWeight:700, color:'#424242' }}>Acesso Rápido</h3>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {ACESSO_RAPIDO.map(({ label, Icon, href, ...rest }) => (
              <a key={label} href={href} {...rest}
                style={{
                  display:'flex', alignItems:'center', gap:8,
                  background:'var(--cor-primaria-light)', borderRadius:8, padding:'9px 12px',
                  textDecoration:'none', color:'var(--cor-primaria-txt)', fontSize:12, fontWeight:500,
                  border:'1px solid transparent', transition:'border-color 0.12s',
                }}
                onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--cor-primaria)')}
                onMouseOut={e => (e.currentTarget.style.borderColor = 'transparent')}>
                <Icon size={14} strokeWidth={1.5} />
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Status do Sistema */}
        <div style={{ background:'#fff', borderRadius:12, padding:'18px 22px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
            <Circle size={9} fill='var(--cor-primaria)' color='var(--cor-primaria)' />
            <h3 style={{ margin:0, fontSize:13, fontWeight:700, color:'#424242' }}>Status do Sistema</h3>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {STATUS.map(label => (
              <div key={label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #F5F5F5' }}>
                <span style={{ fontSize:12, color:'#616161' }}>{label}</span>
                <span style={{
                  fontSize:10, color:'#2E7D32', fontWeight:600,
                  background:'#E8F5E9', padding:'2px 8px', borderRadius:4,
                  display:'flex', alignItems:'center', gap:4,
                }}>
                  <Circle size={6} fill='var(--cor-primaria)' color='var(--cor-primaria)' />
                  Online
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
