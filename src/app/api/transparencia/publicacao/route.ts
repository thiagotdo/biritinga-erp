// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma, getConn } from '@/lib/db'
import { obterUsuario } from '@/lib/auth'
import { auditLog } from '@/lib/audit'

export const runtime = 'nodejs'

// ─── Portal da Transparência - Publicações ────────────────────────────────────
// LC 131/2009 - transparência fiscal em tempo real
// Lei 12.527/2011 - acesso à informação
// Decreto 7.185/2010 - prazo máximo de divulgação: até o 1º dia útil seguinte

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const relatorio    = searchParams.get('relatorio')
  const id           = searchParams.get('id')
  const tipo         = searchParams.get('tipo')
  const exercicio    = searchParams.get('exercicio')
  const busca        = searchParams.get('busca')
  const publico      = searchParams.get('publico')   // portal público, sem auth
  const municipioId  = searchParams.get('municipioId')

  // ── Portal público (sem autenticação) ───────────────────────────────────
  if (publico === '1' && municipioId) {
    const where: any = { municipioId, situacao: 'PUBLICADA' }
    if (tipo)      where.tipo     = tipo
    if (exercicio) where.exercicio = parseInt(exercicio)
    if (busca) {
      where.OR = [
        { titulo: { contains: busca } },
        { descricao: { contains: busca } },
        { tags: { contains: busca } },
      ]
    }
    const publicacoes = await prisma.PublicacaoTransparencia.findMany({
      where, orderBy: { publicadoEm: 'desc' }, take: 100,
      select: { id: true, tipo: true, titulo: true, descricao: true, periodo: true, exercicio: true,
        valorTotal: true, urlArquivo: true, nomeArquivo: true, publicadoEm: true },
    })
    return NextResponse.json({ publicacoes })
  }

  // ── Autenticado ──────────────────────────────────────────────────────────
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  if (relatorio === 'DASHBOARD') {
    const anoAtual = new Date().getFullYear()
    const conn = await getConn()
    try {
      const mid = usuario.municipioId

      const [countRows] = await conn.execute(
        `SELECT COUNT(*) as total FROM PublicacaoTransparencia WHERE municipioId = ? AND situacao = 'PUBLICADA'`,
        [mid]
      ) as any[]
      const totalPublic = Number((countRows as any[])[0]?.total ?? 0)

      const [porTipoRows] = await conn.execute(
        `SELECT tipo, COUNT(*) as total FROM PublicacaoTransparencia WHERE municipioId = ? GROUP BY tipo ORDER BY total DESC`,
        [mid]
      ) as any[]

      const [porExercicioRows] = await conn.execute(
        `SELECT exercicio, COUNT(*) as total FROM PublicacaoTransparencia WHERE municipioId = ? GROUP BY exercicio ORDER BY exercicio DESC`,
        [mid]
      ) as any[]

      const [recRows] = await conn.execute(
        `SELECT SUM(previsto) as previsto, SUM(arrecadado) as arrecadado FROM ReceitaOrcamentaria WHERE municipioId = ? AND exercicio = ?`,
        [mid, anoAtual]
      ) as any[]
      const rec = (recRows as any[])[0] || {}

      const [despRows] = await conn.execute(
        `SELECT SUM(orcado) as orcado, SUM(empenhado) as empenhado, SUM(liquidado) as liquidado, SUM(pago) as pago FROM DespesaOrcamentaria WHERE municipioId = ? AND exercicio = ?`,
        [mid, anoAtual]
      ) as any[]
      const desp = (despRows as any[])[0] || {}

      const [recMensalRows] = await conn.execute(
        `SELECT mes, competencia, SUM(arrecadado) as arrecadado FROM ReceitaOrcamentaria WHERE municipioId = ? AND exercicio = ? GROUP BY mes, competencia ORDER BY mes ASC`,
        [mid, anoAtual]
      ) as any[]

      const [despMensalRows] = await conn.execute(
        `SELECT mes, competencia, SUM(pago) as pago FROM DespesaOrcamentaria WHERE municipioId = ? AND exercicio = ? GROUP BY mes, competencia ORDER BY mes ASC`,
        [mid, anoAtual]
      ) as any[]

      return NextResponse.json({
        kpis: {
          totalPublic,
          receitaPrevista: Number(rec.previsto ?? 0),
          receitaArrecadada: Number(rec.arrecadado ?? 0),
          despesaOrcada: Number(desp.orcado ?? 0),
          despesaPaga: Number(desp.pago ?? 0),
        },
        porTipo: (porTipoRows as any[]).map((r: any) => ({ tipo: r.tipo, _count: { _all: Number(r.total) } })),
        porExercicio: (porExercicioRows as any[]).map((r: any) => ({ exercicio: r.exercicio, _count: { _all: Number(r.total) } })),
        recMensal: (recMensalRows as any[]).map((r: any) => ({ mes: r.mes, competencia: r.competencia, arrecadado: Number(r.arrecadado ?? 0) })),
        despMensal: (despMensalRows as any[]).map((r: any) => ({ mes: r.mes, competencia: r.competencia, pago: Number(r.pago ?? 0) })),
      })
    } finally {
      await conn.end()
    }
  }

  if (id) {
    const p = await prisma.PublicacaoTransparencia.findFirst({ where: { id, municipioId: usuario.municipioId } })
    if (!p) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
    return NextResponse.json({ publicacao: p })
  }

  const where: any = { municipioId: usuario.municipioId }
  if (tipo)      where.tipo     = tipo
  if (exercicio) where.exercicio = parseInt(exercicio)
  if (busca) where.OR = [
    { titulo: { contains: busca } },
    { tags:   { contains: busca } },
  ]

  const publicacoes = await prisma.PublicacaoTransparencia.findMany({
    where, orderBy: { publicadoEm: 'desc' }, take: 200,
  })
  return NextResponse.json({ publicacoes, total: publicacoes.length })
}

