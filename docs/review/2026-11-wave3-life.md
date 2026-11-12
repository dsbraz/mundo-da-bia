# Onda 3, segunda revisão: o jogo da vida (novembro de 2026)

**Autor:** diretor de arte e de game design, autor de `2026-11-specialists.md` e de `2026-11-wave3-depth.md`.
**Base:** nova direção do proprietário (11 e 12/11/2026); `main` com os lotes 1 a 4 de `2026-11-wave3-depth.md` entregues (save v3 e relógio, personalidades e falas, cozinha com receitas, comer e livro, horta da praça); capturas em `reports/` e `reports/wave3-garden/`.
**Natureza:** só planejamento. Nenhum código foi alterado. Este documento **substitui os lotes 5 a 8** de `2026-11-wave3-depth.md`. As seções 3.1 a 3.3 e 4 daquele documento continuam valendo onde não forem revogadas aqui.
**Limite desta revisão:** o diagnóstico de arraste vem de leitura de código. Não reproduzi as falhas no navegador, porque o README registra que o Chromium não inicia no sandbox do agente. Por isso cada causa abaixo está marcada como **confirmada no código** ou **hipótese**, e o lote 1A começa por um teste E2E que reproduz cada uma antes de corrigir.

---

## 1. Visão: um jogo da vida visto por uma criança de 7 a 10 anos

### 1.1 O que muda na frase do jogo

Antes: "uma casa de bonecas viva, que convida a inventar histórias sem nunca cobrar nada".
Agora: **"um pequeno mundo que funciona como o de verdade, do jeito que uma criança entende o de verdade".** As pessoas dormem na cama, comem sentadas à mesa, cozinham no fogão, compram comida no mercado, vão à escola e ao trabalho, brincam, ficam com fome, sono e tédio, e ficam bem de novo quando alguém cuida delas.

"Pela visão da criança" quer dizer três coisas concretas:
1. **As regras são as que ela já conhece da própria casa**, e não as de um simulador adulto. Não há dinheiro contado, conta de luz, emprego que demite nem doença. Há "pra dormir precisa de cama", "pra cozinhar precisa de fogão", "a comida vem do mercado", "depois do almoço dá sono".
2. **A regra se explica sozinha, sem texto.** Quando falta algo, o personagem mostra o que falta com o corpo e um desenho. Nunca falha em silêncio e nunca aparece um "X" vermelho.
3. **A criança é a diretora.** O mundo tem ritmo e sugere, mas não obriga. Ninguém sai de casa sozinho e nenhuma rotina acontece contra a vontade dela.

### 1.2 Pilares (substituem os de `2026-11-wave3-depth.md` §2)

1. **Todo toque responde, perto do dedo** (sem mudança). Agora inclui o arraste: o personagem sempre vai para onde o dedo o soltou, ou mostra por que não foi.
2. **Mostrar antes de escrever** (sem mudança). Necessidade, falta de móvel, rotina e compra se leem por desenho.
3. **Personagens vivos com personalidade** (ampliado). Além de falas e prato favorito, cada um tem um ritmo de fome, sono e tédio e uma brincadeira favorita.
4. **O mundo tem regras de verdade, e elas se explicam** (novo). Toda regra tem uma afordância visível (o móvel brilha quando serve) e uma recusa explicada (a "bolha do que falta", §3.3). As regras dão sentido à construção: construir um mercado passa a importar porque a comida vem de lá.
5. **Sentimentos sim, castigo não** (substitui "Metas e conquistas sem castigo").
   - Fome, sono e tédio existem e aparecem no rosto, no corpo e numa bolha com desenho.
   - Ninguém morre, adoece, vai embora, desobedece nem perde nada. Ficar triste não muda o que a criança consegue fazer.
   - **A ausência não custa nada.** As necessidades só andam com a sessão aberta e em Brincar. Fechar o jogo por 30 dias não deixa ninguém pior: as necessidades nem são salvas, e toda sessão começa de manhã com todos descansados.
   - Metas, coleções, desbloqueios e histórias com final continuam permitidos. Continuam proibidos placar, moeda contada, "x de y", barra de progresso, estrelas de avaliação e qualquer dígito na UI da criança.
6. **A obra da criança nunca se perde** (sem mudança).
7. **Poucos sistemas fundos** (substitui "Profundidade por descoberta", que continua valendo como técnica). São quatro sistemas, e todos conversam entre si: necessidades, regras dos móveis, despensa e mercado, e rotina com família. Uma ideia que não toca pelo menos dois deles fica para depois.

### 1.3 O que muda em relação ao plano anterior

| Antes (`2026-11-wave3-depth.md`) | Agora | Por quê |
| --- | --- | --- |
| Lote 5 era a padaria | **O mercado vem antes, e a padaria vai para a onda 4** | A padaria é um lugar onde *outros* comem o que ela faz. O mercado é de onde vem a comida *da casa*, e é ele que dá sentido ao fogão, à geladeira e à construção. Sem mercado, a padaria seria mais um balcão. |
| 9 ingredientes básicos infinitos (§3.1) | **Os básicos viram estoque da casa, comprado no mercado**, com até 4 de cada, desenhados na geladeira | É o pedido do proprietário: "a comida pode precisar ser comprada antes". A migração enche a despensa e o lanche de sempre nunca acaba, para não haver beco sem saída (§3.4). |
| Colheita da horta vai para a cesta | **Igual** | Já funciona e já é o "de onde vem" da horta. |
| Sementes e especiais chegavam por carta | **São vendidos no mercado.** O correio vai para a onda 4. | O mercado substitui o correio como origem. Assim a carta pode voltar na onda 4 como história, e não como entrega de itens. |
| Dia e noite no lote 6, só visual | **Dia e noite sobem para o lote 2**, junto das necessidades | Sono sem noite não faz sentido. `phaseAt` já existe e não é usado em lugar nenhum. |
| Pedidos em casa (W3-03) | **Absorvidos pelas necessidades** | A bolha de fome com o prato favorito *é* o pedido, só que com motivo. |
| Gestos sociais (W3-08) | **Entram nas necessidades**: abraço e brincar junto curam tédio e tristeza | Ganham função. |
| Assentos fixos (4 no mundo inteiro) | **Assento por peça**, com a cadeira como peça nova | Sem isso não existe "comer sentado", "dormir na cama do quarto 2" nem "sentar na carteira da escola". |
| Só crianças e gatos | **Dois adultos** | Pedido explícito. Ver as perguntas da seção 6. |

### 1.4 O que este documento revoga

| Trecho | Situação |
| --- | --- |
| `2026-11-wave3-depth.md` §2, pilar 5 ("a ausência não custa nada", "freguês espera para sempre", "sem notificação") | Substituído pelo pilar 5 acima. A ausência continua sem custo, mas fome, sono e tédio existem durante a sessão. |
| `2026-11-wave3-depth.md` §8, "Fica fora desta onda": "Plantas que murcham, **fome que piora**, freguês que vai embora bravo" | Revogado só para "fome que piora": a fome cresce durante a sessão, até um teto, e nunca causa dano. Plantas continuam sem murchar. |
| `2026-11-wave3-depth.md` §8, "Fica fora": "Assentos por peça" e "Moeda, preço, loja de compra" | Assento por peça entra (W3L-06). Loja de compra entra como mercado **sem moeda** (§3.4). Moeda e preço continuam fora. |
| Gate da onda 3: "um freguês ignorado por 10 minutos continua sem mudar de expressão para triste" | Sai junto com a padaria. Entra no gate: "um personagem com fome por 10 minutos fica triste no rosto e nada mais muda" (§5). |
| Comentário em `src/domain/care.ts:5` ("no hungry or sad state, nothing new saved") | Fica obsoleto em W3L-10, que o reescreve. |
| `2026-11-wave3-depth.md` lotes 5 a 8 | Substituídos pelos lotes 1A a 6 da seção 5. O destino de cada item antigo está em §5.8. |

---

## 2. Diagnóstico da jogabilidade (UX)

### 2.1 "Arrastar personagens falha o tempo todo"

O arraste de personagem passa por cinco camadas: `input.ts` (eventos de ponteiro) → `camera-gesture.ts` (fundo ou objeto) → `house-input.ts` com `two-finger.ts` (dois dedos e borda) → `neighborhood-gesture.ts` (portas) → `play-gesture.ts` (o arraste em si). Cada camada pode engolir o gesto, e nenhuma avisa quando faz isso. Encontrei nove causas, em ordem de impacto estimado.

