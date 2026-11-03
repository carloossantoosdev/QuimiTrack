import { describe, expect, it } from 'vitest'
import {
  anexarEValidar,
  criarCarga,
  criarProduto,
  transicionar,
  usarApi,
} from './helpers'

const api = usarApi()

describe('API QuimiTrack', () => {
  it('cadastra produto válido e persiste os campos oficiais', async () => {
    const app = api.obter()
    const criado = await criarProduto(app)
    expect(criado.statusCode).toBe(201)
    const salvo = await app.prisma.produtoQuimico.findUnique({ where: { id: criado.id } })
    expect(salvo).toMatchObject({
      nome: 'Ácido sulfúrico',
      descricao: 'Produto corrosivo',
      numeroOnu: '1830',
      classeRisco: '8',
      grupoCompatibilidade: 'C',
      status: 'ATIVO',
    })

    const lista = await app.inject({ method: 'GET', url: '/api/v1/produtos-quimicos' })
    expect(lista.statusCode).toBe(200)
    expect(lista.json()).toHaveLength(1)

    const consulta = await app.inject({ method: 'GET', url: `/api/v1/produtos-quimicos/${criado.id}` })
    expect(consulta.statusCode).toBe(200)
    expect(consulta.json().id).toBe(criado.id)
  })

  it('rejeita produto sem nome, sem classe de risco ou com status inválido sem persistir', async () => {
    const app = api.obter()
    const semNome = await criarProduto(app, { nome: '' })
    const semClasse = await criarProduto(app, { classeRisco: '' })
    const statusInvalido = await criarProduto(app, { status: 'SUSPENSO' })
    expect(semNome.statusCode).toBe(400)
    expect(semClasse.statusCode).toBe(400)
    expect(statusInvalido.statusCode).toBe(400)
    expect(await app.prisma.produtoQuimico.count()).toBe(0)
  })

  it('atualiza o produto, inativa e impede nova carga', async () => {
    const app = api.obter()
    const produto = await criarProduto(app)
    const carga = await criarCarga(app, produto.id, { codigo: 'CG-ANTES' })
    expect(carga.statusCode).toBe(201)
    expect(carga.body.classificacaoRisco).toBe('8')

    const atualizado = await app.inject({
      method: 'PUT',
      url: `/api/v1/produtos-quimicos/${produto.id}`,
      payload: {
        nome: 'Ácido sulfúrico concentrado',
        descricao: 'Nova descrição',
        numeroOnu: '1830',
        classeRisco: '9',
        grupoCompatibilidade: 'C',
      },
    })
    expect(atualizado.statusCode).toBe(200)
    const cargaAntiga = await app.prisma.cargaQuimica.findUnique({ where: { id: carga.body.id as string } })
    expect(cargaAntiga?.classificacaoRisco).toBe('8')

    const inativado = await app.inject({
      method: 'PATCH',
      url: `/api/v1/produtos-quimicos/${produto.id}/inativar`,
    })
    expect(inativado.statusCode).toBe(200)
    expect(inativado.json().status).toBe('INATIVO')

    const rejeitada = await criarCarga(app, produto.id, { codigo: 'CG-DEPOIS' })
    expect(rejeitada.statusCode).toBe(422)
    expect(rejeitada.body.code).toBe('PRODUTO_INATIVO')
    expect(await app.prisma.cargaQuimica.count()).toBe(1)
  })

  it('registra carga válida e rejeita quantidade, campos ausentes e código duplicado', async () => {
    const app = api.obter()
    const produto = await criarProduto(app)
    const criada = await criarCarga(app, produto.id, { codigo: 'CG-OK' })
    expect(criada.statusCode).toBe(201)
    expect(criada.body.status).toBe('REGISTRADA')
    const salva = await app.prisma.cargaQuimica.findUnique({
      where: { id: criada.body.id as string },
      include: { historico: true },
    })
    expect(salva).toMatchObject({
      codigo: 'CG-OK',
      quantidade: expect.anything(),
      unidadeMedida: 't',
      origem: 'Santos',
      destino: 'Cubatão',
      responsavelNome: 'Marina Alves',
      classificacaoRisco: '8',
      status: 'REGISTRADA',
    })
    expect(Number(salva?.quantidade)).toBe(12.5)
    expect(salva?.historico).toHaveLength(1)
    expect(salva?.historico[0]?.statusAnterior).toBeNull()
    expect(salva?.historico[0]?.solicitante).toBe('operador.portuario')

    const zero = await criarCarga(app, produto.id, { quantidade: 0 })
    const negativa = await criarCarga(app, produto.id, { quantidade: -2 })
    expect(zero.body.code).toBe('QUANTIDADE_INVALIDA')
    expect(negativa.body.code).toBe('QUANTIDADE_INVALIDA')
    const semResponsavel = await app.inject({
      method: 'POST',
      url: '/api/v1/cargas-quimicas',
      payload: {
        codigo: 'CG-SEM',
        produtoId: produto.id,
        quantidade: 1,
        unidadeMedida: 't',
        origem: 'Santos',
        destino: 'Cubatão',
        dataEntrada: '2026-10-22',
        solicitante: 'operador.portuario',
      },
    })
    expect(zero.statusCode).toBe(422)
    expect(negativa.statusCode).toBe(422)
    expect(semResponsavel.statusCode).toBe(400)

    const duplicada = await criarCarga(app, produto.id, { codigo: 'CG-OK' })
    expect(duplicada.statusCode).toBe(409)
    expect(await app.prisma.cargaQuimica.count()).toBe(1)
  })

  it('persiste 1.250 e recusa quantidades fora da escala sem criar carga', async () => {
    const app = api.obter()
    const produto = await criarProduto(app)
    const valida = await criarCarga(app, produto.id, { codigo: 'CG-1250', quantidade: 1.25 })
    expect(valida.statusCode).toBe(201)
    expect(valida.body.quantidade).toBe(1.25)
    const salva = await app.prisma.cargaQuimica.findUnique({ where: { codigo: 'CG-1250' } })
    expect(salva?.quantidade.toFixed(3)).toBe('1.250')

    const alemDaEscala = await criarCarga(app, produto.id, { quantidade: 1.2345 })
    const arredondariaParaZero = await criarCarga(app, produto.id, { quantidade: 0.0004 })
    expect(alemDaEscala.statusCode).toBe(422)
    expect(alemDaEscala.body.code).toBe('QUANTIDADE_INVALIDA')
    expect(arredondariaParaZero.statusCode).toBe(422)
    expect(arredondariaParaZero.body.code).toBe('QUANTIDADE_INVALIDA')
    expect(await app.prisma.cargaQuimica.count()).toBe(1)
  })

  it('rejeita classificação e documentação enviadas pelo cliente', async () => {
    const app = api.obter()
    const produto = await criarProduto(app)
    const resposta = await criarCarga(app, produto.id, { classificacaoRisco: '3', documentacaoValida: true })
    expect(resposta.statusCode).toBe(400)
    expect(await app.prisma.cargaQuimica.count()).toBe(0)
  })

  it('não libera sem documentação obrigatória válida e mantém o status', async () => {
    const app = api.obter()
    const produto = await criarProduto(app)
    const carga = await criarCarga(app, produto.id)
    const id = carga.body.id as string
    await transicionar(app, id, 'EM_ANALISE')
    const liberacao = await app.inject({
      method: 'PATCH',
      url: `/api/v1/cargas-quimicas/${id}/liberar`,
      payload: { solicitante: 'autorizado', documentacaoValida: true },
    })
    expect(liberacao.statusCode).toBe(400)
    const semBooleano = await app.inject({
      method: 'PATCH',
      url: `/api/v1/cargas-quimicas/${id}/liberar`,
      payload: { solicitante: 'autorizado' },
    })
    expect(semBooleano.statusCode).toBe(422)
    expect(semBooleano.json().code).toBe('LIBERACAO_NEGADA')
    const salva = await app.prisma.cargaQuimica.findUnique({ where: { id } })
    expect(salva?.status).toBe('EM_ANALISE')
  })

  it('não libera inspeção exigida sem aprovação e não permite contorná-la', async () => {
    const app = api.obter()
    const produto = await criarProduto(app)
    const carga = await criarCarga(app, produto.id)
    const id = carga.body.id as string
    await transicionar(app, id, 'EM_ANALISE')
    await anexarEValidar(app, id)
    const solicitada = await app.inject({
      method: 'POST',
      url: `/api/v1/cargas-quimicas/${id}/inspecoes`,
      payload: { solicitante: 'qualidade' },
    })
    expect(solicitada.statusCode).toBe(200)
    expect(solicitada.json().inspecaoNecessaria).toBe(true)
    expect(solicitada.json().inspecao.resultado).toBe('PENDENTE')

    const semResultado = await app.inject({
      method: 'PATCH',
      url: `/api/v1/cargas-quimicas/${id}/liberar`,
      payload: { solicitante: 'autorizado' },
    })
    expect(semResultado.statusCode).toBe(422)

    const reprovada = await app.inject({
      method: 'PATCH',
      url: `/api/v1/cargas-quimicas/${id}/inspecoes/resultado`,
      payload: { resultado: 'REPROVADA', solicitante: 'qualidade' },
    })
    expect(reprovada.statusCode).toBe(200)
    const aindaBloqueada = await app.inject({
      method: 'PATCH',
      url: `/api/v1/cargas-quimicas/${id}/liberar`,
      payload: { solicitante: 'autorizado' },
    })
    expect(aindaBloqueada.statusCode).toBe(422)

    const retorno = await transicionar(app, id, 'EM_ANALISE')
    expect(retorno.statusCode).toBe(200)
    expect(retorno.body.status).toBe('EM_ANALISE')
    const atalho = await app.inject({
      method: 'PATCH',
      url: `/api/v1/cargas-quimicas/${id}/liberar`,
      payload: { solicitante: 'autorizado' },
    })
    expect(atalho.statusCode).toBe(422)
    const persistida = await app.prisma.cargaQuimica.findUnique({ where: { id }, include: { inspecao: true } })
    expect(persistida?.status).toBe('EM_ANALISE')
    expect(persistida?.inspecaoNecessaria).toBe(true)
    expect(persistida?.inspecao?.resultado).toBe('PENDENTE')
  })

  it('percorre o fluxo oficial até a finalização e grava o histórico', async () => {
    const app = api.obter()
    const produto = await criarProduto(app)
    const carga = await criarCarga(app, produto.id, { codigo: 'CG-FLUXO' })
    const id = carga.body.id as string
    expect((await transicionar(app, id, 'EM_ANALISE')).statusCode).toBe(200)
    expect((await transicionar(app, id, 'EM_INSPECAO')).statusCode).toBe(200)
    const resultado = await app.inject({
      method: 'PATCH',
      url: `/api/v1/cargas-quimicas/${id}/inspecoes/resultado`,
      payload: { resultado: 'APROVADA', observacao: 'conforme', solicitante: 'qualidade' },
    })
    expect(resultado.statusCode).toBe(200)
    await anexarEValidar(app, id)
    const liberada = await app.inject({
      method: 'PATCH',
      url: `/api/v1/cargas-quimicas/${id}/liberar`,
      payload: { solicitante: 'autorizado' },
    })
    expect(liberada.statusCode).toBe(200)
    expect(liberada.json().documentacaoObrigatoriaAtendida).toBe(true)
    expect((await transicionar(app, id, 'EM_MOVIMENTACAO')).statusCode).toBe(200)
    expect((await transicionar(app, id, 'FINALIZADA')).statusCode).toBe(200)

    const salva = await app.prisma.cargaQuimica.findUnique({ where: { id }, include: { historico: true, inspecao: true } })
    expect(salva?.status).toBe('FINALIZADA')
    expect(salva?.inspecao?.resultado).toBe('APROVADA')
    expect(salva?.historico).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ statusAnterior: null, statusNovo: 'REGISTRADA', acao: 'REGISTRO' }),
        expect.objectContaining({ statusAnterior: 'REGISTRADA', statusNovo: 'EM_ANALISE' }),
        expect.objectContaining({ statusAnterior: 'EM_ANALISE', statusNovo: 'EM_INSPECAO' }),
        expect.objectContaining({ acao: 'INSPECAO_REGISTRADA', motivo: 'APROVADA' }),
        expect.objectContaining({ statusAnterior: 'EM_INSPECAO', statusNovo: 'LIBERADA' }),
        expect.objectContaining({ statusAnterior: 'LIBERADA', statusNovo: 'EM_MOVIMENTACAO' }),
        expect.objectContaining({ statusAnterior: 'EM_MOVIMENTACAO', statusNovo: 'FINALIZADA' }),
      ]),
    )

    const historico = await app.inject({ method: 'GET', url: `/api/v1/cargas-quimicas/${id}/historico` })
    expect(historico.statusCode).toBe(200)
    expect(historico.json().at(-1).statusNovo).toBe('FINALIZADA')
    expect(historico.json().at(-1).ocorridoEm).toEqual(expect.any(String))
  })

  it('libera sem inspeção quando ela não foi solicitada', async () => {
    const app = api.obter()
    const produto = await criarProduto(app)
    const carga = await criarCarga(app, produto.id)
    const id = carga.body.id as string
    await transicionar(app, id, 'EM_ANALISE')
    await anexarEValidar(app, id)
    const liberada = await app.inject({
      method: 'PATCH',
      url: `/api/v1/cargas-quimicas/${id}/liberar`,
      payload: { solicitante: 'autorizado' },
    })
    expect(liberada.statusCode).toBe(200)
    expect(liberada.json().status).toBe('LIBERADA')
    expect(liberada.json().inspecaoNecessaria).toBe(false)
  })

  it('devolve carga bloqueada para análise e impede movimentação e liberação direta', async () => {
    const app = api.obter()
    const produto = await criarProduto(app)
    const carga = await criarCarga(app, produto.id)
    const id = carga.body.id as string
    await transicionar(app, id, 'EM_ANALISE')
    const bloqueio = await app.inject({
      method: 'PATCH',
      url: `/api/v1/cargas-quimicas/${id}/bloquear`,
      payload: { solicitante: 'qualidade', motivo: 'vazamento', evidencia: 'foto-1' },
    })
    expect(bloqueio.statusCode).toBe(200)
    const movimentar = await transicionar(app, id, 'EM_MOVIMENTACAO')
    expect(movimentar.statusCode).toBe(409)
    const liberar = await app.inject({
      method: 'PATCH',
      url: `/api/v1/cargas-quimicas/${id}/liberar`,
      payload: { solicitante: 'autorizado' },
    })
    expect(liberar.statusCode).toBe(409)
    const retorno = await transicionar(app, id, 'EM_ANALISE')
    expect(retorno.statusCode).toBe(200)
    expect(retorno.body.status).toBe('EM_ANALISE')
    const salva = await app.prisma.cargaQuimica.findUnique({ where: { id }, include: { historico: true } })
    expect(salva?.status).toBe('EM_ANALISE')
    expect(salva?.historico.some((evento) => evento.acao === 'BLOQUEIO' && evento.motivo === 'vazamento')).toBe(true)
    expect(salva?.historico.some((evento) => evento.acao === 'RETORNO_ANALISE' && evento.statusNovo === 'EM_ANALISE')).toBe(
      true,
    )
    expect(salva?.historico.some((evento) => evento.statusNovo === 'LIBERADA')).toBe(false)
  })

  it('cancela a carga e rejeita liberação posterior', async () => {
    const app = api.obter()
    const produto = await criarProduto(app)
    const carga = await criarCarga(app, produto.id)
    const id = carga.body.id as string
    const cancelada = await app.inject({
      method: 'PATCH',
      url: `/api/v1/cargas-quimicas/${id}/cancelar`,
      payload: { solicitante: 'operador.portuario', motivo: 'operação cancelada' },
    })
    expect(cancelada.statusCode).toBe(200)
    const liberar = await app.inject({
      method: 'PATCH',
      url: `/api/v1/cargas-quimicas/${id}/liberar`,
      payload: { solicitante: 'autorizado' },
    })
    expect(liberar.statusCode).toBe(409)
    const salva = await app.prisma.cargaQuimica.findUnique({ where: { id } })
    expect(salva?.status).toBe('CANCELADA')
  })

  it('rejeita transições proibidas e estados terminais sem alterar a persistência', async () => {
    const app = api.obter()
    const produto = await criarProduto(app)
    const carga = await criarCarga(app, produto.id)
    const id = carga.body.id as string
    const finalizacaoDireta = await transicionar(app, id, 'FINALIZADA')
    expect(finalizacaoDireta.statusCode).toBe(409)
    await transicionar(app, id, 'EM_ANALISE')
    await transicionar(app, id, 'EM_INSPECAO')
    const finalizarInspecao = await transicionar(app, id, 'FINALIZADA')
    expect(finalizarInspecao.statusCode).toBe(409)
    const salva = await app.prisma.cargaQuimica.findUnique({ where: { id } })
    expect(salva?.status).toBe('EM_INSPECAO')

    await app.inject({
      method: 'PATCH',
      url: `/api/v1/cargas-quimicas/${id}/inspecoes/resultado`,
      payload: { resultado: 'APROVADA', solicitante: 'qualidade' },
    })
    await anexarEValidar(app, id)
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/cargas-quimicas/${id}/liberar`,
      payload: { solicitante: 'autorizado' },
    })
    const voltarRegistro = await transicionar(app, id, 'REGISTRADA')
    expect(voltarRegistro.statusCode).toBe(409)
    await transicionar(app, id, 'EM_MOVIMENTACAO')
    await transicionar(app, id, 'FINALIZADA')
    const depoisDoFim = await transicionar(app, id, 'CANCELADA', { motivo: 'tarde demais' })
    expect(depoisDoFim.statusCode).toBe(409)
    const final = await app.prisma.cargaQuimica.findUnique({ where: { id } })
    expect(final?.status).toBe('FINALIZADA')
  })

  it('consulta status, recurso inexistente e payload inválido', async () => {
    const app = api.obter()
    const produto = await criarProduto(app)
    await criarCarga(app, produto.id)
    const lista = await app.inject({ method: 'GET', url: '/api/v1/cargas-quimicas?status=REGISTRADA' })
    expect(lista.statusCode).toBe(200)
    expect(lista.json()).toHaveLength(1)
    const statusInvalido = await app.inject({ method: 'GET', url: '/api/v1/cargas-quimicas?status=ENTREGUE' })
    expect(statusInvalido.statusCode).toBe(400)
    const ausente = await app.inject({
      method: 'GET',
      url: '/api/v1/cargas-quimicas/00000000-0000-4000-8000-000000000099',
    })
    expect(ausente.statusCode).toBe(404)
    const produtoAusente = await app.inject({
      method: 'GET',
      url: '/api/v1/produtos-quimicos/00000000-0000-4000-8000-000000000099',
    })
    expect(produtoAusente.statusCode).toBe(404)
    expect(ausente.json().code).toBe('NAO_ENCONTRADO')
    expect(ausente.json().stack).toBeUndefined()
  })

  it('não aceita status anterior, ator ou horário enviados pelo cliente', async () => {
    const app = api.obter()
    const produto = await criarProduto(app)
    const carga = await criarCarga(app, produto.id)
    const resposta = await app.inject({
      method: 'PATCH',
      url: `/api/v1/cargas-quimicas/${carga.body.id}/status`,
      payload: {
        status: 'EM_ANALISE',
        solicitante: 'operador.portuario',
        statusAnterior: 'LIBERADA',
        ator: 'invasor',
        dataHora: '2000-01-01T00:00:00.000Z',
      },
    })
    expect(resposta.statusCode).toBe(400)
    const salva = await app.prisma.cargaQuimica.findUnique({ where: { id: carga.body.id as string } })
    expect(salva?.status).toBe('REGISTRADA')
  })

  it('responde saúde quando o banco está acessível', async () => {
    const app = api.obter()
    const resposta = await app.inject({ method: 'GET', url: '/health' })
    expect(resposta.statusCode).toBe(200)
    expect(resposta.json()).toEqual({ status: 'ok', servico: 'quimitrack' })
  })

  it('expõe a documentação OpenAPI', async () => {
    const app = api.obter()
    const interfaceHttp = await app.inject({ method: 'GET', url: '/docs' })
    expect(interfaceHttp.statusCode).toBe(200)
    expect(String(interfaceHttp.headers['content-type'])).toContain('text/html')
    expect(interfaceHttp.body).toContain('swagger')

    const json = await app.inject({ method: 'GET', url: '/docs/json' })
    expect(json.statusCode).toBe(200)
    const spec = json.json()
    expect(spec.openapi).toBe('3.0.3')
    expect(spec.paths['/api/v1/produtos-quimicos'].post).toBeDefined()
    expect(spec.paths['/api/v1/cargas-quimicas/{id}/liberar'].patch).toBeDefined()
    expect(spec.info.description).toContain('documentos obrigatórios')
  })
})
