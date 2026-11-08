# Interação e refinamento do conjunto

Política 1, sem alteração de limites, domínio, envelope v2 ou dimensões lógicas dos móveis. O SHA final e o resultado do quality-gate ficam na execução de CI vinculada ao commit desta entrega.

## Comportamento

A cena fornece posição, profundidade, transformação do corpo e posição do objeto exibidos. Os gestos consultam essa representação transitória; o save continua recebendo apenas confirmações. Interromper uma caminhada confirma uma vez o ponto visível e invalida a conclusão anterior. Arraste tem sua própria origem, limiar de oito pixels de tela e cancelamento independente. Um arraste do fundo continua sendo arraste mesmo ao retornar ao ponto inicial.

Clique em objeto livre solicita aproximação e coleta. Na chegada são conferidos identidade, posição, disponibilidade e mão livre. Equipamentos são conferidos novamente antes da ação. O acesso considera a frente e os encaixes espelhados, compara o comprimento dos percursos alcançáveis e mantém o obstáculo do assento depois da saída pela borda próxima. Destinos inválidos encerram o comando anterior e recebem uma marca e mensagem.

Brincar, Construir e Decorar têm controles próprios. Construir oferece terrenos/fachadas e estrutura modular; Decorar conserva móveis, acabamentos, cores e histórico. A seleção fica abaixo da cena e as bandejas ao lado, ou abaixo no retrato. Turma, Looks e Objetos compartilham uma bandeja. Visitar conserva entidades no lugar; Levar usa o nome do personagem e transporta seu objeto junto.

## Bugs reproduzidos e ciclo vermelho/verde

| Reprodução | Esperado | Evidência antes da correção | Regressão |
| --- | --- | --- | --- |
| Andar, avançar um quadro e cancelar/substituir por destino inválido | Parar no ponto visível e não concluir interação antiga | 3 falhas em `walking.test.ts`: zero confirmações ou somente confirmação final | Interrupção, substituição e redução de movimento |
| Mover o ponteiro sete pixels de tela sobre um ator, em escalas 0,5/1/2 | Continuar sendo clique | 3 falhas em `play-click.test.ts`: prévia de arraste antes do limiar | Limiar independente do zoom |
| Arrastar fundo e retornar ao início antes de soltar | Não caminhar | `play-click.test.ts`: caminhada emitida | Deslocamento máximo fica registrado |
| Clicar em objeto livre | Andar e pegar, sem recolocar no chão | `play-click.test.ts`: coleta não emitida | Coleta por identidade |
| Objeto ocupado/removido ou mão ocupada na chegada | Recusar com mensagem, sem substituir o objeto | 3 falhas comportamentais contra implementação vazia tipada de `item-pickup.ts` | `item-pickup.test.ts` |
| Sair de dentro do móvel para o lado oposto | Sair primeiro pela borda próxima e contornar | `walking-path.test.ts`: primeiro ponto era o destino, atravessando o móvel inteiro | Obstáculo não é removido da rota |
| Selecionar ator e abrir controles no desktop | Painel fora da cena | E2E: painel em y=262 enquanto a cena terminava em y=690 | `reliable-play.spec.ts` |
| Procurar modo Construir | Acesso próprio e distinto de Decorar | E2E: controle ausente | `reliable-play.spec.ts` |
| Alternar para pose de cama | Aproximação gradual, imediata sob redução de movimento | `pose-transition.test.ts`: ângulo saltava diretamente ao final | Corpo, roupa e objeto acompanham a pose |
| Pedir interação no ponto onde o ator já está | Concluir sem caminhada infinita | `walking.test.ts`: conclusão nunca chamada | Rota de comprimento zero |
| Mover oito pixels e acrescentar segundo dedo | Manter o arraste já iniciado | `two-finger.test.ts`: segundo dedo roubava o gesto | Mesmo limiar no roteador de toque |
| Selecionar na pose visual transformada | Usar transformação e profundidade exibidas | `targets.test.ts`: nenhum ator encontrado | Alvos seguem a pose e a ordem de desenho |
| Construir e acionar Desfazer/Refazer | Histórico acessível fora da bandeja | E2E de construção: bandeja interceptava o clique | Área própria para histórico |

Os testes foram executados antes das correções dos bugs acima. Falha inicial por módulo ausente no teste novo de coleta foi descartada como evidência; o vermelho registrado é o da implementação vazia tipada. A suíte antiga de transporte foi atualizada para esperar a nova coleta e usar a posição de chegada, preservando as verificações de identidade, cancelamento e save.

## Direção visual e inspeção

Referência humana: corpo com altura lógica de 220 × 0,86; portas com 228 unidades de altura livre (aproximadamente 1,2×), 104 de largura, batente, vidro, folha, soleira e geometria compartilhada entre arte, alvo e animação. Casas, lojas e prédios preservam sua família visual e variantes de um a três andares.

A revisão mantém o desenho 2D acolhedor e acrescenta realismo discreto: aceleração/frenagem, acomodação gradual no assento e cama, sombras de contato, espessura em tampos, reflexos em vidro, costuras, contornos compatíveis e juntas do piso em perspectiva. Não acrescenta física, mecânicas, ambientes ou figurinos.

Evidência reproduzível: `catalog-review.spec.ts` cobre as 28 peças e nove fachadas; `visual-mvp.spec.ts` cobre os seis ambientes em paisagem/retrato e os 14 figurinos em pé, sentados, deitados, carregando objetos e caminhando. PNGs em `reports/` e vídeos em `test-results/`. Foram inspecionadas as folhas de catálogo/fachadas, os ambientes, os figurinos e sequências de quadros de movimento. Arte de humanos/gatos e figurinos foi preservada onde não havia inconsistência confirmada; os detalhes do catálogo seguem seus limites existentes.

## Limites práticos

Mouse, teclado, toque/multitoque e eventos de roda/trackpad são exercitados no Chromium. Isso não verifica trackpad físico, FPS em Android nem a experiência com Bia. Não há coleta de dados da criança. Publicação Sites não faz parte desta entrega; a correspondência de origem exigida pelo projeto permanece uma etapa separada.
