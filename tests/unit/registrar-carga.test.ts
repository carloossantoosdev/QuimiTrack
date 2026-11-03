import { describe, expect, it } from 'vitest'
import { RegistrarCarga } from '../../src/application/use-cases/cargas'
import { loggerSilencioso } from '../../src/application/logger'
import { ProdutoQuimico } from '../../src/domain/entities/produto-quimico'
import type { CargaQuimica } from '../../src/domain/entities/carga-quimica'
import type { CargaQuimicaRepository } from '../../src/domain/repositories/carga-quimica-repository'
import type { ProdutoQuimicoRepository } from '../../src/domain/repositories/produto-quimico-repository'
import type { StatusCarga } from '../../src/domain/enums'
import { DomainError } from '../../src/domain/errors/domain-error'
import { NotFoundError } from '../../src/application/errors'

class ProdutosMemoria implements ProdutoQuimicoRepository {
  constructor(private readonly produtos: ProdutoQuimico[]) {}

  async save(produto: ProdutoQuimico): Promise<void> {
    this.produtos.push(produto)
  }

  async findById(id: string): Promise<ProdutoQuimico | null> {
    return this.produtos.find((produto) => produto.id === id) ?? null
  }

  async list(): Promise<ProdutoQuimico[]> {
    return this.produtos
  }
}

class CargasMemoria implements CargaQuimicaRepository {
  salvas: CargaQuimica[] = []

  async save(carga: CargaQuimica): Promise<void> {
    this.salvas.push(carga)
  }

  async findById(id: string): Promise<CargaQuimica | null> {
    return this.salvas.find((carga) => carga.id === id) ?? null
  }

  async list(filtro?: { status?: StatusCarga }): Promise<CargaQuimica[]> {
    return this.salvas.filter((carga) => !filtro?.status || carga.status === filtro.status)
  }
}

describe('RegistrarCarga', () => {
  const produto = ProdutoQuimico.criar({
    id: 'produto-1',
    nome: 'Ácido sulfúrico',
    descricao: 'Corrosivo',
    numeroOnu: '1830',
    classeRisco: '8',
    grupoCompatibilidade: 'C',
    status: 'ATIVO',
    now: new Date('2026-10-22T12:00:00.000Z'),
  })

  const entrada = {
    codigo: 'CG-1',
    produtoId: 'produto-1',
    quantidade: 2,
    unidadeMedida: 't',
    origem: 'Santos',
    destino: 'Cubatão',
    responsavelTecnico: { nome: 'Marina Alves', registro: 'CRQ-1' },
    dataEntrada: '2026-10-22',
    solicitante: 'operador',
  }

  it('copia a classificação do produto e não aceita classificação enviada pelo cliente', async () => {
    const cargas = new CargasMemoria()
    const caso = new RegistrarCarga(cargas, new ProdutosMemoria([produto]), loggerSilencioso)
    const criada = await caso.execute(entrada)
    expect(criada.classificacaoRisco).toBe('8')
    expect(cargas.salvas).toHaveLength(1)

    await expect(caso.execute({ ...entrada, codigo: 'CG-2', classificacaoRisco: '3' })).rejects.toBeInstanceOf(
      DomainError,
    )
    expect(cargas.salvas).toHaveLength(1)
  })

  it('não registra carga quando o produto não existe', async () => {
    const cargas = new CargasMemoria()
    const caso = new RegistrarCarga(cargas, new ProdutosMemoria([]), loggerSilencioso)
    await expect(caso.execute(entrada)).rejects.toBeInstanceOf(NotFoundError)
    expect(cargas.salvas).toHaveLength(0)
  })
})
