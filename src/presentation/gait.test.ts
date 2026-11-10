import { expect, it } from 'vitest';
import { catTrot, gaitFrame, gaitSpeed, stepPx, stepsPerSecond, trackGait } from './gait';

it('a step covers distance proportional to the figure scale, so the smaller street figure does not skate', () => {
  // One step is half a leg cycle (π of phase): the street figure (0.6) takes it in 0.6 of the interior distance.
  expect(gaitFrame(stepPx, 1, 0, 0, false).phase).toBeCloseTo(Math.PI);
  expect(gaitFrame(stepPx * .6, .6, 0, 0, false).phase).toBeCloseTo(Math.PI);
  expect(gaitFrame(stepPx, .6, 0, 0, false).phase).toBeCloseTo(Math.PI / .6);
});
it('walks at about 2.5 steps per second at full speed in any context', () => {
  expect(stepsPerSecond(1)).toBeCloseTo(2.5, 1);
  expect(stepsPerSecond(.6)).toBeCloseTo(2.5, 1);
  expect(gaitSpeed(.6, false).top).toBeCloseTo(gaitSpeed(1, false).top * .6);
  expect(gaitSpeed(.6, false).acceleration).toBeCloseTo(gaitSpeed(1, false).acceleration * .6);
});
it('bobs 5 px times the scale once per step, swings the legs ±9 px and leans with the acceleration', () => {
  const mid = gaitFrame(stepPx / 2, 1, 1, 0, false);
  expect(mid.bob).toBeCloseTo(5); expect(gaitFrame(stepPx / 2 * .6, .6, 1, 0, false).bob).toBeCloseTo(3);
  expect(Math.max(...mid.legs.map(l => Math.abs(l.x)))).toBeCloseTo(9);
  expect(mid.legs[0]!.x).toBeCloseTo(-mid.legs[1]!.x);
  expect(gaitFrame(0, 1, 1, 0, false).bob).toBeCloseTo(0);
  const starting = gaitFrame(10, 1, 1, .0012, false), stopping = gaitFrame(10, 1, 1, -.0012, false), cruising = gaitFrame(10, 1, 1, 0, false);
  expect(starting.lean).toBeGreaterThan(cruising.lean); expect(stopping.lean).toBeLessThan(cruising.lean);
  expect(gaitFrame(10, 1, -1, .0012, false).lean).toBeCloseTo(-starting.lean);
  expect(Math.abs(gaitFrame(10, 1, 1, 1, false).lean)).toBeLessThanOrEqual(.08);
});
it('with reduced motion the walk is slow and still: no bob, no legs, no lean', () => {
  expect(gaitSpeed(1, true).top).toBeLessThanOrEqual(gaitSpeed(1, false).top * .6);
  expect(gaitSpeed(1, true).top).toBeGreaterThan(0);
  const frame = gaitFrame(stepPx / 2, 1, 1, .001, true);
  expect(frame.bob).toBe(0); expect(frame.lean).toBe(0); expect(frame.legs.every(l => l.x === 0 && l.lift === 0)).toBe(true);
});
it('the cat trots with its tail up, faster and lower than a child', () => {
  const trot = catTrot(stepPx / 4, 1, false);
  expect(trot.tail).toBeLessThan(0); expect(trot.tail).toBeGreaterThan(-.25); expect(trot.raise).toBeGreaterThan(1.2);
  expect(trot.bob).toBeGreaterThan(0); expect(trot.bob).toBeLessThanOrEqual(3);
  expect(catTrot(stepPx / 4 * .6, .6, false).bob).toBeCloseTo(trot.bob * .6);
  expect(catTrot(stepPx / 4, 1, true)).toEqual({ bob: 0, tail: trot.tail, raise: trot.raise });
});
it('tracks speed and acceleration from the walked distance between frames', () => {
  const first = trackGait(undefined, 0, 0);
  expect(first.acceleration).toBe(0);
  const moving = trackGait(first, 16, 3.2);
  expect(moving.speed).toBeGreaterThan(0); expect(moving.acceleration).toBeGreaterThan(0);
  let steady = moving;
  for (let n = 2; n < 40; n++) steady = trackGait(steady, n * 16, n * 3.2);
  expect(steady.acceleration).toBeCloseTo(0, 4); expect(steady.speed).toBeCloseTo(.2, 3);
  expect(trackGait(steady, 2000, 9.6)).toEqual({ time: 2000, distance: 9.6, speed: 0, acceleration: 0 });
  expect(trackGait(steady, 40 * 16, 40 * 3.2).acceleration).toBeCloseTo(steady.acceleration * .85, 5);
});
it('frame timing jitter (±1 ms at a steady pace) does not make the lean flicker; a real start still leans', () => {
  let track = trackGait(undefined, 0, 0), widest = 0;
  for (let n = 1; n < 60; n++) { track = trackGait(track, n * 16 + (n % 2 ? 1 : -1), n * 3.2); if (n > 30) widest = Math.max(widest, Math.abs(track.acceleration)); }
  expect(widest * 40).toBeLessThan(.01);
  let start = trackGait(undefined, 0, 0), speed = 0, at = 0;
  for (let n = 1; n <= 10; n++) { speed = Math.min(.2, speed + .0012 * 16); at += speed * 16; start = trackGait(start, n * 16, at); }
  expect(gaitFrame(at, 1, 1, start.acceleration, false).lean).toBeGreaterThan(gaitFrame(at, 1, 1, 0, false).lean + .02);
});
