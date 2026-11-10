# Onda 3 revista: profundidade (novembro de 2026)

**Autor:** diretor de arte e de game design, autor de `2026-11-specialists.md` e dos gates das ondas 1 e 2.
**Base:** nova direção do proprietário (10/11/2026), código em `wave1-clarity-safety` (HEAD 9069539) e `reports/review/gate-wave2.md`.
**Natureza:** só planejamento. Nada aqui foi executado. As medições de orçamento vêm do `dist/` de 10:45, anterior aos últimos commits da onda 2, e precisam ser refeitas no primeiro lote.

**Pré-condição dura:** o gate da onda 2 está **REPROVADO**, com 5 correções obrigatórias em andamento. Nenhum item desta onda começa antes desse gate aprovar. Além disso, `scene.ts` tem 295 linhas para um teto de 300 e `main.ts` tem 264 contra a meta de 240. Por isso o lote 1 começa por extração (W3-11).

---

## 1. Diagnóstico: por que o jogo é raso para 7 a 10 anos

A onda 1 deu clareza e a onda 2 deu vida. Mas o jogo ainda é uma casa de bonecas sem consequência: toda ação tem um efeito único, imediato e reversível, e nada se acumula. Uma criança esperta esgota o espaço de possibilidades em 10 a 20 minutos. A evidência no código:

| Sintoma | Evidência |
| --- | --- |
| **Quase não há coisas para combinar.** São 4 objetos portáteis mais a bola. Cada casa tem no máximo um de cada tipo, porque o id é `casa:tipo`. | `src/domain/types.ts:4` (`itemIds`); regex `/^[1-9]\d*:(lanche\|peixe\|microfone\|ursinho\|bola)$/` em `src/persistence/neighborhood.ts`; `migrateNeighborhood` monta `${h.id}:${kind}`. |
| **Os 15 móveis usáveis têm o mesmo verbo:** alternam `active`. O fogão não cozinha, a horta não cresce, a estante não guarda nada. | `src/domain/use.ts` (`usableKinds` e `active: !p.active`). |
| **O cuidado tem dois booleanos e duas comidas.** Comer é segurar `lanche` ou `peixe` e apertar um botão. | `Actor.fed` e `Actor.resting` em `types.ts`; `care.ts`. |
| **O regador liga uma flag que nunca desliga.** A planta da praça não tem estágio nem colheita. | `outdoor.ts`: `target === 'water'` → `watered: true`, e nada volta a `false`. |
| **Correio e campainha são listas de ids que ligam e desligam.** Não existe carta. | `Outdoor.mail` e `Outdoor.bells` (`number[]`), `buildingInteraction` em `outdoor.ts`. |
| **Os ambientes só diferem pelos 3 ou 4 móveis com que nascem.** Cozinha, copa e lanchonete são quase o mesmo conjunto de peças. Nenhum lugar tem regra própria. | `src/domain/rooms.ts:10-21` (`kitchen: ['fridge','counter','stove','table']`, `breakroom: ['counter','fridge','kitchen-cart']`); `institution-plans.ts` só escolhe templates. |
| **As brincadeiras são uma sequência fixa e única.** A amarelinha tem sempre as mesmas 11 casas e a corda tem um ritmo só, de 1600 ms. | `src/domain/child-games.ts` (`hops`, `1600`). |
| **A turma tem a mesma personalidade.** Os 4 humanos compartilham o mesmo pool de 3 reações. | `src/content/personalities.ts` (`bia: kids, luna: kids, leo: kids, rui: kids`). |
| **Construir acaba.** Depois de construída, uma casa não pede mais nada. Há só 3 ideias de projeto. | `src/content/projects.ts` (3 entradas); `construct` em `src/domain/buildings.ts` só monta o layout e devolve o bairro, sem nenhum estado de "em andamento". |
| **Nada muda entre sessões.** O domínio não tem relógio e nenhum estado depende do tempo. | `grep -rn "Date.now\|new Date" src` não encontra nada fora de testes; o único relógio é `performance.now` na apresentação. |

**Conclusão:** faltam três coisas, nesta ordem: **combinação** (entradas que geram saídas novas), **lugar com regra** (um espaço que pede algo e devolve algo) e **tempo** (o mundo continua enquanto ela não está). As decisões abaixo atacam as três e mantêm o que a onda 1 protegeu: sem punição, jogável sem ler e com a obra da criança a salvo.

---

## 2. Pilares revisados

Os pilares 1 a 4 e 6 continuam iguais aos de `2026-11-specialists.md` §2. O pilar 5 é substituído e entra um pilar 7.

1. **Todo toque responde, perto do dedo** (sem mudança).
2. **Mostrar antes de escrever** (sem mudança). Receita, pedido, carta e planta se leem por ícone e cena.
3. **Personagens vivos com personalidade** (sem mudança). Agora também têm gostos que valem dentro do jogo: prato favorito e presente.
4. **Mundo de brinquedo legível** (sem mudança).
5. **Metas e conquistas sem castigo** (substitui "Liberdade sem pressão").
   - Metas existem, são opcionais e aparecem como figura. Ao cumprir uma, há festa e um adesivo.
   - O que se conquista só cresce. Receita descoberta, semente ganha e presente recebido nunca se perdem.
   - **A ausência não custa nada.** Planta não murcha nem morre. Não existe sequência de dias ("streak"). As cartas param de acumular em 3.
   - Nenhum timer que falha. Freguês espera para sempre. Errar uma receita não gasta ingrediente.
   - Sem moeda, preço, placar, ranking, nota, estrela de avaliação, porcentagem ou total.
   - Coleções aparecem como páginas com silhuetas, nunca como "7 de 24" nem como barra de progresso.
   - Sem notificação e sem texto do tipo "volte amanhã". O motivo para voltar é a planta e a carta, mostradas na cena.
6. **A obra da criança nunca se perde** (sem mudança). Agora inclui a coleção, que fica protegida pela migração v3.
7. **Profundidade por descoberta** (novo). Cada sistema tem uma camada evidente, para quem só toca, e uma escondida, para quem experimenta: combinação secreta, troca de um ingrediente, utensílio diferente, variação "caprichada" e evento do dia. A camada escondida nunca é necessária para se divertir.

### O que este documento revoga em `2026-11-specialists.md`

| Trecho original | Situação |
| --- | --- |
| Pilar 5 ("sem contadores, listas, x de y, volte amanhã") | Substituído pelo pilar 5 acima. |
| Gate comum 5: "Zero ... gatilho por relógio real" | Revogado só para crescimento de plantas, chegada de cartas e evento do dia. Continuam proibidos números, contadores, porcentagens, "x de y", estrelas de avaliação, "erro" e "errado". |
| §4.3: JOG-12 rejeitado ("álbum é pontuação disfarçada") | Revogado. O livro de receitas entra na onda 3 e o álbum na onda 4, com as regras do pilar 5. |
| §4.3: HIS-12 adiado (eventos do bairro) | Revogado. Os eventos entram em W3-26 e W3-27. O conflito "chuva × plantas" se resolve a favor da chuva: chover rega. |
| Futuro: "Crescimento das plantas em 4 estágios" | Puxado para W3-19, W3-20 e W3-28. |
| Critérios "sem campo novo" (W3-04), "não existe lista/álbum" (W3-05), "nada é salvo" (W3-09) e "não há concluído" (W3-10) | Substituídos pelos critérios da seção 5. |

### Gate específico da onda 3 (substitui o da §7 original)

- O checklist do pilar 5 é auditado item a item. Estes casos são testáveis:
  - nenhum texto com dígito na UI de livro, cesta, correio e metas;
  - uma planta sem rega por 30 dias simulados continua viva e no mesmo estágio;
  - um freguês ignorado por 10 minutos de cena continua no balcão, sem mudar de expressão para triste;
  - uma receita errada não remove nada de `basket`.
- Um pedido por vez em casa. Nenhum pedido em Criar. O desligamento funciona.
- Save: fixtures v1, v2 e v3 "ricos" carregam. Um v3 com ids desconhecidos carrega sem eles. A chave v2 nunca é reescrita.
- Teste sem texto ampliado: com o texto transparente, um adulto faz panqueca, planta e rega uma alface e atende um freguês.
- A personalidade da Bia é aprovada pela família. Todas as falas interpolam o nome.
- E2E de tempo usa relógio falso. Nenhum `timeout` aumentado, porque o gate da onda 2 reprovou exatamente por isso.

---

## 3. Desenho dos sistemas

### 3.1 Despensa e ingredientes

Ingrediente não é objeto do mundo. Só o prato pronto é. Isso evita que a bancada dependa de um personagem segurando 3 coisas: hoje `consistent()` permite um objeto por mão. Também evita poluir a cena e o save com dezenas de itens.

