# 1. Contexto e entendimento do domínio

## 1.1 Problema
O controle de cargas químicas exige informações de produto, classificação de risco, documentação, responsável técnico e acompanhamento do status. Registros manuais ou descentralizados dificultam consulta, acompanhamento e aplicação de regras de segurança.

## 1.2 Objetivo
Criar a base técnica do QuimiTrack para cadastrar produtos, registrar cargas, controlar documentação, acompanhar o ciclo de vida e aplicar regras de segurança antes da movimentação.

## 1.3 Usuários
- Operador portuário
- Responsável técnico
- Analista de documentação
- Analista de qualidade
- Gestor operacional
- Administrador do sistema

## 1.4 Processos
Cadastrar produto, inativar produto, registrar carga, validar documentação, solicitar inspeção, liberar, bloquear, atualizar status, cancelar e consultar cargas/histórico.

## 1.5 Decisões do projeto
- Carga bloqueada não vai diretamente para LIBERADA; retorna para EM_ANALISE e passa novamente pelas validações.
- Status não será alterado diretamente por consumidores externos.
- Operações relevantes de negócio serão registradas no histórico.
- Bloqueio poderá registrar responsável, data/hora, motivo e evidência.
- Inspeção não será tratada como obrigatória para todas as cargas, pois o enunciado não define esse critério.
