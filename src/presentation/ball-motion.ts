import type { ItemKind } from '../domain/types';
import { contextScale, type VisualContext } from './pose';
/** The plaza ball, drawn only while it moves: thrown with the finger's speed, slowed by friction, spinning and bouncing off the edges of
 *  the floor, kicked by a child walking past. The save learns only where it stops (one `place`). */
export interface Ball { x: number; y: number; vx: number; vy: number; spin: number }
export interface Floor { left: number; right: number; top: number; bottom: number }
const friction = .0035, bounce = .6, maxSpeed = 1.5, stopSpeed = .02, radius = 19, frameMs = 16, reach = 50;
/** The ball is big enough to see and catch on the street (38 px); every other object keeps 40 px times the context scale. */
export function ballSize(kind: ItemKind, context: VisualContext) { return kind === 'bola' && context === 'street' ? 38 : 40 * contextScale(context); }
/** px/ms from the finger's samples over the last 100 ms (none: still), at most 1.5 px/ms. */
export function throwVelocity(samples: { t: number; x: number; y: number }[], now: number) {
  const recent = samples.filter(s => now - s.t <= 100), first = recent[0], last = recent.at(-1);
  if (!first || !last || last.t <= first.t) return { x: 0, y: 0 };
  const vx = (last.x - first.x) / (last.t - first.t), vy = (last.y - first.y) / (last.t - first.t), speed = Math.hypot(vx, vy);
  const cap = speed > maxSpeed ? maxSpeed / speed : 1;
  return { x: vx * cap, y: vy * cap };
}
export const resting = (ball: Ball) => ball.vx === 0 && ball.vy === 0;
/** Advances `ms` in steps of at most 16 ms; below 0.02 px/ms it stops. */
export function rollStep(ball: Ball, ms: number, floor: Floor): Ball {
  let b = { ...ball, ...edge(ball.x, ball.vx, floor.left, floor.right, 'x'), ...edge(ball.y, ball.vy, floor.top, floor.bottom, 'y') };
  for (let left = ms; left > 0 && !resting(b); left -= frameMs) {
    const dt = Math.min(frameMs, left), slow = Math.exp(-friction * dt);
    b = { ...b, vx: b.vx * slow, vy: b.vy * slow, x: b.x + b.vx * dt, y: b.y + b.vy * dt, spin: b.spin + b.vx * dt / radius };
    b = { ...b, ...edge(b.x, b.vx, floor.left, floor.right, 'x'), ...edge(b.y, b.vy, floor.top, floor.bottom, 'y') };
    if (Math.hypot(b.vx, b.vy) < stopSpeed) b = { ...b, vx: 0, vy: 0 };
  }
  return b;
}
function edge(at: number, speed: number, low: number, high: number, axis: 'x' | 'y') {
  const v = axis === 'x' ? 'vx' : 'vy';
  if (at < low) return { [axis]: low, [v]: Math.abs(speed) * bounce };
  if (at > high) return { [axis]: high, [v]: -Math.abs(speed) * bounce };
  return { [axis]: at, [v]: speed };
}
/** Where a ball comes to rest, simulated at once in the same 16 ms frames (reduced motion places it there directly). */
export function rollToRest(ball: Ball, floor: Floor): Ball {
  let b = ball;
  for (let n = 0; n < 2000 && !resting(b); n++) b = rollStep(b, frameMs, floor);
  return { ...b, vx: 0, vy: 0 };
}
/** A walker within reach sends a resting ball along the way they go (and away from them); otherwise null. */
export function kick(at: { x: number; y: number }, walker: { x: number; y: number; direction: number }, scale: number): Ball | null {
  const dx = at.x - walker.x, dy = at.y - walker.y, distance = Math.hypot(dx, dy);
  if (!walker.direction || distance > reach * scale) return null;
  return { x: at.x, y: at.y, vx: walker.direction * .55 + dx / (distance || 1) * .1, vy: dy / (distance || 1) * .15, spin: 0 };
}
