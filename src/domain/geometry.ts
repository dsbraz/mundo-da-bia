import type { Point } from './types';
export function validPoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y)
    && point.x >= 60 && point.x <= 940 && point.y >= 280 && point.y <= 540;
}
