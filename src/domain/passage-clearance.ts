import { editWorld } from './design';
import { footprint, freePlacement, inPassages, overlap } from './placement';
import type { Layout, Piece, World } from './types';
/** A new room or floor may open a doorway, the stairs or the stairwell where pieces stood in `before`: each moves to the nearest free
 *  spot of its room, along its own row first (it stays against the same wall), then anywhere. With no free spot left the piece stays.
 *  A piece that already stood in a passage before (an older save) is left alone. Whoever sits on a moved piece and what lies on it move
 *  with it. */
export function clearPassages(state: World, before: Layout): World {
  const newly = (world: World, piece: Piece) => inPassages(world, piece) > 0 && inPassages({ layout: before }, piece) === 0;
  return state.layout.pieces.reduce((world, piece) => newly(world, piece) ? clearPiece(world, piece) : world, state);
}
function clearPiece(state: World, piece: Piece): World {
  const room = { ...state, room: piece.room };
  // Searched without the piece itself, so a spot still partly in the passage or against another piece never counts as free.
  const without = { ...room, layout: { ...room.layout, pieces: room.layout.pieces.filter(p => p.id !== piece.id) } };
  const apart = spaced(without);
  const spot = freePlacement(without, piece, [piece.y], apart) ?? freePlacement(without, piece, undefined, apart)
    ?? freePlacement(without, piece, [piece.y]) ?? freePlacement(without, piece);
  return spot ? { ...editWorld(room, { type: 'move', id: piece.id, point: { x: spot.x, y: spot.y } }), room: state.room } : state;
}
/** A spot that leaves a walkway (wider than the walker keeps from either piece) in front of and behind the piece, so with another piece
 *  it never closes the way to a passage, and that nobody stands on. */
const spaced = (world: World) => (piece: Piece) => {
  const area = footprint(piece); if (!area) return true;
  const around = { ...area, top: area.top - 45, bottom: area.bottom + 45 };
  const standing = world.actors.some(a => a.room === piece.room && !a.seat && overlap(area, { left: a.x, right: a.x + 1, top: a.y, bottom: a.y + 1 }) > 0);
  return !standing && world.layout.pieces.every(other => { const near = other.room === piece.room && footprint(other); return !near || overlap(around, near) === 0; });
};
