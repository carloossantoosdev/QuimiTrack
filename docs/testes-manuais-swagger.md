# Roteiro de testes manuais pelo Swagger

Validação funcional da Fase 2, executada no Swagger e conferida no DBeaver. Este roteiro descreve o comportamento implementado. Ele não substitui `npm test` nem `npm run test:integration`.

Os exemplos usam códigos `RT-...` e nomes que começam com `RT `. Crie esses registros. Não altere nem inative o produto que já existe no banco.

Não execute `npm run test:integration` neste banco durante o roteiro. A suíte automatizada apaga as linhas de `historico_cargas`, `inspecoes`, `documentos_carga`, `cargas_quimicas` e `produtos_quimicos`.

Marque cada cenário na checklist só depois de ver o HTTP e, quando o cenário pede, a linha no DBeaver. Um cenário não executado permanece "Não executado".

## 1. Preparação

### Ambiente

| Recurso | Endereço |
|---|---|
| API | `http://localhost:3000` |
| Swagger UI | `http://localhost:3000/docs/` |
| OpenAPI | `http://localhost:3000/docs/json` |
| Banco | PostgreSQL do Docker, banco `quimitrack`, em `localhost:5432` |

O `docker compose up` precisa continuar em execução. Sem ele, a API e a porta `5432` ficam indisponíveis.

Confira `GET /health`, na tag **Operação**. Não há corpo. O esperado é `200`:

```json
{ "status": "ok", "servico": "quimitrack" }
```

### Como executar no Swagger

1. Abra a operação.
2. Clique em **Try it out**.
3. Preencha os parâmetros de rota (`id`, `documentoId`) e, na listagem de cargas, o query `status` quando o cenário pedir.
4. No **Request body**, apague o exemplo e cole o JSON do cenário.
5. Clique em **Execute**.
6. Leia **Code** e **Response body**. O erro de contrato tem `code`, `message` e, quando existe, `details`. A resposta não inclui stack trace.

Guarde os identificadores em um bloco de notas:

| Nome | Origem |
|---|---|
| `PRODUTO_FLUXO_ID` | `id` do produto ativo criado no cenário P01 |
| `PRODUTO_INATIVO_ID` | `id` do produto criado já inativo no cenário P06 |
| `CARGA_*_ID` | `id` de cada carga |
| `DOCUMENTO_*_ID` | `documentos[].id` da resposta que anexou o documento |

O `id` é um UUID gerado pelo servidor. Não invente o valor no corpo da criação: a criação de produto e de carga não aceita `id`.

### Como ver os dados no DBeaver

A conexão já usada aponta para `localhost`, porta `5432`, banco `quimitrack`, usuário `quimitrack`.

A aba **Propriedades** mostra colunas. A aba **Dados** mostra as linhas. Para um cenário específico, abra o editor SQL e rode apenas `SELECT`. Não rode `UPDATE`, `DELETE`, `TRUNCATE` nem `DROP`.

Não existe coluna `documentacao_obrigatoria_atendida`. Esse campo é calculado em toda resposta a partir dos documentos persistidos e do relógio do servidor. `classificacao_risco` da carga é coluna própria, copiada no registro.

### Dados e regras que o roteiro respeita

- O produto já cadastrado só pode ser lido. Todo cadastro novo deste roteiro leva o prefixo `RT`.
- `tipo` de documento é texto livre. O projeto não define uma lista regulatória. "Ficha de emergência" é só um exemplo de texto.
- Não há autenticação. `solicitante` é informado pelo cliente e gravado no histórico. O servidor rejeita os campos `ator`, `statusAnterior` e `dataHora`.
- A carga nasce `REGISTRADA` e `inspecaoNecessaria: false`.
- Uma carga não percorre sozinha liberação sem inspeção, bloqueio com reavaliação, reprovação e cancelamento. Cada cenário abaixo indica a carga que deve ser criada.
- Se um `codigo` responder `409` com `CONFLITO`, ele já foi usado. Troque o sufixo e repita só aquele cadastro. Não apague a carga antiga.

### Formato de erro

Validação do schema, antes do domínio:

```json
{
  "code": "PAYLOAD_INVALIDO",
  "message": "Payload inválido.",
  "details": ["mensagens do validador"]
}
```

O texto dentro de `details` vem do validador HTTP. O roteiro fixa o status `400` e o `code`, não a frase exata de cada campo.

Regra de negócio:

```json
{ "code": "CODIGO", "message": "Mensagem do domínio.", "details": ["opcional"] }
```

`details` aparece na liberação negada. Os demais erros de domínio deste projeto trazem `code` e `message`.

| `code` | HTTP |
|---|---|
| `PAYLOAD_INVALIDO` | 400 |
| `NAO_ENCONTRADO` | 404 |
| `DOCUMENTO_NAO_ENCONTRADO` | 404 |
| `CONFLITO` | 409 |
| `TRANSICAO_NAO_PERMITIDA` | 409 |
| `ESTADO_TERMINAL` | 409 |
| `LIBERACAO_NEGADA` | 422 |
| `PRODUTO_INATIVO` | 422 |
| `QUANTIDADE_INVALIDA` | 422 |
| `CAMPO_OBRIGATORIO` | 422 |
| `CAMPO_INVALIDO` | 422 |
| `ERRO_INTERNO` | 500 |

## 2. Cadastro e consulta de produtos químicos

Não há filtro, reativação nem exclusão de produto. `PUT` não aceita `status`. A única mudança de status pela API é `PATCH .../inativar`, que grava `INATIVO`. Chamar de novo a inativação responde `200` e permanece `INATIVO`.

### P01 — Criar produto ativo

`POST /api/v1/produtos-quimicos`

Objetivo: cadastrar o produto usado pelas cargas de fluxo.

```json
{
  "nome": "RT produto fluxo",
  "descricao": "Produto ativo criado pelo roteiro manual",
  "numeroOnu": "1830",
  "classeRisco": "8",
  "grupoCompatibilidade": "C",
  "status": "ATIVO"
}
```

Esperado: `201`. Guarde `id` como `PRODUTO_FLUXO_ID`. A resposta inclui `nome`, `descricao`, `numeroOnu`, `classeRisco` com valor `"8"`, `grupoCompatibilidade`, `status` igual a `ATIVO`, `createdAt` e `updatedAt`.

No DBeaver, aba **Dados** de `produtos_quimicos`, ou:

```sql
SELECT id, nome, numero_onu, classe_risco, grupo_compatibilidade, status
FROM produtos_quimicos
WHERE nome = 'RT produto fluxo';
```

### P02 — Listar produtos

`GET /api/v1/produtos-quimicos`

Sem parâmetros e sem corpo. Esperado: `200` e um array. O produto do P01 e o produto que já existia aparecem. Não há paginação nem filtro nesta rota.

### P03 — Consultar produto por ID

`GET /api/v1/produtos-quimicos/{id}`

Parâmetro `id`: `PRODUTO_FLUXO_ID`. Esperado: `200` e o mesmo produto do P01.

