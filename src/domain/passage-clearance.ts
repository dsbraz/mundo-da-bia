import { editWorld } from './design';
import { pieceBounds } from './layout';
import { footprint, freePlacement, inPassages, overlap } from './placement';
import type { Layout, Piece, World } from './types';
/** A new room or floor may open the stairwell where pieces stood in `before`: each moves to the nearest free spot of its room, along its
 *  own row first (it stays against the same wall), then anywhere. With no free spot left the piece stays. A piece that already stood in
 *  a passage before is left alone, unless `before` is null (lot 8A: a save opened from before the stairwell, every piece moves out).
 *  Whoever sits on a moved piece and what lies on it move with it. */
export function clearPassages(state: World, before: Layout | null): World {
  const newly = (world: World, piece: Piece) => inPassages(world, piece) > 0 && (!before || inPassages({ layout: before }, piece) === 0);
  // The narrowest first: they find room along their wall, and a wide piece that no longer fits there steps forward.
  const order = [...state.layout.pieces].sort((a, b) => pieceBounds[a.kind].width - pieceBounds[b.kind].width);
  return order.reduce((world, piece) => newly(world, piece) ? clearPiece(world, world.layout.pieces.find(p => p.id === piece.id)!) : world, state);
}
function clearPiece(state: World, piece: Piece): World {
  const room = { ...state, room: piece.room };
  // Searched without the piece itself, so a spot still partly in the passage or against another piece never counts as free.
  const without = { ...room, layout: { ...room.layout, pieces: room.layout.pieces.filter(p => p.id !== piece.id) } };
  const apart = spaced(without);
  const spot = freePlacement(without, piece, [piece.y], apart) ?? freePlacement(without, piece, undefined, apart);
  return spot ? place(room, piece, spot, state) : lastResort(room, piece, state);
}
const place = (room: World, piece: Piece, spot: Piece, state: World): World =>
  ({ ...editWorld(room, { type: 'move', id: piece.id, point: { x: spot.x, y: spot.y } }), room: state.room });
/** With no spot apart, the nearest free one, as before: whoever stands in the room is set aside for the search (a piece is otherwise
 *  never put over someone standing, W3L-17), and stays where she was. */
function lastResort(room: World, piece: Piece, state: World): World {
  const aside = { ...room, actors: room.actors.filter(a => a.room !== piece.room || a.seat) };
  const without = { ...aside, layout: { ...aside.layout, pieces: aside.layout.pieces.filter(p => p.id !== piece.id) } };
  const spot = freePlacement(without, piece, [piece.y]) ?? freePlacement(without, piece);
  if (!spot) return state;
  const moved = place(aside, piece, spot, state);
  return { ...moved, actors: state.actors.map(a => moved.actors.find(m => m.id === a.id) ?? a) };
}
/** A spot that leaves a walkway (wider than the walker keeps from either piece) in front of and behind the piece, so with another piece
 *  it never closes the way to a passage, and that nobody stands on. */
const spaced = (world: World) => (piece: Piece) => {
  const area = footprint(piece); if (!area) return true;
  const around = { ...area, top: area.top - 45, bottom: area.bottom + 45 };
  const standing = world.actors.some(a => a.room === piece.room && !a.seat && overlap(area, { left: a.x, right: a.x + 1, top: a.y, bottom: a.y + 1 }) > 0);
  return !standing && world.layout.pieces.every(other => { const near = other.room === piece.room && footprint(other); return !near || overlap(around, near) === 0; });
};
