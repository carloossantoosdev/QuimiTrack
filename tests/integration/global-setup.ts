import { execSync } from 'node:child_process'
import { carregarEnvLocal } from './setup-env'

export default function prepararBanco(): void {
  carregarEnvLocal()
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL é obrigatória para os testes de integração.')
  }

  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env })
}
