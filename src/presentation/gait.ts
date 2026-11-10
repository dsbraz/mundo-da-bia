/** The walk cycle, scaled by the visual context (1 indoors, 0.6 on the street) so a smaller figure takes smaller steps and never skates.
 *  One step is half a leg cycle (π of phase); at full speed there are about 2.5 steps per second in any context. */
export const stepPx = 80;
const topSpeed = .2, acceleration = .0012, reducedSpeed = .12, bobPx = 5, legPx = 9, liftPx = 6, leanPerAccel = 40, maxLean = .055, baseLean = .025;
/** px/ms and px/ms² for this scale; with reduced motion the walk is slow (it still walks, never teleports). */
export function gaitSpeed(scale: number, reduced: boolean) {
  return { top: (reduced ? reducedSpeed : topSpeed) * scale, acceleration: acceleration * scale };
}
export function stepsPerSecond(scale: number) { return gaitSpeed(scale, false).top * 1000 / (stepPx * scale); }
export interface GaitFrame { phase: number; bob: number; lean: number; legs: { x: number; lift: number }[] }
/** `distance` walked so far, `direction` -1/0/1 along x, `accel` in px/ms² (from `trackGait`). Bob is in scene px; legs in the figure's own px. */
export function gaitFrame(distance: number, scale: number, direction: number, accel: number, reduced: boolean): GaitFrame {
  const phase = distance / (stepPx * scale) * Math.PI;
  if (reduced) return { phase, bob: 0, lean: 0, legs: [0, 1].map(() => ({ x: 0, lift: 0 })) };
  const lean = direction * (baseLean + Math.max(-maxLean, Math.min(maxLean, accel * leanPerAccel)));
  return { phase, bob: Math.abs(Math.sin(phase)) * bobPx * scale, lean, legs: [0, 1].map(side => {
    const stride = Math.sin(phase + side * Math.PI);
    return { x: stride * legPx, lift: Math.max(0, stride) * liftPx };
  }) };
}
/** Held up and still (no idle sway): turned up a little and drawn 1.4× taller, so the short tail stands above the back
 *  (turned further it would only hide behind the body), with the tip bent back into an S. */
export const trotTail = -.2, trotTip = .3, trotRaise = 1.4;
/** A cat trots: twice the steps of a child, a lower bob and the tail held up (no mirroring of the art). */
export function catTrot(distance: number, scale: number, reduced: boolean) {
  const phase = distance / (stepPx * scale) * Math.PI * 2;
  return { bob: reduced ? 0 : Math.abs(Math.sin(phase)) * 3 * scale, tail: trotTail, tip: trotTip, raise: trotRaise };
}
export interface GaitTrack { time: number; distance: number; speed: number; acceleration: number }
/** Smoothed speed and acceleration from the walked distance between frames; a pause longer than 100 ms starts over at rest. */
export function trackGait(previous: GaitTrack | undefined, time: number, distance: number): GaitTrack {
  const elapsed = previous ? time - previous.time : 0;
  if (!previous || elapsed <= 0 || elapsed > 100) return { time, distance, speed: 0, acceleration: 0 };
  const speed = previous.speed * .7 + (distance - previous.distance) / elapsed * .3;
  // Low-passed, so frame timing jitter never flickers the lean while a real start or stop (about 10 frames) still shows.
  return { time, distance, speed, acceleration: previous.acceleration * .85 + (speed - previous.speed) / elapsed * .15 };
}
