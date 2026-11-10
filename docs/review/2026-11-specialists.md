# Revisão de direção: Mundo da Bia (novembro de 2026)

**Escopo:** consolida e julga os relatórios de cinco especialistas (Jogabilidade, UX, Gráficos, Física/sensação, História) sobre o estado atual do repositório. Fiz uma verificação própria por amostragem no código e nas capturas de `reports/`.
**Restrições de produto respeitadas:** a narrativa é leve e opcional. O sandbox continua livre, sem pontos, moedas, níveis ou punição. Mantêm-se as camadas `domain/content/persistence/presentation/bootstrap` e o save no envelope v2.
**Limite desta revisão:** não executei o jogo. Todas as avaliações vêm de leitura de código e de capturas estáticas (ver "Riscos e o que não foi verificado").

---

## 1. Veredito geral

O motor é melhor que o jogo. Há pathfinding, arraste com prévia e cancelamento, portas, construção modular, desfazer, testes de mutação e acessibilidade por teclado: a engenharia é de produto sério. A experiência da criança, porém, ainda é de protótipo para adultos leitores.

Quase todo retorno é uma linha de texto cinza de 10 a 12 px no rodapé (`dock-layout.css:24,32`, `main.ts:236-243`). O som começa desligado (`sound.ts:5`). Tocar num personagem só o seleciona (`play-gesture.ts:27-31`, `reactions.ts:6`). A turma não tem voz e os gatos parecem adesivos. A rua é um diagrama cinza. Uma criança de 7 anos que abrir o jogo hoje toca em alguém, não vê nada acontecer e conclui que "não faz nada". Esse é o problema número 1 e é inaceitável num jogo de casinha.

| Área | Nota | Justificativa |
| --- | --- | --- |
| Jogabilidade | **4/10** | A manipulação direta é robusta, mas o loop é raso. O toque é morto, só existem 4 objetos mais a bola, a maioria dos móveis é inerte, o cuidado não tem ciclo e não há ação social. Corda e amarelinha funcionam, porém são solitárias e terminam só com texto. |
| UX para crianças | **4/10** | Os alvos de toque são bons (44–48 px) e as escolhas principais já são ilustradas. Mas o retorno chega por texto longe do dedo, o painel é uma parede de botões de texto que mudam de lugar, há cinco verbos para "levar" e vocabulário de engenharia ("módulo", "estrutura", "Sair do equipamento"). |
| Gráficos | **5/10** | O traço é coerente e a turma é diversa e simpática; essa é a melhor qualidade do jogo. Pesam contra a paleta lavada (bege sobre bege), a rua morta, as fachadas clonadas, os rostos minúsculos com duas expressões e a câmera desperdiçando tela. |
| Física e sensação | **4/10** | A caminhada acelera e freia bem. Fora isso, nada tem peso: a criança arrastada "anda no ar", o balanço oscila ±4,6°, a bola é um ícone parado e as personagens entram nos brinquedos e nas portas por corte. |
| História e narrativa | **2/10** | Praticamente não existe. Sete personagens são só nome, pele e cabelo (`catalog.ts:2-10`). Há três interjeições para todos e o texto tem voz de manual e masculino genérico. A nota não pune a decisão de narrativa leve: leve não significa ausente. |
| **Geral** | **4/10** | A base sustenta um jogo excelente, mas hoje não passaria no meu gate de "uma criança de 7 anos se diverte sozinha nos primeiros 2 minutos". |

Também registro uma nota fora das áreas pedidas. A **fundação técnica** merece 8/10, mas tem dois riscos graves que os especialistas não viram: o save pode ser sobrescrito em silêncio (DIR-1) e `main.ts` está a 3 linhas do limite de arquivo da política (DIR-4).

---

## 2. Visão e pilares de qualidade

**Visão:** uma casa de bonecas viva no tablet. Cada toque da criança é respondido por personagens com personalidade, e o mundo convida a inventar histórias sem nunca cobrar nada dela.

1. **Todo toque responde, perto do dedo.** Em até 150 ms deve haver movimento, som ou fala no próprio objeto ou personagem. Nenhum toque fica sem retorno visível na cena, e nenhuma recusa é punitiva (nada de "×" vermelho nem "ocupado" seco).
2. **Mostrar antes de escrever.** Primeiro vêm ícone, gesto e cena; o texto é reforço de no máximo 6 palavras. O jogo deve ser jogável por quem não lê o painel.
3. **Personagens vivos com personalidade.** Eles respiram, olham, reagem e têm gostos. Os gatos se comportam como gatos.
4. **Mundo de brinquedo legível.** O fundo é calmo e o que é tocável tem cor viva. Coisas têm peso: caem, quicam e pendulam.
5. **Liberdade sem pressão.** Convites são opcionais e somem sozinhos. Não existem contadores, listas de pendências, "x de y", "volte amanhã" nem nenhuma forma de nota.
6. **A obra da criança nunca se perde.** Nenhuma ação, bug ou atualização apaga a casa dela. Tudo o que é destrutivo pode ser desfeito ou exige um gesto de adulto.

---

## 3. Guia de estilo curto

**Paleta.** Toda cor sai de tokens definidos em `src/presentation/palette.ts`, espelhados no `:root` do CSS. Fora deles não há hex solto.
- Neutros de estrutura (parede, chão, painel): saturação de 0,10 a 0,20, luminosidade alta. O painel fica um tom mais escuro que a cena e os cartões ficam brancos, para separar figura e fundo.
- Acentos tocáveis: saturação de 0,45 a 0,65. Ponto de partida, a validar com contraste: coral `#E8735A`, sol `#F2B630`, turquesa `#2BA8A0`, folha `#6DAE4F`, cobalto `#3F6FC4`, lilás `#9B7BD0`.
- Céu em degradê com saturação de 0,25 a 0,35 (ex.: `#BFE3F0` → `#EAF6F1`). Asfalto mais quente e azulado, nunca o cinza neutro `#9eaeb0` usado hoje.
- Regra: o fundo é neutro e o objeto interativo é saturado. Cada cômodo pode ter no máximo duas peças da mesma família de cor (hoje o sálvia domina cerca de 9 peças em `catalog-all.png`).

**Linha.** Contorno único de 1,5 px na escala do mundo, `#786c62` em objetos e `#715e58` em personagens, com cantos arredondados. Não se varia a espessura por escala. Gradiente só para vidro e céu. Os gradientes "material" de 3 paradas iguais em `human.svg`/`cat.svg` são código morto e não servem de referência.

**Sombra.** Sombra de contato elíptica com alpha de 0,18 a 0,22 e núcleo menor mais escuro (hoje é 0,08 em `art.ts:10`). O volume é uma única sombra chapada do lado direito e embaixo, sem degradê. Na UI, um único nível de sombra.

**Tipografia.**
- Fonte arredondada com bons acentos em PT-BR, hospedada localmente (Nunito ou Baloo 2, licença OFL), nos pesos 600 e 800, dentro do orçamento de assets.
- Todo `scene.add.text` usa estilos nomeados de `text-style.ts`; nunca o Courier padrão do Phaser.
- Tamanhos mínimos: rótulo de botão 16 px, balão de fala 22 px, placa no mundo 16 px na escala do mundo, número da amarelinha 22 px.
- Glifos Unicode (♥ ♨ ♫ ♧ ϟ ◇ S) não servem de ícone. Ícones são SVG próprios.

**Movimento.**
- Entradas de 120 a 300 ms com ease-out e assentamento com Back.Out.
- Squash e stretch de no máximo 10%.
- Loops ociosos com intervalo aleatório de 3 a 10 s e fase diferente por personagem.
- Nenhuma animação bloqueia input por mais de 300 ms.
- Com movimento reduzido: fades de opacidade de 120 ms no lugar de cortes e de deslocamentos, sem partículas, quiques, pêndulos nem balões que sobem. A política fica centralizada em `motion.ts` (FIS-13).

