import { expect, it } from 'vitest';
import { swingMotion, maxSwing } from './swing-motion';

/** Runs the swing frame by frame (16 ms) for `ms`, returning the largest angle seen. */
function run(swing: ReturnType<typeof swingMotion>, from: number, ms: number, frame = 16) {
  let peak = 0;
  for (let t = from; t <= from + ms; t += frame) { swing.step(t, false); peak = Math.max(peak, Math.abs(swing.angle())); }
  return peak;
}

it('starts still and each push swings it higher, up to 0.45 rad', () => {
  const swing = swingMotion(); swing.step(0, false);
  expect(swing.angle()).toBe(0); expect(swing.amplitude()).toBe(0);
  const sizes: number[] = [], peaks: number[] = [];
  for (let n = 0; n < 3; n++) { swing.push(n * 800 + 1, false); sizes.push(swing.amplitude()); peaks.push(run(swing, n * 800 + 1, 790)); }
  expect(sizes[0]).toBeGreaterThan(.1); expect(sizes[1]).toBeGreaterThan(sizes[0]! * 1.3); expect(sizes[2]).toBeGreaterThan(sizes[1]! * 1.15);
  // Visibly higher: the widest angle drawn after the third push against the one after the first.
  expect(peaks[2]).toBeGreaterThan(peaks[0]! * 1.8);
  for (let n = 3; n < 12; n++) { swing.push(n * 800 + 1, false); expect(swing.amplitude()).toBeLessThanOrEqual(maxSwing + 1e-9); run(swing, n * 800 + 1, 790); }
  swing.push(9601, false); swing.push(9602, false); expect(swing.amplitude()).toBeCloseTo(maxSwing);
  expect(run(swing, 9601, 2200)).toBeLessThanOrEqual(maxSwing + 1e-9);
});
it('left alone it keeps swinging and comes to rest in about 8 s', () => {
  const swing = swingMotion(); swing.step(0, false);
  for (let n = 0; n < 10; n++) { swing.push(n * 500 + 1, false); run(swing, n * 500 + 1, 490); }
  const start = 5000;
  expect(run(swing, start, 3000)).toBeGreaterThan(.1);
  run(swing, start + 3000, 3500);
  expect(swing.amplitude()).toBeGreaterThan(0);
  run(swing, start + 6500, 3000);
  expect(swing.amplitude()).toBe(0); expect(swing.angle()).toBe(0);
});
it('a long pause between frames never jumps the swing (steps of at most 100 ms)', () => {
  const a = swingMotion(), b = swingMotion();
  a.step(0, false); b.step(0, false); a.push(1, false); b.push(1, false);
  a.step(5000, false); run(b, 1, 100, 100);
  expect(a.angle()).toBeCloseTo(b.angle(), 6);
});
it('legs stretch forward on the way forward and fold back on the way back', () => {
  const swing = swingMotion(); swing.step(0, false); swing.push(1, false);
  swing.step(200, false); const forward = swing.legs();
  run(swing, 200, 1000); let back = swing.legs();
  for (let t = 1216; Math.sign(back) === Math.sign(forward) && t < 4000; t += 16) { swing.step(t, false); back = swing.legs(); }
  expect(Math.sign(forward)).not.toBe(Math.sign(back));
  expect(Math.abs(forward)).toBeLessThanOrEqual(1);
});
it('with reduced motion the seat never swings, but a push still counts as touched', () => {
  const swing = swingMotion(); swing.step(0, true);
  expect(swing.push(1, true)).toBe(true);
  for (let t = 1; t < 3000; t += 16) swing.step(t, true);
  expect(swing.angle()).toBe(0); expect(swing.legs()).toBe(0);
});
