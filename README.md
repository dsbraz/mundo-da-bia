# Mundo da Bia

Casinha de faz de conta em português, com quatro humanos fictícios, três gatos, oito looks e dois cômodos. Arte SVG em camadas no Phaser, TypeScript estrito e Vite. Sem serviços de dados, anúncios ou telemetria da criança.

**Estado da entrega:** protótipo jogável com casa interativa e arte SVG em camadas; veja a [iteração atual](docs/world-builder.md). A integração em main exige quality-gate aprovado para o mesmo SHA. Há nove alertas moderados de desenvolvimento, sem altas/críticas no audit registrado. Não há publicação Sites. Consulte [a evidência](docs/verification.md) e [a triagem](docs/dependency-audit.md).

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

Após as atualizações compatíveis, o audit registra nove entradas moderadas em dependências de desenvolvimento, zero altas e zero críticas. Todas decorrem de minimatch, cuja correção exige mudança de versão principal nas ferramentas dependentes. Esse risco está acompanhado na [triagem](docs/dependency-audit.md).

## Brincar

Na sala, toque no armário (ou em **Abrir armário**) e arraste uma roupa até um humano. Arraste o lanche até um humano ou a comidinha até um gato para alimentar. Entregar o microfone a um humano começa o show. Brinquedos podem passar de uma mão para outra ou ser soltos no chão. Cancelar um arraste não perde o objeto. Os controles ficam nas bandejas **Turminha** e **Brincar**. Toque na casinha para trocar de cômodo ou reunir a turma. Veja a [evidência e o mapa das camadas SVG](docs/dollhouse-svg.md).

Arraste um personagem até o sofá para sentar ou até a cama para deitar. Toque na geladeira para abrir; arraste a comida até a mesa ou um personagem. Toque na gaveta para guardar e recuperar brinquedos, e no abajur para mudar a iluminação. O botão de som ativa efeitos locais.

Selecione um personagem ou arraste-o pela casa. Toque no chão para mover o selecionado; também é possível focar a casa e usar as setas. Troque de cômodo e use **Reunir todo mundo** para levar a turma. Cada personagem carrega um objeto por vez. Pegue lanche para humanos ou comidinha para gatos e toque em **Oferecer comida**. A comida retorna à brincadeira para poder ser oferecida novamente. Descansar alterna descanso; mover acorda. Humanos podem usar qualquer um dos oito looks. Começar show anima a turma; trocar de cômodo encerra o show. O navegador guarda a brincadeira automaticamente, inclusive roupas, posições, comida, descanso e show. Falha de armazenamento aparece na interface.

## Construir

Toque em **Construir** para abrir o Ateliê. Escolha móveis e decoração no catálogo, arraste as peças pela casa, mude sua cor ou espelhe. **Paredes e piso** troca os acabamentos. **Desfazer/Refazer** permite experimentar; **Brincar** devolve os personagens à casa editada. Quem estiver sentado acompanha o sofá e os objetos acompanham seus móveis.

Na casinha do canto, **Minhas casas** permite renomear, duplicar ou criar uma casa vazia. Cada projeto é salvo separadamente neste navegador. A coleção **Palco Neon** reúne palco, letreiro, caixas de som e espelho de camarim; os figurinos originais **Estrela Neon** e **Guardiã Aurora** estão no guarda-roupa. Móveis interativos têm uma unidade por casa nesta versão; decoração pode se repetir. Retire um móvel para adicioná-lo em outro cômodo.

## Arquitetura

- `src/domain`: estado, identificadores, ações e regras puras. Retorna estado novo e eventos sem modificar a entrada. Sem DOM, Phaser, conteúdo ou armazenamento.
- `src/content`: catálogos visuais tipados. Importa somente tipos do domínio.
- `src/persistence`: validação estrutural e invariantes, envelope de versão e adaptador. Só `storage.ts` acessa `localStorage`.
- `src/presentation`: arte, cena, controles e gestos. Controles recebem callbacks e não importam cenas.
- `src/bootstrap`: conecta domínio, persistência e apresentação.

Gestos cancelados preservam a última posição válida já aplicada e ignoram eventos tardios. Saves v1 e v2 migram para v3 preservando a brincadeira. A coleção de casas usa seu próprio envelope versionado; a chave antiga continua atualizada com a casa ativa. Dados ausentes, inválidos, duplicados ou de versão desconhecida recuperam o estado inicial. A resolução lógica é 1000 × 600, ajustada ao espaço disponível. SVGs locais em camadas dispensam fontes e downloads de terceiros.

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

As skills locais [bia-tdd](.agents/skills/bia-tdd/SKILL.md) e [bia-quality](.agents/skills/bia-quality/SKILL.md) orientam o trabalho. A CI não comprova retrospectivamente a ordem da escrita dos testes. Mudanças posteriores na política exigem entrega dedicada e justificativa em `docs/policy-decisions/`; a criação inicial não é uma redução de política.

Referências: [Vitest coverage](https://vitest.dev/config/coverage), [Stryker com Vitest](https://stryker-mutator.io/docs/stryker-js/vitest-runner/), [regras de dependências](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md).

## Integração sem PR e publicação

Por decisão do proprietário, PRs são opcionais. Use GitButler para commits e branches locais, `git push` para envio e `gh` para operações no GitHub. A CI executa em todas as branches. Envie a branch de trabalho, aguarde `quality-gate` e avance main para o mesmo SHA aprovado, sem merge adicional nem force-push. Se main avançar, atualize a branch e valide novamente antes de enviar.

O ruleset [main-quality](docs/main-ruleset.json) exige quality-gate e atualização com a base, sem bypass, force-push ou exclusão. Ele não exige PR. As quatro regras do diretório pai e sua `.git` permanecem preservadas. Mudanças da política devem ser isoladas e justificadas em docs/policy-decisions/; a CI compara a entrega com main (ou com o SHA anterior no envio a main).

A publicação privada no Sites precisa apontar ao mesmo SHA aprovado, limpo e enviado. Registre o `project_id` real em `.openai/hosting.json` com `static.directory: dist`; não invente ID. Só crie o Site quando a cadeia de origem puder ser concluída. O fluxo padrão do Sites pode criar um commit de sincronização diferente: se não preservar ou permitir verificar o SHA aprovado, registre bloqueio e não publique como entrega verificada. A publicação continua pendente da verificação dessa correspondência e do acesso ao repositório de origem do Sites.

## Acompanhamento sem dados da criança

A CI tenta obter o último artefato de execução válida de main. Ausência de baseline é alerta. Duração da CI e crescimento do build são comparados à política, sem bloquear por essas metas. Mutação tem tempo separado.

Registre publicação, SHA, horário do commit e horário da disponibilização para calcular lead time e frequência. Registre bugs pós-entrega, recuperação e retrabalho em issues de engenharia, sem nomes ou dados de uso da criança. Uma medição de fluidez deve conter modelo do tablet, Android, navegador, orientação, cenário, duração e FPS observados. Use como cenário a turma completa em show e arraste com troca de cômodo. Nenhum FPS real foi medido nesta entrega; Chromium emulado não comprova fluidez Android.
