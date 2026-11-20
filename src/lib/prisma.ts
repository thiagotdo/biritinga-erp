// ─── Singleton do Prisma Client ───────────────────────────────────────────────
// Evita múltiplas instâncias em dev (HMR do Next.js recria módulos a cada save)

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Garante SSL na conexão MySQL 8.0 do cPanel (sha256_password/caching_sha2_password)
function getDatabaseUrl() {
  const url = process.env.DATABASE_URL ?? ''
  if (!url) return url
  if (url.includes('ssl=') || url.includes('sslaccept=')) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}sslaccept=accept`
}

function createPrismaClient() {
  const url = getDatabaseUrl()
  return new PrismaClient({
    log: ['warn', 'error'],
    datasources: { db: { url } },
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