**Tom de voz das falas.**
- Até 6 palavras, vocabulário de 7 anos e alegria concreta. Ex.: "Hummm, que delícia!", "Lugar novo! O que tem aqui?".
- Sem imperativo de tarefa ("Escolha…", "Solte…") e sem voz de manual ("Objeto solto.", "Hora de cuidar.").
- Sem masculino genérico. Usar formas neutras com o nome: "{nome} está de barriga cheia". Não usar "Pronto para brincar" nem "Obrigada!" na boca de qualquer um. Toda fala interpola o nome atual, porque a criança pode renomear.
- Gatos falam por onomatopeia com legenda divertida: "Miau? (tradução: tem peixinho?)".
- Nunca "erro", "errado" ou "ocupado" sem dizer quem. Quando algo não dá, a fala oferece alternativa e não culpa.
- Faz de conta de ajuda, nunca de punição: delegacia vira "Achados e perdidos", sem cela nem prisão.

---

## 4. Achados dos especialistas: decisão

Verifiquei por conta própria, no código e nas capturas, os seguintes achados: JOG-1, JOG-5, JOG-6, UX-1, UX-2, UX-3/HIS-10, UX-9, GFX-2, GFX-6, GFX-7, GFX-8, GFX-14, FIS-2, FIS-3, FIS-5, FIS-10 e HIS-8. Os demais foram avaliados pela coerência da evidência citada.

### 4.1 Aceitos (inclusive parcialmente ou com correção)

A severidade e o esforço são os meus e podem divergir do especialista. Esforço: P (até 1 dia), M (2 a 4 dias), G (1 semana ou mais).

| ID | Título | Severidade | Esforço | Onda | Observação da direção |
| --- | --- | --- | --- | --- | --- |
| JOG-1 | Toque no personagem gera reação | crítica | M | 1 | **Correção:** a reação fica só na apresentação. Despachar `poke` por `dispatch` (`main.ts:226-233`) cancelaria a brincadeira e a caminhada e persistiria o save a cada toque. Absorve o "carinho" de HIS-2. |
| UX-1 | Retorno na cena, som ligado e com timbres | crítica | M | 1 | Absorve JOG-11 (som e remoção de "Novo lugar para brincar!"). Confirmado: `sound.ts:5` (`enabled=false`) e um oscilador único. |
| UX-2 | Painel de ações fixo, com ícones e sem reflow | crítica | M | 1 | Absorve HIS-7 (status no masculino e contraditório). Confirmado: `controls.ts:67` usa `b.hidden = b.disabled`. |
| UX-3 | Ações da praça como hotspots e "ocupado" correto | alta | M | 1 | Absorve HIS-10 e o item 3 de JOG-8. Confirmado: `outdoor-controls.ts:10-11` não compara com o personagem selecionado. |
| UX-4 | Um verbo para levar e Mapa que leva junto | alta | M | 1 | **Decisão do proprietário:** inverte um comportamento descrito no README ("Visitar muda a vista"). Recomendo: em Brincar, o Mapa leva o personagem selecionado; em Criar, só muda a vista. |
| UX-5 | Primeiro toque sem parágrafo | alta | M | 1 | **Correção:** a flag de primeira execução passa pela porta de `storage.ts` (só ela acessa `localStorage`, pela regra de camadas), em chave própria fora do save. Absorve o convite inicial de JOG-7. |
| UX-6 | Ícones únicos e sem glifos | alta | M | 1 | O orçamento de assets da política deve cobrir os SVG novos. |
| UX-7 | Cabeçalho com um significado por posição | média | M | 1 | Parcial: ícone e cor por modo e interruptor Brincar/Criar. "Ampliar" vira aba de Criar. |
| UX-8 | Mapa só para ir a lugares | alta | M | 1 | Administração (ampliar, mover, excluir) vai para Organizar. |
| UX-10 | Turma sem a fileira "✎ Nome" | média | P | 1 | — |
| UX-11 | Vocabulário infantil na construção | média | M | 1 | Inclui renomear "Investigar" (de HIS-5). |
| UX-12 | Brincadeiras sem "escolhe e é recusado" | média | M | 1 | Parcial: resolver as condições sozinho e usar cartões ilustrados. O cue vai para a cena na onda 2. |
| UX-13 | Terreno livre tocável no modo brincar | média | P | 1 | — |
| UX-14 | Peça indisponível explicada e Desfazer visível | média | P | 1 | — |
| GFX-1 | Rua e praça vivas | alta | G | 2 (céu) / 4 (rua) | Dividido: nuvens e copas em movimento na onda 2; vestir a rua na onda 4. |
| GFX-2 | Personagens maiores na rua | alta | M | 1 (escala) / 2 (balanço) | Confirmado em `plaza-swing.png`: a Bia tem cerca de 60 px. A amplitude do balanço vai com FIS-7. |
| GFX-3 | Expressões faciais | alta | M | 2 | — |
| GFX-5 | Paleta viva com tokens | alta | M | 1 (tokens) / 4 (cores) | Os tokens são pré-requisito do redesenho do dock. |
| GFX-6 | Fachadas próprias para instituições | média | M | 4 | Confirmado: `institutionFacade` não é chamado e `facadeSvg` usa só `panoramicFacade` (`architecture-art.ts:21-24`). **Rebaixado para spike:** ninguém renderizou `civic-facades.ts`. Critério: galeria comparativa antes de adotar. |
| GFX-7 | Enquadramento interior sem faixa vazia | média | M | 1 | Confirmado: faixa vazia acima do teto em `compare-after-768.png` e `visual-room-ward-1024.png`, com a cama cortada. |
| GFX-8 | Retratos da Turma com o look atual | média | P | 1 | Confirmado em `portrait.ts:9-10` e `ui-dock-768.png`. |
| GFX-9 | Sombras, noite e sol | média | M | 2 (sombras) / 4 (noite e sol) | As sombras se fundem com FIS-9. |
| GFX-10 | Contraste de amarelinha e corda | média | P | 1 | É clareza, não polimento: a criança precisa ver a casa iluminada. |
| GFX-12 | Fonte própria e estilos de texto | média | M | 1 | Fonte local e `document.fonts.ready`, dentro do orçamento. |
| GFX-13 | Cor só na parede da fachada | baixa | P | 4 | — |
| FIS-1 | Peso ao arrastar e soltar | alta | M | 2 | — |
| FIS-2 | Faixa de piso por contexto | alta | P | 1 | Confirmado: `geometry.ts:6` aceita y≥280, mas o piso é pintado a partir de 390 (`room.ts:17`). O domínio não muda. |
| FIS-3 | Sem "×" vermelho ao tocar perto de móvel | alta | P | 1 | Confirmado em `walking.ts:22`. O "×" viola o pilar de não punir. |
| FIS-4 | Bola cinemática | alta | M | 2 | Absorve JOG-13. O chute é o arremesso pelo arraste, sem seletor extra. |
| FIS-5 | Móvel sob o dedo e encaixe ao soltar | alta | M | 1 | Confirmado: `design.ts:22` devolve o mesmo estado e o móvel volta à origem no meio do gesto. |
| FIS-6 | Andar com cadência e escala | média | M | 2 | Parcial. **Rejeito o espelhamento `scaleX=-1`** até haver revisão de arte, porque cabelo, presilha da Bia e máscaras são assimétricos. |
| FIS-7 | Balanço como pêndulo | média | M | 2 | — |
| FIS-10 | Portas contínuas | média | M | 2 | Confirmado: chegada em (160,520) em `neighborhood-doors.ts:12`. `walkToDoor` e `slideRoom` não são usados. |
| FIS-11 | Obstáculos e subida na praça | média | M | 2 | — |
| FIS-13 | Política única de movimento reduzido | média | P | 1 | É pré-requisito de toda a onda 2. |
| JOG-2 | Adereços de profissão | alta | G | 3 | **Correção:** não é apenas "aditivo". O id do item é validado por regex fixa (`persistence/neighborhood.ts:43`, `/^[1-9]\d*:(lanche\|peixe\|microfone\|ursinho\|bola)$/`). Um rollback rejeitaria o save e, por DIR-1, o apagaria. Primeiro lote: 6 adereços. |
| JOG-3 | Gestos sociais entre personagens | média | M | 3 | Parcial: soltar um personagem sobre outro faz abraço ou toca-aqui, efêmero e sem menu radial. Carregar o gato e andar de mãos dadas exigem estado persistido e ficam no backlog futuro. |
| JOG-4 | Corda e amarelinha não acabam ao tocar outro personagem | média | P | 2 | **Rebaixado.** Fica: tocar num espectador não cancela, e ele torce. Os batedores de corda (G) vão para o futuro. |
| JOG-5 | Móveis inertes ganham uso | alta | G | 2 | Parcial e reestimado para G (domínio sob mutação): pia, lavadora, horta, estante, mesa de piquenique e carrinho entram em `use`. A refatoração de `SeatId` (exige migração) vai para o futuro. |
| JOG-6 | Ciclo de cuidado suave | média | P | 2 | Parcial: `fed` volta a `false` ao acordar, sem campo novo, e o ♥ deixa de ser permanente. O crescimento das plantas (exige migração) vai para o futuro. |
| JOG-7 | Mundo parado nos primeiros minutos | alta | M | 1 (posições) / 2 (vida) | Absorve GFX-4, a parte ociosa de FIS-8 e a ida do gato à peça favorita de HIS-2. |
| JOG-9 | Amarelinha com pedrinha e celebração | média | M | 2 (celebração) / 3 (pedrinha) | — |
| JOG-10 | Corda com cue na cena, tempo e parlenda | média | M | 2 (cue e erro) / 3 (tempo e parlenda) | Absorve DIR-6. |
| JOG-14 | Show dirigível | baixa | M | 4 | Parcial: plateia e passos ao tocar. |
| HIS-1 | Personalidades | alta | M | 3 | Os traços da Bia são definidos com a família. Sem estereótipo de gênero. |
| HIS-3 | Falas por evento e por personagem | alta | M | 3 | Absorve JOG-11 (falas). O payload `kind` no evento `furniture` não é persistido. |
| HIS-4 | Pedidos opcionais | alta | M | 3 | Regras anti-pressão obrigatórias. Corrigir "Obrigada" para forma neutra. |
| HIS-5 | Convites nas instituições | média | M | 1 (renomear) / 3 (convites) | Parcial. O template "firehouse" fica no futuro. |
| HIS-6 | Balões legíveis | alta | P | 1 | É a infraestrutura de todas as falas. |
| HIS-8 | Rodapé e mensagens com voz de brincadeira | média | P | 1 | Confirmado: `main.ts:291` roda uma única vez, por isso o rodapé diz "Bia" com o Rui selecionado (`ui-dock-768.png`). |
| HIS-9 | Correio e campainha com conteúdo | média | M | 3 | Absorve os itens 1 e 2 de JOG-8. |
| HIS-11 | Segredos efêmeros | média | M | 3 | Absorve JOG-12. |
| HIS-13 | Mais ideias e visíveis | baixa | P | 3 | — |

