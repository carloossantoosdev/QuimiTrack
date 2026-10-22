# QuimiTrack

API REST para gestão de produtos e cargas químicas em contexto portuário, continuidade da Fase 1 do Tech Challenge FIAP. O enunciado da Fase 2 chama o produto de QuimiPort; este repositório mantém o nome QuimiTrack.

## Descrição

O backend cadastra produtos químicos, registra cargas, controla documentação, inspeção condicional, status e histórico. As regras de transição e de liberação ficam no domínio. A classificação de risco da carga é copiada do produto no momento do registro.

## Contexto

O controle de cargas químicas precisa reunir produto, risco, documentação, responsável técnico e o ciclo de status. A Fase 1 modelou esse domínio. A Fase 2 entrega a primeira API persistente.

## Tecnologias

| Tecnologia | Versão usada | Papel |
|---|---|---|
| Node.js | 24 LTS | Runtime |
| TypeScript | 5.9 | Tipagem estrita |
| Fastify | 5.12 | API REST |
| PostgreSQL | 16 | Banco relacional |
| Prisma | 6.19 | Persistência e migrations |
| Vitest | 3.2 | Testes |
| Swagger | @fastify/swagger 9.9 | OpenAPI |
| Pino | 9.14 | Logs estruturados |
| Docker Compose | — | API e banco |
| GitHub Actions | — | CI sem deploy |

Fastify foi escolhido por ser um framework HTTP enxuto, com validação JSON Schema e integração direta com Swagger e Pino. PostgreSQL representa os relacionamentos entre produto, carga, documento, inspeção e histórico. Prisma fica restrito à infraestrutura.

## Documentação da Fase 1

- [Contexto e domínio](docs/01-contexto-e-dominio.md)
- [Modelagem DDD](docs/02-modelagem-ddd.md)
- [Casos de uso](docs/03-casos-de-uso.md)
- [Regras de negócio](docs/04-regras-de-negocio.md)
- [Arquitetura](docs/05-arquitetura.md)
- [Qualidade](docs/06-qualidade.md)
- [TypeScript](docs/07-typescript.md)
- [Decisões arquiteturais](docs/08-decisoes-arquiteturais.md)
- [Diagrama de domínio](docs/diagrams/01-dominio.md)
- [Fluxo de status da Fase 1](docs/diagrams/02-status-carga.md)
- [Casos de uso](docs/diagrams/03-casos-de-uso.md)
- [Arquitetura](docs/diagrams/04-arquitetura.md)

## Documentação da Fase 2

- [Decisões e conflitos com o enunciado](docs/decisoes-fase-2.md)
- [Modelagem de dados](docs/modelagem-de-dados.md)
- Swagger em `http://localhost:3000/docs` com a API em execução

## Arquitetura

```text
src/domain            entidades, value objects, política de status e contratos
src/application       casos de uso e DTOs
src/infrastructure    Prisma, repositórios e logger
src/presentation      rotas, schemas e erros HTTP
```

O fluxo é Presentation → Application → Domain. A infraestrutura implementa os repositórios. O domínio não importa Fastify nem Prisma. `CargaQuimica` é o Aggregate Root. Status e histórico são gravados na mesma transação.

## Variáveis de ambiente

Copie `.env.example` para `.env`.

```text
DATABASE_URL=postgresql://quimitrack:quimitrack@localhost:5432/quimitrack
PORT=3000
NODE_ENV=development
```

Os valores de exemplo servem apenas ao ambiente local. Não versione um `.env` real.

## Executar localmente

Requisitos: Node.js 24 e um PostgreSQL acessível pela `DATABASE_URL`.

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run dev
```

A API escuta em `http://localhost:3000`. `GET /health` responde `200` quando o banco está acessível e `503` quando não está.

## Executar com Docker

```bash
docker compose up --build
```

O Compose sobe PostgreSQL 16, com volume para os dados, e a API. A imagem inclui o Prisma CLI e o OpenSSL porque aplica `prisma migrate deploy` antes de iniciar o servidor, e o processo roda com o usuário `node`. O healthcheck da API consulta `GET /health`. A API fica em `http://localhost:3000` e a documentação em `http://localhost:3000/docs`.

