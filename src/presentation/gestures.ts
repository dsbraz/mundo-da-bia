import type { Point } from '../domain/types';
export function createGesture(move: (point: Point) => void) {
  let pointer: number | null = null;
  return {
    start(id: number): boolean {
      if (pointer !== null) return false;
      pointer = id;
      return true;
    },
    move(id: number, point: Point) { if (pointer === id) move(point); },
    end(id: number) { if (pointer === id) pointer = null; },
    cancel() { pointer = null; },
  };
}