| # | Causa | Evidência | O que a criança vê | Situação |
| --- | --- | --- | --- | --- |
| D1 | **O alvo é medido no dedo, mas o boneco é desenhado abaixo dele.** O personagem segue o dedo com o deslocamento da pega (`offset`), e por isso aparece *abaixo* do dedo. Mas o assento e a porta são procurados no ponto do dedo. O assento aceita ±45 px na horizontal e ±55 px na vertical em torno do ponto de sentar. Quem pega pela cabeça ou pelo peito (a pega natural, porque o boneco tem 175 px de altura) tem o dedo de 90 a 150 px acima dos pés. Assim, quando os pés estão sobre o sofá, o dedo está fora da tolerância. | `play-gesture.ts:59` (desenho em `point + offset`), `:74` (`seatAt(state, point)` com o ponto cru); `furniture-targets.ts:32` (±45/±55); altura de pega em `targets.ts:59` | Solta a Bia em cima do sofá e ela fica **em pé dentro do sofá**, ou cai no chão ao lado. Só funciona pegando pelos pés. | confirmada no código |
| D2 | **Só existem 4 assentos no mundo, e só o primeiro móvel de cada tipo conta.** `seatIds` é fixo (`sofa-left`, `sofa-right`, `bed`, `armchair`) e o assento é achado por `fixture()`, que devolve o primeiro móvel daquele tipo no cômodo. Mesa de piquenique, carteira, banco e almofada não são assento. Não existe cadeira. | `types.ts:17`; `furniture.ts:6-11`, `:58-62`; `layout.ts:48`; lista de peças em `types.ts:62` | Soltar no segundo sofá, na segunda cama ou à mesa não faz sentar. Para ela, o arraste "não pegou". | confirmada no código |
| D3 | **Soltar sobre um assento ocupado não faz nada, nem mover.** `finishActor` despacha `sit` e sai. Se o assento está ocupado, `sit` devolve o mesmo estado sem evento e o personagem volta para onde estava antes do arraste. | `play-gesture.ts:75`; `furniture.ts:23` | O boneco **volta voando para o lugar de antes**. Parece erro. | confirmada no código |
| D4 | **Soltar fora da área do jogo cancela.** Se o dedo sobe sobre o painel lateral, o cabeçalho ou o dock do retrato, `pointerup` chama `cancel()` antes de `end`. Com o painel de 320 px colado na cena (§2.2), soltar perto da borda direita é comum. | `input.ts:41-44` | Ela arrasta a Bia até a direita, solta um pouco além, e a Bia **volta ao início**. | confirmada no código |
| D5 | **O boneco congela em vez de encostar no limite.** `destination()` só aceita pontos dentro de `validPoint` (x de 60 a largura − 60, y até 540). Fora disso, devolve a última posição válida. Pegando pelo peito (`offset.y ≈ +90`), basta o dedo descer abaixo de y ≈ 450 para os pés passarem de 540. É o quarto de baixo da cena. Na rua a faixa de chão é ainda mais fina (430 a 540). | `play-gesture.ts:58-61`; `geometry.ts:4-6`; `floor-band.ts:4` | O boneco **para de seguir o dedo** no pé da tela e nas paredes, e só "descola" quando o dedo volta. | confirmada no código |
| D6 | **Errar o pixel do boneco vira arrastar a câmera.** O toque só pega o personagem se cair num pixel com alfa > 32 do desenho. Vão entre as pernas, ponta do cabelo, borda do braço e o espaço entre braço e corpo não contam. Quando o toque erra, `camera-gesture` decide que é fundo e o arraste **move a vista**. Além disso, quem está atrás de um móvel (`occludingDepth`) não pode ser pego. | `scene.ts:183`; `visible-hit.ts:16`; predicado de fundo em `main.ts:221`; `camera-gesture.ts:11`, `:16-18`; oclusão em `targets.ts:26` | Ela encosta na Bia, arrasta, e **a casa anda** em vez da Bia. Com dedo de criança num tablet, o erro de alguns pixels é a regra, não a exceção. | confirmada no código |
| D7 | **A porta só aceita quem espera meio segundo parado.** A troca de cômodo por arraste exige 500 ms com o dedo sobre a porta. Soltar antes disso faz o personagem ficar em pé diante da porta. O caminho direto `cross` de `play-gesture` está morto: `main.ts:218` não passa `cross` para `bindInput`. Na borda da tela há outro gatilho, também de 500 ms, numa faixa de 48 px, que leva ao cômodo vizinho mesmo quando ela só queria pôr a Bia perto da parede. | `neighborhood-gesture.ts:28-37`; `play-gesture.ts:72-73` (morto); `edge-transfer.ts:15`, `:20-24`; `house-input.ts:48` | Solta na porta e "não entra". Ou o contrário: segura perto da borda e **muda de cômodo sem querer**. | confirmada no código |
| D8 | **Uma mão apoiada na tela trava o arraste.** `camera-gesture` ignora qualquer toque enquanto houver mais de um contato. Se a palma encosta primeiro, ela vira o gesto e o dedo é ignorado. Pior: esse contato não ganhou `setPointerCapture` (`input.ts:32-35` só captura quando `start` devolve verdadeiro). Se ele sobe fora do canvas, o `pointerup` nunca chega, o id fica preso em `contacts`, e **todo toque seguinte é ignorado** até a janela perder o foco. | `camera-gesture.ts:10`, `:22`; `input.ts:32-35`, `:47-54` | O jogo "para de responder ao arraste" por um tempo e volta sozinho. | hipótese: em toque o navegador costuma capturar o ponteiro implicitamente, o que pode evitar o id preso. Reproduzir com dois ponteiros **de toque** no E2E antes de corrigir |
| D9 | **Escolher outra pessoa repinta a cena inteira no meio do toque.** Tocar em quem não está selecionado chama `select` já no `pointerdown`. Isso leva a `refresh()`, que destrói e redesenha todos os objetos da cena (`children.removeAll`). A câmera não salta, porque a chave do lugar é a mesma (`viewport.ts:70`). Mas o primeiro quadro do arraste custa uma pintura completa, o que num tablet pode comer os primeiros movimentos. | `play-gesture.ts:131`; `main.ts:109` (`choose` → `refresh`); `scene.ts:96` | Arranque "engasgado" do arraste em quem acabou de ser escolhido. | hipótese; medir com o perfil de quadros no tablet |

**Também conta, mas não é falha de arraste:** soltar um personagem sobre outro não faz nada além de sobrepor os dois (não há gesto social), e soltar uma pessoa sobre a mesa a deixa em pé dentro da mesa, porque `move` ignora móveis sólidos (`world.ts:95-97`). As duas coisas entram nos lotes 1B e 2.

**Recusas silenciosas no domínio.** Toda ação inválida devolve `{ state, events: [] }` e a apresentação não mostra nada:
- sentar em assento ocupado: `furniture.ts:23`;
- pôr num lugar indisponível: `furniture.ts:37-39`;
- pegar com a mão cheia: `world.ts:39`;
- dar a comida errada: `world.ts:53`;
- mover para ponto inválido: `world.ts:96`;
- andar até onde não há caminho: o `hint` está vazio em `main.ts:100` (só sobra o balão de `refusal`);
- chegar a um móvel bloqueado: `play-actions.ts:24` mostra apenas texto.

O lote 1A troca tudo isso por um mecanismo único (W3L-02).

### 2.2 O painel lateral ocupa demais

- **Paisagem:** a coluna da direita tem 320 px fixos e nunca some (`dock-layout.css:71-74`). Sem ninguém escolhido, mostra a fileira de retratos. Com alguém escolhido, mostra as ações. Com a bandeja aberta, mostra Turma, Looks e Objetos. A 1024×768, a cena fica com **704 px (69%)** e o painel com 31%. A 1280×800, 75% e 25%. Ver `reports/eat-panel-1024.png`: metade do painel é vazio, com 5 botões de ação.
- **Retrato:** o dock de baixo tem 260 px (`dock-layout.css:39`), 25% da altura a 768×1024. Ver `reports/wave3-garden/plaza-garden-768.png`: 7 retratos e uma faixa vazia embaixo.
- **O "Recolher ações" não recolhe nada.** `#context-toggle` (`index.html:13`, `shell.ts:6-10`) só esconde os botões dentro do cartão. A coluna continua com 320 px (`dock-layout.css:72` mantém o recuo de `#world`). O estado não é salvo e começa aberto a cada carga.
- **A boa notícia:** a cena já se reenquadra quando `#world` muda de tamanho (`viewport.ts:64`, `ResizeObserver`), e mantém o centro (`viewport.ts:44-45`). Recolher a coluna de verdade é uma mudança de CSS e de controle, sem tocar no motor.

### 2.3 Trocar de cômodo é um corte seco

- A porta tem uma saída de 240 ms (o boneco some e encolhe 8%, `door-effect.ts:21-30`) e uma entrada com a porta balançando e o boneco saindo pela porta (`scene-outdoor.ts:42-45`, `stroll-figures.ts:21-24`).
- **Mas a troca em si acontece num único quadro:** `scene.ts:96` (`children.removeAll(true)`) apaga o lugar antigo e desenha o novo, sem cobertura nenhuma. A câmera também salta, porque `viewport.ts:70` reinicia o centro quando a chave do lugar muda.
- **Mapa e "Ir"** (`go.ts:8-15`, `world-navigation.ts`) nem têm a saída: é corte direto.
- **Deslizar entre cômodos** (`navigation.ts:17`) é a única transição que acompanha o dedo, mas ao confirmar ela repinta sem terminar o deslize.

### 2.4 Os móveis não se usam com o corpo

| Pedido do proprietário | Hoje | Evidência |
| --- | --- | --- |
| "A Bia não senta à mesa para comer" | Não existe cadeira. A mesa não é assento. Comer é instantâneo: o prato some e aparece um coração. | `types.ts:62` (sem `chair`); `care.ts:22-29`; `reactions.ts:27-31` |
| "Não se vê no espelho" | O espelho é peça de parede e "usar" só alterna `active`, que desenha um glifo `✦`. | `use.ts:4`; `piece-art.ts:45`, `:56-61` |
| "Abre a bancada para cozinhar, mas nunca se vê ela comendo" | O prato nasce **no chão**, ao pé do fogão (`reports/kitchen-bench-1024.png`: a panqueca está no rodapé). Depois disso, nada leva o prato à mesa nem à boca. | `recipes.ts:70-74`, `:81-91` |
| Outros móveis usáveis | TV, banheira, piano, caixa de som e aquário também viram glifos de texto (`♫ ♪`, `◦ ○`). Só pia, máquina de lavar, horta, estante e mesa de piquenique têm animação desenhada. | `piece-art.ts:56-61`; `use-effects.ts:9` |

### 2.5 O que já existe e deve ser aproveitado

- **Peso no arraste:** o personagem carregado fica 16 px acima da sombra, balança as pernas e inclina com a velocidade. Ao soltar, cai e achata, e o objeto solto quica uma vez (`weight.ts`). A "física leve" começa daqui, e não do zero.
- **Regras de construção:** móvel de chão não sobe na parede (`placement.ts:12-15`, `:25`); só quadro, neon, espelho e almofada vão na parede (`placement.ts:9`); peças sólidas não se sobrepõem (`placement.ts:32`); a passagem da porta fica livre (`placement.ts:29`).
- **Instituições:** escola (recepção, sala de aula, biblioteca, pátio), escritório (recepção, sala, reunião, copa), hospital, polícia, bombeiros, estádio e clube já existem (`institution-plans.ts`). A loja (`shop`) não tem plano próprio: reaproveita os cômodos da casa (`domain/buildings.ts:16`).
- **Looks de profissão** (chef, médica, polícia e outros) já servem de uniforme de trabalho.
- **Relógio:** `phaseAt`, `dayIndex` e `eventOfDay` estão prontos e testados (`domain/clock.ts`), e o `tick` de 30 s já é despachado (`town-actions.ts:63`).

---

## 3. Desenho dos sistemas

### 3.1 Necessidades e sentimentos

**Três necessidades e um humor derivado.** São fome, sono e tédio. Nada de higiene, banheiro ou saúde: higiene vira bronca disfarçada, e saúde puxa doença. "Feliz" e "triste" não são necessidades. São o humor, calculado a partir das três e de acontecimentos recentes.

**Modelo (domínio puro, `domain/needs.ts`):**
- Cada personagem tem `needs: { fome, sono, tedio }`, inteiros de 0 a 100, onde 0 é "bem".
- **As necessidades não vão para o save.** Toda sessão começa de manhã (§3.5), e por isso começa com todos descansados: fome 20 (hora do café), sono 0 e tédio 0. Persistir não traria nada, porque qualquer valor salvo teria de ser rebaixado na volta para não punir a ausência. Isso também elimina o risco de rollback deste sistema.
- O domínio só expõe **faixas**: `bem` (0–39), `pede` (40–69) e `precisa` (70–100). A apresentação nunca vê o número.
- O humor é `feliz` quando as três estão em `bem` ou houve um evento de alegria (prato favorito, abraço, brincadeira favorita) há menos de 60 s de sessão. É `triste` só quando **duas** necessidades estão em `precisa`. Nos outros casos, é `normal`.
- **Quem está fora do lugar mostrado para em `pede` (69).** Só pode ficar triste quem a criança está vendo. Ninguém fica triste "escondido" numa casa que ela não visita.

