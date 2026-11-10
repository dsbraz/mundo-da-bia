import { expect, it } from 'vitest';
import { birdAt, birdPeriod, cloudShift, crownSway, shownView } from './sky';
const view = { x: 300, y: 150, width: 700 };

it('as nuvens derivam devagar para a direita e dão a volta a cada 480', () => {
  expect(cloudShift(0, false)).toBe(0);
  const second = cloudShift(1000, false);
  expect(second).toBeGreaterThan(2); expect(second).toBeLessThan(12);
  expect(cloudShift(20000, false)).toBeGreaterThan(40);
  for (let t = 0; t < 600000; t += 7919) { expect(cloudShift(t, false)).toBeGreaterThanOrEqual(0); expect(cloudShift(t, false)).toBeLessThan(480); }
});
it('as copas oscilam até 1,5 grau, cada árvore com sua fase', () => {
  const limit = 1.5 * Math.PI / 180;
  let widest = 0;
  for (let t = 0; t < 20000; t += 37) { const a = crownSway(t, 0, false); expect(Math.abs(a)).toBeLessThanOrEqual(limit + 1e-9); widest = Math.max(widest, Math.abs(a)); }
  expect(widest).toBeGreaterThan(limit * .95);
  expect(crownSway(1000, 0, false)).not.toBeCloseTo(crownSway(1000, 1, false), 4);
});
it('um pássaro de vez em quando cruza a vista, batendo as asas, e some no resto do tempo', () => {
  const seen = Array.from({ length: 400 }, (_, i) => birdAt(i * 100, view, false));
  const flying = seen.filter(b => b);
  expect(flying.length).toBeGreaterThan(0); expect(flying.length).toBeLessThan(seen.length / 2);
  const start = birdAt(birdPeriod - 6000 + 10, view, false)!, later = birdAt(birdPeriod - 3000, view, false)!;
  expect(start.x).toBeLessThan(view.x); expect(later.x).toBeGreaterThan(start.x);
  expect(later.y).toBeGreaterThan(view.y); expect(later.y).toBeLessThan(view.y + 80);
  expect(birdAt(birdPeriod - 6000 - 10, view, false)).toBeNull();
  expect(new Set(flying.map(b => Math.sign(b!.flap))).size).toBe(2);
});
it('com movimento reduzido o céu fica parado: sem deriva, sem oscilar, sem pássaro', () => {
  for (const t of [0, 1000, 7777, birdPeriod - 3000]) {
    expect(cloudShift(t, true)).toBe(0); expect(crownSway(t, 2, true)).toBe(0); expect(birdAt(t, view, true)).toBeNull();
  }
});
it('a vista mostrada vem do que o viewport escreve no canvas, com a câmera da rua', () => {
  expect(shownView({ viewX: '240', cameraX: '60', viewY: '110', viewWidth: '504' })).toEqual({ x: 300, y: 110, width: 504 });
  expect(shownView({})).toEqual({ x: 0, y: 0, width: 1000 });
});
