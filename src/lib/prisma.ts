// ─── Singleton do Prisma Client ───────────────────────────────────────────────
// Evita múltiplas instâncias em dev (HMR do Next.js recria módulos a cada save)

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Garante SSL na conexão MySQL 8.0 do cPanel (sha256_password/caching_sha2_password)
// Usa ssl={"rejectUnauthorized":false} URL-encoded para o mysql2 aceitar cert autoassinado
function getDatabaseUrl() {
  const url = process.env.DATABASE_URL ?? ''
  if (!url) return url
  if (url.includes('ssl=') || url.includes('sslaccept=')) return url
  const sep = url.includes('?') ? '&' : '?'
  // %7B = { e %7D = } - necessário para o Prisma parsear corretamente
  return `${url}${sep}ssl=%7B%22rejectUnauthorized%22%3Afalse%7D`
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
