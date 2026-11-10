import { expect, it } from 'vitest';
import { ballSize, kick, resting, rollStep, rollToRest, throwVelocity, type Ball } from './ball-motion';

const bounds = { left: 60, right: 2940, top: 430, bottom: 540 };
const ball = (vx: number, vy = 0, x = 500, y = 500): Ball => ({ x, y, vx, vy, spin: 0 });

it('is 36 to 40 px on the street, the size of every object indoors', () => {
  expect(ballSize('bola', 'street')).toBeGreaterThanOrEqual(36); expect(ballSize('bola', 'street')).toBeLessThanOrEqual(40);
  expect(ballSize('ursinho', 'street')).toBeCloseTo(24); expect(ballSize('bola', 'interior')).toBe(40);
});
it('is thrown with the speed of the finger over its last 100 ms, capped', () => {
  const samples = [{ t: 0, x: 0, y: 0 }, { t: 900, x: 100, y: 500 }, { t: 950, x: 130, y: 500 }, { t: 1000, x: 160, y: 510 }];
  const v = throwVelocity(samples, 1000);
  expect(v.x).toBeCloseTo(.6); expect(v.y).toBeCloseTo(.1);
  expect(throwVelocity([{ t: 0, x: 0, y: 0 }, { t: 10, x: 500, y: 0 }], 10).x).toBeLessThanOrEqual(1.5);
  expect(throwVelocity([{ t: 0, x: 0, y: 0 }], 0)).toEqual({ x: 0, y: 0 });
  expect(throwVelocity([{ t: 0, x: 0, y: 0 }, { t: 10, x: 10, y: 0 }], 400)).toEqual({ x: 0, y: 0 });
});
it('rolls with friction and spin, slowing down until it rests', () => {
  let b = ball(.8);
  const first = rollStep(b, 16, bounds);
  expect(first.x).toBeGreaterThan(b.x); expect(Math.abs(first.vx)).toBeLessThan(.8); expect(first.spin).toBeGreaterThan(0);
  let frames = 0;
  while (!resting(b) && frames < 2000) { b = rollStep(b, 16, bounds); frames++; }
  expect(resting(b)).toBe(true); expect(frames).toBeLessThan(400);
  expect(b.x - 500).toBeGreaterThan(150); expect(b.vx).toBe(0);
});
it('bounces off the edges of the floor and stays on it', () => {
  let b = ball(1, .5, 2900, 530);
  for (let n = 0; n < 300; n++) {
    b = rollStep(b, 16, bounds);
    expect(b.x).toBeGreaterThanOrEqual(bounds.left); expect(b.x).toBeLessThanOrEqual(bounds.right);
    expect(b.y).toBeGreaterThanOrEqual(bounds.top); expect(b.y).toBeLessThanOrEqual(bounds.bottom);
  }
  expect(b.x).toBeLessThan(2900);
  expect(rollStep(ball(0, 0, 500, 300), 16, bounds).y).toBe(bounds.top);
});
it('the rest point is the same whether rolled frame by frame or at once (reduced motion)', () => {
  let b = ball(.9, -.2);
  while (!resting(b)) b = rollStep(b, 16, bounds);
  const end = rollToRest(ball(.9, -.2), bounds);
  expect(end.x).toBeCloseTo(b.x, 6); expect(end.y).toBeCloseTo(b.y, 6);
});
it('a child walking close by kicks it along the way they go; far away or standing still does not', () => {
  const kicked = kick({ x: 500, y: 520 }, { x: 480, y: 520, direction: 1 }, .6)!;
  expect(kicked.vx).toBeGreaterThan(.2);
  expect(kick({ x: 500, y: 520 }, { x: 520, y: 520, direction: -1 }, .6)!.vx).toBeLessThan(-.2);
  // On the street the feet pass close enough when they come within 30 px, also a little off the ball's line.
  expect(kick({ x: 500, y: 520 }, { x: 492, y: 494, direction: 1 }, .6)!.vx).toBeGreaterThan(.2);
  expect(kick({ x: 500, y: 520 }, { x: 400, y: 520, direction: 1 }, .6)).toBeNull();
  expect(kick({ x: 500, y: 520 }, { x: 490, y: 520, direction: 0 }, .6)).toBeNull();
});
