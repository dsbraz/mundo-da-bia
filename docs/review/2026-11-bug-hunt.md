# Rodada de bugs: caça a inconsistências (15/11/2026)

**Origem:** um swarm de 10 agentes, só leitura: 5 caçadores, um por área, e 5 céticos que tentaram refutar cada achado. Os 41 achados sobreviveram à verificação, todos com evidência `arquivo:linha`.
**Aviso:** o fato de nenhum achado ter sido derrubado sugere céticos lenientes. Cada correção começa por um teste que falha. Se o teste não falhar, o achado cai.
**Dados brutos:** `reports/bug-hunt-2026-11-15.json` (local, ignorado pelo git). Lá estão o cenário, a causa e o teste sugerido de cada um. Os números `#n` abaixo seguem a ordem de gravidade desse levantamento.
**A juntar:** as observações da Bia, que o proprietário está coletando.

## Grupos por causa-raiz (ordem sugerida de correção)

### G1. Salvamento que corrompe e perde o bairro inteiro (alta)
O pior tipo de bug: a obra da criança se perde. Em todos os casos, `loadSaved` cai em silêncio para o save antigo ou para o mundo inicial.
- **#4:** um nome longo é cortado em 24 caracteres e pode terminar em espaço. O validador exige `trim()`, então o bairro todo é rejeitado. Arquivos: `world.ts:151`, `validation.ts:92`.
- **#21:** ao excluir o prédio do último terreno, a Laura (índice 9) fica além da borda da rua e o save fica inválido. Arquivo: `remove-building.ts:10`.
- **#5:** o Desfazer com um prato na mão deixa dois itens na mesma mão, e o save fica inválido (ver G2).

### G2. Desfazer em Brincar rebobina a sessão inteira (alta)
O botão Desfazer continua visível em Brincar e volta ao último snapshot feito em Criar. Voltam roupas, nomes e posições, sacolas reaparecem cheias e um prato na mão quebra o save. Achados: **#3, #5, #31**. Arquivos: `refresh.ts:58`, `town-actions.ts:39`, `neighborhood.ts:122`.

### G3. Ciclo de dormir e acordar (alta)
Só o "bom dia" do pulo de noite acorda alguém, e só se o sono ainda for maior que 0. O estado de deitado é salvo, e o "Reunir" ignora quem dorme.
- **#6 e #14:** quem chegou a sono 0 continua deitado de manhã.
- **#25:** o amanhecer natural não acorda ninguém.
- **#26 e #35:** a sessão nova abre com gente dormindo, porque `resting` e o assento são salvos.
- **#1 e #22:** o "Reunir todo mundo" traz quem dorme em pé, com "zZ", às vezes no alto da parede.
- **#36:** "Acordar" deixa a pessoa deitada; o "bom dia" põe ela de pé.
- **#28:** o pedido de sono da Bia chega de madrugada, por causa do intervalo compartilhado entre pedidos.
- **#40:** depois da noite das estrelas, o sono continua pedindo a manhã inteira.
- **#38:** a flag `fed` salva mantém a cara feliz por cima do sono e do tédio.

### G4. Recusas silenciosas (alta e média)
Regra violada: "toda recusa se explica". `dress()` nunca chama `refuse()`.
- **#2:** arrastar um look para quem não pode usá-lo. 18 dos 20 cabides não servem nos adultos.
- **#19:** a aba Looks fica ativa para um gato ou para alguém em outro cômodo.
- **#18:** o espelho abre os looks para um gato.
- **#17:** arrastar alguém para um banco ou balanço ocupado não faz nada. Tocar mostra quem está lá.
- **#33:** tocar no caixa sem sacola faz a Bia andar até lá e não acontece nada.

### G5. Comida que vem do nada ou some (média)
- **#7, #27 e #41:** as compras do trabalho aparecem a cada volta à tarde, inclusive quando a Fabiana só foi ao mercado. De manhã, o turno some sem aviso.
- **#8 e #11:** cada prédio tem sua própria despensa. Prédios sem `stock` contam como cheios, então recepção e copa viram cozinhas com estoque infinito.
- **#12:** uma casa nova "tem" 4 lanches e 4 peixes, mas não existe o objeto lanche nem o objeto peixe.
- **#13:** o lanche comido longe da geladeira fica no chão, e a geladeira fica sem ele.
- **#9:** soltar a sacola na geladeira só guarda se o personagem selecionado estiver segurando a sacola. A mensagem de recusa ("Aqui não tem lugar") está errada.
- **#10 e #23:** uma sacola não paga sai do mercado pelo "Reunir" ou pela gaveta da Turma, e a Bia fica presa em casa.

