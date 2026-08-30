# 6. Plano de qualidade

## 6.1 Regras críticas
Quantidade > 0; produto ativo; documentação para liberação; bloqueio impedindo movimentação; cancelamento impedindo liberação; transições válidas; responsabilidade técnica obrigatória.

## 6.2 Casos críticos
Registro, validação documental, liberação, bloqueio, cancelamento e movimentação.

## 6.3 Testes unitários
Serão priorizados para Value Objects, entidades, transições, regras de liberação e bloqueio.

## 6.4 Testes de integração
Nas próximas fases, validarão Use Cases, repositories, banco e integrações externas.

## 6.5 Fluxos
Exemplo válido: Registrar → Em análise → Validar documentação → Liberar.  
Exemplo de recuperação: Registrar → Em análise → Bloquear → Em análise → Validar → Liberar.

## 6.6 Mocks
Repositories e integrações serão substituídos por mocks/fakes nos testes unitários. Dados simulados cobrirão cargas válidas, documentos pendentes, produtos inativos, bloqueios e cancelamentos.