### 4.2 Fundidos em outro achado

Esses IDs não são rejeitados; a substância está no ID indicado.
- **JOG-8** → UX-3 (hotspots) e HIS-9 (campainha e correio).
- **JOG-11** → UX-1 (som) e HIS-3 (falas).
- **JOG-13** → FIS-4.
- **GFX-4** → JOG-7.
- **FIS-8** → JOG-7 (ociosidade) e W2-04 (trote do gato).
- **FIS-9** → GFX-9 (sombras) e W2-05 (salto).
- **HIS-2** → JOG-1 (carinho), JOG-7 (ida à peça favorita) e HIS-3 (falas de gato). A regra de gato no sofá fica no futuro.
- **HIS-7** → UX-2 (status) e JOG-6 (`fed`).
- **HIS-10** → UX-3.

### 4.3 Rejeitados ou rebaixados, com motivo

- **JOG-12 (rejeitado em favor de HIS-11).** Persistir `discovered[]` e oferecer um "álbum do que já apareceu" cria uma coleção a completar, ou seja, pontuação disfarçada. Segredos derivados do estado atual e efêmeros entregam a mesma surpresa sem pressão e sem migração.
- **UX-9 (rebaixado de alta para média).** A alegação "sem desfazer" está errada para a sessão: `remove-building` passa por `remember()` (`main.ts:151,167`) e `streetUndo` restaura o bairro (`main.ts:168-173`). O risco real é outro: o histórico é só em memória e se perde ao recarregar, e o Desfazer fica escondido no rodapé. Fica o gesto de adulto mais o aviso com "Desfazer". **Rejeito a "lixeira" persistida** (estado novo no v2 por pouco ganho).
- **UX-15 (rebaixado de G para incremental).** Uma consolidação de CSS de uma vez só, sem ganho visível, é arriscada. Cada item que toca uma região da tela (dock, cabeçalho, rodapé) consolida as regras daquela região. O restante fica para W4-08.
- **GFX-11 (rejeitado).** Redesenhar seis móveis para uma única projeção é G e tem retorno baixo: casas de bonecas digitais toleram 3/4 misto. A diversidade de cor, que é o problema real, já está em GFX-5. A limpeza dos gradientes falsos entra como tarefa de higiene no W4-01.
- **GFX-14 (rebaixado para condicional, fora das ondas).** É um projeto familiar sem publicação ("Não há publicação Sites", README). Os looks licenciados são decisão consciente do proprietário (ver DIR-2) e a criança provavelmente os ama. **Antes de qualquer distribuição pública**, redesenhar como heróis originais mantendo os `LookId`. Até lá, não mexer.
- **FIS-12 (rebaixado para a onda 4, baixa).** Inércia de câmera é refinamento e não bloqueia a brincadeira.
- **FIS-14 (rebaixado para "medir primeiro").** Não otimizar sem medir. Na onda 1 entra só a medição (W1-21). A troca por A* acontece apenas se a medição passar de 16 ms num tablet de entrada.
- **HIS-12 (rebaixado para o futuro).** Eventos do bairro valem a pena, mas só depois de personalidades e falas. Sem eles, uma "festa" seria cenário vazio. Além disso, "chuva rega as plantas" conflita com o ciclo de plantas, que também está no futuro.
- **Item 4 de JOG-2 (rejeitado):** "usar o adereço no ator quando ele já segura algo" cria ambiguidade com `give`. O uso fica explícito ao soltar o adereço sobre o personagem.

---

## 5. Lacunas que os especialistas não viram

