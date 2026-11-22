'use client'
import { useState, useEffect } from 'react'
import {
  Globe, Newspaper, CalendarDays, Image, FileText, Mic,
  Eye, Edit, Plus, ExternalLink, RefreshCw, CheckCircle,
  Clock, AlertCircle, BarChart2, Settings, Users, MessageSquare,
  BookOpen, Landmark, ChevronRight, Layers, Bell,
} from 'lucide-react'

type PortalStats = {
  noticias:    { total: number; publicadas: number; rascunhos: number; revisao: number }
  eventos:     { total: number; proximos: number }
  midias:      { total: number; albums: number }
  diario:      { total: number; ultimoMes: number }
  ouvidoria:   { abertas: number; respondidas: number; prazo: number }
  esic:        { abertas: number; respondidas: number; prazo: number }
  ultimasPublicacoes: {
    id: string; tipo: string; titulo: string; status: string; criadoEm: string
  }[]
}

const STATUS_LABEL: Record<string, { label: string; cor: string; bg: string }> = {
  PUBLICADA: { label: 'Publicada', cor: '#059669', bg: '#D1FAE5' },
  RASCUNHO:  { label: 'Rascunho',  cor: '#6B7280', bg: '#F3F4F6' },
  REVISAO:   { label: 'Revisão',   cor: '#D97706', bg: '#FEF3C7' },
  ARQUIVADA: { label: 'Arquivada', cor: '#374151', bg: '#E5E7EB' },
}

const TIPO_LABEL: Record<string, string> = {
  noticia:  '📰 Notícia',
  evento:   '📅 Evento',
  galeria:  '🖼️ Galeria',
  diario:   '📋 Diário',
}

function KpiCard({ icon: Icon, label, value, sub, cor = '#1B5E20', href }: {
  icon: any; label: string; value: number | string; sub?: string; cor?: string; href?: string
}) {
  const inner = (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: cor }}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className="p-2 rounded-lg" style={{ background: `${cor}18` }}>
          <Icon size={20} style={{ color: cor }} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  )
  return href ? <a href={href} style={{ textDecoration: 'none' }}>{inner}</a> : inner
}

