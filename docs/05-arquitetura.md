# 5. Arquitetura proposta

## 5.1 Camadas
**Presentation:** controllers, routes e middlewares; recebe requisições e devolve respostas.  
**Application:** casos de uso e DTOs; orquestra operações.  
**Domain:** entidades, Value Objects, Aggregate Root, regras e serviços de domínio.  
**Infrastructure:** repositories concretos, banco e integrações.

## 5.2 Organização
```text
src/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── services/
│   ├── repositories/
│   ├── errors/
│   └── enums/
├── application/
│   ├── use-cases/
│   └── dtos/
├── infrastructure/
│   ├── database/
│   ├── repositories/
│   └── external-services/
└── presentation/
    ├── controllers/
    ├── routes/
    └── middlewares/
```

## 5.3 Dependências
Presentation → Application → Domain. Infrastructure implementa contratos definidos para acesso a dados e integrações. O domínio não depende diretamente de Express, banco ou ORM.

## 5.4 Evolução
A separação permite futura evolução para backend, frontend, mobile e integrações, mantendo o núcleo do negócio independente de tecnologia.
