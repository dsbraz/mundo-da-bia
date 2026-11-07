import type { Point } from '../domain/types';
export function streetPan(get: () => number, set: (x: number) => void, max: () => number, width: () => number) {
  let active: { x: number; camera: number } | null = null;
  return {
    start(_id: number, p: Point) { active = { x: p.x, camera: get() }; return true; },
    update(_id: number, p: Point) {
      if (!active || Math.abs(p.x - active.x) < 12) return;
      set(Math.max(0, Math.min(max(), active.camera - (p.x - active.x) * 1000 / width())));
    },
    end(_id: number, p: Point) { this.update(0, p); active = null; },
    cancel() { if (active) set(active.camera); active = null; },
  };
}
