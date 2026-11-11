import type { PieceKind, Transition, World } from './types';
/** Pieces that answer a touch by switching `active` (the only state they keep): the old set plus sink, washer, planter, bookcase and picnic
 *  table. The stove and the kitchen cart open the kitchen bench instead (W3-16). */
export const usableKinds: readonly PieceKind[] = ['bath', 'desk', 'speaker', 'mirror', 'piano', 'tv', 'aquarium', 'reading-lamp', 'sink', 'washer', 'planter', 'bookcase', 'picnic-table'];
export function usePiece(state: World, id: number): Transition {
  const piece = state.layout.pieces.find(p => p.id === id && p.room === state.room);
  if (!piece || !usableKinds.includes(piece.kind)) return { state, events: [] };
  return {
    state: { ...state, show: piece.kind === 'piano' ? !piece.active : state.show, layout: { ...state.layout, pieces: state.layout.pieces.map(p => p.id === id ? { ...p, active: !p.active } : p) } },
    events: [{ type: 'furniture', piece: id }],
  };
}
