import type { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { ProdutoQuimico } from '../../domain/entities/produto-quimico'
import type { ProdutoQuimicoRepository } from '../../domain/repositories/produto-quimico-repository'

export class PrismaProdutoQuimicoRepository implements ProdutoQuimicoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(produto: ProdutoQuimico): Promise<void> {
    const snapshot = produto.snapshot()
    await this.prisma.produtoQuimico.upsert({
      where: { id: snapshot.id },
      create: snapshot,
      update: {
        nome: snapshot.nome,
        descricao: snapshot.descricao,
        numeroOnu: snapshot.numeroOnu,
        classeRisco: snapshot.classeRisco,
        grupoCompatibilidade: snapshot.grupoCompatibilidade,
        status: snapshot.status,
        updatedAt: snapshot.updatedAt,
      },
    })
  }

  async findById(id: string): Promise<ProdutoQuimico | null> {
    const row = await this.prisma.produtoQuimico.findUnique({ where: { id } })
    return row ? ProdutoQuimico.restaurar(row) : null
  }

  async list(): Promise<ProdutoQuimico[]> {
    const rows = await this.prisma.produtoQuimico.findMany({ orderBy: { createdAt: 'desc' } })
    return rows.map((row) => ProdutoQuimico.restaurar(row))
  }
}

export function conflitoDeUnicidade(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}
