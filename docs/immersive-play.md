# Interação, tela inteira e construção guiada

Esta revisão mantém o envelope de bairro v2, as identidades da turma e o histórico de edição. A escolha do proprietário foi começar com uma casa pronta e ampliar por cartões de cômodos. A estrutura avançada continua acessível, sem ser o primeiro passo.

## Comportamentos e regressões

| Reprodução | Resultado esperado e correção | Evidência de regressão |
| --- | --- | --- |
| Abrir ou recarregar um cômodo grande, girar o viewport | Cena cobre a tela sem deformação; dimensão lógica participa do enquadramento desde o boot | `viewport.test.ts`; `immersive.spec.ts`, proporção após recarga |
| Arrastar fundo e voltar ao ponto inicial | Só deslocar a câmera; não iniciar caminhada ao soltar | `camera-gesture.test.ts`, limiar em pixels e trava de arraste |
| Escape durante gesto, depois iniciar outro | Próximo contato funciona; cancelamento limpa também o roteador interno | Teste vermelho de cancelamento seguido de novo gesto, depois verde |
| Cancelar um segundo contato durante arraste | O primeiro contato continua dono do gesto | `camera-gesture.test.ts`, cancelamento do contato secundário |
| Tocar peça desenhada diante da porta | Selecionar a peça, sem visitar a rua | `neighborhood-gesture.test.ts`, vermelho antes de respeitar a profundidade |
| Arrastar o fundo durante caminhada | Limpar apenas a prévia pertencente ao gesto; não devolver a figura à posição salva | `play-click.test.ts`, vermelho antes de restringir cancelamento ao ator arrastado |
| Personagens aparecem através da cama | Materiais sólidos opacos; sombras e reflexos mantêm transparência | `immersive.spec.ts`, pixel da frente da cama inferior a 255 antes da correção |
| Microfone inicial atrás do palco | Iniciar novas brincadeiras com o microfone exposto; saves anteriores preservados | `depth.test.ts`, vermelho 281 ≤ 400, depois verde; jornada de arraste em `play.spec.ts` |
| Dois objetos no mesmo ponto e profundidade | Pegar o último desenhado | `targets.test.ts`, vermelho antes de inverter os empates |
| Colocar móveis sólidos uns sobre os outros ou no vão da porta | Recusar sem alterar o histórico; indicar local inválido | `placement.test.ts`, adição bloqueada vermelha antes da regra |
| Abrir save antigo com peças sobrepostas | Permitir retirar e reduzir sobreposição; manter cor, espelhar e guardar | `placement.test.ts`; lista de peças no editor |
| Sentar atrás da frente de sofá/cama | Corpo entre encosto e frente; objeto acompanha a mão | `depth.test.ts`, profundidade sentada vermelha antes da correção |
| Mudar destino durante a caminhada | Continuar a partir da posição visível e conservar velocidade | `walking.test.ts`, retarget vermelho antes de conservar velocidade |
| Mudar cor do abajur | Material muda na cena, miniatura e recarga | `material.test.ts` vermelho antes dos materiais explícitos; teste de pixel em `immersive.spec.ts` |
| Escolher Homem-Aranha ou Superman | Vestir qualquer humano, com máscara/capa e persistência | `outfit.test.ts`, catálogo e carregamento; vermelho antes de acrescentar os dois looks |
| Entrar em Construir e voltar a Decorar | Rótulos e dicas acompanham o modo: Casas e cômodos / Móveis e cores | `reliable-play.spec.ts`, vermelho com o rótulo herdado antes da correção |
| Ampliar uma casa | Cartão → prévia → confirmar; nenhuma alteração antes de confirmar | `immersive.spec.ts`; jornadas de construção e desfazer/refazer |
| Painel sobre o microfone | Recolher ações e continuar a manipulação direta | `play.spec.ts`, vermelho sem o controle de recolher |

Os ciclos locais usaram `npm run quality:fast`, Vitest direcionado e Playwright direcionado. Falhas exploratórias não são aprovação. Os gates finais produzem `reports/ci.json`, `reports/mutation.json` e os respectivos resumos; a CI associa esses relatórios ao SHA exato. A política permanece na versão 1, sem redução de limites ou retries.

## Avaliação visual e prática

As capturas em `reports/visual-*`, `catalog-all.png` e `facades-all.png` cobrem ambientes, catálogo e variantes de fachada. As jornadas visuais gravam vídeos das poses e caminhada dos 16 looks. Tela cheia usa recorte proporcional e câmera móvel: em retrato não se vê o cômodo inteiro simultaneamente. As bandejas e o painel recolhível liberam a cena.

O realismo continua leve: profundidade consistente, passagem livre, aceleração, passos alternados e acomodação no mobiliário, preservando a ilustração 2D. Não foi introduzido um motor de física nem alterada a dimensão lógica dos móveis existentes.

Trackpad físico, iPad real, Android/FPS e observação com Bia não foram verificados. Eventos de mouse, teclado, toque e wheel em Chromium são evidência automatizada, não aprovação da experiência infantil nem medição de fluidez em dispositivo real. Publicação Sites não faz parte desta entrega.
