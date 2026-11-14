import { expect, it } from 'vitest';
import { askGap, askShow, asking, nextAsk } from './asks';

it('um pedido fica 8 s e o próximo, de qualquer necessidade ou de qualquer um, só vem 8 min depois do anterior começar', () => {
  const first = nextAsk(null, 'bia:fome', 1000);
  expect(first).toEqual({ key: 'bia:fome', at: 1000 });
  expect([0, askShow - 1, askShow].map(t => asking(nextAsk(first, 'bia:fome', 1000 + t), 'bia:fome', 1000 + t))).toEqual([true, true, false]);
  // Another need (or someone else) waits for the gap; then it comes up, and the first waits in turn.
  expect(asking(nextAsk(first, 'bia:sono', 1000 + askGap - 1), 'bia:sono', 1000 + askGap - 1)).toBe(false);
  const second = nextAsk(first, 'bia:sono', 1000 + askGap);
  expect(asking(second, 'bia:sono', 1000 + askGap)).toBe(true);
  expect(asking(nextAsk(second, 'bia:fome', 1000 + askGap + 1), 'bia:fome', 1000 + askGap + 1)).toBe(false);
  // The same ask, still wanted, comes back after the gap too.
  expect(nextAsk(first, 'bia:fome', 1000 + askGap)).toEqual({ key: 'bia:fome', at: 1000 + askGap });
  expect([askShow, askGap]).toEqual([8_000, 8 * 60_000]);
});
