import type { Point } from '../domain/types';
export interface SingleGesture {
  start: (id: number, point: Point, pixels: Point) => boolean;
  update: (id: number, point: Point, pixels: Point) => void;
  end: (id: number, point: Point, pixels: Point) => void;
  cancel: () => void; reset?: () => void;
}
type Navigation = { start: (id: number, point: Point) => boolean; update: (id: number, point: Point) => void; end: (id: number, point: Point) => void; cancel: () => void };
export function twoFinger(single: SingleGesture, nav: Navigation): SingleGesture {
  const contacts = new Map<number, Point>();
  let first: number | null = null, origin: Point = { x: 0, y: 0 };
  let locked = false, navigating = false, blocked = false;
  function center() {
    const points = [...contacts.values()];
    return { x: (points[0]!.x + points[1]!.x) / 2, y: (points[0]!.y + points[1]!.y) / 2 };
  }
  function cancel() { single.cancel(); nav.cancel(); navigating = false; first = null; blocked = contacts.size > 0; }
  function start(id: number, point: Point, pixels: Point) {
    contacts.set(id, pixels);
    if (blocked) return true;
    if (navigating) { cancel(); return true; }
    if (first === null) {
      first = id; origin = pixels; locked = false;
      single.start(id, point, pixels); return true;
    }
    if (locked) return true;
    single.cancel(); navigating = true; nav.start(0, center()); return true;
  }
  function update(id: number, point: Point, pixels: Point) {
    if (!contacts.has(id)) return;
    contacts.set(id, pixels);
    if (blocked) return;
    if (navigating) { nav.update(0, center()); return; }
    if (id !== first) return;
    locked ||= Math.hypot(pixels.x - origin.x, pixels.y - origin.y) >= 8;
    if (locked) single.update(id, point, pixels);
  }
  function end(id: number, point: Point, pixels: Point) {
    if (!contacts.has(id)) return;
    contacts.set(id, pixels);
    if (!blocked && navigating) { const destination = center(); navigating = false; blocked = true; nav.end(0, destination); }
    else if (!blocked && id === first) { blocked = true; single.end(id, point, pixels); }
    contacts.delete(id);
    if (!contacts.size) { first = null; blocked = false; locked = false; }
  }
  return { start, update, end, cancel, reset: () => { cancel(); contacts.clear(); blocked = false; } };
}
