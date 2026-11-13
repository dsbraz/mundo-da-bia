import { expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { actorDepth, pieceDepth } from './piece-art';
import { drawnBox } from './drop-target';

// Lot 6B: in a new game nobody standing starts with legs behind a piece (the Bia's behind the coffee table): wherever a piece drawn in
// front of someone overlaps their legs (60 wide, 90 up from the feet), it must be drawn behind them.
it('no jogo novo, ninguém em pé começa com as pernas atrás de um móvel (a Bia e a mesinha)', () => {
  const world = initialWorld();
  for (const room of ['sala', 'quarto'] as const) {
    const state = { ...world, room }, standing = state.actors.filter(a => a.room === room && !a.seat);
    for (const actor of standing) for (const piece of state.layout.pieces.filter(p => p.room === room && pieceDepth(p) > 2)) {
      const box = drawnBox(piece), legs = { left: actor.x - 30, right: actor.x + 30, top: actor.y - 90, bottom: actor.y };
      const overlaps = legs.right > box.x && legs.left < box.x + box.width && legs.bottom > box.y && legs.top < box.y + box.height;
      if (overlaps) expect(actorDepth(state, actor), `${actor.id} atrás de ${piece.kind}`).toBeGreaterThan(pieceDepth(piece));
    }
  }
});
