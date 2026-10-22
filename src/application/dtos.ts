import type { ResultadoInspecao, StatusCarga, StatusProduto, StatusValidacaoDocumento } from '../domain/enums'
import type { CargaQuimica } from '../domain/entities/carga-quimica'
import type { ProdutoQuimico } from '../domain/entities/produto-quimico'
import { AvaliacaoDeLiberacao } from '../domain/services/avaliacao-de-liberacao'
import { formatarData } from '../domain/data-calendario'

export interface ProdutoDto {
  id: string
  nome: string
  descricao: string
  numeroOnu: string
  classeRisco: string
  grupoCompatibilidade: string
  status: StatusProduto
  createdAt: string
  updatedAt: string
}

export interface DocumentoDto {
  id: string
  tipo: string
  referencia: string | null
  obrigatorio: boolean
  statusValidacao: StatusValidacaoDocumento
  validade: string | null
  observacao: string | null
  validadoPor: string | null
  validadoEm: string | null
  createdAt: string
  updatedAt: string
}

export interface InspecaoDto {
  id: string
  resultado: ResultadoInspecao
  observacao: string | null
  solicitadaEm: string
  concluidaEm: string | null
  createdAt: string
  updatedAt: string
}

export interface HistoricoDto {
  id: string
  cargaId: string
  acao: string
  statusAnterior: StatusCarga | null
  statusNovo: StatusCarga | null
  solicitante: string
  motivo: string | null
  evidencia: string | null
  ocorridoEm: string
}

export interface CargaDto {
  id: string
  codigo: string
  produtoId: string
  quantidade: number
  unidadeMedida: string
  origem: string
  destino: string
  responsavelTecnico: { nome: string; registro: string }
  classificacaoRisco: string
  status: StatusCarga
  inspecaoNecessaria: boolean
  documentacaoObrigatoriaAtendida: boolean
  dataEntrada: string
  documentos: DocumentoDto[]
  inspecao: InspecaoDto | null
  createdAt: string
  updatedAt: string
}

export function paraProdutoDto(produto: ProdutoQuimico): ProdutoDto {
  const snapshot = produto.snapshot()
  return {
    ...snapshot,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  }
}

export function paraCargaDto(carga: CargaQuimica, agora: Date): CargaDto {
  const snapshot = carga.snapshot()
  return {
    id: snapshot.id,
    codigo: snapshot.codigo,
    produtoId: snapshot.produtoId,
    quantidade: snapshot.quantidade,
    unidadeMedida: snapshot.unidadeMedida,
    origem: snapshot.origem,
    destino: snapshot.destino,
    responsavelTecnico: snapshot.responsavelTecnico,
    classificacaoRisco: snapshot.classificacaoRisco,
    status: snapshot.status,
    inspecaoNecessaria: snapshot.inspecaoNecessaria,
    documentacaoObrigatoriaAtendida: AvaliacaoDeLiberacao.documentacaoAtendida(carga, agora),
    dataEntrada: formatarData(snapshot.dataEntrada),
    documentos: snapshot.documentos.map((documento) => ({
      ...documento,
      validade: documento.validade ? formatarData(documento.validade) : null,
      validadoEm: documento.validadoEm ? documento.validadoEm.toISOString() : null,
      createdAt: documento.createdAt.toISOString(),
      updatedAt: documento.updatedAt.toISOString(),
    })),
    inspecao: snapshot.inspecao
      ? {
          ...snapshot.inspecao,
          solicitadaEm: snapshot.inspecao.solicitadaEm.toISOString(),
          concluidaEm: snapshot.inspecao.concluidaEm ? snapshot.inspecao.concluidaEm.toISOString() : null,
          createdAt: snapshot.inspecao.createdAt.toISOString(),
          updatedAt: snapshot.inspecao.updatedAt.toISOString(),
        }
      : null,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  }
}

export function paraHistoricoDto(carga: CargaQuimica): HistoricoDto[] {
  return carga.historico.map((evento) => ({
    id: evento.id,
    cargaId: carga.id,
    acao: evento.acao,
    statusAnterior: evento.statusAnterior,
    statusNovo: evento.statusNovo,
    solicitante: evento.solicitante,
    motivo: evento.motivo,
    evidencia: evento.evidencia,
    ocorridoEm: evento.ocorridoEm.toISOString(),
  }))
}
