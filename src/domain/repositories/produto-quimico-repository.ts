import type { ProdutoQuimico } from '../entities/produto-quimico'

export interface ProdutoQuimicoRepository {
  save(produto: ProdutoQuimico): Promise<void>
  findById(id: string): Promise<ProdutoQuimico | null>
  list(): Promise<ProdutoQuimico[]>
}
