'use client'
import { useState } from 'react'
import { BarChart2, Download, FileText } from 'lucide-react'

// ─── Relatórios da Ouvidoria ──────────────────────────────────────────────────

const RELATORIOS = [
  {
    id: 'mensal',
    titulo: 'Relatório Mensal de Manifestações',
    desc: 'Total por tipo, situação, tempo médio de resposta e índice de satisfação.',
    icon: '📊',
  },
  {
    id: 'lai',
    titulo: 'Relatório LAI — Lei de Acesso à Informação',
    desc: 'Pedidos de informação recebidos, respondidos, prorrogados e indeferidos. Exigido pela CGU.',
    icon: '📋',
  },
  {
    id: 'satisfacao',
    titulo: 'Relatório de Satisfação do Cidadão',
    desc: 'Avaliações registradas, nota média e distribuição por secretaria.',
    icon: '⭐',
  },
  {
    id: 'prazo',
    titulo: 'Relatório de Cumprimento de Prazos',
    desc: 'Atendimentos dentro do prazo, prorrogados e vencidos por secretaria.',
    icon: '⏱️',
  },
  {
    id: 'secretaria',
    titulo: 'Relatório por Secretaria',
    desc: 'Demandas atribuídas, pendentes e concluídas por secretaria responsável.',
    icon: '🏛️',
  },
]

export default function OuvidoriaRelatoriosPage() {
  const [ano, setAno]   = useState(new Date().getFullYear())
  const [mes, setMes]   = useState(new Date().getMonth() + 1)
  const [gerado, setGerado] = useState<string | null>(null)

  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
  const meses = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
  ]

  const gerar = (id: string) => {
    // Futuramente: chamar API de geração de relatório PDF
    setGerado(id)
    setTimeout(() => setGerado(null), 2000)
  }

  return (
<>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios — Ouvidoria</h1>
          <p className="text-sm text-gray-500 mt-1">Relatórios obrigatórios e gerenciais da Ouvidoria Municipal</p>
        </div>

        {/* Filtro de período */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Período do Relatório</h2>
          <div className="flex gap-4">
            <select
              className="border border-gray-300 rounded px-3 py-2 text-sm"
              value={mes}
              onChange={e => setMes(Number(e.target.value))}
            >
              {meses.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              className="border border-gray-300 rounded px-3 py-2 text-sm"
              value={ano}
              onChange={e => setAno(Number(e.target.value))}
            >
              {anos.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {/* Lista de relatórios */}
        <div className="space-y-3">
          {RELATORIOS.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <span className="text-2xl">{r.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900">{r.titulo}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{r.desc}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Período: {meses[mes - 1]} de {ano}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => gerar(r.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    gerado === r.id
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {gerado === r.id ? (
                    <><FileText className="w-4 h-4" /> Gerado!</>
                  ) : (
                    <><BarChart2 className="w-4 h-4" /> Gerar</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Aviso CGU */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 text-sm text-purple-800">
          <p className="font-semibold mb-1">📌 Obrigação — Relatório LAI (Art. 30, Lei 12.527/2011)</p>
          <p>
            O Poder Executivo Municipal deve publicar relatório estatístico anual contendo o número
            de pedidos de acesso, decisões, recursos e reclamações referentes ao acesso à informação.
            Prazo: até 28 de fevereiro do ano seguinte.
          </p>
        </div>
      </div>
</>
  )
}
