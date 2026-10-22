import { describe, expect, it } from 'vitest'
import {
  PoliticaTransicaoStatus,
  TRANSICOES_PERMITIDAS,
  TRANSICOES_PROIBIDAS_PELO_ENUNCIADO,
} from '../../src/domain/services/politica-transicao-status'
import { DomainError } from '../../src/domain/errors/domain-error'
import type { StatusCarga } from '../../src/domain/enums'
import { STATUS_CARGA } from '../../src/domain/enums'

describe('Política de transição', () => {
  it.each(TRANSICOES_PERMITIDAS.filter((item) => item.origem === 'FIAP'))(
    'permite a transição oficial $de → $para',
    ({ de, para }) => {
      expect(PoliticaTransicaoStatus.permite(de, para)).toBe(true)
    },
  )

  it.each(TRANSICOES_PERMITIDAS.filter((item) => item.origem === 'FASE_1'))(
    'permite a transição de projeto da Fase 1 $de → $para',
    ({ de, para }) => {
      expect(PoliticaTransicaoStatus.permite(de, para)).toBe(true)
    },
  )

  it.each(TRANSICOES_PROIBIDAS_PELO_ENUNCIADO)(
    'rejeita a transição proibida pelo enunciado $de → $para',
    ({ de, para }) => {
      expect(PoliticaTransicaoStatus.permite(de, para)).toBe(false)
      expect(() => PoliticaTransicaoStatus.assert(de, para)).toThrow(DomainError)
    },
  )

  it('não deixa estados terminais saírem para nenhum status', () => {
    for (const destino of STATUS_CARGA) {
      expect(PoliticaTransicaoStatus.permite('FINALIZADA', destino)).toBe(false)
      expect(PoliticaTransicaoStatus.permite('CANCELADA', destino)).toBe(false)
    }
  })

  it('mantém as onze transições oficiais e as quatro herdadas separadas', () => {
    expect(TRANSICOES_PERMITIDAS.filter((item) => item.origem === 'FIAP')).toHaveLength(11)
    expect(TRANSICOES_PERMITIDAS.filter((item) => item.origem === 'FASE_1')).toHaveLength(4)
  })

  it('rejeita uma transição fora da política fechada', () => {
    const destino: StatusCarga = 'FINALIZADA'
    expect(PoliticaTransicaoStatus.permite('LIBERADA', destino)).toBe(false)
  })
})
