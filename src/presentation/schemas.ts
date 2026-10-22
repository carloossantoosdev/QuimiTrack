import { STATUS_CARGA, STATUS_PRODUTO } from '../domain/enums'

const uuid = {
  type: 'string',
  pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
}
const data = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
const dataHora = { type: 'string' }

export const erroSchema = {
  type: 'object',
  required: ['code', 'message'],
  properties: {
    code: { type: 'string' },
    message: { type: 'string' },
    details: { type: 'array', items: { type: 'string' } },
  },
} as const

const respostasDeErro = {
  400: erroSchema,
  404: erroSchema,
  409: erroSchema,
  422: erroSchema,
  500: erroSchema,
}

export const produtoSchema = {
  type: 'object',
  required: [
    'id',
    'nome',
    'descricao',
    'numeroOnu',
    'classeRisco',
    'grupoCompatibilidade',
    'status',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    id: uuid,
    nome: { type: 'string' },
    descricao: { type: 'string' },
    numeroOnu: { type: 'string' },
    classeRisco: { type: 'string' },
    grupoCompatibilidade: { type: 'string' },
    status: { type: 'string', enum: STATUS_PRODUTO },
    createdAt: dataHora,
    updatedAt: dataHora,
  },
} as const

export const documentoSchema = {
  type: 'object',
  required: ['id', 'tipo', 'obrigatorio', 'statusValidacao', 'createdAt', 'updatedAt'],
  properties: {
    id: uuid,
    tipo: { type: 'string' },
    referencia: { type: 'string', nullable: true },
    obrigatorio: { type: 'boolean' },
    statusValidacao: { type: 'string', enum: ['PENDENTE', 'VALIDO', 'INVALIDO'] },
    validade: { ...data, nullable: true },
    observacao: { type: 'string', nullable: true },
    validadoPor: { type: 'string', nullable: true },
    validadoEm: { ...dataHora, nullable: true },
    createdAt: dataHora,
    updatedAt: dataHora,
  },
} as const

export const inspecaoSchema = {
  type: 'object',
  required: ['id', 'resultado', 'solicitadaEm', 'createdAt', 'updatedAt'],
  properties: {
    id: uuid,
    resultado: { type: 'string', enum: ['PENDENTE', 'APROVADA', 'REPROVADA'] },
    observacao: { type: 'string', nullable: true },
    solicitadaEm: dataHora,
    concluidaEm: { ...dataHora, nullable: true },
    createdAt: dataHora,
    updatedAt: dataHora,
  },
} as const

export const cargaSchema = {
  type: 'object',
  required: [
    'id',
    'codigo',
    'produtoId',
    'quantidade',
    'unidadeMedida',
    'origem',
    'destino',
    'responsavelTecnico',
    'classificacaoRisco',
    'status',
    'inspecaoNecessaria',
    'documentacaoObrigatoriaAtendida',
    'dataEntrada',
    'documentos',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    id: uuid,
    codigo: { type: 'string' },
    produtoId: uuid,
    quantidade: { type: 'number' },
    unidadeMedida: { type: 'string' },
    origem: { type: 'string' },
    destino: { type: 'string' },
    responsavelTecnico: {
      type: 'object',
      required: ['nome', 'registro'],
      properties: {
        nome: { type: 'string' },
        registro: { type: 'string' },
      },
    },
    classificacaoRisco: { type: 'string' },
    status: { type: 'string', enum: STATUS_CARGA },
    inspecaoNecessaria: { type: 'boolean' },
    documentacaoObrigatoriaAtendida: { type: 'boolean' },
    dataEntrada: data,
    documentos: { type: 'array', items: documentoSchema },
    inspecao: { anyOf: [inspecaoSchema, { type: 'null' }] },
    createdAt: dataHora,
    updatedAt: dataHora,
  },
} as const

export const historicoSchema = {
  type: 'object',
  required: ['id', 'cargaId', 'acao', 'solicitante', 'ocorridoEm'],
  properties: {
    id: uuid,
    cargaId: uuid,
    acao: { type: 'string' },
    statusAnterior: { anyOf: [{ type: 'string', enum: [...STATUS_CARGA] }, { type: 'null' }] },
    statusNovo: { anyOf: [{ type: 'string', enum: [...STATUS_CARGA] }, { type: 'null' }] },
    solicitante: { type: 'string' },
    motivo: { type: 'string', nullable: true },
    evidencia: { type: 'string', nullable: true },
    ocorridoEm: dataHora,
  },
} as const

const solicitante = { type: 'string', minLength: 1, maxLength: 120 }
const motivo = { type: 'string', minLength: 1, maxLength: 1000 }

