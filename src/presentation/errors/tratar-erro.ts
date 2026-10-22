import { NotFoundError } from '../../application/errors'
import type { Logger } from '../../application/logger'
import { DomainError } from '../../domain/errors/domain-error'

export interface RespostaErro {
  statusCode: number
  body: {
    code: string
    message: string
    details?: string[]
  }
}

const STATUS_POR_CODIGO: Record<string, number> = {
  NAO_ENCONTRADO: 404,
  DOCUMENTO_NAO_ENCONTRADO: 404,
  CONFLITO: 409,
  TRANSICAO_NAO_PERMITIDA: 409,
  ESTADO_TERMINAL: 409,
  ESTADO_INCOMPATIVEL: 409,
  LIBERACAO_NEGADA: 422,
  PRODUTO_INATIVO: 422,
  QUANTIDADE_INVALIDA: 422,
  CAMPO_OBRIGATORIO: 422,
  CAMPO_INVALIDO: 422,
  CLASSIFICACAO_DEFINIDA_PELO_PRODUTO: 422,
  INSPECAO_NAO_ENCONTRADA: 422,
}

export function tratarErro(error: unknown, logger: Logger): RespostaErro {
  if (error instanceof DomainError) {
    logger.warn(error.message, { code: error.code })
    return {
      statusCode: STATUS_POR_CODIGO[error.code] ?? 422,
      body: { code: error.code, message: error.message, details: error.details },
    }
  }

  if (error instanceof NotFoundError) {
    logger.warn(error.message, { code: error.code })
    return { statusCode: 404, body: { code: error.code, message: error.message } }
  }

  if (erroDeValidacao(error)) {
    const details = error.validation.map((item) => item.message ?? 'campo inválido')
    logger.warn('Payload inválido', { code: 'PAYLOAD_INVALIDO' })
    return {
      statusCode: 400,
      body: { code: 'PAYLOAD_INVALIDO', message: 'Payload inválido.', details },
    }
  }

  const message = error instanceof Error ? error.message : 'erro desconhecido'
  logger.error('Erro interno', { message })
  return { statusCode: 500, body: { code: 'ERRO_INTERNO', message: 'Erro interno.' } }
}

function erroDeValidacao(
  error: unknown,
): error is { validation: Array<{ message?: string }> } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'validation' in error &&
    Array.isArray((error as { validation?: unknown }).validation)
  )
}
