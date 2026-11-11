import { canPlace, freePlacement, onFloorPiece } from './placement';
import type { EditAction, Piece, PieceKind, World } from './types';
import { fixtures, fromPiece, pieceBounds, toPiece, validPlacement } from './layout';
import { seatKind, spotKind } from './furniture';
import { roomWidth, validPoint } from './geometry';

export interface History { past: World[]; present: World; future: World[] }
export function editWorld(state: World, action: EditAction): World {
  if (action.type === 'add') return addPiece(state, action.kind, action.point);
  if (action.type === 'finish') return { ...state, layout: { ...state.layout, rooms: { ...state.layout.rooms,
    [state.room]: { ...state.layout.rooms[state.room], [action.surface]: action.value } } } };
  if (action.type === 'clear') return state.layout.pieces.filter(p => p.room === state.room)
    .reduce((world, piece) => removePiece(world, piece), state);
  const piece = state.layout.pieces.find(p => p.id === action.id && p.room === state.room);
  return piece ? editPiece(state, piece, action) : state;
}
function editPiece(state: World, piece: Piece, action: Extract<EditAction, { id: number }>): World {
  if (action.type === 'remove') return removePiece(state, piece);
  const patch = action.type === 'move' ? action.point : action.type === 'flip' ? { flipped: !piece.flipped } : { color: action.color };
  const updated = action.type === 'move' ? onFloorPiece({ ...piece, ...patch }) : { ...piece, ...patch };
  if (!validPlacement(updated, roomWidth(state))) return state;
  if (action.type === 'move' && !canPlace(state, updated)) return state;
  const next = relocate(state, piece, updated);
  if (![...next.actors, ...next.items].every(p => validLocalPosition(state, p))) return state;
  return { ...next, layout: { ...state.layout, pieces: state.layout.pieces.map(p => p.id === piece.id ? updated : p) } };
}
function addPiece(state: World, kind: PieceKind, point?: { x: number; y: number }): World {
  if (fixtures.includes(kind) && state.layout.pieces.some(p => p.kind === kind && p.room === state.room)) return state;
  const box = pieceBounds[kind];
  const x = box.width > 400 ? box.x : Math.min(450, 1000 - box.width);
  const y = Math.min(300, 580 - box.height);
  const piece: Piece = { id: state.layout.nextId, kind, room: state.room, color: 'original', flipped: false, x, y };
  if (point) {
    const placed = onFloorPiece({ ...piece, x: Math.round(point.x - box.width / 2), y: Math.round(point.y - box.height / 2) });
    if (validPlacement(placed, roomWidth(state))) Object.assign(piece, placed);
  }
  if (!validPlacement(piece, roomWidth(state))) { piece.x = box.x; piece.y = box.y; }
  const placed = point ? (canPlace(state, piece) ? piece : undefined) : freePlacement(state, piece);
  if (!placed) return state;
  return { ...state, layout: { ...state.layout, nextId: piece.id + 1, pieces: [...state.layout.pieces, placed] } };
}
function removePiece(state: World, piece: Piece): World {
  return {
    ...state, layout: { ...state.layout, pieces: state.layout.pieces.filter(p => p.id !== piece.id) },
    actors: state.actors.map(a => a.room === piece.room && a.seat && seatKind(a.seat) === piece.kind ? { ...a, seat: null, resting: false } : a),
    items: state.items.map(i => i.room === piece.room && i.spot !== 'floor' && spotKind(i.spot) === piece.kind ? { ...i, spot: 'floor' } : i),
  };
}
function relocate(state: World, before: Piece, after: Piece): World {
  const point = (p: { x: number; y: number }) => fromPiece(after, toPiece(before, p));
  return { ...state,
    actors: state.actors.map(a => a.room === before.room && a.seat && seatKind(a.seat) === before.kind ? { ...a, ...point(a) } : a),
    items: state.items.map(i => i.room === before.room && i.spot !== 'floor' && spotKind(i.spot) === before.kind ? { ...i, ...point(i) } : i),
  };
}
export function history(present: World): History { return { past: [], present, future: [] }; }
export function recordEdit(h: History, state: World): History {
  if (state === h.present) return h;
  return { past: [...h.past.slice(-49), h.present], present: state, future: [] };
}
export function undo(h: History): History {
  const previous = h.past.at(-1);
  return previous ? { past: h.past.slice(0, -1), present: previous, future: [h.present, ...h.future] } : h;
}
export function redo(h: History): History {
  const next = h.future[0];
  return next ? { past: [...h.past, h.present], present: next, future: h.future.slice(1) } : h;
}

function validLocalPosition(state: World, point: import('./types').Point & { room: import('./types').RoomId }) {
  return !Object.hasOwn(state.layout.rooms, point.room) || validPoint(point, roomWidth(state, point.room));
}