| ID | Achado | Severidade | Evidência |
| --- | --- | --- | --- |
| **DIR-1** | **O save da criança pode ser apagado em silêncio.** Se o save v2 falhar na validação, `loadNeighborhood` cai para o álbum legado (talvez de meses atrás) ou para o estado inicial e **grava imediatamente por cima da chave v2**. A validação é uma lista branca rígida: tipos de item, regex de id (`persistence/neighborhood.ts:42-43`) e `lookIds` (`validation.ts:16`). Qualquer rollback, bug de validação ou item novo das ondas 2 e 3 vira perda total da casa. Isso viola o pilar 6. | crítica | `src/persistence/storage.ts:45-48` (`decodeNeighborhood(...) ?? ...; saveNeighborhood(town, port)`). README: "Dados ausentes, inválidos [...] recuperam o estado inicial." |
| **DIR-2** | **Looks de terceiros além de Homem-Aranha e Superman.** Rumi, Mira e Zoey reproduzem personagens de *KPop Demon Hunters* (Netflix) e estão documentados como baseados nas "referências oficiais". GFX-14 só viu os dois heróis. Fica como risco condicional à distribuição, por decisão do proprietário. | baixa (condicional) | `src/content/catalog.ts:19-21`; `docs/neighborhood.md:9`; `look-tray-1024.png`. |
| **DIR-3** | **A seleção é quase invisível e a turma nasce sobreposta.** O selecionado ganha só um contorno de 3 px `#ffefb7` (amarelo-pálido sobre chão bege) numa sombra de alpha 0,08, mais uma etiqueta de 15 px sob os pés. Os gatos nascem colados à frente dos humanos. Em `ui-dock-768.png` a etiqueta "Rui" aparece sob a Pipoca, e a criança não sabe quem escolheu. | alta | `src/presentation/art.ts:10-11,23`; `src/domain/world.ts:18` (x 835 para a Pipoca e 880 para o Rui); `compare-after-1280.png`, `ui-dock-768.png`. |
| **DIR-4** | **`bootstrap/main.ts` está a 3 linhas do limite da política.** São 297 linhas para um teto de 300 (`quality.policy.json` → `fileLines: 300`). Quase todo item das ondas 1 e 2 toca `main.ts` (mensagens, `select`, `perform`, praça). Sem extração prévia, a primeira entrega quebra o gate ou leva a gambiarras. | alta (habilitador) | `wc -l src/bootstrap/main.ts` = 297; `quality.policy.json`. |
| **DIR-5** | **A documentação contradiz o código.** O README diz "Cada instituição tem arquitetura própria", mas as fachadas institucionais são código morto (GFX-6). O README fala em 20 looks, `docs/mvp.md:3` em 14 e `types.ts:2` tem 26. `docs/simple-play.md:3` diz que tocar no cômodo "entra nele com o personagem", enquanto o Mapa diz "A turma continua onde está". `simple-play.md` fala em 24 tipos de peça. | média | Arquivos citados. Documentação errada engana o próximo agente e o próprio gate. |
| **DIR-6** | **"Pular" fica cinza enquanto a tela diz "Agora!".** Durante os 400 ms de aterrissagem o botão é desabilitado, mas o cue continua "Agora!". Para a criança, isso diz "agora, mas você não pode". | baixa | `src/presentation/child-games.ts:55-58` (`landing` → `disabled`); `rope-reduced.png`. |
| **DIR-7** | **O laço de cuidado é invisível.** "Oferecer comida" fica **oculto** até o personagem segurar a comida certa (`controls.ts:60,67`). Para alimentar a Mimi, a criança precisa adivinhar 4 passos: abrir a geladeira, pegar o peixe, levá-lo até a Mimi e então achar o botão. Nada sugere o primeiro passo. É o laço de cuidado mais importante do jogo. | alta | `src/presentation/controls.ts:44-49,60,67`. Integrado ao W1-06 (botão fixo esmaecido que mostra o ícone da comida) e ao W3-03 (pedido "Tô com fominha"). |
| **DIR-8** | **Atualizar o jogo pode invalidar saves por causa da regex de id.** Complemento de DIR-1 e correção de JOG-2: acrescentar tipos de item exige atualizar a regex e a lista no mesmo commit, com teste de que um save antigo carrega e de que um save novo carrega na versão nova. A estratégia de rollback é: ao encontrar um tipo desconhecido, descartar só aquele objeto, nunca o bairro inteiro. | alta | `src/persistence/neighborhood.ts:42-43`; `validation.ts:22`. |

---

## 6. Backlog priorizado

Regras transversais:
- Cada item respeita as camadas. O domínio continua puro e testado sob mutação. Conteúdo novo fica em `src/content`. Só `storage.ts` toca `localStorage`.
- **Nenhum campo novo persistido sem** migração explícita, teste de round-trip e teste de save antigo sem o campo. Tudo o que pode ser efêmero é efêmero.
- Nenhum arquivo passa de 300 linhas nem nenhuma função de 60 linhas (política 1, inalterada).

### Onda 1: Clareza e segurança (renomeada)

Acrescentei "segurança" ao nome porque DIR-1 e DIR-4 são pré-requisitos de tudo e porque a perda da casa é o pior dano possível para a criança.

