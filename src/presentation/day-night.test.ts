import { expect, it } from 'vitest';
import { glassRects, lightOf, starsAt, twinkle } from './day-night';
import { facadeSvg, roomArchitecture } from './architecture-art';

it('de dia não há véu; o entardecer escurece um pouco, a noite mais, e o amanhecer clareia', () => {
  expect(lightOf('manha', true).veil).toBe(0);
  expect(lightOf('tarde', true).veil).toBe(0);
  const dusk = lightOf('entardecer', true).veil, night = lightOf('noite', true).veil, dawn = lightOf('amanhecer', true).veil;
  expect(dusk).toBeGreaterThan(0); expect(night).toBeGreaterThan(dusk); expect(dawn).toBeGreaterThan(0); expect(dawn).toBeLessThan(night);
  // Never a black screen: the veil stays a tint over the backdrop.
  expect(night).toBeLessThanOrEqual(.55);
});
it('com o abajur aceso o cômodo fica menos escuro que com ele apagado', () => {
  expect(lightOf('noite', true).veil).toBeLessThan(lightOf('noite', false).veil);
  expect(lightOf('manha', false).veil).toBe(0);
});
it('lua e estrelas só à noite; as janelas acendem no entardecer e à noite', () => {
  expect((['manha', 'tarde', 'entardecer', 'noite', 'amanhecer'] as const).map(p => lightOf(p, true).stars)).toEqual([false, false, false, true, false]);
  expect((['manha', 'tarde', 'entardecer', 'noite', 'amanhecer'] as const).map(p => lightOf(p, true).lit)).toEqual([false, false, true, true, false]);
});
it('os vidros da fachada e das janelas do cômodo são lidos da arte (as janelas que acendem)', () => {
  const house = glassRects(facadeSvg('house', 1));
  expect(house.length).toBeGreaterThanOrEqual(2);
  for (const r of house) { expect(r.width).toBeGreaterThan(10); expect(r.height).toBeGreaterThan(10); expect(r.x + r.width).toBeLessThanOrEqual(440); expect(r.y + r.height).toBeLessThanOrEqual(480); }
  expect(glassRects(roomArchitecture('dining'))).toContainEqual({ x: 100, y: 85, width: 220, height: 180 });
  expect(glassRects('<svg><rect x="1" y="2" width="3" height="4" fill="#fff"/></svg>')).toEqual([]);
});
it('estrelas fixas no céu (repintar não as mexe) e, com movimento reduzido, sem piscar', () => {
  const a = starsAt(2000), b = starsAt(2000);
  expect(a).toEqual(b); expect(a.length).toBeGreaterThan(10);
  for (const s of a) { expect(s.y).toBeLessThan(250); expect(s.x).toBeGreaterThanOrEqual(0); expect(s.x).toBeLessThan(2000); }
  const blinking = new Set(Array.from({ length: 40 }, (_, i) => twinkle(i * 150, 3, false).toFixed(2)));
  expect(blinking.size).toBeGreaterThan(3);
  const still = new Set(Array.from({ length: 40 }, (_, i) => twinkle(i * 150, 3, true)));
  expect([...still]).toEqual([1]);
});
