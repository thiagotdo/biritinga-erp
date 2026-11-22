// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Transporte Escolar ───────────────────────────────────────────────────────
// Art. 136 CTB — aptidão para transporte escolar
// Resolução CONTRAN 912/2022

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const relatorio = searchParams.get('relatorio')
  const rota      = searchParams.get('rota')
  const municipioId = usuario.municipioId

  try {
    if (relatorio === 'DASHBOARD') {
      const hoje = new Date()
      const em30 = new Date(hoje.getTime() + 30 * 86400000)

      const [totalVeiculos, ativos, totalAlunos, inaptos, vencendo] = await Promise.all([
        db.VeiculoTransporte.count({ where: { municipioId } }),
        db.VeiculoTransporte.count({ where: { municipioId, ativo: true } }),
        db.TransporteAluno.count({ where: { municipioId } }),
        db.VeiculoTransporte.count({ where: { municipioId, ativo: true, aptoTransporte: false } }),
        db.$queryRaw`
          SELECT COUNT(*) as c FROM VeiculoTransporte
          WHERE municipioId = ${municipioId} AND ativo = 1
            AND (vencimentoCNH <= ${em30} OR vencimentoCRLV <= ${em30} OR vencimentoVistoria <= ${em30})`,
      ])

      const rotas = await db.$queryRaw`
        SELECT rota, COUNT(*) as veiculos,
               (SELECT COUNT(*) FROM TransporteAluno ta WHERE ta.municipioId = ${municipioId} AND ta.rota = v.rota) as alunos
        FROM VeiculoTransporte v
        WHERE v.municipioId = ${municipioId} AND v.ativo = 1 AND v.rota IS NOT NULL
        GROUP BY v.rota`

      return NextResponse.json({
        kpis: {
          totalVeiculos, ativos, totalAlunos,
          inaptos, vencendo: Number((vencendo as any[])[0]?.c ?? 0),
        },
        rotas,
      })
    }

    if (id) {
      const veiculo = await db.VeiculoTransporte.findFirst({ where: { id, municipioId } })
      if (!veiculo) return NextResponse.json({ erro: 'Veículo não encontrado' }, { status: 404 })
      const alunos = await db.$queryRaw`
        SELECT ta.*, a.nome AS alunoNome, a.dataNascimento, a.bairro, a.zona,
               e.nome AS escolaNome,
               (SELECT t.serie FROM Turma t JOIN Matricula m ON m.turmaId = t.id
                WHERE m.alunoId = ta.alunoId AND m.situacao = 'ATIVA'
                ORDER BY m.anoLetivo DESC LIMIT 1) AS serie
        FROM TransporteAluno ta
        JOIN Aluno a ON a.id = ta.alunoId
        LEFT JOIN Matricula m2 ON m2.alunoId = ta.alunoId AND m2.situacao = 'ATIVA'
        LEFT JOIN Turma t2 ON t2.id = m2.turmaId
        LEFT JOIN Escola e ON e.id = t2.escolaId
        WHERE ta.veiculoId = ${id}`
      return NextResponse.json({ veiculo, alunos })
    }

    const where: any = { municipioId }
    if (rota) where.rota = rota

    const veiculos = await db.VeiculoTransporte.findMany({
      where, orderBy: { rota: 'asc' },
    })
    const hoje = new Date()
    const enriched = veiculos.map((v: any) => {
      const diasCNH   = v.vencimentoCNH   ? Math.ceil((new Date(v.vencimentoCNH).getTime()   - hoje.getTime()) / 86400000) : null
      const diasCRLV  = v.vencimentoCRLV  ? Math.ceil((new Date(v.vencimentoCRLV).getTime()  - hoje.getTime()) / 86400000) : null
      const diasVistr = v.vencimentoVistoria ? Math.ceil((new Date(v.vencimentoVistoria).getTime() - hoje.getTime()) / 86400000) : null
      return { ...v, alertas: { cnh: diasCNH !== null && diasCNH <= 30, crlv: diasCRLV !== null && diasCRLV <= 30, vistoria: diasVistr !== null && diasVistr <= 30 } }
    })

    return NextResponse.json({ veiculos: enriched, total: enriched.length })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  try {
    const d = await req.json()
    const municipioId = usuario.municipioId

    if (d._recurso === 'aluno') {
      // Vincular aluno a veículo
      const vinculo = await db.TransporteAluno.create({
        data: {
          municipioId,
          veiculoId:    d.veiculoId,
          alunoId:      d.alunoId,
          rota:         d.rota,
          pontoEmbarque:d.pontoEmbarque,
        },
      })
      return NextResponse.json({ vinculo }, { status: 201 })
    }

    // Cadastrar novo veículo
    const veiculo = await db.VeiculoTransporte.create({
      data: {
        municipioId,
        placa:            d.placa,
        tipo:             d.tipo ?? 'MICRO_ONIBUS',
        marca:            d.marca,
        modelo:           d.modelo,
        anoFabricacao:    d.anoFabricacao ? Number(d.anoFabricacao) : undefined,
        capacidade:       Number(d.capacidade ?? 20),
        motorista:        d.motorista,
        monitorNome:      d.monitorNome,
        rota:             d.rota,
        kmRota:           d.kmRota ? Number(d.kmRota) : undefined,
        vencimentoCNH:    d.vencimentoCNH    ? new Date(d.vencimentoCNH)    : undefined,
        vencimentoCRLV:   d.vencimentoCRLV   ? new Date(d.vencimentoCRLV)   : undefined,
        vencimentoVistoria:d.vencimentoVistoria ? new Date(d.vencimentoVistoria) : undefined,
        aptoTransporte:   d.aptoTransporte ?? false,
      },
    })

    await auditLog({ municipioId, usuarioId: usuario.usuarioId, acao: 'CREATE',
      modulo: 'educacao', recurso: 'VeiculoTransporte', registroId: veiculo.id,
      dadosNovos: { placa: d.placa, rota: d.rota, capacidade: d.capacidade } })

    return NextResponse.json({ veiculo }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  try {
    const { id, acao, ...dados } = await req.json()
    if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

    const municipioId = usuario.municipioId

    if (acao === 'REMOVER_ALUNO') {
      await db.TransporteAluno.deleteMany({ where: { veiculoId: id, alunoId: dados.alunoId } })
      return NextResponse.json({ sucesso: true })
    }

    const updateData: any = {}
    const campos = ['placa','motorista','monitorNome','rota','kmRota','capacidade',
                    'vencimentoCNH','vencimentoCRLV','vencimentoVistoria','aptoTransporte','ativo']
    for (const c of campos) {
      if (dados[c] !== undefined) {
        if (['vencimentoCNH','vencimentoCRLV','vencimentoVistoria'].includes(c) && dados[c]) {
          updateData[c] = new Date(dados[c])
        } else {
          updateData[c] = dados[c]
        }
      }
    }

    const updated = await db.VeiculoTransporte.update({ where: { id }, data: updateData })

    await auditLog({ municipioId, usuarioId: usuario.usuarioId, acao: 'UPDATE',
      modulo: 'educacao', recurso: 'VeiculoTransporte', registroId: id,
      dadosNovos: updateData })

    return NextResponse.json({ sucesso: true, veiculo: updated })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
