# Diagrama de Arquitetura

> Diagrama complementar: mostra separação de responsabilidades e o sentido das dependências.

```mermaid
flowchart TB
    P[Presentation
Controllers / Routes / Middlewares]
    A[Application
Use Cases / DTOs]
    D[Domain
Entities / Value Objects / Rules / Services]
    I[Infrastructure
Repositories / Database / Integrations]

    P --> A
    A --> D
    I -. implementa contratos .-> D
```

**Decisão:** o domínio não depende diretamente de framework, banco ou ORM. A infraestrutura implementa os contratos necessários sem inverter a direção do núcleo de negócio.
