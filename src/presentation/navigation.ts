import type { Point, RoomId } from '../domain/types';
export interface NavigationActions { width: () => number; neighbor: (direction: 'left' | 'right') => RoomId | undefined; preview: (room: RoomId | null, fraction: number) => void; visit: (room: RoomId, fraction?: number) => void }
export function navigation(actions: NavigationActions) {
  let active: { id: number; x: number } | null = null;
  function cancel() { active = null; actions.preview(null, 0); }
  return {
    start(id: number, point: Point) { if (active) return false; active = { id, x: point.x }; return true; },
    update(id: number, point: Point) {
      if (active?.id !== id) return;
      const delta = point.x - active.x; if (Math.abs(delta) < 12) return;
      const room = actions.neighbor(delta < 0 ? 'right' : 'left');
      actions.preview(room ?? null, room ? Math.max(-1, Math.min(1, delta / actions.width())) : 0);
    },
    end(id: number, point: Point) {
      if (active?.id !== id) return;
      const delta = point.x - active.x; const room = actions.neighbor(delta < 0 ? 'right' : 'left');
      // Going: the preview stays where the finger left it, and the visit finishes the slide; staying: the preview springs back.
      if (room && Math.abs(delta) >= actions.width() / 4) { active = null; actions.visit(room, Math.max(-1, Math.min(1, delta / actions.width()))); } else cancel();
    }, cancel,
  };
}
