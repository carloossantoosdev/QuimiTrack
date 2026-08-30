# 4. Regras de negócio

## 4.1 Regras fornecidas pelo desafio
1. Carga não pode ser registrada sem produto.
2. Carga não pode ser registrada com produto inativo.
3. Carga não pode ser registrada sem classificação de risco.
4. Carga não pode ser liberada sem documentação obrigatória.
5. Carga bloqueada não pode entrar em movimentação.
6. Carga cancelada não pode ser liberada.
7. Carga em inspeção não pode ser finalizada sem antes ser liberada.
8. Produto não pode ser cadastrado sem nome.
9. Produto não pode ser cadastrado sem classe de risco.
10. Produto inativo não pode ser usado em novas cargas.
11. Quantidade deve ser maior que zero.
12. Toda carga deve possuir responsável técnico.

## 4.2 Decisões do projeto
13. Carga bloqueada retorna para EM_ANALISE antes de nova liberação.
14. Status não pode ser alterado arbitrariamente.
15. Mudanças relevantes devem ser rastreadas no histórico.
16. Bloqueio registra responsável, hora, motivo e evidência quando aplicável.
17. Não assumir inspeção obrigatória universal sem critério definido no enunciado.

## 4.3 Liberação
A liberação deve verificar estado compatível, documentação obrigatória e demais condições aplicáveis. Se alguma condição impeditiva falhar, o status não muda.
