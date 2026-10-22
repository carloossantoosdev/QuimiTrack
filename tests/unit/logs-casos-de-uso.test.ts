import { describe, expect, it } from 'vitest'
import { CriarProduto } from '../../src/application/use-cases/produtos'
import { BloquearCarga, LiberarCarga, RegistrarCarga, TransicionarStatus } from '../../src/application/use-cases/cargas'
import type { Logger } from '../../src/application/logger'
import { ProdutoQuimico } from '../../src/domain/entities/produto-quimico'
import { CargaQuimica } from '../../src/domain/entities/carga-quimica'
import type { CargaQuimicaRepository } from '../../src/domain/repositories/carga-quimica-repository'
import type { ProdutoQuimicoRepository } from '../../src/domain/repositories/produto-quimico-repository'
import type { StatusCarga } from '../../src/domain/enums'

function loggerEspiao(): Logger & { mensagens: string[] } {
  const mensagens: string[] = []
  return {
    mensagens,
    info(message) {
      mensagens.push(message)
    },
    warn(message) {
      mensagens.push(message)
    },
    error(message) {
      mensagens.push(message)
    },
  }
}

class ProdutosMemoria implements ProdutoQuimicoRepository {
  itens: ProdutoQuimico[] = []
  async save(produto: ProdutoQuimico): Promise<void> {
    this.itens = this.itens.filter((item) => item.id !== produto.id).concat(produto)
  }
  async findById(id: string): Promise<ProdutoQuimico | null> {
    return this.itens.find((item) => item.id === id) ?? null
  }
  async list(): Promise<ProdutoQuimico[]> {
    return this.itens
  }
}

class CargasMemoria implements CargaQuimicaRepository {
  itens: CargaQuimica[] = []
  async save(carga: CargaQuimica): Promise<void> {
    carga.confirmarPersistencia()
    this.itens = this.itens.filter((item) => item.id !== carga.id).concat(carga)
  }
  async findById(id: string): Promise<CargaQuimica | null> {
    return this.itens.find((item) => item.id === id) ?? null
  }
  async list(filtro?: { status?: StatusCarga }): Promise<CargaQuimica[]> {
    return this.itens.filter((item) => !filtro?.status || item.status === filtro.status)
  }
}

describe('Logs dos casos de uso', () => {
  it('registra criação, registro, mudança de status, bloqueio e liberação', async () => {
    const logger = loggerEspiao()
    const produtos = new ProdutosMemoria()
    const cargas = new CargasMemoria()
    const produto = await new CriarProduto(produtos, logger).execute({
      nome: 'Ácido sulfúrico',
      descricao: 'Corrosivo',
      numeroOnu: '1830',
      classeRisco: '8',
      grupoCompatibilidade: 'C',
      status: 'ATIVO',
    })
    const carga = await new RegistrarCarga(cargas, produtos, logger).execute({
      codigo: 'CG-LOG',
      produtoId: produto.id,
      quantidade: 1,
      unidadeMedida: 't',
      origem: 'Santos',
      destino: 'Cubatão',
      responsavelTecnico: { nome: 'Marina Alves', registro: 'CRQ-1' },
      dataEntrada: '2026-10-22',
      solicitante: 'operador',
    })
    await new TransicionarStatus(cargas, logger).execute(carga.id, {
      status: 'EM_ANALISE',
      solicitante: 'operador',
    })
    await new BloquearCarga(cargas, logger).execute(carga.id, {
      solicitante: 'qualidade',
      motivo: 'risco',
    })
    await new TransicionarStatus(cargas, logger).execute(carga.id, {
      status: 'EM_ANALISE',
      solicitante: 'qualidade',
    })
    const agregada = await cargas.findById(carga.id)
    const documentoId = agregada?.anexarDocumento(
      { tipo: 'Ficha', obrigatorio: true, validade: new Date('2099-01-01T00:00:00.000Z') },
      'analista',
      new Date(),
    )
    agregada?.validarDocumento(documentoId ?? '', 'VALIDO', null, 'analista', new Date())
    if (agregada) {
      await cargas.save(agregada)
    }
    await new LiberarCarga(cargas, logger).execute(carga.id, 'autorizado')

    expect(logger.mensagens).toEqual([
      'Produto químico criado',
      'Carga química registrada',
      'Status da carga alterado',
      'Carga bloqueada',
      'Status da carga alterado',
      'Carga liberada',
    ])
  })
})