### P04 — Atualizar dados cadastrais

`PUT /api/v1/produtos-quimicos/{id}`

Use `PRODUTO_FLUXO_ID`. O corpo não leva `status`.

```json
{
  "nome": "RT produto fluxo revisado",
  "descricao": "Descricao revisada pelo roteiro manual",
  "numeroOnu": "1830",
  "classeRisco": "8",
  "grupoCompatibilidade": "C"
}
```

Esperado: `200`, `status` continua `ATIVO` e `updatedAt` muda. A classe permanece `"8"` neste passo, para as cargas seguintes copiarem esse valor. A cópia na carga e a troca posterior da classe estão no cenário C02.

```sql
SELECT nome, classe_risco, status, updated_at
FROM produtos_quimicos
WHERE id = 'PRODUTO_FLUXO_ID';
```

### P05 — Rejeitar status no corpo da atualização

Repita o P04 acrescentando `"status": "INATIVO"`. O schema não admite propriedade extra.

Esperado: `400`, `code` igual a `PAYLOAD_INVALIDO`. O status no banco permanece `ATIVO`.

### P06 — Criar produto já inativo

`POST /api/v1/produtos-quimicos`

```json
{
  "nome": "RT produto inativo",
  "descricao": "Produto criado inativo para rejeitar carga",
  "numeroOnu": "1993",
  "classeRisco": "3",
  "grupoCompatibilidade": "A",
  "status": "INATIVO"
}
```

Esperado: `201` e `status` igual a `INATIVO`. Guarde `PRODUTO_INATIVO_ID`. Não use este produto nas cargas de sucesso.

### P07 — Inativar outro produto ativo

Crie um produto só para este caso, com `status` `ATIVO` e nome `RT produto para inativar`. Guarde `PRODUTO_INATIVAR_ID`.

`PATCH /api/v1/produtos-quimicos/{id}/inativar`

Sem corpo. Esperado: `200` e `status` igual a `INATIVO`.

```sql
SELECT nome, status FROM produtos_quimicos WHERE id = 'PRODUTO_INATIVAR_ID';
```

Não chame esta rota para `PRODUTO_FLUXO_ID` nem para o produto que já estava no banco.

### P08 — Produto inválido

| Caso | Corpo | Esperado |
|---|---|---|
| Sem `nome` | o JSON do P01 sem a propriedade `nome` | `400` `PAYLOAD_INVALIDO` |
| `nome` vazio | `"nome": ""` | `400` `PAYLOAD_INVALIDO` |
| `nome` só com espaço | `"nome": " "` | `422` `CAMPO_OBRIGATORIO`, mensagem `Nome do produto é obrigatório.` |
| `status` fora do enum | `"status": "SUSPENSO"` | `400` `PAYLOAD_INVALIDO` |
| ID com formato inválido | `GET /api/v1/produtos-quimicos/nao-e-uuid` | `400` `PAYLOAD_INVALIDO` |
| UUID inexistente | `GET /api/v1/produtos-quimicos/00000000-0000-4000-8000-000000000099` | `404` `NAO_ENCONTRADO`, mensagem `Produto químico não encontrado.` |

Nenhuma dessas chamadas cria linha nova. O enum do schema responde `400` antes da mensagem de domínio "Status do produto deve ser ATIVO ou INATIVO.", então essa frase não aparece pelo Swagger.

## 3. Registro e consulta de cargas químicas

A carga exige produto existente e ativo. A classificação enviada pelo cliente é recusada. O servidor copia `classeRisco` do produto e grava `classificacao_risco`.

Corpo válido, repetido nos cenários com `codigo` diferente:

```json
{
  "codigo": "RT-A-FLUXO",
  "produtoId": "PRODUTO_FLUXO_ID",
  "quantidade": 12.5,
  "unidadeMedida": "t",
  "origem": "Santos",
  "destino": "Cubatão",
  "responsavelTecnico": { "nome": "Marina Alves", "registro": "CRQ-12345" },
  "dataEntrada": "2026-10-22",
  "solicitante": "operador.portuario"
}
```

Substitua `PRODUTO_FLUXO_ID` pelo UUID real. Não envie `classificacaoRisco`, `status`, `documentacaoObrigatoria`, `documentacaoValida`, `ator`, `statusAnterior` nem `dataHora`.

### C01 — Registrar a carga do fluxo oficial

`POST /api/v1/cargas-quimicas` com o JSON acima e código `RT-A-FLUXO`.

Esperado: `201`. Guarde `CARGA_A_ID`.

| Campo | Valor |
|---|---|
| `status` | `REGISTRADA` |
| `classificacaoRisco` | `"8"`, igual à classe do produto |
| `quantidade` | `12.5` |
| `inspecaoNecessaria` | `false` |
| `documentacaoObrigatoriaAtendida` | `false` |
| `documentos` | `[]` |
| `inspecao` | `null` |
| `responsavelTecnico` | nome e registro enviados |

```sql
SELECT codigo, produto_id, quantidade, unidade_medida, origem, destino,
       responsavel_nome, responsavel_registro, classificacao_risco,
       status, inspecao_necessaria, data_entrada
FROM cargas_quimicas
WHERE codigo = 'RT-A-FLUXO';
```

`quantidade` no banco fica `12.500`. O JSON devolve o número `12.5`.

```sql
SELECT acao, status_anterior, status_novo, solicitante, motivo, evidencia, ocorrido_em
FROM historico_cargas
WHERE carga_id = 'CARGA_A_ID'
ORDER BY ocorrido_em;
```

Um evento: `acao` `REGISTRO`, `status_anterior` nulo, `status_novo` `REGISTRADA`, `solicitante` `operador.portuario`, `motivo` e `evidencia` nulos. `ocorrido_em` é definido pelo servidor.

### C02 — A classificação copiada não acompanha mudança posterior do produto

Com `CARGA_A_ID` já gravada, altere só a classe do produto de fluxo:

`PUT /api/v1/produtos-quimicos/{PRODUTO_FLUXO_ID}`

```json
{
  "nome": "RT produto fluxo revisado",
  "descricao": "Descricao revisada pelo roteiro manual",
  "numeroOnu": "1830",
  "classeRisco": "9",
  "grupoCompatibilidade": "C"
}
```

Esperado: `200` e `classeRisco` `"9"`.

`GET /api/v1/cargas-quimicas/{CARGA_A_ID}` continua com `classificacaoRisco` `"8"`.

Registre outra carga, código `RT-A-DEPOIS`, com o mesmo corpo do C01. Esperado: `201` e `classificacaoRisco` `"9"`. Guarde `CARGA_DEPOIS_ID` apenas como evidência da cópia. Ela não entra no fluxo da carga A.

```sql
SELECT c.codigo, c.classificacao_risco AS risco_da_carga, p.classe_risco AS risco_atual_do_produto
FROM cargas_quimicas c
JOIN produtos_quimicos p ON p.id = c.produto_id
WHERE c.codigo IN ('RT-A-FLUXO', 'RT-A-DEPOIS');
```

