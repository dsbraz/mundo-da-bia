# Uma casa conectada

As portas laterais ligam os cômodos na ordem da planta: da esquerda para a direita, seguindo as linhas e ignorando espaços vazios. Não há ligação circular nas extremidades. Reorganizar a planta muda os vizinhos. A miniatura da porta identifica o modelo do destino; não é uma fotografia da decoração atual.

Toque numa porta para o personagem selecionado caminhar até ela e atravessar, ou arraste um personagem e solte sobre a porta. A travessia mantém roupa, identidade e objeto carregado, libera o assento e encerra o descanso. O personagem entra pelo lado oposto. Outros personagens ficam onde estavam. As portas requerem o selecionado presente no ambiente; o mapa continua disponível para viajar até ele ou reunir a turma.

A confirmação do estado acontece antes do deslizamento das vistas. Por toque, o personagem caminha até a porta; por arraste, atravessa diretamente ao soltar, sem repetir a caminhada. Durante a animação, os controles ficam temporariamente indisponíveis para impedir travessias duplicadas. Movimento reduzido segue a preferência do sistema. Cancelar um arraste antes de soltar não atravessa; soltar fora da tela também não é uma porta. A janela decorativa dos cômodos permanece; a porta antiga sem ação foi retirada.

## Conteúdo

Três looks originais em SVG: **Jaqueta jeans**, **Ensaio pop** e **Macacão criativo**, utilizáveis pelos quatro humanos. O guarda-roupa acomoda os 11 looks em três fileiras dentro do móvel, sem sobrepor a gaveta. Bia permanece loira.

O canto de leitura adiciona **Poltrona de leitura**, **Luminária de leitura** e **Mesinha com livros**, totalizando 27 tipos de peças. Arrastar um personagem para a poltrona permite sentar; tocar na luminária alterna sua luz. A mesinha é uma peça decorativa com livros desenhados, sem inventário próprio. Cores, espelhamento e salvamento continuam disponíveis. Poltrona tem uma unidade por cômodo, como os outros assentos com identidade fixa.

## Evidência

Antes da integração, exemplos reproduziram a ação de atravessar sem efeito, a ausência da nova coleção e a inexistência da porta na jornada do navegador. Testes adicionais reproduziram soltura fora da tela sendo reconhecida como porta e o deslocamento da área clicável depois de travessias consecutivas. O posicionamento das portas agora usa as coordenadas de layout, sem incorporar a transformação temporária da animação. Regras verificam ida/volta, ordem da planta, chegada em cômodo amplo, identidade, objeto carregado e salvamento. Gestos verificam cancelamento, soltura e exclusão de roupas da travessia.

Jornadas de navegador verificam ida/volta por toque e arraste com ursinho, poltrona, luz, novos looks e recarga. Capturas em `reports/doors.png` e `reports/reading-corner.png`. Os relatórios JSON e artefatos do workflow Quality são a evidência final dos gates e do SHA; política v1 preservada. Não há medição de FPS em tablet Android real ou publicação Sites nesta entrega.
