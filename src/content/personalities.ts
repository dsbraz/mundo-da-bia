import type { ActorId } from '../domain/types';

// Only the pool of touch reactions; character personalities come later.
export type ReactionPose = 'hop' | 'wiggle' | 'stretch' | 'purr' | 'clap' | 'cheer' | 'goof';
export interface Reaction { pose: ReactionPose; line: string; cue: 'poke' | 'cheer' | 'meow' | 'purr' }
const kids: Reaction[] = [
  { pose: 'hop', line: 'Oba! {nome} pulou alto!', cue: 'cheer' },
  { pose: 'wiggle', line: 'Hihi! {nome} sentiu cócegas!', cue: 'poke' },
  { pose: 'stretch', line: 'Oi! Eu sou {nome}!', cue: 'poke' },
];
const cats: Reaction[] = [
  { pose: 'purr', line: 'Rrrron… ({nome} amou o carinho)', cue: 'purr' },
  { pose: 'stretch', line: 'Miau! ({nome} quer mais carinho)', cue: 'meow' },
  { pose: 'wiggle', line: 'Prrr… {nome} fechou os olhinhos.', cue: 'purr' },
];
export const personalities: Record<ActorId, Reaction[]> = { bia: kids, luna: kids, leo: kids, rui: kids, mimi: cats, nino: cats, pipoca: cats };

/** Lines during a game, about the child who plays ({nome}): a spectator claps, the child celebrates or makes a funny face on a miss. */
export const gameLines = { clap: 'Vai, {nome}!', cheer: 'Uhuu, {nome}! Ida e volta!', goof: 'Ops! Quase, {nome}!' } as const;
/** Draws an index in [0, size) that is never `previous` (when size > 1). */
export function pickReaction(size: number, previous: number | undefined, random: () => number): number {
  if (previous === undefined || size < 2) return Math.min(size - 1, Math.floor(random() * size));
  const offset = 1 + Math.min(size - 2, Math.floor(random() * (size - 1)));
  return (previous + offset) % size;
}
