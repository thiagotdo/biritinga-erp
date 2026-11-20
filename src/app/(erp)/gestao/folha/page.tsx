'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Users, FileText, ChevronRight, Loader2, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function FolhaDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const mesAtual = new Date().getMonth() + 1
  const anoAtual = new Date().getFullYear()
  const nomeMes = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  useEffect(() => {
    Promise.all([
      fetch(`/api/folha/relatorio?mes=${mesAtual}&ano=${anoAtual}`).then(r => r.json()),
      fetch(`/api/folha/competencia?ano=${anoAtual}`).then(r => r.json()),
    ]).then(([rel, comp]) => {
      setData({ relatorio: rel, competencias: comp.competencias ?? [] })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const fmtMoeda = (v: number) =>
    Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const atalhos = [
    { href: '/gestao/folha/competencias', label: 'Competências', Icon: FileText },
    { href: '/gestao/folha/holerites', label: 'Holerites', Icon: Users },
    { href: '/gestao/folha/rubricas', label: 'Rubricas', Icon: TrendingUp },
    { href: '/gestao/folha/relatorios', label: 'Relatórios', Icon: DollarSign },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
    </div>
  )

  const rel = data?.relatorio
  const folha = rel?.folha

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel Folha de Pagamento</h1>
        <p className="text-gray-500 mt-1 capitalize">{nomeMes}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center gap-2 mb-2 text-blue-700">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium">Servidores Ativos</span>
          </div>
          <div className="text-3xl font-bold text-blue-800">{(rel?.geral?.totalServidores ?? 0).toLocaleString('pt-BR')}</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <div className="flex items-center gap-2 mb-2 text-green-700">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium">Total Bruto (Estimado)</span>
          </div>
          <div className="text-xl font-bold text-green-800">{fmtMoeda(folha?.totalBruto ?? rel?.geral?.totalBruto ?? 0)}</div>
        </div>
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
          <div className="flex items-center gap-2 mb-2 text-purple-700">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Status da Folha</span>
          </div>
          <div className="text-sm font-bold text-purple-800">
            {folha ? (
              <span className={`px-3 py-1 rounded-full text-xs ${
                folha.status === 'FECHADA' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>{folha.status}</span>
            ) : <span className="text-gray-400">Não processada</span>}
          </div>
        </div>
      </div>

      {rel?.secretarias?.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Distribuição por Secretaria</h2>
          <div className="divide-y divide-gray-100">
            {rel.secretarias.map((s: any) => (
              <div key={s.secretaria} className="py-2 flex items-center justify-between text-sm">
                <div className="font-medium text-gray-800">{s.secretaria}</div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-500">{s.totalServidores} serv.</span>
                  <span className="font-medium text-gray-700">{fmtMoeda(s.totalBruto)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data?.competencias?.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Competências {anoAtual}</h2>
          <div className="divide-y divide-gray-100">
            {data.competencias.map((c: any) => (
              <div key={c.id} className="py-2 flex items-center justify-between text-sm">
                <div className="font-medium text-gray-800">
                  {String(c.mes).padStart(2,'0')}/{c.ano} · {c.tipo}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-600">{fmtMoeda(c.totalBruto)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    c.status === 'FECHADA' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>{c.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Acesso Rápido</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
