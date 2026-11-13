import { pieceBounds } from './layout';
import { roomWidth } from './geometry';
import { sitsOn } from './seats';
import type { Actor, Piece, Transition, World } from './types';

/** Who sits on `piece` when it is a toilet: a touch on it then flushes. */
export const onToilet = (state: World, piece: Piece): Actor | undefined =>
  piece.kind === 'toilet' ? state.actors.find(a => sitsOn(a, piece)) : undefined;
/** The flush: whoever sits on the toilet gets up and stands beside it, on the side with room, so the swirl in the bowl stays in view (the
 *  toilet keeps no state); with nobody there nothing happens. */
export function flush(state: World, piece: Piece): Transition {
  const sitter = onToilet(state, piece);
  if (!sitter) return { state, events: [] };
  const { width, height } = pieceBounds.toilet, right = piece.x + width + 40;
  const x = right <= roomWidth(state) - 60 ? right : Math.max(60, piece.x - 40), y = Math.min(540, piece.y + height + 30);
  return {
    state: { ...state, actors: state.actors.map(a => a === sitter ? { ...a, x, y, seat: null, resting: false } : a) },
    events: [{ type: 'furniture', piece: piece.id, actor: sitter.id }],
  };
}
