import { expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import { mood, needsOf } from './needs';
import type { ActorId, Needs, World } from './types';

const needs = (patch: Partial<Needs>): Needs => ({ fome: 20, sono: 0, tedio: 0, alegria: 0, ...patch });
const withNeeds = (world: World, id: ActorId, patch: Partial<Needs>): World =>
  ({ ...world, actors: world.actors.map(a => a.id === id ? { ...a, needs: needs(patch) } : a) });
const who = (world: World, id: ActorId) => world.actors.find(a => a.id === id)!;

it('abraço (W3L-14): quem chega fica ao lado do outro, os dois perdem 20 de tédio e a tristeza some na hora', () => {
  const world = withNeeds(withNeeds(initialWorld(), 'leo', { fome: 90, sono: 80, tedio: 50 }), 'bia', { tedio: 30 });
  expect(mood(who(world, 'leo'))).toBe('triste');
  const { state, events } = transition(world, { type: 'hug', actor: 'bia', other: 'leo' });
  expect(mood(who(state, 'leo'))).toBe('feliz');
  expect(needsOf(who(state, 'leo'))).toEqual(needs({ fome: 90, sono: 80, tedio: 30, alegria: 60_000 }));
  expect(needsOf(who(state, 'bia'))).toEqual(needs({ tedio: 10, alegria: 60_000 }));
  // Bia (x 520) came from the right of Léo (x 420): she stands at his right, on the floor, and only her place changed.
  expect([who(state, 'bia').x, who(state, 'bia').y, who(state, 'bia').seat]).toEqual([490, 530, null]);
  expect({ ...who(state, 'leo'), needs: undefined }).toEqual({ ...who(world, 'leo'), needs: undefined });
  expect(events).toEqual([{ type: 'hugged', actor: 'bia', by: 'leo' }, { type: 'hugged', actor: 'leo', by: 'bia' }]);
});
it('abraçar quem está sentado: fica de pé ao lado, no chão; o outro continua sentado', () => {
  const { state } = transition(initialWorld(), { type: 'hug', actor: 'rui', other: 'luna' });
  expect(who(state, 'luna').seat).toBe('2.1');
  expect(who(state, 'rui').y).toBeGreaterThanOrEqual(470);
  expect(Math.abs(who(state, 'rui').x - who(state, 'luna').x)).toBe(70);
});
it('não há abraço consigo mesma nem com quem está noutro cômodo', () => {
  const world = initialWorld();
  expect(transition(world, { type: 'hug', actor: 'bia', other: 'bia' }).state).toBe(world);
  const away = { ...world, actors: world.actors.map(a => a.id === 'leo' ? { ...a, room: 'quarto' as const } : a) };
  expect(transition(away, { type: 'hug', actor: 'bia', other: 'leo' }).state).toBe(away);
});
it('na beira do cômodo, quem chega fica do outro lado', () => {
  const world = { ...initialWorld(), actors: initialWorld().actors.map(a => a.id === 'leo' ? { ...a, x: 40 } : a.id === 'bia' ? { ...a, x: 10 } : a) };
  expect(who(transition(world, { type: 'hug', actor: 'bia', other: 'leo' }).state, 'bia').x).toBe(110);
});
