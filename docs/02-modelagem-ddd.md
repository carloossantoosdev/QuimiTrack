# 2. Modelagem DDD

## 2.1 Linguagem ubíqua

| Termo | Significado |
|---|---|
| Produto Químico | Produto cadastrado e associado a cargas |
| Carga Química | Unidade operacional controlada |
| Classificação de Risco | Classificação de risco da carga/produto |
| Responsável Técnico | Profissional associado à responsabilidade técnica |
| Documento da Carga | Documento utilizado na validação |
| Inspeção | Processo de verificação quando aplicável |
| Liberação | Autorização para avanço operacional |
| Bloqueio | Impedimento de continuidade |
| Histórico | Registro de eventos relevantes |
| Área de Armazenamento | Local associado à carga |
| Status | Estado atual da carga |

## 2.2 Entidades

### ProdutoQuimico
Responsabilidade: representar produto cadastrado. Atributos principais: id, nome, classificação de risco e ativo. Regras: nome e classe de risco obrigatórios; produto inativo não pode ser usado em novas cargas.

### CargaQuimica
Responsabilidade: representar a carga e proteger seu ciclo de vida. Atributos: id, produto, quantidade, classificação de risco, responsável técnico, documentos, inspeção, área, status e histórico. Comportamentos: liberar, bloquear, cancelar, solicitar inspeção e atualizar status.

### ResponsavelTecnico
Representa o profissional responsável. Atributos propostos: id, nome e registro.

### DocumentoCarga
Representa documentos associados. Atributos propostos: id, tipo, status e validade.

### Inspecao
Representa uma inspeção. Atributos propostos: id, data, resultado e observação.

### AreaArmazenamento
Representa a área relacionada ao armazenamento. Atributos propostos: id, identificação, capacidade e situação.

## 2.3 Value Objects

### Quantidade
Representa a quantidade da carga. Deve ser maior que zero.

### ClassificacaoDeRisco
Representa a classificação de risco como conceito de domínio. O enunciado não fornece categorias exatas; portanto elas não serão inventadas nesta fase.

## 2.4 Aggregate Root
`CargaQuimica` é o agregado principal porque concentra regras relacionadas a produto, quantidade, documentação, responsável, inspeção, status, liberação, bloqueio e histórico.

A intenção é evitar alterações como `carga.status = LIBERADA` e preferir comportamentos como `carga.liberar()`.

## 2.5 Serviço de domínio
Foi proposta a responsabilidade `AvaliacaoDeLiberacao`, que responde se uma carga está apta para liberação e, quando não estiver, informa os motivos. O Use Case coordena; o domínio protege as regras.

## 2.6 Histórico
Eventos relevantes registram data/hora, tipo, responsável e detalhes; motivo e evidência entram quando aplicáveis.
