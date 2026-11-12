import type { ActorId, CropId } from '../domain/types';

export type ReactionPose = 'hop' | 'wiggle' | 'stretch' | 'purr' | 'clap' | 'cheer' | 'goof' | 'shrug';
export interface Reaction { pose: ReactionPose; line: string; cue: 'poke' | 'cheer' | 'meow' | 'purr' }
/** What each character says when touched (W3-01): the Bia is affectionate, clever and does things on her own (family, 11/2026). */
export const personalities: Record<ActorId, Reaction[]> = {
  bia: [
    { pose: 'hop', line: 'Abraço? {nome} adora abraço!', cue: 'cheer' },
    { pose: 'wiggle', line: 'Hmm… {nome} teve uma ideia!', cue: 'poke' },
    { pose: 'stretch', line: 'Deixa que {nome} resolve!', cue: 'poke' },
  ],
  luna: [
    { pose: 'hop', line: 'Tum-tum! {nome} ouviu o coração!', cue: 'cheer' },
    { pose: 'wiggle', line: '{nome} quer saber: tudo bem?', cue: 'poke' },
    { pose: 'stretch', line: 'Pizza hoje? {nome} topa!', cue: 'poke' },
  ],
  leo: [
    { pose: 'stretch', line: 'Psiu! {nome} ouviu um passarinho.', cue: 'poke' },
    { pose: 'wiggle', line: '{nome} cuida de cada broto.', cue: 'poke' },
    { pose: 'hop', line: 'Bolo de cenoura? {nome} quer!', cue: 'cheer' },
  ],
  rui: [
    { pose: 'hop', line: 'Aventura! {nome} topa tudo!', cue: 'cheer' },
    { pose: 'wiggle', line: 'Hahaha! {nome} riu demais!', cue: 'poke' },
    { pose: 'stretch', line: 'Piquenique? {nome} leva a cesta!', cue: 'poke' },
  ],
  mimi: [
    { pose: 'purr', line: 'Rrrron… ({nome} amou o carinho)', cue: 'purr' },
    { pose: 'stretch', line: 'Miau! ({nome} quer petisco)', cue: 'meow' },
    { pose: 'wiggle', line: 'Prrr… {nome} fechou os olhinhos.', cue: 'purr' },
  ],
  nino: [
    { pose: 'stretch', line: 'Miau? ({nome} viu algo ali)', cue: 'meow' },
    { pose: 'purr', line: 'Rrrron… ({nome} amou o carinho)', cue: 'purr' },
    { pose: 'wiggle', line: 'Prrr… {nome} piscou devagar.', cue: 'purr' },
  ],
  pipoca: [
    { pose: 'wiggle', line: 'Miau! ({nome} quer brincar)', cue: 'meow' },
    { pose: 'purr', line: 'Rrrron… ({nome} amou o carinho)', cue: 'purr' },
    { pose: 'stretch', line: 'Prrr… {nome} rolou no tapete.', cue: 'purr' },
  ],
};
/** The Turma card: a motto of up to 4 words, the social gesture (drawn in W3-08), the voice (pitch of the touch sound) and the favourite
 *  crop. Gesture, voice and crop of the six others are proposals still to be watched with the child. */
export interface Card { motto: string; gesture: 'abraco' | 'toca-aqui'; voice: number; crop: CropId }
export const cards: Record<ActorId, Card> = {
  bia: { motto: 'Deixa comigo! Abraço?', gesture: 'abraco', voice: 1.15, crop: 'morango' },
  luna: { motto: 'Posso ouvir seu coração?', gesture: 'toca-aqui', voice: 1.25, crop: 'tomate' },
  leo: { motto: 'Plantei, reguei, cresceu!', gesture: 'abraco', voice: 1, crop: 'cenoura' },
  rui: { motto: 'Aventura? Eu topo!', gesture: 'toca-aqui', voice: .9, crop: 'milho' },
  mimi: { motto: 'Miau! Cadê meu petisco?', gesture: 'abraco', voice: 1.1, crop: 'alface' },
  nino: { motto: 'Miau? Vamos explorar?', gesture: 'toca-aqui', voice: .85, crop: 'abobora' },
  pipoca: { motto: 'Prrr… Ovinho e soneca!', gesture: 'abraco', voice: 1.3, crop: 'milho' },
};

/** Lines during a game, about the child who plays ({nome}): a spectator claps, the child celebrates or makes a funny face on a miss. */
export const gameLines = { clap: 'Vai, {nome}!', cheer: 'Uhuu, {nome}! Ida e volta!', goof: 'Ops! Quase, {nome}!' } as const;
/** Draws an index in [0, size) that is never `previous` (when size > 1). */
export function pickReaction(size: number, previous: number | undefined, random: () => number): number {
  if (previous === undefined || size < 2) return Math.min(size - 1, Math.floor(random() * size));
  const offset = 1 + Math.min(size - 2, Math.floor(random() * (size - 1)));
  return (previous + offset) % size;
}