| ID | O que fazer | Arquivos prováveis | Critério de aceitação observável | Esforço |
| --- | --- | --- | --- | --- |
| W1-01 (DIR-1, DIR-8) | Save à prova de perda. (a) Se existir string v2 e ela falhar na validação, copiar o texto bruto para `mundo-da-bia:neighborhood:v2:recovery` antes de qualquer gravação e não sobrescrever sem esse backup. (b) Item de tipo desconhecido é descartado sozinho. Look desconhecido volta para um look padrão (`sol`), porque descartar um ator quebraria a turma completa exigida por `complete()` (`validation.ts:26-28`). | `persistence/storage.ts`, `persistence/neighborhood.ts`, `persistence/validation.ts`, testes | Teste: v2 com um objeto de tipo `"estetoscopio"` carrega o bairro sem esse objeto. Teste: v2 com look `"desconhecido"` carrega com aquele personagem de `sol`. Teste: v2 corrompido deixa o texto original intacto na chave de recuperação. Um fixture de save "rico" (3 casas, itens, looks variados) carrega idêntico. | P |
| W1-02 (DIR-4, FIS-13) | Fundação de apresentação. Extrair de `main.ts` as mensagens, a praça (`useOutdoor`, `dropOutside`) e `select`/`perform` para módulos de bootstrap. Criar `motion.ts` (perfil único de movimento reduzido, follow da câmera dependente do tempo) e trocar os `matchMedia` espalhados por ele. | `bootstrap/main.ts`, novo `bootstrap/*.ts`, novo `presentation/motion.ts`, `reactions.ts`, `viewport.ts`, `walking.ts`, `door-effect.ts` | `main.ts` com 240 linhas ou menos. `grep -r "prefers-reduced-motion" src/presentation/*.ts` só encontra `motion.ts`. Com movimento reduzido, o balão aparece fixo e some por fade, e a câmera corta sem deslizar. | M |
| W1-03 (GFX-12, GFX-5 tokens, UX-15 parcial) | Fonte local arredondada, `text-style.ts` com estilos nomeados e tokens de cor no `:root` e em `palette.ts`. | `public/fonts/`, `style.css`, novo `presentation/text-style.ts`, novo `presentation/palette.ts`, todos os `scene.add.text` | Nenhum texto do canvas em Courier (captura de "Pracinha do encontro" e dos números da amarelinha com a mesma fonte do painel). `grep "fontFamily" src` só no `text-style.ts`. A build fica dentro do orçamento da política. | M |
| W1-04 (HIS-6, UX-1 itens 1-2, HIS-8) | Retorno na cena. `speechBubble` único (22 px ou mais, rabinho, duração de 1800 ms + 60 ms por caractere, um por personagem). Recusas viram tremor suave com balão neutro perto do alvo. `#announcement` passa a ser apenas leitor de tela (`.sr-only`). Mensagens reescritas no tom do guia. O evento `moved` não gera fala. O rodapé de 54 px volta para a cena. | `reactions.ts`, `outdoor-effects.ts`, novo `presentation/feedback.ts`, novo `content/feedback-text.ts`, `main.ts:236-243`, `dock-layout.css:2,24,32` | Tocar no balanço ocupado mostra, junto do balanço, o rosto ou nome de quem está nele. Não há texto no rodapé visível. O leitor de tela anuncia uma vez. Nenhuma frase na cena passa de 6 palavras. | M |
| W1-05 (JOG-1, HIS-2 carinho) | O toque responde. Segundo toque num personagem já selecionado, sem arraste, dispara uma reação **só na apresentação** (sem `dispatch`, sem persistir): pose curta mais balão mais som, com 2 ou 3 variações por personagem sorteadas sem repetir a anterior. No gato, é carinho e ronronar. | `play-gesture.ts`, novo `content/personalities.ts` (só o pool de reações), `pose.ts`, `reactions.ts`, `sound.ts` | Em sessão nova, cada um dos 7 personagens reage visivelmente ao segundo toque em até 150 ms. Tocar 5 vezes seguidas no mesmo personagem não repete a mesma reação duas vezes em sequência. O toque de reação não persiste o save nem interrompe uma caminhada. (Não cancelar a brincadeira ao tocar está no W2-10, porque `select()` chama `cancelGame()` em `main.ts:204`.) | M |
| W1-05b (UX-1 itens 3-4, JOG-11 som) | Som ligado por padrão, com volume inicial baixo. O `AudioContext` é criado no primeiro `pointerdown`. Um timbre por tipo de evento (vestir, pegar, recusar, porta, comer, miado) e um "pop" curto para botões, tudo via WebAudio sem assets. O `#sound-toggle` sai do diálogo Mapa (`index.html:20`) e vira um ícone de alto-falante no cabeçalho. | `sound.ts`, `index.html:20`, `shell.ts`, `button-art.ts` | No primeiro toque da sessão já se ouve som. Vestir, pegar e comer têm sons distintos, reconhecíveis de olhos fechados. O botão de som fica visível no cabeçalho sem abrir o Mapa e mantém a escolha via `storage.ts` (chave própria, fora do save). | M |
| W1-06 (UX-2, HIS-7, DIR-7) | Painel com no máximo 5 botões fixos de ícone (64 px, ícone de 40 px, rótulo de 1 palavra): Vestir, Brincar, Descansar, Soltar e Comer. O show sai do painel e começa tocando no microfone, no palco ou no piano da cena (o piano já inicia o show). Indisponível fica esmaecido **no mesmo lugar**. Comer mostra o ícone da comida que falta. O status vira 2 ou 3 selos-ícone. Sem glifo ♫. | `controls.ts`, `button-art.ts`, `immersive.css`, `index.html` | A posição de cada botão é idêntica antes e depois de pegar ou soltar um objeto (comparação de capturas). Nenhum botão só de texto no painel. Nenhuma ocorrência de "Pronto para". | M |
| W1-07 (UX-3, HIS-10, JOG-8 item 3) | Hotspots da praça. Banco, balanço, regador, campainha e correio respondem ao toque no desenho, com brilho suave quando o personagem está perto. Os botões HTML continuam invisíveis, só para teclado e leitor de tela. Tocar no balanço onde o próprio personagem está o faz descer. "Sair do equipamento" é removido. | `outdoor-controls.ts`, `plaza-art.ts`, `street.ts`, `scene.ts`, e2e com os rótulos antigos | Em `plaza-swing.png` regenerada não há lista de botões da praça no painel. Com a Bia no balanço, tocar no balanço a faz descer. Com a Luna no balanço, tocar mostra o rosto da Luna. | M |
| W1-08 (DIR-3, JOG-7 item 3) | Seleção inequívoca: halo colorido saturado sob os pés, seta ou estrela que pulsa sobre a cabeça e etiqueta acima da cabeça. Posições iniciais espaçadas, sem sobreposição: gatos espalhados, alguém no sofá, alguém perto do microfone. Vale só para saves novos (`world.ts` inicial). | `art.ts`, `domain/world.ts:16-19`, teste | Na captura inicial a 768 px nenhuma figura cobre outra. A etiqueta do selecionado fica a menos de 40 px da cabeça dele. Os saves existentes não mudam de posição. | P |
| W1-09 (FIS-3, FIS-2) | Caminhar sempre faz sentido. Destino bloqueado usa `nearestApproach` e o personagem olha para o ponto tocado. Toque acima do piso é projetado para a borda do piso. Objetos salvos fora da faixa caem até o piso só visualmente. | `walking.ts`, `walking-path.ts`, `play-gesture.ts`, `house-input.ts`, `targets.ts`, `scene.ts:204-207` | Tocar na parede faz o personagem andar até o rodapé. Tocar colado a uma cama faz ele andar até o lado da cama. Não existe mais o "×" vermelho no código. O domínio (`geometry.ts`) não muda. | P |
| W1-10 (GFX-8) | Retratos da Turma com o look atual, usando cores por papel em vez de `replaceAll` de hex. | `portrait.ts`, `controls.ts`, `look-image.ts` | Em `ui-dock-768.png` regenerada, os cartões mostram as mesmas roupas da cena. Vestir alguém atualiza o cartão na hora. | P |
| W1-11 (GFX-7, GFX-2 escala) | Enquadramento. Sem faixa vazia acima do teto. Humano com 150 px ou mais no interior e 110 px ou mais na rua num tablet de 768 px (escala da rua de 0,8 a 0,85 ou câmera mais próxima). Móveis iniciais das instituições não nascem cortados. | `viewport.ts`, `scene.ts`, `pose.ts:3`, `architecture-art.ts`, `domain/institution-plans.ts` | Medição nas capturas de 768 e 1024 px: altura do humano igual ou acima das metas, 0 px de faixa vazia acima do teto e cama da enfermaria inteira. | M |
| W1-12 (UX-8, UX-4) | Mapa só para ir. A aba Lugares mostra miniaturas grandes, com retratos de quem está em cada cômodo. Ampliar, mover, excluir e a contagem de capacidade vão para Organizar. Em Brincar, tocar no cômodo leva o selecionado junto (**depende da decisão do proprietário**). Um único verbo, "Ir", com ícone de porta. | `world-navigation.ts`, `room-controls.ts`, `neighborhood-controls.ts`, `object-controls.ts`, `index.html:8,17`, novo `content/ui-text.ts` | A aba Lugares não tem nenhum botão com "Excluir" nem "Mover". `grep -rE "Levar (pela porta\|personagem)\|Trazer aqui" src index.html` vazio. Tocar no Quarto no modo Brincar mostra a Bia no Quarto. | M |
| W1-13 (UX-5, JOG-7 item 2) | Primeiro toque. Sem seleção, o dock em retrato é uma fileira de retratos de 64 px, sem parágrafo. Na primeira abertura, uma mão-fantasma em SVG toca a Bia e a turma acena; tocar em qualquer lugar dispensa. A flag fica em chave própria via `storage.ts`. | `index.html:11`, `dock-layout.css:30-31,53`, novo `presentation/first-touch.ts`, `persistence/storage.ts` | Tela inicial a 768 px: nenhum parágrafo com mais de uma frase e a mão-fantasma visível. Na segunda abertura ela não aparece. Em navegação privada, sem storage, o jogo abre normalmente. | M |
| W1-14 (UX-6) | Ícones próprios e únicos (Turma, Mapa, Ampliar, cômodo+, Sala, Banheiro, Todos, Atividades, Ir, balanço, banco, regar). Sem prefixo Unicode nos looks. Sem ♧. | `public/icons/`, `button-art.ts:2,6`, `controls.ts:37`, `content/catalog.ts` (campos `icon`), `neighborhood-controls.ts:21`, `object-controls.ts:34` | Em cada captura de referência, nenhum ícone se repete entre botões visíveis ao mesmo tempo. `grep -rE "[♧ϟ◇✳]" src/presentation src/content` vazio, ou presente só em campos não exibidos. | M |
| W1-15 (UX-7) | Cabeçalho estável: Mapa à esquerda, interruptor Brincar/Criar no centro e bandeja do modo à direita, com ícone **e** cor próprios por modo. "Ampliar" vira aba de Criar. "Pronto" deixa de existir. | `index.html:6`, `shell.ts:14-48`, `button-art.ts`, `immersive.css` | Nenhum botão do cabeçalho muda de rótulo mantendo o mesmo ícone. Captura de Criar sem "Pronto" e sem "Ampliar" no cabeçalho. | M |
| W1-16 (UX-11, UX-10, HIS-5 renomear) | Vocabulário infantil. Strings da construção vão para `content/ui-text.ts` ("módulo" → "cômodo", "Confirmar módulo" → "Construir!", sem "estrutura", "nível" nem "Entrada fixa"). Sem a fileira "✎ Nome": um lápis pequeno no cartão selecionado. "Investigar" → "Achados e perdidos". | `structure-controls.ts`, `controls.ts:31`, `actor-names.ts`, `institution-art.ts:17` | `grep -riE "módulo\|estrutura\|nível\|equipamento\|Investigar" src/presentation src/content` vazio nos textos visíveis. Os 7 personagens cabem sem rolagem na Turma a 768 px. | M |
| W1-17 (UX-14, FIS-5) | Arrumar sem briga. O móvel fica sob o dedo com contorno de inválido. Ao soltar em lugar inválido, ele desliza para o encaixe válido mais próximo (`freePlacement`) ou volta voando. Peça indisponível pisca a igual que já está na cena. Desfazer e Refazer viram botões redondos de 56 px sempre visíveis em Criar. Categorias sem estouro. | `scene.ts:137-146`, `build-gesture.ts`, `domain/placement.ts` (só reuso), `editor-controls.ts:35`, `home-menu.css`, `dock-layout.css:22-23` | Arrastar um sofá sobre a geladeira mantém o sofá sob o dedo e, ao soltar, ele aparece encostado ao lado. Tocar na Geladeira esmaecida faz a geladeira da cena piscar. Desfazer aparece inteiro em `organization-catalog-768.png`. | M |
| W1-18 (UX-13) | Terreno livre tocável no modo brincar, com placa de "+" e tijolos dentro da área visível. | `street.ts:36`, `neighborhood-controls.ts:28-33` | Em `neighborhood-street-768.png` a placa está inteira e sem "Toque em Construir". Tocar no terreno abre o seletor de construção. | P |
| W1-19 (UX-12 itens 1-2, GFX-10, DIR-6) | Brincadeiras sem recusa. Mão ocupada solta o objeto com animação. Gato selecionado faz a escolha passar para a criança mais próxima. Falta de espaço leva a câmera ao chão livre. Chooser com 2 cartões ilustrados. Amarelinha com giz branco, contorno colorido por casa, números de 22 px ou mais e casa ativa pulsando. Corda de 6 px. O botão não fica cinza durante o "Agora!". | `child-games.ts:22-29,55-58`, `game-controls.ts:9,29,33`, `child-game-art.ts:24-26,54` | Iniciar a corda com o ursinho na mão começa a brincadeira e o ursinho vai para o chão. Em `hopscotch-portrait.png` regenerada a casa ativa se distingue com o filtro de daltonismo (deuteranopia). | M |
| W1-20 (UX-9 rebaixado) | Excluir casa com gesto de adulto (segurar 2 s com anel de progresso). Depois, um aviso com "↶ Desfazer" por 10 s, usando o `streetUndo` existente. "Manter casa" fica grande e verde. | `remove-house.ts`, novo `presentation/grown-up-gate.ts` | Um toque rápido em Excluir não exclui. Depois de excluir, tocar em Desfazer no aviso devolve a casa com móveis. Nenhum campo novo no save. | P |
| W1-21 (FIS-14) | Medir o custo de `nearestApproach` num cômodo grande cheio de móveis, com `performance.now`, e registrar em `docs/`. | `equipment-interaction.ts`, `docs/verification.md` | O número em ms está registrado. Se passar de 16 ms, abre-se um item de otimização (A*). | P |