| Grupo | Ingredientes | Origem | Quantidade |
| --- | --- | --- | --- |
| Básicos (7) | farinha, ovo, leite, açúcar, pão, queijo, peixe | Sempre na despensa, desde o início | Infinitos |
| Da horta (6) | alface, tomate, cenoura, milho, morango, abóbora | Colheita (2 por colheita) e feira | Até 6 por tipo na cesta. Mostrados como pilha de ícones, nunca como número. |
| Especiais (3) | chocolate, canela, mel | Cartas L04, L06 e L08, ou presente da Pipoca (mel) | Infinitos depois de ganhos |

Sementes iniciais: alface, tomate e cenoura. Milho, morango e abóbora chegam pelas cartas L01, L03 e L07.

### 3.2 Cozinha e receitas

**Bancada.** Tocar em fogão, bancada (`counter`), carrinho de cozinha ou vitrine da padaria abre a bancada na cena:
- uma tigela grande com 3 lugares;
- a despensa embaixo, com básicos, cesta e especiais;
- 4 utensílios à direita: **tábua**, **panela**, **forno** e **liquidificador**.

A criança arrasta de 1 a 3 ingredientes para a tigela, toca num utensílio e o personagem selecionado cozinha, com animação de 1,2 s e som. A ordem dos ingredientes não importa. A receita casa por conjunto exato mais utensílio.

**Resultado (regra pura em `domain/recipes.ts`):**
1. **Casou com uma receita.** O prato nasce como objeto no chão, junto da peça. Consome 1 unidade de cada ingrediente da horta, e nunca básicos ou especiais. Se a receita era nova, entra em `progress.recipes` e a página do livro se ilumina.
2. **Mesmos ingredientes de uma receita, outro utensílio.** O utensílio certo balança. Nada é consumido.
3. **O que está na tigela é parte de uma receita com esse utensílio.** Aparece um ingrediente-fantasma: o primeiro que falta, priorizando receitas ainda não descobertas e, entre elas, a de menor número. Nada é consumido.
4. **Senão:** sobe uma nuvem de vapor engraçada e o cozinheiro ri. Nada é consumido.

**Caprichado (variação).** O prato sai caprichado, com guarnição desenhada, se quem cozinha veste o look `chef` ou segura a colher de pau. A primeira vez que cada receita sai caprichada entra em `progress.fancy` e a página do livro ganha uma fita.

**Mesa cheia.** Cada casa aceita até 6 pratos soltos. No limite, a bancada não cozinha, e os pratos da cena pulam com a fala "Mesa cheia! Quem quer comer?". Não há perda nenhuma.

**As 27 receitas.** São 6 conhecidas desde o início e 21 descobríveis: 18 aparecem como silhueta no livro e 3 são secretas, sem silhueta. 15 levam 3 ingredientes.

| # | Prato | Ingredientes | Utensílio | Estado inicial | Pede |
| --- | --- | --- | --- | --- | --- |
| R01 | Sanduíche | pão + queijo | tábua | conhecida | básicos |
| R02 | Ovo mexido | ovo | panela | conhecida | básicos |
| R03 | Panqueca | farinha + ovo + leite | panela | conhecida | básicos |
| R04 | Bolo simples | farinha + ovo + açúcar | forno | conhecida | básicos |
| R05 | Leite batidinho | leite + açúcar | liquidificador | conhecida | básicos |
| R06 | Torrada | pão | forno | conhecida | básicos |
| R07 | Pão de queijo | farinha + queijo + ovo | forno | silhueta | básicos |
| R08 | Biscoito | farinha + açúcar | forno | silhueta | básicos |
| R09 | Pudim | leite + ovo + açúcar | panela | silhueta | básicos |
| R10 | Misto quente | pão + queijo | forno | silhueta | básicos (mostra que o utensílio importa) |
| R11 | Pipoca | milho | panela | silhueta | horta |
| R12 | Salada | alface + tomate | tábua | silhueta | horta |
| R13 | Vitamina de morango | morango + leite | liquidificador | silhueta | horta |
| R14 | Sopa de legumes | cenoura + abóbora + tomate | panela | silhueta (cartão L05) | horta |
| R15 | Bolo de cenoura | farinha + ovo + cenoura | forno | silhueta (cartão L09) | horta |
| R16 | Torta de abóbora | farinha + abóbora + açúcar | forno | silhueta | horta |
| R17 | Pizza | farinha + tomate + queijo | forno | silhueta (cartão L02) | horta |
| R18 | Curau | milho + leite + açúcar | panela | silhueta | horta |
| R19 | Suco de cenoura | cenoura | liquidificador | silhueta | horta |
| R20 | Sanduíche natural | pão + alface + tomate | tábua | silhueta | horta |
| R21 | Brigadeiro | chocolate + leite + açúcar | panela | silhueta | especial |
| R22 | Bolo de chocolate | farinha + ovo + chocolate | forno | silhueta | especial |
| R23 | Torrada de canela | pão + canela + açúcar | forno | silhueta | especial |
| R24 | Morango com mel | morango + mel | tábua | silhueta | horta e especial |
| S1 | Petisco de gato | peixe + farinha | forno | secreta | básicos |
| S2 | Chocolate quente | leite + chocolate + canela | panela | secreta (dica em L12) | especial |
| S3 | Bolo de mel | farinha + ovo + mel | forno | secreta | especial (troca de um ingrediente do R04) |

Conferência: os 16 ingredientes aparecem em pelo menos uma receita, e cada um tem origem na tabela 3.1. Não há dois pares conjunto+utensílio iguais (teste unitário obrigatório).

**Livro de receitas.** É um ícone de livro no cabeçalho de Brincar e um livro desenhado sobre a bancada. Tem uma página por utensílio (tábua, panela, forno, liquidificador) e uma de "segredos", que só aparece depois do primeiro segredo descoberto.
- **Receita conhecida:** prato colorido mais os ícones dos ingredientes e do utensílio. Se já saiu caprichada, ganha uma fita.
- **Receita não descoberta:** silhueta do prato, ícone do utensílio e **um** ingrediente. Se um cartão de carta a revelou, mostra todos os ingredientes.
- **Receita secreta não descoberta:** não aparece.
- Sem números, sem "?/24" e sem página "vazia" de grade. Silhuetas ficam misturadas às receitas conhecidas, na ordem da tabela.

**Comer.** Soltar um prato num humano, ou usar Comer com o prato na mão, faz o personagem comer: o prato some, `fed` fica `true` e ele reage. O prato favorito tem reação grande, com dança e coração. Gato só come peixe, petisco de gato (S1), leite batidinho (R05) e ovo mexido (R02); outro prato ele cheira e responde "Miau? (prefiro peixinho)", sem comer. Não existe reação de nojo.

### 3.3 Jardim

**Onde se planta:**
- 4 canteiros fixos na praça (`praca-1` a `praca-4`), substituindo o canteiro decorativo;
- toda peça `planter` (horta em caixa) dentro de casa, a partir de W3-28. O template `garden` passa a nascer com uma `planter` em cômodos novos.

**Ciclo:** **semente → broto → folhas → flor → pronto** (estágios 0 a 4).
1. Toque num canteiro vazio abre o saco de sementes: só ícones das sementes que ela já tem. Plantar põe o estágio em 0.
2. Cada estágio de 0 a 3 precisa de **uma rega** para começar a contar. Sem rega, a planta fica parada, com folhas caídas e uma gota piscando. Ela **nunca** murcha nem morre.
3. Depois de regada, a planta passa ao estágio seguinte quando `agora − regadaEm ≥ duração`. Ao avançar, pede nova rega.
4. No estágio 4, tocar colhe. Entram 2 unidades na cesta, com animação dos frutos voando para ela. A semente continua no saco e o canteiro esvazia. **Cesta cheia (6 do tipo):** entra só o que cabe. Se não cabe nenhuma, a planta continua pronta e a cesta balança com a fala "Cesta cheia! Vamos cozinhar?". Nada se perde.

**Duração por transição, em tempo real (minutos):**

| Cultura | 0→1 | 1→2 | 2→3 | 3→4 | Total | Papel |
| --- | --- | --- | --- | --- | --- | --- |
| Alface | 2 | 4 | 4 | 5 | 15 min | colhe na primeira sessão |
| Tomate | 3 | 7 | 10 | 10 | 30 min | colhe na mesma tarde |
| Cenoura | 5 | 10 | 20 | 25 | 1 h | |
| Milho | 10 | 20 | 40 | 50 | 2 h | |
| Morango | 15 | 45 | 60 | 120 | 4 h | dia seguinte, se regar à noite |
| Abóbora | 30 | 90 | 150 | 210 | 8 h | "volta amanhã" sem dizer isso |

