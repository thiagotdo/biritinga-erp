import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    // Erros de tipagem não bloqueiam o build em produção
    // TODO: corrigir os tipos gradualmente
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
}

export default nextConfig
