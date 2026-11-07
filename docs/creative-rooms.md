# Construir cenários e habitar a casa

A direção desta iteração é um ateliê de mundos para 7–10 anos: construir, decorar, levar os personagens e inventar histórias. A referência de construção modular vem do [modo Construção de The Sims](https://www.ea.com/pt-br/games/the-sims/the-sims-4/new-player-hub/build-mode); os projetos abertos de decoração se inspiram em [Happy Home Paradise](https://animalcrossing.nintendo.com/new-horizons/happy-home-paradise/). São referências de interação, com personagens e arte próprios.

## Experimentar

Abra **Planta da casa**, escolha um espaço vazio e crie um cômodo. Há modelos livre, quarto, cozinha, banheiro, estúdio e jardim; três larguras e até 12 cômodos por casa. Renomeie e reorganize a planta. A faixa inferior permite navegar, e o painel da planta leva o personagem selecionado para o destino com seu objeto.

Arraste móveis do catálogo para o cenário ou toque para adicionar. O catálogo agora tem 21 tipos de peças, incluindo bancada, fogão, banheira, mesa de criação e estante. Sofá, cama, armário, geladeira, abajur, mesa e palco são únicos por cômodo, permitindo montar vários quartos e cozinhas. As outras peças podem se repetir. Fogão, banheira, mesa de criação, espelho e caixa de som alternam efeitos visuais por toque, com estado salvo; ainda não são sistemas completos de cozinhar, tomar banho ou compor música.

As ideias **Apartamento da banda**, **Café com gatos** e **Noite entre amigos** mostram sugestões de cômodos e móveis presentes na casa. São opcionais, sem pontuação ou restrição da criação livre. Guardar uma versão duplica a casa atual como outro projeto editável.

## Jogabilidade e visual

Arrastar personagens preserva o ponto em que foram segurados. A prévia movimenta os objetos da cena sem reconstruir tudo nem salvar a cada movimento; soltar confirma, cancelar restaura a posição anterior. Móveis também usam prévia sem reconstrução por movimento. O salvamento mantém a coleção e a chave legada da casa ativa.

A interface usa painéis compactos, cores mais sóbrias e navegação permanente entre cômodos. Personagens têm escala menor e proporções ajustadas; Bia continua loira. Sofá, cama, armário e palco foram redesenhados em SVG. Os novos móveis usam `assets/workshop.svg`; corpo, cabelo, rosto e roupas continuam em camadas editáveis.

O mapa é uma organização de cômodos retangulares, não um editor livre de paredes. Tamanho é escolhido ao criar; ainda não há exclusão de cômodos nem redimensionamento posterior. A posição na planta não cria passagens físicas entre ambientes. O modelo jardim começa com plantas e cama de gato, no mesmo cenário-base. Desfazer/refazer vale durante a edição; navegar ou brincar começa um novo histórico.

## Persistência e evidência

Saves v1/v2/v3 migram para v4; coleção v1 migra para v2. Validação verifica referências a cômodos, IDs, posições na planta, larguras, assentos e móveis por ambiente. Luz, geladeira e gaveta têm estado independente em cada cômodo.

TDD: os primeiros exemplos falharam por ausência de criação de cômodos, duplicação de camas em ambientes diferentes e preservação de posição ao cancelar. Também foram reproduzidos e corrigidos: reinício da luz ao selecionar o cômodo atual, aceitação de versão textual da coleção e distorção de imagem ao ampliar o ambiente (proporção 1,67 em vez de 2,33). A CI verifica os resultados, não a ordem histórica da escrita dos testes.

No Chromium desta VPS, um arraste controlado de 30 movimentos passou de 60 gravações síncronas na implementação anterior para zero durante a prévia e duas ao soltar (coleção e chave legada). A jornada automatizada verifica o resultado e o cancelamento. Isso mede armazenamento nesse cenário, não FPS em Android real.

Capturas em `reports/` incluem planta, estúdio amplo, cozinha e brincadeira. Relatórios completos ficam em `reports/ci.json` e `reports/mutation.json`, e nos artefatos do workflow Quality do SHA entregue. Política v1 preservada. A promoção para main exige o mesmo SHA aprovado no quality-gate remoto; não há publicação Sites nesta iteração.

Validação local em 07/11/2026: 209 testes unitários, sete testes da automação e 14 jornadas de navegador passaram, sem retries. Cobertura de linhas/branches: domínio 99,44%/99,32%; persistência 100%/97,81%. Mutação: domínio 86,46%; persistência 86,39%. CI local 197 s; mutação 285 s. JavaScript gzip 360.027 bytes, +1,35% contra main `592c8cd` (run `42400001214`), demais assets 29.797 bytes.
