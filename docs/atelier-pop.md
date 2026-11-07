# Ateliê Pop — implementação e verificação

## Escopo

Dois modos, uma bandeja, cartões de cômodos e navegação direta. Estado de modo, câmera, seleção, arraste e painéis fica na apresentação. Os controles HTML recebem callbacks da inicialização; não importam cenas Phaser. A ação tipada `transfer` move um objeto solto entre cômodos, preservando identidade e quantidade. Reordenar redistribui as células existentes sem mudar IDs. O envelope de salvamento continua v4.

A cena renderiza o cômodo atual e apenas o vizinho necessário durante a navegação, em containers vivos. O dono do gesto é fixado no início; navegação exige 12 px e confirma em 25% da largura. Transporte exige 500 ms nos 48 px da borda, admite uma travessia e só confirma ao soltar. Cancelamento descarta a prévia. Móveis não atravessam. As acomodações são imediatas, inclusive com redução de movimento.

Após a ampliação do escopo pelo proprietário, toda a turma foi redesenhada em camadas. A opção A, ilustração com traço fino e formas definidas, foi escolhida em comparação com recortes sem contorno. Bia é loira e de pele clara. Os 11 looks usam a nova silhueta; Rui e Léo recebem versões com bermuda, calça ou macacão, preservando os IDs existentes. Sombras sob os pés ficaram discretas. Botões receberam ícones SVG próprios e miniaturas da nova turma. A sala combina arquitetura creme, madeira, tecido azul, coral e lilás e pôsteres musicais. As áreas de interação dos móveis e personagens foram preservadas.

## Evidência de desenvolvimento

- `npm test -- src/domain/atelier.test.ts`: três exemplos falharam pela ausência de transferência/reordenação; após implementação, os três passaram, incluindo round-trip do save e rejeições.
- `npm test -- src/presentation/navigation.test.ts`: três exemplos falharam com o controlador vazio; passaram após implementar limiares, extremos, retorno e exclusividade do ponteiro.
- Testes adicionais cobrem espera de borda, reinício da espera, confirmação apenas ao soltar e cancelamento. A execução desses exemplos foi registrada verde; não se atribui a eles evidência histórica vermelho/verde.
- As jornadas antigas foram adaptadas para as entradas novas, mantendo alimentação, assentos, móveis, objetos, roupas, múltiplas casas e persistência. Foram acrescentados transporte, cancelamento, cartões, modos, confirmação de limpeza, teclado e orientações.
- Os limites permanecem em `quality.policy.json`, versão 1, sem alterações. Relatórios canônicos: `reports/ci.json`, `reports/mutation.json`; a CI associa o SHA exato e exige workspace limpo.

## Revisão visual e limites

Chromium do Playwright, emulação com toque: 1024×768, 768×1024 e 915×412. Capturas em `reports/atelier-refined.png`, `reports/atelier-cast.png`, `reports/atelier-bia.png` e `reports/atelier-home.png`. A primeira inspeção identificou controles contextuais afastados após mudança de orientação; o posicionamento foi atualizado. A captura de ponteiro dos cartões também foi corrigida para preservar visitas por toque.

A sessão observada com Bia permanece **pendente por escolha do proprietário**. Não houve observação de criança, coleta de dados pessoais nem medição de FPS em Android real. A aprovação dos testes não demonstra a aceitação prática de completar as ações sem instruções verbais contínuas.

Roteiro pendente: visitar outro cômodo, levar um personagem, trocar roupa, decorar e desfazer. Registrar somente dificuldades e necessidade de ajuda. Para fluidez real, registrar modelo do tablet, versão Android, navegador, orientação, cenário e duração; não registrar dados pessoais.

## Referências de direção

[Townscaper](https://www.townscapergame.com/) orientou a experimentação com resposta imediata. [Happy Home Paradise](https://play.nintendo.com/media/videos/animal-crossing-happy-home-designer-trailer/) orientou os modelos como ponto de partida. [Tearaway](https://blog.playstation.com/2013/10/17/tearaways-papery-challenges-and-character-customization/) orientou camadas e recortes gráficos. Não foram reproduzidos assets nem adicionadas moedas ou progressão.

Para o refinamento da turma, foram consultados [Lost in Play](https://developer.apple.com/news/?id=n4w6zydm) e [Toca Boca World](https://www.tocaboca.com/toca-boca-world). Os desenhos e ícones implementados são próprios.
