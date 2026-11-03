# Decisões da Fase 2

Este documento registra a interpretação adotada na implementação. Ele não transforma decisão de projeto em requisito oficial da FIAP.

O enunciado oficial chama o produto de QuimiPort. O repositório e a entrega permanecem com o nome QuimiTrack, continuidade da Fase 1.

## Transições

A política é fechada e está em `src/domain/services/politica-transicao-status.ts`.

Transições desenhadas no enunciado da FIAP:

- `REGISTRADA → EM_ANALISE`
- `EM_ANALISE → EM_INSPECAO`
- `EM_INSPECAO → LIBERADA`
- `LIBERADA → EM_MOVIMENTACAO`
- `EM_MOVIMENTACAO → FINALIZADA`
- `REGISTRADA → CANCELADA`
- `EM_ANALISE → CANCELADA`
- `EM_INSPECAO → BLOQUEADA`
- `EM_INSPECAO → CANCELADA`
- `LIBERADA → CANCELADA`
- `BLOQUEADA → CANCELADA`

Proibições nomeadas no enunciado, também rejeitadas:

- `CANCELADA → LIBERADA`
- `FINALIZADA → EM_MOVIMENTACAO`
- `BLOQUEADA → EM_MOVIMENTACAO`
- `REGISTRADA → FINALIZADA`
- `EM_INSPECAO → FINALIZADA`
- `LIBERADA → REGISTRADA`
- Qualquer saída de `FINALIZADA` ou `CANCELADA`

O fluxo principal do PDF passa por inspeção. As regras escritas não dizem que toda carga deve ser inspecionada. A Fase 1 trata a inspeção como condicional. A implementação segue essa leitura e a mantém explícita como decisão de projeto, sem apresentá-la como seta oficial.

Transições herdadas da Fase 1, aplicadas porque não removem nenhuma transição oficial:

| Transição | Justificativa | Efeito |
|---|---|---|
| `EM_ANALISE → LIBERADA` | Permite liberar quando a inspeção não foi solicitada, se a documentação obrigatória estiver válida. | Se a inspeção já foi solicitada, a liberação por este atalho é recusada. |
| `EM_ANALISE → BLOQUEADA` | O endpoint de bloqueio existe no enunciado, mas a única entrada oficial em `BLOQUEADA` sai de `EM_INSPECAO`. | O bloqueio também pode ocorrer durante a análise. |
| `BLOQUEADA → EM_ANALISE` | A Fase 1 exige reavaliação antes de nova liberação. O enunciado não lista essa saída e também não a proíbe. | O retorno não libera a carga. |
| `EM_INSPECAO → EM_ANALISE` | A Fase 1 prevê reanálise. | O resultado anterior da inspeção volta a `PENDENTE`. A necessidade de inspeção permanece persistida. |

## Quantidade

A coluna `quantidade` é `decimal(14,3)`. O value object guarda milésimos inteiros, lidos do texto decimal mais curto produzido por `Number#toString()`. Não há arredondamento: `0.0004` e qualquer valor com mais de três casas são recusados. Zero, negativo e número fora de 11 dígitos inteiros também. O erro é `QUANTIDADE_INVALIDA`, respondido como HTTP 422.

A persistência grava o texto canônico com três casas, por exemplo `1.250`. O JSON devolve o número desse texto. O schema HTTP descreve a mesma escala e deixa a rejeição no domínio, para o cliente receber 422 em vez de um 400 genérico de payload.

## Classificação de risco

O enunciado não define uma taxonomia de classes. O valor é texto obrigatório no produto. No registro da carga, o backend copia a classe do produto e a persiste. O cliente não envia esse campo. Uma atualização posterior do produto não reescreve cargas já registradas.

## Documentos

O enunciado não lista tipos de documento. A política do projeto é:

- `tipo` é texto livre;
- cada documento informa se é obrigatório para aquela carga;
- o documento nasce `PENDENTE`;
- somente o caso de uso de validação grava `VALIDO` ou `INVALIDO`;
- a liberação exige ao menos um documento obrigatório, todos `VALIDO` e nenhum vencido;
- documento não obrigatório não substitui nem bloqueia essa condição;
- `documentacaoObrigatoriaAtendida` é calculada na resposta e não pode ser enviada pelo cliente.

## Inspeção

A inspeção torna-se necessária quando alguém solicita a inspeção. Essa necessidade e o resultado ficam em tabelas próprias e sobrevivem à reinicialização da API. Carga com inspeção necessária só pode ser liberada em `EM_INSPECAO`, com resultado `APROVADA` e documentação obrigatória atendida.

## Histórico e auditoria

Status anterior e data/hora vêm do estado persistido e do relógio do servidor. O schema rejeita `statusAnterior`, `ator` e `dataHora` enviados pelo cliente. `solicitante` é um dado informado na operação. Sem autenticação, ele não é uma identidade verificada. A atualização da carga e os eventos novos do histórico ocorrem na mesma transação.

## Fora do escopo

GraphQL, gRPC, autenticação completa, microsserviços, frontend, área de armazenamento e laudo além do registro de inspeção necessário para a decisão.