**Como crescem.** Uma ação `{ type: 'live', elapsed, phase }` é despachada pelo `tick` de 30 s que já existe.
- `elapsed` é **o tempo de sessão em Brincar desde o último `live`, limitado a 60 s**. Ao voltar de uma aba escondida ou de dias fora, conta no máximo 60 s. O domínio nunca lê o relógio.
- **Criar pausa a vida:** em Criar não se despacha `live`.

| Necessidade | Taxa base por minuto de sessão | Na prática |
| --- | --- | --- |
| Fome | +6 | Começa em 20. Pede depois de uns 3,5 min e precisa depois de uns 8. Com o dia de 16 min, dá café, almoço e jantar. |
| Sono | +2 de manhã e à tarde; +12 no entardecer e à noite | Quase ninguém tem sono de dia. Todos têm sono à noite. |
| Tédio | +6 parado; 0 enquanto brinca, anda ou trabalha | Pede depois de uns 7 min sem fazer nada. |

**Personalidade (dados em `domain/tastes.ts`, ao lado do favorito e do presente):**

| Personagem | Ritmo | Brincadeira favorita | Comportamento próprio |
| --- | --- | --- | --- |
| Bia | padrão | definida com a família (proposta: corda) | "Faz sozinha": com fome e com prato pronto no cômodo, ela mesma pega o prato e senta à mesa, se houver lugar. |
| Luna | padrão | amarelinha | "Cuida": se alguém no cômodo está triste, ela vai até a pessoa e abraça. É a única autonomia social. |
| Léo | sono ×1,2 | horta (regar conta como brincar) | dorme cedo e boceja primeiro |
| Rui | tédio ×1,4 | bola | inquieto: é o primeiro a pedir para brincar |
| Gatos | sono ×1,5, fome ×0,8 | bola, ou o lugar favorito de `idle-life.ts:46` | dormem em caminha, sofá, tapete ou cama, nunca no chão nu |

**O que satisfaz:**

| Ação | Efeito |
| --- | --- |
| Comer um prato sentado (§3.2) | fome −60. O favorito leva a fome a 0 e dá alegria. |
| Lanche de sempre (`lanche`) ou peixe do gato | fome −30. Nunca acaba (§3.4). |
| Dormir na cama | sono −25 por minuto. À noite, acelera para a manhã (§3.5). |
| Cochilar no sofá | sono −12 por minuto |
| Balanço, bola, corda, amarelinha, piano, TV, regar | tédio −40. A favorita dá −70 e alegria. |
| Escola (aula, §3.6) | tédio −40 e alegria |
| Abraço, ou brincar junto (soltar um personagem sobre outro) | tédio −20 para os dois. Desfaz a tristeza na hora. |

**Como aparece (sem número, sem barra):**
- **Rosto.** Hoje `expression.ts:5` tem neutro, feliz, riso, surpresa, sono, curioso e bobo. Entram três: **fome** (boca torta e mão na barriga), **tédio** (olhar para o lado e bochecha apoiada na mão) e **triste** (sobrancelha caída e boca para baixo, **sem lágrima**, salvo decisão da família).
- **Corpo.** Com sono, o personagem boceja e o balanço do passo fica mais lento, mas a velocidade de andar é a mesma. Com tédio, chuta o chão. Com fome, põe a mão na barriga.
- **Bolha.** Na faixa `pede` aparece uma nuvem de pensamento com **um** desenho: prato (ou o prato favorito, se ela já sabe fazê-lo), travesseiro ou bola. Fica 4 s e reaparece a cada 40 s. Na faixa `precisa`, a bolha fica fixa e pulsa devagar.
- **Uma bolha por vez no cômodo:** mostra-se a do personagem selecionado. Se não houver, a da necessidade mais alta. Isso evita uma parede de nuvens.
- **Personagens em outros lugares:** nos retratos da Turma, quem precisa de algo ganha a bolha pequena no canto do retrato. É o único "alerta", e é só desenho.

**Recuperação e o que nunca acontece:**
- A tristeza some no mesmo quadro em que a condição deixa de valer, sem demora de "perdão".
- Nada além do desenho muda: ninguém recusa comando nem anda mais devagar de verdade, nada se quebra, ninguém vai embora.
- O teto é 100. Depois disso, nada piora.
- **Simulação de um dia de 16 min em que ela só brinca com a Bia**, com a Luna e o Léo na mesma sala, sem comer nem brincar: a fome deles chega a `precisa` perto dos 8 min, o sono a `precisa` perto dos 14 min (entardecer e noite), e o rosto triste aparece só aí, nos 2 min finais do dia. Dormir zera o sono e encerra a tristeza. Esse é o caso extremo de abandono, e ele custa um rosto triste por 2 minutos. O teste unitário de W3L-10 fixa essa simulação.
- **Movimento reduzido:** sem bocejo nem pulsar. Fica o rosto e a bolha parada.

### 3.2 Regras do mundo

**Mecanismo único: a bolha do que falta.** Toda recusa, em qualquer sistema, faz a mesma coisa:
1. O personagem dá de ombros (pose curta de 400 ms).
2. Aparece uma bolha com o desenho da **coisa que falta**: cama, mesa com cadeira, fogão, mercado, caixa do mercado ou assento livre.
3. Se a coisa existe em outro cômodo da mesma construção, a bolha mostra também uma seta de porta, e tocar nela leva o personagem até lá andando (`door-walk.ts`).
4. Se não existe em lugar nenhum, a próxima abertura de Criar faz o cartão daquela peça brilhar no catálogo.
5. Fala opcional de até 6 palavras, em `content/lines.ts`, com variações por personagem.

No domínio, toda ação de vida devolve um evento `missing` com `{ actor, need: 'bed' | 'table' | 'stove' | 'seat' | 'market' | 'checkout' }`, em vez de devolver `events: []`. Os eventos de presentação continuam efêmeros e não vão para o save.

| Regra | Vale para | Quando a condição não é cumprida |
| --- | --- | --- |
| **Dormir só em cama ou sofá** (gato: caminha, sofá, tapete ou cama) | O botão Descansar, soltar sobre um móvel e a autonomia | Sem cama nem sofá livre no cômodo: bolha "cama". Hoje o `rest` não tem pré-condição (`world.ts:66`, `care.ts:10`). |
| **Comer prato sentado** (cadeira, sofá, poltrona, mesa de piquenique, carteira ou o banco da praça). O lanche de sempre é "de comer na mão" e pode ser comido em pé: é ele que garante que a fome sempre tem solução. | Soltar prato num humano, Comer, a autonomia da Bia | Com assento livre no cômodo: o personagem anda até ele, senta, o prato vai para a mesa (ou para o colo, no sofá) e ele come (§3.3). Sem assento: segura o prato e mostra a bolha "mesa com cadeira". Gato come no chão, no pote, e isso é natural. |
| **Cozinhar exige a peça certa** | Bancada | Hoje fogão, bancada e carrinho abrem os 4 utensílios (`recipes.ts:30`). Passa a valer: fogão → panela e forno; bancada → tábua e liquidificador; carrinho → tábua. O utensílio que a peça não tem aparece em silhueta, com o desenho da peça que falta. Tocar nele mostra a bolha "fogão". |
| **Comida para cozinhar vem da despensa** | Bancada | Ingrediente sem estoque aparece em silhueta. Tocar mostra a bolha "mercado" (§3.4). |
| **Sair do mercado só depois do caixa** | Mercado | Na porta, o personagem dá meia-volta com a bolha "caixa". É a única regra "social" e ensina uma convenção real sem dinheiro. |
| **Ninguém fica em pé dentro de móvel sólido** | Soltar personagem | Soltar sobre um móvel que não é assento leva o personagem ao lado livre mais perto. Já existe `exitFrom` (`walking-path.ts:18-25`). Entra em W3L-17. |
| **Móvel de chão no chão, quadro na parede, sem sobrepor, porta livre** | Criar | Já valem (`placement.ts`). Nada muda. |

**O que fica de fora de propósito:** gravidade de móveis, empilhar objetos, escada de verdade entre andares (hoje os andares só se ligam pelo Mapa, `doors.ts:6-9`) e móveis que quebram. A escada vai para a onda 4 (§5.8).

### 3.3 Móveis que se usam com o corpo

- **Assento por peça.** `Actor.seat` passa de 4 ids fixos para uma referência `"<id da peça>.<vaga>"`.
  - Cada `PieceKind` assentável declara suas vagas no domínio, em coordenadas da peça: sofá 2, cama 1, poltrona 1, cadeira 1, mesa de piquenique 4, carteira 1, caminha de gato 1 (só gato). O banco e o balanço da praça não são peças (`Outdoor.bench` e `Outdoor.swing`) e continuam com a regra própria; sentar no banco da praça conta como "sentado" para comer.
  - Peça nova `chair` (cadeira), com 2 variantes de cor. O template de cozinha e o de sala de jantar ganham 2 cadeiras.
- **Comer de verdade.** O personagem senta e o prato vai para a mesa diante dele, ou para o colo. São 3 garfadas em 2,4 s: o prato encolhe em 3 desenhos (cheio, meio, vazio), com som de mastigar. Depois, o prato vazio some com um brilho e vem a reação, com a dança se for o favorito. Durante a refeição, tocar nele não interrompe. Arrastá-lo sim: o prato fica na mesa.
- **Do fogão à boca.** O prato pronto nasce **na mão de quem cozinhou**, e não no chão. Se a mão estava ocupada, o prato vai para a bancada. Se quem cozinha está com fome e há assento livre, aparece a bolha de prato com uma seta para a mesa. Tocar na bolha faz sentar e comer. Com a mão cheia e a bancada cheia, vale a regra de mesa cheia que já existe.
- **Espelho.** Tocar no espelho com alguém selecionado, ou soltar alguém diante dele, faz o personagem andar até a frente do espelho.
  - Dentro da moldura aparece o **reflexo**: uma cópia espelhada da figura, recortada pela moldura, que imita a pose com 100 ms de atraso. Quem está em frente faz uma careta da personalidade e o reflexo faz igual.
  - A bandeja de Looks abre já posicionada. Trocar de look diante do espelho mostra a troca no reflexo.
  - Movimento reduzido: o reflexo fica estático, sem atraso.
- **Fim dos glifos de texto.** TV com desenho na tela, banheira com espuma e o personagem dentro, piano com mãos no teclado e notas desenhadas, aquário com peixe que nada. Cada um usa o mesmo padrão de `use-effects.ts`, que já funciona para a pia.
- **Afordância durante o arraste.** Enquanto um personagem é arrastado, o alvo sob os pés (o mesmo ponto em que ele será solto, ver D1) ganha um contorno quente: assento livre, porta, outro personagem para abraçar, espelho. Assento ocupado ganha o rosto de quem está nele, como já acontece no balanço (`reports/wave3-garden/plaza-swing-occupied-1024.png`).

### 3.4 Despensa da casa e mercado

**Estoque por casa.** Cada construção com cozinha (fogão, bancada ou carrinho) tem `stock: Partial<Record<Basic, 1..4>>`.
- Os 9 básicos de `ingredients.ts:7` deixam de ser infinitos.
- Cozinhar consome 1 de cada básico usado, como já acontece com a horta.
- A despensa da bancada mostra a pilha de ícones (até 4), nunca um número.
- **A geladeira aberta desenha o estoque nas prateleiras.** É a prova visual de que a compra chegou.

