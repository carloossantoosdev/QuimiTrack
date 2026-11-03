import type { Prisma, PrismaClient } from '@prisma/client'
import { CargaQuimica, type CargaSnapshot } from '../../domain/entities/carga-quimica'
import type { CargaQuimicaRepository } from '../../domain/repositories/carga-quimica-repository'
import type { StatusCarga } from '../../domain/enums'
import { DomainError } from '../../domain/errors/domain-error'
import { Quantidade } from '../../domain/value-objects/quantidade'
import { conflitoDeUnicidade } from './prisma-produto-repository'

const inclusao = {
  documentos: { orderBy: { createdAt: 'asc' as const } },
  inspecao: true,
  historico: { orderBy: { ocorridoEm: 'asc' as const } },
}

type CargaComRelacoes = Prisma.CargaQuimicaGetPayload<{ include: typeof inclusao }>

export class PrismaCargaQuimicaRepository implements CargaQuimicaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(carga: CargaQuimica): Promise<void> {
    const snapshot = carga.snapshot()
    const eventos = carga.eventosPendentes()

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.cargaQuimica.upsert({
          where: { id: snapshot.id },
          create: dadosCarga(snapshot),
          update: {
            quantidade: Quantidade.criar(snapshot.quantidade).texto,
            unidadeMedida: snapshot.unidadeMedida,
            origem: snapshot.origem,
            destino: snapshot.destino,
            responsavelNome: snapshot.responsavelTecnico.nome,
            responsavelRegistro: snapshot.responsavelTecnico.registro,
            classificacaoRisco: snapshot.classificacaoRisco,
            status: snapshot.status,
            inspecaoNecessaria: snapshot.inspecaoNecessaria,
            dataEntrada: snapshot.dataEntrada,
            updatedAt: snapshot.updatedAt,
          },
        })

        for (const documento of snapshot.documentos) {
          await tx.documentoCarga.upsert({
            where: { id: documento.id },
            create: { ...documento, cargaId: snapshot.id },
            update: {
              tipo: documento.tipo,
              referencia: documento.referencia,
              obrigatorio: documento.obrigatorio,
              statusValidacao: documento.statusValidacao,
              validade: documento.validade,
              observacao: documento.observacao,
              validadoPor: documento.validadoPor,
              validadoEm: documento.validadoEm,
              updatedAt: documento.updatedAt,
            },
          })
        }

        if (snapshot.inspecao) {
          await tx.inspecao.upsert({
            where: { id: snapshot.inspecao.id },
            create: { ...snapshot.inspecao, cargaId: snapshot.id },
            update: {
              resultado: snapshot.inspecao.resultado,
              observacao: snapshot.inspecao.observacao,
              solicitadaEm: snapshot.inspecao.solicitadaEm,
              concluidaEm: snapshot.inspecao.concluidaEm,
              updatedAt: snapshot.inspecao.updatedAt,
            },
          })
        }

        if (eventos.length > 0) {
          await tx.historicoCarga.createMany({
            data: eventos.map((evento) => ({ ...evento, cargaId: snapshot.id })),
          })
        }
      })
    } catch (error) {
      if (conflitoDeUnicidade(error)) {
        throw new DomainError('CONFLITO', 'Já existe uma carga com este código.')
      }
      throw error
    }

    carga.confirmarPersistencia()
  }

  async findById(id: string): Promise<CargaQuimica | null> {
    const row = await this.prisma.cargaQuimica.findUnique({ where: { id }, include: inclusao })
    return row ? CargaQuimica.restaurar(paraSnapshot(row)) : null
  }

  async list(filtro?: { status?: StatusCarga }): Promise<CargaQuimica[]> {
    const rows = await this.prisma.cargaQuimica.findMany({
      where: filtro?.status ? { status: filtro.status } : undefined,
      include: inclusao,
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((row) => CargaQuimica.restaurar(paraSnapshot(row)))
  }
}

function dadosCarga(snapshot: CargaSnapshot) {
  return {
    id: snapshot.id,
    codigo: snapshot.codigo,
    produtoId: snapshot.produtoId,
    quantidade: Quantidade.criar(snapshot.quantidade).texto,
    unidadeMedida: snapshot.unidadeMedida,
    origem: snapshot.origem,
    destino: snapshot.destino,
    responsavelNome: snapshot.responsavelTecnico.nome,
    responsavelRegistro: snapshot.responsavelTecnico.registro,
    classificacaoRisco: snapshot.classificacaoRisco,
    status: snapshot.status,
    inspecaoNecessaria: snapshot.inspecaoNecessaria,
    dataEntrada: snapshot.dataEntrada,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
  }
}

function paraSnapshot(row: CargaComRelacoes): CargaSnapshot {
  return {
    id: row.id,
    codigo: row.codigo,
    produtoId: row.produtoId,
    quantidade: Quantidade.desdePersistencia(row.quantidade.toFixed(3)).valor,
    unidadeMedida: row.unidadeMedida,
    origem: row.origem,
    destino: row.destino,
    responsavelTecnico: { nome: row.responsavelNome, registro: row.responsavelRegistro },
    classificacaoRisco: row.classificacaoRisco,
    status: row.status,
    inspecaoNecessaria: row.inspecaoNecessaria,
    dataEntrada: row.dataEntrada,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    documentos: row.documentos.map((documento) => ({
      id: documento.id,
      tipo: documento.tipo,
      referencia: documento.referencia,
      obrigatorio: documento.obrigatorio,
      statusValidacao: documento.statusValidacao,
      validade: documento.validade,
      observacao: documento.observacao,
      validadoPor: documento.validadoPor,
      validadoEm: documento.validadoEm,
      createdAt: documento.createdAt,
      updatedAt: documento.updatedAt,
    })),
    inspecao: row.inspecao
      ? {
          id: row.inspecao.id,
          resultado: row.inspecao.resultado,
          observacao: row.inspecao.observacao,
          solicitadaEm: row.inspecao.solicitadaEm,
          concluidaEm: row.inspecao.concluidaEm,
          createdAt: row.inspecao.createdAt,
          updatedAt: row.inspecao.updatedAt,
        }
      : null,
    historico: row.historico.map((evento) => ({
      id: evento.id,
      acao: evento.acao as CargaSnapshot['historico'][number]['acao'],
      statusAnterior: evento.statusAnterior,
      statusNovo: evento.statusNovo,
      solicitante: evento.solicitante,
      motivo: evento.motivo,
      evidencia: evento.evidencia,
      ocorridoEm: evento.ocorridoEm,
    })),
  }
}
