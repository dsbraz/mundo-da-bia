import { expect, it } from 'vitest';
import { climb, climbArc, climbMs, stroll, strollAt, strollSpeed } from './stroll';
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
it('subir no banco ou no balanço é um arco de 260 ms: sobe no meio e pousa no assento; com movimento reduzido, fades', () => {
  const up = climb({ x: 180, y: 510 }, { x: 180, y: 445 }, 1000, false);
  expect(up.duration).toBe(climbMs); expect(climbMs).toBe(260);
  expect(strollAt(up, 1000)).toMatchObject({ point: { x: 180, y: 510 }, done: false, lift: 0 });
  const middle = strollAt(up, 1000 + climbMs / 2);
  expect(middle.lift).toBeCloseTo(climbArc); expect(middle.point.y).toBeLessThan(477.5 - climbArc + 1);
  expect(middle.walked).toBe(0);
  expect(strollAt(up, 1000 + climbMs)).toMatchObject({ point: { x: 180, y: 445 }, done: true, lift: 0 });
  const still = climb({ x: 180, y: 510 }, { x: 180, y: 445 }, 0, true);
  expect(still.duration).toBe(2 * reducedFadeMs);
  expect(strollAt(still, reducedFadeMs / 2)).toMatchObject({ point: { x: 180, y: 510 }, alpha: .5, lift: 0 });
  expect(strollAt(stroll({ x: 0, y: 500 }, { x: 100, y: 500 }, 0, false), 50).lift).toBe(0);
});