**Regras de relógio (puras, testadas nas bordas):**
- O tempo chega ao domínio pela ação (`now` em ms). O domínio nunca lê relógio.
- **Relógio para trás** (`now < regadaEm`): a planta é rebaseada (`regadaEm = now`) e não avança.
- **Relógio para a frente** (data adiantada pela criança): avança só um estágio, porque cada estágio exige uma rega. Não há ganho grande e não há dano.
- `tick` a cada 30 s de sessão e ao voltar o foco da aba (`visibilitychange`). Quem dispara é o bootstrap.

**Rega:** o regador da praça (hotspot já existente) rega o canteiro mais próximo do personagem. O regador de mão (adereço) rega qualquer canteiro ou horta em caixa. Chuva rega todos.

### 3.4 Padaria: um lugar com mecânica própria

**Construção:** novo modelo **Padaria** em Criar → Ampliar, com dois cômodos:
- **Salão da padaria** (template novo `bakery`): vitrine com sininho (peça nova `display-case`), bancada, mesa e tapete;
- **Cozinha dos fundos** (template `kitchen`).

A vitrine abre a mesma bancada da seção 3.2. A placa da porta, **aberta** ou **fechada**, é só visual e não bloqueia nada.

**Chegada do freguês, sempre iniciada pela criança:**
- Tocar no sininho da vitrine chama um membro da turma para o salão. É o mesmo mecanismo do `summon`, mas para uma pessoa só e persistido como movimento normal.
- A escolha segue uma rotação fixa e pula quem está selecionado, quem está numa brincadeira e quem já está no salão.
- Cabem no máximo 3 fregueses na fila diante do balcão. Com a fila cheia, o sininho toca e a turma acena da fila.

**O pedido** fica só na apresentação, não é salvo, e é gerado por uma função pura `orderFor`.
- Cada freguês tem um balão com o desenho do prato.
- A sequência de pedidos de cada freguês, por rodada da sessão:
  1. o prato favorito dele, se a criança já pode fazê-lo;
  2. uma receita conhecida;
  3. **uma receita não descoberta cujos ingredientes ela tem.** O balão mostra a silhueta, os ingredientes e o utensílio. É assim que o jogo ensina receitas novas sem texto.
- Do 6º freguês da sessão em diante, um a cada três pede **dois pratos**.
- Quando `progress.fancy` não está vazio, um a cada quatro pede **caprichado** (chapéu de chef no balão).

**Entrega:** arrastar o prato até o freguês.
- **Certo:** o freguês come, reage conforme a personalidade e vai sentar à mesa. O pedido termina com festa.
- **Outro prato:** ele cheira, ri, diz "Hmm, quase!" e o balão do pedido pulsa maior. O prato volta para a mão de quem entregou.
- **Sem limite de tempo.** Depois de 90 s, o freguês que espera lê jornal ou brinca com o gato. O humor não muda.

**Conquista:** a primeira vez que cada personagem recebe o prato favorito na padaria, ele deixa um presente no balcão e o desenho dele aparece na parede do salão. A parede é uma coleção derivada de `progress.favorites`, sem outro campo.

| Freguês | Favorito (provisório) | Presente |
| --- | --- | --- |
| Bia | Panqueca (R03), **a confirmar com a família** | toldo listrado na fachada da padaria (derivado) |
| Luna | Pizza (R17) | estetoscópio |
| Léo | Bolo de cenoura (R15) | regador de mão |
| Rui | Pipoca (R11) | cesta |
| Mimi | Petisco de gato (S1) | curativo |
| Nino | Leite batidinho (R05) | lanterna |
| Pipoca | Ovo mexido (R02) | mel (especial) |

Como a Bia costuma estar selecionada, ela só vira freguesa quando outra pessoa está selecionada. É de propósito: atender a Bia vira uma pequena descoberta.

### 3.5 Dia e noite

**Decisão: relógio de jogo para o céu e relógio real para o que cresce e chega.**
- O ciclo de dia tem 16 minutos de sessão (`phaseAt(sessionMs, event)`; com o evento "noite de estrelas" a noite dura 6 min e o ciclo, 19):
  - manhã de 0 a 5 min;
  - tarde de 5 a 10;
  - entardecer de 10 a 11,5;
  - noite de 11,5 a 14,5;
  - amanhecer de 14,5 a 16.
- Toda sessão começa de manhã. Nada disso é salvo.
- **Por que não o relógio real para o céu:** a Bia joga em horários fixos (depois da escola). Com relógio real, ela veria sempre a mesma luz e nunca a noite, que tem segredos.
- **Dormir:** à noite, deitar um humano na cama acelera para a manhã. São 3 s de fade, a turma boceja e toca um "bom dia" (W3-24).
- **Noite:**
  - O fundo escurece com um véu azul de alfa 0,35 só nas camadas de fundo. Os personagens não recebem o véu, para manter o rosto legível.
  - Janelas com abajur aceso brilham. `home.lamp` continua sendo da criança e o sistema não liga nem desliga nada salvo.
  - Os gatos ficam agitados.
  - Os segredos noturnos só aparecem nessa fase (W3-05).
- **Movimento reduzido:** a troca de fase é um fade de 120 ms e não há estrelas piscando.

### 3.6 Correio e cartas

- **Chegada:** uma carta nova por dia local, na primeira abertura do dia. O dia vem de `dayIndex` calculado no bootstrap a partir da data local, sem fuso UTC.
- **A caixa guarda no máximo 3 cartas não lidas.** Depois disso, não chegam mais até ela ler. Não há fila acumulando culpa.
- **A primeira carta** (L01) chega na primeira abertura após a migração.
- **Onde:** na caixa da "Minha casa", a construção de menor id (sempre existe, porque o bairro mantém ao menos uma). A bandeirinha da caixa sobe quando há carta. A lista antiga `outdoor.mail` continua como brinquedo de carteiro, sem mudar de sentido.
- **Abrir:** a carta abre como um cartão ilustrado de 22 px ou mais, com no máximo 6 palavras e a assinatura em retrato. Se traz anexo, um pacote se abre e o conteúdo voa para a cesta, o saco de sementes, o livro ou o chão (no caso de adereço).

| Carta | De | Anexo |
| --- | --- | --- |
| L01 | Turma | colher de pau (adereço) + sementes de milho |
| L02 | Luna | cartão da receita Pizza |
| L03 | Léo | sementes de morango |
| L04 | Mimi (pegadinhas) | chocolate |
| L05 | Rui | cartão da Sopa de legumes |
| L06 | Nino | canela |
| L07 | Luna | sementes de abóbora |
| L08 | Pipoca | mel |
| L09 | Léo | cartão do Bolo de cenoura |
| L10 | Luna | convite com desenho do piquenique (sem anexo) |
| L11 | Rui | desenho do bairro (sem anexo) |
| L12 | Turma | "mapa do tesouro" com os ícones do Chocolate quente (S2) |
| B1–B8 | Rodízio da turma | bilhetes curtos, sem anexo, repetidos em ciclo depois da L12 |

O mel pode chegar duas vezes (L08 e presente da Pipoca). Ganhar um especial que ela já tem é inofensivo, porque `specials` é um conjunto.

### 3.7 Eventos do bairro

O evento do dia é derivado da data, `eventOfDay(dayIndex)` com `dayIndex % 10`, e não é salvo. Dos 10 dias do ciclo, 6 têm evento e 4 são calmos. Nenhum evento é necessário para avançar, e nenhum fica disponível "só hoje" de um jeito que a criança perca algo permanente. Toda receita, semente e presente tem outra origem.

| `dayIndex % 10` | Evento | Na cena | Regra |
| --- | --- | --- | --- |
| 0, 2, 5, 8 | calmo | — | — |
| 1 | **Chuva** | gotas, poças em que a criança pula e guarda-chuva sobre quem está na rua | `rain` rega todos os canteiros e hortas na abertura e a cada fase do dia |
| 3 | **Feira na praça** | barraca com feirante (figura só de apresentação) | soltar um prato na barraca dá 2 de uma cultura. Prioridade: a semente que ela não tem; senão, a cultura com menos unidades na cesta. Troca sem moeda. |
| 4 | **Aniversário** | balões na praça e chapéu de festa no aniversariante, que roda por `floor(dayIndex/10) % 7` | o aniversariante pede "um bolo" (R04, R15, R16, R22 ou S3). Entregar faz a turma presente se reunir, cantar e jogar confete. Esse é o desfecho. |
| 6 | **Dia do carteiro** | carteira passando pela rua | entrega +1 carta, respeitando o limite de 3 |
| 7 | **Piquenique** | toalha na praça | um prato solto na toalha é comido aos poucos por quem está na rua, com uma reação de cada um |
| 9 | **Noite de estrelas** | noite dura 6 min | estrela cadente a cada 40 s de noite. Tocar mostra os ícones de uma receita não descoberta. |

