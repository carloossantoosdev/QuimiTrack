import { existsSync, readFileSync } from 'node:fs'

export function carregarEnvLocal(): void {
  if (!existsSync('.env')) {
    return
  }

  for (const linha of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const texto = linha.trim()
    if (!texto || texto.startsWith('#')) {
      continue
    }

    const separador = texto.indexOf('=')
    if (separador === -1) {
      continue
    }

    const chave = texto.slice(0, separador).trim()
    const valor = texto.slice(separador + 1).trim()
    if (!process.env[chave]) {
      process.env[chave] = valor
    }
  }
}

carregarEnvLocal()
