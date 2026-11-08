# Mundo da Bia

Casinha de faz de conta em português, com quatro humanos fictícios, três gatos, 20 looks e um bairro com casas, prédios e lojas com até 12 cômodos. Arte SVG em camadas no Phaser, TypeScript estrito e Vite. Sem serviços de dados, anúncios ou telemetria da criança.

**Estado da entrega:** evolução do piloto com construção modular, caminhada e praça; veja o [escopo e a verificação do MVP](docs/mvp.md). A aprovação dos gates não comprova acabamento visual, descoberta das ações ou desempenho em tablet real. A integração em main exige quality-gate aprovado para o mesmo SHA. Há nove alertas moderados de desenvolvimento, sem altas/críticas no audit registrado. Não há publicação Sites. Consulte [a evidência](docs/verification.md) e [a triagem](docs/dependency-audit.md).

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

A cena ocupa a tela inteira, sem distorcer a ilustração. **Brincar**, **Construir** e **Decorar** usam cartões ilustrados e bandejas recolhíveis. Em Brincar, **Turma**, **Looks** e **Objetos** compartilham a mesma bandeja. As ações acompanham a seleção num painel compacto que pode ser recolhido. No retrato, a bandeja abre na parte inferior.

Selecione um personagem e toque no chão para caminhar. Móveis sólidos bloqueiam o percurso; tocar num objeto livre faz aproximar e pegar, sem substituir o que já estiver na mão. Clicar no personagem em movimento, trocar a seleção, iniciar arraste, pressionar Escape ou mudar de ambiente interrompe na posição visível. Cancelar o arraste restaura apenas o início daquele arraste. O limiar é de oito pixels de tela, inclusive com zoom. A seleção respeita a parte visível e a profundidade dos personagens, objetos e móveis.

Arraste o fundo com **um dedo** para deslocar a câmera; o trackpad também desloca a vista. Um segundo contato não assume o gesto. Arrastar pessoas e objetos continua sendo manipulação direta. **Explorar** abre Bairro, andar e anterior/próximo. Visitar muda a vista; **Levar Bia** (ou o nome da seleção) transporta explicitamente a pessoa e o objeto carregado. Arrastar uma pessoa ou objeto solto até uma porta por 500 ms mostra uma prévia; soltar confirma. **Levar pela porta** oferece a alternativa de toque e teclado. A travessia pela borda continua disponível.

Em **Construir**, escolha **Nova casa pronta**, um modelo de Casa, Prédio ou Loja e confirme a prévia. O primeiro terreno livre é sugerido. Para ampliar, escolha um cartão de cômodo ou **Mais um andar**; a prévia ocupa uma posição disponível e só muda o mundo ao confirmar. **Organizar cômodos** preserva as opções avançadas de posição, nome e estrutura. As fachadas continuam editáveis nos cartões do bairro. Não há moedas, níveis ou avaliação de projetos.

Em **Decorar**, escolha móveis e acabamentos por cartões. Tocar adiciona a peça no espaço livre mais próximo; arrastar permite escolher o lugar. Peças sólidas não podem sobrepor outras nem bloquear a passagem da porta. Tapetes e decoração plana podem ficar sob móveis. Uma posição inválida recebe indicação e não altera o histórico. A lista **Peças neste cômodo** permite selecionar e retirar uma peça encoberta, inclusive em uma brincadeira antiga. Cores, espelhar, guardar, desfazer/refazer e esvaziar continuam disponíveis; esvaziar exige confirmação e pode ser desfeito.

**Minha casa** abre pelo mapa visual dos cômodos. **Organizar** reúne seleção da casa, nome, duplicação, mudança de terreno e exclusão com confirmação; mantém ao menos uma casa e preserva a turma e os objetos portáteis na rua ao excluir. **Mudar de terreno** move a casa para um terreno vazio ou troca com outra, mostrando a prévia e preservando tudo dentro delas. **Ideias** guarda as sugestões opcionais. A reordenação fica apenas em Organizar, e cancelar ampliação devolve o foco ao controle inicial. A turma é única entre as construções. Nome permite personalizar cada personagem até 24 caracteres ou restaurar o original. Os 20 looks incluem Homem-Aranha e Superman para todos os humanos; Rui e Léo mantêm versões com bermudas ou calças.

As portas compartilham desenho, área clicável e animação. A caminhada acelera e desacelera, alterna os passos e mantém velocidade ao receber outro destino. Corpo, roupa e objeto acompanham a acomodação em assentos e cama. Redução de movimento continua disponível. Use Tab e Enter para os controles, setas para mover a seleção e Escape para cancelar. Os alvos dos móveis aparecem ao receber foco. A praça mantém banco, balanço, plantas e bola, além das campainhas e caixas de correio nas fachadas.

A coleção cotidiana acrescenta seis móveis (pia, máquina de lavar, horta, mesa de piquenique, biblioteca e carrinho), quatro uniformes de profissões e três cômodos prontos: lavanderia, biblioteca e sala de jantar. Veja [escopo e evidências](docs/home-and-everyday.md).

Veja [as correções anteriores](docs/reliable-play.md) e [a revisão de interação e construção](docs/immersive-play.md). A verificação em Chromium não substitui teste em iPad, trackpad físico ou observação da brincadeira.

## Arquitetura

- `src/domain`: estado, identificadores, ações e regras puras. Retorna estado novo e eventos sem modificar a entrada. Sem DOM, Phaser, conteúdo ou armazenamento.
- `src/content`: catálogos visuais tipados. Importa somente tipos do domínio.
- `src/persistence`: validação estrutural e invariantes, envelope de versão e adaptador. Só `storage.ts` acessa `localStorage`.
- `src/presentation`: arte, cena, controles e gestos. Controles recebem callbacks e não importam cenas.
- `src/bootstrap`: conecta domínio, persistência e apresentação.

Arrastar personagens e móveis exibe uma prévia e confirma a posição ao soltar; cancelar restaura a posição anterior ao gesto. Saves v1/v2/v3 migram para v4 preservando a brincadeira. A coleção de casas legada e o bairro v1 migram para o envelope de bairro v2 na chave `mundo-da-bia:neighborhood:v2`. A migração fixa a entrada na célula zero, conserva a ordem relativa dos demais cômodos e desloca posições externas em 660 unidades pela inclusão da praça. As chaves antigas ficam intactas para recuperação; os próximos carregamentos usam o bairro. Localizações incluem construção e cômodo, e cada objeto tem identidade de instância separada do tipo. Dados ausentes, inválidos, duplicados ou de versão desconhecida recuperam o estado inicial. A resolução lógica é 1000, 1200 ou 1400 × 600, conforme o tamanho do cômodo, ajustada ao espaço disponível sem distorção. SVGs locais em camadas dispensam fontes e downloads de terceiros.

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