**Sem beco sem saída.** Três garantias, cada uma com teste:
1. **O lanche de sempre e o peixe dos gatos nunca acabam.** O comportamento atual já é esse: comer o lanche o devolve à geladeira (`furniture.ts:29-34`). Fome sempre tem solução, mesmo sem mercado.
2. **A migração enche a despensa** (4 de cada) em toda casa existente, e cada casa nova também nasce cheia. A Bia descobre que a comida acaba depois de cozinhar umas 10 vezes, e não no primeiro dia.
3. **Despensa vazia e sem mercado:** a bancada mostra a bolha "mercado", e o cartão "Mercado" brilha em Criar → Ampliar. Construir um mercado é um toque. Os ingredientes da horta continuam funcionando sem mercado.

**Por que sem dinheiro.** Moeda puxa contagem, escassez e comparação ("não tenho o bastante"). Para 7 anos, isso vira frustração e placar escondido. O que dá sentido ao mercado é **o ritual**: escolher, pôr na sacola, passar no caixa (bipe), levar para casa e guardar. O ritual inteiro fica, e a conta fica de fora. Se a família quiser moedinhas sem número na onda 4, o ritual já está pronto para recebê-las.

**Um lugar é o que tem dentro.** Não se cria um modelo de construção novo para o mercado. **Qualquer cômodo com pelo menos uma prateleira de mercado (`market-shelf`) e um caixa (`checkout`) é um mercado.** Motivos:
- a criança entende e pode montar um mercadinho dentro de qualquer loja ou casa;
- é a mesma regra que dá sentido à escola (carteira mais quadro) e ao trabalho (§3.6);
- dispensa um `BuildingModel` novo no save.

A loja (`shop`), que hoje não tem plano (`domain/buildings.ts:16`), ganha o plano **Mercado**: salão com 2 prateleiras, geladeira de mercado e caixa, mais um depósito. Esse plano aparece em Ampliar como cartão ilustrado. Lojas antigas continuam como estão.

**As prateleiras.** São 3 desenhos fixos de prateleira:
- padaria e laticínios: pão, leite, queijo, ovo, farinha e açúcar;
- hortifrúti e óleo: batata, óleo e peixe;
- especiais e sementes: chocolate, canela, mel e os 6 pacotes de semente.

Os especiais e as sementes que antes vinham por carta passam a ser vendidos aqui. Cada um aparece na prateleira só depois de uma condição simples, como "colheu pela primeira vez" ou "fez 3 receitas". É profundidade por descoberta, sem lista.

**A compra:**
1. Tocar numa prateleira com alguém selecionado faz o personagem andar até ela e pegar a **sacola**, um item portátil novo, `sacola`, segurado na mão. Cada toque num ingrediente da prateleira o faz pular para dentro da sacola. A sacola leva até 6 ícones.
2. Tocar no caixa (ou soltar a sacola nele) toca "bipe, bipe". O adulto no caixa, se houver, acena. A sacola ganha uma fita de "paga".
3. Levar a pessoa para casa: a sacola vai junto, como qualquer objeto na mão, pela regra de transporte que já existe.
4. Soltar a sacola na geladeira, ou tocar na geladeira com a sacola na mão: os ícones voam para as prateleiras da geladeira, o estoque sobe até o teto de 4, e a sacola some. **O que não coube volta para a sacola**, que fica na mão. Nada se perde.

**Ingredientes da horta:** continuam na cesta global (`progress.basket`) e aparecem na despensa de qualquer casa, como hoje. Não vale a pena migrar a cesta para cada casa.

### 3.5 Dia, noite e sono

- O ciclo de 16 min de `phaseAt` passa a ser visível, como em `2026-11-wave3-depth.md` §3.5:
  - véu azul só no fundo;
  - janelas com abajur aceso brilham;
  - lua e estrelas na rua;
  - movimento reduzido com fade de 120 ms.
- **Dormir até de manhã:** à noite, quando o personagem selecionado deita na cama, todos os humanos da mesma casa que já estão em cama ou sofá dormem também. Há um fade de 3 s, vem a manhã, o sono de quem dormiu vai a 0 e toca um "bom dia".
- **"Todos para a cama":** à noite, tocar na bolha de travesseiro de alguém selecionado oferece um ícone de lua grande. Tocar na lua faz os humanos da casa andarem até as camas livres. Quem fica sem cama mostra a bolha "cama". É o único comando em grupo, e foi pensado para evitar 4 arrastes seguidos na hora de dormir.
- A fase do dia não é salva. Toda sessão começa de manhã.

### 3.6 Família, escola, trabalho e rotina

**Adultos.** Entram **dois adultos**, que moram na "Minha casa" (a construção de menor id). Nomes, aparência e relação com as crianças dependem da família (pergunta 1 da seção 6).
- Arte: o mesmo `human.svg` com proporção adulta (1,2× de altura, cabeça relativamente menor, ombros mais largos). Isso exige revisar `pose.ts`, a âncora da mão e as hit areas.
- **Guarda-roupa dos adultos limitado a 7 looks:** 2 do dia a dia e 1 uniforme por tipo de trabalho (mercado, escritório, consultório, bombeiros e polícia), reaproveitando os looks de profissão que existem. Adulto vezes 26 looks é o maior custo de arte da onda e não traz nada para a criança.
- Adultos têm as mesmas três necessidades, com tédio ×0,6. Adulto não brinca de corda: a "brincadeira" dele é ler, ver TV ou cozinhar.

**"Um lugar é o que tem dentro", também aqui:**

| Lugar | Condição | O que acontece |
| --- | --- | --- |
| **Escola** | Um cômodo com carteiras (`desk`) e um quadro (`board`, peça de parede nova). O template `classroom` já tem `desk`, `bookcase` e `picture` (`rooms.ts:9`) e ganha o quadro e mais carteiras. | **Aula.** Com pelo menos uma criança sentada numa carteira, tocar no quadro faz começar. O quadro se desenha sozinho em 20 s (um de 12 temas em rotação: sol, gato, casa, flor, foguete…), as crianças sentadas levantam a mão, e no fim cada uma ganha **o desenho do dia**. Se um adulto estiver de pé diante do quadro, ele vira professor e aponta, mas não é obrigatório. O desenho vai para `progress.drawings` e aparece **preso na porta da geladeira de casa** (até 4 visíveis, os mais novos). O álbum completo fica para W4-13. |
| **Trabalho** | Um adulto num cômodo de trabalho: o caixa do mercado, a mesa do escritório (`office`), a mesa do consultório (`consultation`), a central dos bombeiros ou da polícia (`dispatch`). | O adulto veste o uniforme do lugar automaticamente (o look anterior é guardado e volta ao sair) e faz a animação de trabalhar. **Volta do trabalho:** se um mercado existe e o adulto volta para casa na tarde ou no entardecer, ele chega com uma sacola paga de 3 básicos, escolhidos entre os que estão mais em falta. Trabalhar ganha sentido sem salário. |

**Rotina como sugestão.** A função pura `suggestion(phase, actor, needs, place)` devolve no máximo um desenho:
- manhã: criança em casa → mochila (escola); adulto em casa → pasta (trabalho);
- tarde: → bola (brincar, praça);
- entardecer: → prato (jantar);
- noite: → travesseiro.

A sugestão usa a mesma bolha das necessidades, com contorno tracejado para se distinguir. **Necessidade em `precisa` sempre vence a sugestão.**
- Ignorar não custa nada. A bolha some quando a fase muda.
- A sugestão aponta para a ação, mas não a executa. Tocar na mochila abre o Mapa já com a escola marcada, e o "Ir" leva o personagem.
- Na rua, de manhã, a fachada da escola tem um sino que brilha.

**Autonomia leve** (só personagens **não** selecionados, só dentro do mesmo cômodo, nunca durante um arraste):
- com sono `precisa`: senta no sofá ou na cama livre do cômodo; o gato vai para a caminha;
- com tédio `precisa` e uma bola no chão do cômodo: brinca com ela por 5 s;
- a Bia e a Luna têm as autonomias da tabela de §3.1;
- no máximo um ato autônomo por cômodo a cada 60 s de sessão;
- um interruptor de adulto em `storage.ts` desliga tudo, como o de pedidos previsto antes;
- **ninguém troca de construção sozinho.** Ir à escola, ao trabalho e ao mercado é sempre a criança quem decide.

### 3.7 Física leve

Parte do que existe já é boa (§2.5). O que entra:
1. **Soltar é cair na vertical.** Personagem ou objeto solto acima do chão cai **reto para baixo** até o chão, ou até a superfície embaixo dele (mesa, cama, bancada, prateleira), com a queda e o quique de `weight.ts`. Hoje o objeto é posto em `point.y + 28` (`play-gesture.ts:84`), sem procurar superfície.
2. **Ímã de assento.** Um assento livre a até 60 px dos **pés** atrai o personagem solto, que desliza 120 ms até a vaga e senta. A cama deita.
3. **Peso por tamanho.** Gato carregado inclina mais e balança mais rápido. Adulto inclina menos e afunda 4 px a mais ao pousar. São só parâmetros de `carryFrame` e `dropFrame`.
4. **Nada fica no ar.** Objeto solto numa parede escorrega até o rodapé, a mesma regra que os móveis de chão já seguem desde `8345be7a`.
5. **A bola** já rola e quica. Pode cair da mesa: se ela é solta sobre a mesa com velocidade, rola até a borda e cai no chão.

Fora: empilhar, derrubar móveis, colisão entre personagens, escada.

---

## 4. Impacto no save (envelope v3)

**Princípio mantido** (`2026-11-wave3-depth.md` §4.4): conteúdo desconhecido descarta só a si mesmo. Tudo abaixo entra **dentro do v3**, sem nova versão.

| Onde | Campo novo | Tipo | Inicial na leitura | Desconhecido ou inválido |
| --- | --- | --- | --- | --- |
| `Actor` | `seat` (muda o formato) | `"<pieceId>.<vaga>"` ou `null` | Os 4 ids antigos são convertidos: `sofa-left` → `<primeiro sofa do cômodo>.0`, `sofa-right` → `.1`, `bed` e `armchair` → `.0`. Sem a peça, vira `null`. | peça inexistente, vaga fora do intervalo ou peça não assentável → `null` (a regra atual de `neighborhood-v3.ts:45-48`, generalizada) |
| `town.actors` | 2 adultos | ids novos | **ausentes → adicionados na "Minha casa", na sala, em pé** | id desconhecido → removido, e o objeto que ele segurava fica no chão |
| `Building` | `stock?` | `Partial<Record<Basic, 1..4>>` | ausente → cheio (4 de cada) se a casa tem cozinha | chave desconhecida → removida; valor > 4 → 4; ≤ 0 → chave removida |
| `NeighborhoodItem` | `kind: 'sacola'`, com `contents: Ingredient[]` (até 6) e `paid: boolean` | | | ingrediente desconhecido → removido da sacola; sacola vazia e não segurada → item removido |
| `progress` | `drawings` | `DrawingId[]` | `[]` | id desconhecido ou repetido → removido |
| `progress` | `shelves` | `ShelfUnlock[]` (o que já apareceu no mercado) | `[]` | idem |
| enums | `PieceKind` + `chair`, `board`, `market-shelf`, `checkout`; `RoomTemplate` + `market` | | | peça desconhecida → removida, e quem estava sentado nela → `seat: null` (já é a regra); template desconhecido → `empty` |

