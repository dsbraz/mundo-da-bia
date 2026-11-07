import { expect, it } from 'vitest';
import { initialWorld, transition } from '../domain/world';
import { fixture, pieceBounds } from '../domain/layout';
import { actorDepth, pieceDepth } from './piece-art';
it('mantém a profundidade dos pés ao soltar e permite passar diante de móveis baixos na tela', () => {
  const state = initialWorld(), actor = state.actors[0]!;
  const preview = { ...actor, x: 250, y: 530, seat: null };
  const after = transition(state, { type: 'move', actor: 'bia', point: preview }).state;
  expect(actorDepth(state, preview)).toBe(actorDepth(after, after.actors[0]!));
  const table = fixture(state, 'table')!;
  const frontTable = { ...table, y: 600 - pieceBounds.table.height };
  expect(actorDepth(after, after.actors[0]!)).toBeGreaterThan(pieceDepth(frontTable));
  expect(actorDepth(state, { ...actor, y: 300 })).toBeLessThan(pieceDepth(table));
});
it('deitado fica sobre o colchão, mesmo com pés acima da base da cama', () => {
  let state = transition(initialWorld(), { type: 'room', room: 'quarto' }).state;
  state = transition(state, { type: 'summon' }).state;
  state = transition(state, { type: 'sit', actor: 'bia', seat: 'bed' }).state;
  expect(actorDepth(state, state.actors[0]!)).toBeGreaterThan(pieceDepth(fixture(state, 'bed')!));
});
