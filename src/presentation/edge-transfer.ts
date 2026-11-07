import type { Point, RoomId } from '../domain/types';
export interface EdgeActions {
  width: () => number; neighbor: (direction: 'left' | 'right') => RoomId | undefined;
  preview: (room: RoomId | null, point: Point | null) => void; progress: (value: number, side: 'left' | 'right') => void;
  commit: (room: RoomId, point: Point) => void;
}
export function edgeTransfer(actions: EdgeActions) {
  let side: 'left' | 'right' | null = null; let destination: RoomId | null = null;
  let elapsed = 0; let timer: ReturnType<typeof setInterval> | undefined; let point = { x: 0, y: 0 };
  function stop() { clearInterval(timer); timer = undefined; elapsed = 0; side = null; actions.progress(0, 'left'); }
  function cancel() { stop(); destination = null; actions.preview(null, null); }
  function update(next: Point) {
    point = next;
    if (destination) { actions.preview(destination, point); return; }
    const edge = point.x <= 48 ? 'left' : point.x >= actions.width() - 48 ? 'right' : null;
    if (edge === side) return;
    stop(); if (!edge) return;
    const room = actions.neighbor(edge); if (!room) return;
    side = edge;
    timer = setInterval(() => {
      elapsed += 25; actions.progress(elapsed / 500, edge);
      if (elapsed < 500) return;
      stop(); destination = room; actions.preview(room, point);
    }, 25);
  }
  return { update, cancel, end(next: Point) {
    const room = destination; stop(); destination = null;
    if (!room) return false;
    actions.preview(null, null); actions.commit(room, next); return true;
  }, crossed: () => destination !== null };
}
