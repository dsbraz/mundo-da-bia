# Evidência de implementação — 2026-11-06

Esta é uma entrega local parcial, não uma aprovação do MVP ou publicação.

## Verificação das correções visuais e de dependências

A nova execução do proprietário passou todos os checks: CI em 49,476 s e mutação em 27,273 s. As três jornadas E2E passaram sem retries ou flakiness. A captura foi revisada e os 11 ícones/retratos SVG aparecem corretamente, inclusive os objetos na cena Phaser. O build contém 338.045 bytes de JavaScript gzip e 10.485 bytes de assets não JavaScript.

Vite foi atualizado para 7.3.7 e dependency-cruiser para 17.4.3. O audit atualizado registra zero altas/críticas e nove entradas moderadas, restritas à cadeia de minimatch nas ferramentas de desenvolvimento. O manifesto e o lockfile estavam modificados na execução, por isso os relatórios têm `dirty: true` e não aprovam formalmente o próximo commit. Não é necessário repetir testes só por essa documentação; a CI deverá verificar o SHA final após push/PR.

A conexão do checkout com o remoto ainda precisa ser configurada. `but config forge list-users` informou que não há conta de forge autenticada no GitButler; essa autenticação é independente do `gh`, já funcional. O repositório público existe, mas ainda não contém commits, ruleset ou PR. Nenhuma publicação ocorreu.

## Execução completa no terminal do proprietário

Os relatórios de CI e mutação apontam para o commit limpo `9805d4e1039ee3ec6fd96f7ae5bdf3511d82cca9`, política 1. Todos os checks passaram: CI em 52,193 s; mutação em 23,456 s. As três jornadas E2E passaram, sem retry, flaky ou teste pulado. Score de mutação por área: domínio 82,69% (172/208), persistência 86,39% (127/147).

A captura `reports/tablet.png` foi inspecionada. O layout e os personagens aparecem, porém emojis de personagens e objetos foram renderizados como quadrados por falta de glifos. Essa revisão visual detectou um defeito que as jornadas funcionais não detectavam. A correção posterior usa 11 SVGs locais (retratos e objetos), carregados também pelo Phaser. Foi acrescentada à jornada uma verificação de carregamento das imagens HTML. Tipagem, lint, arquitetura, testes e build da correção passaram localmente; a nova revisão visual/E2E deve ser executada fora do sandbox. O PNG anterior foi preservado em `reports/tablet-before-icons.png` para comparação.

O audit detalhado foi recebido. Todas as entradas apontam para pacotes `dev: true` no lockfile; não há entrada reportada para as dependências de produção. Isso não elimina o risco de ferramentas de desenvolvimento. Veja [a triagem](dependency-audit.md).

## Atualização após instalação no terminal do proprietário

- `npm install` concluiu e gerou `package-lock.json`; a ausência de dependências foi resolvida.
- Passam tipagem completa, lint, arquitetura e os 56 testes unitários. Cobertura permanece acima dos limites nas duas áreas.
- Build de produção passou: JavaScript gzip **338.049 bytes**, assets não JavaScript **5.153 bytes**.
- Os sete testes da automação agora passam, inclusive import proibido e ciclo via alias. A execução original falhou com `spawnSync ... EPERM`; foi alterada para execução assíncrona e relatório em arquivo. A tentativa intermediária de capturar stdout produziu saída vazia no sandbox; `--output-to` permitiu verificar o relatório real, sem ignorar erros ou fixtures.
- O instalador do Playwright 1.60.0 recusou Ubuntu 26.04. O cache contém a revisão Chromium 1223 requerida. A tentativa de iniciar esse binário falhou com `sandbox_host_linux.cc:41 ... Operation not permitted`, não por navegador ausente. A CI foi fixada em Ubuntu 24.04, removendo a dependência da mudança futura de `ubuntu-latest`.
- E2E local continua bloqueado: o servidor do Playwright não inicia neste executor. Stryker também falha ao criar o servidor de logging com `listen EPERM`.
- `npm audit` foi tentado, mas o endpoint permanece inacessível (`EAI_AGAIN`). A instalação no terminal normal informou 17 vulnerabilidades, sendo 12 moderadas e cinco altas; não houve triagem detalhada nem correção automática.
- Repositório público criado via API: https://github.com/dsbraz/mundo-da-bia. Ainda está sem código enviado, PR, ruleset aplicado ou CI executada. Nenhuma publicação Sites foi feita.

