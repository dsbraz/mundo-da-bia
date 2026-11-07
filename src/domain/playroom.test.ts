import { expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import type { PieceKind } from './types';
import { encode, decode } from '../persistence/save';
it.each(['piano', 'tv', 'aquarium'])('liga e desliga %s sem perder a peça ou o salvamento', kind => {
  const state = initialWorld();
  state.layout.pieces.push({ id: 11, kind: kind as PieceKind, room: 'sala', x: 400, y: 300, color: 'original', flipped: false });
  state.layout.nextId = 12;
  const used = transition(state, { type: 'use', id: 11 }).state;
  expect(used.layout.pieces.at(-1)?.active).toBe(true);
  expect(decode(encode(used))).toEqual(used);
  const stopped = transition(used, { type: 'use', id: 11 }).state;
  expect(stopped.layout.pieces.at(-1)?.active).toBe(false);
  expect(stopped.layout.pieces).toHaveLength(11);
  if (kind === 'piano') { expect(used.show).toBe(true); expect(stopped.show).toBe(false); }
});
it('soltar uma peça nova fora dos limites mantém uma posição válida e recuperável', async () => {
  const { editWorld } = await import('./design');
  const state = editWorld(initialWorld(), { type: 'add', kind: 'piano', point: { x: 9999, y: 0 } });
  expect(decode(encode(state))).toEqual(state);
});
