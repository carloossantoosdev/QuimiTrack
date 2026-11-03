import pino from 'pino'
import type { Logger } from '../../application/logger'

export function criarLogger(): Logger {
  const destino = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    redact: ['req.headers.authorization', 'res.headers'],
  })

  return {
    info(message, context) {
      destino.info(context ?? {}, message)
    },
    warn(message, context) {
      destino.warn(context ?? {}, message)
    },
    error(message, context) {
      destino.error(context ?? {}, message)
    },
  }
}
