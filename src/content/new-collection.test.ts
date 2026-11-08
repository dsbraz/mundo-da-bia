import { expect, it } from 'vitest';
import { lookIds, pieceKinds } from '../domain/types';
import { initialWorld, transition } from '../domain/world';
import { editWorld } from '../domain/design';
import { decode, encode } from '../persistence/save';
it('oferece três novos looks e móveis que sobrevivem ao recarregamento', () => {
  expect(lookIds).toEqual(expect.arrayContaining(['denim', 'rehearsal', 'overalls']));
  expect(pieceKinds).toEqual(expect.arrayContaining(['armchair', 'reading-lamp', 'side-table']));
  for (const look of ['denim', 'rehearsal', 'overalls'] as const) {
    const state = transition(initialWorld(), { type: 'dress', actor: 'bia', look }).state;
    expect(decode(encode(state))).toEqual(state);
  }
  let state = initialWorld();
  for (const kind of ['armchair', 'reading-lamp', 'side-table'] as const) state = editWorld(state, { type: 'add', kind });
  expect(decode(encode(state))).toEqual(state);
});
it('senta na poltrona e liga a luminária sem alterar os móveis vizinhos', () => {
  let state = editWorld(initialWorld(), { type: 'add', kind: 'armchair' });
  state = editWorld(state, { type: 'add', kind: 'reading-lamp' });
  const lamp = state.layout.pieces.at(-1)!;
  state = transition(state, { type: 'sit', actor: 'bia', seat: 'armchair' }).state;
  const chair = state.layout.pieces.find(p => p.kind === 'armchair')!;
  expect(state.actors[0]).toMatchObject({ seat: 'armchair', x: chair.x + 90, y: chair.y + 145 });
  state = transition(state, { type: 'use', id: lamp.id }).state;
  expect(state.layout.pieces.at(-1)?.active).toBe(true);
  expect(decode(encode(state))).toEqual(state);
});
