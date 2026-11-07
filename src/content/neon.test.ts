import { expect, it } from 'vitest';
import { lookIds } from '../domain/types';
import { actors, looks } from './catalog';
import { initialWorld, transition } from '../domain/world';
import { decode, encode } from '../persistence/save';
it('oferece dois figurinos originais de palco e preserva a Bia loira e sua identidade', () => {
  expect(actors.bia.hair).toBe(0xe8c56c);
  expect(actors.bia.skin).toBe(0xf3d5bf);
  expect(lookIds).toContain('neon');
  expect(lookIds).toContain('aurora');
  expect(Object.values(looks).map(l => l.name)).toContain('Guardiã Aurora');
  const state = transition(initialWorld(), { type: 'dress', actor: 'bia', look: 'neon' }).state;
  expect(state.actors[0]).toMatchObject({ id: 'bia', look: 'neon' });
  expect(decode(encode(state))).toEqual(state);
});