A primeira linha fica com carga `8` e produto `9`. A segunda fica com carga `9` e produto `9`.

Volte a classe do produto de fluxo para `"8"` com outro `PUT`, para os próximos registros copiarem a classe usada na apresentação. As duas cargas já gravadas não mudam.

### C03 — Consultar carga e listar

`GET /api/v1/cargas-quimicas/{CARGA_A_ID}`

Esperado: `200` e a carga A. O histórico não vem neste corpo. Ele tem rota própria.

`GET /api/v1/cargas-quimicas`

Sem query. Esperado: `200` e um array com as cargas `RT-` já criadas.

`GET /api/v1/cargas-quimicas?status=REGISTRADA`

Esperado: `200` e somente cargas `REGISTRADA`, incluindo a carga A enquanto ela não mudar de status. Execute este filtro antes da seção 4.

### C04 — Quantidade, campos e código

Use `PRODUTO_FLUXO_ID`. Cada linha é um `POST /api/v1/cargas-quimicas`. Nos casos de erro, nenhuma carga nova aparece no DBeaver.

| Caso | Ajuste no JSON | Esperado |
|---|---|---|
| Quantidade `1.25`, código `RT-Q-1250` | valor aceito na escala | `201`, `quantidade` `1.25`; no banco, `1.250` |
| Menor valor aceito, código `RT-Q-0001` | `"quantidade": 0.001` | `201`; no banco, `0.001` |
| Zero, código `RT-Q-ZERO` | `"quantidade": 0` | `422` `QUANTIDADE_INVALIDA`, mensagem `A quantidade deve ser maior que zero e ter no máximo três casas decimais.` |
| Negativa, código `RT-Q-NEG` | `"quantidade": -2` | `422` `QUANTIDADE_INVALIDA` e a mesma mensagem |
| Mais de três casas, código `RT-Q-ESCALA` | `"quantidade": 1.2345` | `422` `QUANTIDADE_INVALIDA` |
| Abaixo da precisão, código `RT-Q-MICRO` | `"quantidade": 0.0004` | `422` `QUANTIDADE_INVALIDA` |
| Inteiro acima de 11 dígitos, código `RT-Q-GRANDE` | `"quantidade": 100000000000` | `422` `QUANTIDADE_INVALIDA` |
| Sem responsável | remover `responsavelTecnico` | `400` `PAYLOAD_INVALIDO` |
| Código repetido | `"codigo": "RT-A-FLUXO"` | `409` `CONFLITO`, mensagem `Já existe uma carga com este código.` |
| Classificação enviada pelo cliente | acrescentar `"classificacaoRisco": "3"` | `400` `PAYLOAD_INVALIDO`; o schema rejeita a propriedade antes do domínio |
| Documentação enviada pelo cliente | acrescentar `"documentacaoValida": true` | `400` `PAYLOAD_INVALIDO` |
| Produto inativo | `produtoId` igual a `PRODUTO_INATIVO_ID`, código `RT-Q-INATIVO` | `422` `PRODUTO_INATIVO`, mensagem `Produto inativo não pode ser usado em novas cargas.` |
| Produto inexistente | `produtoId` `00000000-0000-4000-8000-000000000099`, código `RT-Q-SEM-PRODUTO` | `404` `NAO_ENCONTRADO`, mensagem `Produto químico não encontrado.` |
| Data impossível | `"dataEntrada": "2026-02-31"`, código `RT-Q-DATA` | `422` `CAMPO_INVALIDO`, mensagem `Data de entrada não é uma data válida.` |
| Data em outro formato | `"dataEntrada": "22/10/2026"` | `400` `PAYLOAD_INVALIDO` |
| Responsável em branco | `"responsavelTecnico": { "nome": " ", "registro": "CRQ-12345" }` | `422` `CAMPO_OBRIGATORIO`, mensagem `Nome do responsável técnico é obrigatório.` |

A coluna aceita `decimal(14,3)`: no máximo 11 dígitos inteiros e 3 casas. Não há arredondamento. `0.001` é o menor positivo aceito.

O código `422` `CLASSIFICACAO_DEFINIDA_PELO_PRODUTO` existe no caso de uso, com a mensagem `A classificação de risco da carga é copiada do produto associado.` O contrato publicado rejeita o campo antes, com `400`. Pelo Swagger, o resultado observável é `400`.

## 4. Ciclo de vida da carga

Transições aceitas pelo domínio:

| De | Para | Como exercitar |
|---|---|---|
| `REGISTRADA` | `EM_ANALISE` | `PATCH .../status` |
| `EM_ANALISE` | `EM_INSPECAO` | `PATCH .../status` ou `POST .../inspecoes` |
| `EM_INSPECAO` | `LIBERADA` | `PATCH .../liberar` ou `PATCH .../status` com `LIBERADA`, se documento e inspeção permitirem |
| `LIBERADA` | `EM_MOVIMENTACAO` | `PATCH .../status` |
| `EM_MOVIMENTACAO` | `FINALIZADA` | `PATCH .../status` |
| `REGISTRADA`, `EM_ANALISE`, `EM_INSPECAO`, `LIBERADA`, `BLOQUEADA` | `CANCELADA` | `PATCH .../cancelar` ou `PATCH .../status` |
| `EM_INSPECAO`, `EM_ANALISE` | `BLOQUEADA` | `PATCH .../bloquear` ou `PATCH .../status` |
| `BLOQUEADA` | `EM_ANALISE` | `PATCH .../status`; não libera a carga |
| `EM_INSPECAO` | `EM_ANALISE` | `PATCH .../status`; a inspeção volta a `PENDENTE` e continua necessária |
| `EM_ANALISE` | `LIBERADA` | só quando a inspeção não é necessária e a documentação obrigatória está atendida |

`FINALIZADA` e `CANCELADA` não têm saída. `EM_MOVIMENTACAO` não vai para `CANCELADA`. Não há rota separada de movimentação nem de finalização: as duas passam por `PATCH /api/v1/cargas-quimicas/{id}/status`.

Uma tentativa recusada não grava histórico novo e não muda `status`.

### Carga A — fluxo com inspeção até finalizar

Use `CARGA_A_ID`, ainda `REGISTRADA`.

#### A01 — Saídas proibidas a partir de `REGISTRADA`

`PATCH /api/v1/cargas-quimicas/{CARGA_A_ID}/status`

```json
{ "status": "FINALIZADA", "solicitante": "operador.portuario" }
```

Esperado: `409` `TRANSICAO_NAO_PERMITIDA`, mensagem `Transição de REGISTRADA para a operação solicitada não é permitida.` O status segue `REGISTRADA`.

Repita com `"status": "EM_INSPECAO"`. Esperado: `409`, mensagem `Transição de REGISTRADA para EM_INSPECAO não é permitida.`

