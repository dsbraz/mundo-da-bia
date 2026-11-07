# Ateliê da Bia e coleção Palco Neon

Esta iteração transforma a casa em um projeto editável. O catálogo tem 16 tipos de peças e seis paletas. Permite mover com prévia e deslocamento preservado, espelhar, recolorir, retirar peças, trocar acabamentos, esvaziar o cômodo e desfazer/refazer as últimas 50 edições. Decoração pode ser repetida. Sofá, cama, armário, geladeira, mesa, abajur e palco têm uma unidade por casa nesta versão; podem ser retirados e adicionados em outro cômodo.

Minhas casas permite nomear, duplicar, abrir e criar uma casa vazia de dois cômodos. Os projetos são independentes e salvos neste navegador. A geometria dos cômodos ainda é fixa: não há editor de paredes estruturais ou terrenos. Personagens ficam ocultos durante a construção e voltam ao trocar para Brincar. Ocupantes e conteúdo acompanham seus móveis; retirar o suporte os devolve ao chão.

Palco Neon reúne palco, letreiro, caixas de som e espelho de camarim. Os figurinos Estrela Neon e Guardiã Aurora são desenhos originais inspirados em apresentações pop e heroínas, disponíveis para os quatro humanos. Bia continua loira. Espelho, letreiro e caixas de som são peças decorativas nesta entrega; o show continua sendo acionado pelo microfone ou pelo controle existente.

## Código e arte

- `domain/design.ts`, `layout.ts`, `houses.ts`: regras puras, coordenadas e histórico; nenhuma dependência do navegador.
- `content/furnishings.ts`: catálogo e paletas. IDs estáveis permitem acrescentar conteúdo em versões futuras sem substituir as casas existentes.
- `presentation/assets/decor.svg` e `human.svg`: novas peças e roupas vetoriais em grupos editáveis. Os móveis existentes são extraídos das camadas de sala/quarto, sem rasterização no repositório.
- `presentation/build-gesture.ts`: gesto separado, cancelamento e commit único; seleção visual usa transparência dos sprites.
- `persistence`: saves v1/v2 migram para v3, coleção usa envelope v1 e chave própria. A chave antiga continua guardando a casa ativa. Valida IDs, acabamentos, limites, fixtures únicos, ocupantes e integridade da coleção.

## Evidência

Antes da implementação, cinco exemplos do editor falharam pelo comportamento ausente; dois exemplos de coleção e dois de gesto também falharam. O teste dos novos figurinos falhou pela ausência de `neon`. Depois, os testes passaram. A CI verifica os resultados, não comprova retrospectivamente a ordem TDD.

As jornadas do navegador reproduziram um painel Minhas casas cobrindo Turminha. A altura do painel foi corrigida para deixar os controles livres; os limites de tempo e retries foram preservados. A revisão visual inclui catálogo, figurino Aurora e editor em paisagem/retrato, com capturas em `reports/`.

Resultados finais são registrados em `reports/ci.json` e `reports/mutation.json`, e nos artefatos do workflow Quality do commit entregue. A política v1 não foi alterada. O mesmo SHA precisa passar no quality-gate remoto antes de avançar main. Não há publicação Sites nem medição de FPS em Android real nesta entrega.

Validação local concluída em 07/11/2026: `quality:ci` aprovado com 176 testes unitários, sete testes dos gates e 11 jornadas de navegador, sem retries. Cobertura: domínio 99,33% linhas / 99,17% branches; persistência 100% / 98,78%. `quality:mutation` aprovado: 88,79% / 88,04%, respectivamente. JS gzip: 355.235 bytes, crescimento de 2,17% contra o relatório de main `3e76d36` (run `42396150202`).
