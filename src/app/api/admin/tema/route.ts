/**
 * GET /api/admin/tema - retorna configurações visuais do município
 * Rota pública (sem auth) pois é necessária antes do carregamento do shell.
 */
import { NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

export const runtime = 'nodejs'

function parseDbUrl(url: string) {
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
  if (!m) throw new Error('DATABASE_URL inválida')
  return { user:m[1], password:decodeURIComponent(m[2]), host:m[3], port:parseInt(m[4]), database:m[5].split('?')[0] }
}

export async function GET() {
  let conn: mysql.Connection | null = null
  try {
    const cfg = parseDbUrl(process.env.DATABASE_URL ?? '')
    conn = await mysql.createConnection({ ...cfg, ssl:{ rejectUnauthorized:false } })

    const [rows] = await conn.execute(
      `SELECT nome, uf, corPrimaria, corAcento, corSecundaria, logoUrl, brasaoUrl, favicon
       FROM Municipio WHERE ativo = 1 LIMIT 1`
    ) as any

    if (!rows.length) return NextResponse.json({ corPrimaria:'#1B5E20', corAcento:'#F9A825', nome:'Biritinga', uf:'BA' })

    const m = rows[0]
    return NextResponse.json({
      nome:        m.nome        ?? 'Biritinga',
      uf:          m.uf          ?? 'BA',
      corPrimaria: m.corPrimaria ?? '#1B5E20',
      corAcento:   m.corAcento   ?? '#F9A825',
      corSecundaria: m.corSecundaria ?? null,
      logoUrl:     m.logoUrl     ?? null,
      brasaoUrl:   m.brasaoUrl   ?? null,
      favicon:     m.favicon     ?? null,
    })
  } catch {
    return NextResponse.json({ corPrimaria:'#1B5E20', corAcento:'#F9A825', nome:'Biritinga', uf:'BA' })
  } finally {
    await conn?.end()
  }
}
