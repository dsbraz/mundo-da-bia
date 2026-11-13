import { describe, expect, it } from 'vitest';
import { flushDuration, flushFrame } from './flush';

describe('a descarga desenhada', () => {
  it('a água gira, encolhe e some no fim, sem ficar', () => {
    expect(flushFrame(0, false)).toMatchObject({ alpha: 1, turn: 0, size: 1 });
    const middle = flushFrame(flushDuration / 2, false);
    expect(middle.turn).toBeGreaterThan(0);
    expect(middle.size).toBeLessThan(1);
    expect(middle.alpha).toBe(1);
    expect(flushFrame(flushDuration, false).alpha).toBe(0);
  });
  it('com movimento reduzido: o redemoinho fica parado, só aparece e some', () => {
    for (const t of [0, flushDuration / 2, flushDuration]) expect(flushFrame(t, true)).toMatchObject({ turn: 0, size: 1 });
    expect(flushFrame(0, true).alpha).toBe(0);
    expect(flushFrame(flushDuration / 2, true).alpha).toBe(1);
    expect(flushFrame(flushDuration, true).alpha).toBe(0);
  });
});
