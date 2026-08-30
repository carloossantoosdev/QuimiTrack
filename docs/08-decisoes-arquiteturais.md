# 8. Decisões arquiteturais

## ADR-01 — CargaQuimica como Aggregate Root
Concentra regras do ciclo de vida da carga.

## ADR-02 — Status protegido pelo domínio
Evita alterações arbitrárias e garante transições válidas.

## ADR-03 — AvaliacaoDeLiberacao
Concentra a decisão de aptidão para liberação sem transformar Use Cases em coleções de condicionais.

## ADR-04 — Application x Domain
Use Cases coordenam; o domínio decide e protege invariantes.

## ADR-05 — Repository por abstração
Evita dependência do domínio em uma tecnologia de persistência específica.

## ADR-06 — Histórico
Mantém rastreabilidade de decisões relevantes.

## ADR-07 — Bloqueio retorna para análise
Garante nova avaliação antes de liberar novamente.

## ADR-08 — Inspeção condicional
Não inventar critério universal não definido no enunciado.

## ADR-09 — Evolução
Manter o núcleo de negócio independente de framework para facilitar evolução futura.
