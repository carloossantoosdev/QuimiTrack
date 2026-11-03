import Fastify, { type FastifyInstance } from 'fastify'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { PrismaClient } from '@prisma/client'
import type { Logger } from '../application/logger'
import { loggerSilencioso } from '../application/logger'
import {
  AtualizarProduto,
  BuscarProduto,
  CriarProduto,
  InativarProduto,
  ListarProdutos,
} from '../application/use-cases/produtos'
import {
  AnexarDocumento,
  BloquearCarga,
  BuscarCarga,
  CancelarCarga,
  ConsultarHistorico,
  LiberarCarga,
  ListarCargas,
  RegistrarCarga,
  RegistrarResultadoInspecao,
  SolicitarInspecao,
  TransicionarStatus,
  ValidarDocumento,
} from '../application/use-cases/cargas'
import { criarLogger } from '../infrastructure/logging/pino-logger'
import { PrismaCargaQuimicaRepository } from '../infrastructure/repositories/prisma-carga-repository'
import { PrismaProdutoQuimicoRepository } from '../infrastructure/repositories/prisma-produto-repository'
import { tratarErro } from './errors/tratar-erro'
import { schemas } from './schemas'

export interface BuildAppOptions {
  prisma?: PrismaClient
  logger?: Logger
  habilitarLogHttp?: boolean
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const prisma = options.prisma ?? new PrismaClient()
  const logger = options.logger ?? (options.habilitarLogHttp ? criarLogger() : loggerSilencioso)
  const app = Fastify({
    logger: options.habilitarLogHttp
      ? { level: process.env.LOG_LEVEL ?? 'info', redact: ['req.headers.authorization'] }
      : false,
    ajv: {
      customOptions: {
        strict: false,
        removeAdditional: false,
      },
    },
  })

