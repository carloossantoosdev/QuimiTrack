import { randomUUID } from 'node:crypto'
import type { AcaoHistorico, ResultadoInspecao, StatusCarga, StatusValidacaoDocumento } from '../enums'
import { DomainError } from '../errors/domain-error'
import { textoObrigatorio } from '../text'
import { Quantidade } from '../value-objects/quantidade'
import { ClassificacaoDeRisco } from '../value-objects/classificacao-de-risco'
import { ResponsavelTecnico } from '../value-objects/responsavel-tecnico'
import { PoliticaTransicaoStatus } from '../services/politica-transicao-status'
import { AvaliacaoDeLiberacao } from '../services/avaliacao-de-liberacao'

export interface DocumentoSnapshot {
  id: string
  tipo: string
  referencia: string | null
  obrigatorio: boolean
  statusValidacao: StatusValidacaoDocumento
  validade: Date | null
  observacao: string | null
  validadoPor: string | null
  validadoEm: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface InspecaoSnapshot {
  id: string
  resultado: ResultadoInspecao
  observacao: string | null
  solicitadaEm: Date
  concluidaEm: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface HistoricoSnapshot {
  id: string
  acao: AcaoHistorico
  statusAnterior: StatusCarga | null
  statusNovo: StatusCarga | null
  solicitante: string
  motivo: string | null
  evidencia: string | null
  ocorridoEm: Date
}

export interface CargaSnapshot {
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
  dataEntrada: Date
  documentos: DocumentoSnapshot[]
  inspecao: InspecaoSnapshot | null
  historico: HistoricoSnapshot[]
  createdAt: Date
  updatedAt: Date
}

export interface RegistrarCargaDados {
  id?: string
  codigo: string
  produto: { id: string; ativo: boolean; classeRisco: string }
  quantidade: number
  unidadeMedida: string
  origem: string
  destino: string
  responsavelNome: string
  responsavelRegistro: string
  dataEntrada: Date
  solicitante: string
  now: Date
}

export interface TransicaoComando {
  destino: StatusCarga
  solicitante: string
  motivo?: string | null
  evidencia?: string | null
  now: Date
}

export class CargaQuimica {
  private pendentes: HistoricoSnapshot[] = []

  private constructor(private props: CargaSnapshot) {}

  static registrar(dados: RegistrarCargaDados): CargaQuimica {
    if (!dados.produto.ativo) {
      throw new DomainError('PRODUTO_INATIVO', 'Produto inativo não pode ser usado em novas cargas.')
    }

    const quantidade = Quantidade.criar(dados.quantidade)
    const classificacao = ClassificacaoDeRisco.criar(dados.produto.classeRisco)
    const responsavel = ResponsavelTecnico.criar(dados.responsavelNome, dados.responsavelRegistro)
    const agora = dados.now
    const carga = new CargaQuimica({
      id: dados.id ?? randomUUID(),
      codigo: textoObrigatorio(dados.codigo, 'Código da carga', 60),
      produtoId: dados.produto.id,
      quantidade: quantidade.valor,
      unidadeMedida: textoObrigatorio(dados.unidadeMedida, 'Unidade de medida', 20),
      origem: textoObrigatorio(dados.origem, 'Origem', 160),
      destino: textoObrigatorio(dados.destino, 'Destino', 160),
      responsavelTecnico: { nome: responsavel.nome, registro: responsavel.registro },
      classificacaoRisco: classificacao.valor,
      status: 'REGISTRADA',
      inspecaoNecessaria: false,
      dataEntrada: dados.dataEntrada,
      documentos: [],
      inspecao: null,
      historico: [],
      createdAt: agora,
      updatedAt: agora,
    })

    carga.registrarEvento({
      acao: 'REGISTRO',
      statusAnterior: null,
      statusNovo: 'REGISTRADA',
      solicitante: solicitanteObrigatorio(dados.solicitante),
      motivo: null,
      evidencia: null,
      ocorridoEm: agora,
    })

    return carga
  }

  static restaurar(snapshot: CargaSnapshot): CargaQuimica {
    return new CargaQuimica(structuredClone(snapshot))
  }

  get id(): string {
    return this.props.id
  }

  get status(): StatusCarga {
    return this.props.status
  }

  get produtoId(): string {
    return this.props.produtoId
  }

  get classificacaoRisco(): string {
    return this.props.classificacaoRisco
  }

  get inspecaoNecessaria(): boolean {
    return this.props.inspecaoNecessaria
  }

  get documentos(): readonly DocumentoSnapshot[] {
    return this.props.documentos
  }

  get inspecao(): InspecaoSnapshot | null {
    return this.props.inspecao
  }

  get historico(): readonly HistoricoSnapshot[] {
    return this.props.historico
  }

  iniciarAnalise(solicitante: string, now: Date): void {
    this.exigirStatus('REGISTRADA')
    this.aplicarTransicao('EM_ANALISE', 'TRANSICAO_STATUS', solicitante, now, null, null)
  }

  solicitarInspecao(solicitante: string, now: Date): void {
    PoliticaTransicaoStatus.assert(this.props.status, 'EM_INSPECAO')
    const ator = solicitanteObrigatorio(solicitante)
    this.props.inspecaoNecessaria = true
    if (!this.props.inspecao) {
      this.props.inspecao = {
        id: randomUUID(),
        resultado: 'PENDENTE',
        observacao: null,
        solicitadaEm: now,
        concluidaEm: null,
        createdAt: now,
        updatedAt: now,
      }
    } else {
      this.props.inspecao.resultado = 'PENDENTE'
      this.props.inspecao.observacao = null
      this.props.inspecao.concluidaEm = null
      this.props.inspecao.solicitadaEm = now
      this.props.inspecao.updatedAt = now
    }

    this.aplicarTransicao('EM_INSPECAO', 'INSPECAO_SOLICITADA', ator, now, null, null)
  }

  registrarResultadoInspecao(
    resultado: 'APROVADA' | 'REPROVADA',
    observacao: string | null,
    solicitante: string,
    now: Date,
  ): void {
    this.exigirStatus('EM_INSPECAO')
    if (!this.props.inspecao) {
      throw new DomainError('INSPECAO_NAO_ENCONTRADA', 'Não há inspeção persistida para esta carga.')
    }

    const ator = solicitanteObrigatorio(solicitante)
    const observacaoOk = observacao ? textoObrigatorio(observacao, 'Observação da inspeção', 1000) : null
    this.props.inspecao.resultado = resultado
    this.props.inspecao.observacao = observacaoOk
    this.props.inspecao.concluidaEm = now
    this.props.inspecao.updatedAt = now
    this.registrarEvento({
      acao: 'INSPECAO_REGISTRADA',
      statusAnterior: this.props.status,
      statusNovo: this.props.status,
      solicitante: ator,
      motivo: resultado,
      evidencia: observacaoOk,
      ocorridoEm: now,
    })
  }

  liberar(solicitante: string, now: Date): void {
    PoliticaTransicaoStatus.assert(this.props.status, 'LIBERADA')
    const avaliacao = AvaliacaoDeLiberacao.avaliar(this, now)
    if (!avaliacao.apta) {
      throw new DomainError('LIBERACAO_NEGADA', avaliacao.motivos.join(' '), avaliacao.motivos)
    }

    this.aplicarTransicao('LIBERADA', 'LIBERACAO', solicitante, now, null, null)
  }

  bloquear(motivo: string, evidencia: string | null, solicitante: string, now: Date): void {
    PoliticaTransicaoStatus.assert(this.props.status, 'BLOQUEADA')
    const motivoOk = textoObrigatorio(motivo, 'Motivo', 1000)
    const evidenciaOk = evidencia ? textoObrigatorio(evidencia, 'Evidência', 1000) : null
    this.aplicarTransicao('BLOQUEADA', 'BLOQUEIO', solicitante, now, motivoOk, evidenciaOk)
  }

  retornarParaAnalise(solicitante: string, now: Date): void {
    this.exigirStatus('BLOQUEADA')
    this.aplicarTransicao(
      'EM_ANALISE',
      'RETORNO_ANALISE',
      solicitante,
      now,
      'Reavaliação após bloqueio. A carga não foi liberada.',
      null,
    )
  }

  devolverInspecaoParaAnalise(solicitante: string, now: Date): void {
    this.exigirStatus('EM_INSPECAO')
    if (this.props.inspecao) {
      this.props.inspecao.resultado = 'PENDENTE'
      this.props.inspecao.concluidaEm = null
      this.props.inspecao.updatedAt = now
    }

    this.aplicarTransicao(
      'EM_ANALISE',
      'RETORNO_ANALISE',
      solicitante,
      now,
      'Retorno para reanálise. A necessidade de inspeção permanece.',
      null,
    )
  }

  cancelar(motivo: string, solicitante: string, now: Date): void {
    PoliticaTransicaoStatus.assert(this.props.status, 'CANCELADA')
    const motivoOk = textoObrigatorio(motivo, 'Motivo', 1000)
    this.aplicarTransicao('CANCELADA', 'CANCELAMENTO', solicitante, now, motivoOk, null)
  }

  iniciarMovimentacao(solicitante: string, now: Date): void {
    this.exigirStatus('LIBERADA')
    this.aplicarTransicao('EM_MOVIMENTACAO', 'TRANSICAO_STATUS', solicitante, now, null, null)
  }

  finalizar(solicitante: string, now: Date): void {
    this.exigirStatus('EM_MOVIMENTACAO')
    this.aplicarTransicao('FINALIZADA', 'TRANSICAO_STATUS', solicitante, now, null, null)
  }

  anexarDocumento(
    dados: {
      tipo: string
      referencia?: string | null
      obrigatorio: boolean
      validade?: Date | null
    },
    solicitante: string,
    now: Date,
  ): string {
    this.assertNaoTerminal()
    if (typeof dados.obrigatorio !== 'boolean') {
      throw new DomainError('CAMPO_OBRIGATORIO', 'Informe se o documento é obrigatório.')
    }

    const documento: DocumentoSnapshot = {
      id: randomUUID(),
      tipo: textoObrigatorio(dados.tipo, 'Tipo do documento', 80),
      referencia: dados.referencia ? textoObrigatorio(dados.referencia, 'Referência', 80) : null,
      obrigatorio: dados.obrigatorio,
      statusValidacao: 'PENDENTE',
      validade: dados.validade ?? null,
      observacao: null,
      validadoPor: null,
      validadoEm: null,
      createdAt: now,
      updatedAt: now,
    }
    this.props.documentos.push(documento)
    this.registrarEvento({
      acao: 'DOCUMENTO_ANEXADO',
      statusAnterior: this.props.status,
      statusNovo: this.props.status,
      solicitante: solicitanteObrigatorio(solicitante),
      motivo: documento.obrigatorio ? 'obrigatorio' : 'nao_obrigatorio',
      evidencia: documento.tipo,
      ocorridoEm: now,
    })
    return documento.id
  }

  validarDocumento(
    documentoId: string,
    resultado: 'VALIDO' | 'INVALIDO',
    observacao: string | null,
    solicitante: string,
    now: Date,
  ): void {
    this.assertNaoTerminal()
    const ator = solicitanteObrigatorio(solicitante)
    const documento = this.props.documentos.find((item) => item.id === documentoId)
    if (!documento) {
      throw new DomainError('DOCUMENTO_NAO_ENCONTRADO', 'Documento da carga não encontrado.')
    }

    documento.statusValidacao = resultado
    documento.observacao = observacao ? textoObrigatorio(observacao, 'Observação', 1000) : null
    documento.validadoPor = ator
    documento.validadoEm = now
    documento.updatedAt = now
    this.registrarEvento({
      acao: 'DOCUMENTO_VALIDADO',
      statusAnterior: this.props.status,
      statusNovo: this.props.status,
      solicitante: documento.validadoPor,
      motivo: resultado,
      evidencia: documento.tipo,
      ocorridoEm: now,
    })
  }

  transicionar(comando: TransicaoComando): void {
    switch (comando.destino) {
      case 'EM_ANALISE':
        if (this.props.status === 'REGISTRADA') {
          return this.iniciarAnalise(comando.solicitante, comando.now)
        }
        if (this.props.status === 'BLOQUEADA') {
          return this.retornarParaAnalise(comando.solicitante, comando.now)
        }
        if (this.props.status === 'EM_INSPECAO') {
          return this.devolverInspecaoParaAnalise(comando.solicitante, comando.now)
        }
        return PoliticaTransicaoStatus.assert(this.props.status, comando.destino)
      case 'EM_INSPECAO':
        return this.solicitarInspecao(comando.solicitante, comando.now)
      case 'LIBERADA':
        return this.liberar(comando.solicitante, comando.now)
      case 'BLOQUEADA':
        return this.bloquear(comando.motivo ?? '', comando.evidencia ?? null, comando.solicitante, comando.now)
      case 'CANCELADA':
        return this.cancelar(comando.motivo ?? '', comando.solicitante, comando.now)
      case 'EM_MOVIMENTACAO':
        return this.iniciarMovimentacao(comando.solicitante, comando.now)
      case 'FINALIZADA':
        return this.finalizar(comando.solicitante, comando.now)
      case 'REGISTRADA':
        return PoliticaTransicaoStatus.assert(this.props.status, 'REGISTRADA')
      default:
        throw new DomainError('TRANSICAO_NAO_PERMITIDA', 'Status de destino desconhecido.')
    }
  }

  eventosPendentes(): HistoricoSnapshot[] {
    return this.pendentes.map((evento) => ({ ...evento }))
  }

  confirmarPersistencia(): void {
    this.pendentes = []
  }

  snapshot(): CargaSnapshot {
    return structuredClone(this.props)
  }

  private aplicarTransicao(
    destino: StatusCarga,
    acao: AcaoHistorico,
    solicitante: string,
    now: Date,
    motivo: string | null,
    evidencia: string | null,
  ): void {
    const anterior = this.props.status
    PoliticaTransicaoStatus.assert(anterior, destino)
    const ator = solicitanteObrigatorio(solicitante)
    this.props.status = destino
    this.registrarEvento({
      acao,
      statusAnterior: anterior,
      statusNovo: destino,
      solicitante: ator,
      motivo,
      evidencia,
      ocorridoEm: now,
    })
  }

  private registrarEvento(evento: Omit<HistoricoSnapshot, 'id'>): void {
    const completo: HistoricoSnapshot = { id: randomUUID(), ...evento }
    this.props.historico.push(completo)
    this.pendentes.push(completo)
    this.props.updatedAt = evento.ocorridoEm
  }

  private exigirStatus(status: StatusCarga): void {
    if (this.props.status !== status) {
      throw new DomainError(
        'TRANSICAO_NAO_PERMITIDA',
        `Transição de ${this.props.status} para a operação solicitada não é permitida.`,
      )
    }
  }

  private assertNaoTerminal(): void {
    if (this.props.status === 'CANCELADA' || this.props.status === 'FINALIZADA') {
      throw new DomainError('ESTADO_TERMINAL', 'Carga finalizada ou cancelada não pode ser alterada.')
    }
  }
}

function solicitanteObrigatorio(valor: string): string {
  return textoObrigatorio(valor, 'Solicitante', 120)
}
