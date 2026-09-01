# 3. Casos de uso

Cada caso possui objetivo, ator, entrada, saída, regras e exceções.

## UC01 — Cadastrar Produto Químico
**Objetivo:** Cadastrar um novo produto químico no sistema.  
**Ator:** Administrador.  
**Entrada:** nome e classe de risco.  
**Saída:** produto cadastrado.  
**Regras:** nome e classe obrigatórios.  
**Exceções:** dados ausentes ou inválidos.

## UC02 — Inativar Produto Químico
**Objetivo:** Inativar um produto químico que não deve mais ser utilizado em novas cargas.  
**Ator:** Administrador.  
**Entrada:** id do produto.  
**Saída:** produto inativo.  
**Regras:** produto inativo não pode ser usado em novas cargas.  
**Exceções:** produto inexistente ou operação não autorizada.

## UC03 — Registrar Carga Química
**Objetivo:** Registrar uma nova carga química para iniciar seu ciclo de análise.  
**Ator:** Operador portuário.  
**Entrada:** produto, quantidade, classificação de risco e responsável técnico.  
**Saída:** carga em REGISTRADA.  
**Regras:** produto deve existir e estar ativo; quantidade > 0; classificação e responsável obrigatórios.  
**Exceções:** produto inexistente/inativo ou dados inválidos.

## UC04 — Validar Documentação
**Objetivo:** Verificar se a documentação obrigatória da carga está válida para o prosseguimento do processo.  
**Ator:** Analista de documentação.  
**Entrada:** carga e documentos.  
**Saída:** documentação válida ou pendente/inválida.  
**Regras:** carga não pode ser liberada sem documentação obrigatória válida.  
**Exceções:** carga inexistente ou documentação inválida.

## UC05 — Solicitar Inspeção
**Objetivo:** Encaminhar uma carga para inspeção quando houver necessidade de avaliação.  
**Ator:** Analista de qualidade.  
**Entrada:** carga e motivo.  
**Saída:** carga em EM_INSPECAO.  
**Regras:** respeitar transições permitidas.  
**Exceções:** estado incompatível ou carga inexistente.

## UC06 — Liberar Carga Química
**Objetivo:** Liberar uma carga química após a validação das condições necessárias.  
**Ator:** Usuário autorizado.  
**Entrada:** id da carga e contexto necessário para avaliação.  
**Saída:** carga em LIBERADA.  
**Regras:** documentação obrigatória válida; estado compatível; carga cancelada não pode ser liberada; carga bloqueada deve retornar para EM_ANALISE antes de nova liberação; demais condições aplicáveis devem estar atendidas.  
**Exceções:** carga inexistente, documentação pendente, estado incompatível ou regra não atendida.

## UC07 — Bloquear Carga Química
**Objetivo:** Impedir o prosseguimento de uma carga quando for identificada uma não conformidade ou condição impeditiva.  
**Ator:** Analista de qualidade/usuário autorizado.  
**Entrada:** carga, motivo, responsável e evidência quando aplicável.  
**Saída:** carga BLOQUEADA.  
**Regras:** registrar o bloqueio no histórico.  
**Exceções:** estado incompatível ou ausência de motivo.

## UC08 — Atualizar Status
**Objetivo:** Alterar o status da carga somente quando a transição estiver prevista no fluxo do domínio.  
**Ator:** Usuário autorizado/sistema.  
**Entrada:** carga e operação desejada.  
**Saída:** novo status válido.  
**Regras:** não existe alteração arbitrária; somente transições permitidas podem ser executadas.  
**Exceções:** transição não permitida.

## UC09 — Cancelar Carga
**Objetivo:** Encerrar o processo de uma carga que não deve mais prosseguir.  
**Ator:** Usuário autorizado.  
**Entrada:** carga e motivo.  
**Saída:** CANCELADA.  
**Regras:** carga cancelada não pode ser liberada.  
**Exceções:** estado incompatível ou ausência de motivo.

## UC10 — Consultar Cargas por Status
**Objetivo:** Permitir a consulta das cargas de acordo com seu status atual.  
**Ator:** Gestor operacional/usuário autorizado.  
**Entrada:** status.  
**Saída:** lista de cargas.  
**Regras:** a consulta deve considerar somente os status válidos do domínio.  
**Exceções:** status inválido.

## UC11 — Consultar Histórico
**Objetivo:** Consultar o histórico de eventos e alterações de uma carga.  
**Ator:** Usuário autorizado.  
**Entrada:** id da carga.  
**Saída:** linha do tempo dos eventos.  
**Regras:** o histórico deve apresentar os eventos registrados da carga, incluindo informações de transição, motivo, solicitante, data/hora e evidência quando disponível.  
**Exceções:** carga inexistente.