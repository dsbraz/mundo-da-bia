import type { Actor } from './types';
/** Soft care cycle: whoever wakes from a rest is ready to eat again (no hungry or sad state, nothing new saved). */
export function wake(actor: Pick<Actor, 'resting'>): Pick<Actor, 'resting'> & Partial<Pick<Actor, 'fed'>> {
  return actor.resting ? { resting: false, fed: false } : { resting: false };
}
/** The rest button: falls asleep keeping the meal, or wakes ready to eat again. */
export function toggleRest(actor: Pick<Actor, 'resting'>): Partial<Actor> { return actor.resting ? wake(actor) : { resting: true }; }
