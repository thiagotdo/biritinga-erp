// ─── Audit Log — registro imutável de operações ───────────────────────────────
// auditLog() é fire-and-forget: nunca lança exceção (silent fail)
// Chame após toda operação CREATE/UPDATE/DELETE em dados sensíveis

import { prisma } from '@/lib/prisma'
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
    await prisma.auditLog.create({
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
    await prisma.auditLog.createMany({
      data: entries.map(p => ({
        municipioId:  p.municipioId,
        usuarioId:    p.usuarioId,
        acao:         p.acao,
        modulo:       p.modulo,
        recurso:      p.recurso,
        registroId:   p.registroId,
        dadosAntigos: p.dadosAntigos ? JSON.stringify(p.dadosAntigos) : undefined,
        dadosNovos:   p.dadosNovos   ? JSON.stringify(p.dadosNovos)   : undefined,
        ip:           p.ip,
      })),
    })
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

  const [dados, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        municipioId: params.municipioId,
        ...(params.modulo    && { modulo:    params.modulo    }),
        ...(params.recurso   && { recurso:   params.recurso   }),
        ...(params.usuarioId && { usuarioId: params.usuarioId }),
        ...(params.de || params.ate) && {
          createdAt: {
            ...(params.de  && { gte: params.de  }),
            ...(params.ate && { lte: params.ate }),
          },
        },
      },
      include: {
        usuario: { select: { nome: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: porPagina,
    }),
    prisma.auditLog.count({
      where: {
        municipioId: params.municipioId,
        ...(params.modulo    && { modulo:    params.modulo    }),
        ...(params.usuarioId && { usuarioId: params.usuarioId }),
      },
    }),
  ])

  return {
    dados,
    total,
    pagina,
    porPagina,
    totalPaginas: Math.ceil(total / porPagina),
  }
}
