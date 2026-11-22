'use client'

import { useState, useEffect } from 'react'
import { HardHat, Car, TrafficCone, MapPin, Wrench, Loader2 } from 'lucide-react'
import Link from 'next/link'

// ─── Painel SEMOB - Secretaria de Obras e Mobilidade Urbana ──────────────────
// Gestão de obras públicas, mobilidade, trânsito e pavimentação

export default function SemobPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats]     = useState({
    obrasAtivas:    0,
    obrasPlanejas:  0,
    obrasConcluidas:0,
    alvaras:        0,
    contratos:      0,
    medicoesPend:   0,
  })

  useEffect(() => {
    // Buscar resumo das obras do município
    fetch('/api/obras/obra')
      .then(r => r.json())
      .then(data => {
        const obras = data.obras ?? []
        setStats({
          obrasAtivas:     obras.filter((o: any) => o.situacao === 'EM_EXECUCAO').length,
          obrasPlanejas:   obras.filter((o: any) => ['PLANEJADA','LICITANDO','CONTRATADA'].includes(o.situacao)).length,
          obrasConcluidas: obras.filter((o: any) => o.situacao === 'CONCLUIDA').length,
          alvaras:         0,
          contratos:       0,
          medicoesPend:    0,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const atalhos = [
    { href: '/gestao/obras/obras',    label: 'Obras Públicas',  Icon: HardHat,    cor: 'bg-orange-50 border-orange-200 text-orange-700' },
    { href: '/gestao/obras/alvaras',  label: 'Alvarás',         Icon: MapPin,     cor: 'bg-blue-50   border-blue-200   text-blue-700'   },
    { href: '/gestao/obras/contratos',label: 'Contratos',       Icon: Wrench,     cor: 'bg-purple-50 border-purple-200 text-purple-700' },
    { href: '/gestao/frota/veiculos', label: 'Frota Municipal', Icon: Car,        cor: 'bg-teal-50   border-teal-200   text-teal-700'   },
  ]

  const kpis = [
    { label: 'Em Execução',   value: stats.obrasAtivas,     cor: 'text-green-700',  bg: 'bg-green-50  border-green-200'  },
    { label: 'Planejadas',    value: stats.obrasPlanejas,   cor: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
    { label: 'Concluídas',    value: stats.obrasConcluidas, cor: 'text-teal-700',   bg: 'bg-teal-50   border-teal-200'   },
    { label: 'Alvarás',       value: stats.alvaras,         cor: 'text-blue-700',   bg: 'bg-blue-50   border-blue-200'   },
    { label: 'Contratos',     value: stats.contratos,       cor: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
    { label: 'Medições Pend.',value: stats.medicoesPend,    cor: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin w-8 h-8 text-orange-600" />
    </div>
  )

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-orange-100 rounded-xl">
          <HardHat className="w-7 h-7 text-orange-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel SEMOB</h1>
          <p className="text-gray-500 mt-1">
            Secretaria de Obras e Mobilidade - obras públicas, pavimentação e trânsito urbano
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map(k => (
          <div key={k.label} className={`rounded-xl border p-4 ${k.bg}`}>
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.cor}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Atalhos */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Acesso Rápido</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {atalhos.map(({ href, label, Icon, cor }) => (
            <Link
              key={label}
              href={href}
              className={`flex flex-col items-center gap-3 p-5 rounded-xl border text-center hover:shadow-sm transition-shadow ${cor}`}
            >
              <Icon className="w-7 h-7" />
              <span className="text-sm font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Aviso de módulo */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 flex gap-4 items-start">
        <TrafficCone className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-orange-800">Módulo SEMOB em implantação</p>
          <p className="text-sm text-orange-700 mt-1">
            Os módulos de mobilidade urbana, gestão de trânsito, pavimentação e
            sinalização viária estão sendo configurados para Biritinga.
            Os dados de obras, alvarás e contratos já estão disponíveis nos módulos vinculados.
          </p>
        </div>
      </div>

      {/* Bases legais */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-3">Bases Legais</h2>
        <ul className="text-sm text-gray-600 space-y-1.5">
          <li>• <strong>Lei 14.133/2021</strong> - Licitações e Contratos Administrativos</li>
          <li>• <strong>Lei 9.503/97</strong> - Código de Trânsito Brasileiro (CTB)</li>
          <li>• <strong>Res. CONTRAN 996/2023</strong> - Sinalização viária</li>
          <li>• <strong>NBR 9050</strong> - Acessibilidade em obras públicas</li>
          <li>• <strong>Lei 10.098/2000</strong> - Acessibilidade para pessoas com deficiência</li>
        </ul>
      </div>
    </div>
  )
}
