import { expect, it } from 'vitest';
import { bounceOnce, carryFrame, dropFrame, dropMs, carryLift, objectFall, trackCarry } from './weight';

it('a carried figure is lifted off its shadow, its legs dangle like pendulums and it tilts with the speed', () => {
  const still = carryFrame(0, 0, 1, false);
  expect(still.lift).toBeCloseTo(carryLift); expect(still.lean).toBe(0);
  expect(carryFrame(0, 0, .6, false).lift).toBeCloseTo(carryLift * .6);
  const legs = [0, 100, 200, 300].map(t => carryFrame(t, 0, 1, false).legs[0]!);
  expect(new Set(legs.map(l => l.toFixed(2))).size).toBeGreaterThan(2);
  expect(Math.max(...legs.map(Math.abs))).toBeLessThanOrEqual(7);
  const a = carryFrame(120, 0, 1, false).legs; expect(a[0]).toBeCloseTo(-a[1]!);
  expect(carryFrame(0, .5, 1, false).lean).toBeGreaterThan(0); expect(carryFrame(0, -.5, 1, false).lean).toBeLessThan(0);
  expect(Math.abs(carryFrame(0, 10, 1, false).lean)).toBeLessThanOrEqual(.2);
});
it('with reduced motion a carried figure is neither lifted, dangled nor tilted', () => {
  expect(carryFrame(123, 1, 1, true)).toEqual({ lift: 0, lean: 0, legs: [0, 0] });
});
it('released, it falls back onto its shadow, squashes at most 10% and is still again within 300 ms', () => {
  expect(dropFrame(0, 1, false).lift).toBeCloseTo(carryLift);
  const falling = [0, 30, 60, 90].map(t => dropFrame(t, 1, false).lift);
  expect(falling).toEqual([...falling].sort((x, y) => y - x));
  const squashes = Array.from({ length: 30 }, (_, i) => dropFrame(i * 10, 1, false).squash);
  expect(Math.min(...squashes)).toBeLessThan(-.05); expect(Math.min(...squashes)).toBeGreaterThanOrEqual(-.1);
  expect(dropMs).toBeLessThanOrEqual(300);
  expect(dropFrame(dropMs, 1, false)).toEqual({ lift: 0, squash: 0, done: true });
  expect(dropFrame(0, 1, true)).toEqual({ lift: 0, squash: 0, done: true });
});
it('an object falls and bounces once: it reaches the floor, rises once and settles', () => {
  expect(bounceOnce(0)).toBe(0); expect(bounceOnce(1)).toBeCloseTo(1);
  const curve = Array.from({ length: 101 }, (_, i) => bounceOnce(i / 100));
  const landing = curve.findIndex(v => v >= .999);
  expect(landing).toBeGreaterThan(0);
  const after = curve.slice(landing);
  expect(Math.min(...after)).toBeLessThan(.9);
  // One bounce: after landing it only goes up once and comes down once.
  const steps = after.slice(1).map((v, i) => Math.sign(Math.round((v - after[i]!) * 1e6))).filter(Boolean);
  expect(steps.filter((v, i) => i > 0 && v !== steps[i - 1]).length).toBe(1);
  expect(objectFall(1)).toBeGreaterThan(objectFall(.6));
});
it('tracks the horizontal speed of the finger, at rest after a pause', () => {
  const first = trackCarry(undefined, 0, 100);
  expect(first.speed).toBe(0);
  const moving = trackCarry(first, 20, 110);
  expect(moving.speed).toBeGreaterThan(0);
  expect(trackCarry(moving, 500, 110).speed).toBe(0);
});
it('peso por tamanho (W3L-17): o gato carregado inclina mais e balança as patas mais depressa que uma pessoa', () => {
  const lean = (kind: 'human' | 'cat') => carryFrame(0, .5, 1, false, kind).lean;
  expect(lean('cat')).toBeGreaterThan(lean('human'));
  expect(Math.abs(carryFrame(0, 10, 1, false, 'cat').lean)).toBeLessThanOrEqual(.3);
  expect(carryFrame(0, 0, 1, false)).toEqual(carryFrame(0, 0, 1, false, 'human'));
  const crossing = (kind: 'human' | 'cat') => Array.from({ length: 100 }, (_, t) => Math.sign(carryFrame(t * 10, 0, 1, false, kind).legs[0]!)).filter((s, i, all) => i && s !== all[i - 1]).length;
  expect(crossing('cat')).toBeGreaterThan(crossing('human'));
  expect(carryFrame(50, 1, 1, true, 'cat')).toEqual({ lift: 0, lean: 0, legs: [0, 0] });
});
