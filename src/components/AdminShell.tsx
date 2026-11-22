'use client'
import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, ShieldCheck, Settings,
  Megaphone, Inbox, BarChart2, Landmark,
  Wallet, FolderOpen, Stethoscope, GraduationCap,
  Newspaper, Leaf, HardHat, Globe, LogOut,
  ChevronLeft, ChevronRight, CalendarDays, Image,
  Zap, CircleCheck, CircleDot,
  FileText, TrendingUp, CircleDollarSign,
  School, BookOpen, Heart, UtensilsCrossed,
  Syringe, Pill, Activity, Building2, Package, UserCheck,
  Briefcase, Car, DollarSign, Fuel, ClipboardList, AlertCircle,
} from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Usuario = {
  id: string; nome: string; email: string; perfil: string
  secretaria?: string; avatarUrl?: string
}

type TemaConfig = {
  corPrimaria: string
  corAcento:   string
  logoUrl?:    string
  brasaoUrl?:  string
  nomePrefeitura: string
  uf:          string
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

const CtxUsuario = createContext<{ usuario: Usuario | null; sair: () => void }>({
  usuario: null, sair: () => {},
})
export function useUsuario() { return useContext(CtxUsuario) }

// ─── Helpers de cor ───────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return { r, g, b }
}

function lighten(hex: string, pct = 0.92): string {
  const { r, g, b } = hexToRgb(hex)
  const mix = (c: number) => Math.round(c + (255 - c) * pct)
  return `#${mix(r).toString(16).padStart(2,'0')}${mix(g).toString(16).padStart(2,'0')}${mix(b).toString(16).padStart(2,'0')}`
}

function aplicarTema(t: TemaConfig) {
  const root = document.documentElement
  root.style.setProperty('--cor-primaria',    t.corPrimaria)
  root.style.setProperty('--cor-secundaria',  t.corPrimaria)
  root.style.setProperty('--cor-acento',      t.corAcento)
  root.style.setProperty('--cor-primaria-light', lighten(t.corPrimaria))
  root.style.setProperty('--cor-primaria-txt',   t.corPrimaria)
}

// ─── Mapa de navegação ────────────────────────────────────────────────────────

const NAV_ADMIN = [
  { grupo: 'Gestão', items: [
    { href: '/admin',                label: 'Visão Geral',      Icon: LayoutDashboard },
    { href: '/admin/usuarios',       label: 'Usuários',         Icon: Users           },
    { href: '/admin/perfis',         label: 'Perfis de Acesso', Icon: ShieldCheck     },
    { href: '/admin/configuracoes',  label: 'Configurações',    Icon: Settings        },
  ]},
  { grupo: 'Módulos', items: [
    { href: '/admin/comunicacao',    label: 'Comunicação',      Icon: Megaphone       },
    { href: '/admin/ouvidoria',      label: 'Ouvidoria',        Icon: Inbox           },
    { href: '/admin/transparencia',  label: 'Transparência',    Icon: BarChart2       },
  ]},
  { grupo: 'ERP', items: [
    { href: '/gestao/sefin',        label: 'Financeiro',      Icon: Wallet          },
    { href: '/gestao/semad',        label: 'Administrativo',  Icon: FolderOpen      },
    { href: '/gestao/folha',        label: 'Folha Pagto.',    Icon: DollarSign      },
    { href: '/gestao/saude',        label: 'Saúde',           Icon: Stethoscope     },
    { href: '/gestao/educacao',     label: 'Educação',        Icon: GraduationCap   },
    { href: '/gestao/tributacao',   label: 'Tributação',      Icon: CircleDollarSign},
    { href: '/gestao/licitacoes',   label: 'Licitações',      Icon: Landmark        },
    { href: '/gestao/patrimonio',   label: 'Patrimônio',      Icon: Package         },
    { href: '/gestao/frota',        label: 'Frota',           Icon: Car             },
    { href: '/gestao/obras',        label: 'Obras',           Icon: HardHat         },
    { href: '/gestao/comunicacao/noticias', label: 'SECOM',   Icon: Newspaper       },
  ]},
]

