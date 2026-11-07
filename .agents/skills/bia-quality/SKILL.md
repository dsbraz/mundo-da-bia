---
name: bia-quality
description: Verificar mudanças do Mundo da Bia, interpretar gates e preparar evidência de entrega e métricas.
---

Leia [quality.policy.json](../../../quality.policy.json), fonte única dos limites, e [README.md](../../../README.md).
Use `npm run quality:fast` no incremento; `npm run quality:ci` e `npm run quality:mutation` antes da integração, ou `npm run quality` para ambos.
Inspecione `reports/ci.json`, `reports/mutation.json` e os resumos correspondentes. Relatório ausente, execução pulada ou infraestrutura indisponível nunca significa aprovação.
Compare com a última execução válida de main (`reports/baseline/ci.json`), distinguindo alertas de bloqueios.
Execute `npm run test:gates` ao mudar automação. Valide as skills com o validador da skill-creator quando disponível e confira referências e comandos.
Registre SHA, versão da política e evidência vermelho/verde na descrição do commit ou do PR opcional. Só publique o commit aprovado; confira a correspondência retornada pelo Sites.
Política só muda em entrega dedicada e justificada, separada de funcionalidade e automação. Nunca reduza exigências automaticamente.
Registre dispositivo e cenário para métricas de tablet. Chromium emulado não comprova desempenho Android. Não colete dados da criança.

Siga o fluxo sem PR descrito em [AGENTS.md](../../../AGENTS.md): CI na branch de trabalho e promoção do mesmo SHA aprovado para main.