### G6. Posicionamento que fura as regras (média)
- **#15:** um retrato solto da bandeja da Turma fica em pé dentro da mesa ou da cama, sem sentar.
- **#16:** em Criar, um móvel colocado em cima de um personagem é aceito, e o personagem fica dentro do móvel.
- **#24:** ir pelo Mapa ou pela seta da bolha até um cômodo de cima deixa o personagem dentro do vão da escada.

### G7. Profissionais (média e baixa)
- **#30:** a professora surge do nada em qualquer lousa, até em casa, e toma o lugar do Daniel ou da Fabiana. O domínio calcula quem ensina, mas a apresentação ignora o resultado.
- **#37 e #39:** o mesmo profissional aparece na entrada e na sala de trabalho ao mesmo tempo, e some na prévia do deslize.

### G8. Visual e indicadores (média e baixa)
- **#20:** o emblema do look se perde na camiseta: "Onda azul" e "Jardim" sempre mostram um sol.
- **#29:** os ícones de necessidade nos retratos da Turma ignoram o intervalo entre pedidos e ficam acesos para sempre.
- **#34:** na rua, a Bia come em pé mesmo com o banco da praça livre.

## Decisões do proprietário (15/11/2026)
1. **#32: o lanche e o peixe continuam finitos, com saída.** Sem mercado, eles voltam de manhã, para nunca haver beco sem saída. Isto substitui o "nunca acaba" de `2026-11-wave3-life.md`.
2. **#11: a copa compartilha a despensa.** Balcão de recepção e copa de instituição usam a despensa da casa da família, com a mesma contagem. Nenhum prédio tem despensa cheia inventada.
3. **#30: na lousa sem professora** (por exemplo, em casa), quem escreve ou desenha a lição é a própria criança selecionada.

## Pedidos da Bia (coletados pelo proprietário)
- **B1. Papel da lição na geladeira só se ela quiser.** Hoje cada lição pendura o papel sozinho (`school.ts:48`; os 4 mais novos aparecem na porta da geladeira). Decisão: no fim da lição, o papel fica na mão da criança como objeto, e arrastar até a geladeira pendura. Largado em outro lugar, vai para a coleção sem ir para a geladeira. Este pedido mexe no mesmo fluxo da frente s8 (#30), então entra depois que ela for integrada.

## Resultado (16/11/2026)
Oito frentes em paralelo (worktrees isolados), integradas em `delivery/bug-hunt` junto com o B1. `quality:fast` passou com 1286 testes, e a suíte e2e completa passou. Das 11 falhas da primeira rodada, 8 eram carregamento lento com a máquina sobrecarregada. As outras 3 eram expectativas de e2e que precisaram seguir a sessão nova (#38) e a noite de estrelas mais lenta (#40).

- **Desfazer (G2):** só dentro do Criar, e o histórico zera ao trocar de modo. Isso reverte "Preserve undo after Pronto".
- **B1:** a folha fica na mão; arrastada para a geladeira de casa, é pendurada. Saves antigos mantêm o que já estava na geladeira.

## Em aberto
- **#38:** o fim do "barriga cheia" ainda é só na sessão nova. Falta decidir se ele acaba quando a fome volta, para o sono e o tédio aparecerem na carinha.
- **#37/#39:** cada profissional fica num lugar só (a primeira sala de trabalho). Falta decidir se ela recebe na entrada e acompanha a criança, e ela ainda surge na prévia do deslize.
- **#30:** a criança vai até a lousa e comemora, mas ainda não desenha com o giz (o braço com o giz fica para depois).
- **Carga do save:** uma entidade inválida ainda derruba o bairro inteiro, e a chave de recuperação nunca é lida.
- **Despensa cheia:** compras soltas com a despensa cheia ainda fazem o som de "clink".
- **Lote 8A:** acrescentar um andar ainda põe o sofá em cima do Léo e da Mimi.
- **Folha da aula:** uma aula interrompida não entrega a folha, e soltar um objeto fora da faixa do chão (y 280–540) não dá resposta.
