// ─── Singleton do Prisma Client ───────────────────────────────────────────────
// Evita múltiplas instâncias em dev (HMR do Next.js recria módulos a cada save)

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Garante que o DATABASE_URL tenha o parâmetro SSL para MySQL 8.0 (cPanel)
// O cPanel usa sha256_password/caching_sha2_password que exige SSL ou native_password
function getDatabaseUrl() {
  const url = process.env.DATABASE_URL ?? ''
  if (!url) return url
  // Se já tem ssl= na URL, usar como está
  if (url.includes('ssl=') || url.includes('sslaccept=')) return url
  // Caso contrário, adicionar sslaccept=strict
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}sslaccept=strict`
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'warn', 'error']
      : ['warn', 'error'],
    datasources: {
      db: { url: getDatabaseUrl() },
    },
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