**Fica fora do save:** as necessidades (§3.1), faixas e humor (derivados), sugestões, bolhas, autonomia, fase do dia, aula em andamento, "volta do trabalho" pendente e o estado do arraste.

**Armadilha conhecida: a turma tem tamanho fixo.** O bairro só é aceito se `actors.length === actorIds.length` (`persistence/neighborhood.ts:95`). O tipo do personagem é deduzido da posição na lista (`validation.ts:16`, `world.ts:25`), e o save legado de casa única exige a lista completa (`validation.ts:36`). Acrescentar adultos em `actorIds` de uma vez faria dois estragos:
1. todo save existente seria rejeitado, até a migração completar a lista;
2. **um build anterior rejeitaria o save novo** e cairia para a v2, perdendo tudo o que foi feito desde a migração.

Por isso o trabalho é dividido em dois lotes separados:
- **W3L-18 (lote 3), tolerância:** a leitura aceita uma turma que é superconjunto ou subconjunto da conhecida. Ids desconhecidos são descartados, ids faltando são completados, e o tipo vem de uma tabela `actorKinds` e não da posição. Esse build vai para `main` sem adultos.
- **W3L-24 (lote 5), adultos:** só entram depois que pelo menos um build com a tolerância estiver em `main`. O teste "build anterior lê save do build novo" passa a ser feito com o build de W3L-18 como "anterior".

**Testes obrigatórios de save, por item:** round-trip; o fixture rico v2 migra igual com os campos novos nos valores iniciais; v3 sem `stock` nem adultos carrega com os iniciais; v3 com assento `"999.0"`, peça `"robo"`, ingrediente `"kiwi"` na sacola e um ator `"dragao"` carrega sem eles; "aplicar a ação, fazer encode e depois decode devolve o mesmo bairro" para `sit`, `eat-seated`, `buy`, `checkout`, `stock-up`, `lesson` e `work`.

---

## 5. Backlog

**Regras** (as mesmas de `2026-11-wave3-depth.md` §5):
- cada item é commitável sozinho, com `quality:fast` verde e os E2E afetados verdes;
- esforço: P (até 1 dia), M (2 a 4 dias), G (1 semana);
- todo E2E de tempo usa o relógio falso do Playwright, sem aumentar `timeout`;
- mutação de 80% ou mais em `domain/` e `persistence/`;
- os ids novos usam o prefixo **W3L-** para não colidir com W3-01..W3-28.

**Orçamento:** o JS está em **441,6 KB gzip** (`reports/budget.json`), de 1 MB. Cada lote fica abaixo de +40 KB de JS gzip. A estimativa da onda é de +128 KB no pior caso (fecha perto de 570 KB). A arte nova vai em `public/art/*.svg`, nunca por `?raw`.

**Limites de arquivo:** `main.ts` tem 244 linhas e `scene.ts` tem 248, para um teto de 300. O lote 1A começa por extração (W3L-05).

**Por que dois lotes de UX (1A e 1B):** o assento por peça muda o save e é a base de sentar para comer, da carteira da escola e de dormir na segunda cama. Fazê-lo no mesmo lote que arraste, painel e transição criaria um lote com 3 itens G e mais de +40 KB. Os dois lotes vêm antes de qualquer sistema novo, como pedido.

### Lote 1A: arraste, tela e transição

| ID | Origem | O que fazer | Arquivos prováveis | Critério de aceitação | Esf. |
| --- | --- | --- | --- | --- | --- |
| W3L-05 | limites de arquivo | Extrair de `main.ts` a montagem de `bindInput` e o `refresh`, e de `scene.ts` a pintura de personagens, antes de qualquer mudança visível. | `bootstrap/main.ts`, novo `bootstrap/input-wiring.ts`, `presentation/scene.ts`, novo `presentation/scene-figures.ts` | `wc -l`: `main.ts` ≤ 220 e `scene.ts` ≤ 220. As capturas de referência ficam idênticas por diff de pixels. Nenhuma mudança em `domain/` e `persistence/`. | P |
| W3L-01 | dono (UX 1), D1–D9 | **Arraste confiável.** Primeiro, um E2E por causa D1–D9 que falha hoje. Depois:<br>• o alvo (assento, porta, pessoa, espelho) é medido **nos pés desenhados** (`point + offset`), e não no dedo;<br>• `destination()` **encosta** no limite (`onFloor`) em vez de congelar;<br>• soltar fora do canvas solta no último ponto válido, em vez de cancelar;<br>• pega tolerante: além do pixel visível, uma cápsula de pelo menos 56 px de tela em volta do corpo. Em Brincar, personagem tem prioridade sobre móvel quando o toque cai na cápsula;<br>• porta: soltar sobre a porta realçada atravessa na hora, sem esperar 500 ms; a dwell de borda sai do arraste de personagem, e no lugar dele a borda faz a câmera deslizar (reaproveitar `house-edge-pan.ts`);<br>• contato perdido: `contacts` é limpo em `pointerup`/`pointercancel` de qualquer contato, inclusive os não capturados, e um contato sem movimento há mais de 3 s é descartado;<br>• selecionar no `pointerdown` só troca o anel de seleção; o `refresh` completo espera o fim do gesto;<br>• em modo de teste, `canvas.dataset.dropOutcome` registra `moved`, `sat`, `crossed`, `hugged`, `missing:<motivo>` ou `cancelled:<motivo>`. | `presentation/play-gesture.ts`, `input.ts`, `camera-gesture.ts`, `targets.ts`, `furniture-targets.ts`, `neighborhood-gesture.ts`, `house-input.ts`, `edge-transfer.ts`, `house-edge-pan.ts`, `bootstrap/input-wiring.ts`, `e2e/drag-*.spec.ts` | E2E, a 1024 e a 768, para cada pega (cabeça, peito e pés):<br>• soltar com os pés sobre o sofá livre faz sentar;<br>• soltar com o dedo 40 px além da borda do canvas move até a borda;<br>• arrastar até y = 590 de tela mantém o boneco encostado no chão e seguindo o x do dedo;<br>• um toque 20 px de tela ao lado do braço arrasta o personagem e não move a câmera;<br>• soltar na porta sem pausa atravessa;<br>• segurar 1 s na borda sem porta não troca de cômodo e desliza a vista;<br>• um segundo ponteiro que sobe fora do canvas não bloqueia o arraste seguinte.<br>Unitário: `destination` nas 4 bordas. Medido no tablet: zero quadros acima de 50 ms ao escolher e arrastar. | G |
| W3L-02 | dono (5, 6), §2.1 | **Bolha do que falta**: evento `missing` no domínio para sentar ocupado, pôr indisponível, mão cheia, comida errada e sem caminho; pose de dar de ombros; bolha com desenho; seta de porta quando a peça está em outro cômodo; brilho do cartão em Criar. Sentar em assento ocupado leva ao lado livre mais perto, e o rosto de quem ocupa aparece na bolha. | `domain/furniture.ts`, `domain/world.ts`, `domain/types.ts` (evento), novo `presentation/missing-bubble.ts`, `content/lines.ts`, `bootstrap/play-actions.ts`, `public/art/needs.svg` | Unitário: cada uma das recusas listadas em §2.1 devolve `missing` com o motivo certo, e nenhuma devolve `events: []`. E2E: soltar a Bia no sofá ocupado pelo Rui mostra o rosto do Rui e deixa a Bia ao lado, nunca no ponto de partida. Teste DOM: nenhuma recusa produz texto sem desenho. | M |
| W3L-03 | dono (UX 2) | **Painel recolhível.**<br>• Paisagem: a coluna de 320 px vira gaveta sobreposta, **fechada por padrão**, e `#world` ocupa a largura toda;<br>• um botão "Turma" com retratos empilhados fica no canto direito do cabeçalho;<br>• as ações do selecionado aparecem num **anel de até 4 ícones grandes ao lado do personagem** (`positionContext` já posiciona perto dele), e o resto fica num botão "mais";<br>• retrato: o dock cai para uma faixa de 84 px só com retratos, e as ações também vão para o anel;<br>• o estado aberto ou fechado é salvo em preferências (`storage.ts`);<br>• o antigo "Recolher ações" sai. | `presentation/dock-layout.css`, `immersive.css`, `shell.ts`, `panel.ts`, `panel-controls.ts`, `controls.ts`, `index.html`, `persistence/storage.ts` | Captura a 1024×768 com alguém selecionado: a cena tem ≥ 95% da largura. A 768×1024: o dock tem ≤ 90 px. E2E: abrir a gaveta, escolher o Léo e fechar; recarregar mantém o estado. Tocar em "Comer" no anel funciona sem abrir a gaveta. A cena mantém o centro ao abrir e fechar (sem saltar). Alvos ≥ 56 px. | M |
| W3L-04 | dono (UX 3) | **Transições fluidas.**<br>• Toda troca de lugar (porta, Mapa, Ir, borda, deslize) passa por `transition(kind)`;<br>• porta: o boneco entra pela porta, a vista faz um **íris** de 220 ms centrado na porta, `paint` acontece com a tela coberta, e o íris abre de 260 ms na porta de chegada, com o boneco saindo;<br>• Mapa e Ir: fade de 180 + 220 ms;<br>• deslize: ao soltar, tween de 200 ms até completar a passagem, antes de repintar;<br>• movimento reduzido: fade de 120 ms;<br>• o toque fica livre durante a abertura, e um toque durante o fechamento é guardado e aplicado depois. | novo `presentation/place-transition.ts`, `scene.ts`, `door-effect.ts`, `navigation.ts`, `viewport.ts`, `bootstrap/town-actions.ts`, `bootstrap/go.ts` | E2E com relógio falso:<br>• em nenhum quadro entre o toque na porta e a chegada aparece o cômodo novo sem cobertura (o `canvas.dataset.transition` passa por `closing`, `painted` e `opening`);<br>• o total fica abaixo de 600 ms;<br>• com movimento reduzido, nenhum íris e um fade ≤ 120 ms;<br>• um toque durante `opening` funciona. | M |

**Estimativa:** +18 KB de JS gzip. Arte: bolha, ombros e ícones do que falta, cerca de 6 KB de SVG.

### Lote 1B: móveis que se usam

