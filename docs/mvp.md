# Evolução do piloto

O MVP mantém Phaser e SVGs locais em camadas. A turma continua única, com quatro humanos, três gatos e 14 looks, incluindo Rumi, Mira e Zoey e variantes de Rui e Léo. Não há moeda, nível, obrigação de retorno ou telemetria.

## Comportamentos implementados

- Trackpad horizontal: normalização de pixels, linhas e páginas, acompanhamento visual, agrupamento até 200 ms sem atividade e limiar de 25% nos interiores. Rua com câmera contínua limitada. Zoom, vertical, formulários e painéis não são capturados. Dois dedos e cancelamento continuam disponíveis.
- Faixa externa com Bairro, Construir, Estrutura, andares, vizinhos, anterior/próximo e transporte explícito. Alvos HTML acessíveis por toque e teclado.
- Caminhada por toque com obstáculos derivados dos móveis, substituição do destino, cancelamento ao arrastar e aviso de destino inacessível. Apenas o destino confirmado é salvo; quadros de animação não entram no armazenamento.
- Aproximação antes de usar equipamentos, ocupação exclusiva e saída explícita. Banco, balanço, plantas, bola, campainhas e correio na rua. Arrastar até banco ou balanço também funciona.
- Construção em quatro escolhas: terreno, modelo, prévia, confirmação. Corte de três andares por quatro cômodos, prévias canceláveis, renomeação, mudança/troca de células e substituição de tipo. Entrada protegida no térreo. Novo andar cria seu primeiro cômodo; prédios começam com dois andares.
- Histórico da sessão de construção reúne módulos, fachada e decoração. Voltar a brincar encerra a sessão. Navegar não apaga o histórico.
- Envelope v2, recuperação pelo v1 preservado e migração das coleções anteriores. Identidades, nomes, roupas, móveis e objetos são conservados. IDs de cômodos locais podem se repetir entre construções.

## Arte e apresentação

Arquitetura própria para casa, prédio e loja, com fachada correspondente ao número de andares. Sala, quarto, cozinha, banheiro, estúdio e jardim têm composições distintas. Materiais em gradiente nos SVGs de móveis e personagens; corpo, roupa e mão compartilham poses, inclusive sentado e deitado. Balanço e objeto carregado acompanham o personagem. Cozinha e banheiro usam piso em placas.

A cena carrega os figurinos atuais e peças necessárias à construção visitada; mantém peças dos cômodos vizinhos para a prévia de navegação. O modo retrato usa o espaço abaixo da cena para ações e bandejas. O acabamento não é tratado como aprovado apenas porque os testes passam.

## Evidência de desenvolvimento

Política: versão 1, sem alteração de limites. Testes escritos antes dos comportamentos de wheel, rotas, caminhada, módulos, interação externa e migração. Os casos inicialmente falharam por implementação ausente e passaram após implementá-la. Correções posteriores usaram os casos de jornada que reproduziram os problemas de armário, sobreposição de seleção e travessia. Um teste adicional reproduziu o banco permanecer ocupado ao trazer alguém para dentro sem mudar suas coordenadas; a liberação agora considera também a localização.

Comandos do ciclo: `npm run quality:fast`, `npx playwright test`, `npm run quality`. Os relatórios JSON/Markdown em `reports/` identificam SHA, estado limpo/sujo, limites e resultados. A integração exige o `quality-gate` remoto no mesmo SHA; relatórios locais de workspace alterado são evidência de desenvolvimento, não aprovação do commit.

`e2e/visual-mvp.spec.ts` gera imagens de seis ambientes nas duas orientações e dos 14 figurinos com poses em pé, sentado, deitado e caminhada carregando objeto, além de vídeos. `e2e/mvp.spec.ts` cobre navegação, prédio, andar, histórico, recarga, chão, praça e bola. As jornadas existentes continuam cobrindo arrastes, portas, toque, teclado, cancelamento e construção/decoracão.

Na revisão de imagens foram conferidos rostos, roupas, posição dos objetos, diferenças de arquitetura e ocupação dos painéis. O espaço vazio excessivo no retrato foi substituído por cartões ilustrados de brincadeiras. A inspeção de quadros do vídeo revelou sobreposição do painel de ações durante a caminhada; um teste reproduziu a falha e o painel passou a recolher enquanto há movimento. Portas, regador e balanço têm efeitos transitórios separados do save. Nenhuma imagem de teste constitui aprovação pela criança.

## Validações práticas pendentes

Trackpad físico; tablet Android real nas duas orientações; medição de FPS com turma completa, show, caminhada e travessia; sessão observada de descoberta com Bia. Registrar dispositivo, navegador, orientação e cenário, dificuldades e necessidade de ajuda, sem dados pessoais da criança. Meta de 60 FPS, investigação abaixo de 30 FPS. Emulação Chromium não comprova esses resultados.

Publicação Sites não faz parte da integração em main e não está comprovada por esta implementação. A correspondência de SHA continua obrigatória caso haja publicação posterior.
