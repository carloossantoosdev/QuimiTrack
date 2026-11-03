import { inicioDoDiaUtc } from '../data-calendario'
import type { CargaQuimica } from '../entities/carga-quimica'

export interface ResultadoAvaliacao {
  apta: boolean
  motivos: string[]
}

export class AvaliacaoDeLiberacao {
  static documentacaoAtendida(carga: CargaQuimica, agora: Date): boolean {
    return this.motivosDocumentacao(carga, agora).length === 0
  }

  static avaliar(carga: CargaQuimica, agora: Date): ResultadoAvaliacao {
    const motivos = [...this.motivosInspecao(carga), ...this.motivosDocumentacao(carga, agora)]
    return { apta: motivos.length === 0, motivos }
  }

  private static motivosInspecao(carga: CargaQuimica): string[] {
    if (!carga.inspecaoNecessaria) {
      return []
    }

    const motivos: string[] = []
    if (carga.status !== 'EM_INSPECAO') {
      motivos.push('Carga sujeita a inspeção não pode ser liberada fora de EM_INSPECAO.')
    }

    if (carga.inspecao?.resultado !== 'APROVADA') {
      motivos.push('A inspeção exigida para a carga não possui resultado aprovado.')
    }

    return motivos
  }

  private static motivosDocumentacao(carga: CargaQuimica, agora: Date): string[] {
    const obrigatorios = carga.documentos.filter((documento) => documento.obrigatorio)
    if (obrigatorios.length === 0) {
      return ['Documentação obrigatória ausente.']
    }

    const hoje = inicioDoDiaUtc(agora)
    const motivos: string[] = []
    for (const documento of obrigatorios) {
      if (documento.statusValidacao !== 'VALIDO') {
        motivos.push(`Documento obrigatório "${documento.tipo}" não está válido.`)
      }
      if (documento.validade && inicioDoDiaUtc(documento.validade) < hoje) {
        motivos.push(`Documento obrigatório "${documento.tipo}" está vencido.`)
      }
    }

    return motivos
  }
}
