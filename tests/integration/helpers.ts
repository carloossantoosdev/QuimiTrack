import { afterAll, beforeAll, beforeEach, expect } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../src/presentation/app'
import { carregarEnvLocal } from './setup-env'

carregarEnvLocal()

export interface ContextoApi {
  app: FastifyInstance
}

export async function iniciarApi(): Promise<FastifyInstance> {
  return buildApp()
}

export function registrarLimpeza(app: () => FastifyInstance): void {
  beforeEach(async () => {
    await app().prisma.$executeRawUnsafe(
      'TRUNCATE TABLE historico_cargas, inspecoes, documentos_carga, cargas_quimicas, produtos_quimicos RESTART IDENTITY CASCADE',
    )
  })
}

export async function criarProduto(
  app: FastifyInstance,
  sobrepor: Record<string, unknown> = {},
): Promise<{ id: string; statusCode: number; body: Record<string, unknown> }> {
  const resposta = await app.inject({
    method: 'POST',
    url: '/api/v1/produtos-quimicos',
    payload: {
      nome: 'Ácido sulfúrico',
      descricao: 'Produto corrosivo',
      numeroOnu: '1830',
      classeRisco: '8',
      grupoCompatibilidade: 'C',
      status: 'ATIVO',
      ...sobrepor,
    },
  })

  return { id: resposta.json().id as string, statusCode: resposta.statusCode, body: resposta.json() }
}

export function cargaPayload(produtoId: string, sobrepor: Record<string, unknown> = {}) {
  return {
    codigo: `CG-${Math.random().toString(16).slice(2, 8)}`,
    produtoId,
    quantidade: 12.5,
    unidadeMedida: 't',
    origem: 'Santos',
    destino: 'Cubatão',
    responsavelTecnico: { nome: 'Marina Alves', registro: 'CRQ-12345' },
    dataEntrada: '2026-10-22',
    solicitante: 'operador.portuario',
    ...sobrepor,
  }
}

export async function criarCarga(app: FastifyInstance, produtoId: string, sobrepor: Record<string, unknown> = {}) {
  const resposta = await app.inject({
    method: 'POST',
    url: '/api/v1/cargas-quimicas',
    payload: cargaPayload(produtoId, sobrepor),
  })
  return { statusCode: resposta.statusCode, body: resposta.json() as Record<string, unknown> }
}

export async function transicionar(
  app: FastifyInstance,
  id: string,
  status: string,
  extra: Record<string, unknown> = {},
) {
  const resposta = await app.inject({
    method: 'PATCH',
    url: `/api/v1/cargas-quimicas/${id}/status`,
    payload: { status, solicitante: 'operador.portuario', ...extra },
  })
  return { statusCode: resposta.statusCode, body: resposta.json() as Record<string, unknown> }
}

export async function anexarEValidar(app: FastifyInstance, cargaId: string, validade = '2099-01-01') {
  const anexada = await app.inject({
    method: 'POST',
    url: `/api/v1/cargas-quimicas/${cargaId}/documentos`,
    payload: {
      tipo: 'Ficha de emergência',
      referencia: 'FE-100',
      obrigatorio: true,
      validade,
      solicitante: 'analista.documentacao',
    },
  })
  expect(anexada.statusCode).toBe(201)
  const documentos = anexada.json().documentos as Array<{ id: string }>
  const documentoId = documentos[documentos.length - 1]?.id
  expect(documentoId).toBeTruthy()
  const validada = await app.inject({
    method: 'PATCH',
    url: `/api/v1/cargas-quimicas/${cargaId}/documentos/${documentoId}/validacao`,
    payload: { resultado: 'VALIDO', solicitante: 'analista.documentacao' },
  })
  expect(validada.statusCode).toBe(200)
}

export function usarApi(): { obter: () => FastifyInstance } {
  let app: FastifyInstance
  beforeAll(async () => {
    app = await iniciarApi()
  })
  afterAll(async () => {
    await app.close()
  })
  registrarLimpeza(() => app)
  return { obter: () => app }
}
