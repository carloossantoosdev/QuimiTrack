import { randomUUID } from 'node:crypto'
import type { StatusProduto } from '../enums'
import { statusProdutoValido } from '../enums'
import { DomainError } from '../errors/domain-error'
import { textoObrigatorio } from '../text'
import { ClassificacaoDeRisco } from '../value-objects/classificacao-de-risco'

export interface ProdutoSnapshot {
  id: string
  nome: string
  descricao: string
  numeroOnu: string
  classeRisco: string
  grupoCompatibilidade: string
  status: StatusProduto
  createdAt: Date
  updatedAt: Date
}

export interface CriarProdutoDados {
  id?: string
  nome: string
  descricao: string
  numeroOnu: string
  classeRisco: string
  grupoCompatibilidade: string
  status: string
  now: Date
}

export class ProdutoQuimico {
  private constructor(private props: ProdutoSnapshot) {}

  static criar(dados: CriarProdutoDados): ProdutoQuimico {
    if (!statusProdutoValido(dados.status)) {
      throw new DomainError('CAMPO_INVALIDO', 'Status do produto deve ser ATIVO ou INATIVO.')
    }

    const agora = dados.now
    return new ProdutoQuimico({
      id: dados.id ?? randomUUID(),
      nome: textoObrigatorio(dados.nome, 'Nome do produto', 200),
      descricao: textoObrigatorio(dados.descricao, 'Descrição', 2000),
      numeroOnu: textoObrigatorio(dados.numeroOnu, 'Número ONU', 20),
      classeRisco: ClassificacaoDeRisco.criar(dados.classeRisco).valor,
      grupoCompatibilidade: textoObrigatorio(dados.grupoCompatibilidade, 'Grupo de compatibilidade', 40),
      status: dados.status,
      createdAt: agora,
      updatedAt: agora,
    })
  }

  static restaurar(snapshot: ProdutoSnapshot): ProdutoQuimico {
    return new ProdutoQuimico(structuredClone(snapshot))
  }

  get id(): string {
    return this.props.id
  }

  get classeRisco(): string {
    return this.props.classeRisco
  }

  get estaAtivo(): boolean {
    return this.props.status === 'ATIVO'
  }

  atualizar(
    dados: {
      nome: string
      descricao: string
      numeroOnu: string
      classeRisco: string
      grupoCompatibilidade: string
    },
    now: Date,
  ): void {
    this.props.nome = textoObrigatorio(dados.nome, 'Nome do produto', 200)
    this.props.descricao = textoObrigatorio(dados.descricao, 'Descrição', 2000)
    this.props.numeroOnu = textoObrigatorio(dados.numeroOnu, 'Número ONU', 20)
    this.props.classeRisco = ClassificacaoDeRisco.criar(dados.classeRisco).valor
    this.props.grupoCompatibilidade = textoObrigatorio(
      dados.grupoCompatibilidade,
      'Grupo de compatibilidade',
      40,
    )
    this.props.updatedAt = now
  }

  inativar(now: Date): void {
    this.props.status = 'INATIVO'
    this.props.updatedAt = now
  }

  snapshot(): ProdutoSnapshot {
    return structuredClone(this.props)
  }
}
