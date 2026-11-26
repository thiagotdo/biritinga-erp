// @ts-nocheck
/**
 * GET   /api/sedhur/candidato  — lista candidatos habitação
 * POST  /api/sedhur/candidato  — cadastra candidato
 * PATCH /api/sedhur/candidato  — atualiza status/pontuação
 *
 * Tabela: CandidatoHabitacao
 * Schema: id, municipioId, protocolo, nome, cpf, dataNascimento, telefone,
 *         email, bairro, renda, composicaoFamiliar, programa, situacaoMoradia,
 *         status, pontuacao, observacoes, dataInscricao, criadoEm, atualizadoEm
 */
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import { extrairContextoRequest } from '@/lib/rbac'

export const runtime = 'nodejs'

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  }
}
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() })
}

export async function GET(req: NextRequest) {
  try {
    const mun = await prisma.Municipio.findFirst({ where: { ativo: true } })
    if (!mun) return NextResponse.json({ erro: 'Município não encontrado' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const id       = searchParams.get('id')
    const status   = searchParams.get('status')  ?? 'TODOS'
    const programa = searchParams.get('programa') ?? 'TODOS'
    const busca    = searchParams.get('busca')    ?? ''
    const pagina   = Number(searchParams.get('pagina')    ?? 1)
    const porPagina = Number(searchParams.get('porPagina') ?? 20)
    const offset   = (pagina - 1) * porPagina

    if (id) {
      const rows = await prisma.$queryRaw`
        SELECT * FROM CandidatoHabitacao
        WHERE id = ${id} AND municipioId = ${mun.id} LIMIT 1` as any[]
      if (!rows.length) return NextResponse.json({ erro: 'Candidato não encontrado' }, { status: 404 })
      return NextResponse.json({ candidato: rows[0] }, { headers: cors() })
    }

    const buscaLike = busca ? `%${busca}%` : null

    const rows = await prisma.$queryRaw`
      SELECT id, protocolo, nome, cpf, telefone, bairro, renda,
             programa, situacaoMoradia, status, pontuacao, dataInscricao, criadoEm
      FROM CandidatoHabitacao
      WHERE municipioId = ${mun.id}
        ${status !== 'TODOS' ? prisma.$queryRaw`AND status = ${status}` : prisma.$queryRaw``}
        ${programa !== 'TODOS' ? prisma.$queryRaw`AND programa = ${programa}` : prisma.$queryRaw``}
        ${buscaLike ? prisma.$queryRaw`AND (nome LIKE ${buscaLike} OR cpf LIKE ${buscaLike} OR protocolo LIKE ${buscaLike})` : prisma.$queryRaw``}
      ORDER BY pontuacao DESC, dataInscricao ASC
      LIMIT ${porPagina} OFFSET ${offset}` as any[]

    const [{ total }] = await prisma.$queryRaw`
      SELECT COUNT(*) AS total FROM CandidatoHabitacao
      WHERE municipioId = ${mun.id}
        ${status !== 'TODOS' ? prisma.$queryRaw`AND status = ${status}` : prisma.$queryRaw``}
        ${programa !== 'TODOS' ? prisma.$queryRaw`AND programa = ${programa}` : prisma.$queryRaw``}` as any[]

    const porStatus = await prisma.$queryRaw`
      SELECT status, COUNT(*) AS qtd FROM CandidatoHabitacao
      WHERE municipioId = ${mun.id} GROUP BY status` as any[]

    const porPrograma = await prisma.$queryRaw`
      SELECT programa, COUNT(*) AS qtd FROM CandidatoHabitacao
      WHERE municipioId = ${mun.id} GROUP BY programa ORDER BY qtd DESC` as any[]

    return NextResponse.json({
      candidatos: rows,
      total: Number(total),
      pagina,
      porPagina,
      porStatus,
      porPrograma,
    }, { headers: cors() })

  } catch (e: any) {
    console.error('[GET /api/sedhur/candidato]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    if (!ctx.municipioId) return NextResponse.json({ erro: 'Sem autenticação' }, { status: 401 })

    const mun = await prisma.Municipio.findFirst({ where: { ativo: true } })
    if (!mun) return NextResponse.json({ erro: 'Município não encontrado' }, { status: 404 })

    const body = await req.json()
    const { nome, cpf, dataNascimento, telefone, email, bairro, renda,
            composicaoFamiliar, programa, situacaoMoradia, pontuacao } = body
    if (!nome || !cpf || !programa) {
      return NextResponse.json({ erro: 'Nome, CPF e programa são obrigatórios' }, { status: 400 })
    }

    const ano = new Date().getFullYear()
    const [{ seq }] = await prisma.$queryRaw`
      SELECT COUNT(*) + 1 AS seq FROM CandidatoHabitacao
      WHERE municipioId = ${mun.id} AND YEAR(criadoEm) = ${ano}` as any[]
    const protocolo = `HAB-${ano}/${String(Number(seq)).padStart(4, '0')}`
    const id = randomUUID()

    await prisma.$queryRaw`
      INSERT INTO CandidatoHabitacao
        (id, municipioId, protocolo, nome, cpf, dataNascimento, telefone, email,
         bairro, renda, composicaoFamiliar, programa, situacaoMoradia,
         status, pontuacao, dataInscricao, criadoEm, atualizadoEm)
      VALUES
        (${id}, ${mun.id}, ${protocolo}, ${nome}, ${cpf},
         ${dataNascimento ?? null}, ${telefone ?? null}, ${email ?? null},
         ${bairro ?? null}, ${renda ?? null}, ${composicaoFamiliar ?? null},
         ${programa}, ${situacaoMoradia ?? 'ALUGUEL'},
         'INSCRITO', ${pontuacao ?? 0}, CURDATE(), NOW(), NOW())`

    return NextResponse.json({ id, protocolo, mensagem: 'Candidato inscrito com sucesso.' }, { status: 201, headers: cors() })

  } catch (e: any) {
    console.error('[POST /api/sedhur/candidato]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = extrairContextoRequest(req.headers)
    if (!ctx.municipioId) return NextResponse.json({ erro: 'Sem autenticação' }, { status: 401 })

    const mun = await prisma.Municipio.findFirst({ where: { ativo: true } })
    const body = await req.json()
    const { id, status, pontuacao, observacoes } = body
    if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 })

    await prisma.$queryRaw`
      UPDATE CandidatoHabitacao SET
        status       = COALESCE(${status ?? null}, status),
        pontuacao    = COALESCE(${pontuacao ?? null}, pontuacao),
        observacoes  = COALESCE(${observacoes ?? null}, observacoes),
        atualizadoEm = NOW()
      WHERE id = ${id} AND municipioId = ${mun?.id ?? ctx.municipioId}`

    return NextResponse.json({ ok: true }, { headers: cors() })

  } catch (e: any) {
    console.error('[PATCH /api/sedhur/candidato]', e)
    return NextResponse.json({ erro: e.message }, { status: 500, headers: cors() })
  }
}
