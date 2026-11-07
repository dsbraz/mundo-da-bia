# Casa interativa e arte em camadas

A brincadeira passa a ocupar a tela, com bandejas recolhíveis para cômodos, personagens e ações. Bia é loira. Sala e quarto, personagens, olhos, cabelos, roupas, portas, gaveta e iluminação usam SVGs locais editáveis, sem imagens rasterizadas em produção.

## Fonte da arte

- `src/presentation/assets/sala.svg`: grupo `base` com subgrupos nomeados para arquitetura e móveis; camadas independentes para portas, gaveta e abajur.
- `quarto.svg`: a mesma linguagem visual, com cama e caminha de gato.
- `human.svg`: corpo, mãos, pernas, rosto, olhos, pálpebras, bocas e cabelos por personagem. Seis símbolos identificam os looks; cores vêm do catálogo.
- `cat.svg`: corpo, cauda, olhos e pálpebras. Paleta por gato.
- `svg-assets.ts`: extrai cada grupo com suas definições e carrega texturas locais no Phaser. Os SVGs permanecem a fonte editável; texturas são produzidas ao carregar a cena. Não há download de arte de terceiros.

A resolução lógica é 1000 × 600. Humanos usam uma prancheta de 140 × 220; gatos, 140 × 120. A âncora fica no centro inferior (pés). A pose gira dentro do contêiner, preservando legenda e sombra. Objetos na mão acompanham a pose deitada. O renderizador Canvas evita depender da inicialização WebGL no navegador da VPS; fluidez em tablet real ainda precisa ser medida.

## Comportamentos

Arrastar até o sofá acomoda o personagem em um dos dois assentos; a cama tem uma posição para deitar. Assentos ocupados não aceitam outro personagem. Mover levanta e acorda; reunir em outro cômodo libera o assento anterior.

Comida sai da geladeira aberta, pode ir à mesa ou diretamente ao personagem. Depois de alimentar, volta à geladeira para reutilização, mantendo o mesmo identificador. Objetos podem ser guardados na gaveta aberta; fechar esconde o conteúdo e impede pegá-lo até reabrir. Apenas comida entra na geladeira. Abajur alterna a iluminação. Sons curtos são sintetizados localmente e ativados por um botão; não iniciam automaticamente.

O envelope de salvamento passa à versão 2, mantendo a chave existente para localizar saves anteriores. A migração v1 preserva personagens, posições, roupas, comida, descanso, show e objetos nas mãos. Saves v2 validam estados dos móveis, posições e exclusividade dos assentos, local dos objetos e mãos ocupadas. Dados inválidos recuperam o estado inicial.

## Evidência de desenvolvimento

Antes da implementação, `npm test -- src/domain/furniture.test.ts src/persistence/migration.test.ts` registrou cinco falhas por ausência das regras de móveis e migração. Depois, os mesmos exemplos passaram. Um teste adicional reproduziu a posição incorreta do objeto na mão ao deitar (818,295 em vez de 735,322); a correção fez o teste passar. Outro teste reproduziu o transporte indevido do personagem ao soltar um objeto da mão sobre o sofá; o gesto agora só acomoda quem foi efetivamente arrastado.

A revisão no navegador identificou sobreposição inicial da turma com as roupas, posições antigas nas jornadas e codificação incompatível de SVG no carregador. Esses pontos foram corrigidos antes da execução final, sem retries ou redução de limites.

Validação local: 106 testes unitários; 7 verificações da própria automação; 8 jornadas de navegador incluindo toque real via CDP, cancelamento, móveis, guarda-roupa, show, cama, persistência e três tamanhos de tela. Cobertura: domínio 98,64% de linhas / 99,32% de ramificações; persistência 100% / 98,94%. Mutação: domínio 89,58%, persistência 88,46%. Os relatórios JSON identificam o SHA e distinguem workspace alterado; a CI deve repetir os gates no commit limpo antes de promover exatamente esse SHA a main.

Capturas locais: `reports/dollhouse-landscape.png`, `reports/dollhouse-compact.png`, `reports/furniture-play.png`, `reports/wardrobe-touch.png` e `reports/bedroom.png`. São evidência de Chromium emulado, não de desempenho Android. Nenhuma informação da criança é coletada. Publicação Sites permanece separada e não foi realizada neste incremento.
