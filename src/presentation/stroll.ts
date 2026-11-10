import type { Point } from '../domain/types';
import { reducedFadeMs } from './motion';

/** A short walk drawn in the scene only (the save already holds where it ends): someone stepping aside for a game. */
export interface Stroll { from: Point; to: Point; start: number; duration: number; reduced: boolean }
/** Logical units per millisecond: a calm step, so stepping 200 aside takes about a second. */
export const strollSpeed = .2;
export function stroll(from: Point, to: Point, start: number, reduced: boolean): Stroll {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  return { from, to, start, reduced, duration: reduced ? 2 * reducedFadeMs : Math.max(120, distance / strollSpeed) };
}
/** Where the figure is drawn at `now`, how far its legs have walked and its opacity. With reduced motion it does not walk: it fades out
 *  where it stood and fades in where it goes. */
export function strollAt(step: Stroll, now: number): { point: Point; walked: number; direction: number; alpha: number; done: boolean } {
  const t = Math.min(1, Math.max(0, (now - step.start) / step.duration)), done = t >= 1, direction = Math.sign(step.to.x - step.from.x);
  if (step.reduced) return { point: t < .5 ? step.from : step.to, walked: 0, direction, alpha: Math.abs(1 - 2 * t), done };
  const eased = (1 - Math.cos(Math.PI * t)) / 2, distance = Math.hypot(step.to.x - step.from.x, step.to.y - step.from.y);
  const point = { x: step.from.x + (step.to.x - step.from.x) * eased, y: step.from.y + (step.to.y - step.from.y) * eased };
  return { point, walked: distance * eased, direction, alpha: 1, done };
}
