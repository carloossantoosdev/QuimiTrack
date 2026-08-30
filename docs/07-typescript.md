# 7. JavaScript Avançado e TypeScript

O projeto utilizará tipagem forte para contratos e conceitos do domínio.

```ts
interface CargaQuimicaRepository {
  findById(id: string): Promise<CargaQuimica | null>;
  save(carga: CargaQuimica): Promise<void>;
}
```

Classes serão usadas quando houver comportamento e invariantes, como em `CargaQuimica`.

Status poderá ser representado por enum ou união literal:

```ts
enum StatusCarga {
  REGISTRADA = "REGISTRADA",
  EM_ANALISE = "EM_ANALISE",
  EM_INSPECAO = "EM_INSPECAO",
  LIBERADA = "LIBERADA",
  BLOQUEADA = "BLOQUEADA",
  EM_MOVIMENTACAO = "EM_MOVIMENTACAO",
  FINALIZADA = "FINALIZADA",
  CANCELADA = "CANCELADA"
}
```

Funções puras serão usadas para validações simples; módulos ES6+ organizarão o código; async/await será usado em I/O e integrações; generics somente quando trouxerem reutilização real; erros de negócio serão diferenciados de erros técnicos.
