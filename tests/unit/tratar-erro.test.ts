import { describe, expect, it } from 'vitest'
import { DomainError } from '../../src/domain/errors/domain-error'
import { tratarErro } from '../../src/presentation/errors/tratar-erro'
import type { Logger } from '../../src/application/logger'

function loggerEspiao(): Logger & { eventos: string[] } {
  const eventos: string[] = []
  return {
    eventos,
    info(message) {
      eventos.push(`info:${message}`)
    },
    warn(message) {
      eventos.push(`warn:${message}`)
    },
    error(message) {
      eventos.push(`error:${message}`)
    },
  }
}

describe('Tratamento de erro HTTP', () => {
  it('esconde erro interno e registra o log', () => {
    const logger = loggerEspiao()
    const resposta = tratarErro(new Error('segredo do banco'), logger)
    expect(resposta.statusCode).toBe(500)
    expect(resposta.body).toEqual({ code: 'ERRO_INTERNO', message: 'Erro interno.' })
    expect(JSON.stringify(resposta.body)).not.toContain('segredo')
    expect(logger.eventos).toContain('error:Erro interno')
  })

  it('mapeia regra de negócio e payload inválido', () => {
    const logger = loggerEspiao()
    const regra = tratarErro(new DomainError('LIBERACAO_NEGADA', 'Documentação obrigatória ausente.'), logger)
    expect(regra.statusCode).toBe(422)
    const payload = tratarErro({ validation: [{ message: 'body/nome must NOT have fewer than 1 characters' }] }, logger)
    expect(payload.statusCode).toBe(400)
    expect(payload.body.code).toBe('PAYLOAD_INVALIDO')
    expect(logger.eventos.some((evento) => evento.startsWith('warn:'))).toBe(true)
  })
})
