// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Agendamentos / Viagens de Frota ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id        = searchParams.get('id')
  const veiculoId = searchParams.get('veiculoId')
  const data      = searchParams.get('data')
  const relatorio = searchParams.get('relatorio')
  const municipioId = usuario.municipioId

  try {
    if (relatorio === 'DASHBOARD') {
      const hoje = new Date()
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const [totalMes, emAndamento, kmMes] = await Promise.all([
        db.$queryRaw`SELECT COUNT(*) as count FROM viagens WHERE municipioId = ${municipioId} AND dataSaida >= ${inicioMes}`,
        db.$queryRaw`SELECT COUNT(*) as count FROM viagens WHERE municipioId = ${municipioId} AND dataRetorno IS NULL AND dataSaida <= NOW()`,
        db.$queryRaw`SELECT COALESCE(SUM(kmRodados), 0) as total FROM viagens WHERE municipioId = ${municipioId} AND dataSaida >= ${inicioMes}`,
      ])
      return NextResponse.json({
        dashboard: {
          totalMes:    Number((totalMes as any[])[0]?.count ?? 0),
          emAndamento: Number((emAndamento as any[])[0]?.count ?? 0),
          kmMes:       Number((kmMes as any[])[0]?.total ?? 0),
        }
      })
    }

    if (id) {
      const viagem = await db.$queryRaw`
        SELECT v.*, ve.placa, ve.descricao AS veiculoDesc,
               m.nome AS motoristaNome
        FROM viagens v
        LEFT JOIN Veiculo ve ON ve.id = v.veiculoId
        LEFT JOIN Motorista m ON m.id = v.motoristaId
        WHERE v.id = ${id} AND v.municipioId = ${municipioId} LIMIT 1`
      return NextResponse.json({ agendamento: (viagem as any[])[0] ?? null })
    }

    if (veiculoId) {
      const rows = await db.$queryRaw`
        SELECT v.*, m.nome AS motoristaNome
        FROM viagens v LEFT JOIN Motorista m ON m.id = v.motoristaId
        WHERE v.municipioId = ${municipioId} AND v.veiculoId = ${veiculoId}
        ORDER BY v.dataSaida DESC LIMIT 20`
      return NextResponse.json({ agendamentos: rows })
    }

    if (data) {
      const rows = await db.$queryRaw`
        SELECT v.*, ve.placa, ve.descricao AS veiculoDesc, m.nome AS motoristaNome
        FROM viagens v
        LEFT JOIN Veiculo ve ON ve.id = v.veiculoId
        LEFT JOIN Motorista m ON m.id = v.motoristaId
        WHERE v.municipioId = ${municipioId} AND DATE(v.dataSaida) = ${data}
        ORDER BY v.dataSaida`
      return NextResponse.json({ agendamentos: rows })
    }

    // Próximas viagens + em andamento
    const rows = await db.$queryRaw`
      SELECT v.*, ve.placa, ve.descricao AS veiculoDesc, m.nome AS motoristaNome
      FROM viagens v
      LEFT JOIN Veiculo ve ON ve.id = v.veiculoId
      LEFT JOIN Motorista m ON m.id = v.motoristaId
      WHERE v.municipioId = ${municipioId}
      ORDER BY v.dataSaida DESC LIMIT 100`
    return NextResponse.json({ agendamentos: rows })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  try {
    const d = await req.json()
    if (!d.veiculoId || !d.destino || !d.finalidade || !d.dataSaida) {
      return NextResponse.json({ erro: 'veiculoId, destino, finalidade e dataSaida são obrigatórios' }, { status: 400 })
    }

    const municipioId = usuario.municipioId

    const viagem = await db.Viagem.create({
      data: {
        municipioId,
        veiculoId:      d.veiculoId,
        motoristaId:    d.motoristaId   || null,
        destino:        d.destino,
        finalidade:     d.finalidade,
        solicitanteNome:d.solicitante   || d.solicitanteNome || null,
        unidadeNome:    d.secretoriaSolic || d.unidadeNome   || null,
        dataSaida:      new Date(d.dataSaida),
        dataRetorno:    d.dataRetornoPrev ? new Date(d.dataRetornoPrev) : null,
        kmSaida:        Number(d.kmSaida ?? 0),
        observacoes:    d.observacoes   || null,
        usuarioId:      usuario.usuarioId,
      },
    })

    await auditLog({
      municipioId, usuarioId: usuario.usuarioId,
      acao: 'CREATE', modulo: 'frota', recurso: 'Viagem', registroId: viagem.id,
      dadosNovos: { veiculoId: d.veiculoId, destino: d.destino, dataSaida: d.dataSaida },
    })

    return NextResponse.json({ agendamento: viagem }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  try {
    const { id, acao, ...dados } = await req.json()
    if (!id || !acao) return NextResponse.json({ erro: 'id e acao obrigatórios' }, { status: 400 })

    const municipioId = usuario.municipioId
    const viagem = await db.Viagem.findFirst({ where: { id, municipioId } })
    if (!viagem) return NextResponse.json({ erro: 'Viagem não encontrada' }, { status: 404 })

    const updateData: any = {}
    let kmPercorrido: number | undefined

    if (acao === 'RETORNO') {
      if (!dados.kmRetorno) return NextResponse.json({ erro: 'kmRetorno obrigatório' }, { status: 400 })
      const kmFinal = Number(dados.kmRetorno)
      kmPercorrido  = kmFinal - Number(viagem.kmSaida ?? 0)
      updateData.dataRetorno = new Date()
      updateData.kmRetorno   = kmFinal
      updateData.kmRodados   = kmPercorrido
      if (dados.observacoes) updateData.observacoes = dados.observacoes
    } else if (acao === 'CANCELAR') {
      updateData.dataRetorno  = new Date()
      updateData.observacoes  = `[CANCELADO] ${dados.motivo ?? ''}`
    }

    await db.Viagem.update({ where: { id }, data: updateData })

    await auditLog({
      municipioId, usuarioId: usuario.usuarioId,
      acao: 'UPDATE', modulo: 'frota', recurso: 'Viagem', registroId: id,
      dadosNovos: { acao, kmPercorrido },
    })

    return NextResponse.json({ sucesso: true, kmPercorrido })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
