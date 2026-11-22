'use client'

import { useState, useEffect } from 'react'
import { Leaf, Droplets, TreePine, AlertTriangle, FileCheck, Loader2 } from 'lucide-react'
import Link from 'next/link'

// ─── Painel SEMMA — Secretaria de Meio Ambiente ───────────────────────────────
// Gestão ambiental municipal: licenças, fiscalização, arborização urbana,
// recursos hídricos e educação ambiental

export default function SemmaPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats]     = useState({
    licencas:      0,
    fiscalizacoes: 0,
    denuncias:     0,
    aprovadas:     0,
    pendentes:     0,
    indeferidas:   0,
  })

  useEffect(() => {
    // SEMMA ainda não tem API dedicada — exibir painel informativo
    // com atalhos para os módulos disponíveis
    setTimeout(() => setLoading(false), 300)
  }, [])

  const atalhos = [
    { href: '/gestao/semma', label: 'Licenças Ambientais', Icon: FileCheck,   cor: 'bg-green-50 border-green-200 text-green-700' },
    { href: '/gestao/semma', label: 'Fiscalização',        Icon: AlertTriangle, cor: 'bg-orange-50 border-orange-200 text-orange-700' },
    { href: '/gestao/semma', label: 'Arborização Urbana',  Icon: TreePine,    cor: 'bg-teal-50 border-teal-200 text-teal-700'   },
    { href: '/gestao/semma', label: 'Recursos Hídricos',   Icon: Droplets,    cor: 'bg-blue-50 border-blue-200 text-blue-700'   },
  ]

  const kpis = [
    { label: 'Licenças Emitidas',  value: stats.licencas,      cor: 'text-green-700',  bg: 'bg-green-50  border-green-200'  },
    { label: 'Aprovadas',          value: stats.aprovadas,     cor: 'text-teal-700',   bg: 'bg-teal-50   border-teal-200'   },
    { label: 'Pendentes',          value: stats.pendentes,     cor: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
    { label: 'Fiscalizações',      value: stats.fiscalizacoes, cor: 'text-blue-700',   bg: 'bg-blue-50   border-blue-200'   },
    { label: 'Denúncias Abertas',  value: stats.denuncias,     cor: 'text-red-700',    bg: 'bg-red-50    border-red-200'    },
    { label: 'Indeferidas',        value: stats.indeferidas,   cor: 'text-gray-700',   bg: 'bg-gray-50   border-gray-200'   },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin w-8 h-8 text-green-600" />
    </div>
  )

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-green-100 rounded-xl">
          <Leaf className="w-7 h-7 text-green-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel SEMMA</h1>
          <p className="text-gray-500 mt-1">
            Secretaria de Meio Ambiente — licenças, fiscalização e educação ambiental
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

      {/* Atalhos de módulos */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Módulos</h2>
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

      {/* Aviso de módulo em implantação */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex gap-4 items-start">
        <Leaf className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-green-800">Módulo SEMMA em implantação</p>
          <p className="text-sm text-green-700 mt-1">
            Os submódulos de licenciamento ambiental, fiscalização de posturas, arborização urbana
            e controle de recursos hídricos estão sendo configurados para Biritinga.
            Em breve os dados serão exibidos automaticamente neste painel.
          </p>
        </div>
      </div>

      {/* Obrigações legais */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-3">Bases Legais</h2>
        <ul className="text-sm text-gray-600 space-y-1.5">
          <li>• <strong>Lei 6.938/81</strong> — Política Nacional do Meio Ambiente</li>
          <li>• <strong>Res. CONAMA 237/97</strong> — Licenciamento ambiental</li>
          <li>• <strong>Lei 12.651/12</strong> — Código Florestal Brasileiro</li>
          <li>• <strong>Lei 9.433/97</strong> — Política Nacional de Recursos Hídricos</li>
          <li>• <strong>Lei 9.605/98</strong> — Lei de Crimes Ambientais</li>
          <li>• <strong>Lei 12.305/10</strong> — Política Nacional de Resíduos Sólidos</li>
        </ul>
      </div>
    </div>
  )
}
