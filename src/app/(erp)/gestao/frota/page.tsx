'use client'

import { useState, useEffect } from 'react'
import { Car, Wrench, Fuel, MapPin, ChevronRight, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function FrotaDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/frota/veiculo').then(r => r.json()),
      fetch('/api/frota/manutencao').then(r => r.json()),
      fetch('/api/frota/abastecimento').then(r => r.json()),
    ]).then(([vei, man, abs]) => {
      const veiculos = vei.veiculos ?? []
      setData({
        totalVeiculos: veiculos.length,
        ativos: veiculos.filter((v: any) => v.status === 'ATIVO' || !v.status).length,
        emManutencao: veiculos.filter((v: any) => v.status === 'MANUTENCAO').length,
        veiculos: veiculos.slice(0, 6),
        manutencoes: man.manutencoes?.slice(0, 5) ?? [],
        abastecimentos: abs.abastecimentos?.slice(0, 5) ?? [],
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const atalhos = [
    { href: '/gestao/frota/veiculos', label: 'Veículos', Icon: Car },
    { href: '/gestao/frota/operacoes', label: 'Operações', Icon: MapPin },
  ]

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      ATIVO: 'bg-green-100 text-green-700',
      MANUTENCAO: 'bg-yellow-100 text-yellow-700',
      INATIVO: 'bg-gray-100 text-gray-600',
    }
    return map[s] ?? 'bg-gray-100 text-gray-600'
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
    </div>
  )

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel Frota</h1>
        <p className="text-gray-500 mt-1">Gestão de veículos, abastecimento e manutenções</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center gap-2 mb-2 text-blue-700">
            <Car className="w-4 h-4" />
            <span className="text-xs font-medium">Total de Veículos</span>
          </div>
          <div className="text-3xl font-bold text-blue-800">{data?.totalVeiculos ?? 0}</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <div className="flex items-center gap-2 mb-2 text-green-700">
            <MapPin className="w-4 h-4" />
            <span className="text-xs font-medium">Disponíveis</span>
          </div>
          <div className="text-3xl font-bold text-green-800">{data?.ativos ?? 0}</div>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
          <div className="flex items-center gap-2 mb-2 text-yellow-700">
            <Wrench className="w-4 h-4" />
            <span className="text-xs font-medium">Em Manutenção</span>
          </div>
          <div className="text-3xl font-bold text-yellow-800">{data?.emManutencao ?? 0}</div>
        </div>
      </div>

      {data?.veiculos?.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Veículos</h2>
          <div className="divide-y divide-gray-100">
            {data.veiculos.map((v: any) => (
              <div key={v.id} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium text-gray-800">{v.placa} — {v.descricao}</div>
                  <div className="text-gray-500 text-xs">{v.marca} {v.modelo} · {v.secretaria ?? 'Sem secretaria'}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(v.status ?? 'ATIVO')}`}>
                  {v.status ?? 'ATIVO'}
                </span>
              </div>
            ))}
          </div>
          <Link href="/gestao/frota/veiculos" className="text-xs text-blue-600 hover:underline mt-2 block">
            Ver todos →
          </Link>
        </div>
      )}

      {data?.manutencoes?.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Manutenções em Aberto</h2>
          <div className="divide-y divide-gray-100">
            {data.manutencoes.map((m: any) => (
              <div key={m.id} className="py-2 text-sm">
                <div className="font-medium text-gray-800">{m.placa} — {m.descricao}</div>
                <div className="text-gray-500 text-xs">{m.tipo} · {m.officina ?? 'Sem oficina'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Acesso Rápido</h2>
        <div className="grid grid-cols-2 gap-2">
          {atalhos.map(({ href, label, Icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700">
              <Icon className="w-4 h-4 text-blue-600" />
              {label}
              <ChevronRight className="w-3 h-3 ml-auto text-gray-400" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
