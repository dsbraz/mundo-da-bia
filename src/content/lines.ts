import type { ActorId, PresentationEvent } from '../domain/types';

/** The events a character speaks about (W3-02). `cooked`, `ate`, `harvested`, `served`, `letter` and `hint` come with the wave 3 systems. */
export const spokenEvents = ['named', 'dressed', 'picked', 'dropped', 'fed', 'rested', 'cooked', 'ate', 'harvested', 'served', 'letter', 'hint'] as const;
export type SpokenEvent = typeof spokenEvents[number];
type Pools = Record<SpokenEvent, string[]>;

// Every line: at most 6 words with a two-word name, {nome} interpolated, no gendered word (names can change), 3 to 5 variations in turn.
const human: Pools = {
  named: ['Oi! Agora sou {nome}!', '{nome}? Que nome bom!', 'Pode chamar de {nome}!'],
  dressed: ['{nome} amou o look novo!', 'Look novo! {nome} aprovou!', '{nome} combinou as cores!'],
  picked: ['Oba! {nome} pegou!', '{nome} leva com cuidado.', '{nome} segura firme!'],
  dropped: ['{nome} deixou aqui.', 'Fica aqui, {nome} já volta.', '{nome} guardou no lugar.'],
  fed: ['Hummm! {nome} adorou!', 'Que delícia! {nome} comeu tudo!', '{nome} ficou de barriga cheia!'],
  rested: ['{nome} está descansando.', 'Uma pausa para {nome}.', '{nome} respira fundo. Ahh…'],
  cooked: ['{nome} cozinhou! Quem prova?', 'Receita feita por {nome}!', 'Cheirinho bom! Obra de {nome}!'],
  ate: ['Nham! {nome} amou o prato!', '{nome} raspou o prato!', 'Que sabor! {nome} quer mais!'],
  harvested: ['{nome} colheu! Olha só!', 'Da horta para {nome}!', '{nome} encheu a cesta!'],
  served: ['{nome} serviu! Bom apetite!', 'Pedido entregue por {nome}!', '{nome} atendeu com carinho!'],
  letter: ['{nome} achou uma carta!', 'Carta nova para {nome}!', 'Quem escreveu, {nome}? Vamos ver!'],
  hint: ['{nome} acha que falta algo.', 'Hmm… {nome} teve um palpite!', 'E se trocar, {nome}?'],
};
const cat: Pools = {
  named: ['Miau! ({nome} gostou do nome)', 'Miau? ({nome} virou a orelha)', 'Prrr… ({nome} aprovou o nome)'],
  dressed: ['Miau! ({nome} amou o look)', 'Prrr… ({nome} desfila pela casa)', 'Miau? ({nome} cheirou a roupa)'],
  picked: ['Miau? ({nome} quer brincar)', 'Prrr… ({nome} espiou de perto)', 'Miau! ({nome} deu uma patada)'],
  dropped: ['Miau! ({nome} largou)', '({nome} empurrou com a pata)', 'Miau… ({nome} perdeu o interesse)'],
  fed: ['Miau! ({nome}: tem mais peixinho?)', 'Nham! ({nome} lambeu os bigodes)', 'Rrrron… ({nome} comeu tudinho)'],
  rested: ['Rrrron… {nome} cochila.', 'Zzz… {nome} sonha com peixe.', 'Prrr… {nome} se enrolou.'],
  cooked: ['Miau? ({nome} cheira a panela)', 'Prrr… ({nome} vigiou o fogão)', 'Miau! ({nome} quer provar)'],
  ate: ['Nham! ({nome} amou o prato)', 'Miau! ({nome} quer repetir)', 'Rrrron… ({nome} limpou o prato)'],
  harvested: ['Miau! ({nome} cavou a terra)', 'Prrr… ({nome} achou uma folha)', 'Miau? ({nome} cheirou a horta)'],
  served: ['Miau! ({nome} trouxe o prato)', 'Prrr… ({nome} serviu com estilo)', 'Miau? ({nome} esperou o carinho)'],
  letter: ['Miau! ({nome} sentou na carta)', 'Prrr… ({nome} trouxe o correio)', 'Miau? ({nome} cheirou o envelope)'],
  hint: ['Miau? ({nome} olhou a tigela)', 'Prrr… ({nome} tem uma ideia)', '({nome} apontou com a pata)'],
};
/** Each character's own lines, over the shared ones. The Bia (family, 11/2026): curious, clever, independent and affectionate, never
 *  babyish; batata frita and pastel are her favourites. */
