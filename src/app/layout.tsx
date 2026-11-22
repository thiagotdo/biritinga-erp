import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ERP Municipal - Prefeitura de Biritinga/BA',
  description: 'Sistema integrado de gestão municipal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