`PATCH .../liberar` com `{ "solicitante": "autorizado" }`. Esperado: `409`, mensagem `Transição de REGISTRADA para LIBERADA não é permitida.`

`PATCH .../bloquear`:

```json
{ "solicitante": "qualidade", "motivo": "tentativa fora da analise" }
```

Esperado: `409`, mensagem `Transição de REGISTRADA para BLOQUEADA não é permitida.`

#### A02 — Entrar em análise

```json
{ "status": "EM_ANALISE", "solicitante": "operador.portuario" }
```

`PATCH .../status`. Esperado: `200`, `status` `EM_ANALISE`. Histórico novo: `TRANSICAO_STATUS`, de `REGISTRADA` para `EM_ANALISE`, solicitante `operador.portuario`, motivo e evidência nulos.

#### A03 — Liberar em análise sem documento

`PATCH .../liberar`

```json
{ "solicitante": "autorizado" }
```

Esperado: `422` `LIBERACAO_NEGADA`.

```json
{
  "code": "LIBERACAO_NEGADA",
  "message": "Documentação obrigatória ausente.",
  "details": ["Documentação obrigatória ausente."]
}
```

O status permanece `EM_ANALISE`. Não avance para inspeção ainda: os documentos desta carga entram na seção 5, cenário D01, e a inspeção na seção 6. A continuação até `FINALIZADA` está no cenário A04 e só deve ser feita depois de D01 e I01.

#### A04 — Concluir movimentação e finalização

Execute somente depois que a carga A estiver `LIBERADA` pelos cenários D01 e I01.

`PATCH .../status` com `{ "status": "REGISTRADA", "solicitante": "operador.portuario" }`.

Esperado: `409`, mensagem `Transição de LIBERADA para REGISTRADA não é permitida.`

`PATCH .../status`:

```json
{ "status": "EM_MOVIMENTACAO", "solicitante": "operador.portuario" }
```

Esperado: `200`, `status` `EM_MOVIMENTACAO`. Histórico: `TRANSICAO_STATUS`, de `LIBERADA` para `EM_MOVIMENTACAO`.

Ainda em movimentação, `PATCH .../cancelar`:

```json
{ "solicitante": "operador.portuario", "motivo": "cancelar durante movimentacao" }
```

Esperado: `409` `TRANSICAO_NAO_PERMITIDA`, mensagem `Transição de EM_MOVIMENTACAO para CANCELADA não é permitida.` O status não muda. O projeto não permite cancelar nessa etapa.

`PATCH .../status`:

```json
{ "status": "FINALIZADA", "solicitante": "operador.portuario" }
```

Esperado: `200`, `status` `FINALIZADA`. Histórico: `TRANSICAO_STATUS`, de `EM_MOVIMENTACAO` para `FINALIZADA`.

Depois do fim:

| Chamada | Esperado |
|---|---|
| `PATCH .../status` com `CANCELADA` e motivo `tarde demais` | `409`, `Transição de FINALIZADA para CANCELADA não é permitida.` |
| `PATCH .../status` com `EM_MOVIMENTACAO` | `409`, `Transição de FINALIZADA para a operação solicitada não é permitida.` |
| `POST .../documentos` com o JSON de documento da seção 5 | `409` `ESTADO_TERMINAL`, mensagem `Carga finalizada ou cancelada não pode ser alterada.` |

```sql
SELECT status FROM cargas_quimicas WHERE id = 'CARGA_A_ID';
```

O valor permanece `FINALIZADA`.

### Carga B — liberar sem inspeção

Crie `RT-B-SEM-INSPECAO` com o corpo do C01. Guarde `CARGA_B_ID`.

1. `PATCH .../status` para `EM_ANALISE`. Esperado: `200`.
2. Anexe e valide o documento obrigatório pelo D02.
3. `PATCH .../liberar` com `{ "solicitante": "autorizado" }`.

Esperado: `200`, `status` `LIBERADA`, `inspecaoNecessaria` `false`, `inspecao` `null`, `documentacaoObrigatoriaAtendida` `true`.

Pare nesta carga. Ela fica em `LIBERADA` para a apresentação do atalho sem inspeção. Não a movimente nem a cancele.

```sql
SELECT status, inspecao_necessaria
FROM cargas_quimicas
WHERE codigo = 'RT-B-SEM-INSPECAO';
```

Não há linha em `inspecoes` para `CARGA_B_ID`.

### Carga C — bloqueio e reavaliação

Crie `RT-C-BLOQUEIO`. Guarde `CARGA_C_ID`. Leve a `EM_ANALISE`.

`PATCH /api/v1/cargas-quimicas/{CARGA_C_ID}/bloquear`

```json
{
  "solicitante": "qualidade",
  "motivo": "vazamento",
  "evidencia": "foto-1"
}
```

Esperado: `200`, `status` `BLOQUEADA`. O bloqueio a partir de `EM_ANALISE` é decisão herdada da Fase 1; a entrada oficial do enunciado em `BLOQUEADA` sai de `EM_INSPECAO`. As duas são aceitas pelo código.

Histórico: `BLOQUEIO`, de `EM_ANALISE` para `BLOQUEADA`, `motivo` `vazamento`, `evidencia` `foto-1`, solicitante `qualidade`.

Ainda bloqueada:

| Chamada | Esperado |
|---|---|
| `PATCH .../status` com `EM_MOVIMENTACAO` | `409`, mensagem `Transição de BLOQUEADA para a operação solicitada não é permitida.` |
| `PATCH .../liberar` com `{ "solicitante": "autorizado" }` | `409`, mensagem `Transição de BLOQUEADA para LIBERADA não é permitida.` |

Reavaliar:

```json
{ "status": "EM_ANALISE", "solicitante": "operador.portuario" }
```

Esperado: `200`, `status` `EM_ANALISE`. A carga não fica `LIBERADA`. Histórico: `RETORNO_ANALISE`, de `BLOQUEADA` para `EM_ANALISE`, motivo exatamente `Reavaliação após bloqueio. A carga não foi liberada.` Esse motivo é do servidor; não vai no JSON.

Pare a carga C em `EM_ANALISE`. Não a libere neste roteiro.

### Carga D — cancelar em `REGISTRADA`

Crie `RT-D-CANCELADA`. Guarde `CARGA_D_ID`. Não mude o status antes do cancelamento.

`PATCH /api/v1/cargas-quimicas/{CARGA_D_ID}/cancelar`

```json
{
  "solicitante": "operador.portuario",
  "motivo": "operacao cancelada"
}
```

Esperado: `200`, `status` `CANCELADA`. Histórico: `CANCELAMENTO`, de `REGISTRADA` para `CANCELADA`, `motivo` `operacao cancelada`, `evidencia` nula.

`PATCH .../liberar` com `{ "solicitante": "autorizado" }`. Esperado: `409`, mensagem `Transição de CANCELADA para LIBERADA não é permitida.`

`POST .../documentos` com um documento da seção 5. Esperado: `409` `ESTADO_TERMINAL`.

