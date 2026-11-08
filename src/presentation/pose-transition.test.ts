import { expect, it } from 'vitest';
import { settlePose } from './pose';
it('approaches the new pose without snapping and honors reduced motion', () => {
  expect(settlePose(0, -Math.PI / 2, false)).toBeLessThan(0);
  expect(settlePose(0, -Math.PI / 2, false)).toBeGreaterThan(-Math.PI / 2);
  expect(settlePose(0, -Math.PI / 2, true)).toBe(-Math.PI / 2);
  let angle = 0; for (let n = 0; n < 80; n++) angle = settlePose(angle, -Math.PI / 2, false);
  expect(angle).toBe(-Math.PI / 2);
});
