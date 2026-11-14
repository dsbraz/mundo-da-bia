import { expect, it } from 'vitest';
import { glassRects, lightOf, starsAt, twinkle } from './day-night';
import { architectureKey, facadeSvg, hallShift, roomArchitecture } from './architecture-art';
import { roomTemplates } from '../domain/types';
import { initialWorld } from '../domain/world';
import { addRoom } from '../domain/rooms';

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
it('num cômodo com escada, a arte da parede se estreita à direita do vão: nenhuma janela fica atrás da escada (x < 192)', () => {
  for (const template of roomTemplates.filter(t => !['garden', 'playground'].includes(t))) {
    const svg = roomArchitecture(template, true);
    expect(svg).toContain('<g transform="translate(200 0) scale(.8 1)">');
    for (const r of glassRects(svg)) expect([template, hallShift(r.x) >= 200]).toEqual([template, true]);
  }
  expect(roomArchitecture('empty')).not.toContain('<g transform');
  const world = initialWorld();
  expect(architectureKey(world)).toEqual({ key: 'architecture-empty', stairs: false });
  expect(architectureKey(addRoom(world, { name: 'Sótão', template: 'empty', size: 'medium', cell: 4 }))).toEqual({ key: 'architecture-empty', stairs: false });
  expect(architectureKey({ ...addRoom(world, { name: 'Sótão', template: 'empty', size: 'medium', cell: 4 }), room: 'sala' })).toEqual({ key: 'architecture-empty-stairs', stairs: true });
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
