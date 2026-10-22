# Modelagem de dados da Fase 2

Banco relacional PostgreSQL. A escolha cabe ao domínio: produto, carga, documento, inspeção e histórico têm relacionamentos e integridade referencial que um modelo relacional representa de forma direta. Prisma versiona as migrations em `prisma/migrations`.

## produtos_quimicos

| Campo | Tipo | Restrição |
|---|---|---|
| id | UUID | PK |
| nome | texto | obrigatório |
| descricao | texto | obrigatório |
| numero_onu | texto | obrigatório |
| classe_risco | texto | obrigatório |
| grupo_compatibilidade | texto | obrigatório |
| status | ATIVO ou INATIVO | obrigatório |
| created_at, updated_at | timestamp | obrigatórios |

Não há exclusão física. A inativação altera `status`.

## cargas_quimicas

| Campo | Tipo | Restrição |
|---|---|---|
| id | UUID | PK |
| codigo | texto | único |
| produto_id | UUID | FK para produtos_quimicos, restrict |
| quantidade | decimal(14,3) | maior que zero, no máximo três casas; persistida como texto canônico |
| unidade_medida | texto | obrigatório |
| origem, destino | texto | obrigatórios |
| responsavel_nome, responsavel_registro | texto | obrigatórios |
| classificacao_risco | texto | cópia da classe do produto no registro |
| status | enum de oito valores | obrigatório |
| inspecao_necessaria | booleano | definido pelo caso de uso de inspeção |
| data_entrada | data | obrigatória |
| created_at, updated_at | timestamp | obrigatórios |

Índices em `produto_id`, `status` e `codigo`.

## documentos_carga

Uma carga possui zero ou mais documentos. `carga_id` referencia a carga. `status_validacao` começa em `PENDENTE`. `obrigatorio` qualifica o documento. `validade` é opcional.

## inspecoes

No máximo uma inspeção por carga (`carga_id` único). Guarda resultado `PENDENTE`, `APROVADA` ou `REPROVADA`, observação, solicitação e conclusão.

## historico_cargas

Eventos append-only da carga. Campos: ação, status anterior, status novo, solicitante, motivo, evidência e data/hora do servidor. A gravação entra na mesma transação da alteração da carga.

## Status

O status persistido só muda se a política de domínio permitir a transição. `FINALIZADA` e `CANCELADA` não possuem saída.

## Evolução

Área de armazenamento permanece fora desta fase. Novos tipos de documento não exigem migration, porque `tipo` é texto. Uma autenticação futura pode substituir o solicitante informado por uma identidade verificada sem mudar o ciclo de status.
