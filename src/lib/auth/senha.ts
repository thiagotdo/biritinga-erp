// ─── Hash e verificação de senha (bcrypt via bcryptjs) ───────────────────────
// bcryptjs roda em Edge Runtime sem módulos nativos

import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, SALT_ROUNDS)
}

export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash)
}

// Validação de força de senha
export function validarForcaSenha(senha: string): { valida: boolean; erros: string[] } {
  const erros: string[] = []

  if (senha.length < 8)              erros.push('Mínimo 8 caracteres')
  if (!/[A-Z]/.test(senha))          erros.push('Pelo menos uma letra maiúscula')
  if (!/[a-z]/.test(senha))          erros.push('Pelo menos uma letra minúscula')
  if (!/[0-9]/.test(senha))          erros.push('Pelo menos um número')
  if (!/[^A-Za-z0-9]/.test(senha))   erros.push('Pelo menos um caractere especial')

  return { valida: erros.length === 0, erros }
}

// Gerar senha aleatória segura (para reset / primeiro acesso)
export function gerarSenhaTemporaria(tamanho = 12): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  let senha = ''
  for (let i = 0; i < tamanho; i++) {
    senha += chars[Math.floor(Math.random() * chars.length)]
  }
  return senha
}