---

## 4. Envelope do bairro v3

"v3" aqui é **o envelope do bairro versão 3**. Não confundir com o `version: 3` do save legado de casa única em `save.ts`.

### 4.1 Chave e ordem de leitura

- **Chave nova:** `mundo-da-bia:neighborhood:v3`, com envelope `{ version: 3, town }`.
- **Ordem de leitura:** v3 → v2 (migra e grava em v3) → v1 → álbum.
- **A chave v2 nunca mais é escrita nem apagada.** Ela é o backup automático de rollback. Um build antigo lê a v2 intacta e perde só o progresso feito depois da atualização, nunca a casa.
- Se o v3 existir e falhar na validação estrutural, o texto bruto vai para `mundo-da-bia:neighborhood:v3:recovery` (mesma regra do `protectInvalid` atual) e o jogo carrega pela v2.

### 4.2 Campos novos

| Onde | Campo | Tipo | Inicial na migração |
| --- | --- | --- | --- |
| `Neighborhood` | `nextItem` | inteiro positivo | maior prefixo numérico entre os ids de item + 1 |
| `Neighborhood` | `progress.recipes` | `RecipeId[]`, receitas descobertas além das 6 iniciais | `[]` |
| | `progress.fancy` | `RecipeId[]`, receitas já feitas caprichadas | `[]` |
| | `progress.seeds` | `CropId[]` | `['alface','tomate','cenoura']` |
| | `progress.specials` | `SpecialId[]` | `[]` |
| | `progress.basket` | `Partial<Record<CropId, 1..6>>` | `{}` |
| | `progress.plaza` | `Partial<Record<'praca-1'..'praca-4', Plant>>` | `{}` |
| | `progress.post` | `{ day: number \| null; next: number; inbox: number[] }` | `{ day: null, next: 0, inbox: [] }` |
| | `progress.revealed` | `RecipeId[]`, receitas reveladas por cartão | `[]` |
| | `progress.favorites` | `ActorId[]`, quem já recebeu o favorito na padaria | `[]` |
| | `progress.goals` | `GoalId[]`, metas cumpridas | `[]` |
| `Piece` | `plant?` | `Plant`, só válido em `planter` | ausente |
| `NeighborhoodItem` | `kind` | ganha `'prato'` e os 6 adereços `estetoscopio`, `curativo`, `regador`, `lanterna`, `colher` e `cesta` | — |
| `NeighborhoodItem` | `recipe?` e `fancy?` | `RecipeId` (obrigatório se `kind === 'prato'`) e `true` | ausentes |
| enums | `BuildingModel` | + `'bakery'` | — |
| | `RoomTemplate` | + `'bakery'` | — |
| | `PieceKind` | + `'display-case'` | — |

O tipo `Plant` é `{ crop: CropId; stage: 0|1|2|3|4; since: number; watered: boolean }`. A planta da casa fica **no próprio `Piece`**, seguindo o precedente de `active?`, e não num mapa no nível do bairro. Assim, mover, duplicar, limpar, remover e desfazer funcionam sem código novo, e a planta some com a peça, o que é coerente. Os canteiros da praça não são peças, por isso ficam em `progress.plaza`.

**Ficam de fora do save:** fase do dia, evento do dia, pedidos e fila da padaria, pedido em casa, dica da bancada, seleção na tigela e o "visto hoje" de convites.

**Novos tipos de item não entram em `itemIds`.** `validWorld` exige `complete(value.items, itemIds, item)` com o comprimento exato, e um save legado de casa única deixaria de carregar. Os novos tipos ficam numa lista própria, `portableKinds`, como já acontece com `bola`.

### 4.3 Migração v2 → v3 (pura, em `persistence/neighborhood-v3.ts`)

`upgradeToV3(town)` faz o seguinte:
- devolve o mesmo bairro com `progress: initialProgress()` e o `nextItem` calculado;
- não muda nenhum item, nenhuma peça e nenhum id existente;
- o `outdoor.watered` antigo deixa de ter efeito visual (o canteiro decorativo vira os 4 canteiros) e passa a ser ignorado na leitura e gravado como `false`. Isso evita apagar um campo exigido por `validOutdoor` em builds v3 anteriores.

**Teste obrigatório:** o fixture rico da v2 (3 casas, itens, looks variados e outdoor ocupado) migra para um bairro em que `omit(v3, ['progress','nextItem'])` é profundamente igual ao bairro v2.

### 4.4 Validação e descarte de desconhecidos

**Princípio:** o v3 só rejeita o bairro por violação estrutural de posição, dono, local ou identidade, como hoje. Conteúdo desconhecido **descarta só a si mesmo**. Isso permite acrescentar receitas, culturas, adereços e enums dentro do v3, lote a lote, sem nova versão: um build anterior do próprio v3 descarta o que não conhece em vez de perder a casa.

| Entrada inválida ou desconhecida | Tratamento |
| --- | --- |
| `progress` ausente ou que não é objeto | `initialProgress()` |
| id desconhecido ou repetido em qualquer lista de `progress` | removido da lista |
| `basket` com chave desconhecida, valor não inteiro ou ≤ 0 | chave removida; valor > 6 vira 6 |
| `Plant` com cultura desconhecida, estágio fora de 0..4, `since` não finito ou negativo, ou `watered` que não é booleano | aquela planta é removida (o canteiro fica vazio e a peça fica) |
| `plant` em peça que não é `planter` | campo removido |
| `post.inbox` com índice inválido ou repetido, ou com mais de 3 | filtrado e truncado em 3; `next` e `day` inválidos voltam ao inicial |
| item de tipo desconhecido, ou `prato` com receita desconhecida | item removido (generaliza o `knownContent` atual). Quem o segurava fica de mão vazia. |
| `nextItem` ausente ou ≤ algum prefixo | recalculado |
| peça de `PieceKind` desconhecido | peça removida. Quem estava sentado num assento dela volta para `seat: null`. |
| `RoomTemplate` desconhecido | `'empty'` |
| `BuildingModel` desconhecido | `'house'` (cômodos e móveis ficam) |
| campo extra desconhecido em `town` ou `progress` | ignorado; o objeto é reconstruído só com campos conhecidos |

**Mudanças pontuais no código atual** (a fazer em W3-12 e W3-13):
- O id de item passa a ser `^[1-9]\d*:[a-z]+$`, com o sufixo igual a `kind` e unicidade global. A regex fixa sai de `object()`.
- O truque `bola → ursinho` em `object()` vira uma checagem própria de "portátil": posição, local e `spot`.
- A lista branca da geladeira em `itemSpot` aceita também `prato`.
- Itens novos nascem com `${nextItem}:${kind}`, e `nextItem` incrementa. Pode haver vários pratos por casa.

### 4.5 Camadas

- `domain/` ganha os módulos puros:
  - `progress.ts`: estado inicial e conjuntos;
  - `recipes.ts`: tabela, `cook` e `hint`;
  - `garden.ts`: plantar, regar, `tick`, colher e chuva;
  - `orders.ts`: `orderFor`, `serve` e presentes;
  - `post.ts`: `deliver` e `open`;
  - `clock.ts`: `dayIndex`, `phaseAt` e `eventOfDay`;
  - `goals.ts`: predicados de metas;
  - `portable.ts`: criar e consumir itens.
- Tabelas que as regras usam (receitas, durações, rotação de pedidos, anexos das cartas e presentes) ficam **no domínio**, como dados. O motivo: `content/` só pode importar tipos do domínio (`content-types-only`) e o domínio não importa `content`. Nomes, falas e textos ficam em `content/`.
- Todo dado de tempo entra pela ação (`now` e `day`). As ações novas de `NeighborhoodAction` são:
  - `cook`, `eat` e `serve`;
  - `plant`, `water-plot`, `harvest`, `tick` e `rain`;
  - `deliver-mail` e `open-letter`;
  - `summon-customer` e `barter`.
- Mutação de 80% ou mais em `domain/` e `persistence/`. As tabelas de limiar têm testes nas bordas (duração − 1 ms não avança, duração exata avança).
- Só `storage.ts` toca `localStorage`. O relógio real vive em `bootstrap/clock.ts`, uma porta injetável.

---

## 5. Backlog da onda 3

