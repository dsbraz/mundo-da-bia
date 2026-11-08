import type { EditAction, Piece, Point, RoomId, World } from '../domain/types';
import { pieceBounds } from '../domain/layout';
import { orderedPieces } from './piece-art';

export function pieceAt(state: World, point: Point): Piece | undefined {
  return orderedPieces(state).reverse().find(piece => {
    const box = pieceBounds[piece.kind];
    return point.x >= piece.x && point.x <= piece.x + box.width && point.y >= piece.y && point.y <= piece.y + box.height;
  });
}
export function createBuildGesture(getState: () => World, select: (id: number | null) => void,
  preview: (action: EditAction | null) => void, commit: (action: EditAction) => void, pick = (point: Point) => pieceAt(getState(), point), scale = () => 1) {
  let active: { pointer: number; id: number; room: RoomId; offset: Point; start: Point; dragged: boolean } | null = null;
  function cancel() { active = null; preview(null); }
  function action(point: Point): EditAction {
    return { type: 'move', id: active!.id, point: { x: Math.round(point.x - active!.offset.x), y: Math.round(point.y - active!.offset.y) } };
  }
  return {
    start(pointer: number, point: Point) {
      if (active) return false;
      const piece = pick(point); select(piece?.id ?? null);
      if (!piece) return false;
      active = { pointer, id: piece.id, room: getState().room, offset: { x: point.x - piece.x, y: point.y - piece.y }, start: point, dragged: false };
      return true;
    },
    update(pointer: number, point: Point) {
      if (active?.pointer !== pointer) return;
      if (active.room !== getState().room) { cancel(); return; }
      active.dragged ||= Math.hypot(point.x - active.start.x, point.y - active.start.y) * scale() >= 8;
      if (active.dragged) preview(action(point));
    },
    end(pointer: number, point: Point) {
      if (active?.pointer !== pointer) return;
      if (active.room === getState().room && (active.dragged || Math.hypot(point.x - active.start.x, point.y - active.start.y) * scale() >= 8)) commit(action(point));
      cancel();
    }, cancel,
  };
}
