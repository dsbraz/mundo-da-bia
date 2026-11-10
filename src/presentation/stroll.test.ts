import { expect, it } from 'vitest';
import { stroll, strollAt, strollSpeed } from './stroll';
import { reducedFadeMs } from './motion';

it('um passo para o lado é uma caminhada curta: sai de onde estava, passa pelo meio e chega, sem bloquear nada', () => {
  const step = stroll({ x: 740, y: 540 }, { x: 940, y: 540 }, 1000, false);
  expect(step.duration).toBeCloseTo(200 / strollSpeed);
  expect(step.duration).toBeLessThanOrEqual(1500);
  expect(strollAt(step, 1000)).toMatchObject({ point: { x: 740, y: 540 }, alpha: 1, done: false });
  const middle = strollAt(step, 1000 + step.duration / 2);
  expect(middle.point.x).toBeCloseTo(840); expect(middle.walked).toBeCloseTo(100); expect(middle.direction).toBe(1);
  expect(strollAt(step, 1000 + step.duration)).toMatchObject({ point: { x: 940, y: 540 }, alpha: 1, done: true });
  expect(strollAt(stroll({ x: 500, y: 530 }, { x: 380, y: 530 }, 0, false), 10).direction).toBe(-1);
});
it('com movimento reduzido não anda: some onde estava e aparece onde vai, por fades curtos', () => {
  const step = stroll({ x: 740, y: 540 }, { x: 940, y: 540 }, 1000, true);
  expect(step.duration).toBe(2 * reducedFadeMs);
  expect(strollAt(step, 1000)).toMatchObject({ point: { x: 740, y: 540 }, alpha: 1, walked: 0 });
  expect(strollAt(step, 1000 + reducedFadeMs / 2)).toMatchObject({ point: { x: 740, y: 540 }, alpha: .5 });
  expect(strollAt(step, 1000 + reducedFadeMs * 1.5)).toMatchObject({ point: { x: 940, y: 540 }, alpha: .5 });
  expect(strollAt(step, 1000 + 2 * reducedFadeMs)).toMatchObject({ point: { x: 940, y: 540 }, alpha: 1, done: true });
});
