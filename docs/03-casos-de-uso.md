# 3. Casos de uso

Cada caso possui objetivo, ator, entrada, saída, regras e exceções.

## UC01 — Cadastrar Produto Químico
**Ator:** Administrador.  
**Entrada:** nome e classe de risco.  
**Saída:** produto cadastrado.  
**Regras:** nome e classe obrigatórios.  
**Exceções:** dados ausentes ou inválidos.

## UC02 — Inativar Produto Químico
**Ator:** Administrador.  
**Entrada:** id do produto.  
**Saída:** produto inativo.  
**Regras:** produto inativo não pode ser usado em novas cargas.  
**Exceções:** produto inexistente ou operação não autorizada.

## UC03 — Registrar Carga Química
**Ator:** Operador portuário.  
**Entrada:** produto, quantidade, classificação de risco e responsável técnico.  
**Saída:** carga em REGISTRADA.  
**Regras:** produto deve existir e estar ativo; quantidade > 0; classificação e responsável obrigatórios.  
**Exceções:** produto inexistente/inativo ou dados inválidos.

## UC04 — Validar Documentação
**Ator:** Analista de documentação.  
**Entrada:** carga e documentos.  
**Saída:** documentação válida ou pendente/inválida.  
**Regra:** carga não pode ser liberada sem documentação obrigatória.  
**Exceções:** carga inexistente ou documentação inválida.

## UC05 — Solicitar Inspeção
**Ator:** Analista de qualidade.  
**Entrada:** carga e motivo.  
**Saída:** carga em EM_INSPECAO.  
**Regras:** respeitar transições permitidas.  
**Exceções:** estado incompatível ou carga inexistente.

## UC06 — Liberar Carga Química
**Ator:** Usuário autorizado.  
**Entrada:** id da carga e contexto necessário para avaliação.  
**Saída:** carga em LIBERADA.  
**Regras:** documentação obrigatória válida; estado compatível; cancelada não pode liberar; bloqueada não vai diretamente para liberar; demais condições aplicáveis devem estar atendidas.  
**Exceções:** carga inexistente, documentação pendente, estado incompatível ou regra não atendida.

## UC07 — Bloquear Carga Química
**Ator:** Analista de qualidade/usuário autorizado.  
**Entrada:** carga, motivo, responsável e evidência quando aplicável.  
**Saída:** carga BLOQUEADA.  
**Regras:** registrar bloqueio no histórico.  
**Exceções:** estado incompatível ou ausência de motivo.

## UC08 — Atualizar Status
**Ator:** Usuário autorizado/sistema.  
**Entrada:** carga e operação desejada.  
**Saída:** novo status válido.  
**Regra:** não existe alteração arbitrária.  
**Exceções:** transição não permitida.

## UC09 — Cancelar Carga
**Ator:** Usuário autorizado.  
**Entrada:** carga e motivo.  
**Saída:** CANCELADA.  
**Regra:** carga cancelada não pode ser liberada.  
**Exceções:** estado incompatível ou ausência de motivo.

## UC10 — Consultar Cargas por Status
**Ator:** Gestor operacional/usuário autorizado.  
**Entrada:** status.  
**Saída:** lista de cargas.  
**Exceções:** status inválido.

## UC11 — Consultar Histórico
**Ator:** Usuário autorizado.  
**Entrada:** id da carga.  
**Saída:** linha do tempo dos eventos.  
**Exceções:** carga inexistente.
