import { randomUUID } from 'node:crypto'
import type { StatusCarga } from '../../domain/enums'
import { statusCargaValido } from '../../domain/enums'
import { CargaQuimica } from '../../domain/entities/carga-quimica'
import { DomainError } from '../../domain/errors/domain-error'
import type { CargaQuimicaRepository } from '../../domain/repositories/carga-quimica-repository'
import type { ProdutoQuimicoRepository } from '../../domain/repositories/produto-quimico-repository'
import { dataCalendario } from '../../domain/data-calendario'
import { NotFoundError } from '../errors'
import type { Logger } from '../logger'
import { paraCargaDto, paraHistoricoDto, type CargaDto, type HistoricoDto } from '../dtos'

export interface RegistrarCargaInput {
  codigo: string
  produtoId: string
  quantidade: number
  unidadeMedida: string
  origem: string
  destino: string
  responsavelTecnico: { nome: string; registro: string }
  dataEntrada: string
  solicitante: string
  classificacaoRisco?: string
  classificacaoDeRisco?: string
  documentacaoObrigatoria?: boolean
  documentacaoValida?: boolean
}

export interface AnexarDocumentoInput {
  tipo: string
  referencia?: string | null
  obrigatorio: boolean
  validade?: string | null
  solicitante: string
}

export interface ValidarDocumentoInput {
  resultado: 'VALIDO' | 'INVALIDO'
  observacao?: string | null
  solicitante: string
}

export interface ResultadoInspecaoInput {
  resultado: 'APROVADA' | 'REPROVADA'
  observacao?: string | null
  solicitante: string
}

export interface OperacaoInput {
  solicitante: string
  motivo?: string | null
  evidencia?: string | null
}

export interface TransicionarStatusInput extends OperacaoInput {
  status: string
}

export class RegistrarCarga {
  constructor(
    private readonly cargas: CargaQuimicaRepository,
    private readonly produtos: ProdutoQuimicoRepository,
    private readonly logger: Logger,
  ) {}

  async execute(input: RegistrarCargaInput): Promise<CargaDto> {
    if (input.classificacaoRisco !== undefined || input.classificacaoDeRisco !== undefined) {
      throw new DomainError(
        'CLASSIFICACAO_DEFINIDA_PELO_PRODUTO',
        'A classificação de risco da carga é copiada do produto associado.',
      )
    }

    const produto = await this.produtos.findById(input.produtoId)
    if (!produto) {
      throw new NotFoundError('Produto químico não encontrado.')
    }

    const agora = new Date()
    const carga = CargaQuimica.registrar({
      id: randomUUID(),
      codigo: input.codigo,
      produto: { id: produto.id, ativo: produto.estaAtivo, classeRisco: produto.classeRisco },
      quantidade: input.quantidade,
      unidadeMedida: input.unidadeMedida,
      origem: input.origem,
      destino: input.destino,
      responsavelNome: input.responsavelTecnico.nome,
      responsavelRegistro: input.responsavelTecnico.registro,
      dataEntrada: dataCalendario(input.dataEntrada, 'Data de entrada'),
      solicitante: input.solicitante,
      now: agora,
    })

    await this.cargas.save(carga)

    this.logger.info('Carga química registrada', { cargaId: carga.id, produtoId: produto.id })
    return paraCargaDto(carga, agora)
  }
}

export class ListarCargas {
  constructor(private readonly cargas: CargaQuimicaRepository) {}

  async execute(status?: string): Promise<CargaDto[]> {
    const filtro = status ? { status: statusCarga(status) } : undefined
    const cargas = await this.cargas.list(filtro)
    const agora = new Date()
    return cargas.map((carga) => paraCargaDto(carga, agora))
  }
}

export class BuscarCarga {
  constructor(private readonly cargas: CargaQuimicaRepository) {}

  async execute(id: string): Promise<CargaDto> {
    return paraCargaDto(await carregarCarga(this.cargas, id), new Date())
  }
}

export class ConsultarHistorico {
  constructor(private readonly cargas: CargaQuimicaRepository) {}

  async execute(id: string): Promise<HistoricoDto[]> {
    return paraHistoricoDto(await carregarCarga(this.cargas, id))
  }
}

export class AnexarDocumento {
  constructor(
    private readonly cargas: CargaQuimicaRepository,
    private readonly logger: Logger,
  ) {}

  async execute(cargaId: string, input: AnexarDocumentoInput): Promise<CargaDto> {
    const carga = await carregarCarga(this.cargas, cargaId)
    const agora = new Date()
    carga.anexarDocumento(
      {
        tipo: input.tipo,
        referencia: input.referencia,
        obrigatorio: input.obrigatorio,
        validade: input.validade ? dataCalendario(input.validade, 'Validade') : null,
      },
      input.solicitante,
      agora,
    )
    await this.cargas.save(carga)
    this.logger.info('Documento anexado à carga', { cargaId })
    return paraCargaDto(carga, agora)
  }
}

