import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Depreciação Patrimonial ──────────────────────────────────────────────────
// NBC T 16.9 (CFC) — método linear (quotas constantes)
// MCASP — depreciação mensal = (valor - residual) / (vida útil em meses)
// Decreto 93.872/1986 — integra com inventário anual

// Calcula a depreciação mensal de um bem (método linear)
function calcDepMensal(valorAtual: number, valorResidual: number, vidaUtilAnos: number, taxaDepAnual: number): number {
  // Usa a taxa anual se informada; caso contrário, calcula pela vida útil
  const taxaMensal = taxaDepAnual > 0 ? taxaDepAnual / 12 : (1 / (vidaUtilAnos * 12))
  const base = valorAtual - valorResidual
  if (base <= 0) return 0  // valor residual já atingido
  const dep = base * taxaMensal
  return Math.min(dep, base)  // nunca deprecia abaixo do residual
}

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const relatorio  = searchParams.get('relatorio')
  const competencia = searchParams.get('competencia')   // "2026-11"
  const bemId      = searchParams.get('bemId')

  if (relatorio === 'PREVIEW') {
    // Prévia da depreciação a ser processada nesta competência
    const comp = competencia ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

    // Bens que ainda não foram depreciados nesta competência
    const jaProduzida = await prisma.depreciacaoRegistro.findMany({
      where: { municipioId: usuario.municipioId, competencia: comp },
      select: { bemId: true },
    })
    const idsJaFeitos = new Set(jaProduzida.map(d => d.bemId))

    const bens = await prisma.bemPatrimonial.findMany({
      where: {
        municipioId: usuario.municipioId,
        ativo: true,
        situacao: 'ATIVO',
        taxaDepAnual: { gt: 0 },
        NOT: { id: { in: [...idsJaFeitos] } },
      },
      select: {
        id: true, numeroPlaqueta: true, descricao: true, categoria: true,
        valorAtual: true, valorResidual: true, vidaUtilAnos: true, taxaDepAnual: true,
        secretaria: true,
      },
    })

    const preview = bens.map(b => {
      const dep = calcDepMensal(
        Number(b.valorAtual), Number(b.valorResidual),
        b.vidaUtilAnos ?? 10, Number(b.taxaDepAnual)
      )
      return { ...b, depMensal: dep.toFixed(2), valorApos: (Number(b.valorAtual) - dep).toFixed(2) }
    }).filter(b => Number(b.depMensal) > 0)

    const totalDep = preview.reduce((s, b) => s + Number(b.depMensal), 0)

    return NextResponse.json({ preview, competencia: comp, totalDep: totalDep.toFixed(2), qtdBens: preview.length })
  }

  if (bemId) {
    const registros = await prisma.depreciacaoRegistro.findMany({
      where: { bemId, municipioId: usuario.municipioId },
      orderBy: { competencia: 'desc' }, take: 24,
    })
    return NextResponse.json({ registros })
  }

  // Relatório de depreciação por competência
  const registros = await prisma.depreciacaoRegistro.findMany({
    where: {
      municipioId: usuario.municipioId,
      ...(competencia ? { competencia } : {}),
    },
    orderBy: { criadoEm: 'desc' }, take: 500,
  })

  const totalDep = registros.reduce((s, r) => s + Number(r.valorDepreciado), 0)

  return NextResponse.json({ registros, totalDep: totalDep.toFixed(2), total: registros.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  // Processa a depreciação mensal para a competência informada
  const { competencia } = await req.json()
  const comp = competencia ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

  // Verifica se já foi processada
  const jaExiste = await prisma.depreciacaoRegistro.findFirst({
    where: { municipioId: usuario.municipioId, competencia: comp },
  })
  if (jaExiste) {
    return NextResponse.json({ erro: `Depreciação de ${comp} já foi processada` }, { status: 409 })
  }

  const bens = await prisma.bemPatrimonial.findMany({
    where: {
      municipioId: usuario.municipioId,
      ativo: true,
      situacao: 'ATIVO',
      taxaDepAnual: { gt: 0 },
    },
  })

  let processados = 0
  let totalDepreciado = 0

  // Processa em lotes de 50 para não estourar a transação
  for (const bem of bens) {
    const dep = calcDepMensal(
      Number(bem.valorAtual), Number(bem.valorResidual),
      bem.vidaUtilAnos ?? 10, Number(bem.taxaDepAnual)
    )
    if (dep <= 0) continue

    const novoValor = Number(bem.valorAtual) - dep

    await prisma.$transaction(async (tx) => {
      await tx.depreciacaoRegistro.create({
        data: {
          municipioId: usuario.municipioId,
          bemId: bem.id,
          competencia: comp,
          valorDepreciado: dep,
          valorAnterior: bem.valorAtual,
          valorApos: novoValor,
          metodo: 'LINEAR',
          usuarioId: usuario.id,
        },
      })

      await tx.bemPatrimonial.update({
        where: { id: bem.id },
        data: {
          valorAtual:       novoValor,
          depAcumulada:     { increment: dep },
          ultimaDepreciacao: new Date(),
          // Se atingiu o residual, marca como totalmente depreciado
          ...(novoValor <= Number(bem.valorResidual) ? { situacao: 'DEPRECIADO_TOTAL' } : {}),
        },
      })
    })

    processados++
    totalDepreciado += dep
  }

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.id,
    acao: 'PROCESSAR_DEPRECIACAO', entidade: 'DepreciacaoRegistro', entidadeId: comp,
    detalhes: { competencia: comp, processados, totalDepreciado: totalDepreciado.toFixed(2) },
  })

  return NextResponse.json({
    sucesso: true,
    competencia: comp,
    processados,
    totalDepreciado: totalDepreciado.toFixed(2),
  }, { status: 201 })
}
