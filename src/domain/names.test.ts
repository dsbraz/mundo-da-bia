import { expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import { decode, encode } from '../persistence/save';
it('nomeia humanos e gatos por identidade, aceita repetidos e restaura o original', () => {
  let state = initialWorld();
  for (const actor of ['bia', 'mimi'] as const) state = transition(state, { type: 'name', actor, name: '  Lua  ' }).state;
  expect(state.actors.filter(a => a.name === 'Lua').map(a => a.id)).toEqual(['bia', 'mimi']);
  expect(decode(encode(state))).toEqual(state);
  state = transition(state, { type: 'name', actor: 'bia', name: '' }).state;
  expect(state.actors[0]!.name).toBeUndefined();
  expect(state.actors[4]!.name).toBe('Lua');
});
it('limita nomes a 24 caracteres e permite nomear personagens em outro cômodo', () => {
  const state = transition(initialWorld(), { type: 'room', room: 'quarto' }).state;
  const next = transition(state, { type: 'name', actor: 'bia', name: '⭐'.repeat(25) }).state;
  expect(Array.from(next.actors[0]!.name!)).toHaveLength(24);
  expect(state.actors[0]!.name).toBeUndefined();
});
