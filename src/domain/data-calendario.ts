import { DomainError } from './errors/domain-error'

export function dataCalendario(valor: string, campo: string): Date {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new DomainError('CAMPO_INVALIDO', `${campo} deve estar no formato AAAA-MM-DD.`)
  }

  const [ano, mes, dia] = valor.split('-').map(Number)
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    throw new DomainError('CAMPO_INVALIDO', `${campo} não é uma data válida.`)
  }

  return data
}

export function formatarData(data: Date): string {
  return data.toISOString().slice(0, 10)
}

export function inicioDoDiaUtc(data: Date): number {
  return Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate())
}
