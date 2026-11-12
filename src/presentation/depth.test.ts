import { expect, it } from 'vitest';
import { initialWorld, transition } from '../domain/world';
import { fixture, pieceBounds } from '../domain/layout';
import { actorDepth, pieceDepth, objectDepth } from './piece-art';
it('mantém a profundidade dos pés ao soltar e permite passar diante de móveis baixos na tela', () => {
  const state = initialWorld(), actor = state.actors[0]!;
  const preview = { ...actor, x: 250, y: 530, seat: null };
  const after = transition(state, { type: 'move', actor: 'bia', point: preview }).state;
  expect(actorDepth(state, preview)).toBe(actorDepth(after, after.actors[0]!));
  const table = fixture(state, 'table')!;
  const frontTable = { ...table, y: 600 - pieceBounds.table.height };
  expect(actorDepth(after, after.actors[0]!)).toBeLessThan(pieceDepth(frontTable));
  expect(pieceDepth(frontTable)).toBeGreaterThan(520);
  expect(actorDepth(state, { ...actor, y: 300 })).toBeLessThan(pieceDepth(table));
});
it('deitado fica sobre o colchão, mesmo com pés acima da base da cama', () => {
  let state = transition(initialWorld(), { type: 'room', room: 'quarto' }).state;
  state = transition(state, { type: 'summon' }).state;
  state = transition(state, { type: 'sit', actor: 'bia', seat: '8.0' }).state;
  expect(actorDepth(state, state.actors[0]!)).toBeGreaterThan(pieceDepth(fixture(state, 'bed')!));
});
it('o corpo sentado fica à frente do encosto para receber objetos no colo', () => {
  const world = transition(initialWorld(), { type: 'sit', actor: 'bia', seat: '2.0' }).state;
  expect(actorDepth(world, world.actors[0]!)).toBeGreaterThan(pieceDepth(fixture(world, 'sofa')!));
});
it('keeps the initial loose microphone in front of the stage', () => {
  const world = initialWorld();
  const microphone = world.items.find(i => i.id === 'microfone')!;
  expect(objectDepth(world, microphone)).toBeGreaterThan(pieceDepth(world.layout.pieces.find(p => p.kind === 'stage')!));
});
