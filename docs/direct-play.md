# Brincadeira direta — 2026-11-07

A sala permite abrir o armário e arrastar um dos seis looks até um humano. Os looks têm estampas distintas. Comida arrastada até o personagem compatível alimenta e acorda; microfone entregue a um humano inicia o show sem encerrá-lo se já estiver tocando. Brinquedos podem ser transferidos entre personagens e soltos no chão. Há prévia do objeto arrastado, destaque do alvo e reações visuais ao vestir, alimentar e entregar objetos.

Os botões existentes continuam disponíveis. Roupas, alimentação, posições, objetos nas mãos e show usam o salvamento versionado existente, sem apagar a brincadeira anterior. Cancelar o gesto preserva o estado e devolve a prévia ao lugar de origem. Trocar de cômodo durante o gesto cancela a entrega. Comida incompatível, mãos ocupadas e destinos inválidos não alteram o estado.

## Evidência vermelho/verde

- `npm test -- src/domain/objects.test.ts`: seis falhas de comportamento antes da implementação de `give` e `place`; oito exemplos aprovados depois. Incluem transferência sem duplicação, restrições de cômodo, limites de posição e salvamento/carregamento.
- `npm test -- src/presentation/input.test.ts`: dois novos exemplos falharam antes do controlador de arraste; seis exemplos aprovados depois, incluindo a regressão da ordem visual.
- A nova jornada E2E falhou porque o armário não existia. Depois passou abrindo-o na cena, vestindo, alimentando humano e gato, entregando microfone e recarregando.
- Um teste adicional reproduziu o botão do armário habilitado ao recarregar no quarto. A atualização do botão passou a ocorrer em toda renderização, inclusive a inicial.

- Três regressões adicionais de sobreposição falharam antes de corrigir a prioridade entre objetos, personagens e armário. A seleção respeita a mesma ordem em que aparecem na cena.

## Validação

A execução completa local antes do último ajuste do botão passou tipagem, lint, arquitetura, 70 testes unitários, sete testes dos gates, cinco jornadas E2E, cobertura, build, orçamento e mutação. Cobertura: domínio 97,87% de linhas e 98,97% de ramificações; persistência 100% de linhas e 98,03% de ramificações. Mutação: domínio 87,69%, persistência 86,39%. JavaScript gzip: 339.799 bytes nessa execução, dentro do orçamento.

A suíte final inclui uma sexta jornada com eventos de toque do Chromium e recarga em outro cômodo. A CI remota deve validar o SHA final limpo antes de avançar main. Os relatórios locais anteriores ao commit registram `dirty:true` e não substituem essa evidência.

Capturas em `reports/direct-play.png` e `reports/wardrobe-touch.png` apoiam a revisão visual. A primeira revisão identificou que o aviso do show cobria o cabeçalho do armário; o aviso foi movido para o palco. Não houve medição de FPS ou validação em Android real.
