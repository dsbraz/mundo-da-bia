import type { Actor, Point } from '../domain/types';
export const actorScale = (actor: Actor) => actor.kind === 'cat' ? .78 : .86;
export function posePoint(actor: Actor, point: Point): Point {
  const scale = actorScale(actor), angle = actor.seat === 'bed' ? -Math.PI / 2 : 0;
  const y = actor.seat && actor.seat !== 'bed' ? 22 : 0;
  return { x: actor.x + (point.x * Math.cos(angle) - point.y * Math.sin(angle)) * scale,
    y: actor.y + (point.x * Math.sin(angle) + point.y * Math.cos(angle) + y) * scale };
}
export function handAnchor(actor: Actor): Point {
  const scale = actorScale(actor);
  return actor.seat && actor.seat !== 'bed' ? { x: 0, y: -38 / scale - 22 } : { x: 28 / scale, y: -55 / scale };
}
export function settlePose(current: number, target: number, reduced: boolean) {
  return reduced || Math.abs(target - current) < .001 ? target : current + (target - current) * .18;
}