### Carga E — cancelar a partir de `BLOQUEADA`

Crie `RT-E-BLOQUEIO-CANCELADO`. Guarde `CARGA_E_ID`. Vá a `EM_ANALISE` e bloqueie com motivo `divergencia` e evidência `laudo-interno`.

`PATCH .../cancelar`:

```json
{ "solicitante": "operador.portuario", "motivo": "cancelada apos bloqueio" }
```

Esperado: `200`, `status` `CANCELADA`. Não há retorno para análise nesta carga: o cancelamento encerra o ciclo.

## 5. Documentos da carga

`tipo` é texto livre, com 1 a 80 caracteres. O documento nasce `PENDENTE`. Só `PATCH .../validacao` grava `VALIDO` ou `INVALIDO`. Documento não obrigatório não substitui nem impede a liberação. A liberação exige ao menos um documento obrigatório, todos eles `VALIDO`, e nenhum com `validade` anterior ao dia UTC do servidor. `validade` no próprio dia UTC ainda é aceita. Documento sem `validade` não vence.

Não há tipos oficiais para inventar. Os textos abaixo são rótulos de teste.

### D01 — Documento obrigatório da carga A

Execute com a carga A em `EM_ANALISE`, depois do A02 e do A03, e antes de pedir inspeção.

`POST /api/v1/cargas-quimicas/{CARGA_A_ID}/documentos`

```json
{
  "tipo": "Ficha de emergência",
  "referencia": "FE-RT-A",
  "obrigatorio": true,
  "validade": "2027-12-31",
  "solicitante": "analista.documentacao"
}
```

Esperado: `201`. O status da carga continua `EM_ANALISE`. No array `documentos`, o item novo tem `statusValidacao` `PENDENTE`, `validadoPor` e `validadoEm` nulos. Guarde o `id` desse item como `DOCUMENTO_A_ID`. `documentacaoObrigatoriaAtendida` continua `false`.

Histórico: `DOCUMENTO_ANEXADO`, status anterior e novo iguais a `EM_ANALISE`, `motivo` `obrigatorio`, `evidencia` `Ficha de emergência`.

`PATCH .../liberar` agora. Esperado: `422` `LIBERACAO_NEGADA`, mensagem `Documento obrigatório "Ficha de emergência" não está válido.`

Validar:

`PATCH /api/v1/cargas-quimicas/{CARGA_A_ID}/documentos/{DOCUMENTO_A_ID}/validacao`

```json
{
  "resultado": "VALIDO",
  "observacao": "documento conferido",
  "solicitante": "analista.documentacao"
}
```

Esperado: `200`. O documento fica `VALIDO`, `observacao` `documento conferido`, `validadoPor` `analista.documentacao` e `validadoEm` preenchido pelo servidor. O status da carga não muda. `documentacaoObrigatoriaAtendida` passa a `true`.

Histórico: `DOCUMENTO_VALIDADO`, `motivo` `VALIDO`, `evidencia` o tipo do documento.

```sql
SELECT tipo, referencia, obrigatorio, status_validacao, validade, observacao, validado_por, validado_em
FROM documentos_carga
WHERE id = 'DOCUMENTO_A_ID';
```

Não libere a carga A aqui. O I01 ainda pede a inspeção. Se liberar antes da inspeção, o atalho `EM_ANALISE → LIBERADA` será aceito e o fluxo com inspeção deixa de ser testável nesta carga.

### D02 — Documento da carga B

Com `CARGA_B_ID` em `EM_ANALISE`, primeiro anexe só um documento não obrigatório:

```json
{
  "tipo": "Anotacao interna",
  "referencia": "AI-RT-B",
  "obrigatorio": false,
  "solicitante": "analista.documentacao"
}
```

Esperado: `201`, `statusValidacao` `PENDENTE`, histórico com `motivo` `nao_obrigatorio`.

Valide esse documento como `VALIDO`, no mesmo formato do D01. `documentacaoObrigatoriaAtendida` continua `false`, porque não há documento obrigatório.

`PATCH .../liberar`. Esperado: `422`, mensagem `Documentação obrigatória ausente.`

Anexe então o obrigatório:

```json
{
  "tipo": "Ficha de emergência",
  "referencia": "FE-RT-B",
  "obrigatorio": true,
  "validade": "2027-12-31",
  "solicitante": "analista.documentacao"
}
```

Valide-o como `VALIDO`. Aí execute a liberação descrita na carga B.

### D03 — Documento inválido

Crie `RT-F-INVALIDO`, leve a `EM_ANALISE` e guarde `CARGA_F_ID`.

Anexe:

```json
{
  "tipo": "Ficha de emergência",
  "referencia": "FE-RT-F",
  "obrigatorio": true,
  "validade": "2027-12-31",
  "solicitante": "analista.documentacao"
}
```

Guarde `DOCUMENTO_F_ID`. Valide como inválido:

```json
{
  "resultado": "INVALIDO",
  "observacao": "arquivo ilegivel",
  "solicitante": "analista.documentacao"
}
```

Esperado: `200`, `statusValidacao` `INVALIDO`, status da carga ainda `EM_ANALISE`.

`PATCH .../liberar`. Esperado: `422` `LIBERACAO_NEGADA`, mensagem `Documento obrigatório "Ficha de emergência" não está válido.`

Não existe rota para apagar o documento. Esta carga não deve ser usada para um sucesso de liberação.

### D04 — Documento vencido

Crie `RT-G-VENCIDO`, leve a `EM_ANALISE` e guarde `CARGA_G_ID`.

```json
{
  "tipo": "Ficha de emergência",
  "referencia": "FE-RT-G",
  "obrigatorio": true,
  "validade": "2020-01-01",
  "solicitante": "analista.documentacao"
}
```

Valide como `VALIDO`. O status de validação fica `VALIDO`, e ainda assim a liberação calcula o vencimento.

`PATCH .../liberar`. Esperado: `422`. A mensagem contém `Documento obrigatório "Ficha de emergência" está vencido.`

A comparação usa o início do dia em UTC. `2020-01-01` não depende do dia em que o roteiro for executado.

### D05 — Um obrigatório válido e outro inválido

Crie `RT-H-MISTO`, leve a `EM_ANALISE`. Anexe dois documentos obrigatórios, tipos `Ficha de emergência` e `Declaracao de carga`, referências `FE-RT-H` e `DC-RT-H`, ambos com validade `2027-12-31`.

Valide o primeiro como `VALIDO` e o segundo como `INVALIDO`.

`PATCH .../liberar`. Esperado: `422` e a mensagem `Documento obrigatório "Declaracao de carga" não está válido.` Um documento válido não compensa outro obrigatório inválido.

### D06 — Erros de documento