### Onda 2: Vida e sensação

| ID | O que fazer | Arquivos prováveis | Critério de aceitação observável | Esforço |
| --- | --- | --- | --- | --- |
| W2-01 (JOG-7, GFX-4, FIS-8 ociosidade, HIS-2 favorito) | Vida ambiente só visual, sem persistência. Respiração (scaleY ±1,2%). Olhar para outro personagem a cada 6 a 10 s. Gatos com cauda em S de ±0,25 rad, orelhas, espreguiçada e pose enrolada ao descansar. Após 20 s ocioso, um gato anda até a peça favorita, sem mudar o save. | novo `presentation/idle-life.ts`, `art.ts`, `scene.ts:239-247`, `cat.svg` | Um vídeo de 30 s parado mostra pelo menos 3 micro comportamentos distintos. Recarregar não altera posições. Com movimento reduzido, só piscadas. | M |
| W2-02 (GFX-3) | Olhos 1,4× maiores, sobrancelhas e 5 expressões (alegre, risada, surpresa, sonolento, curioso) disparadas por eventos já existentes. | `human.svg`, `cat.svg`, `art.ts` | Captura do show com rostos em risada. Entrar num cômodo mostra surpresa por cerca de 1,2 s. Na captura de 1280 px, olhos com 5 px ou mais. | M |
| W2-03 (FIS-1) | Peso: pose "carregado" (levanta, pernas em pêndulo, inclina com a velocidade, sombra fica no chão), queda e squash ao soltar. Objetos caem e quicam uma vez. | `scene.ts:147-168,212-237`, `art.ts`, `settle-motion.ts`, `play-gesture.ts:42` | Arrastar a Bia não toca o ciclo de caminhada. Soltar um objeto mostra o quique. A variante reduzida está capturada. | M |
| W2-04 (FIS-6 parcial, FIS-8 trote) | Cadência de cerca de 2,5 passos/s, passo e velocidade escalados pelo contexto, bob de 5 px vezes a escala, pernas de ±9 px e inclinação pela aceleração. O gato trota com a cauda erguida. Sem espelhamento. | `art.ts:96-108`, `walking.ts:30,42`, `pose.ts` | Na rua, a figura menor não "patina": a distância por passo é proporcional à escala (teste unitário de fase). Com movimento reduzido, a caminhada é lenta, sem bob e sem teleporte. | M |
| W2-05 (GFX-9 sombras, FIS-9) | Sombra de contato com alpha 0,2 e núcleo. Saltos com preparo, sombra que encolhe no ar, squash e poeirinha. | `art.ts:10`, `piece-art.ts:33`, `child-game-art.ts:8-10,37` | Em `compare-after-1280.png` regenerada, os gatos têm sombra perceptível sobre o tapete. O salto da amarelinha mostra o agachar em quadro capturado. | P |
| W2-06 (FIS-7, GFX-2 balanço) | Balanço como pêndulo amortecido: cada toque dá impulso (amplitude máxima de 0,45 rad), o assento vazio continua oscilando e as pernas esticam e dobram. O estado fica só na apresentação. | novo `presentation/swing-motion.ts`, `scene.ts:258-265`, `plaza-art.ts:15` | Três toques seguidos fazem o balanço visivelmente mais alto. Sair do balanço deixa o assento balançando até parar em cerca de 8 s. | M |
| W2-07 (FIS-4, JOG-13) | Bola cinemática: arremesso pela velocidade do dedo, atrito, rotação e quique nas bordas do piso, empurrada por quem passa perto. Um único `place` ao parar. Bola de 36 a 40 px na rua. | novo `presentation/ball-motion.ts`, `play-gesture.ts`, `scene.ts:102` | Jogar a bola faz ela rolar e parar. Recarregar a mostra no ponto final. Uma criança andando "chuta" a bola. Nenhuma ação nova no domínio. | M |
| W2-08 (FIS-10) | Portas contínuas: andar até a porta, porta abre, personagem some no vão, troca de lugar, porta interna abre e personagem sai andando. Chegada na porta (`doorway.interior`). Usar ou apagar `walkToDoor`/`slideRoom`. | `neighborhood-doors.ts:12`, `travel-dialog.ts:18`, `main.ts:158`, `door-effect.ts`, `scene.ts:169-174`, `door-controls.ts:38` | Entrar em casa pela rua faz a Bia aparecer na frente da porta "Rua" do interior, não no canto esquerdo. `grep walkToDoor` encontra pelo menos uma chamada ou nenhuma definição. | M |
| W2-09 (FIS-11) | Obstáculos da praça (banco, trave, canteiro) entram no caminho. A subida no banco e no balanço tem arco de 260 ms. As gotas saem do regador. | `walking-path.ts`, nova lista em presentation, `outdoor-effects.ts:29-31` | A criança contorna o canteiro. A captura do meio da subida mostra o arco. O domínio não muda. | M |
| W2-10 (JOG-10 itens 3-4, JOG-9 item 2, JOG-4 parcial, UX-12 item 3) | Brincadeiras na cena: cue na corda (cor mais o chão piscando sob os pés), erro com careta engraçada, celebração ao fim da amarelinha (braços para cima, confete de giz), espectadores torcem. Tocar num espectador não cancela. | `child-games.ts`, `child-game-art.ts`, `pose.ts`, `reactions.ts`, `main.ts:204` (via módulo extraído) | Jogar a corda olhando só para a cena é possível (painel coberto no teste). Tocar na Luna durante a amarelinha não encerra a brincadeira e a Luna bate palmas. Sem contagem nem estrelas. | M |
| W2-11 (JOG-5 parcial) | Pia, lavadora, horta, estante, mesa de piquenique e carrinho passam a responder a `use`: o personagem vai até a peça e aparece um efeito visual e sonoro (bolhas, tambor girando, broto balançando, livro na mão como efeito visual). Só usa `active`, que já existe. | `domain/world.ts:92`, `furniture-targets.ts:38`, `furniture-art.ts`, `sound.ts`, testes de domínio | Tocar na pia faz o personagem ir até ela e as bolhas aparecem. Mutação do domínio de 80% ou mais. Nenhum campo novo no save. | G |
| W2-12 (JOG-6 parcial, HIS-7 `fed`) | Ciclo de cuidado suave: `fed` volta a `false` ao acordar de `rest` (regra pura). O ♥ fica transitório (aparece e some), não permanente. | `domain/world.ts`, `domain/objects.ts`, `art.ts:26,38-39`, `world.test.ts` | Alimentar, descansar e acordar permite alimentar de novo. Sem estado "faminto triste" e sem texto "Já comeu". | P |
| W2-13 (GFX-1 item 4) | Céu vivo: nuvens derivando devagar, copas oscilando ±1,5° e um pássaro ocasional. Desligado com movimento reduzido. | `street.ts:57-64`, `plaza-art.ts` | Um vídeo de 20 s da rua mostra movimento ambiente. A captura reduzida fica estática. | P |

