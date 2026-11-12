import { lying, sitting } from './posture';
import type { Actor, Point } from '../domain/types';
export type VisualContext = 'interior' | 'street';
export const contextScale = (context: VisualContext = 'interior') => context === 'street' ? .6 : 1;
export const visualContext = (world: { streetWidth?: number }): VisualContext => world.streetWidth ? 'street' : 'interior';
export const actorScale = (actor: Actor, context: VisualContext = 'interior') => (actor.kind === 'cat' ? .78 : .86) * contextScale(context);
export function posePoint(actor: Actor, point: Point, context: VisualContext = 'interior'): Point {
  const scale = actorScale(actor, context), angle = lying(actor) ? -Math.PI / 2 : 0;
  const y = sitting(actor) ? 22 : 0;
  return { x: actor.x + (point.x * Math.cos(angle) - point.y * Math.sin(angle)) * scale,
    y: actor.y + (point.x * Math.sin(angle) + point.y * Math.cos(angle) + y) * scale };
}
export function handAnchor(actor: Actor): Point {
  const scale = actorScale(actor);
  return sitting(actor) ? { x: 0, y: -38 / scale - 22 } : { x: 28 / scale, y: -55 / scale };
}
export function settlePose(current: number, target: number, reduced: boolean) {
  return reduced || Math.abs(target - current) < .001 ? target : current + (target - current) * .18;
}