**Regras:**
- Os ids W3-01 a W3-10 continuam nos itens antigos, ajustados. Os novos começam em W3-11.
- A ordem dos lotes expressa a dependência. Cada item é commitável sozinho, com `quality:fast` verde e os E2E afetados verdes.
- Esforço: P (até 1 dia), M (2 a 4 dias), G (1 semana).
- Todo E2E de tempo usa o relógio falso do Playwright, sem aumentar `timeout`.
- **Regra transversal do save:** o resultado de toda ação nova do domínio precisa passar no decode v3. O validador é estrito, e um save rejeitado cai para a v2 antiga. Cada item com ação nova tem um teste de propriedade: "aplicar a ação e fazer encode → decode devolve o mesmo bairro". As armadilhas conhecidas:
  - `summon-customer` em quem está no banco ou no balanço (`validOutdoor` exige a posição fixa) precisa liberar o `outdoor` primeiro, como `transport` já faz;
  - quem chega sentado vai para `seat: null`;
  - quem segura um objeto o leva junto, com a mesma localização;
  - o prato que nasce (bancada, presente, carta) tem `x` dentro das margens de 60 px do cômodo e `y` no piso;
  - consumir um prato que está na mão libera a mão;
  - colheita, rega e chuva não tocam `Piece` de outra casa.

### Lote 1: fundação (nenhuma mudança visível)

| ID | Origem | O que fazer | Arquivos prováveis | Critério de aceitação | Esf. |
| --- | --- | --- | --- | --- | --- |
| W3-11 | gate-wave2 (recomendada), DIR-4 | Extrair de `scene.ts` a pintura de outdoor e a vida ambiente, e de `main.ts` o despacho de ações do bairro. | `presentation/scene.ts`, novo `presentation/scene-*.ts`, `bootstrap/main.ts`, novo `bootstrap/town-actions.ts` | `wc -l`: `scene.ts` ≤ 240 e `main.ts` ≤ 240. As capturas de referência ficam idênticas por diff de pixels. Nenhuma mudança em `domain/` e `persistence/`. | M |
| W3-12 | nova direção, DIR-1, DIR-8 | Envelope v3: chave, ordem de leitura, migração, `progress` completo (todos os campos de 4.2, inclusive `goals` e `revealed`), `Piece.plant` e a tolerância a enums desconhecidos (4.4). | `domain/progress.ts`, `domain/neighborhood-types.ts`, `domain/types.ts`, novo `persistence/neighborhood-v3.ts`, novo `persistence/progress-validation.ts`, `persistence/layout-validation.ts`, `persistence/room-validation.ts` (template), `persistence/neighborhood.ts` (modelo), `persistence/storage.ts`, `persistence/fixtures/` | Unitário:<br>• fixture rico da v2 migra igual (4.3);<br>• v3 faz round-trip;<br>• v3 com receita `"lasanha"`, cultura `"kiwi"`, peça `"robo"`, template `"castelo"` e modelo `"castelo"` carrega sem a receita, a cultura e a peça, com o template `empty` e o modelo `house`;<br>• v3 corrompido carrega a partir da v2 e deixa o texto em `:v3:recovery`;<br>• depois de carregar e salvar, a chave v2 é byte a byte igual;<br>• sem nenhuma chave, nasce o bairro inicial com `progress` inicial.<br>Mutação de 80% ou mais. | G |
| W3-13 | antigo W3-07 (parte de save), DIR-8 | Itens novos: `nextItem`, `prato` com `recipe` e `fancy`, os 6 adereços e `portableKinds`. Regex genérica, checagem própria de portátil e geladeira aceitando `prato`. `portable.ts` com `spawnItem` e `consumeItem`. | `domain/types.ts`, `domain/item-kind.ts`, `domain/objects.ts` (geladeira), `domain/neighborhood.ts` (`localWorld` e `migrateNeighborhood`), novo `domain/portable.ts`, `persistence/neighborhood.ts`, `persistence/validation.ts` | Unitário:<br>• `spawnItem` duas vezes cria `"7:prato"` e `"8:prato"` na mesma casa;<br>• `consumeItem` remove o item e libera a mão;<br>• save com prato de receita desconhecida carrega sem ele;<br>• fixture legado de casa única (`save.ts` versões 1 a 4) continua carregando;<br>• prato na geladeira é válido;<br>• microfone na geladeira continua inválido;<br>• duplicar uma casa com dois pratos e remover outra com um prato mantém os ids únicos e o save carrega (hoje `duplicateBuilding` não copia itens e `removeBuilding` os leva para a rua; o teste trava isso). | M |
| W3-14 | nova direção | Relógio injetado: `domain/clock.ts` (`dayIndex({y,m,d})`, `phaseAt(sessionMs, event)`, `eventOfDay(day)`), porta `bootstrap/clock.ts` e `tick` a cada 30 s e em `visibilitychange`. | novo `domain/clock.ts`, novo `bootstrap/clock.ts`, `bootstrap/main.ts` | Unitário:<br>• `phaseAt` nas bordas 0, 5, 10, 11,5, 14,5 e 16 min, e noite de 11,5 a 17,5 com o evento de estrelas;<br>• `dayIndex` de 31/12 e de 01/01 difere em 1;<br>• `eventOfDay` cobre os 10 restos.<br>E2E com relógio falso: avançar 30 s despacha um `tick` (contador de teste exposto só em modo de teste). | P |

### Lote 2: personalidade, a base dos gostos

| ID | Origem | O que fazer | Arquivos prováveis | Critério de aceitação | Esf. |
| --- | --- | --- | --- | --- | --- |
| W3-01 | HIS-1 (ajustado) | Personalidades: frase de até 4 palavras no cartão, prato favorito, cultura favorita, gesto (abraço ou toca-aqui), voz e presente (tabela 3.4). O favorito e o presente ficam no domínio (`domain/tastes.ts`) e as frases em `content/personalities.ts`. **A Bia é definida com a família.** | `content/personalities.ts`, novo `domain/tastes.ts`, `presentation/panel.ts`/`controls.ts` | Unitário: os 7 personagens têm favorito que é uma receita existente e presente único. Revisão de texto: zero masculino genérico e zero estereótipo. Captura da Turma a 768 com as 7 frases sem rolagem. | M |
| W3-02 | HIS-3 (ajustado) | Falas por evento e personagem, com 3 a 5 variações em rotação determinística, cobrindo também os eventos novos `cooked`, `ate`, `harvested`, `served`, `letter` e `hint`. | novo `content/lines.ts`, `content/feedback-text.ts`, `presentation/reactions.ts`, `domain/types.ts` (tipos de evento, efêmeros) | Unitário:<br>• a mesma ação 4 vezes dá 3 ou mais falas diferentes;<br>• com a Bia renomeada "Ana", todas as falas novas dizem "Ana";<br>• nenhuma fala passa de 6 palavras (teste que percorre o conteúdo). | M |

### Lote 3: cozinha

| ID | Origem | O que fazer | Arquivos prováveis | Critério de aceitação | Esf. |
| --- | --- | --- | --- | --- | --- |
| W3-15 | nova direção (a) | Domínio das receitas: tabela das 27, `cook(town, {building, cook, ingredients, utensil})` com as 4 saídas de 3.2, caprichado, mesa cheia, consumo só da horta, descoberta e `hint`. | novo `domain/recipes.ts`, `domain/neighborhood.ts` | Unitário:<br>• as 27 receitas cozinham a partir de uma despensa completa;<br>• não há dois pares conjunto+utensílio iguais;<br>• pão+queijo na panela devolve a dica "utensílio";<br>• em save novo, farinha+ovo no forno devolve o fantasma "queijo" (a candidata é R07, a não descoberta de menor número que contém o par);<br>• receita errada não muda `basket`;<br>• o look `chef` gera `fancy`;<br>• o 7º prato numa casa é recusado.<br>Mutação de 80% ou mais. | M |
| W3-16 | nova direção (a) | Bancada na cena: tigela de 3 lugares, despensa por ícone, 4 utensílios, animação de 1,2 s, prato nascendo junto da peça, utensílio que balança e ingrediente-fantasma. Variante reduzida. **Conflito com o `use` da onda 2:** em fogão, bancada e carrinho de cozinha, o toque passa a levar o personagem até a peça e abrir a bancada. O `active` e o efeito de vapor da onda 2 viram a animação de "cozinhando" da bancada. O spec `use-pieces` (carrinho e captura `use-everyday`) é atualizado no mesmo commit, com a asserção nova no lugar da antiga. | novo `presentation/kitchen-bench.ts`, novo `presentation/kitchen-art.ts`, `presentation/furniture-targets.ts`, `bootstrap/` (despacho), `public/art/kitchen.svg`, `public/icons/ing-*.svg` | E2E: tocar no fogão, arrastar farinha, ovo e leite e tocar na panela faz aparecer uma panqueca no chão, junto do fogão. E2E sem texto: o mesmo fluxo com o texto transparente. Com movimento reduzido, a captura não tem vapor nem quique. Nenhuma animação bloqueia o toque por mais de 300 ms. | G |
| W3-17 | nova direção (a), DIR-7 | Comer pratos: `eat` (humano come qualquer prato; gato só peixe, S1, R05 e R02), consumo do item, reação grande no favorito e "prefiro peixinho". | `domain/care.ts`, `domain/objects.ts`, `presentation/reactions.ts`, `presentation/controls.ts` | Unitário:<br>• Luna come pizza: o prato some e `fed` fica `true`;<br>• Mimi recusa pizza e o prato fica;<br>• Pipoca come ovo mexido (o favorito de cada gato é comível por gato).<br>E2E: soltar a pizza na Luna mostra a dança do favorito. | M |
| W3-18 | nova direção (a); revoga JOG-12 | Livro de receitas: ícone no cabeçalho e livro na bancada, páginas por utensílio, silhuetas, fita do caprichado, página de segredos, receitas reveladas por cartão. | novo `presentation/recipe-book.ts`, `public/art/book.svg`, `public/art/dishes.svg`, `index.html` | E2E:<br>• em save novo, a página do forno mostra o bolo colorido e o pão de queijo em silhueta;<br>• depois de cozinhar o pão de queijo, ele aparece colorido;<br>• a página de segredos não existe até o primeiro segredo.<br>Teste DOM: nenhum dígito no livro. | M |

