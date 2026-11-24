// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { prisma, getConn } from '@/lib/db'
import { extrairContextoRequest, auditLog } from '@/lib/audit'
import { temPermissao } from '@/lib/auth/rbac'

const FornecedorSchema = z.object({
  nome:      z.string().min(3),
  cnpjCpf:   z.string().min(11).max(18),
  tipo:      z.enum(['FISICA', 'JURIDICA']).default('JURIDICA'),
  email:     z.string().email().optional(),
  telefone:  z.string().optional(),
  endereco:  z.string().optional(),
  banco:     z.string().optional(),
  agencia:   z.string().optional(),
  conta:     z.string().optional(),
})

// POST /api/sefin/despesas - cadastro de fornecedores
export async function POST(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'sefin:fornecedor:create')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const dados = FornecedorSchema.parse(body)

    // Tabela Fornecedor pode não existir em produção
    let existente: any = null
    try {
      existente = await prisma.Fornecedor.findFirst({
        where: { municipioId: ctx.municipioId, cnpjCpf: dados.cnpjCpf, ativo: true },
      })
    } catch { /* tabela não existe ainda */ }

    if (existente) {
      return NextResponse.json({ erro: 'Fornecedor com este CNPJ/CPF já cadastrado', fornecedorId: existente.id }, { status: 409 })
    }

    let fornecedor: any = null
    try {
      fornecedor = await prisma.Fornecedor.create({
        data: {
          id: randomUUID(),
          criadoEm: new Date(),
          atualizadoEm: new Date(),
          municipioId: ctx.municipioId,
          ...dados,
          tipo: dados.tipo,
        },
      })
    } catch {
      return NextResponse.json({ erro: 'Módulo de fornecedores não configurado. Tabela Fornecedor não existe no banco de dados.' }, { status: 503 })
    }

    await auditLog({
      municipioId: ctx.municipioId,
      usuarioId: ctx.usuarioId,
      acao: 'CREATE',
      modulo: 'sefin',
      recurso: 'fornecedor',
      registroId: fornecedor.id,
      dadosNovos: { nome: dados.nome, cnpjCpf: dados.cnpjCpf },
    })

    return NextResponse.json({ fornecedor }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ erro: 'Dados inválidos', detalhes: error.flatten() }, { status: 400 })
    }
    console.error('[FORNECEDOR]', error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// GET /api/sefin/despesas - lista fornecedores com totais de empenho
export async function GET(request: NextRequest) {
  const ctx = extrairContextoRequest(request.headers)

  if (!temPermissao({ ...ctx, perfil: ctx.perfil as any, permissoesExtras: ctx.permissoes }, 'sefin:fornecedor:read')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const busca    = searchParams.get('busca')
  const tipo     = searchParams.get('tipo')

  // Tabelas Fornecedor e Empenho podem não existir em produção — retorna vazio
  let dados: any[] = []
  const conn = await getConn()
  try {
    const params: any[] = [ctx.municipioId]
    let where = 'f.municipioId = ? AND f.ativo = 1'
    if (tipo)  { where += ' AND f.tipo = ?'; params.push(tipo) }
    if (busca) { where += ' AND (f.nome LIKE ? OR f.cnpjCpf LIKE ?)'; params.push(`%${busca}%`, `%${busca.replace(/\D/g, '')}%`) }

    const [fornRows] = await conn.execute(
      `SELECT f.id, f.nome, f.cnpjCpf, f.tipo, f.email, f.telefone,
              COUNT(e.id) as totalEmpenhos,
              SUM(CASE WHEN e.status != 'ANULADO' THEN COALESCE(e.valorPago, 0) ELSE 0 END) as totalPago,
              SUM(CASE WHEN e.status NOT IN ('ANULADO','PAGO') THEN COALESCE(e.valorOriginal, 0) ELSE 0 END) as totalEmpenhadoNaoPago
       FROM Fornecedor f
       LEFT JOIN Empenho e ON e.fornecedorId = f.id
       WHERE ${where}
       GROUP BY f.id, f.nome, f.cnpjCpf, f.tipo, f.email, f.telefone
       ORDER BY f.nome ASC LIMIT 200`,
      params
    ) as any[]

    dados = (fornRows as any[]).map(f => ({
      id: f.id,
      nome: f.nome,
      cnpjCpf: f.cnpjCpf,
      tipo: f.tipo,
      email: f.email,
      telefone: f.telefone,
      totalEmpenhos: Number(f.totalEmpenhos ?? 0),
      totalPago: Number(f.totalPago ?? 0),
      totalEmpenhadoNaoPago: Number(f.totalEmpenhadoNaoPago ?? 0),
    }))
  } catch { /* tabelas Fornecedor/Empenho não existem ainda — retorna lista vazia */ }
  finally {
    await conn.end()
  }

  return NextResponse.json({ dados, total: dados.length })
}