### Onda 3: Faz de conta e narrativa leve

| ID | O que fazer | Arquivos prováveis | Critério de aceitação observável | Esforço |
| --- | --- | --- | --- | --- |
| W3-01 (HIS-1) | Personalidades em `content/personalities.ts` (frase curta, gostos, peça favorita, voz). Frase curta no cartão da Turma. **Os traços da Bia são definidos com a família.** | `content/personalities.ts`, `controls.ts` | Cada cartão tem frase curta de 4 palavras ou menos. Revisão do texto contra o guia de tom: zero masculino genérico e zero estereótipo de gênero. | M |
| W3-02 (HIS-3, JOG-11 falas) | Falas por evento e personagem em `content/lines.ts`, com 3 a 5 variações e rotação determinística. O evento `furniture` ganha `kind` opcional, efêmero e não persistido. | `content/lines.ts`, `reactions.ts`, `domain/furniture.ts:18`, `domain/world.ts:93`, testes | Mesma ação 4 vezes dá pelo menos 3 falas diferentes. Renomear a Bia para "Ana" faz as falas dizerem "Ana". | M |
| W3-03 (HIS-4, DIR-7) | Pedidos opcionais. `domain/wishes.ts` é puro e devolve pedidos executáveis com ações já existentes. No máximo um pedido visível, como balão "?". Some em 30 s ou ao trocar de lugar. Não repete em seguida. Atendido, só um agradecimento neutro. Pode ser desligado em chave própria via `storage.ts`. Nunca aparece em Criar nem durante brincadeira. | `domain/wishes.ts`, `content/wishes.ts`, `reactions.ts`, `persistence/storage.ts` | Nunca há dois pedidos na tela. Ignorar um pedido não muda nada no mundo. Com o interruptor desligado, nenhum pedido em 5 min. Nenhum texto de lista ou contagem. | M |
| W3-04 (HIS-9, JOG-8 itens 1-2) | Correio e campainha. Cartas curtas e ilustradas de `content/letters.ts`, escolhidas de forma determinística pelo id e pelo `mail` já salvo. A campainha consulta quem está dentro e o personagem aparece na porta com a fala dele. | `content/letters.ts`, `outdoor-effects.ts:19`, consulta pura em `domain/neighborhood.ts` | Tocar na campainha de uma casa com o Léo dentro mostra o Léo na porta com "Já vou!". Abrir o correio mostra um cartão legível de 22 px ou mais. Sem campo novo. | M |
| W3-05 (HIS-11, substitui JOG-12) | Segredos efêmeros derivados do estado: estrelas no teto ao apagar a luz, gato espiando da gaveta, folha e passarinho na árvore. | `content/secrets.ts`, detector em presentation | Apagar a luz do quarto com o Nino presente mostra as estrelas e a fala do Nino. Não existe lista, álbum nem contagem de segredos. | M |
| W3-06 (HIS-5 parcial) | Convites de chegada por instituição na primeira visita da sessão: "Consultório do Ursinho", "Achados e perdidos", quadro da escola com tema. | `content/institution-stories.ts`, `institution-art.ts` | Entrar no consultório mostra o convite uma vez por sessão. Nenhuma referência a cela, algema ou prisão. | M |
| W3-07 (JOG-2 corrigido, DIR-8) | Primeiro lote de 6 adereços (estetoscópio, curativo, livro, regador de mão, apito, lanterna), com SVG próprio e uso ao soltar sobre um personagem (reação na apresentação). Regex e lista de tipos atualizadas juntas. | `domain/types.ts:4,12`, `persistence/neighborhood.ts:42-43`, `persistence/validation.ts`, `content/catalog.ts`, `public/icons`, testes de migração | Teste: save antigo carrega. Teste: save com adereço faz round-trip. Teste: adereço de tipo desconhecido é descartado sozinho (W1-01). Soltar o estetoscópio na Luna faz ela dizer "Ahhh". Orçamento de assets dentro da política. | G |
| W3-08 (JOG-3 parcial) | Gestos sociais efêmeros: soltar um personagem sobre outro faz abraço ou toca-aqui, conforme a personalidade, com coração ou estrela entre os dois. Sem menu radial, sem persistir. | `play-gesture.ts:69-75`, `pose.ts`, `reactions.ts`, `content/personalities.ts` | Soltar a Bia sobre o Léo faz os dois se abraçarem. O save registra só as posições. | M |
| W3-09 (JOG-9 item 1, JOG-10 itens 1-2) | Amarelinha com pedrinha (sessão efêmera; o domínio aceita qualquer casa). Corda com 3 ritmos ilustrados e parlenda em domínio público avançando a cada pulo. | `domain/child-games.ts`, `game-controls.ts`, `child-game-art.ts` | A pedrinha faz pular a casa onde caiu. A parlenda completa termina em festa. Nada é contado nem salvo. | M |
| W3-10 (HIS-13) | De 10 a 12 ideias em forma de pergunta, uma por vez, também na bandeja de Criar, com botão "Outra ideia". | `content/projects.ts`, `editor-controls.ts`, `shell.ts` | A bandeja de Criar mostra um cartão de ideia. Não há "concluído" nem checklist. | P |

### Onda 4: Polimento visual e mundo

| ID | O que fazer | Arquivos prováveis | Critério de aceitação observável | Esforço |
| --- | --- | --- | --- | --- |
| W4-01 (GFX-5 cores, higiene de GFX-11) | Aplicar a paleta viva: superfícies neutras com acentos tocáveis saturados. Cores base dos móveis redistribuídas (fim do monopólio do sálvia). Remover os gradientes "material" falsos. | `content/furnishings.ts`, `sala.svg`, `everyday.svg`, `workshop.svg`, `human.svg`, `cat.svg`, CSS | Em `catalog-all.png` regenerada, no máximo 3 peças da mesma família de cor. Fora dos tokens, `grep -E "#[0-9a-fA-F]{6}" src/presentation/*.css` vazio. | M |
| W4-02 (GFX-1 itens 1-3) | Rua vestida: meio-fio, faixa de pedestre, poste, hidrante, lixeira colorida, canteiro e céu em degradê com 2 ou 3 planos. | novo `presentation/street-dressing.ts`, `street.ts` | Em `neighborhood-street-768.png` não sobra faixa cinza sem detalhe com mais de 40 px de altura. | G |
| W4-03 (GFX-6 spike) | Renderizar a galeria de `civic-facades.ts`/`sport-facades.ts` e comparar lado a lado. Adotar se for melhor, ajustando à geometria de porta e placa. Corrigir a placa sobre a porta e o toldo além da parede. Variações para casa, apartamento e loja. Atualizar o README (DIR-5). | `architecture-art.ts:21-24`, `institution-art.ts`, `panoramic-facade.ts:20,51-54` | Na galeria regenerada, hospital, delegacia e escritório se distinguem pela silhueta com o texto oculto. A placa não cobre o batente. | M |
| W4-04 (GFX-13) | Cor da fachada só na parede (textura por cor) e sem `setTint` na imagem inteira. | `architecture-art.ts`, `panoramic-facade.ts`, `street.ts:41`, `door-effect.ts:20` | Uma casa "rosa" fica rosa com janelas de vidro azul limpo. | P |
| W4-05 (GFX-9 noite e sol) | Noite com halo em volta das luzes acesas e janelas estreladas, com personagens ainda legíveis. Feixe de sol derivado da janela de cada cômodo. | `furniture-art.ts:7`, `architecture-art.ts:43` | Com o abajur apagado, os rostos continuam legíveis (contraste medido na captura). O feixe parte da janela em cada modelo. | M |
| W4-06 (JOG-14 parcial) | Show dirigível: tocar num ator troca o passo de dança, quem segura o microfone solta notas e quem está fora do palco vira plateia. Loop musical curto em WebAudio. | `art.ts:45-47`, `pose.ts`, `sound.ts`, `scene.ts:105` | Durante o show, 4 toques no mesmo ator dão 4 passos diferentes. A plateia fica virada para o palco. | M |
| W4-07 (FIS-12) | Inércia e borda elástica na rua, troca de cômodo animada ao cancelar e rampa de velocidade na borda. | `street-pan.ts`, `navigation.ts`, `house-edge-pan.ts`, `wheel-navigation.ts` | Soltar o arraste da rua com velocidade continua deslizando. Cancelar a troca de cômodo anima a volta em cerca de 180 ms. | P |
| W4-08 (UX-15 restante) | Concluir a consolidação do CSS em camadas (`@layer`), sem `!important` e sem `select{display:none!important}` global. | `style.css`, `immersive.css`, `home-menu.css`, `dock-layout.css` | `grep -c "!important" src/presentation/*.css` = 0. Capturas de 390, 768, 1024 e 1280 px idênticas ou melhores que as anteriores. | M |