| ID | Origem | O que fazer | Arquivos prováveis | Critério de aceitação | Esf. |
| --- | --- | --- | --- | --- | --- |
| W3L-06 | dono (2, 5), D2 | **Assento por peça e cadeira.** Vagas declaradas por `PieceKind` (§3.3), `Actor.seat = "<id>.<vaga>"`, conversão dos 4 ids antigos na leitura, peça `chair` com 2 cores, cadeiras nos templates `kitchen` e `dining`, e mover, duplicar e remover peça com gente sentada (quem sentava na peça removida levanta). | `domain/types.ts`, `domain/furniture.ts`, `domain/layout.ts`, `domain/rooms.ts`, `domain/design.ts`, `persistence/neighborhood-v3.ts`, `persistence/validation.ts`, `content/furnishings.ts`, `presentation/furniture-targets.ts`, `presentation/furniture-scale.ts`, `public/art/chair.svg` | Unitário:<br>• dois sofás no mesmo cômodo dão 4 vagas;<br>• o save antigo com `sofa-right` carrega sentado na vaga 1 do primeiro sofá;<br>• `"999.0"` carrega como `null`;<br>• remover a cadeira levanta quem estava nela;<br>• o fixture rico v2 migra.<br>E2E: soltar a Bia na segunda cama de um quarto com duas camas a deita ali. Mutação ≥ 80%.<br>Rollback: o build de `main` atual lê o save novo com quem estava em `"12.0"` em pé (`neighborhood-v3.ts:45-47` roda antes da checagem estrita de `validation.ts:71`). | G |
| W3L-07 | dono (6: comer), W3-17 | **Comer sentado e visível.**<br>• Prato solto num humano, Comer, ou a bolha de prato: anda até o assento livre, senta, o prato vai à mesa ou ao colo, 3 garfadas em 2,4 s, prato vazio, reação;<br>• sem assento: bolha "mesa com cadeira";<br>• o prato do fogão nasce na mão de quem cozinhou;<br>• o gato come no chão, como hoje. | `domain/care.ts`, `domain/recipes.ts` (`serveDish`), `domain/objects.ts`, novo `presentation/meal.ts`, `presentation/reactions.ts`, `bootstrap/kitchen.ts`, `public/art/dishes.svg` (meio prato) | Unitário: `eat` sentado consome o prato; sem assento livre devolve `missing:table` e o prato fica na mão. E2E:<br>• cozinhar panqueca deixa a panqueca na mão da Bia;<br>• soltá-la na Luna, numa cozinha com mesa e cadeira, faz a Luna andar, sentar e mostrar três estados do prato antes da reação;<br>• numa sala sem assento, a bolha "mesa com cadeira" aparece.<br>Variante reduzida sem garfadas animadas (só cheio e vazio). | M |
| W3L-08 | dono (6: espelho) | **Espelho**: andar até a frente, reflexo espelhado recortado na moldura e imitando a pose, careta da personalidade, Looks abrindo na hora, troca de look aparecendo no reflexo. | novo `presentation/mirror.ts`, `presentation/use-effects.ts`, `presentation/piece-art.ts`, `bootstrap/play-actions.ts` | E2E: tocar no espelho com a Bia selecionada mostra dois desenhos da Bia na captura (a figura e o reflexo), com o reflexo espelhado no eixo x. Trocar para o look `chef` muda os dois. Variante reduzida com o reflexo estático. Custo medido: < 1 ms por quadro a mais no tablet. | M |
| W3L-09 | dono (6), §2.4 | **Afordância e uso visível.**<br>• Durante o arraste, o alvo sob os pés ganha contorno quente (assento livre, porta, pessoa, espelho), e o assento ocupado mostra o rosto de quem está nele;<br>• TV, banheira, piano, caixa de som e aquário trocam os glifos de texto por animações desenhadas, no padrão de `use-effects.ts`. | `presentation/play-gesture.ts`, novo `presentation/drop-target.ts`, `presentation/use-effects.ts`, `presentation/piece-art.ts`, `public/art/use.svg` | E2E: arrastar a Bia sobre o sofá livre acende o contorno e sobre a porta acende a porta; teste DOM e de canvas: `piece-art` não desenha mais nenhum texto (`♫`, `◦`, `✦`). Captura de cada uso a 1024. | M |

**Estimativa:** +16 KB de JS gzip. Arte: cadeira, meio prato, espelho com moldura de recorte e 5 animações de uso, cerca de 18 KB.

### Lote 2: necessidades, sentimentos e o dia

| ID | Origem | O que fazer | Arquivos prováveis | Critério de aceitação | Esf. |
| --- | --- | --- | --- | --- | --- |
| W3L-10 | dono (3) | **Domínio das necessidades**: `needs` no ator, ação `live` com `elapsed` limitado a 60 s, taxas por fase, faixas, humor derivado, multiplicadores por personalidade, efeitos de satisfação (§3.1). Criar não despacha `live`. Reescrever o comentário de `care.ts:5`. | novo `domain/needs.ts`, `domain/tastes.ts`, `domain/care.ts`, `domain/types.ts`, `bootstrap/clock.ts`, `bootstrap/town-actions.ts` (sem mudança de save) | Unitário:<br>• a fome passa de `bem` a `pede` exatamente em 3 min e 20 s de sessão (de 20 a 40 a +6/min);<br>• quem está fora do lugar mostrado nunca passa de 69;<br>• a simulação de §3.1 (16 min só com a Bia) dá rosto triste à Luna e ao Léo só nos 2 min finais;<br>• um `live` com `elapsed` de 30 dias equivale a 60 s;<br>• o teto é 100;<br>• duas necessidades em `precisa` dão `triste`;<br>• comer o favorito leva a fome a 0 e dá `feliz`;<br>• Rui fica entediado antes da Bia;<br>• recarregar começa com fome 20, sono 0 e tédio 0, e o save não tem `needs`.<br>Mutação ≥ 80%. | M |
| W3L-11 | W3-24 (antecipado) | **Dia e noite** visível: véu só no fundo, janelas acesas conforme `home.lamp`, lua e estrelas, fade reduzido. A fase vem de `phaseAt` com o tempo de sessão em Brincar. | novo `presentation/day-night.ts`, `presentation/sky.ts`, `presentation/street.ts`, `presentation/room.ts`, `bootstrap/clock.ts` | E2E com relógio falso: aos 12 min a cena está escura e o rosto da Bia mantém contraste AA na captura. A captura reduzida não tem estrelas piscando. O save não muda com a fase. | M |
| W3L-12 | dono (3), pilar 2 | **Rosto, corpo e bolha.** Três expressões novas (fome, tédio, triste sem lágrima), poses de bocejo, chute e mão na barriga, bolha de pensamento por faixa, uma por cômodo, bolha pequena no retrato da Turma. Variante reduzida. | `presentation/expression.ts`, `presentation/life-pose.ts`, novo `presentation/need-bubble.ts`, `presentation/portrait.ts`, `public/art/needs.svg`, `public/art/faces.svg` | E2E com relógio falso:<br>• 6 min sem comer mostra a bolha de prato na Bia;<br>• 10 min mostram o rosto de fome; com o sono alto também, o rosto triste;<br>• dar um prato devolve o rosto feliz no mesmo segundo;<br>• nunca há mais de uma bolha por cômodo.<br>Teste DOM e de canvas: nenhum dígito nem barra. Revisão de arte: o rosto triste aprovado pela família. | M |
| W3L-13 | dono (3), W3-01 | **O que satisfaz, por personalidade**: brincadeira favorita por personagem em `tastes.ts`, tédio que zera ao brincar, sono que desce no sofá e na cama, as autonomias da Bia ("faz sozinha") e da Luna ("cuida"). Cria o interruptor de adulto da autonomia em preferências (`storage.ts`), que W3L-19 reaproveita. | `domain/tastes.ts`, `domain/needs.ts`, `domain/child-games.ts`, `domain/use.ts`, `presentation/idle-life.ts`, `content/lines.ts`, `persistence/storage.ts` | Unitário: o balanço tira 40 de tédio de quem não o tem como favorito e 70 do Rui com a bola. E2E: com a Bia em `pede` de fome e um prato no cômodo, ela pega o prato e senta. Com a Mimi triste, a Luna vai até ela e abraça. O interruptor de autonomia desliga as duas coisas. | M |
| W3L-14 | W3-08 (absorvido) | **Abraço e brincar junto**: soltar um personagem sobre outro faz abraço ou toca-aqui, conforme a personalidade. Com um prato na mão e dois assentos livres, os dois sentam e dividem. Os dois perdem 20 de tédio, e a tristeza some. | `presentation/play-gesture.ts`, `presentation/pose.ts`, `presentation/reactions.ts`, `domain/needs.ts`, `domain/care.ts` | E2E: soltar a Bia sobre o Léo faz os dois se abraçarem, e o save registra só posições e `needs`. Com o Léo triste, o abraço devolve o rosto normal. | M |

**Estimativa:** +20 KB de JS gzip. Arte: rostos, poses e bolhas, cerca de 14 KB, e a noite, cerca de 3 KB.

### Lote 3: regras do mundo

| ID | Origem | O que fazer | Arquivos prováveis | Critério de aceitação | Esf. |
| --- | --- | --- | --- | --- | --- |
| W3L-15 | dono (2, 5) | **Dormir só em cama ou sofá**, com as regras próprias dos gatos; dormir até de manhã; "Todos para a cama". O botão Descansar sem cama mostra a bolha "cama" (com seta de porta se a cama estiver em outro cômodo). | `domain/care.ts`, `domain/furniture.ts`, `domain/needs.ts`, `presentation/controls.ts`, `presentation/day-night.ts`, `bootstrap/play-actions.ts` | Unitário: `rest` sem cama nem sofá livre devolve `missing:bed` e não muda `resting`; gato dorme no tapete. E2E com relógio falso: à noite, deitar a Bia leva à manhã em até 3 s de cena e zera o sono de quem está deitado; numa cozinha, Descansar mostra a bolha da cama com seta para o quarto, e tocar nela leva a Bia até lá. | M |
| W3L-16 | dono (2) | **Cozinhar exige a peça certa**: utensílios por peça (fogão: panela e forno; bancada: tábua e liquidificador; carrinho: tábua). O que falta aparece em silhueta e mostra a bolha "fogão". | `domain/recipes.ts`, `presentation/kitchen-bench.ts`, `bootstrap/kitchen.ts` | Unitário: `cook` com `forno` a partir de uma bancada devolve `missing:stove`. E2E: abrir a bancada pelo carrinho mostra a panela em silhueta; tocar nela mostra a bolha do fogão. Os E2E de cozinha existentes passam pelo fogão. | P |
| W3L-17 | dono (5) | **Física leve** (§3.7): queda vertical até a superfície embaixo, ímã de assento de 60 px nos pés, peso por tamanho, objeto que escorrega da parede, bola que cai da mesa; personagem solto sobre móvel sólido que não é assento vai para o lado livre mais perto (`exitFrom`). | `presentation/play-gesture.ts`, `presentation/weight.ts`, `presentation/ball-motion.ts`, `domain/world.ts` (`place` com superfície), `presentation/furniture-targets.ts` | Unitário: `place` sobre a mesa cai em `spot: 'table'`; no meio da parede cai no chão abaixo. E2E: soltar o ursinho acima da mesa o deixa na mesa; soltar a Bia 50 px ao lado de uma cadeira livre a senta; soltar a Bia sobre a mesa a deixa ao lado da mesa, nunca dentro dela. Variante reduzida sem quique. | M |
| W3L-18 | §4, armadilha da turma | **Tolerância de turma no save**: a lista de atores é aceita como superconjunto ou subconjunto; desconhecidos são descartados (o objeto que seguravam fica no chão) e faltantes são completados; o tipo vem de `actorKinds`. Vai para `main` **sem adultos**. | `domain/types.ts`, `persistence/neighborhood.ts`, `persistence/validation.ts`, `persistence/neighborhood-v3.ts`, `domain/world.ts`, `persistence/fixtures/` | Unitário:<br>• um save com um ator `"dragao"` a mais carrega sem ele;<br>• um save sem a Pipoca carrega com a Pipoca na sala;<br>• o save legado de casa única (versões 1 a 4) continua carregando;<br>• a ordem dos atores não muda o tipo.<br>Mutação ≥ 80%. | P |
| W3L-19 | dono (4) | **Autonomia leve dos não selecionados** (§3.6): sono → sofá, cama ou caminha; tédio → bola do cômodo; no máximo um ato por cômodo a cada 60 s; nunca durante arraste; nunca troca de construção; usa o interruptor criado em W3L-13. | novo `domain/autonomy.ts` (escolha pura), `presentation/idle-life.ts`, `bootstrap/clock.ts`, `persistence/storage.ts` | Unitário: `autonomy` nunca devolve ação de outro cômodo nem do selecionado; com o interruptor desligado, devolve `null`. E2E com relógio falso: com o Nino com sono, em 2 min ele vai para a caminha; com um arraste em curso, nada se mexe sozinho. | M |

