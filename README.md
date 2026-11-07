# Mundo da Bia

Casinha de faz de conta em português, com quatro humanos fictícios, três gatos, 14 looks e um bairro com casas, prédios e lojas com até 12 cômodos. Arte SVG em camadas no Phaser, TypeScript estrito e Vite. Sem serviços de dados, anúncios ou telemetria da criança.

**Estado da entrega:** protótipo jogável com casa interativa e arte SVG em camadas; veja a [iteração Ateliê Pop](docs/atelier-pop.md). A integração em main exige quality-gate aprovado para o mesmo SHA. Há nove alertas moderados de desenvolvimento, sem altas/críticas no audit registrado. Não há publicação Sites. Consulte [a evidência](docs/verification.md) e [a triagem](docs/dependency-audit.md).

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

## Brincar e decorar

A barra principal oferece **Minha casa**, **Brincar**, **Decorar** e uma única bandeja. Em Brincar, escolha **Turma**, **Looks** ou **Objetos**. Toque em um personagem e em **Trazer aqui**, ou arraste sua miniatura para a cena. Um look veste a seleção; arrastá-lo permite vestir outro humano. As ações de vestir, descansar e soltar aparecem junto ao personagem. Alimentação, assentos e efeitos dos móveis continuam na cena.

Arraste com dois dedos horizontalmente para visitar o cômodo vizinho. Um dedo continua selecionando e movendo pessoas, objetos e móveis; arrastar o fundo não move ninguém. A cena acompanha o dedo; menos de 25% da largura retorna à origem. Os cartões em Minha casa, acessíveis por teclado, oferecem uma alternativa. Visitar não transporta personagens. Para transportar alguém ou um objeto solto, mantenha o arraste por 500 ms nos 48 px da borda e solte no destino. A barra lateral mostra a espera. Escape ou cancelamento restaura o mundo; cada arraste permite uma travessia.

Em **Decorar**, a bandeja reúne **Móveis**, **Decoração** e **Acabamentos**, com filtro de coleção. Toque para adicionar ou arraste a miniatura até o local desejado. Arrastar uma peça move; a seleção mostra cores, espelhar e guardar. Desfazer e refazer permitem experimentar. Nesse modo, personagens não recebem gestos e móveis não ativam brincadeiras. Esvaziar fica nas opções do cômodo, exige confirmação e pode ser desfeito.

Em **Minha casa**, toque nos cartões para visitar, arraste para reordenar ou use Antes/Depois. **+ Cômodo** oferece modelos com nome sugerido e tamanho médio. Nome e tamanho ficam nas opções secundárias. O painel também reúne o bairro, som, duplicação de ambientes e decoração, reunir a turma e ideias opcionais. A turma é única entre todas as construções. Não há moedas, níveis ou avaliação de projetos.

Use Tab e Enter para os controles. Os alvos dos móveis aparecem ao receber foco: em Decorar, selecione e use as setas para mover. As setas na área da casa movem o personagem selecionado em Brincar. Escape cancela arrastes e recolhe a bandeja. A sala e toda a turma receberam a direção de ilustração com traço fino, aprovada pelo proprietário. Bia é loira e de pele clara; Rui e Léo têm versões dos looks com bermudas ou calças. Os botões usam ícones ilustrados e rótulos curtos.

No cartão de cada personagem, **Nome** permite personalizar até 24 caracteres ou restaurar o original. Os looks Rumi, Mira e Zoey preservam rosto e cabelo; Rui e Léo mantêm bermudas/calças.

Na rua, dois dedos deslocam a vista sem inércia. Em Decorar, toque no terreno ou abra **Construir** para escolher Casa, Prédio ou Loja. Fachadas têm nome e cor; terrenos crescem em pares. Desfazer/refazer vale para a sessão de edição do local e encerra ao visitar outro lugar ou voltar a Brincar. Tocar na porta visita sem levar ninguém. Arrastar uma pessoa ou objeto solto até a porta por 500 ms mostra uma prévia; soltar confirma. **Levar pela porta** oferece a alternativa de toque e teclado. Veja [a implementação do bairro](docs/neighborhood.md).

## Arquitetura

- `src/domain`: estado, identificadores, ações e regras puras. Retorna estado novo e eventos sem modificar a entrada. Sem DOM, Phaser, conteúdo ou armazenamento.
- `src/content`: catálogos visuais tipados. Importa somente tipos do domínio.
- `src/persistence`: validação estrutural e invariantes, envelope de versão e adaptador. Só `storage.ts` acessa `localStorage`.
- `src/presentation`: arte, cena, controles e gestos. Controles recebem callbacks e não importam cenas.
- `src/bootstrap`: conecta domínio, persistência e apresentação.

Arrastar personagens e móveis exibe uma prévia e confirma a posição ao soltar; cancelar restaura a posição anterior ao gesto. Saves v1/v2/v3 migram para v4 preservando a brincadeira. A coleção de casas legada migra para o envelope de bairro v1 na chave `mundo-da-bia:neighborhood:v1`. As chaves antigas ficam intactas para recuperação; os próximos carregamentos usam o bairro. Localizações incluem construção e cômodo, e cada objeto tem identidade de instância separada do tipo. Dados ausentes, inválidos, duplicados ou de versão desconhecida recuperam o estado inicial. A resolução lógica é 1000, 1200 ou 1400 × 600, conforme o tamanho do cômodo, ajustada ao espaço disponível sem distorção. SVGs locais em camadas dispensam fontes e downloads de terceiros.

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