export class ValidarDocumento {
  constructor(
    private readonly cargas: CargaQuimicaRepository,
    private readonly logger: Logger,
  ) {}

  async execute(cargaId: string, documentoId: string, input: ValidarDocumentoInput): Promise<CargaDto> {
    const carga = await carregarCarga(this.cargas, cargaId)
    const agora = new Date()
    carga.validarDocumento(documentoId, input.resultado, input.observacao ?? null, input.solicitante, agora)
    await this.cargas.save(carga)
    this.logger.info('Documento da carga validado', { cargaId, documentoId, resultado: input.resultado })
    return paraCargaDto(carga, agora)
  }
}

export class SolicitarInspecao {
  constructor(
    private readonly cargas: CargaQuimicaRepository,
    private readonly logger: Logger,
  ) {}

  async execute(cargaId: string, solicitante: string): Promise<CargaDto> {
    const carga = await carregarCarga(this.cargas, cargaId)
    const agora = new Date()
    carga.solicitarInspecao(solicitante, agora)
    await this.cargas.save(carga)
    this.logger.info('Inspeção solicitada', { cargaId, status: carga.status })
    return paraCargaDto(carga, agora)
  }
}

export class RegistrarResultadoInspecao {
  constructor(
    private readonly cargas: CargaQuimicaRepository,
    private readonly logger: Logger,
  ) {}

  async execute(cargaId: string, input: ResultadoInspecaoInput): Promise<CargaDto> {
    const carga = await carregarCarga(this.cargas, cargaId)
    const agora = new Date()
    carga.registrarResultadoInspecao(input.resultado, input.observacao ?? null, input.solicitante, agora)
    await this.cargas.save(carga)
    this.logger.info('Resultado de inspeção registrado', { cargaId, resultado: input.resultado })
    return paraCargaDto(carga, agora)
  }
}

export class LiberarCarga {
  constructor(
    private readonly cargas: CargaQuimicaRepository,
    private readonly logger: Logger,
  ) {}

  async execute(cargaId: string, solicitante: string): Promise<CargaDto> {
    const carga = await carregarCarga(this.cargas, cargaId)
    const agora = new Date()
    carga.liberar(solicitante, agora)
    await this.cargas.save(carga)
    this.logger.info('Carga liberada', { cargaId, status: carga.status })
    return paraCargaDto(carga, agora)
  }
}

export class BloquearCarga {
  constructor(
    private readonly cargas: CargaQuimicaRepository,
    private readonly logger: Logger,
  ) {}

  async execute(cargaId: string, input: OperacaoInput): Promise<CargaDto> {
    const carga = await carregarCarga(this.cargas, cargaId)
    const agora = new Date()
    carga.bloquear(input.motivo ?? '', input.evidencia ?? null, input.solicitante, agora)
    await this.cargas.save(carga)
    this.logger.info('Carga bloqueada', { cargaId, status: carga.status })
    return paraCargaDto(carga, agora)
  }
}

export class CancelarCarga {
  constructor(
    private readonly cargas: CargaQuimicaRepository,
    private readonly logger: Logger,
  ) {}

  async execute(cargaId: string, input: OperacaoInput): Promise<CargaDto> {
    const carga = await carregarCarga(this.cargas, cargaId)
    const agora = new Date()
    carga.cancelar(input.motivo ?? '', input.solicitante, agora)
    await this.cargas.save(carga)
    this.logger.info('Carga cancelada', { cargaId, status: carga.status })
    return paraCargaDto(carga, agora)
  }
}

export class TransicionarStatus {
  constructor(
    private readonly cargas: CargaQuimicaRepository,
    private readonly logger: Logger,
  ) {}

  async execute(cargaId: string, input: TransicionarStatusInput): Promise<CargaDto> {
    const carga = await carregarCarga(this.cargas, cargaId)
    const agora = new Date()
    carga.transicionar({
      destino: statusCarga(input.status),
      solicitante: input.solicitante,
      motivo: input.motivo,
      evidencia: input.evidencia,
      now: agora,
    })
    await this.cargas.save(carga)
    this.logger.info('Status da carga alterado', { cargaId, status: carga.status })
    return paraCargaDto(carga, agora)
  }
}

async function carregarCarga(cargas: CargaQuimicaRepository, id: string): Promise<CargaQuimica> {
  const carga = await cargas.findById(id)
  if (!carga) {
    throw new NotFoundError('Carga química não encontrada.')
  }
  return carga
}

function statusCarga(valor: string): StatusCarga {
  if (!statusCargaValido(valor)) {
    throw new DomainError('CAMPO_INVALIDO', 'Status da carga inválido.')
  }
  return valor
}
