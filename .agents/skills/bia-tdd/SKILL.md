---
name: bia-tdd
description: Desenvolver comportamentos e corrigir bugs no Mundo da Bia com testes primeiro e fronteiras de arquitetura preservadas.
---

Defina um exemplo observável; escreva e execute o teste antes do comportamento.
Confirme que o vermelho vem do comportamento ausente, não de dependência ou sintaxe.
Implemente o mínimo, obtenha verde e só então refatore. Registre comandos, exemplos e resultados no PR, sem exigir commits quebrados.
Use Vitest junto ao módulo e Playwright em `e2e/` para jornadas. Controle tempo e aleatoriedade; não use esperas arbitrárias.
Leia [a política](../../../quality.policy.json) e [a arquitetura](../../../README.md).
Execute `npm run quality:fast` durante o ciclo e `npm run quality` antes da integração.
Domínio é puro; controles HTML recebem callbacks da inicialização. Não importe cenas nos controles.
Não afrouxe limites para passar. CI prova resultados, não a ordem histórica de autoria.
