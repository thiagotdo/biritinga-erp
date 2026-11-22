// ─── Audit Log - registro imutável de operações ───────────────────────────────
// auditLog() é fire-and-forget: nunca lança exceção (silent fail)
// Chame após toda operação CREATE/UPDATE/DELETE em dados sensíveis

import { db } from '@/lib/db'
import type { ContextoRequest } from '@/types'

interface AuditParams {
  municipioId:  string
  usuarioId?:   string
  acao:         'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'VIEW'
  modulo:       string
  recurso:      string
  registroId?:  string
  dadosAntigos?: Record<string, unknown>
  dadosNovos?:  Record<string, unknown>
  ip?:          string
  userAgent?:   string
}

// ─── Registrar entrada de audit ───────────────────────────────────────────────

export async function auditLog(params: AuditParams): Promise<void> {
  try {
    await db.AuditLog.create({
      data: {
        municipioId:  params.municipioId,
        usuarioId:    params.usuarioId,
        acao:         params.acao,
        modulo:       params.modulo,
        recurso:      params.recurso,
        registroId:   params.registroId,
        dadosAntigos: params.dadosAntigos ? JSON.stringify(params.dadosAntigos) : undefined,
        dadosNovos:   params.dadosNovos   ? JSON.stringify(params.dadosNovos)   : undefined,
        ip:           params.ip,
        userAgent:    params.userAgent,
      },
    })
  } catch (err) {
    // Nunca quebrar o fluxo principal por falha de audit
    console.error('[AUDIT] falha ao registrar:', err)
  }
}

// ─── Helper para extrair contexto dos headers (re-exportado aqui por conveniência) ─

export { extrairContextoRequest } from '@/lib/rbac'

// ─── Helper para audit em batch (ex: importação) ─────────────────────────────

export async function auditBatch(entries: AuditParams[]): Promise<void> {
  try {
    // db não tem createMany - executar em série (fire-and-forget)
    await Promise.all(entries.map(p =>
      db.AuditLog.create({
        data: {
          municipioId:  p.municipioId,
          usuarioId:    p.usuarioId,
          acao:         p.acao,
          modulo:       p.modulo,
          recurso:      p.recurso,
          registroId:   p.registroId,
          dadosAntigos: p.dadosAntigos ? JSON.stringify(p.dadosAntigos) : undefined,
          dadosNovos:   p.dadosNovos   ? JSON.stringify(p.dadosNovos)   : undefined,
          ip:           p.ip,
        },
      }).catch(() => null)
    ))
  } catch (err) {
    console.error('[AUDIT] falha no batch:', err)
  }
}

// ─── Consultar audit log (para tela de auditoria) ────────────────────────────

export async function consultarAudit(params: {
  municipioId: string
  modulo?:     string
  recurso?:    string
  usuarioId?:  string
  de?:         Date
  ate?:        Date
  pagina?:     number
  porPagina?:  number
}) {
  const { pagina = 1, porPagina = 50 } = params
  const skip = (pagina - 1) * porPagina

  const where: Record<string, unknown> = { municipioId: params.municipioId }
  if (params.modulo)    where.modulo    = params.modulo
  if (params.recurso)   where.recurso   = params.recurso
  if (params.usuarioId) where.usuarioId = params.usuarioId

  const [dados, total] = await Promise.all([
    db.$queryRaw`
      SELECT a.*, u.nome AS usuarioNome, u.email AS usuarioEmail
      FROM AuditLog a
      LEFT JOIN Usuario u ON u.id = a.usuarioId
      WHERE a.municipioId = ${params.municipioId}
        ${params.modulo    ? db.$queryRaw`AND a.modulo    = ${params.modulo}`    : db.$queryRaw``}
        ${params.recurso   ? db.$queryRaw`AND a.recurso   = ${params.recurso}`   : db.$queryRaw``}
        ${params.usuarioId ? db.$queryRaw`AND a.usuarioId = ${params.usuarioId}` : db.$queryRaw``}
        ${params.de  ? db.$queryRaw`AND a.criadoEm >= ${params.de}`  : db.$queryRaw``}
        ${params.ate ? db.$queryRaw`AND a.criadoEm <= ${params.ate}` : db.$queryRaw``}
      ORDER BY a.criadoEm DESC
      LIMIT ${porPagina} OFFSET ${skip}
    `,
    db.AuditLog.count({ where }),
  ])

  return {
    dados,
    total,
    pagina,
    porPagina,
    totalPaginas: Math.ceil(total / porPagina),
  }
}
