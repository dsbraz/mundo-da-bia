import type { Actor, ActorId, Needs } from './types';
import type { LiveAction, Neighborhood } from './neighborhood-types';
import type { Phase } from './clock';
import { sameLocation } from './location';
import { tastes } from './tastes';

/** Hunger, sleep and boredom (§3.1): pure, never saved, and only bands and the mood leave the domain (no number reaches the child). */
export type Need = 'fome' | 'sono' | 'tedio';
export type Band = 'bem' | 'pede' | 'precisa';
export type Mood = 'feliz' | 'normal' | 'triste';
export type Relief = 'prato' | 'favorito' | 'lanche' | 'brincar' | 'favorita' | 'escola' | 'abraco';

const minute = 60_000, joy = 60_000, ceiling = 100, unseen = 69;
const needs: readonly Need[] = ['fome', 'sono', 'tedio'];
/** Every session starts in the morning, rested: breakfast time. */
export const initialNeeds = (): Needs => ({ fome: 20, sono: 0, tedio: 0, alegria: 0 });
export const needsOf = (actor: Pick<Actor, 'needs'>): Needs => actor.needs ?? initialNeeds();
export function band(value: number): Band { return value < 40 ? 'bem' : value < 70 ? 'pede' : 'precisa'; }
export function bandOf(actor: Pick<Actor, 'needs'>, need: Need): Band { return band(needsOf(actor)[need]); }
/** Joy (under 60 s old) or all three fine is `feliz`; two needs in `precisa` is `triste`, and it ends the moment that stops being true. */
export function mood(actor: Pick<Actor, 'needs'>): Mood {
  const current = needsOf(actor), bands = needs.map(need => band(current[need]));
  if (current.alegria > 0 || bands.every(b => b === 'bem')) return 'feliz';
  return bands.filter(b => b === 'precisa').length >= 2 ? 'triste' : 'normal';
}

const reliefs: Record<Relief, Partial<Record<Need, number>> & { joy?: true }> = {
  prato: { fome: 60 }, favorito: { fome: ceiling, joy: true }, lanche: { fome: 30 },
  brincar: { tedio: 40 }, favorita: { tedio: 70, joy: true }, escola: { tedio: 40, joy: true }, abraco: { tedio: 20, joy: true },
};
/** What satisfies (§3.1): a dish −60 (the favourite to 0, with joy), the everyday snack or the cat's fish −30, a game −40 (the favourite
 *  −70, with joy), school −40 with joy, a hug −20 with joy. Nothing goes below 0, and a character always recovers. */
export function relieve(current: Needs, relief: Relief): Needs {
  const effect = reliefs[relief], next = { ...current, ...(effect.joy ? { alegria: joy } : {}) };
  for (const need of needs) next[need] = Math.max(0, current[need] - (effect[need] ?? 0));
  return next;
}

const sleepy: Record<Phase, number> = { manha: 2, tarde: 2, amanhecer: 2, entardecer: 12, noite: 12 };
/** Per minute: hunger +6; sleep +2 by day, +12 at dusk and night (falling 25 in bed and 12 elsewhere while resting); boredom +6 for the idle. */
function rates(actor: Actor, phase: Phase, idle: boolean): Record<Need, number> {
  const pace = tastes[actor.id].pace ?? {}, of = (need: Need, base: number) => base * (pace[need] ?? 1);
  if (actor.resting) return { fome: of('fome', 6), sono: actor.seat === 'bed' ? -25 : -12, tedio: 0 };
  return { fome: of('fome', 6), sono: of('sono', sleepy[phase]), tedio: idle ? of('tedio', 6) : 0 };
}
function grow(actor: Actor, elapsed: number, phase: Phase, idle: boolean, shown: boolean): Needs {
  const current = needsOf(actor), rate = rates(actor, phase, idle), top = shown ? ceiling : unseen;
  const next = { ...current, alegria: Math.max(0, current.alegria - elapsed) };
  for (const need of needs) next[need] = Math.min(top, Math.max(0, current[need] + rate[need] * elapsed / minute));
  return next;
}
/** A session's step of life: at most 60 s count (a hidden tab or days away are one minute), and whoever is not in the place shown
 *  stops at 69, so nobody is sad where the child cannot see. Invalid or no time changes nothing. */
export function live(town: Neighborhood, action: LiveAction): Neighborhood {
  const elapsed = Number.isFinite(action.elapsed) ? Math.min(action.elapsed, minute) : 0;
  if (elapsed <= 0) return town;
  const idle: readonly ActorId[] = action.idle ?? [];
  return { ...town, actors: town.actors.map(a => ({ ...a,
    needs: grow(a, elapsed, action.phase, idle.includes(a.id), sameLocation(a.location, town.location)) })) };
}
/** The needs of `from` copied into `world`'s characters (the local copy, or an undone neighborhood: time never goes back). */
export function feel<W extends { actors: readonly Actor[] }>(world: W, from: { actors: readonly Actor[] }): W {
  return { ...world, actors: world.actors.map(a => {
    const source = from.actors.find(f => f.id === a.id);
    return source?.needs ? { ...a, needs: source.needs } : a;
  }) };
}