export default function PortalAdminPage() {
  const [stats, setStats] = useState<PortalStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Busca stats de comunicação + ouvidoria + ESIC em paralelo
    Promise.all([
      fetch('/api/comunicacao/dashboard').then(r => r.ok ? r.json() : null),
      fetch('/api/ouvidoria/stats').then(r => r.ok ? r.json() : null),
      fetch('/api/esic/stats').then(r => r.ok ? r.json() : null),
    ]).then(([com, ouv, esic]) => {
      setStats({
        noticias: {
          total:     com?.totalNoticias ?? 0,
          publicadas: com?.publicadas ?? 0,
          rascunhos:  com?.rascunhos ?? 0,
          revisao:    com?.emRevisao ?? 0,
        },
        eventos: {
          total:   com?.totalEventos ?? 0,
          proximos: com?.eventosProximos ?? 0,
        },
        midias: {
          total:  com?.totalMidias ?? 0,
          albums: com?.totalAlbums ?? 0,
        },
        diario:   { total: 0, ultimoMes: 0 },
        ouvidoria: {
          abertas:     ouv?.abertas ?? 0,
          respondidas: ouv?.respondidas ?? 0,
          prazo:       ouv?.prazo ?? 0,
        },
        esic: {
          abertas:     esic?.abertas ?? 0,
          respondidas: esic?.respondidas ?? 0,
          prazo:       esic?.prazo ?? 0,
        },
        ultimasPublicacoes: com?.ultimasNoticias?.slice(0, 5).map((n: any) => ({
          id: n.id, tipo: 'noticia', titulo: n.titulo, status: n.status, criadoEm: n.criadoEm,
        })) ?? [],
      })
    }).finally(() => setLoading(false))
  }, [])

  const portalUrl = 'https://biritinga.ba.gov.br'

  const acessosRapidos = [
    { href: '/gestao/comunicacao/noticias',        Icon: Newspaper,    label: 'Notícias',         desc: 'Publicar e editar' },
    { href: '/gestao/comunicacao/agenda',          Icon: CalendarDays, label: 'Agenda / Eventos',  desc: 'Programar eventos' },
    { href: '/gestao/comunicacao/midia',           Icon: Image,        label: 'Galeria de Mídia',  desc: 'Fotos e vídeos' },
    { href: '/admin/ouvidoria/demandas',           Icon: MessageSquare,label: 'Ouvidoria',         desc: 'Atender demandas' },
    { href: '/gestao/esic',                        Icon: BookOpen,     label: 'e-SIC',             desc: 'Lei de Acesso' },
    { href: '/gestao/transparencia',               Icon: BarChart2,    label: 'Transparência',     desc: 'Dados públicos' },
    { href: '/gestao/licitacoes',                  Icon: Landmark,     label: 'Licitações',        desc: 'Portal de compras' },
    { href: '/admin/configuracoes',                Icon: Settings,     label: 'Configurações',     desc: 'Aparência e dados' },
  ]

  const secoesMapeadas = [
    { secao: 'Início',        status: 'ativo',    href: portalUrl,                desc: 'Slide hero, serviços rápidos, mensagem do prefeito' },
    { secao: 'Notícias',      status: 'ativo',    href: `${portalUrl}/noticias`,  desc: 'Feed de publicações da SECOM' },
    { secao: 'Transparência', status: 'ativo',    href: `${portalUrl}/transparencia`, desc: 'Despesas, receitas, licitações' },
    { secao: 'Diário Oficial',status: 'ativo',    href: `${portalUrl}/diario-oficial`, desc: 'Publicações oficiais do município' },
    { secao: 'Ouvidoria',     status: 'ativo',    href: `${portalUrl}/ouvidoria`, desc: 'Reclamações, sugestões, denúncias' },
    { secao: 'e-SIC',         status: 'ativo',    href: `${portalUrl}/esic`,      desc: 'Pedidos de Acesso à Informação — LAI' },
    { secao: 'Agenda',        status: 'ativo',    href: `${portalUrl}/agenda`,    desc: 'Eventos públicos da prefeitura' },
    { secao: 'Contato',       status: 'ativo',    href: `${portalUrl}/contato`,   desc: 'Formulário de contato e endereços' },
    { secao: 'Galeria',       status: 'ativo',    href: `${portalUrl}/galeria`,   desc: 'Fotos e vídeos institucionais' },
    { secao: 'Concursos',     status: 'pendente', href: `${portalUrl}/concursos`, desc: 'Concursos públicos e processos seletivos' },
    { secao: 'Serviços Online',status: 'ativo',   href: `${portalUrl}/servicos`,  desc: '2ª via IPTU, certidões, agendamentos' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-7xl">

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <span>Administração</span><span>›</span><span>Portal Público</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Globe size={22} style={{ color: 'var(--cor-primaria)' }} strokeWidth={1.5} />
            Portal Público — biritinga.ba.gov.br
          </h1>
          <p className="text-sm text-gray-500">Gerencie o conteúdo e a presença digital da Prefeitura</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700"
          >
            <ExternalLink size={14} /> Ver Portal
          </a>
          <a
            href="/gestao/comunicacao/noticias"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm"
            style={{ background: 'var(--cor-primaria)' }}
          >
            <Plus size={15} /> Nova Publicação
          </a>
        </div>
      </div>

      {/* KPIs */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={Newspaper}     label="Total Publicações"  value={stats?.noticias.total ?? 0}      sub="no portal"             cor="#1B5E20"  href="/gestao/comunicacao/noticias" />
          <KpiCard icon={CheckCircle}   label="Publicadas"         value={stats?.noticias.publicadas ?? 0} sub="visíveis no portal"     cor="#059669"  href="/gestao/comunicacao/noticias?status=PUBLICADA" />
          <KpiCard icon={Clock}         label="Em Revisão"         value={stats?.noticias.revisao ?? 0}    sub="aguardando aprovação"   cor="#D97706"  href="/gestao/comunicacao/noticias?status=REVISAO" />
          <KpiCard icon={CalendarDays}  label="Próximos Eventos"   value={stats?.eventos.proximos ?? 0}    sub="na agenda pública"      cor="#1565C0"  href="/gestao/comunicacao/agenda" />
          <KpiCard icon={Image}         label="Arquivos de Mídia"  value={stats?.midias.total ?? 0}        sub="fotos e vídeos"         cor="#B45309"  href="/gestao/comunicacao/midia" />
          <KpiCard icon={MessageSquare} label="Ouvidoria — Abertas" value={stats?.ouvidoria.abertas ?? 0}  sub="aguardando resposta"    cor="#7C3AED"  href="/admin/ouvidoria/demandas" />
          <KpiCard icon={BookOpen}      label="e-SIC — Abertas"    value={stats?.esic.abertas ?? 0}        sub="pedidos de informação"  cor="#BE185D"  href="/gestao/esic" />
          <KpiCard icon={Users}         label="Álbuns de Galeria"  value={stats?.midias.albums ?? 0}       sub="galerias publicadas"    cor="#0369A1"  href="/gestao/comunicacao/midia" />
        </div>
      )}

      {/* Acesso rápido */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Acesso Rápido</h2>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          {acessosRapidos.map(({ href, Icon, label, desc }) => (
            <a
              key={href} href={href}
              className="flex flex-col items-start gap-1 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <Icon size={20} style={{ color: 'var(--cor-primaria)' }} strokeWidth={1.5} />
              <span className="text-sm font-medium text-gray-800">{label}</span>
              <span className="text-xs text-gray-400">{desc}</span>
            </a>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Últimas publicações */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Últimas Publicações</h2>
            <a href="/gestao/comunicacao/noticias" className="text-xs flex items-center gap-1 hover:underline" style={{ color: 'var(--cor-primaria)' }}>
              Ver todas <ChevronRight size={12} />
            </a>
          </div>
          {!stats?.ultimasPublicacoes.length ? (
            <div className="py-10 text-center text-gray-400 text-sm">Nenhuma publicação ainda</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {stats.ultimasPublicacoes.map(p => {
                const s = STATUS_LABEL[p.status] ?? STATUS_LABEL.RASCUNHO
                return (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.titulo}</p>
                      <p className="text-xs text-gray-400">{TIPO_LABEL[p.tipo] ?? p.tipo} · {new Date(p.criadoEm).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0" style={{ color: s.cor, background: s.bg }}>
                      {s.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Mapa do site / seções */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Layers size={16} className="text-gray-500" />
              Seções do Portal
            </h2>
            <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 hover:underline" style={{ color: 'var(--cor-primaria)' }}>
              Abrir <ExternalLink size={11} />
            </a>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {secoesMapeadas.map(s => (
              <div key={s.secao} className="flex items-center justify-between px-5 py-2.5 hover:bg-gray-50">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-sm font-medium text-gray-800">{s.secao}</p>
                  <p className="text-xs text-gray-400 truncate">{s.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === 'ativo' ? 'bg-green-500' : 'bg-amber-400'}`} />
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-gray-100">
                    <ExternalLink size={12} className="text-gray-400" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alertas e avisos */}
      {(stats?.ouvidoria.prazo ?? 0) > 0 || (stats?.esic.prazo ?? 0) > 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={16} className="text-amber-600" />
            <h3 className="font-semibold text-amber-800">Atenção necessária</h3>
          </div>
          <div className="space-y-2">
            {(stats?.ouvidoria.prazo ?? 0) > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-amber-700">
                  <strong>{stats!.ouvidoria.prazo}</strong> demanda(s) da Ouvidoria com prazo vencendo
                </p>
                <a href="/admin/ouvidoria/demandas" className="text-xs font-medium text-amber-800 hover:underline flex items-center gap-1">
                  Ver <ChevronRight size={12} />
                </a>
              </div>
            )}
            {(stats?.esic.prazo ?? 0) > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-amber-700">
                  <strong>{stats!.esic.prazo}</strong> pedido(s) e-SIC com prazo legal vencendo (LAI — 20 dias úteis)
                </p>
                <a href="/gestao/esic" className="text-xs font-medium text-amber-800 hover:underline flex items-center gap-1">
                  Ver <ChevronRight size={12} />
                </a>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Info do portal */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Globe size={15} className="text-gray-500" />
          Sobre o Portal
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Domínio</p>
            <p className="font-medium text-gray-700">biritinga.ba.gov.br</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Tecnologia</p>
            <p className="font-medium text-gray-700">Next.js 15 · Vercel</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Conformidade</p>
            <p className="font-medium text-gray-700">LGPD · LAI · LRF</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Responsável</p>
            <p className="font-medium text-gray-700">SECOM — Comunicação</p>
          </div>
        </div>
      </div>

    </div>
  )
}
