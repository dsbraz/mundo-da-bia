import { expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { actorDepth, pieceDepth } from './piece-art';
import { drawnBox } from './drop-target';

// Lot 6B: in a new game nobody standing starts with legs behind a piece (the Bia's behind the coffee table): wherever a piece drawn in
// front of someone overlaps their legs (60 wide, 90 up from the feet), it must be drawn behind them.
it('no jogo novo, ninguém em pé começa com as pernas atrás de um móvel (a Bia e a mesinha)', () => {
  const world = initialWorld();
  const pairs = (['sala', 'quarto'] as const).flatMap(room => {
    const state = { ...world, room };
    return state.actors.filter(a => a.room === room && !a.seat).flatMap(actor => state.layout.pieces.filter(p => p.room === room && pieceDepth(p) > 2).map(piece => ({ state, actor, piece })));
  });
  const overlapping = pairs.filter(({ actor, piece }) => {
    const box = drawnBox(piece), legs = { left: actor.x - 30, right: actor.x + 30, top: actor.y - 90, bottom: actor.y };
    return legs.right > box.x && legs.left < box.x + box.width && legs.bottom > box.y && legs.top < box.y + box.height;
  });
  for (const { state, actor, piece } of overlapping) expect(actorDepth(state, actor), `${actor.id} atrás de ${piece.kind}`).toBeGreaterThan(pieceDepth(piece));
});