export async function POST(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const Schema = z.object({
    tipo: z.string(),
    titulo: z.string().min(5),
    descricao: z.string().optional(),
    periodo: z.string().optional(),
    exercicio: z.number().optional(),
    valorTotal: z.number().optional(),
    urlArquivo: z.string().optional(),
    nomeArquivo: z.string().optional(),
    tamanho: z.number().optional(),
    tags: z.string().optional(),
    situacao: z.string().default('PUBLICADA'),
  })
  const val = Schema.safeParse(await req.json())
  if (!val.success) return NextResponse.json({ erro: val.error.flatten() }, { status: 400 })
  const d = val.data

  const p = await prisma.PublicacaoTransparencia.create({
    data: {
      municipioId: usuario.municipioId,
      usuarioId: usuario.usuarioId,
      ...d,
      tipo: d.tipo as any,
      situacao: d.situacao as any,
    } as any,
  })

  await auditLog({
    municipioId: usuario.municipioId, usuarioId: usuario.usuarioId,
    acao: 'CREATE', modulo: 'misc', recurso: 'PublicacaoTransparencia', registroId: p.id,
    dadosNovos: { tipo: d.tipo, titulo: d.titulo },
  })

  return NextResponse.json({ publicacao: p }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const usuario = await obterUsuario(req)
  if (!usuario) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { id, acao, ...dados } = await req.json()
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 })

  const p = await prisma.PublicacaoTransparencia.findFirst({ where: { id, municipioId: usuario.municipioId } })
  if (!p) return NextResponse.json({ erro: 'Publicação não encontrada' }, { status: 404 })

  if (acao === 'RETIFICAR') {
    await prisma.PublicacaoTransparencia.update({ where: { id }, data: { situacao: 'RETIFICADA', ...dados } })
    return NextResponse.json({ sucesso: true })
  }

  if (acao === 'REVOGAR') {
    await prisma.PublicacaoTransparencia.update({ where: { id }, data: { situacao: 'REVOGADA' } })
    return NextResponse.json({ sucesso: true })
  }

  if (acao === 'REPUBLICAR') {
    await prisma.PublicacaoTransparencia.update({ where: { id }, data: { situacao: 'PUBLICADA', publicadoEm: new Date() } })
    return NextResponse.json({ sucesso: true })
  }

  return NextResponse.json({ erro: 'Ação não reconhecida' }, { status: 400 })
}
