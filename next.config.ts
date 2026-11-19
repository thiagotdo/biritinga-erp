import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
}

export default nextConfig
