# Fluxo de Status

> Diagrama obrigatório da Fase 1: representa as transições permitidas e a decisão do grupo de retornar cargas bloqueadas para análise.

```mermaid
stateDiagram-v2
    [*] --> REGISTRADA
    REGISTRADA --> EM_ANALISE : registro concluído
    REGISTRADA --> CANCELADA : cancelamento permitido

    EM_ANALISE --> EM_INSPECAO : inspeção necessária
    EM_ANALISE --> LIBERADA : regras + documentação OK
    EM_ANALISE --> BLOQUEADA : não conformidade
    EM_ANALISE --> CANCELADA : cancelamento

    EM_INSPECAO --> EM_ANALISE : pendência / reanálise
    EM_INSPECAO --> LIBERADA : inspeção OK + regras
    EM_INSPECAO --> BLOQUEADA : não conformidade
    EM_INSPECAO --> CANCELADA : cancelamento

    BLOQUEADA --> EM_ANALISE : nova avaliação obrigatória

    LIBERADA --> EM_MOVIMENTACAO : autorização operacional
    EM_MOVIMENTACAO --> FINALIZADA : movimentação concluída

    CANCELADA --> [*]
    FINALIZADA --> [*]
```

**Decisão do projeto:** `BLOQUEADA` não vai diretamente para `LIBERADA`; retorna para `EM_ANALISE` antes de uma nova avaliação.
