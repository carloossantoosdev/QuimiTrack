import { DomainError } from '../errors/domain-error'

const ESCALA = 3
const FATOR = 1000
const MAX_INTEIROS = 11
const MENSAGEM = 'A quantidade deve ser maior que zero e ter no máximo três casas decimais.'

/**
 * A coluna é decimal(14,3): até 11 dígitos inteiros e 3 casas.
 * O valor fica em milésimos inteiros. O texto canônico, como "1.250",
 * é o que vai ao banco. O número exposto é Number desse texto, sem
 * arredondar casas excedentes.
 */
export class Quantidade {
  private constructor(private readonly milessimos: number) {}

  static criar(valor: number): Quantidade {
    const milessimos = milessimosDeNumero(valor)
    if (milessimos === null) {
      throw new DomainError('QUANTIDADE_INVALIDA', MENSAGEM)
    }

    return new Quantidade(milessimos)
  }

  static desdePersistencia(texto: string): Quantidade {
    if (!/^\d{1,11}\.\d{3}$/.test(texto)) {
      throw new DomainError('QUANTIDADE_INVALIDA', MENSAGEM)
    }

    const milessimos = Number(texto.replace('.', ''))
    if (!Number.isSafeInteger(milessimos) || milessimos <= 0) {
      throw new DomainError('QUANTIDADE_INVALIDA', MENSAGEM)
    }

    return new Quantidade(milessimos)
  }

  get valor(): number {
    return Number(this.texto)
  }

  get texto(): string {
    const inteiro = Math.trunc(this.milessimos / FATOR)
    const fracao = String(this.milessimos % FATOR).padStart(ESCALA, '0')
    return `${inteiro}.${fracao}`
  }
}

function milessimosDeNumero(valor: number): number | null {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || Object.is(valor, -0)) {
    return null
  }

  const texto = valor.toString().toLowerCase()
  const partes = texto.match(/^(-?)(\d+)(?:\.(\d+))?$/)
  if (!partes) {
    return null
  }

  const sinal = partes[1] ?? ''
  const inteiro = partes[2] ?? ''
  const fracao = partes[3] ?? ''
  if (sinal === '-' || inteiro.length > MAX_INTEIROS || fracao.length > ESCALA) {
    return null
  }

  const milessimos = Number(`${inteiro}${fracao.padEnd(ESCALA, '0')}`)
  if (!Number.isSafeInteger(milessimos) || milessimos <= 0) {
    return null
  }

  return milessimos
}
