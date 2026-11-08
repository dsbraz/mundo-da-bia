# Minha casa e cotidiano

## Escopo

O mapa de cômodos abre primeiro. Mapa, Organizar e Ideias separam visita, edição e sugestões. O mapa conserva as posições e andares, adapta a quantidade de colunas e mostra o cômodo atual. Arrastar para reorganizar só funciona em Organizar; no mapa, o gesto vertical permite rolar. A galeria do bairro vem depois dos cômodos. Organizar começa pelas ações da casa selecionada, incluindo exclusão e mudança de terreno. Mudar de terreno oferece cartões dos terrenos livres e ocupados, com prévia explícita de movimento ou troca. Cancelar não altera o bairro; confirmar preserva IDs, conteúdo, moradores e a vista atual.

Excluir exige confirmação com o nome da construção. Remove estrutura e móveis daquela casa, libera o terreno e leva residentes e objetos portáteis para a rua, preservando objetos carregados. A última casa permanece, com explicação visível: o envelope e a aplicação exigem ao menos uma construção. Não há migração nem redução da política.

Conteúdo: pia, máquina de lavar, horta em caixa, mesa de piquenique, biblioteca de livros e carrinho de cozinha; quatro uniformes próprios (chef, saúde, jardinagem e construção), disponíveis aos quatro humanos; lavanderia, biblioteca e sala de jantar prontas. Os móveis novos são peças de decoração: não introduzem simulações de lavar, cozinhar ou tratar pacientes.

## Reprodução e evidência

- Criar/copiar uma casa e tentar excluí-la: nenhuma ação existia. `remove-building.test.ts` falhou porque as duas construções permaneciam. Após implementação, preservação de entidades, mão ocupada, recarregamento, liberação do terreno, ID ausente e última casa passam.
- Abrir Minha casa para visitar: botões de reordenação aparecem junto à navegação. `home-menu.spec.ts` falhou por encontrar “Mover Quarto dos sonhos antes” visível no mapa. O fluxo novo separa esses controles, confirma/cancela exclusão e recarrega o resultado.
- Revisão visual encontrou bairro antes do mapa e cartões pequenos em retrato. O teste de ordem falhou (mapa abaixo do bairro). A correção prioriza cômodos e ajusta as colunas à planta. Cancelar ampliação retorna foco a Adicionar cômodo.
- Cancelar um arraste em Organizar e voltar ao Mapa deixava a visita bloqueada pelo estado transitório do gesto anterior. Reprodução manual e teste Playwright falharam com o diálogo ainda aberto após o clique. O próximo pointerdown agora limpa esse estado quando não há gesto ativo, preservando o bloqueio de cliques ao terminar um arraste e a propriedade do primeiro ponteiro.
- `move-building.test.ts` falhou porque as posições das casas não mudavam; o teste de navegador falhou pela ausência de Mudar de terreno. Após implementação, mover para vazio, trocar casas, cancelar prévia, rejeitar destinos inválidos e recarregar passaram.
- `everyday.test.ts` falhou pela ausência dos novos IDs e modelos. Criação e persistência passaram após implementar catálogo, arte e modelos.

As jornadas existentes de reordenação, limpeza e cópia foram adaptadas para entrar explicitamente em Organizar, preservando as verificações de estado. As jornadas visuais percorrem automaticamente todos os looks e modelos de cômodo, incluindo os novos.

## Verificação

Política 1 preservada. Verificação incremental: quality:fast aprovado; testes de menu e revisão de imagens em Chromium. Os relatórios finais de CI e mutação devem apontar ao mesmo SHA antes de promover para main. Uma execução local combinada de E2E foi interrompida com SIGTERM; seus testes parciais não constituem aprovação da suíte. A execução completa seguinte de quality:ci passou com 349 testes unitários e 83 jornadas. A revisão adicional reproduziu o cancelamento descrito acima; a CI de 9b56236 foi cancelada para validar o commit corrigido com mais uma regressão, sem promover aquele SHA.

Imagens: reports/home-map-landscape.png, home-map-390.png, home-map-768.png, home-organize.png, catalog-all.png e visual-*.png. Avaliação visual é separada dos resultados automatizados. iPad físico, trackpad físico, Android/FPS e observação com Bia continuam pendentes.