const NAV_COMUNICACAO = [
  { grupo: 'Comunicação', items: [
    { href: '/admin/comunicacao',               label: 'Dashboard',       Icon: LayoutDashboard },
    { href: '/gestao/comunicacao/noticias',     label: 'Notícias',        Icon: Newspaper       },
    { href: '/gestao/comunicacao/agenda',       label: 'Agenda',          Icon: CalendarDays    },
    { href: '/gestao/comunicacao/midia',        label: 'Galeria de Mídia',Icon: Image           },
    { href: '/gestao/comunicacao/relatorios',   label: 'Relatórios',      Icon: BarChart2       },
  ]},
]

const NAV_OUVIDORIA = [
  { grupo: 'Ouvidoria', items: [
    { href: '/admin/ouvidoria',          label: 'Dashboard', Icon: LayoutDashboard },
    { href: '/admin/ouvidoria/demandas', label: 'Demandas',  Icon: Inbox           },
    { href: '/admin/ouvidoria/relatorios',label:'Relatórios',Icon: BarChart2       },
  ]},
]

const NAV_SECRETARIA: Record<string, typeof NAV_ADMIN> = {
  SEMSA: [{ grupo: 'Saúde', items: [
    { href: '/gestao/saude',              label: 'Painel SEMSA',   Icon: Stethoscope  },
    { href: '/gestao/saude/pacientes',    label: 'Pacientes',      Icon: Users        },
    { href: '/gestao/saude/agendamentos', label: 'Agendamentos',   Icon: CalendarDays },
    { href: '/gestao/saude/atendimentos', label: 'Atendimentos',   Icon: Heart        },
    { href: '/gestao/saude/vacinacao',    label: 'Vacinação',      Icon: Syringe      },
    { href: '/gestao/saude/farmacia',     label: 'Farmácia',       Icon: Pill         },
    { href: '/gestao/saude/estoque',      label: 'Estoque Med.',   Icon: Package      },
    { href: '/gestao/saude/vigilancia',   label: 'Vigilância',     Icon: Activity     },
    { href: '/gestao/saude/esf',          label: 'ESF / UBS',      Icon: Building2    },
    { href: '/gestao/saude/regulacao',    label: 'Regulação',      Icon: UserCheck    },
  ]}],
  SEDUC: [{ grupo: 'Educação', items: [
    { href: '/gestao/educacao',          label: 'Painel SEDUC',  Icon: GraduationCap     },
    { href: '/gestao/educacao/escolas',  label: 'Escolas',       Icon: School            },
    { href: '/gestao/educacao/alunos',   label: 'Alunos',        Icon: Users             },
    { href: '/gestao/educacao/turmas',   label: 'Turmas',        Icon: BookOpen          },
    { href: '/gestao/educacao/diario',   label: 'Diário',        Icon: FileText          },
    { href: '/gestao/educacao/merenda',  label: 'Merenda',       Icon: UtensilsCrossed   },
  ]}],
  SEFIN: [{ grupo: 'Financeiro', items: [
    { href: '/gestao/sefin',              label: 'Painel SEFIN',  Icon: Wallet           },
    { href: '/gestao/sefin/empenhos',     label: 'Empenhos',      Icon: FileText         },
    { href: '/gestao/sefin/receitas',     label: 'Receitas',      Icon: TrendingUp       },
    { href: '/gestao/sefin/pagamentos',   label: 'Pagamentos',    Icon: CircleDollarSign },
    { href: '/gestao/sefin/orcamento',    label: 'Orçamento',     Icon: BarChart2        },
    { href: '/gestao/sefin/fornecedores', label: 'Fornecedores',  Icon: Users            },
  ]}],
  SEMAD: [{ grupo: 'Administrativo', items: [
    { href: '/gestao/semad',              label: 'Painel SEMAD',   Icon: FolderOpen    },
    { href: '/gestao/semad/servidores',   label: 'Servidores',     Icon: Users         },
    { href: '/gestao/semad/cargos',       label: 'Cargos',         Icon: Briefcase     },
    { href: '/gestao/semad/ferias',       label: 'Férias',         Icon: CalendarDays  },
    { href: '/gestao/semad/frequencia',   label: 'Frequência',     Icon: ClipboardList },
    { href: '/gestao/semad/contrato',     label: 'Contratos RH',   Icon: FileText      },
    { href: '/gestao/folha',             label: 'Folha Pagamento', Icon: DollarSign    },
  ]}],
  TRIBUTACAO: [{ grupo: 'Tributação', items: [
    { href: '/gestao/tributacao',                 label: 'Painel Tributação', Icon: DollarSign  },
    { href: '/gestao/tributacao/contribuinte',    label: 'Contribuintes',     Icon: Users       },
    { href: '/gestao/tributacao/iptu',            label: 'IPTU',              Icon: FileText    },
    { href: '/gestao/tributacao/iss',             label: 'ISS',               Icon: FileText    },
    { href: '/gestao/tributacao/divida',          label: 'Dívida Ativa',      Icon: AlertCircle },
    { href: '/gestao/tributacao/contribuintes',   label: 'Gestão Débitos',    Icon: TrendingUp  },
  ]}],
  LICITACOES: [{ grupo: 'Licitações', items: [
    { href: '/gestao/licitacoes',              label: 'Painel Licitações', Icon: Landmark   },
    { href: '/gestao/licitacoes/licitacoes',   label: 'Licitações',        Icon: FileText   },
    { href: '/gestao/licitacoes/contratos',    label: 'Contratos',         Icon: CircleCheck},
    { href: '/gestao/licitacoes/processos',    label: 'Processos',         Icon: Inbox      },
  ]}],
  PATRIMONIO: [{ grupo: 'Patrimônio', items: [
    { href: '/gestao/patrimonio',           label: 'Painel Patrimônio', Icon: Package      },
    { href: '/gestao/patrimonio/bens',      label: 'Bens',              Icon: Package      },
    { href: '/gestao/patrimonio/inventario',label: 'Inventário',        Icon: ClipboardList},
  ]}],
  FROTA: [{ grupo: 'Frota', items: [
    { href: '/gestao/frota',           label: 'Painel Frota', Icon: Car       },
    { href: '/gestao/frota/veiculos',  label: 'Veículos',     Icon: Car       },
    { href: '/gestao/frota/operacoes', label: 'Operações',    Icon: Fuel      },
  ]}],
  OBRAS: [{ grupo: 'Obras', items: [
    { href: '/gestao/obras',           label: 'Painel Obras', Icon: HardHat   },
    { href: '/gestao/obras/obras',     label: 'Obras',        Icon: HardHat   },
    { href: '/gestao/obras/alvaras',   label: 'Alvarás',      Icon: FileText  },
    { href: '/gestao/obras/contratos', label: 'Contratos',    Icon: Briefcase },
  ]}],
  SEMMA: [{ grupo: 'Meio Ambiente',   items: [{ href: '/gestao/semma', label: 'Painel SEMMA', Icon: Leaf         }] }],
  SEMOB: [{ grupo: 'Obras',           items: [{ href: '/gestao/semob', label: 'Painel SEMOB', Icon: HardHat      }] }],
}