### Lote 4: jardim

| ID | Origem | O que fazer | Arquivos prováveis | Critério de aceitação | Esf. |
| --- | --- | --- | --- | --- | --- |
| W3-19 | nova direção (a), revoga Futuro/JOG-6 | Domínio do jardim: `plant`, `water-plot`, `tick`, `harvest` e `rain`, com a tabela de durações de 3.3 e as regras de relógio. | novo `domain/garden.ts`, `domain/neighborhood.ts` | Unitário:<br>• alface regada avança em exatamente 2 min e não avança em 2 min − 1 ms;<br>• sem rega não avança em 30 dias;<br>• relógio para trás rebaseia sem avançar;<br>• colheita dá +2 com teto de 6;<br>• plantar semente que não tem não faz nada;<br>• chuva rega todos os canteiros com estágio abaixo de 4.<br>Mutação de 80% ou mais. | M |
| W3-20 | nova direção (a) | Horta da praça: 4 canteiros no lugar do canteiro decorativo, saco de sementes, 5 estágios desenhados, planta com sede (folhas caídas e gota), rega pelo regador da praça no canteiro mais próximo, colheita voando para a cesta e cesta na despensa da bancada. | `presentation/plaza-art.ts`, novo `presentation/plaza-garden.ts`, `presentation/plaza-obstacles.ts`, `presentation/outdoor-controls.ts`, `public/art/plants.svg` | E2E com relógio falso:<br>• plantar alface, regar e avançar 2 min mostra o broto;<br>• repetindo até o estágio 4, colher faz a alface aparecer na despensa da bancada.<br>Os 4 canteiros ficam no caminho (contornados). Captura a 390, 768, 1024 e 1280 sem cortar canteiro. Pixel do E2E do canteiro da onda 2 atualizado. | G |

### Lote 5: padaria

| ID | Origem | O que fazer | Arquivos prováveis | Critério de aceitação | Esf. |
| --- | --- | --- | --- | --- | --- |
| W3-21 | nova direção (b) | Padaria construível: modelo `bakery`, template `bakery`, peça `display-case` com sininho, fachada com vitrine e placa aberta/fechada, e cartão em Ampliar. | `domain/neighborhood-types.ts`, `domain/types.ts`, `domain/institution-plans.ts`, `domain/rooms.ts`, `content/buildings.ts`, `content/furnishings.ts`, `presentation/panoramic-facade.ts`, `public/art/bakery.svg` | Unitário: construir `bakery` cria salão e cozinha com vitrine e fogão. A tolerância de W3-12 vale: save com `bakery` lido por um build sem o modelo vira `house`. E2E: construir a padaria pelo seletor ilustrado. Silhueta distinta na galeria de fachadas com o texto oculto. | M |
| W3-22 | nova direção (b) | Domínio dos fregueses: `summon-customer` (rotação, exclusões e fila de 3), `orderFor` (sequência de 3.4, dois pratos e caprichado) e `serve` (certo, outro, favorito com presente e `favorites`). | novo `domain/orders.ts`, `domain/neighborhood.ts` | Unitário:<br>• chamar com a Bia selecionada traz a Luna;<br>• o 4º chamado com fila cheia não muda nada;<br>• `orderFor` com despensa sem chocolate nunca pede R21;<br>• `serve` do favorito da Luna adiciona `luna` a `favorites` e cria um estetoscópio no salão;<br>• repetir não cria um segundo;<br>• prato errado não consome nada.<br>Mutação de 80% ou mais. | M |
| W3-23 | nova direção (b) | Fregueses na cena: sininho, chegada andando, balão-desenho do pedido (silhueta mais ingredientes para receita não descoberta), entrega por arraste, "Hmm, quase!", sentar à mesa, jornal depois de 90 s, presente no balcão e parede de desenhos. Sem relógio visível. | novo `presentation/bakery-customers.ts`, `presentation/reactions.ts`, `presentation/play-gesture.ts`, `public/art/bakery.svg` | E2E:<br>• tocar no sininho traz a Luna com o balão da pizza; entregar a pizza faz a Luna comer e o estetoscópio aparecer;<br>• avançar 10 min de cena com um freguês esperando não muda a expressão para triste nem o tira da fila.<br>Teste sem texto: atender um freguês. | G |
| W3-03 | HIS-4 (ajustado) | Pedidos opcionais em casa: além de cuidado, pedem receita conhecida ou colheita ("Quero morango!", com ícone). As regras anti-pressão continuam: um por vez, some em 60 s ou ao trocar de lugar, não repete em seguida, nunca em Criar, na padaria ou durante brincadeira, e pode ser desligado via `storage.ts`. Atender o favorito dá a reação grande. | novo `domain/wishes.ts`, `content/wishes.ts`, `presentation/reactions.ts`, `persistence/storage.ts` | Unitário: `wishes` nunca pede receita desconhecida nem colheita de semente que ela não tem. E2E:<br>• nunca 2 pedidos na tela;<br>• com o interruptor desligado, nenhum pedido em 5 min de cena;<br>• ignorar um pedido não muda o save. | M |

### Lote 6: tempo, correio e eventos

| ID | Origem | O que fazer | Arquivos prováveis | Critério de aceitação | Esf. |
| --- | --- | --- | --- | --- | --- |
| W3-24 | nova direção (c), GFX-9 parcial | Dia e noite: ciclo de 16 min, véu só no fundo, janelas acesas conforme `home.lamp`, céu com lua e estrelas na rua, dormir que acelera a manhã. Variante reduzida. | novo `presentation/day-night.ts`, `presentation/sky.ts`, `presentation/street.ts`, `presentation/room.ts`, `bootstrap/clock.ts` | E2E com relógio falso: aos 12 min a cena está escura e o rosto da Bia mantém contraste AA medido na captura; deitar a Bia na cama à noite leva à manhã em até 3 s de cena. A captura reduzida não tem estrelas piscando. O save não muda com a fase. | M |
| W3-25 | nova direção (c), HIS-9 | Domínio do correio: `deliver-mail(day)` (1 por dia, inbox de no máximo 3, L01 imediata) e `open-letter` (aplica o anexo: semente, especial, cartão em `revealed`, adereço com `spawnItem`). | novo `domain/post.ts`, `domain/neighborhood.ts` | Unitário:<br>• duas entregas no mesmo `day` dão uma carta;<br>• 5 dias sem abrir deixam 3 na inbox;<br>• abrir L03 adiciona `morango` a `seeds`;<br>• abrir L01 cria `colher` e `milho`;<br>• abrir de novo não duplica;<br>• depois de L12 vêm os bilhetes em ciclo.<br>Mutação de 80% ou mais. | M |
| W3-04 | HIS-9, JOG-8 (ajustado) | Correio e campainha na cena: bandeirinha da caixa da "Minha casa", cartão ilustrado (22 px ou mais, até 6 palavras, retrato), pacote que se abre com o anexo voando ao destino. A campainha mostra quem está dentro na porta, com a fala dela. | `presentation/outdoor-effects.ts`, novo `presentation/letter-card.ts`, `content/letters.ts`, `public/art/mail.svg` | E2E:<br>• na primeira abertura após a migração, a bandeirinha está erguida; abrir mostra a L01, e a colher de pau aparece na porta;<br>• campainha de casa com o Léo dentro mostra o Léo com "Já vou!".<br>Captura do cartão a 390. | M |
| W3-26 | nova direção (c), HIS-12 | Eventos I: chuva (rega, poças em que se pula, guarda-chuva), dia do carteiro (+1 carta) e noite de estrelas (estrela cadente que mostra uma receita). | novo `presentation/town-events.ts`, `domain/garden.ts` (`rain`), `domain/post.ts`, `public/art/events.svg` | E2E com a data falsa num dia de resto 1: os canteiros plantados aparecem regados na abertura. No resto 6 chegam 2 cartas. No resto 9, à noite, tocar na estrela mostra os ícones de uma receita não descoberta. Dia calmo não tem nenhum desses elementos. | M |
| W3-27 | nova direção (c), HIS-12 | Eventos II: feira (troca prato → cultura, `barter`), aniversário (chapéu, pedido de bolo e festa como desfecho) e piquenique (toalha onde os pratos são comidos). | `presentation/town-events.ts`, `domain/orders.ts` (`barter`), `presentation/child-game-art.ts` (confete reaproveitado), `public/art/events.svg` | Unitário: `barter` dá primeiro a semente que falta e depois a cultura com menos unidades; nunca pede nada de volta além do prato entregue. E2E:<br>• resto 3: soltar uma torrada na barraca põe 2 culturas na despensa;<br>• resto 4: entregar um bolo ao aniversariante mostra confete e a turma presente com braços para cima.<br>Variante reduzida sem confete. | G |

