# Planta visual e objetos para brincar

O fluxo principal deixou de exigir preenchimento de formulário. Dentro da planta, tocar num espaço vazio e numa imagem cria o cômodo com nome e tamanho padrão. O personagem selecionado acompanha a criação. Tocar num cômodo existente entra nele com o personagem e fecha o mapa. Nome, tamanho, reorganização e projetos continuam em **Mais opções e ideias**.

As miniaturas usam as próprias camadas SVG dos móveis; são ilustrações de cada modelo, não capturas da decoração atual. O catálogo tem 24 tipos de peças. Piano inicia/encerra o show e ilumina teclas; televisão alterna tela apagada e uma cena ilustrada; aquário alterna bolhas. Os estados persistem. Não há simulação de canais, alimentação de peixes ou instrumento com teclas individuais nesta entrega.

## Referências e decisões

- [Happy Home Designer, Nintendo](https://www.nintendo.com/en-gb/Games/Nintendo-3DS-games/Animal-Crossing-Happy-Home-Designer-1009406.html): colocar e mover móveis por toque. Aplicação: escolhas ilustradas e interação direta.
- [Townscaper, Nintendo](https://www.nintendo.com/en-gb/Games/Nintendo-Switch-download-software/Townscaper-2032023.html): construir por colocação de blocos, com detalhes resolvidos pelo jogo. Aplicação: valores iniciais prontos e resultado imediato em vez de formulário obrigatório.
- [Toca Boca World, Spin Master](https://www.spinmaster.com/en-US/brands/toca-boca): ambientes e ferramentas para expressão e histórias próprias. Aplicação: novos objetos combináveis sem objetivos obrigatórios.

São decisões de design inspiradas nessas referências; não comprovam usabilidade com crianças de 7–10 anos. A próxima avaliação com Bia deve observar se ela cria um cômodo sem ajuda, encontra como voltar e descobre o toque nos objetos. Nenhum dado da criança é coletado.

## Verificação

Testes primeiro reproduziram o formulário visível, o personagem ficando no cômodo anterior e a ausência de ativação das novas peças. Outro exemplo reproduziu uma peça solta fora dos limites que invalidava o salvamento; a adição agora mantém a posição padrão válida quando a posição pedida não cabe. Os exemplos passaram após as implementações.

Jornadas de navegador cobrem criação sem digitação, viagem por miniatura, opções avançadas, disposição e ativação dos três móveis e recuperação após recarregar. Capturas: `reports/simple-map.png` e `reports/playroom.png`. Uma rodada sob concorrência com mutação falhou por tempo; a verificação final foi separada, sem aumentar timeouts nem permitir retries. Os relatórios JSON identificam o resultado de cada gate e o SHA. A política permanece v1; main só recebe o mesmo SHA aprovado remotamente.
