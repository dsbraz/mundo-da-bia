# Mundo da Bia

Casinha de faz de conta em português, com quatro humanos fictícios, três gatos, seis looks e dois cômodos. Arte vetorial procedural no Phaser, TypeScript estrito e Vite. Sem serviços de dados, anúncios ou telemetria da criança.

**Estado da entrega:** dependências e lockfile instalados; tipagem completa, lint, arquitetura, 56 testes unitários, cobertura, build, orçamento e sete testes da automação passam. E2E e mutação ainda bloqueados pelas restrições de processos/sockets do ambiente do agente. O [repositório público](https://github.com/dsbraz/mundo-da-bia) foi criado, mas ainda não recebeu código. Consulte [a evidência](docs/verification.md). O MVP ainda não está aprovado nem publicado.

## Executar

Requer Node 22.12+. Instalação reproduzível:

```sh
npm ci
npx playwright install chromium
npm run quality
npm run dev
```

O `package-lock.json` foi gerado pela instalação realizada no terminal do proprietário. A CI usa `npm ci` e Ubuntu 24.04 explicitamente, compatível com o instalador do Playwright fixado no projeto.

No Ubuntu 26.04 local, o instalador desta versão do Playwright recusou o download. O cache existente já contém Chromium e headless shell revisão 1223, a mesma exigida pelo Playwright 1.60.0, portanto não é necessário reinstalar esses navegadores para testar nesta máquina. Isso não comprova sucesso dos testes: no sandbox do agente, a inicialização do navegador falha com `Operation not permitted`. Execute `npm run quality` no terminal normal para validar E2E e mutação.

A instalação informou 17 vulnerabilidades (12 moderadas e cinco altas). A consulta detalhada do audit ainda está pendente porque o executor não acessa registry.npmjs.org. Não foi aplicado `npm audit fix --force`; o impacto e as correções precisam ser avaliados a partir do relatório.

## Brincar

Selecione um personagem ou arraste-o pela casa. Toque no chão para mover o selecionado; também é possível focar a casa e usar as setas. Troque de cômodo e use **Reunir todo mundo** para levar a turma. Cada personagem carrega um objeto por vez. Pegue lanche para humanos ou comidinha para gatos e toque em **Oferecer comida**. A comida retorna à brincadeira para poder ser oferecida novamente. Descansar alterna descanso; mover acorda. Humanos podem usar qualquer um dos seis looks. Começar show anima a turma; trocar de cômodo encerra o show. O navegador guarda a brincadeira automaticamente, inclusive roupas, posições, comida, descanso e show. Falha de armazenamento aparece na interface.

## Arquitetura

- `src/domain`: estado, identificadores, ações e regras puras. Retorna estado novo e eventos sem modificar a entrada. Sem DOM, Phaser, conteúdo ou armazenamento.
- `src/content`: catálogos visuais tipados. Importa somente tipos do domínio.
- `src/persistence`: validação estrutural e invariantes, envelope de versão e adaptador. Só `storage.ts` acessa `localStorage`.
- `src/presentation`: arte, cena, controles e gestos. Controles recebem callbacks e não importam cenas.
- `src/bootstrap`: conecta domínio, persistência e apresentação.

Gestos cancelados preservam a última posição válida já aplicada e ignoram eventos tardios. Dados ausentes, inválidos, duplicados ou de outra versão recuperam o estado inicial. A resolução lógica é 1000 × 600, ajustada ao espaço disponível. Arte local em código dispensa fontes, imagens e outros downloads de terceiros.

## Qualidade

A fonte dos limites é `quality.policy.json`. Os comandos são:

| Comando | Resultado |
| --- | --- |
| `npm run quality:fast` | Tipagem, lint, arquitetura e testes unitários |
| `npm run quality:ci` | Fast, testes da automação, cobertura por área, build, orçamento e E2E |
| `npm run quality:mutation` | Stryker completo em domínio e persistência, com score por área |
| `npm run quality` | CI e mutação |
| `npm run test:gates` | Exemplos controlados dos mecanismos de qualidade |

Relatórios JSON e Markdown em `reports/` incluem SHA, workspace sujo/limpo, versão, limites, resultados, métricas e alertas. Relatórios antigos são apagados antes da execução correspondente. A CI guarda artefatos mesmo na falha e o check final verifica os jobs, relatórios obrigatórios e SHA limpo. Não há retries de testes. Ausência de mutantes é registrada como `not-applicable`, com score `null`, e requer investigação neste projeto que possui código elegível.

O orçamento conta todo JavaScript gerado em gzip e, conservadoramente, todos os demais arquivos do build como assets iniciais. Cobertura soma contadores separadamente por área, nunca faz média entre domínio e persistência. As exclusões de tamanho são explícitas: testes e catálogos declarativos; os demais checks continuam ativos. Não há assets gerados no código-fonte nem exceções de limites.

As skills locais [bia-tdd](.agents/skills/bia-tdd/SKILL.md) e [bia-quality](.agents/skills/bia-quality/SKILL.md) orientam o trabalho. A CI não comprova retrospectivamente a ordem da escrita dos testes. Mudanças posteriores na política exigem PR dedicado e justificativa em `docs/policy-decisions/`; a criação inicial não é uma redução de política.

Referências: [Vitest coverage](https://vitest.dev/config/coverage), [Stryker com Vitest](https://stryker-mutator.io/docs/stryker-js/vitest-runner/), [regras de dependências](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md).

## Integração e publicação pendentes

O destino autorizado é `dsbraz/mundo-da-bia`, público. A criação local usou `but init --commit`, preservando a `.git` e o `AGENTS.md` do diretório pai. Use GitButler para commits, branches, push e PR. O repositório remoto foi criado via API; ainda falta configurar a conexão local, enviar o código e abrir PR. Após enviar a base inicial, aplique `docs/main-ruleset.json` via API de rulesets e confira que exige PR, branch atualizada e `quality-gate`, sem bypass, force-push ou exclusão.

A publicação privada no Sites precisa apontar ao mesmo SHA aprovado, limpo e enviado. Registre o `project_id` real em `.openai/hosting.json` com `static.directory: dist`; não invente ID. Só crie o Site quando a cadeia de origem puder ser concluída. O fluxo padrão do Sites pode criar um commit de sincronização diferente: se não preservar ou permitir verificar o SHA aprovado, registre bloqueio e não publique como entrega verificada. Nenhuma publicação foi tentada aqui porque os gates ainda não passaram.

## Acompanhamento sem dados da criança

A CI tenta obter o último artefato de execução válida de main. Ausência de baseline é alerta. Duração da CI e crescimento do build são comparados à política, sem bloquear por essas metas. Mutação tem tempo separado.

Registre publicação, SHA, horário do commit e horário da disponibilização para calcular lead time e frequência. Registre bugs pós-entrega, recuperação e retrabalho em issues de engenharia, sem nomes ou dados de uso da criança. Uma medição de fluidez deve conter modelo do tablet, Android, navegador, orientação, cenário, duração e FPS observados. Use como cenário a turma completa em show e arraste com troca de cômodo. Nenhum FPS real foi medido nesta entrega; Chromium emulado não comprova fluidez Android.