### Lote 7: adereços, horta em casa e gestos

| ID | Origem | O que fazer | Arquivos prováveis | Critério de aceitação | Esf. |
| --- | --- | --- | --- | --- | --- |
| W3-07 | JOG-2 (ajustado; save em W3-13) | Uso dos 6 adereços:<br>• colher de pau na mão faz o prato sair caprichado;<br>• regador de mão rega canteiro e horta em caixa;<br>• lanterna à noite revela segredos;<br>• cesta colhe todas as plantas prontas do lugar;<br>• estetoscópio solto num personagem faz "Ahhh";<br>• curativo põe um curativo desenhado efêmero. | `presentation/item-pickup.ts`, `presentation/play-gesture.ts`, `presentation/reactions.ts`, `domain/recipes.ts`, `domain/garden.ts`, `public/icons/prop-*.svg` | Unitário: `cook` com a colher na mão do cozinheiro gera `fancy`. E2E:<br>• soltar o estetoscópio na Luna mostra "Ahhh";<br>• com a cesta na mão, tocar num canteiro pronto colhe todos os prontos da praça. | M |
| W3-28 | nova direção (a) | Horta em casa: `planter` vira canteiro (`Piece.plant`), com rega pelo regador de mão ou pela chuva. O template `garden` ganha uma `planter` em cômodos novos. **Conflito com o `use` da onda 2:** com a `planter` vazia, o toque abre o saco de sementes; com planta, o broto balança (efeito da onda 2) e, se pronta, colhe. O spec `use-pieces` da horta é atualizado no mesmo commit. | `domain/garden.ts`, `domain/rooms.ts`, `presentation/furniture-art.ts`, `presentation/use-effects.ts` | Unitário:<br>• plantar numa `planter`, duplicar a casa e desfazer preserva a planta;<br>• remover a peça remove a planta;<br>• save com `plant` em `sofa` carrega sem o campo.<br>E2E: plantar tomate na horta em caixa da cozinha. | M |
| W3-08 | JOG-3 (ajustado) | Gestos sociais: soltar um personagem sobre outro faz abraço ou toca-aqui, conforme a personalidade. **Com um prato na mão, eles dividem:** os dois comem e o prato some. Efêmero, sem menu. | `presentation/play-gesture.ts`, `presentation/pose.ts`, `presentation/reactions.ts`, `domain/care.ts` (`eat` duplo) | E2E: soltar a Bia sobre o Léo faz os dois se abraçarem e o save registra só posições. Com a Bia segurando um bolo, os dois comem e o bolo some. | M |
| W3-05 | HIS-11 (ajustado) | Segredos efêmeros, agora também noturnos:<br>• estrelas no teto ao apagar a luz;<br>• gato espiando da gaveta;<br>• à noite com lanterna: olhos de gato no guarda-roupa e ursinho debaixo da cama;<br>• passarinho na árvore de manhã.<br>Continuam sem registro nesta onda. O álbum é W4-13. | novo `content/secrets.ts`, novo `presentation/secrets.ts` | E2E: à noite, a Bia com a lanterna diante do guarda-roupa mostra os olhos de gato e a fala da Bia. Apagar a luz do quarto com o Nino presente mostra as estrelas. O save não muda. | M |

### Lote 8: refinamento restante

| ID | Origem | O que fazer | Arquivos prováveis | Critério de aceitação | Esf. |
| --- | --- | --- | --- | --- | --- |
| W3-06 | HIS-5 (ajustado) | Convites nas instituições, uma vez por sessão, ligados aos sistemas:<br>• consultório: paciente com curativo pedido;<br>• achados e perdidos: objeto que volta ao dono;<br>• escola: "receita do dia" no quadro, desenhada;<br>• lanchonete do estádio: abre a bancada. | novo `content/institution-stories.ts`, `presentation/institution-art.ts` | E2E: entrar no consultório mostra o convite uma vez por sessão. Soltar o curativo no paciente encerra o convite com festa. `grep -ri "cela\|algema\|prisão" src/content` vazio. | M |
| W3-09 | JOG-9, JOG-10 (ajustado) | Variações das brincadeiras: pedrinha na amarelinha, 3 ritmos ilustrados na corda e parlenda em domínio público. Parlenda completa termina em festa, com um desfecho de verdade. Efêmero. | `domain/child-games.ts`, `presentation/game-controls.ts`, `presentation/child-game-art.ts` | Unitário: a pedrinha na casa 4 faz pular a 4; os 3 ritmos têm períodos distintos. E2E: a parlenda até o fim mostra a festa. O save não muda. | M |
| W3-10 | HIS-13 (ajustado) | Ideias viram metas: 12 cartões ilustrados com desfecho e adesivo, um por vez, também na bandeja de Criar, com "Outra ideia". Predicados puros sobre o bairro e `progress`; cumpridas vão para `progress.goals`. As 12 metas:<br>1. Fazer panqueca.<br>2. Colher uma alface.<br>3. Construir uma padaria.<br>4. Servir o favorito de alguém.<br>5. Descobrir uma receita de forno.<br>6. Montar um quarto novo.<br>7. Três canteiros plantados ao mesmo tempo.<br>8. Levar um prato à praça.<br>9. Ler uma carta.<br>10. Fazer um prato caprichado.<br>11. Fazer bolo de chocolate.<br>12. Café com gatos: cozinha com caminha de gato e um gato servido. | novo `domain/goals.ts`, `content/projects.ts`, `presentation/editor-controls.ts`, `presentation/shell.ts`, `public/art/goals.svg` | Unitário: cada predicado tem um caso verdadeiro e um falso. E2E: com o cartão "Fazer panqueca" visível, cozinhar uma panqueca põe o adesivo e mostra uma festa curta. Teste DOM: nenhum dígito nem total nos cartões. Recarregar mantém o adesivo. | M |

**Totais:** 28 itens em 8 lotes, sendo 10 antigos ajustados e 18 novos. Esforço: 1 P, 22 M e 5 G.

---

## 6. Arte nova (SVG)

**Onde fica e qual orçamento consome:**
- A arte nova da cena vai em `public/art/*.svg`, carregada sob demanda e recortada por id com `svgFragment`. Os ícones vão em `public/icons/`.
- **Nada novo entra por `?raw`.** O `?raw` vai para o bundle JS e consome o orçamento de 1 MB gzip, não o de 5 MB.
- **Folga medida no `dist/` de 10:45:** JS com 418 KB gzip de 1 MB; outros assets com 108 KB de 5 MB. A medição precisa ser refeita em W3-11.
- **Teto da onda:** +400 KB em assets e +60 KB de JS gzip.
- O aviso `buildGrowthPercent` (10%) compara só o JS gzip com a baseline de `main` (`scripts/quality.mjs`). Cada lote fica abaixo de +40 KB de JS gzip para não disparar o aviso. Os assets não entram nessa conta.

**Estilo:** segue o guia de 2026-11-specialists §3.
- Contorno de 1,5 px `#786c62` e sombra chapada embaixo à direita, sem gradiente.
- Acentos saturados (coral, sol, folha, turquesa) só no que é tocável. Fundo da bancada e do livro neutro.
- **Cada prato tem silhueta inconfundível:** bolo é cilindro, torta é fatia, sopa é tigela com vapor, suco é copo, sanduíche são camadas. A silhueta no livro é a própria dica.
- Silhueta é o mesmo path com preenchimento `#d9d0c7`, gerada em código, sem arquivo extra.
- Legível a 40 px.
- Nada de glifo Unicode.

