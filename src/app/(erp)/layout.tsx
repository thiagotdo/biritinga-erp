import AdminShell from '@/components/AdminShell'
import { ReactNode } from 'react'

export default function ErpLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
