/** Weight, drawn only: a character carried by the finger hangs above its shadow (which stays on the floor), legs dangling and tilted by
 *  the speed; released, it falls back and squashes. A dropped object falls a little and bounces once. With reduced motion none of it moves. */
export const carryLift = 16, dropMs = 280;
const fallMs = 110, squashMs = dropMs - fallMs, maxSquash = -.08, legPx = 6, leanPerSpeed = .35, maxLean = .2;
export interface CarryFrame { lift: number; lean: number; legs: number[] }
/** Weight by size (W3L-17, §3.7): a cat, light and small, tilts more and its paws swing faster. */
const builds = { human: { lean: leanPerSpeed, max: maxLean, period: 170 }, cat: { lean: .5, max: .3, period: 115 } } as const;
/** `time` in ms, `speed` the finger's px/ms along x; lift in scene px, legs in the figure's own px. */
export function carryFrame(time: number, speed: number, scale: number, reduced: boolean, kind: 'human' | 'cat' = 'human'): CarryFrame {
  if (reduced) return { lift: 0, lean: 0, legs: [0, 0] };
  const build = builds[kind], swing = Math.sin(time / build.period);
  return { lift: carryLift * scale, lean: Math.max(-build.max, Math.min(build.max, speed * build.lean)), legs: [swing * legPx, -swing * legPx] };
}
export interface DropFrame { lift: number; squash: number; done: boolean }
/** `elapsed` since release; `squash` < 0 is shorter and wider. Never holds input: it is only drawn. */
export function dropFrame(elapsed: number, scale: number, reduced: boolean): DropFrame {
  if (reduced || !(elapsed < dropMs)) return { lift: 0, squash: 0, done: true };
  if (elapsed < fallMs) { const u = elapsed / fallMs; return { lift: carryLift * scale * (1 - u * u), squash: 0, done: false }; }
  return { lift: 0, squash: maxSquash * Math.sin((1 - (elapsed - fallMs) / squashMs) * Math.PI / 2), done: false };
}
/** Tween ease for an object let go: an accelerating fall to the floor (1), one bounce up and back. */
export function bounceOnce(k: number): number {
  if (k < .6) return (k / .6) ** 2;
  return 1 - .22 * Math.sin((k - .6) / .4 * Math.PI);
}
/** How far above its resting point a let-go object starts its fall, in scene px. */
export function objectFall(scale: number) { return 30 * scale; }
export interface CarryTrack { time: number; x: number; speed: number }
/** The finger's horizontal speed, smoothed over frames; a pause longer than 100 ms is rest. */
export function trackCarry(previous: CarryTrack | undefined, time: number, x: number): CarryTrack {
  const elapsed = previous ? time - previous.time : 0;
  if (!previous || elapsed <= 0 || elapsed > 100) return { time, x, speed: 0 };
  return { time, x, speed: previous.speed * .6 + (x - previous.x) / elapsed * .4 };
}
