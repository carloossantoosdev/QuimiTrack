import { DomainError } from './errors/domain-error'

export function textoObrigatorio(valor: string, campo: string, maximo: number): string {
  if (typeof valor !== 'string') {
    throw new DomainError('CAMPO_OBRIGATORIO', `${campo} é obrigatório.`)
  }

  const texto = valor.trim()
  if (!texto) {
    throw new DomainError('CAMPO_OBRIGATORIO', `${campo} é obrigatório.`)
  }

  if (texto.length > maximo) {
    throw new DomainError('CAMPO_INVALIDO', `${campo} excede ${maximo} caracteres.`)
  }

  return texto
}