| Caso | Chamada | Esperado |
|---|---|---|
| Sem `obrigatorio` | `POST .../documentos` sem a propriedade | `400` `PAYLOAD_INVALIDO` |
| Sem `tipo` | `POST .../documentos` sem `tipo` | `400` `PAYLOAD_INVALIDO` |
| `resultado` `PENDENTE` | `PATCH .../validacao` | `400` `PAYLOAD_INVALIDO`; o contrato só aceita `VALIDO` ou `INVALIDO` |
| Documento de outra carga ou UUID inexistente | `PATCH .../documentos/00000000-0000-4000-8000-000000000099/validacao` com resultado `VALIDO` | `404` `DOCUMENTO_NAO_ENCONTRADO`, mensagem `Documento da carga não encontrado.` |
| `documentoId` que não é UUID | mesmo `PATCH` com `documentoId` `abc` | `400` `PAYLOAD_INVALIDO` |

Use a carga B, ainda não finalizada, ou uma carga `RT-` em análise. Não use a carga A se ela já estiver `FINALIZADA`.

## 6. Inspeção

A inspeção só se torna necessária quando alguém a solicita. O resultado fica na tabela `inspecoes`. Registrar o resultado não muda o status da carga. Liberar com inspeção necessária só é aceito em `EM_INSPECAO`, com resultado `APROVADA` e documentação obrigatória atendida.

Não há segunda inspeção independente: a carga tem no máximo uma linha em `inspecoes`.

### I01 — Solicitar, aprovar e liberar a carga A

A carga A está em `EM_ANALISE`, com o documento do D01 já `VALIDO`.

`POST /api/v1/cargas-quimicas/{CARGA_A_ID}/inspecoes`

```json
{ "solicitante": "qualidade" }
```

Esperado: `200`, `status` `EM_INSPECAO`, `inspecaoNecessaria` `true`, `inspecao.resultado` `PENDENTE`, `inspecao.concluidaEm` `null`. O mesmo efeito ocorre com `PATCH .../status` e `"status": "EM_INSPECAO"`.

Histórico: `INSPECAO_SOLICITADA`, de `EM_ANALISE` para `EM_INSPECAO`.

`PATCH .../status` com `FINALIZADA`. Esperado: `409`, mensagem `Transição de EM_INSPECAO para a operação solicitada não é permitida.`

`PATCH .../liberar` com `{ "solicitante": "autorizado" }`, ainda sem resultado. Esperado: `422` `LIBERACAO_NEGADA`, mensagem `A inspeção exigida para a carga não possui resultado aprovado.`

`PATCH /api/v1/cargas-quimicas/{CARGA_A_ID}/inspecoes/resultado`

```json
{
  "resultado": "APROVADA",
  "observacao": "conforme",
  "solicitante": "qualidade"
}
```

Esperado: `200`. O status da carga continua `EM_INSPECAO`. `inspecao.resultado` fica `APROVADA`, `observacao` `conforme` e `concluidaEm` preenchido. Histórico: `INSPECAO_REGISTRADA`, status anterior e novo `EM_INSPECAO`, `motivo` `APROVADA`, `evidencia` `conforme`.

```sql
SELECT i.resultado, i.observacao, i.solicitada_em, i.concluida_em, c.status, c.inspecao_necessaria
FROM inspecoes i
JOIN cargas_quimicas c ON c.id = i.carga_id
WHERE c.id = 'CARGA_A_ID';
```

`PATCH .../liberar` com `{ "solicitante": "autorizado" }`.

Esperado: `200`, `status` `LIBERADA`, `documentacaoObrigatoriaAtendida` `true`, `inspecaoNecessaria` `true`. Histórico: `LIBERACAO`, de `EM_INSPECAO` para `LIBERADA`.

Siga para o A04.

Enviar `"documentacaoValida": true` junto com `solicitante` na liberação responde `400` `PAYLOAD_INVALIDO` e não libera. O schema não tem esse campo.

### I02 — Reprovação e retorno para análise

Crie `RT-I-REPROVADA`. Guarde `CARGA_I_ID`. Leve a `EM_ANALISE`, anexe um documento obrigatório com validade `2027-12-31` e valide como `VALIDO`.

`POST .../inspecoes` com `{ "solicitante": "qualidade" }`. Esperado: `200` e resultado `PENDENTE`.

`PATCH .../inspecoes/resultado`:

```json
{ "resultado": "REPROVADA", "solicitante": "qualidade" }
```

Esperado: `200`, status da carga ainda `EM_INSPECAO`, `inspecao.resultado` `REPROVADA`. Histórico `INSPECAO_REGISTRADA` com `motivo` `REPROVADA`.

`PATCH .../liberar`. Esperado: `422`, mensagem `A inspeção exigida para a carga não possui resultado aprovado.`

`PATCH .../status`:

```json
{ "status": "EM_ANALISE", "solicitante": "operador.portuario" }
```

Esperado: `200`, `status` `EM_ANALISE`. A necessidade permanece. O resultado volta a `PENDENTE` e `concluidaEm` volta a nulo. Histórico: `RETORNO_ANALISE`, motivo `Retorno para reanálise. A necessidade de inspeção permanece.`

`PATCH .../liberar` a partir dessa análise. Esperado: `422` `LIBERACAO_NEGADA`. A mensagem reúne estes dois motivos, também em `details`:

- `Carga sujeita a inspeção não pode ser liberada fora de EM_INSPECAO.`
- `A inspeção exigida para a carga não possui resultado aprovado.`

```sql
SELECT c.status, c.inspecao_necessaria, i.resultado, i.concluida_em
FROM cargas_quimicas c
JOIN inspecoes i ON i.carga_id = c.id
WHERE c.codigo = 'RT-I-REPROVADA';
```

Pare esta carga em `EM_ANALISE`. O atalho de liberação não contorna a inspeção já solicitada.

### I03 — Resultado fora de estado

Na carga B, que não tem inspeção e ficou `LIBERADA`:

`PATCH /api/v1/cargas-quimicas/{CARGA_B_ID}/inspecoes/resultado`

```json
{ "resultado": "APROVADA", "solicitante": "qualidade" }
```

Esperado: `409` `TRANSICAO_NAO_PERMITIDA`, mensagem `Transição de LIBERADA para a operação solicitada não é permitida.` Nenhuma linha é criada em `inspecoes`.

`resultado` com valor `PENDENTE` nesse `PATCH` responde `400` `PAYLOAD_INVALIDO`. O contrato só aceita `APROVADA` ou `REPROVADA`.

## 7. Histórico e auditoria

`GET /api/v1/cargas-quimicas/{id}/historico`

Sem corpo. Esperado: `200` e um array em ordem de `ocorridoEm`. Cada item tem `id`, `cargaId`, `acao`, `statusAnterior`, `statusNovo`, `solicitante`, `motivo`, `evidencia` e `ocorridoEm`.

Não envie `statusAnterior`, `ator` nem `dataHora`. Eles não são propriedades do contrato. O último evento da carga A, depois do A04, tem `statusNovo` `FINALIZADA` e `ocorridoEm` gerado pelo servidor.

Ações gravadas pelo domínio:

