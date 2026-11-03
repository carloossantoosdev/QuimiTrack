import { randomUUID } from 'node:crypto'
import type { ProdutoQuimicoRepository } from '../../domain/repositories/produto-quimico-repository'
import { ProdutoQuimico } from '../../domain/entities/produto-quimico'
import { NotFoundError } from '../errors'
import type { Logger } from '../logger'
import { paraProdutoDto, type ProdutoDto } from '../dtos'

export interface CriarProdutoInput {
  nome: string
  descricao: string
  numeroOnu: string
  classeRisco: string
  grupoCompatibilidade: string
  status: string
}

export interface AtualizarProdutoInput {
  nome: string
  descricao: string
  numeroOnu: string
  classeRisco: string
  grupoCompatibilidade: string
}

export class CriarProduto {
  constructor(
    private readonly produtos: ProdutoQuimicoRepository,
    private readonly logger: Logger,
  ) {}

  async execute(input: CriarProdutoInput): Promise<ProdutoDto> {
    const produto = ProdutoQuimico.criar({ ...input, id: randomUUID(), now: new Date() })
    await this.produtos.save(produto)
    this.logger.info('Produto químico criado', { produtoId: produto.id })
    return paraProdutoDto(produto)
  }
}

export class ListarProdutos {
  constructor(private readonly produtos: ProdutoQuimicoRepository) {}

  async execute(): Promise<ProdutoDto[]> {
    const produtos = await this.produtos.list()
    return produtos.map(paraProdutoDto)
  }
}

export class BuscarProduto {
  constructor(private readonly produtos: ProdutoQuimicoRepository) {}

  async execute(id: string): Promise<ProdutoDto> {
    const produto = await this.produtos.findById(id)
    if (!produto) {
      throw new NotFoundError('Produto químico não encontrado.')
    }
    return paraProdutoDto(produto)
  }
}

export class AtualizarProduto {
  constructor(
    private readonly produtos: ProdutoQuimicoRepository,
    private readonly logger: Logger,
  ) {}

  async execute(id: string, input: AtualizarProdutoInput): Promise<ProdutoDto> {
    const produto = await this.produtos.findById(id)
    if (!produto) {
      throw new NotFoundError('Produto químico não encontrado.')
    }

    produto.atualizar(input, new Date())
    await this.produtos.save(produto)
    this.logger.info('Produto químico atualizado', { produtoId: produto.id })
    return paraProdutoDto(produto)
  }
}

export class InativarProduto {
  constructor(
    private readonly produtos: ProdutoQuimicoRepository,
    private readonly logger: Logger,
  ) {}

  async execute(id: string): Promise<ProdutoDto> {
    const produto = await this.produtos.findById(id)
    if (!produto) {
      throw new NotFoundError('Produto químico não encontrado.')
    }

    produto.inativar(new Date())
    await this.produtos.save(produto)
    this.logger.info('Produto químico inativado', { produtoId: produto.id })
    return paraProdutoDto(produto)
  }
}