| Grupo | Peças | Arquivo | KB estimados |
| --- | --- | --- | --- |
| Ingredientes | 15 novos (peixe reaproveita `peixe.svg`) | `public/icons/ing-*.svg` | 9 |
| Utensílios | 4 (tábua, panela, forno, liquidificador) | `public/icons/ut-*.svg` | 3 |
| Pratos | 27 + guarnição de caprichado | `public/art/dishes.svg` | 34 |
| Plantas | 3 estágios genéricos + 6 culturas × (flor, pronto) + gota de sede | `public/art/plants.svg` | 16 |
| Horta da praça | 4 canteiros de madeira + placa | `public/art/plants.svg` | 3 |
| Bancada | tigela grande, vapor, utensílios em tamanho de cena | `public/art/kitchen.svg` | 8 |
| Livro | capa, página dupla, fita, página de segredos | `public/art/book.svg` | 5 |
| Padaria | fachada (vitrine, toldo, placa de pão), vitrine com sininho, placa aberta/fechada, balão de pedido, toldo listrado, 7 desenhos de agradecimento | `public/art/bakery.svg` | 22 |
| Correio | envelope fechado/aberto, pacote, selo, bandeirinha, 12 ilustrações de carta | `public/art/mail.svg` | 28 |
| Adereços | 6 | `public/icons/prop-*.svg` | 6 |
| Dia e noite | lua, estrelas, janela acesa, estrela cadente | `public/art/events.svg` | 3 |
| Eventos | gota, poça, guarda-chuva; barraca e avental/chapéu do feirante; balões, chapéu de festa, bandeirola; toalha de piquenique | `public/art/events.svg` | 18 |
| Metas | 12 cartões + adesivo | `public/art/goals.svg` | 25 |
| Ícones de UI | livro, cesta, saco de sementes, regar, dormir, carta, aberto/fechado, meta | `public/icons/ui-*.svg` | 5 |
| **Total** | **149 peças** (33 arquivos de ícone + 8 folhas de arte) | | **≈ 185 KB** |

O feirante e os vizinhos de evento reaproveitam `human.svg` com acessório por cima, sem personagem novo. Os sons são WebAudio, sem assets.

---

## 7. Onda 4 revista

- **W4-01** Paleta viva e fim dos gradientes falsos (GFX-5, GFX-11).
- **W4-02** Rua vestida: meio-fio, faixa, poste, hidrante e céu em planos (GFX-1).
- **W4-03** Spike de fachadas institucionais com galeria comparativa (GFX-6, DIR-5).
- **W4-04** Cor da fachada só na parede (GFX-13).
- **W4-05** Polimento da noite e feixe de sol por janela, sobre o ciclo de W3-24 (GFX-9).
- **W4-06** Show dirigível com passos, notas e plateia (JOG-14).
- **W4-07** Inércia e borda elástica de câmera (FIS-12).
- **W4-08** CSS em `@layer` sem `!important` (UX-15).
- **W4-09** Motor de histórias: capítulos com pistas como estado salvo (`progress.stories`), desfecho e cena final.
- **W4-10** Mistério "Quem sumiu com o bolo?": migalhas e pegadas levam à Pipoca, que escondeu o bolo para uma festa surpresa.
- **W4-11** Mistério "A carta sem remetente": a caligrafia e o selo levam a um vizinho tímido.
- **W4-12** Mistério "Cadê o regador?": pistas na horta e na chuva.
- **W4-13** Álbum: receitas, plantas, segredos (passam a ser registrados), fregueses e cartas, como figurinhas sem total.
- **W4-14** Desbloqueios: móveis e looks ganhos por metas e pelo álbum, sem moeda.
- **W4-15** Criador de personagem: novo morador com pele, cabelo e roupa. Exige uma turma de tamanho variável no save.
- **W4-16** Paredes e pisos pintáveis com pincel, padrões e adesivos.
- **W4-17** Modo foto e tirinha de 3 quadros com balões, salva localmente como imagem.
- **W4-18** Segundo lote de adereços e mais um lugar com mecânica (floricultura ou consultório com atendimento).

---

## 8. Riscos, fora de escopo e perguntas para a criança

### Riscos

1. **Escopo.** São 28 itens, com 5 G. Isso é pelo menos 2 vezes a onda 2. **Corte mínimo, se for preciso:** lote 1, W3-01, lotes 3 e 4, W3-21, W3-22, W3-23 e W3-24. Com isso já há combinação, lugar e tempo, com as dependências fechadas. O resto espera.
2. **Save.** É o maior risco técnico. A tolerância a enums desconhecidos (W3-12) mexe na validação que hoje é lista branca rígida. Se ela vier incompleta, um rollback dentro do v3 rejeita o bairro. A rede de segurança é a v2 intacta, mas o progresso feito desde a migração se perde. Um teste de "build anterior lê save do build novo" é obrigatório a cada lote que acrescenta conteúdo.
3. **Relógio real.** Mudar a data do tablet acelera um estágio só; voltar não faz mal. Fuso e horário de verão afetam `dayIndex` em no máximo um dia. Se a criança abrir o jogo duas vezes no mesmo dia, nada se repete.
4. **Leitura.** O livro e o pedido dependem de reconhecer ícones de ingredientes. Se a Bia não distinguir farinha de açúcar, a cozinha vira tentativa e erro chata. Mitigação: formas distintas, com saco de farinha e torrões de açúcar, e o teste de silhueta com texto oculto no gate.
5. **Bagunça.** Pratos espalhados viram lixo visual. O teto é de 6 por casa, e comer, dividir, piquenique e feira escoam os pratos. Pode ser preciso um "prato vai para a geladeira" automático. Observar antes.
6. **Movimentação da turma.** O freguês é chamado pela criança, mas ela pode estranhar que a Luna "saiu" da casa onde estava. Observar.
7. **Limites de arquivo.** `scene.ts` e `main.ts` estão no teto. Sem W3-11, o lote 3 quebra o gate.
8. **Desempenho.** Noite com véu, chuva com partículas e fila de 3 fregueses somam custo. A medição de FPS em tablet real da onda 2 ainda não foi feita e continua obrigatória.
9. **Pressão disfarçada.** Silhuetas no livro podem virar a lista que a criança sente que precisa completar. O pilar 5 permite coleção, mas se a Bia demonstrar ansiedade ("ainda falta"), as silhuetas viram dica opcional, só ao tocar.

### Fica fora desta onda

- Moeda, preço, loja de compra, nível e qualquer número visível.
- Plantas que murcham, fome que piora, freguês que vai embora bravo e sequência de dias.
- Notificação do sistema, som de alerta fora do jogo e qualquer texto do tipo "volte amanhã".
- Receitas com 4 ou mais ingredientes, quantidades por ingrediente (2 ovos) e tempo de forno.
- Assentos por peça, gato no colo e mãos dadas, que exigem estado persistido novo (JOG-3, JOG-5).
- Batedores de corda e fila da amarelinha (JOG-4).
- Template "firehouse" e regra de gato no sofá (HIS-5, HIS-2).
- Heróis originais no lugar dos looks licenciados, que só serão feitos antes de uma distribuição pública (GFX-14, DIR-2).
- Multijogador, nuvem e sincronização entre aparelhos.

### Perguntas para validar observando a Bia (sessão de 20 min, sem instrução verbal)

Fazer a sessão depois do lote 4 (cozinha e jardim) e repetir depois do lote 6.

1. Ela abre a bancada sozinha? Quanto tempo leva até o primeiro prato?
2. Diante da dica "ingrediente-fantasma", ela entende e completa, ou ignora?
3. Ela volta ao livro para caçar silhuetas por conta própria? Com prazer ou com cara de tarefa?
4. Ela tenta combinações que não existem (a "receita inventada")? Se tenta muito, vale criar a "gororoba" como prato engraçado.
5. Ela lembra da horta na sessão seguinte e vai direto à praça? Fica frustrada com a abóbora de 8 h?
6. Na padaria, ela entrega pelo arraste sem ajuda? O "Hmm, quase!" a diverte ou a incomoda?
7. Ela percebe a noite? Procura coisas com a lanterna?
8. Quanto tempo dura a sessão espontânea? A meta é mais de 20 min sem queda visível de interesse.
9. O que ela pede que não existe? Esse é o melhor insumo para a onda 4.
10. A personalidade e o prato favorito da personagem Bia soam como ela? Validar com a família antes de W3-01 fechar.
