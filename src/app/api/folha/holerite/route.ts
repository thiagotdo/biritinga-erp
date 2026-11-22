// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Holerites / Contracheques ────────────────────────────────────────────────
// LC 101/2000 Art. 19 - Limite de gastos com pessoal

export async function GET(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id            = searchParams.get('id')
  const competenciaId = searchParams.get('competenciaId')
  const servidorId    = searchParams.get('servidorId')
  const municipioId   = usuario.municipioId

  try {
    if (id) {
      const hol = await db.FolhaHolerite.findFirst({ where: { id, municipioId } })
      if (!hol) return NextResponse.json({ erro: 'Holerite não encontrado' }, { status: 404 })
      const itens = await db.$queryRaw`
        SELECT hi.*, r.codigo, r.descricao AS rubricaDescricao
        FROM folha_holerite_item hi
        LEFT JOIN FolhaRubrica r ON r.id = hi.rubricaId
        WHERE hi.holeriteId = ${id}
        ORDER BY r.tipo, r.codigo`
      return NextResponse.json({ holerite: hol, itens })
    }

    if (competenciaId) {
      const holerites = await db.$queryRaw`
        SELECT h.*
        FROM folha_holerite h
        WHERE h.municipioId = ${municipioId} AND h.competenciaId = ${competenciaId}
        ORDER BY h.nomeServidor`
      return NextResponse.json({ holerites })
    }

    if (servidorId) {
      const holerites = await db.FolhaHolerite.findMany({
        where: { municipioId, servidorId },
        orderBy: { criadoEm: 'desc' },
        take: 24,
      })
      return NextResponse.json({ holerites })
    }

    return NextResponse.json({ erro: 'Informe competenciaId, servidorId ou id' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  try {
    const d = await req.json()
    if (!d.competenciaId || !d.servidorId) {
      return NextResponse.json({ erro: 'competenciaId e servidorId são obrigatórios' }, { status: 400 })
    }

    const municipioId = usuario.municipioId

    // Verificar se já existe holerite para esta competência/servidor
    const existente = await db.FolhaHolerite.findFirst({
      where: { municipioId, competenciaId: d.competenciaId, servidorId: d.servidorId },
    })
    if (existente) {
      return NextResponse.json({ erro: 'Já existe holerite para este servidor nesta competência', id: existente.id }, { status: 409 })
    }

    // Buscar dados do servidor para desnormalização
    const servidor = await db.$queryRaw`
      SELECT s.*, c.nome AS cargoNome, l.secretaria AS lotacao
      FROM Servidor s
      LEFT JOIN Cargo c ON c.id = s.cargoId
      LEFT JOIN Lotacao l ON l.servidorId = s.id AND l.municipioId = ${municipioId} AND l.ativo = 1
      WHERE s.id = ${d.servidorId} AND s.municipioId = ${municipioId}
      LIMIT 1` as any[]

    if (!servidor.length) {
      return NextResponse.json({ erro: 'Servidor não encontrado' }, { status: 404 })
    }
    const srv = servidor[0]

    // Buscar rubricas fixas da competência (vencimento base do cargo)
    const rubricas = await db.$queryRaw`
      SELECT r.* FROM FolhaRubrica r
      WHERE r.municipioId = ${municipioId} AND r.ativo = 1
      ORDER BY r.tipo, r.codigo` as any[]

    // Calcular valores básicos
    const vencimentoBase = Number(srv.salarioBase ?? srv.vencimentoBase ?? 0)
    const totalProventos = vencimentoBase // simplificado - sistema real teria lógica de cálculo
    const percInss = 0.14
    const descInss = totalProventos * percInss
    const totalDescontos = descInss
    const totalLiquido   = totalProventos - totalDescontos

    const holerite = await db.FolhaHolerite.create({
      data: {
        municipioId,
        competenciaId:   d.competenciaId,
        servidorId:      d.servidorId,
        matricula:       srv.matricula ?? '',
        nomeServidor:    srv.nome,
        cargo:           srv.cargoNome ?? srv.cargo,
        lotacao:         srv.lotacao,
        regimeJuridico:  srv.regimeJuridico ?? 'ESTATUTARIO',
        totalProventos:  totalProventos,
        totalDescontos:  totalDescontos,
        totalLiquido:    totalLiquido,
        baseInss:        totalProventos,
        baseIrpf:        totalProventos - descInss,
        diasTrabalhados: d.diasTrabalhados ?? 30,
        diasFaltas:      d.diasFaltas     ?? 0,
        status:          'CALCULADO',
      },
    })

    await auditLog({
      municipioId, usuarioId: usuario.usuarioId,
      acao: 'CREATE', modulo: 'folha', recurso: 'FolhaHolerite', registroId: holerite.id,
      dadosNovos: { competenciaId: d.competenciaId, servidorId: d.servidorId, totalLiquido },
    })

    return NextResponse.json({ holerite }, { status: 201 })
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
    const hol = await db.FolhaHolerite.findFirst({ where: { id, municipioId } })
    if (!hol) return NextResponse.json({ erro: 'Holerite não encontrado' }, { status: 404 })

    const updateData: any = {}

    if (acao === 'CONFIRMAR') {
      if (hol.status !== 'CALCULADO') {
        return NextResponse.json({ erro: 'Apenas holerites calculados podem ser confirmados' }, { status: 409 })
      }
      updateData.status = 'CONFIRMADO'
    } else if (acao === 'ESTORNAR') {
      if (!['CALCULADO', 'CONFIRMADO'].includes(hol.status)) {
        return NextResponse.json({ erro: 'Holerite não pode ser estornado neste status' }, { status: 409 })
      }
      updateData.status = 'ESTORNADO'
      updateData.observacao = dados.motivo ?? 'Estornado'
    }

    const updated = await db.FolhaHolerite.update({ where: { id }, data: updateData })

    await auditLog({
      municipioId, usuarioId: usuario.usuarioId,
      acao: 'UPDATE', modulo: 'folha', recurso: 'FolhaHolerite', registroId: id,
      dadosNovos: { acao, status: updateData.status },
    })

    return NextResponse.json({ sucesso: true, holerite: updated })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