**Estimativa:** +14 KB de JS gzip. Arte: quase nenhuma (2 KB).

### Lote 4: despensa e mercado

| ID | Origem | O que fazer | Arquivos prováveis | Critério de aceitação | Esf. |
| --- | --- | --- | --- | --- | --- |
| W3L-20 | dono (2) | **Domínio do estoque**: `Building.stock` com teto de 4; `cook` consome os básicos; migração com a despensa cheia; casa nova nasce cheia; o lanche e o peixe continuam infinitos. | `domain/ingredients.ts`, `domain/recipes.ts`, `domain/buildings.ts`, `domain/neighborhood-types.ts`, `persistence/neighborhood-v3.ts`, `persistence/progress-validation.ts` | Unitário:<br>• um save antigo carrega com 4 de cada;<br>• cozinhar panqueca tira 1 farinha, 1 ovo e 1 leite;<br>• receita errada não tira nada;<br>• com o estoque zerado e sem mercado, `feed` com lanche funciona (sem beco sem saída);<br>• `stock` 9 vira 4.<br>Mutação ≥ 80%.<br>Rollback: o build de `main` atual lê o save com `stock` e ignora o campo. | M |
| W3L-21 | dono (2) | **Mercado**: peças `market-shelf` (3 desenhos) e `checkout`, template `market`, plano Mercado da loja com cartão em Ampliar, regra "um lugar é o que tem dentro" (`isMarket(room)`) e fachada de loja com toldo de mercado. | `domain/types.ts`, `domain/rooms.ts`, `domain/institution-plans.ts`, `domain/buildings.ts`, `content/buildings.ts`, `content/furnishings.ts`, `presentation/panoramic-facade.ts`, `public/art/market.svg` | Unitário: o plano Mercado cria salão com 2 prateleiras e caixa; `isMarket` é verdadeiro numa casa com prateleira e caixa e falso só com prateleira. Um save com `market-shelf` lido por um build anterior carrega sem a peça. E2E: construir o mercado pelo seletor ilustrado com o texto oculto. | M |
| W3L-22 | dono (2) | **Compras**: item `sacola` (até 6 ícones), tocar na prateleira, caixa com bipe e fita, regra "sair só depois do caixa", levar para casa, soltar na geladeira para guardar, sobra que volta à sacola. | novo `domain/market.ts` (`buy`, `checkout`, `stock-up`), `domain/portable.ts`, `domain/item-kind.ts`, `persistence/neighborhood.ts`, novo `presentation/market-play.ts`, `presentation/item-pickup.ts`, `bootstrap/` | Unitário: o 7º ingrediente não entra; sair sem pagar devolve `missing:checkout`; `stock-up` com 3 ovos sobre 3 em casa deixa 4 e 2 na sacola. E2E: no mercado, pôr pão e leite na sacola, passar no caixa, ir para casa, soltar a sacola na geladeira e ver o pão na despensa da bancada. Teste sem texto: o mesmo fluxo com o texto transparente. Teste DOM: nenhum dígito.<br>Rollback: o build de `main` atual lê o save com uma sacola e a descarta (tipo desconhecido), sem perder o resto. | G |
| W3L-23 | dono (2), §3.4 | **Geladeira e despensa que se veem**: a geladeira aberta desenha o estoque; a bancada mostra o ingrediente sem estoque em silhueta, com a bolha "mercado"; a prateleira de especiais e sementes se revela pelas condições de §3.4 (`progress.shelves`). | `presentation/kitchen-bench.ts`, `presentation/furniture-art.ts`, `domain/market.ts`, `domain/progress.ts`, `persistence/progress-validation.ts` | E2E: com o leite zerado, a bancada mostra o leite em silhueta e tocar nele mostra a bolha do mercado; depois da primeira colheita, as sementes de milho aparecem na prateleira. Captura da geladeira cheia e vazia a 1024. | M |

**Estimativa:** +22 KB de JS gzip. Arte: prateleiras, caixa, sacola, fachada e geladeira por dentro, cerca de 24 KB.

### Lote 5: família, escola e trabalho

| ID | Origem | O que fazer | Arquivos prováveis | Critério de aceitação | Esf. |
| --- | --- | --- | --- | --- | --- |
| W3L-24 | dono (4) | **Dois adultos**: ids em `actorIds` e em `actorKinds`, proporção adulta da figura, âncoras e hit areas, 7 looks por adulto, retratos na Turma, necessidades com tédio ×0,6. **Só depois de W3L-18 estar em `main`.** | `domain/types.ts`, `domain/world.ts`, `content/catalog.ts`, `content/personalities.ts`, `presentation/pose.ts`, `presentation/art.ts`, `presentation/portrait.ts`, `public/art/adult.svg` | Unitário: um save sem adultos carrega com os dois na sala da "Minha casa"; o build de W3L-18 lê o save novo e descarta os adultos sem perder nada. E2E: arrastar um adulto para o sofá o senta com a proporção certa, captura a 1024 e a 390. Revisão: a família aprova nomes e aparência. | G |
| W3L-25 | dono (4) | **Trabalho**: adulto no cômodo de trabalho veste o uniforme (o look anterior volta ao sair) e anima; volta do trabalho com sacola paga de 3 básicos em falta, se existir mercado. | novo `domain/work.ts`, `domain/market.ts`, `presentation/reactions.ts`, `presentation/life-pose.ts` | Unitário: o adulto no caixa ganha o look de mercado; ao voltar para casa na tarde com mercado no bairro, ganha uma sacola com os 3 básicos de menor estoque; sem mercado, nada. E2E: levar o adulto ao escritório troca a roupa, e trazê-lo de volta à tarde mostra a sacola. | M |
| W3L-26 | dono (1, 4), W3-06 (parte) | **Escola**: peça `board`, carteiras como assento, aula de 20 s com desenho de 12 temas, mãos levantadas, adulto professor opcional, desenho do dia em `progress.drawings` e na porta da geladeira (até 4). | novo `domain/school.ts`, `domain/rooms.ts`, `domain/progress.ts`, `persistence/progress-validation.ts`, novo `presentation/lesson.ts`, `presentation/furniture-art.ts`, `public/art/school.svg` | Unitário: a aula sem criança sentada devolve `missing:seat`; o tema roda; o desenho não se repete até os 12 saírem. E2E: na escola, sentar a Bia e o Léo nas carteiras e tocar no quadro mostra o desenho se formando e, em casa, o desenho na geladeira. Variante reduzida: o desenho aparece pronto. | G |
| W3L-27 | dono (4) | **Rotina do dia**: `suggestion(phase, …)` com mochila, pasta, bola, prato e travesseiro; bolha tracejada; tocar abre o Mapa já com o lugar marcado; sino na fachada da escola de manhã; necessidade sempre vence a sugestão. | novo `domain/routine.ts`, `presentation/need-bubble.ts`, `presentation/world-navigation.ts`, `presentation/civic-facades.ts` | Unitário: de manhã, criança em casa → mochila; com fome em `precisa` → prato, nunca mochila. E2E com relógio falso: aos 30 s a Bia mostra a mochila; tocar abre o Mapa com a escola marcada; ignorar até a tarde troca para a bola e o save não muda. | M |

**Estimativa:** +24 KB de JS gzip. Arte: corpo adulto e 7 looks, quadro, carteira revista e 12 desenhos, cerca de 60 KB, o maior grupo da onda.

### Lote 6: o que sobra do plano anterior

| ID | Origem | O que fazer | Arquivos prováveis | Critério de aceitação | Esf. |
| --- | --- | --- | --- | --- | --- |
| W3-10 | mantido, revisto | **Metas da vida**: 12 cartões, um por vez, com desfecho e adesivo, em `progress.goals`:<br>1. Tomar café da manhã sentado.<br>2. Construir um mercado.<br>3. Fazer compras e guardar na geladeira.<br>4. Fazer panqueca.<br>5. Colher uma alface.<br>6. Ir à escola e trazer um desenho.<br>7. Todo mundo dormindo na cama.<br>8. Servir o prato favorito de alguém.<br>9. Abraçar quem está triste.<br>10. Um adulto voltar do trabalho com compras.<br>11. Jantar com 3 pessoas à mesa.<br>12. Um dia inteiro sem ninguém triste. | novo `domain/goals.ts`, `content/projects.ts`, `presentation/editor-controls.ts`, `presentation/shell.ts`, `public/art/goals.svg` | Unitário: cada predicado com um caso verdadeiro e um falso. E2E: com o cartão "Tomar café da manhã sentado", dar um prato à Bia sentada de manhã põe o adesivo. Teste DOM: nenhum dígito nem total. Recarregar mantém o adesivo. | M |
| W3-09 | mantido | **Variações das brincadeiras** (pedrinha, 3 ritmos de corda, parlenda com desfecho), agora ligadas ao tédio e à brincadeira favorita. | `domain/child-games.ts`, `presentation/game-controls.ts`, `presentation/child-game-art.ts` | Como em `2026-11-wave3-depth.md`, mais: terminar a parlenda tira o tédio de todos os que estavam pulando. | M |
| W3-28 | mantido | **Horta em casa** (`planter` com `Piece.plant`), sem mudança de desenho. Como o regador de mão foi para a onda 4, a horta em caixa se rega tocando nela com o personagem selecionado (ele usa a pia mais próxima, se houver, ou só as mãos) ou pela chuva. | como no plano anterior | Como no plano anterior. | M |
| W3-26 (parte) | mantido só a chuva | **Chuva**: rega canteiros e hortas, poças, guarda-chuva em quem está na rua, e o tédio não sobe para quem pula nas poças. Carteiro e noite de estrelas vão para a onda 4. | novo `presentation/town-events.ts`, `domain/garden.ts` (`rain`), `public/art/events.svg` | E2E com a data falsa num dia de resto 1: os canteiros plantados aparecem regados na abertura e há poças. Dia calmo não tem poças. | P |