| Ação | Quando |
|---|---|
| `REGISTRO` | criação; status anterior nulo; status novo `REGISTRADA` |
| `TRANSICAO_STATUS` | análise inicial, movimentação e finalização |
| `INSPECAO_SOLICITADA` | entrada em `EM_INSPECAO` |
| `INSPECAO_REGISTRADA` | resultado; o status da carga não muda; `motivo` é `APROVADA` ou `REPROVADA` |
| `DOCUMENTO_ANEXADO` | anexo; `motivo` é `obrigatorio` ou `nao_obrigatorio`; `evidencia` é o `tipo` |
| `DOCUMENTO_VALIDADO` | validação; `motivo` é `VALIDO` ou `INVALIDO` |
| `LIBERACAO` | liberação aceita |
| `BLOQUEIO` | bloqueio; `motivo` e `evidencia` são os enviados |
| `RETORNO_ANALISE` | volta de `BLOQUEADA` ou de `EM_INSPECAO`; o motivo é texto do servidor |
| `CANCELAMENTO` | cancelamento; `motivo` é o enviado |

### H01 — Histórico da carga A

`GET /api/v1/cargas-quimicas/{CARGA_A_ID}/historico`

Depois do fluxo completo, a sequência de `acao` contém, nesta ordem: `REGISTRO`, `TRANSICAO_STATUS`, `DOCUMENTO_ANEXADO`, `DOCUMENTO_VALIDADO`, `INSPECAO_SOLICITADA`, `INSPECAO_REGISTRADA`, `LIBERACAO`, `TRANSICAO_STATUS`, `TRANSICAO_STATUS`.

As tentativas `409` e `422` não entram na lista. O último `statusNovo` é `FINALIZADA`. O `solicitante` de cada evento é o enviado naquela operação, não um usuário autenticado.

```sql
SELECT acao, status_anterior, status_novo, solicitante, motivo, evidencia, ocorrido_em
FROM historico_cargas
WHERE carga_id = 'CARGA_A_ID'
ORDER BY ocorrido_em;
```

O número de linhas é o mesmo tamanho do array da API. `status` em `cargas_quimicas` é igual ao `status_novo` do último evento.

### H02 — Campos de auditoria recusados

Enquanto existir uma carga ainda `REGISTRADA` criada para este caso (`RT-H-AUDITORIA`), chame `PATCH .../status`:

```json
{
  "status": "EM_ANALISE",
  "solicitante": "operador.portuario",
  "statusAnterior": "LIBERADA",
  "ator": "invasor",
  "dataHora": "2000-01-01T00:00:00.000Z"
}
```

Esperado: `400` `PAYLOAD_INVALIDO`. A carga continua `REGISTRADA` e o histórico continua só com `REGISTRO`.

`GET .../historico` de um UUID inexistente, porém válido, responde `404` `NAO_ENCONTRADO`, mensagem `Carga química não encontrada.`

## 8. Validação de erros

Os casos já estão nos cenários anteriores. Esta seção é o contrato consolidado para a apresentação.

| Situação | Onde | HTTP e `code` |
|---|---|---|
| UUID em formato inválido | qualquer `id` ou `documentoId` | `400` `PAYLOAD_INVALIDO` |
| Produto ou carga inexistente | `GET` por ID, ou `produtoId` válido e ausente | `404` `NAO_ENCONTRADO` |
| Documento inexistente na carga | `PATCH .../validacao` | `404` `DOCUMENTO_NAO_ENCONTRADO` |
| Corpo incompleto, enum inválido ou propriedade não prevista | produtos, cargas, documentos, inspeção, liberação | `400` `PAYLOAD_INVALIDO` |
| Query `status=ENTREGUE` | `GET /api/v1/cargas-quimicas` | `400` `PAYLOAD_INVALIDO` |
| Quantidade `0`, negativa, com mais de três casas, `0.0004` ou com mais de 11 dígitos inteiros | `POST` da carga | `422` `QUANTIDADE_INVALIDA` |
| Texto só com espaços em campo obrigatório | produto, responsável, solicitante ou motivo | `422` `CAMPO_OBRIGATORIO` |
| Data `AAAA-MM-DD` impossível | `dataEntrada` ou `validade` | `422` `CAMPO_INVALIDO` |
| Produto `INATIVO` | `POST` da carga | `422` `PRODUTO_INATIVO` |
| Código de carga repetido | `POST` da carga | `409` `CONFLITO` |
| Transição ausente da política, inclusive as proibidas pelo enunciado | `PATCH .../status`, liberar, bloquear, cancelar | `409` `TRANSICAO_NAO_PERMITIDA` |
| Documento ou validação em carga `FINALIZADA` ou `CANCELADA` | `POST .../documentos` ou `PATCH .../validacao` | `409` `ESTADO_TERMINAL` |
| Liberar sem documento obrigatório, com obrigatório `PENDENTE` ou `INVALIDO`, ou com obrigatório vencido | `PATCH .../liberar` | `422` `LIBERACAO_NEGADA` |
| Liberar com inspeção necessária sem resultado `APROVADA`, ou fora de `EM_INSPECAO` | `PATCH .../liberar` | `422` `LIBERACAO_NEGADA` |

Transições proibidas cobertas pelo roteiro, todas com `409`:

- `REGISTRADA → FINALIZADA`
- `REGISTRADA → EM_INSPECAO`
- `REGISTRADA → LIBERADA`
- `REGISTRADA → BLOQUEADA`
- `EM_INSPECAO → FINALIZADA`
- `LIBERADA → REGISTRADA`
- `BLOQUEADA → EM_MOVIMENTACAO`
- `BLOQUEADA → LIBERADA`
- `CANCELADA → LIBERADA`
- `EM_MOVIMENTACAO → CANCELADA`
- `FINALIZADA → CANCELADA`
- `FINALIZADA → EM_MOVIMENTACAO`

A mensagem usa o par de status quando a política é consultada diretamente, por exemplo `Transição de CANCELADA para LIBERADA não é permitida.` Quando a operação exige um status de origem, o texto é `Transição de STATUS_ATUAL para a operação solicitada não é permitida.`

## 9. Verificação no DBeaver

Consultas somente de leitura. Troque os identificadores pelos valores copiados do Swagger.

Produtos do roteiro:

```sql
SELECT id, nome, numero_onu, classe_risco, grupo_compatibilidade, status, created_at, updated_at
FROM produtos_quimicos
WHERE nome LIKE 'RT %'
ORDER BY created_at;
```

Cargas e a classe atual do produto:

```sql
SELECT c.codigo, c.status, c.quantidade, c.classificacao_risco,
       c.inspecao_necessaria, c.responsavel_nome, c.responsavel_registro,
       p.nome, p.classe_risco AS classe_atual_do_produto, p.status AS status_do_produto
FROM cargas_quimicas c
JOIN produtos_quimicos p ON p.id = c.produto_id
WHERE c.codigo LIKE 'RT-%'
ORDER BY c.created_at;
```

Documentos de uma carga:

