import type { StatusCarga } from '../enums'
import { DomainError } from '../errors/domain-error'

export type OrigemTransicao = 'FIAP' | 'FASE_1'

export interface TransicaoStatus {
  de: StatusCarga
  para: StatusCarga
  origem: OrigemTransicao
}

/**
 * A origem FIAP reproduz o fluxo principal e os fluxos alternativos do enunciado.
 * A origem FASE_1 registra decisão de projeto da modelagem anterior.
 * A justificativa está em docs/decisoes-fase-2.md.
 */
export const TRANSICOES_PERMITIDAS: readonly TransicaoStatus[] = [
  { de: 'REGISTRADA', para: 'EM_ANALISE', origem: 'FIAP' },
  { de: 'EM_ANALISE', para: 'EM_INSPECAO', origem: 'FIAP' },
  { de: 'EM_INSPECAO', para: 'LIBERADA', origem: 'FIAP' },
  { de: 'LIBERADA', para: 'EM_MOVIMENTACAO', origem: 'FIAP' },
  { de: 'EM_MOVIMENTACAO', para: 'FINALIZADA', origem: 'FIAP' },
  { de: 'REGISTRADA', para: 'CANCELADA', origem: 'FIAP' },
  { de: 'EM_ANALISE', para: 'CANCELADA', origem: 'FIAP' },
  { de: 'EM_INSPECAO', para: 'BLOQUEADA', origem: 'FIAP' },
  { de: 'EM_INSPECAO', para: 'CANCELADA', origem: 'FIAP' },
  { de: 'LIBERADA', para: 'CANCELADA', origem: 'FIAP' },
  { de: 'BLOQUEADA', para: 'CANCELADA', origem: 'FIAP' },
  { de: 'EM_ANALISE', para: 'LIBERADA', origem: 'FASE_1' },
  { de: 'EM_ANALISE', para: 'BLOQUEADA', origem: 'FASE_1' },
  { de: 'BLOQUEADA', para: 'EM_ANALISE', origem: 'FASE_1' },
  { de: 'EM_INSPECAO', para: 'EM_ANALISE', origem: 'FASE_1' },
]

export const TRANSICOES_PROIBIDAS_PELO_ENUNCIADO: ReadonlyArray<{
  de: StatusCarga
  para: StatusCarga
}> = [
  { de: 'CANCELADA', para: 'LIBERADA' },
  { de: 'FINALIZADA', para: 'EM_MOVIMENTACAO' },
  { de: 'BLOQUEADA', para: 'EM_MOVIMENTACAO' },
  { de: 'REGISTRADA', para: 'FINALIZADA' },
  { de: 'EM_INSPECAO', para: 'FINALIZADA' },
  { de: 'LIBERADA', para: 'REGISTRADA' },
]

const PERMITIDAS = new Set(TRANSICOES_PERMITIDAS.map((transicao) => chave(transicao.de, transicao.para)))

function chave(de: StatusCarga, para: StatusCarga): string {
  return `${de}->${para}`
}

export class PoliticaTransicaoStatus {
  static permite(de: StatusCarga, para: StatusCarga): boolean {
    return PERMITIDAS.has(chave(de, para))
  }

  static assert(de: StatusCarga, para: StatusCarga): void {
    if (!this.permite(de, para)) {
      throw new DomainError(
        'TRANSICAO_NAO_PERMITIDA',
        `Transição de ${de} para ${para} não é permitida.`,
      )
    }
  }
}
