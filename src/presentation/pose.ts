import { lying, sitting } from './posture';
import type { Actor, Point } from '../domain/types';
import { isAdult } from '../domain/family';
export type VisualContext = 'interior' | 'street';
export const contextScale = (context: VisualContext = 'interior') => context === 'street' ? .6 : 1;
export const visualContext = (world: { streetWidth?: number }): VisualContext => world.streetWidth ? 'street' : 'interior';
export const actorScale = (actor: Actor, context: VisualContext = 'interior') => (actor.kind === 'cat' ? .78 : .86) * contextScale(context);
/** The drawing's height: a cat, a child, and a grown-up 1.2× a child (W3L-24, §3.6). */
export const figureHeight = (actor: Pick<Actor, 'id' | 'kind'>) => actor.kind === 'cat' ? 120 : isAdult(actor.id) ? 264 : 220;
/** How much taller than a child's drawing: every height measured on a child's figure (knees, hand, seat, head) scales by it. */
export const stature = (actor: Pick<Actor, 'id' | 'kind'>) => actor.kind === 'cat' ? 1 : figureHeight(actor) / 220;
/** How far the body sinks into a seat: a grown-up's longer thighs take it lower, so the hips rest on the cushion. */
export const seatDrop = (actor: Pick<Actor, 'id' | 'kind'>) => isAdult(actor.id) ? 46 : 22;
export function posePoint(actor: Actor, point: Point, context: VisualContext = 'interior'): Point {
  const scale = actorScale(actor, context), angle = lying(actor) ? -Math.PI / 2 : 0;
  const y = sitting(actor) ? seatDrop(actor) : 0;
  return { x: actor.x + (point.x * Math.cos(angle) - point.y * Math.sin(angle)) * scale,
    y: actor.y + (point.x * Math.sin(angle) + point.y * Math.cos(angle) + y) * scale };
}
export function handAnchor(actor: Actor): Point {
  const scale = actorScale(actor), tall = stature(actor);
  return sitting(actor) ? { x: 0, y: -38 / scale * tall - seatDrop(actor) } : { x: 28 / scale, y: -55 / scale * tall };
}
export function settlePose(current: number, target: number, reduced: boolean) {
  return reduced || Math.abs(target - current) < .001 ? target : current + (target - current) * .18;
}
