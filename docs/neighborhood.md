# Bairro, nomes e figurinos

A referência de jogabilidade inclui Roblox, conforme orientação do proprietário: exploração livre de lugares, personagens e objetos para inventar histórias. A interface e a arte continuam seguindo o Ateliê Pop. Não há moedas, níveis ou tarefas obrigatórias.

O bairro mantém sete personagens únicos e objetos com identidade de instância. A migração lê todas as casas legadas, preserva cômodos e decoração e usa a turma da casa ativa. Objetos que estavam nas mãos de personagens descartados ficam no local de origem. O novo envelope mantém intactas as chaves antigas. Visitar não transporta; transportar leva também o objeto segurado. Duplicar copia ambientes e decoração, sem criar pessoas.

Casa, Prédio e Loja têm entrada estável mesmo quando os cômodos são reordenados. As portas funcionam por toque ao soltar, arraste com espera de 500 ms e controles acessíveis por teclado. A navegação por dois dedos acompanha o centro dos contatos; depois de 12 px de arraste individual, o dono não muda. O primeiro dedo solto encerra a navegação; terceiro contato, cancelamento e perda de foco descartam a prévia. Na rua, a câmera fica na apresentação e não é salva.

Os figurinos usam camadas SVG próprias, baseadas nas [referências oficiais de Rumi, Mira e Zoey](https://www.netflix.com/tudum/articles/kpop-demon-hunters-spirit-halloween-costumes). A revisão visual considerou jaqueta amarela com grafismos, shorts e botas de Rumi; camiseta preta estampada, saia amarela e botas rosa de Mira; blusa azul-turquesa, calça azul/amarela estampada e faixa de braço de Zoey. A variante de Mira para Rui e Léo usa bermuda. Cabelo e rosto permanecem os do personagem.

## Evidência de desenvolvimento

`bia-tdd` e `bia-quality` foram aplicadas, com política 1 sem alterações. Os testes de nomes falharam por ausência do comportamento antes da implementação; os testes de navegação reproduziram a ausência de dois dedos e o terceiro contato indevido. Após criar a interface mínima do bairro, os testes falharam pelas coleções vazias e pela ausência de transporte/construção, antes da implementação. O teste de persistência falhou por ausência de gravação; os figurinos falharam pela ausência dos novos looks. Um teste adicional reproduziu a interferência de personagens distantes na rua sobre a decoração interior e guiou a correção.

A jornada Playwright cobre nomear, vestir, sair levando objeto, construir, entrar, decorar, desfazer/refazer e recarregar. Os testes existentes foram adaptados à nova chave, às identidades de instância e ao gesto de dois dedos. Não há retries. As capturas de interiores, rua, bandejas e looks são geradas em `reports/` nas orientações 1024×768 e 768×1024.

Os resultados finais dos gates e o SHA de execução constam dos artefatos CI e mutação. Capturas em Chromium emulado não comprovam fluidez em Android real. A sessão observada com Bia e a medição em tablet Android continuam pendentes; não foram coletados dados da criança.

## Encaixe e cuidado

A profundidade usa o mesmo ponto dos pés durante e depois do arraste, com passagem livre na frente dos móveis. A cama aceita toda a área do colchão e oferece “Deitar na cama”; dormir mostra a coberta, acordar a retira. Roupas e pernas compartilham o mesmo encaixe sentado. O armário abre na cena para arrastar roupas e a gaveta permite guardar e retirar objetos. O objeto prevê a mão ou o centro do colo antes de soltar, com acomodação curta respeitando redução de movimento.

O desenho usa SVG rasterizado em dobro e canvas com duas amostras por pixel lógico, mantendo as coordenadas de interação. Os testes reproduziram primeiro a área insuficiente da cama, o objeto fora do colo e o redesenho que interrompia a acomodação; depois passaram. A jornada `care.spec.ts` cobre armário, gaveta, colo, cama, acordar e recarregar; as capturas `care-lap.png` e `care-bed.png` permitem conferir as poses.
