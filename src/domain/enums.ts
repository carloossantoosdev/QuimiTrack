export const STATUS_PRODUTO = ['ATIVO', 'INATIVO'] as const
export type StatusProduto = (typeof STATUS_PRODUTO)[number]

export const STATUS_CARGA = [
  'REGISTRADA',
  'EM_ANALISE',
  'EM_INSPECAO',
  'LIBERADA',
  'BLOQUEADA',
  'EM_MOVIMENTACAO',
  'FINALIZADA',
  'CANCELADA',
] as const
export type StatusCarga = (typeof STATUS_CARGA)[number]

export const STATUS_VALIDACAO_DOCUMENTO = ['PENDENTE', 'VALIDO', 'INVALIDO'] as const
export type StatusValidacaoDocumento = (typeof STATUS_VALIDACAO_DOCUMENTO)[number]

export const RESULTADO_INSPECAO = ['PENDENTE', 'APROVADA', 'REPROVADA'] as const
export type ResultadoInspecao = (typeof RESULTADO_INSPECAO)[number]

export const ACOES_HISTORICO = [
  'REGISTRO',
  'TRANSICAO_STATUS',
  'LIBERACAO',
  'BLOQUEIO',
  'CANCELAMENTO',
  'RETORNO_ANALISE',
  'DOCUMENTO_ANEXADO',
  'DOCUMENTO_VALIDADO',
  'INSPECAO_SOLICITADA',
  'INSPECAO_REGISTRADA',
] as const
export type AcaoHistorico = (typeof ACOES_HISTORICO)[number]

export function statusProdutoValido(valor: string): valor is StatusProduto {
  return (STATUS_PRODUTO as readonly string[]).includes(valor)
}

export function statusCargaValido(valor: string): valor is StatusCarga {
  return (STATUS_CARGA as readonly string[]).includes(valor)
}
