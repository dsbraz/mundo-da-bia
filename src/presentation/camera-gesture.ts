import type { Point } from '../domain/types';
type Gesture = { start: (id: number, p: Point, pixels: Point) => boolean; update: (id: number, p: Point, pixels: Point) => void; end: (id: number, p: Point, pixels: Point) => void; cancel: () => void; reset?: () => void };
export function cameraGesture(base: Gesture, background: (p: Point) => boolean, pan: (dx: number, dy: number) => void) {
  let active: { id: number; start: Point; last: Point; background: boolean; dragged: boolean } | null = null;
  const contacts = new Set<number>();
  function resetBase() { if (base.reset) base.reset(); else base.cancel(); }
  function cancel() { resetBase(); active = null; }
  return {
    start(id: number, p: Point, pixels: Point) {
      contacts.add(id); if (contacts.size > 1) return false;
      active = { id, start: pixels, last: pixels, background: background(p), dragged: false };
      base.start(id, p, pixels); return true;
    },
    update(id: number, p: Point, pixels: Point) {
      if (active?.id !== id) return;
      if (!active.background) { base.update(id, p, pixels); return; }
      if (!active.dragged && Math.hypot(pixels.x - active.start.x, pixels.y - active.start.y) >= 8) { active.dragged = true; resetBase(); }
      if (active.dragged) pan(pixels.x - active.last.x, pixels.y - active.last.y);
      active.last = pixels;
    },
    end(id: number, p: Point, pixels: Point) {
      contacts.delete(id);
      if (active?.id !== id) return;
      if (!active.dragged) base.end(id, p, pixels);
      active = null;
    }, cancel,
    cancelPointer(id: number) { const owns = active?.id === id; contacts.delete(id); if (owns) cancel(); return owns; },
    reset() { cancel(); contacts.clear(); },
  };
}