export const schemas = {
  criarProduto: {
    tags: ['Produtos químicos'],
    summary: 'Cria um produto químico',
    body: {
      type: 'object',
      additionalProperties: false,
      required: ['nome', 'descricao', 'numeroOnu', 'classeRisco', 'grupoCompatibilidade', 'status'],
      properties: {
        nome: { type: 'string', minLength: 1, maxLength: 200 },
        descricao: { type: 'string', minLength: 1, maxLength: 2000 },
        numeroOnu: { type: 'string', minLength: 1, maxLength: 20 },
        classeRisco: { type: 'string', minLength: 1, maxLength: 40 },
        grupoCompatibilidade: { type: 'string', minLength: 1, maxLength: 40 },
        status: { type: 'string', enum: STATUS_PRODUTO },
      },
      examples: [
        {
          nome: 'Ácido sulfúrico',
          descricao: 'Produto corrosivo usado em processo industrial',
          numeroOnu: '1830',
          classeRisco: '8',
          grupoCompatibilidade: 'C',
          status: 'ATIVO',
        },
      ],
    },
    response: { 201: produtoSchema, ...respostasDeErro },
  },
  listarProdutos: {
    tags: ['Produtos químicos'],
    summary: 'Lista produtos químicos',
    response: { 200: { type: 'array', items: produtoSchema } },
  },
  buscarProduto: {
    tags: ['Produtos químicos'],
    summary: 'Consulta um produto químico pelo identificador',
    params: { type: 'object', required: ['id'], properties: { id: uuid } },
    response: { 200: produtoSchema, ...respostasDeErro },
  },
  atualizarProduto: {
    tags: ['Produtos químicos'],
    summary: 'Atualiza os dados cadastrais do produto sem alterar o status',
    params: { type: 'object', required: ['id'], properties: { id: uuid } },
    body: {
      type: 'object',
      additionalProperties: false,
      required: ['nome', 'descricao', 'numeroOnu', 'classeRisco', 'grupoCompatibilidade'],
      properties: {
        nome: { type: 'string', minLength: 1, maxLength: 200 },
        descricao: { type: 'string', minLength: 1, maxLength: 2000 },
        numeroOnu: { type: 'string', minLength: 1, maxLength: 20 },
        classeRisco: { type: 'string', minLength: 1, maxLength: 40 },
        grupoCompatibilidade: { type: 'string', minLength: 1, maxLength: 40 },
      },
    },
    response: { 200: produtoSchema, ...respostasDeErro },
  },
  inativarProduto: {
    tags: ['Produtos químicos'],
    summary: 'Inativa um produto químico',
    params: { type: 'object', required: ['id'], properties: { id: uuid } },
    response: { 200: produtoSchema, ...respostasDeErro },
  },
  registrarCarga: {
    tags: ['Cargas químicas'],
    summary: 'Registra uma carga química em REGISTRADA',
    description:
      'A classificação de risco é copiada do produto. O cliente não envia classificação, status nem documentação válida.',
    body: {
      type: 'object',
      additionalProperties: false,
      required: [
        'codigo',
        'produtoId',
        'quantidade',
        'unidadeMedida',
        'origem',
        'destino',
        'responsavelTecnico',
        'dataEntrada',
        'solicitante',
      ],
      properties: {
        codigo: { type: 'string', minLength: 1, maxLength: 60 },
        produtoId: uuid,
        quantidade: {
          type: 'number',
          description:
            'Maior que zero, com no máximo três casas decimais, dentro de decimal(14,3). O domínio rejeita o valor inválido com HTTP 422.',
        },
        unidadeMedida: { type: 'string', minLength: 1, maxLength: 20 },
        origem: { type: 'string', minLength: 1, maxLength: 160 },
        destino: { type: 'string', minLength: 1, maxLength: 160 },
        responsavelTecnico: {
          type: 'object',
          additionalProperties: false,
          required: ['nome', 'registro'],
          properties: {
            nome: { type: 'string', minLength: 1, maxLength: 160 },
            registro: { type: 'string', minLength: 1, maxLength: 60 },
          },
        },
        dataEntrada: data,
        solicitante: solicitante,
      },
      examples: [
        {
          codigo: 'CG-2026-0001',
          produtoId: '00000000-0000-4000-8000-000000000001',
          quantidade: 12.5,
          unidadeMedida: 't',
          origem: 'Santos',
          destino: 'Cubatão',
          responsavelTecnico: { nome: 'Marina Alves', registro: 'CRQ-12345' },
          dataEntrada: '2026-10-22',
          solicitante: 'operador.portuario',
        },
      ],
    },
    response: { 201: cargaSchema, ...respostasDeErro },
  },
  listarCargas: {
    tags: ['Cargas químicas'],
    summary: 'Lista cargas químicas, com filtro opcional por status',
    querystring: {
      type: 'object',
      additionalProperties: false,
      properties: { status: { type: 'string', enum: STATUS_CARGA } },
    },
    response: { 200: { type: 'array', items: cargaSchema }, 400: erroSchema },
  },
  buscarCarga: {
    tags: ['Cargas químicas'],
    summary: 'Consulta uma carga química pelo identificador',
    params: { type: 'object', required: ['id'], properties: { id: uuid } },
    response: { 200: cargaSchema, ...respostasDeErro },
  },
  historico: {
    tags: ['Cargas químicas'],
    summary: 'Consulta o histórico auditável da carga',
    params: { type: 'object', required: ['id'], properties: { id: uuid } },
    response: { 200: { type: 'array', items: historicoSchema }, ...respostasDeErro },
  },
  anexarDocumento: {
    tags: ['Cargas químicas'],
    summary: 'Anexa um documento à carga',
    description:
      'O documento nasce PENDENTE. O campo obrigatorio qualifica o documento e não libera a carga. Não há lista regulatória de tipos.',
    params: { type: 'object', required: ['id'], properties: { id: uuid } },
    body: {
      type: 'object',
      additionalProperties: false,
      required: ['tipo', 'obrigatorio', 'solicitante'],
      properties: {
        tipo: { type: 'string', minLength: 1, maxLength: 80 },
        referencia: { type: 'string', minLength: 1, maxLength: 80 },
        obrigatorio: { type: 'boolean' },
        validade: data,
        solicitante: solicitante,
      },
      examples: [
        {
          tipo: 'Ficha de emergência',
          referencia: 'FE-100',
          obrigatorio: true,
          validade: '2027-01-31',
          solicitante: 'analista.documentacao',
        },
      ],
    },
    response: { 201: cargaSchema, ...respostasDeErro },
  },
  validarDocumento: {
    tags: ['Cargas químicas'],
    summary: 'Registra o resultado da validação de um documento',
    description: 'Somente este caso de uso altera o status de validação. A operação não muda o status da carga.',
    params: {
      type: 'object',
      required: ['id', 'documentoId'],
      properties: { id: uuid, documentoId: uuid },
    },
    body: {
      type: 'object',
      additionalProperties: false,
      required: ['resultado', 'solicitante'],
      properties: {
        resultado: { type: 'string', enum: ['VALIDO', 'INVALIDO'] },
        observacao: { type: 'string', maxLength: 1000 },
        solicitante: solicitante,
      },
    },
    response: { 200: cargaSchema, ...respostasDeErro },
  },
  solicitarInspecao: {
    tags: ['Cargas químicas'],
    summary: 'Solicita inspeção e marca a necessidade no estado persistido',
    params: { type: 'object', required: ['id'], properties: { id: uuid } },
    body: {
      type: 'object',
      additionalProperties: false,
      required: ['solicitante'],
      properties: { solicitante },
    },
    response: { 200: cargaSchema, ...respostasDeErro },
  },
  resultadoInspecao: {
    tags: ['Cargas químicas'],
    summary: 'Registra o resultado da inspeção em andamento',
    params: { type: 'object', required: ['id'], properties: { id: uuid } },
    body: {
      type: 'object',
      additionalProperties: false,
      required: ['resultado', 'solicitante'],
      properties: {
        resultado: { type: 'string', enum: ['APROVADA', 'REPROVADA'] },
        observacao: { type: 'string', maxLength: 1000 },
        solicitante: solicitante,
      },
    },
    response: { 200: cargaSchema, ...respostasDeErro },
  },
  liberar: {
    tags: ['Cargas químicas'],
    summary: 'Libera a carga se documentação e inspeção exigida estiverem satisfeitas',
    params: { type: 'object', required: ['id'], properties: { id: uuid } },
    body: {
      type: 'object',
      additionalProperties: false,
      required: ['solicitante'],
      properties: { solicitante },
    },
    response: { 200: cargaSchema, ...respostasDeErro },
  },
  bloquear: {
    tags: ['Cargas químicas'],
    summary: 'Bloqueia a carga',
    params: { type: 'object', required: ['id'], properties: { id: uuid } },
    body: {
      type: 'object',
      additionalProperties: false,
      required: ['solicitante', 'motivo'],
      properties: { solicitante, motivo, evidencia: { type: 'string', minLength: 1, maxLength: 1000 } },
    },
    response: { 200: cargaSchema, ...respostasDeErro },
  },
  cancelar: {
    tags: ['Cargas químicas'],
    summary: 'Cancela a carga',
    params: { type: 'object', required: ['id'], properties: { id: uuid } },
    body: {
      type: 'object',
      additionalProperties: false,
      required: ['solicitante', 'motivo'],
      properties: { solicitante, motivo },
    },
    response: { 200: cargaSchema, ...respostasDeErro },
  },
  transicionar: {
    tags: ['Cargas químicas'],
    summary: 'Solicita uma transição de status pela política central do domínio',
    description:
      'O status anterior, o horário e o ator de auditoria são definidos pelo servidor. Motivo é obrigatório para bloqueio e cancelamento.',
    params: { type: 'object', required: ['id'], properties: { id: uuid } },
    body: {
      type: 'object',
      additionalProperties: false,
      required: ['status', 'solicitante'],
      properties: {
        status: { type: 'string', enum: STATUS_CARGA },
        solicitante,
        motivo,
        evidencia: { type: 'string', minLength: 1, maxLength: 1000 },
      },
    },
    response: { 200: cargaSchema, ...respostasDeErro },
  },
}