  app.decorate('prisma', prisma)
  app.addHook('onClose', async () => {
    await prisma.$disconnect()
  })

  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'QuimiTrack API',
        version: '1.0.0',
        description: [
          'API de gestão de produtos e cargas químicas.',
          'O status da carga só muda por transições permitidas no domínio.',
          'A liberação exige documentos obrigatórios válidos e, quando a inspeção foi solicitada, resultado aprovado.',
          'A classificação de risco da carga é copiada do produto no registro.',
          'Status e histórico são gravados na mesma transação.',
        ].join(' '),
      },
      tags: [{ name: 'Produtos químicos' }, { name: 'Cargas químicas' }, { name: 'Operação' }],
    },
  })
  await app.register(fastifySwaggerUi, { routePrefix: '/docs' })

  app.setErrorHandler((error, _request, reply) => {
    const resposta = tratarErro(error, logger)
    return reply.status(resposta.statusCode).send(resposta.body)
  })

  app.get('/health', {
    schema: {
      tags: ['Operação'],
      summary: 'Verifica se a API alcança o banco',
      response: {
        200: {
          type: 'object',
          required: ['status', 'servico'],
          properties: { status: { type: 'string' }, servico: { type: 'string' } },
        },
        503: {
          type: 'object',
          required: ['status', 'servico'],
          properties: { status: { type: 'string' }, servico: { type: 'string' } },
        },
      },
    },
  }, async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      return { status: 'ok', servico: 'quimitrack' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'falha desconhecida'
      logger.error('Healthcheck sem acesso ao banco', { message })
      return reply.code(503).send({ status: 'indisponivel', servico: 'quimitrack' })
    }
  })

  const produtos = new PrismaProdutoQuimicoRepository(prisma)
  const cargas = new PrismaCargaQuimicaRepository(prisma)
  const criarProduto = new CriarProduto(produtos, logger)
  const listarProdutos = new ListarProdutos(produtos)
  const buscarProduto = new BuscarProduto(produtos)
  const atualizarProduto = new AtualizarProduto(produtos, logger)
  const inativarProduto = new InativarProduto(produtos, logger)
  const registrarCarga = new RegistrarCarga(cargas, produtos, logger)
  const listarCargas = new ListarCargas(cargas)
  const buscarCarga = new BuscarCarga(cargas)
  const consultarHistorico = new ConsultarHistorico(cargas)
  const anexarDocumento = new AnexarDocumento(cargas, logger)
  const validarDocumento = new ValidarDocumento(cargas, logger)
  const solicitarInspecao = new SolicitarInspecao(cargas, logger)
  const registrarResultado = new RegistrarResultadoInspecao(cargas, logger)
  const liberarCarga = new LiberarCarga(cargas, logger)
  const bloquearCarga = new BloquearCarga(cargas, logger)
  const cancelarCarga = new CancelarCarga(cargas, logger)
  const transicionarStatus = new TransicionarStatus(cargas, logger)

  app.post('/api/v1/produtos-quimicos', { schema: schemas.criarProduto }, async (request, reply) => {
    const produto = await criarProduto.execute(request.body as never)
    return reply.code(201).send(produto)
  })
  app.get('/api/v1/produtos-quimicos', { schema: schemas.listarProdutos }, async () => listarProdutos.execute())
  app.get('/api/v1/produtos-quimicos/:id', { schema: schemas.buscarProduto }, async (request) => {
    const { id } = request.params as { id: string }
    return buscarProduto.execute(id)
  })
  app.put('/api/v1/produtos-quimicos/:id', { schema: schemas.atualizarProduto }, async (request) => {
    const { id } = request.params as { id: string }
    return atualizarProduto.execute(id, request.body as never)
  })
  app.patch('/api/v1/produtos-quimicos/:id/inativar', { schema: schemas.inativarProduto }, async (request) => {
    const { id } = request.params as { id: string }
    return inativarProduto.execute(id)
  })

  app.post('/api/v1/cargas-quimicas', { schema: schemas.registrarCarga }, async (request, reply) => {
    const carga = await registrarCarga.execute(request.body as never)
    return reply.code(201).send(carga)
  })
  app.get('/api/v1/cargas-quimicas', { schema: schemas.listarCargas }, async (request) => {
    const { status } = request.query as { status?: string }
    return listarCargas.execute(status)
  })
  app.get('/api/v1/cargas-quimicas/:id', { schema: schemas.buscarCarga }, async (request) => {
    const { id } = request.params as { id: string }
    return buscarCarga.execute(id)
  })
  app.get('/api/v1/cargas-quimicas/:id/historico', { schema: schemas.historico }, async (request) => {
    const { id } = request.params as { id: string }
    return consultarHistorico.execute(id)
  })
  app.post('/api/v1/cargas-quimicas/:id/documentos', { schema: schemas.anexarDocumento }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const carga = await anexarDocumento.execute(id, request.body as never)
    return reply.code(201).send(carga)
  })
  app.patch(
    '/api/v1/cargas-quimicas/:id/documentos/:documentoId/validacao',
    { schema: schemas.validarDocumento },
    async (request) => {
      const { id, documentoId } = request.params as { id: string; documentoId: string }
      return validarDocumento.execute(id, documentoId, request.body as never)
    },
  )
  app.post('/api/v1/cargas-quimicas/:id/inspecoes', { schema: schemas.solicitarInspecao }, async (request) => {
    const { id } = request.params as { id: string }
    const { solicitante } = request.body as { solicitante: string }
    return solicitarInspecao.execute(id, solicitante)
  })
  app.patch('/api/v1/cargas-quimicas/:id/inspecoes/resultado', { schema: schemas.resultadoInspecao }, async (request) => {
    const { id } = request.params as { id: string }
    return registrarResultado.execute(id, request.body as never)
  })
  app.patch('/api/v1/cargas-quimicas/:id/liberar', { schema: schemas.liberar }, async (request) => {
    const { id } = request.params as { id: string }
    const { solicitante } = request.body as { solicitante: string }
    return liberarCarga.execute(id, solicitante)
  })
  app.patch('/api/v1/cargas-quimicas/:id/bloquear', { schema: schemas.bloquear }, async (request) => {
    const { id } = request.params as { id: string }
    return bloquearCarga.execute(id, request.body as never)
  })
  app.patch('/api/v1/cargas-quimicas/:id/cancelar', { schema: schemas.cancelar }, async (request) => {
    const { id } = request.params as { id: string }
    return cancelarCarga.execute(id, request.body as never)
  })
  app.patch('/api/v1/cargas-quimicas/:id/status', { schema: schemas.transicionar }, async (request) => {
    const { id } = request.params as { id: string }
    return transicionarStatus.execute(id, request.body as never)
  })

  return app
}

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}
