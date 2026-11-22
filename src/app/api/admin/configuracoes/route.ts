/**
 * GET  /api/admin/configuracoes - lê configurações do município
 * PATCH /api/admin/configuracoes - salva configurações (SUPER_ADMIN/ADMIN_MUNICIPIO)
 */
import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

export const runtime = 'nodejs'

function parseDbUrl(url: string) {
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
  if (!m) throw new Error('DATABASE_URL inválida')
  return { user:m[1], password:decodeURIComponent(m[2]), host:m[3], port:parseInt(m[4]), database:m[5].split('?')[0] }
}

function getConn() {
  const cfg = parseDbUrl(process.env.DATABASE_URL ?? '')
  return mysql.createConnection({ ...cfg, ssl:{ rejectUnauthorized:false } })
}

function perfisPermitidos(perfil?: string) {
  return perfil === 'SUPER_ADMIN' || perfil === 'ADMIN_MUNICIPIO'
}

// Garante que colunas novas existam (migration graceful)
async function garantirColunas(conn: mysql.Connection) {
  const cols = ['brasaoUrl VARCHAR(500)', 'favicon VARCHAR(500)', 'corSecundaria CHAR(7)', 'corAcento CHAR(7)']
  for (const col of cols) {
    const nome = col.split(' ')[0]
    try {
      await conn.execute(`ALTER TABLE Municipio ADD COLUMN ${col}`)
    } catch (e: any) {
      // 1060 = coluna já existe - ignorar
      if (e.errno !== 1060) console.warn('[config] ALTER COLUMN', nome, e.message)
    }
  }
}

export async function GET(req: NextRequest) {
  const perfil = req.headers.get('x-erp-perfil') ?? undefined
  if (!perfisPermitidos(perfil)) return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })

  let conn: mysql.Connection | null = null
  try {
    conn = await getConn()
    const [rows] = await conn.execute(
      `SELECT id, nome, uf, ibge, cnpj, slug, dominio, logoUrl, brasaoUrl, favicon,
              corPrimaria, corSecundaria, corAcento, plano, ativo
       FROM Municipio WHERE ativo = 1 LIMIT 1`
    ) as any
    if (!rows.length) return NextResponse.json({ erro: 'Município não encontrado' }, { status: 404 })
    return NextResponse.json(rows[0])
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  } finally {
    await conn?.end()
  }
}

export async function PATCH(req: NextRequest) {
  const perfil = req.headers.get('x-erp-perfil') ?? undefined
  if (!perfisPermitidos(perfil)) return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })

  let conn: mysql.Connection | null = null
  try {
    const body = await req.json()
    const {
      nome, uf, cnpj, dominio, logoUrl, brasaoUrl, favicon,
      corPrimaria, corSecundaria, corAcento, plano,
    } = body

    conn = await getConn()
    await garantirColunas(conn)

    // Buscar município atual
    const [rows] = await conn.execute('SELECT id FROM Municipio WHERE ativo = 1 LIMIT 1') as any
    if (!rows.length) return NextResponse.json({ erro: 'Município não encontrado' }, { status: 404 })
    const id = rows[0].id

    // Montar SET dinâmico apenas com campos enviados
    const campos: string[] = []
    const valores: any[]   = []

    if (nome         !== undefined) { campos.push('nome = ?');         valores.push(nome) }
    if (uf           !== undefined) { campos.push('uf = ?');           valores.push(uf) }
    if (cnpj         !== undefined) { campos.push('cnpj = ?');         valores.push(cnpj || null) }
    if (dominio      !== undefined) { campos.push('dominio = ?');      valores.push(dominio || null) }
    if (logoUrl      !== undefined) { campos.push('logoUrl = ?');      valores.push(logoUrl || null) }
    if (brasaoUrl    !== undefined) { campos.push('brasaoUrl = ?');    valores.push(brasaoUrl || null) }
    if (favicon      !== undefined) { campos.push('favicon = ?');      valores.push(favicon || null) }
    if (corPrimaria  !== undefined) { campos.push('corPrimaria = ?');  valores.push(corPrimaria || null) }
    if (corSecundaria!== undefined) { campos.push('corSecundaria = ?');valores.push(corSecundaria || null) }
    if (corAcento    !== undefined) { campos.push('corAcento = ?');    valores.push(corAcento || null) }
    if (plano        !== undefined) { campos.push('plano = ?');        valores.push(plano) }

    if (!campos.length) return NextResponse.json({ erro: 'Nada para salvar' }, { status: 400 })

    campos.push('updatedAt = NOW()')
    valores.push(id)

    await conn.execute(`UPDATE Municipio SET ${campos.join(', ')} WHERE id = ?`, valores)

    // Retornar estado atualizado
    const [upd] = await conn.execute(
      `SELECT id, nome, uf, ibge, cnpj, slug, dominio, logoUrl, brasaoUrl, favicon,
              corPrimaria, corSecundaria, corAcento, plano
       FROM Municipio WHERE id = ?`, [id]
    ) as any

    return NextResponse.json({ ok: true, municipio: upd[0] })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  } finally {
    await conn?.end()
  }
}
