import { describe, expect, it } from 'vitest'
import { DomainError } from '../../src/domain/errors/domain-error'
import { ProdutoQuimico } from '../../src/domain/entities/produto-quimico'

const agora = new Date('2026-10-22T12:00:00.000Z')

const dadosProduto = {
  nome: 'Ácido sulfúrico',
  descricao: 'Corrosivo',
  numeroOnu: '1830',
  classeRisco: '8',
  grupoCompatibilidade: 'C',
  status: 'ATIVO',
  now: agora,
}

describe('ProdutoQuimico', () => {
  it('cria um produto válido', () => {
    const produto = ProdutoQuimico.criar(dadosProduto)
    expect(produto.estaAtivo).toBe(true)
    expect(produto.classeRisco).toBe('8')
    expect(produto.snapshot().nome).toBe('Ácido sulfúrico')
  })

  it('rejeita produto sem nome', () => {
    expect(() => ProdutoQuimico.criar({ ...dadosProduto, nome: '  ' })).toThrow(DomainError)
  })

  it('rejeita produto sem classe de risco', () => {
    expect(() => ProdutoQuimico.criar({ ...dadosProduto, classeRisco: '' })).toThrow(DomainError)
  })

  it('rejeita status inválido', () => {
    expect(() => ProdutoQuimico.criar({ ...dadosProduto, status: 'SUSPENSO' })).toThrow(DomainError)
  })

  it('inativa o produto', () => {
    const produto = ProdutoQuimico.criar(dadosProduto)
    produto.inativar(agora)
    expect(produto.estaAtivo).toBe(false)
  })

  it('atualiza dados cadastrais sem reativar um produto inativo', () => {
    const produto = ProdutoQuimico.criar(dadosProduto)
    produto.inativar(agora)
    produto.atualizar({ ...dadosProduto, classeRisco: '9' }, agora)
    expect(produto.classeRisco).toBe('9')
    expect(produto.estaAtivo).toBe(false)
  })
})
