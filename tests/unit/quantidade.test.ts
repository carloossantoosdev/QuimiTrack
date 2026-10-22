import { describe, expect, it } from 'vitest'
import { DomainError } from '../../src/domain/errors/domain-error'
import { Quantidade } from '../../src/domain/value-objects/quantidade'

describe('Quantidade', () => {
  it('aceita 1.250 e persiste o texto com três casas', () => {
    const quantidade = Quantidade.criar(1.25)
    expect(quantidade.texto).toBe('1.250')
    expect(quantidade.valor).toBe(1.25)
    expect(Quantidade.desdePersistencia(quantidade.texto).valor).toBe(1.25)
  })

  it.each([0, -1, -0.001])('rejeita quantidade %s', (valor) => {
    expect(() => Quantidade.criar(valor)).toThrow(DomainError)
    try {
      Quantidade.criar(valor)
    } catch (error) {
      expect(error).toMatchObject({ code: 'QUANTIDADE_INVALIDA' })
    }
  })

  it('rejeita mais de três casas decimais', () => {
    expect(() => Quantidade.criar(1.2345)).toThrow(DomainError)
  })

  it('rejeita 0.0004 sem arredondar para zero', () => {
    expect(() => Quantidade.criar(0.0004)).toThrow(/três casas decimais/i)
    expect(Quantidade.criar(0.001).texto).toBe('0.001')
  })
})