**Estimativa:** +14 KB de JS gzip. Arte: cerca de 30 KB (metas e chuva).

**Totais:** 31 itens em 7 lotes (1A, 1B, 2 a 6): 27 novos e 4 antigos mantidos. Esforço: 4 P, 22 M e 5 G. JS estimado: +128 KB no pior caso, ou cerca de 570 KB no fim, dentro do teto de 1 MB, com todos os lotes abaixo de +40 KB.

### 5.8 Destino dos itens antigos (lotes 5 a 8)

| Item antigo | Destino | Motivo |
| --- | --- | --- |
| W3-21 Padaria construível | **Onda 4** (W4-19) | O mercado ocupa o lugar de "lugar com mecânica". A padaria volta construída sobre o estoque e os assentos, que antes não existiam. |
| W3-22 Fregueses (domínio) | **Onda 4** (W4-19) | Depende da padaria. A rotação de pedidos vira "quem está com fome escolhe a padaria". |
| W3-23 Fregueses na cena | **Onda 4** (W4-19) | Idem. |
| W3-03 Pedidos em casa | **Descartado** (absorvido por W3L-12) | A bolha de fome com o favorito é o pedido, só que com motivo. Dois sistemas de bolha competiriam. |
| W3-24 Dia e noite | **Antecipado** para W3L-11 | O sono precisa da noite. |
| W3-25 Correio (domínio) | **Onda 4** (W4-20) | A origem de sementes e especiais passa ao mercado. A carta volta como história com final, não como entrega. |
| W3-04 Correio e campainha na cena | **Onda 4** (W4-20) | Idem. A campainha que mostra quem está dentro pode entrar antes, se sobrar tempo, porque é pequena. |
| W3-26 Eventos I | **Chuva mantida** no lote 6; carteiro e estrelas → **onda 4** | A chuva é barata e conversa com horta e tédio. As outras duas dependem do correio e dos segredos. |
| W3-27 Eventos II (feira, aniversário, piquenique) | **Onda 4** (W4-21) | A feira concorre com o mercado. O aniversário é a melhor "história com final" e abre a onda 4 com bolo e convidados sentados à mesa. |
| W3-07 Uso dos 6 adereços | **Onda 4** (W4-22), exceto a sacola, que entra em W3L-22 | Seis verbos rasos não passam no pilar 7. O caprichado continua vindo do look `chef`, como hoje. |
| W3-28 Horta em casa | **Mantido** no lote 6 | Barato, e já tem domínio pronto. |
| W3-08 Gestos sociais | **Absorvido** em W3L-14 | Ganha função: cura tédio e tristeza. |
| W3-05 Segredos | **Onda 4** (junto de W4-13, álbum) | Agora a noite existe. Os segredos entram com o álbum, para serem registrados. |
| W3-06 Convites nas instituições | **Escola absorvida** em W3L-26; resto → **onda 4** | A aula é o convite da escola, com desfecho. Consultório e achados e perdidos esperam. |
| W3-09 Variações das brincadeiras | **Mantido** no lote 6 | Liga ao tédio. |
| W3-10 Metas | **Mantido** e revisto para a vida | Lista nova acima. |

**Onda 4, acréscimos:** W4-19 Padaria e fregueses, sobre o estoque e os assentos. W4-20 Correio com cartas-história. W4-21 Aniversário, feira e piquenique. W4-22 Adereços com verbo próprio. W4-23 Escada entre andares e elevador no prédio. W4-24 Ônibus da escola na rua. W4-25 Moedinhas sem número no mercado, só se a família pedir. O W4-15 (criador de personagem) fica mais barato, porque W3L-18 já torna a turma tolerante a ids.

### 5.9 Gate específico desta onda (substitui o de `2026-11-wave3-depth.md` §2)

- **Arraste:** os 7 E2E de W3L-01 passam a 1024 e a 768. No tablet real, numa sessão de 10 min, o `dropOutcome` registra **zero** `cancelled:*` que a criança não pediu.
- **Sem castigo:** recarregar depois de 30 dias simulados começa de manhã, com todos descansados. Um personagem com fome por 10 min de sessão fica com o rosto triste, e nada mais muda: ele obedece a todos os comandos com a mesma velocidade e nada se perde.
- **Sem beco sem saída:** com o estoque zerado e sem mercado, alguém com fome consegue comer (lanche). Com a despensa vazia, a bancada mostra o caminho (bolha do mercado).
- **Sem número:** nenhum texto com dígito nem barra na UI de necessidades, sacola, geladeira, escola e metas.
- **Toda recusa explica:** nenhuma ação de jogador devolve `events: []` sem um `missing` correspondente, verificado por um teste que percorre as ações.
- **Save:** os fixtures v1, v2 e v3 "ricos" carregam. O build de W3L-18 lê o save do fim da onda. A chave v2 nunca é reescrita.
- **Teste sem texto:** com o texto transparente, um adulto que nunca jogou compra pão no mercado, guarda em casa, faz um sanduíche e faz a Bia comer sentada.
- **Família:** aprovação dos adultos, do rosto triste e da brincadeira favorita da Bia.

---

## 6. Riscos, perguntas e observação

### 6.1 Riscos

1. **Escopo.** São 31 itens e 5 G, mais do que os 4 lotes já entregues juntos. **Corte mínimo, se for preciso:** lotes 1A e 1B inteiros, W3L-10, W3L-11, W3L-12, W3L-15, W3L-18, W3L-20, W3L-21 e W3L-22. Isso já entrega "arrastar funciona, sentar para comer, sentir fome e sono, dormir na cama, comprar no mercado". Adultos, escola e trabalho podem esperar sem quebrar nada.
2. **O diagnóstico de arraste é de leitura.** D8 e D9 são hipóteses. Se o E2E não reproduzir uma delas, ela sai do item, sem "corrigir por garantia".
3. **Necessidades viram cobrança.** Se a Bia passar a sessão apagando incêndio de fome e sono, o jogo virou tarefa. As taxas acima são um chute calibrado para um dia de 16 min. **Mitigação:** as taxas ficam numa tabela do domínio e a sessão de observação mede quantas vezes por minuto aparece uma bolha. Acima de uma a cada 2 min em média, as taxas caem pela metade.
4. **Tristeza para uma criança sensível.** Um rosto triste pode doer mais do que o esperado. Por isso: sem lágrima, sem som triste e recuperação instantânea. Se a Bia ficar aflita, a tristeza vira só "rosto cansado". Basta trocar o desenho.
5. **Save da turma.** Ver §4. Se W3L-24 for para `main` antes de W3L-18, um rollback perde o progresso. O pipeline precisa travar isso, com um teste que lê o save novo usando o fixture gerado pelo build de W3L-18.
6. **Custo de arte dos adultos.** Corpo adulto em 6 looks, mais poses de sentar, deitar, trabalhar e carregar. Mitigação: o guarda-roupa limitado e o mesmo esqueleto de `human.svg`.
7. **Desempenho.** Reflexo do espelho, véu da noite, bolhas e íris somam custo. A medição de FPS em tablet real, pendente desde a onda 2, passa a ser obrigatória no fim do lote 1B.
8. **Bagunça de sacolas.** Sacolas esquecidas viram lixo visual. Por isso a sacola vazia some ao ser solta, e a cheia pode ir para a geladeira com um toque.

### 6.2 Perguntas para a família (só as que precisam de decisão)

1. **Quem são os adultos?** A proposta é 2. Nomes, aparência e relação com as crianças: são "os pais da Bia" (inspirados na família real?) ou "os adultos da turma"? Isso decide arte, falas e se cada criança tem família própria (que ficaria para a onda 4).
2. **Quanto a comida pode acabar?** A proposta é despensa com até 4 de cada, cheia na migração, e o lanche de sempre que nunca acaba. A família prefere mais folga (6) ou menos (3)? E confirma que o mercado fica **sem dinheiro**?
3. **Escola e trabalho do tamanho certo?** A proposta é uma aula curta que gera um desenho para a geladeira, e trabalho mostrado como "vestir o uniforme e voltar com compras". Os adultos devem ter as profissões reais dos pais?
4. **O rosto triste pode ter lágrima?** A proposta é que não.

**Respostas da família (2026-11-12):**
1. Os adultos são **os pais da Bia e da Turma**: dois adultos, pais de todas as crianças. Nomes e aparência ainda abertos; propor na W3L-24 e validar com a família antes da arte final.
2. Aceita a proposta: até 4 de cada, despensa cheia na migração, lanche de sempre que nunca acaba, mercado **sem dinheiro**.
3. Aceita a proposta: aula curta com desenho para a geladeira; trabalho = uniforme e voltar com compras.
4. Aceita a proposta: **sem lágrima**.

Ficam decididos por mim, salvo objeção: três necessidades (sem higiene), sem moeda, padaria e correio na onda 4, "um lugar é o que tem dentro", autonomia só dentro do cômodo e só para quem não está selecionado.

### 6.3 Sessão de observação com a Bia

**Quando:** logo depois do lote 1B (UX), e de novo depois do lote 4 (mercado). São 20 min sem instrução verbal, com o `dropOutcome` ligado em modo de teste e o vídeo da tela.

**Depois do lote 1B:**
1. Quantos arrastes de personagem ela faz em 10 min, e quantos terminam onde ela queria? (A meta é que mais de 9 em 10 terminem assim.)
2. Ela pega pela cabeça, pelo corpo ou pelos pés? (Confirma D1.)
3. Ela descobre o anel de ações sem a gaveta? Abre a gaveta sozinha?
4. Ela percebe que a Bia sentou à mesa e comeu? Repete de propósito?
5. O espelho: ela fica brincando de careta? Troca de roupa diante dele?
6. A troca de cômodo pelo íris a incomoda ou diverte?

**Depois do lote 4:**
7. Ela percebe a bolha de fome sozinha? Quanto tempo leva entre a bolha aparecer e alguém comer?
8. As bolhas parecem convite ou cobrança? Ela fala "de novo?!"
9. Quando a farinha acaba, ela entende que precisa ir ao mercado? Constrói o mercado sem ajuda?
10. Ela passa no caixa por conta própria? A meia-volta na porta a diverte ou irrita?
11. Ela põe todo mundo para dormir à noite? Usa a lua de "todos para a cama"?
12. O que ela pede que não existe? É o melhor insumo para a onda 4.