const own: Partial<Record<ActorId, Partial<Pools>>> = {
  bia: {
    named: ['Oi! Agora sou {nome}!', '{nome}? Combinou comigo!', 'Nome novo, {nome}! Gostei!'],
    dressed: ['{nome} escolheu sem ajuda!', 'Look novo! {nome} aprovou!', '{nome} combinou cada cor!'],
    picked: ['Deixa que {nome} carrega!', '{nome} pega, pode deixar!', 'Achei! {nome} leva isso.'],
    dropped: ['{nome} guardou no lugar certo.', 'Fica aqui, {nome} já volta.', '{nome} organizou tudo!'],
    fed: ['Hum! {nome} recarregou a energia!', 'Valeu! {nome} ama um lanche.', '{nome} comeu e quer abraço!'],
    rested: ['{nome} pensa melhor descansando.', 'Pausa rápida, {nome} já volta!', '{nome} descansa e planeja tudo.'],
    cooked: ['{nome} cozinhou sem ajuda!', 'Receita de {nome}! Quem prova?', '{nome} fez e quer dividir!', 'Batata frita? {nome} sabe fazer!'],
    ate: ['{nome} amou! Depois, pastel?', 'Nham! {nome} quer a receita!', 'Delícia! {nome} adivinha os ingredientes!'],
    harvested: ['{nome} colheu! Quantas cores!', '{nome} quer saber: cresce mais?', 'Plantou, cuidou, colheu: {nome}!'],
    served: ['{nome} serviu com carinho!', '{nome} atende, pode deixar!', 'Saindo! {nome} caprichou para você.'],
    letter: ['Uma carta! {nome} lê agora!', '{nome} quer saber quem mandou!', 'Carta nova! {nome} adora surpresas!'],
    hint: ['{nome} descobriu: falta um!', 'Hmm… {nome} tem um palpite!', '{nome} pensou: e se trocar?'],
  },
  luna: {
    cooked: ['{nome} mediu cada ingrediente!', 'Receita testada por {nome}!', '{nome} cozinhou com cuidado!'],
    ate: ['Nham! Agora uma pizza, {nome}?', '{nome} examinou: aprovado!', 'Hum! {nome} quer outro!'],
  },
  leo: {
    cooked: ['{nome} usou tudo da horta!', 'Calma e capricho: {nome} cozinhou!', '{nome} cozinhou com paciência!'],
    ate: ['Gosto de horta, {nome} aprova!', 'Nham! {nome} queria bolo também!', '{nome} comeu bem devagar.'],
  },
  rui: {
    cooked: ['{nome} inventou na hora!', 'Experimento de {nome} deu certo!', 'Tcharam! {nome} cozinhou!'],
    ate: ['Uau! {nome} comeu num segundo!', 'Delícia! E pipoca, {nome}?', '{nome} já quer outra aventura!'],
  },
  mimi: { ate: ['Miau! ({nome} prefere petisco)', 'Prrr… ({nome} lambeu a pata)', 'Miau? ({nome} quer sobremesa)'] },
  nino: { ate: ['Miau! ({nome} quer leitinho)', '({nome} explorou o prato todo)', 'Miau? ({nome} cheirou e aprovou)'] },
  pipoca: { ate: ['Miau! ({nome} quer ovinho)', 'Prrr… ({nome} comeu e cochilou)', 'Rrrron… ({nome} amou de verdade)'] },
};
/** A cat offered a dish it does not eat sniffs it (§3.2): never disgust, it just prefers fish. Cats only. */
const sniffed = ['Miau? ({nome}: prefiro peixinho)', 'Sniff… ({nome} quer peixinho)', 'Miau! ({nome} sonha com peixinho)'];
const spoken = (type: PresentationEvent['type']): type is SpokenEvent => (spokenEvents as readonly string[]).includes(type);
/** The lines a character takes turns on for `type` (its own, else the shared human or cat ones); null for an event nobody speaks. */
export function linePool(type: PresentationEvent['type'], id: ActorId, isCat: boolean): readonly string[] | null {
  if (type === 'sniffed') return isCat ? sniffed : null;
  if (!spoken(type)) return null;
  return own[id]?.[type] ?? (isCat ? cat : human)[type];
}
/** Every line, for the content checks. */
export const allLines = () => [...[human, cat, ...Object.values(own)].flatMap(pools => Object.values(pools).flat()), ...sniffed];
