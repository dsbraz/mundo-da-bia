import { editWorld } from './design';
import { freePlacement, inPassages } from './placement';
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
  const spot = freePlacement(without, piece, [piece.y]) ?? freePlacement(without, piece);
  return spot ? { ...editWorld(room, { type: 'move', id: piece.id, point: { x: spot.x, y: spot.y } }), room: state.room } : state;
}