## Testes

Os testes unitários não usam banco:

```bash
npm test
```

Os testes de integração usam PostgreSQL real. Com o banco do Compose no ar e `DATABASE_URL` definida:

```bash
npm run test:integration
```

`npm run test:all` executa as duas suítes. `npm run build` compila TypeScript e `npm run lint` valida o código.

## Banco de dados

PostgreSQL. As tabelas, chaves e relacionamentos estão em [docs/modelagem-de-dados.md](docs/modelagem-de-dados.md). A migration inicial é `prisma/migrations/20261022000000_init`.

## Endpoints

Prefixo `/api/v1`.

| Método | Caminho | Operação |
|---|---|---|
| POST | `/produtos-quimicos` | Criar produto |
| GET | `/produtos-quimicos` | Listar produtos |
| GET | `/produtos-quimicos/:id` | Consultar produto |
| PUT | `/produtos-quimicos/:id` | Atualizar dados cadastrais |
| PATCH | `/produtos-quimicos/:id/inativar` | Inativar produto |
| POST | `/cargas-quimicas` | Registrar carga |
| GET | `/cargas-quimicas?status=` | Listar cargas, com filtro opcional |
| GET | `/cargas-quimicas/:id` | Consultar carga |
| PATCH | `/cargas-quimicas/:id/status` | Transicionar status pela política do domínio |
| PATCH | `/cargas-quimicas/:id/liberar` | Liberar |
| PATCH | `/cargas-quimicas/:id/bloquear` | Bloquear |
| PATCH | `/cargas-quimicas/:id/cancelar` | Cancelar |
| POST | `/cargas-quimicas/:id/documentos` | Anexar documento |
| PATCH | `/cargas-quimicas/:id/documentos/:documentoId/validacao` | Validar documento |
| POST | `/cargas-quimicas/:id/inspecoes` | Solicitar inspeção |
| PATCH | `/cargas-quimicas/:id/inspecoes/resultado` | Registrar resultado da inspeção |
| GET | `/cargas-quimicas/:id/historico` | Consultar histórico |

Códigos usados: `201` criação, `200` consulta e operação aceita, `400` payload inválido, `422` regra de negócio, `409` conflito ou transição inválida, `404` recurso inexistente, `503` banco indisponível em `GET /health`, `500` erro interno sem stack trace.

Exemplo de produto:

```json
{
  "nome": "Ácido sulfúrico",
  "descricao": "Produto corrosivo usado em processo industrial",
  "numeroOnu": "1830",
  "classeRisco": "8",
  "grupoCompatibilidade": "C",
  "status": "ATIVO"
}
```

Exemplo de carga:

```json
{
  "codigo": "CG-2026-0001",
  "produtoId": "00000000-0000-4000-8000-000000000001",
  "quantidade": 12.5,
  "unidadeMedida": "t",
  "origem": "Santos",
  "destino": "Cubatão",
  "responsavelTecnico": { "nome": "Marina Alves", "registro": "CRQ-12345" },
  "dataEntrada": "2026-10-22",
  "solicitante": "operador.portuario"
}
```

## Decisões de projeto

A separação entre requisito oficial, decisão de projeto e herança da Fase 1 está em [docs/decisoes-fase-2.md](docs/decisoes-fase-2.md). Em resumo:

- A inspeção é obrigatória somente depois de solicitada. O estado e o resultado ficam persistidos.
- Carga bloqueada volta para `EM_ANALISE` para reavaliação e não é liberada nessa transição.
- A documentação obrigatória é calculada pelos documentos persistidos. Não existe lista regulatória de tipos.
- Não há autenticação. O solicitante é informado na operação; status anterior e horário de auditoria são definidos pelo servidor.

## Integrantes

- Carlos Eduardo Santos Silva

## CI

O workflow `.github/workflows/ci.yml` instala dependências, gera o Prisma Client, executa lint, compilação, testes unitários e testes de integração com PostgreSQL. Não há deploy.
