import { describe, expect, it } from 'vitest';
import { bookFrame, bubbleFrame, drawnUse, drumAngle, sproutAngle, steamFrame } from './use-effects';

describe('efeitos de usar móveis', () => {
  it('pia, lavadora, horta, estante de livros e mesa de piquenique têm efeito desenhado; os antigos guardam o deles', () => {
    for (const kind of ['sink', 'washer', 'planter', 'bookcase', 'picnic-table'] as const) expect(drawnUse(kind)).toBe(true);
    for (const kind of ['stove', 'kitchen-cart', 'piano', 'tv', 'sofa'] as const) expect(drawnUse(kind)).toBe(false);
  });
  it('as bolhas da pia sobem da cuba e somem no alto; com movimento reduzido ficam paradas', () => {
    const start = bubbleFrame(0, false), later = bubbleFrame(300, false);
    expect(start).toHaveLength(6);
    start.forEach((b, i) => { expect(b.y).toBeLessThanOrEqual(52); expect(b.y).toBeGreaterThanOrEqual(-10); expect(b.r).toBeGreaterThanOrEqual(4); expect(later[i]!.y).not.toBe(b.y); });
    expect(Math.min(...bubbleFrame(700, false).map(b => b.alpha))).toBeLessThan(.4);
    expect(bubbleFrame(0, true)).toEqual(bubbleFrame(5000, true));
    bubbleFrame(0, true).forEach(b => expect(b.alpha).toBeGreaterThan(.5));
  });
  it('o tambor gira cerca de uma volta por segundo; parado com movimento reduzido', () => {
    expect(drumAngle(0, false)).toBe(0);
    expect(drumAngle(1000, false)).toBeCloseTo(2 * Math.PI, 5);
    expect(drumAngle(1000, true)).toBe(0);
  });
  it('o broto balança no máximo 0,25 rad e fica reto com movimento reduzido', () => {
    const angles = Array.from({ length: 40 }, (_, i) => sproutAngle(i * 50, false));
    expect(Math.max(...angles.map(Math.abs))).toBeLessThanOrEqual(.25);
    expect(Math.max(...angles) - Math.min(...angles)).toBeGreaterThan(.3);
    expect(sproutAngle(700, true)).toBe(0);
  });
  it('o vapor sobe e se apaga; com movimento reduzido fica um fio parado', () => {
    const a = steamFrame(0, false), b = steamFrame(400, false);
    expect(a).toHaveLength(3);
    expect(b[0]!.rise).not.toBe(a[0]!.rise);
    expect(steamFrame(0, true)).toEqual(steamFrame(900, true));
  });
  it('o livro aparece na mão, fica e some; com movimento reduzido só por fade', () => {
    expect(bookFrame(0, false)).toMatchObject({ alpha: 1, lift: 18 });
    expect(bookFrame(200, false)).toMatchObject({ alpha: 1, lift: 0 });
    expect(bookFrame(1400, false).alpha).toBe(0);
    expect(bookFrame(0, true)).toEqual({ alpha: 0, lift: 0 });
    expect(bookFrame(120, true)).toEqual({ alpha: 1, lift: 0 });
    expect(bookFrame(1400, true)).toEqual({ alpha: 0, lift: 0 });
  });
});