function navPorPerfil(perfil: string, secretaria?: string) {
  if (perfil === 'SUPER_ADMIN' || perfil === 'ADMIN_MUNICIPIO') return NAV_ADMIN
  if (perfil === 'GESTOR' && secretaria?.toUpperCase().includes('COMUNICACAO')) return NAV_COMUNICACAO
  if (perfil === 'VISUALIZADOR') return NAV_OUVIDORIA
  if (secretaria) return NAV_SECRETARIA[secretaria.toUpperCase()] ?? NAV_ADMIN
  return NAV_ADMIN
}

const PERFIL_LABEL: Record<string, string> = {
  SUPER_ADMIN:    'Super Admin',
  ADMIN_MUNICIPIO:'Administrador',
  GESTOR:         'Gestor',
  OPERADOR:       'Operador',
  VISUALIZADOR:   'Visualizador',
}

// ─── Shell principal ──────────────────────────────────────────────────────────

export default function AdminShell({ children }: { children: ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [usuario, setUsuario]       = useState<Usuario | null>(null)
  const [tema, setTema]             = useState<TemaConfig>({
    corPrimaria: '#1B5E20', corAcento: '#F9A825',
    nomePrefeitura: 'Biritinga', uf: 'BA',
  })
  const [sidebarOpen, setSidebar]   = useState(true)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(data => {
      if (!data?.usuario) { router.push('/login'); return }
      setUsuario(data.usuario)
      setCarregando(false)
    })
  }, [router])

  // Carregar tema do município e aplicar CSS vars
  useEffect(() => {
    fetch('/api/admin/tema').then(r => r.ok ? r.json() : null).then(data => {
      if (!data) return
      const t: TemaConfig = {
        corPrimaria:    data.corPrimaria    ?? '#1B5E20',
        corAcento:      data.corAcento      ?? '#F9A825',
        logoUrl:        data.logoUrl,
        brasaoUrl:      data.brasaoUrl,
        nomePrefeitura: data.nome           ?? 'Biritinga',
        uf:             data.uf             ?? 'BA',
      }
      setTema(t)
      aplicarTema(t)
    })
  }, [])

  async function sair() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (carregando) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'Inter,sans-serif', background:'var(--cor-bg)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:48, height:48, border:'3px solid #E0E0E0', borderTopColor:'var(--cor-primaria)', borderRadius:'50%', margin:'0 auto 16px', animation:'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color:'#999', fontSize:13 }}>Verificando acesso…</p>
      </div>
    </div>
  )

  if (!usuario) return null

  const nav = navPorPerfil(usuario.perfil, usuario.secretaria)

  return (
    <CtxUsuario.Provider value={{ usuario, sair }}>
      <div style={{ display:'flex', height:'100vh', fontFamily:'Inter,sans-serif', overflow:'hidden' }}>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside style={{
          width: sidebarOpen ? 248 : 60,
          background: 'var(--cor-primaria)',
          display:'flex', flexDirection:'column', flexShrink:0,
          transition:'width 0.22s ease', overflow:'hidden',
        }}>

          {/* Cabeçalho / brasão */}
          <div style={{
            padding: sidebarOpen ? '18px 16px 14px' : '18px 10px 14px',
            borderBottom:'1px solid var(--cor-sidebar-brd)',
            display:'flex', alignItems:'center', gap:10, minHeight:68,
          }}>
            {/* Brasão */}
            <div style={{
              width:36, height:36, borderRadius:8, flexShrink:0,
              background:'rgba(255,255,255,0.15)',
              display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden',
            }}>
              {tema.brasaoUrl || tema.logoUrl
                ? <img src={tema.brasaoUrl ?? tema.logoUrl} alt="Brasão" style={{ width:28, height:28, objectFit:'contain' }} />
                : <Landmark size={18} color="rgba(255,255,255,0.9)" strokeWidth={1.5} />
              }
            </div>

            {sidebarOpen && (
              <div style={{ overflow:'hidden', flex:1 }}>
                <div style={{ color:'rgba(255,255,255,0.6)', fontWeight:600, fontSize:10, letterSpacing:'0.5px', textTransform:'uppercase' }}>Prefeitura de</div>
                <div style={{ color:'var(--cor-acento)', fontWeight:800, fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {tema.nomePrefeitura}/{tema.uf}
                </div>
              </div>
            )}

            <button onClick={() => setSidebar(v => !v)} title={sidebarOpen ? 'Recolher' : 'Expandir'}
              style={{
                marginLeft:'auto', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)',
                borderRadius:6, color:'rgba(255,255,255,0.7)', cursor:'pointer',
                padding:4, display:'flex', alignItems:'center', flexShrink:0,
              }}>
              {sidebarOpen
                ? <ChevronLeft  size={15} strokeWidth={2} />
                : <ChevronRight size={15} strokeWidth={2} />}
            </button>
          </div>

          {/* Nav */}
          <nav style={{ flex:1, overflowY:'auto', padding:'10px 0' }}>
            {nav.map(grupo => (
              <div key={grupo.grupo}>
                {sidebarOpen && (
                  <div style={{ padding:'8px 16px 3px', fontSize:9, fontWeight:700, color:'var(--cor-sidebar-sub)', textTransform:'uppercase', letterSpacing:'0.9px' }}>
                    {grupo.grupo}
                  </div>
                )}
                {grupo.items.map(({ href, label, Icon }) => {
                  const ativo = pathname === href || (href !== '/admin' && pathname.startsWith(href))
                  return (
                    <a key={href} href={href}
                      title={!sidebarOpen ? label : undefined}
                      style={{
                        display:'flex', alignItems:'center', gap:10,
                        padding: sidebarOpen ? '9px 16px' : '10px 18px',
                        color: ativo ? 'var(--cor-acento)' : 'var(--cor-sidebar-txt)',
                        background: ativo ? 'var(--cor-ativo-bg)' : 'transparent',
                        textDecoration:'none', fontSize:13, fontWeight: ativo ? 600 : 400,
                        borderLeft: ativo ? '2px solid var(--cor-acento)' : '2px solid transparent',
                        transition:'background 0.12s',
                        whiteSpace:'nowrap', overflow:'hidden',
                      }}
                      onMouseOver={e => { if (!ativo) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                      onMouseOut={e => { if (!ativo) e.currentTarget.style.background = 'transparent' }}>
                      <Icon size={16} strokeWidth={ativo ? 2 : 1.5} style={{ flexShrink:0 }} />
                      {sidebarOpen && label}
                    </a>
                  )
                })}
              </div>
            ))}
          </nav>

          {/* Usuário + sair */}
          <div style={{
            padding: sidebarOpen ? '14px 16px' : '14px 10px',
            borderTop:'1px solid var(--cor-sidebar-brd)',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: sidebarOpen ? 10 : 0 }}>
              <div style={{
                width:34, height:34, borderRadius:'50%', background:'var(--cor-acento)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:14, fontWeight:700, color:'var(--cor-primaria)', flexShrink:0,
              }}>
                {usuario.nome.charAt(0).toUpperCase()}
              </div>
              {sidebarOpen && (
                <div style={{ overflow:'hidden', flex:1 }}>
                  <div style={{ color:'#fff', fontSize:12, fontWeight:600, whiteSpace:'nowrap', textOverflow:'ellipsis', overflow:'hidden' }}>
                    {usuario.nome}
                  </div>
                  <div style={{ color:'var(--cor-sidebar-sub)', fontSize:10 }}>
                    {PERFIL_LABEL[usuario.perfil] ?? usuario.perfil}
                  </div>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <button onClick={sair}
                style={{
                  width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)',
                  borderRadius:7, color:'rgba(255,255,255,0.65)', cursor:'pointer',
                  padding:'7px 0', fontSize:12, fontWeight:500,
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                }}>
                <LogOut size={13} strokeWidth={1.5} />
                Sair
              </button>
            )}
          </div>
        </aside>

        {/* ── Conteúdo ─────────────────────────────────────────────────────── */}
        <main style={{ flex:1, overflowY:'auto', background:'var(--cor-bg)' }}>
          {/* Topbar */}
          <div style={{
            background:'#fff', borderBottom:'1px solid #E8EAED',
            padding:'0 24px', height:52, display:'flex', alignItems:'center', justifyContent:'space-between',
            position:'sticky', top:0, zIndex:10,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:11, color:'#BDBDBD' }}>Portal</span>
              <span style={{ fontSize:11, color:'#BDBDBD' }}>›</span>
              <span style={{ fontSize:13, fontWeight:600, color:'#424242' }}>
                {pathname.split('/').filter(Boolean).slice(1).join(' › ').replace(/-/g, ' ') || 'Início'}
              </span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <a href={process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://biritinga.ba.gov.br'} target="_blank" rel="noopener noreferrer"
                style={{ fontSize:12, color:'var(--cor-primaria)', textDecoration:'none', display:'flex', alignItems:'center', gap:5, fontWeight:500 }}>
                <Globe size={13} strokeWidth={1.5} />
                Ver Portal
              </a>
              <div style={{
                background:'var(--cor-primaria-light)', color:'var(--cor-primaria-txt)',
                borderRadius:6, padding:'3px 10px', fontSize:11, fontWeight:600,
              }}>
                {PERFIL_LABEL[usuario.perfil] ?? usuario.perfil}
              </div>
            </div>
          </div>

          <div style={{ minHeight:'calc(100vh - 52px)' }}>
            {children}
          </div>
        </main>
      </div>
    </CtxUsuario.Provider>
  )
}