### Futuro (fora das ondas: exige migração no v2 ou decisão)

- Assentos por peça (`{piece, slot}` no lugar de `SeatId` global), para várias camas e sofás (JOG-5).
- Carregar o gato no colo e andar de mãos dadas (JOG-3; `carriedBy` persistido).
- Crescimento das plantas em 4 estágios com colheita (JOG-6; `watered` → `growth`).
- Batedores de corda e fila da amarelinha (JOG-4).
- Template "firehouse" (HIS-5).
- Regra de gato no sofá e na caminha (HIS-2).
- Eventos do bairro disparados pela criança (HIS-12).
- Segundo lote de adereços (JOG-2).
- Heróis originais no lugar dos looks licenciados, só antes de distribuição pública (GFX-14, DIR-2).

**Contagem:** onda 1 = 22 itens, onda 2 = 13 itens, onda 3 = 10 itens, onda 4 = 8 itens (53 no total), mais 9 temas futuros.

---

## 7. Gate de aprovação aplicado a cada onda

**Critérios comuns (todas as ondas), sem exceção:**
1. `quality-gate` verde no SHA entregue, com a política 1 inalterada: arquivo com até 300 linhas, função com até 60, complexidade até 10, cobertura de 90% ou mais, mutação de 80% ou mais em domínio e persistência, orçamento de build e zero retries.
2. **Proteção do save:** um fixture de save "rico" e um fixture de save de cada versão anterior carregam idênticos. Campo novo persistido exige migração, round-trip e teste de save antigo. Sem isso a onda é reprovada.
3. Capturas regeneradas em 390, 768, 1024 e 1280 px, mais a variante de movimento reduzido. Eu as reviso **lado a lado** com as atuais. Qualquer regressão visual reprova.
4. **Teste sem texto:** com todo texto da UI tornado transparente por CSS, um adulto completa sem ler: escolher um personagem, vestir, levar à praça, balançar e voltar para casa. A partir da onda 1, ele também alimenta a Mimi.
5. **Tom e pressão:** nenhuma frase nova na cena passa de 6 palavras. Zero masculino genérico. Zero números, contadores, estrelas, "x de y", "volte amanhã" ou gatilho por relógio real. Zero "×", "erro" ou "errado".
6. Documentação sincronizada com o código: contagens (looks, peças), comportamento do Mapa e afirmações sobre fachadas (DIR-5).
7. Nenhuma camada violada (dependency-cruiser). Nenhum acesso a `localStorage` fora de `storage.ts`.

**Específicos por onda:**
- **Onda 1:** em sessão nova, cada personagem responde ao toque em até 150 ms. O painel não tem botão só de texto e não muda de lugar. A tela inicial não tem parágrafo com mais de uma frase. O humano tem 150 px ou mais no interior e 110 px ou mais na rua a 768 px. Nenhum rótulo menor que 16 px. Não existe "×" vermelho. W1-01 está concluído **antes** de qualquer outro item que toque persistência.
- **Onda 2:** cada animação nova tem variante reduzida capturada. Nenhuma animação bloqueia input por mais de 300 ms. **Pelo menos uma medição de FPS em tablet Android real** no cenário do README (turma completa em show mais arraste com troca de cômodo), com 30 fps ou mais. Abaixo disso, a onda é reprovada.
- **Onda 3:** o checklist anti-pressão é auditado por mim item a item. Um pedido por vez, nenhum pedido em Criar e o desligamento funciona. A personalidade da Bia é aprovada pela família. Todas as falas interpolam o nome (teste com personagem renomeado).
- **Onda 4:** comparativo antes e depois de cada tela. Contraste AA em todo texto sobre arte. Nenhum hex fora dos tokens. As fachadas se distinguem pela silhueta com o texto oculto.

---

## 8. Riscos e o que não foi verificado

**Não verificado:**
- **Não executei o jogo.** Esta revisão se baseia em leitura de código e em capturas estáticas. Sensação de movimento, tempos de resposta e som não foram observados.
- **As capturas têm horários diferentes.** `compare-*` e `plaza-*` são das 21:04; `facades-*`, `catalog-all`, `ui-dock-768`, `look-tray-1024` e `home-map-768` são de 18:24 a 18:33. As mais antigas podem não refletir o código atual. `hopscotch-complete.png` e `rope-reduced.png` usam um save sintético de teste (README), então itens "na parede" podem vir do fixture. O código confirma FIS-2 de qualquer forma.
- **Tablet real:** iPad, Android, trackpad físico, FPS e áudio WebAudio no iOS (que exige gesto) nunca foram verificados, como o próprio README admite.
- **Criança real:** a sessão observada com a Bia segue pendente por escolha do proprietário (`docs/atelier-pop.md:23`). Todas as afirmações de "impacto na criança" são hipóteses de design, não observação. **Recomendo fortemente** uma sessão curta e sem coleta de dados após a onda 1, observando os primeiros 2 minutos sem instrução verbal.
- Verifiquei por amostragem as linhas citadas pelos especialistas (lista na seção 4). As demais foram aceitas pela coerência da evidência. Alguns números de linha divergem levemente (por exemplo, a lista de `usePiece` está em `world.ts:92`, não em 96-98).

**Riscos:**
- **Perda de save (DIR-1):** é o maior risco do produto e precisa ser resolvido antes de qualquer item que mexa em persistência.
- **Escopo:** 53 itens para um projeto de uma pessoa. A onda 1 sozinha é grande. Se for preciso cortar, a ordem mínima é W1-01, W1-02, W1-04, W1-05, W1-05b, W1-06, W1-08, W1-09 e W1-07.
- **Limite de arquivo:** sem W1-02, a primeira mudança em `main.ts` quebra o gate.
- **Som ligado por padrão:** pode incomodar em casa ou na escola. O volume inicial deve ser baixo e o botão de som deve estar no cabeçalho (W1-05b).
- **Decisões pendentes do proprietário:** se o Mapa leva o personagem (UX-4) e o destino dos looks licenciados (GFX-14, DIR-2) só antes de distribuir.
- **Orçamento de assets:** a fonte, os ícones e os adereços somam bytes. Cada item precisa provar que fica dentro do orçamento da política.
- **Personalidade da Bia:** como o personagem leva o nome da criança, traços impostos podem soar estranhos para ela. Por isso, co-autoria com a família.