```sql
SELECT d.tipo, d.referencia, d.obrigatorio, d.status_validacao, d.validade,
       d.observacao, d.validado_por, d.validado_em
FROM documentos_carga d
WHERE d.carga_id = 'CARGA_A_ID'
ORDER BY d.created_at;
```

Inspeção:

```sql
SELECT c.codigo, c.status, c.inspecao_necessaria,
       i.resultado, i.observacao, i.solicitada_em, i.concluida_em
FROM cargas_quimicas c
LEFT JOIN inspecoes i ON i.carga_id = c.id
WHERE c.codigo LIKE 'RT-%'
ORDER BY c.codigo;
```

Há no máximo uma inspeção por carga (`carga_id` é único). Carga sem solicitação fica com as colunas da inspeção nulas.

Histórico alinhado ao status atual:

```sql
SELECT h.ocorrido_em, h.acao, h.status_anterior, h.status_novo, h.solicitante, h.motivo, h.evidencia
FROM historico_cargas h
WHERE h.carga_id = 'CARGA_A_ID'
ORDER BY h.ocorrido_em;
```

Tabelas e relações usadas: `produtos_quimicos`; `cargas_quimicas.produto_id`; `documentos_carga.carga_id`; `inspecoes.carga_id`; `historico_cargas.carga_id`. A migração não cria exclusão em cascata a partir dessas relações (`ON DELETE RESTRICT`). Nada neste roteiro remove registros.

## 10. Checklist final

Preencha **Resultado** com `Não executado`, `Aprovado` ou `Reprovado`. Em **HTTP**, registre o código observado. Em **Evidência**, anote o `id` ou o trecho do DBeaver.

| ID | Cenário | Resultado | HTTP | Observações | Evidência |
|---|---|---|---|---|---|
| P01 | Criar produto ativo do fluxo | Não executado | | | |
| P02 | Listar produtos | Não executado | | | |
| P03 | Consultar produto por ID | Não executado | | | |
| P04 | Atualizar cadastro sem mudar status | Não executado | | | |
| P05 | Rejeitar `status` no `PUT` | Não executado | | | |
| P06 | Criar produto inativo | Não executado | | | |
| P07 | Inativar produto exclusivo do roteiro | Não executado | | | |
| P08 | Produto com payload ou ID inválido | Não executado | | | |
| C01 | Registrar carga e histórico inicial | Não executado | | | |
| C02 | Classificação copiada e preservada | Não executado | | | |
| C03 | Consultar e filtrar cargas | Não executado | | | |
| C04 | Quantidade, código, produto e data | Não executado | | | |
| A01 | Saídas proibidas em `REGISTRADA` | Não executado | | | |
| A02 | `REGISTRADA` para `EM_ANALISE` | Não executado | | | |
| A03 | Liberar sem documentação | Não executado | | | |
| D01 | Anexar, recusar pendente e validar documento da carga A | Não executado | | | |
| I01 | Inspeção aprovada e liberação da carga A | Não executado | | | |
| A04 | Movimentar, finalizar e recusar saída terminal | Não executado | | | |
| D02 | Não obrigatório não libera; obrigatório válido libera a carga B | Não executado | | | |
| Carga B | Liberação sem inspeção | Não executado | | | |
| Carga C | Bloqueio, proibições e retorno para análise | Não executado | | | |
| Carga D | Cancelar em `REGISTRADA` e recusar alteração | Não executado | | | |
| Carga E | Cancelar a partir de `BLOQUEADA` | Não executado | | | |
| D03 | Documento obrigatório inválido | Não executado | | | |
| D04 | Documento obrigatório vencido | Não executado | | | |
| D05 | Obrigatório válido junto de obrigatório inválido | Não executado | | | |
| D06 | Erros de anexo e validação | Não executado | | | |
| I02 | Inspeção reprovada e atalho recusado | Não executado | | | |
| I03 | Resultado de inspeção fora de `EM_INSPECAO` | Não executado | | | |
| H01 | Histórico completo da carga A | Não executado | | | |
| H02 | Auditoria recusada no corpo | Não executado | | | |

## Rotas identificadas

| Método | Caminho | No Swagger |
|---|---|---|
| `GET` | `/health` | Sim, sucesso com banco no ar |
| `POST` | `/api/v1/produtos-quimicos` | Sim |
| `GET` | `/api/v1/produtos-quimicos` | Sim |
| `GET` | `/api/v1/produtos-quimicos/{id}` | Sim |
| `PUT` | `/api/v1/produtos-quimicos/{id}` | Sim |
| `PATCH` | `/api/v1/produtos-quimicos/{id}/inativar` | Sim |
| `POST` | `/api/v1/cargas-quimicas` | Sim |
| `GET` | `/api/v1/cargas-quimicas` | Sim |
| `GET` | `/api/v1/cargas-quimicas/{id}` | Sim |
| `GET` | `/api/v1/cargas-quimicas/{id}/historico` | Sim |
| `POST` | `/api/v1/cargas-quimicas/{id}/documentos` | Sim |
| `PATCH` | `/api/v1/cargas-quimicas/{id}/documentos/{documentoId}/validacao` | Sim |
| `POST` | `/api/v1/cargas-quimicas/{id}/inspecoes` | Sim |
| `PATCH` | `/api/v1/cargas-quimicas/{id}/inspecoes/resultado` | Sim |
| `PATCH` | `/api/v1/cargas-quimicas/{id}/liberar` | Sim |
| `PATCH` | `/api/v1/cargas-quimicas/{id}/bloquear` | Sim |
| `PATCH` | `/api/v1/cargas-quimicas/{id}/cancelar` | Sim |
| `PATCH` | `/api/v1/cargas-quimicas/{id}/status` | Sim |

Não há outras rotas de negócio no `buildApp`.

### O que o Swagger não consegue provocar

- `GET /health` com `503` exige derrubar o PostgreSQL. Isso interrompe a apresentação e não faz parte deste roteiro.
- `INSPECAO_NAO_ENCONTRADA` está no domínio, mas entrar em `EM_INSPECAO` pela API sempre grava a inspeção. O resultado manual não alcança esse código.
- `ESTADO_INCOMPATIVEL` está no mapa HTTP e nenhum caso de uso o lança.
- `CLASSIFICACAO_DEFINIDA_PELO_PRODUTO` é alcançável no caso de uso, mas o schema responde `400` antes. Pelo Swagger o observável é `PAYLOAD_INVALIDO`.
- A frase de domínio para status de produto fora de `ATIVO` e `INATIVO` também não aparece: o enum do schema responde `400`.
- Não existe rota para reativar produto, editar quantidade ou rota de uma carga já criada, apagar documento, criar uma segunda inspeção ou excluir registros.
- `documentacaoObrigatoriaAtendida` não é coluna e não pode ser enviada.
- Não há catálogo regulatório de documentos nem autenticação. `solicitante` não comprova identidade.
- `500` `ERRO_INTERNO` só aparece diante de falha inesperada do servidor. O roteiro não a provoca.