As seções abaixo preservam a evidência histórica da primeira implementação. Os bloqueios de dependências e de criação do repositório descritos nelas foram superados como indicado acima.

## TDD executado

1. Domínio e persistência: 34 exemplos escritos com funções lançando `not implemented`. Vitest executado: 34 falhas pelo comportamento ausente. Após implementação: 34 aprovados.
2. Gestos: dois testes falharam com `not implemented`; após implementação, dois aprovados. Cancelamento e exclusividade do ponteiro cobertos.
3. Métricas e gate: quatro testes executados diretamente pelo runner `node:test` falharam com `not implemented`; quatro aprovados após implementação. O subprocesso do runner Node 26 não mostrou diagnósticos neste sandbox; a execução direta dos arquivos forneceu a evidência.
4. Restrição de `localStorage` com acesso por colchetes: teste falhou antes da inclusão do seletor de literal; passou depois.
5. Foram adicionados casos de dados inválidos e armazenamento bloqueado para fortalecer as verificações existentes.

Logs da sessão em `/tmp/bia-red.log`, `/tmp/bia-green.log`, `/tmp/bia-gesture-red.log`, `/tmp/bia-gesture-green.log`, `/tmp/bia-gates-red.log`, `/tmp/bia-gates-green.log` e `/tmp/bia-storage-rule-red.log`. Esses caminhos são temporários e não são requisitos da CI.

## Verificado

- 56 testes Vitest aprovados.
- Cobertura de domínio: linhas 96,77%; ramificações 98,11%.
- Cobertura de persistência: linhas 100%; ramificações 98,03%.
- ESLint do código passa, incluindo limites de tamanho, complexidade e restrições de APIs.
- TypeScript do domínio sem biblioteca DOM passa.
- Seis testes da automação passam: orçamento, cobertura por área, score de mutação/ausência, relatório/SHA/check faltante, complexidade e APIs proibidas.
- Skills validadas com `/usr/bin/python3 .../skill-creator/scripts/quick_validate.py`. O Python selecionado pelo ambiente não tinha PyYAML; o Python do sistema tinha.

Ferramentas de verificação copiadas de instalação local existente, em versões idênticas às declaradas: Vite 7.3.6, Vitest e coverage-v8 4.1.12, TypeScript 5.9.3, ESLint 9.39.4, typescript-eslint 8.58.2, Playwright 1.60.0. Node disponível: 26.13.0. CI planejada: Node 22.

## Bloqueios e verificações ainda necessárias

- npm: DNS `EAI_AGAIN` para `registry.npmjs.org`; a instalação offline não tem todas as dependências. Faltam Phaser, Stryker e dependency-cruiser. Não há lockfile resolvido.
- Tipagem completa, build e orçamento real dependem de Phaser. Não foram aprovados.
- Imports proibidos e ciclos possuem fixtures reais, mas sua execução falha com `ENOENT` por falta de dependency-cruiser. A suíte de automação inteira não passa.
- Score de mutação não foi medido. Não foi substituído por cobertura ou valor inventado.
- Jornadas Playwright foram escritas, mas aprovação E2E, screenshots e revisão visual continuam pendentes. Não houve medição em tablet Android real nem aceitação por Beatriz.
- GitHub: `gh api user` e criação do repositório falharam por falta de conexão a `api.github.com`. `gh auth status` também informou credencial inválida, o que precisa ser reavaliado com conectividade. O conector disponível não oferece criação de repositório.
- Não existem PR, ruleset aplicado, CI remota ou publicação Sites verificados. O JSON do ruleset é configuração preparada, não comprovação de aplicação.

Os relatórios locais de `npm run quality` em `reports/ci.json` e `reports/mutation.json` são a evidência de execução mais recente. Devem reprovar enquanto esses bloqueios existirem. Não reduzir limites para contorná-los.

O executor de qualidade usa subprocessos assíncronos: a execução síncrona retornou `EPERM` neste sandbox mesmo com saída do comando Git; a leitura assíncrona terminou com código zero. Stryker foi fixado em 10.1.1, cujo runner declara suporte ao Vitest >=2 e usa Vitest 4.1 em seus próprios testes ([manifesto oficial](https://github.com/stryker-mutator/stryker-js/blob/v10.1.1/packages/vitest-runner/package.json)). Isso não substitui a validação de instalação/mutação pendente.
