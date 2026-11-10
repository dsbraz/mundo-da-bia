import { describe, expect, it } from 'vitest';
import { heartDuration, heartFrame } from './care-heart';

describe('coração transitório depois de comer', () => {
  it('aparece, sobe um pouco e some: não fica na tela', () => {
    expect(heartFrame(0, false)).toMatchObject({ alpha: 1, rise: 0 });
    expect(heartFrame(0, false).scale).toBeCloseTo(.6, 5);
    expect(heartFrame(160, false).scale).toBeCloseTo(1, 5);
    expect(heartFrame(heartDuration / 2, false).rise).toBeGreaterThan(8);
    expect(heartFrame(heartDuration / 2, false).alpha).toBe(1);
    expect(heartFrame(heartDuration, false)).toMatchObject({ alpha: 0, rise: 28, scale: 1 });
    expect(heartFrame(heartDuration + 500, false).alpha).toBe(0);
  });
  it('a pulsação não passa de 10% depois do surgimento', () => {
    for (let t = 160; t <= heartDuration; t += 20) expect(Math.abs(heartFrame(t, false).scale - 1)).toBeLessThanOrEqual(.1);
  });
  it('com movimento reduzido só esmaece: sem subir nem crescer', () => {
    expect(heartFrame(0, true)).toEqual({ alpha: 0, rise: 0, scale: 1 });
    expect(heartFrame(60, true).alpha).toBeCloseTo(.5, 5);
    expect(heartFrame(120, true)).toEqual({ alpha: 1, rise: 0, scale: 1 });
    expect(heartFrame(heartDuration / 2, true)).toEqual({ alpha: 1, rise: 0, scale: 1 });
    expect(heartFrame(heartDuration - 60, true).alpha).toBeCloseTo(.5, 5);
    expect(heartFrame(heartDuration, true)).toEqual({ alpha: 0, rise: 0, scale: 1 });
  });
});
